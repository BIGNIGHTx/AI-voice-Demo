const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const CHATBOT_FALLBACK_MESSAGE = 'ขออภัย ไม่สามารถตอบคำถามนี้ได้ในขณะนี้';

interface TopicDistributionItem {
  name: string;
  count: number;
  percentage: number;
  avgCsat: number;
  avgQa: number;
}

interface TopicSearchResult {
  fileId: string;
  customerPhone: string;
  agentId: string;
  agentName: string;
  brand: string;
  product: string;
  saleChannel: string;
  sentiment: string;
  topic: string;
  summary: string;
  createdAt: string;
}

interface TopicSearchResponse {
  total: number;
  results: TopicSearchResult[];
}

const TOPIC_OVERVIEW_KEYWORDS = [
  'topic distribution',
  'topic',
  'intent',
  'หัวข้อ',
  'แต่ละข้อ',
  'หัวข้ออะไร',
  'หัวข้อไหน',
  'มีเรื่องอะไรบ้าง',
  'มีหัวข้ออะไรบ้าง',
  'สรุปหัวข้อ',
  'แจกแจงหัวข้อ',
];

const TOPIC_ALIAS_RULES: Array<{ includes: string[]; aliases: string[] }> = [
  { includes: ['คืนเงิน'], aliases: ['ขอคืนเงิน', 'ขอเงินคืน', 'คืนเงิน', 'refund', 'เงินคืน'] },
  { includes: ['ยกเลิก'], aliases: ['ยกเลิก', 'cancel', 'ยกเลิกสินค้า'] },
  { includes: ['จัดส่ง', 'ส่งสินค้า'], aliases: ['จัดส่ง', 'ส่งสินค้า', 'delivery', 'ติดตามของ'] },
  { includes: ['ร้องเรียน'], aliases: ['ร้องเรียน', 'complaint', 'มีปัญหา', 'ขอความช่วยเหลือ'] },
  { includes: ['ชำระเงิน'], aliases: ['ชำระเงิน', 'จ่ายเงิน', 'payment'] },
  { includes: ['ประกัน'], aliases: ['ประกัน', 'รับประกัน', 'warranty'] },
  { includes: ['แก้ไขปัญหา', 'ปัญหา'], aliases: ['แก้ปัญหา', 'แก้ไขปัญหา', 'ปัญหา', 'เคลม'] },
  { includes: ['ชมเชย'], aliases: ['ชมเชย', 'ชื่นชม', 'ชมพนักงาน'] },
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toArray = (payload: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];

  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const toText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const compactText = (value: string): string => normalizeText(value).replace(/\s+/g, '');

const extractPhoneNumber = (value: string): string | null => {
  const match = String(value || '').match(/0\d{8,9}/);
  return match ? match[0] : null;
};

const cleanSummary = (value: string): string =>
  String(value || '')
    .replace(/<mark[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const truncateText = (value: string, maxLength = 220): string => {
  const text = cleanSummary(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
};

const buildTopicAliases = (topicName: string): string[] => {
  const aliases = new Set<string>([topicName]);
  const normalizedTopic = compactText(topicName);

  for (const rule of TOPIC_ALIAS_RULES) {
    if (rule.includes.some((token) => normalizedTopic.includes(compactText(token)))) {
      rule.aliases.forEach((alias) => aliases.add(alias));
    }
  }

  return Array.from(aliases);
};

const getMatchedTopic = (
  question: string,
  topics: TopicDistributionItem[]
): TopicDistributionItem | null => {
  const normalizedQuestion = compactText(question);
  if (!normalizedQuestion) return null;

  let bestMatch: TopicDistributionItem | null = null;
  let bestScore = 0;

  for (const topic of topics) {
    for (const alias of buildTopicAliases(topic.name)) {
      const normalizedAlias = compactText(alias);
      if (!normalizedAlias) continue;

      let score = 0;
      if (normalizedQuestion.includes(normalizedAlias)) {
        score = normalizedAlias.length + 100;
      } else if (normalizedAlias.length >= 4 && normalizedAlias.includes(normalizedQuestion)) {
        score = normalizedQuestion.length + 50;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = topic;
      }
    }
  }

  return bestMatch;
};

const isTopicOverviewQuestion = (question: string): boolean => {
  const normalized = normalizeText(question);
  return TOPIC_OVERVIEW_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
};

const looksLikeFailureText = (value: string): boolean => {
  const normalized = normalizeText(value);
  if (!normalized) return true;

  return [
    'api error',
    'http 500',
    'http 502',
    'http 503',
    'timeout',
    'failed',
    'traceback',
    'internal server error',
    'n8n timeout',
    'connection refused',
  ].some((token) => normalized.includes(token));
};

const extractAnswerText = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim();

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const extracted = extractAnswerText(item);
      if (extracted) return extracted;
    }
    return '';
  }

  if (!isObject(payload)) return '';

  const directKeys = ['answer', 'output', 'message', 'text'];
  for (const key of directKeys) {
    const candidate = payload[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
};

const parseTopicDistribution = (payload: unknown): TopicDistributionItem[] => {
  const topics: TopicDistributionItem[] = [];

  for (const item of toArray(payload, ['topic_distribution', 'topics', 'data', 'items'])) {
    if (!isObject(item)) continue;

    const name = toText(item.name ?? item.topic ?? item.category);
    if (!name) continue;

    topics.push({
      name,
      count: toNumber(item.count ?? item.value ?? item.total),
      percentage: toNumber(item.percentage),
      avgCsat: toNumber(item.avg_csat),
      avgQa: toNumber(item.avg_qa),
    });
  }

  return topics.sort((left, right) => right.count - left.count);
};

const parseSearchResults = (payload: unknown): TopicSearchResponse => {
  const results = toArray(payload, ['results', 'items', 'data'])
    .map((item) => {
      if (!isObject(item)) return null;

      return {
        fileId: toText(item.file_id ?? item.audio_file_id),
        customerPhone: toText(item.customer_phone, '-'),
        agentId: toText(item.agent_id, '-'),
        agentName: toText(item.agent_name, '-'),
        brand: toText(item.brand, '-'),
        product: toText(item.product, '-'),
        saleChannel: toText(item.sale_channel, '-'),
        sentiment: toText(item.sentiment, '-'),
        topic: toText(item.topic, '-'),
        summary: toText(item.summary ?? item.highlight ?? item.transcript_match),
        createdAt: toText(item.created_at),
      };
    })
    .filter((item): item is TopicSearchResult => item !== null);

  const total = isObject(payload) && isObject(payload.pagination)
    ? toNumber(payload.pagination.total)
    : results.length;

  return { total, results };
};

const formatTopicOverview = (topics: TopicDistributionItem[]): string => {
  if (!topics.length) {
    return 'ยังไม่พบข้อมูล Topic Distribution ในระบบตอนนี้';
  }

  const lines = ['หัวข้อจาก Topic Distribution ที่พบในระบบ:'];

  topics.slice(0, 10).forEach((topic) => {
    const percentage = topic.percentage > 0 ? ` (${topic.percentage.toFixed(2)}%)` : '';
    lines.push(`- ${topic.name}: ${topic.count} เคส${percentage}`);
  });

  lines.push('ลองถามต่อได้ เช่น "ลูกค้าคนไหนขอคืนเงิน" หรือ "เบอร์ 0812345678 อยู่หัวข้ออะไร"');
  return lines.join('\n');
};

const formatTopicMatches = (
  topic: TopicDistributionItem,
  searchResponse: TopicSearchResponse,
  phone: string | null
): string => {
  if (!searchResponse.results.length) {
    return phone
      ? `ไม่พบข้อมูลของลูกค้า ${phone} ในหัวข้อ "${topic.name}"`
      : `ไม่พบข้อมูลลูกค้าที่อยู่ในหัวข้อ "${topic.name}"`;
  }

  if (phone) {
    const lines = [`พบ ${searchResponse.total || searchResponse.results.length} รายการของลูกค้า ${phone} ในหัวข้อ "${topic.name}"`];

    searchResponse.results.slice(0, 5).forEach((item, index) => {
      lines.push(`- เคส ${index + 1}: ${item.brand} | ${item.sentiment} | Agent ${item.agentId}`);
      if (item.summary) {
        lines.push(`สรุป: ${truncateText(item.summary)}`);
      }
    });

    return lines.join('\n');
  }

  const grouped = new Map<string, TopicSearchResult[]>();
  for (const item of searchResponse.results) {
    const key = item.customerPhone || item.fileId;
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const lines = [`พบ ${searchResponse.total || searchResponse.results.length} รายการในหัวข้อ "${topic.name}" จาก ${grouped.size} ลูกค้า`];

  Array.from(grouped.entries()).slice(0, 5).forEach(([customerPhone, items]) => {
    const latest = items[0];
    lines.push(`- ลูกค้า ${customerPhone}: ${items.length} เคส | ${latest.brand} | Agent ${latest.agentId}`);
    if (latest.summary) {
      lines.push(`สรุปล่าสุด: ${truncateText(latest.summary)}`);
    }
  });

  if (searchResponse.total > searchResponse.results.length) {
    lines.push(`และยังมีอีก ${searchResponse.total - searchResponse.results.length} รายการ`);
  }

  return lines.join('\n');
};

const formatCustomerTopicOverview = (phone: string, searchResponse: TopicSearchResponse): string => {
  if (!searchResponse.results.length) {
    return `ยังไม่พบข้อมูลหัวข้อของลูกค้า ${phone}`;
  }

  const grouped = new Map<string, TopicSearchResult[]>();
  for (const item of searchResponse.results) {
    const key = item.topic || 'ไม่ระบุหัวข้อ';
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const lines = [`หัวข้อที่พบของลูกค้า ${phone}:`];

  Array.from(grouped.entries())
    .sort((left, right) => right[1].length - left[1].length)
    .slice(0, 6)
    .forEach(([topicName, items]) => {
      const latest = items[0];
      lines.push(`- ${topicName}: ${items.length} เคส`);
      if (latest.summary) {
        lines.push(`สรุปล่าสุด: ${truncateText(latest.summary)}`);
      }
    });

  return lines.join('\n');
};

const fetchJson = async (url: string, init?: RequestInit): Promise<unknown | null> => {
  try {
    const response = await fetch(url, { cache: 'no-store', ...init });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
};

const fetchTopicDistribution = async (): Promise<TopicDistributionItem[]> => {
  const payload = await fetchJson(`${API_BASE}/api/v1/analytics/topic-distribution`);
  return parseTopicDistribution(payload);
};

const fetchTopicSearch = async (params: { phone?: string | null; topic?: string }): Promise<TopicSearchResponse | null> => {
  const query = new URLSearchParams();

  if (params.phone) query.set('q', params.phone);
  if (params.topic) query.set('topic', params.topic);
  query.set('page', '1');
  query.set('per_page', params.phone ? '10' : '20');

  const payload = await fetchJson(`${API_BASE}/api/v1/search/advanced?${query.toString()}`);
  if (!payload) return null;

  return parseSearchResults(payload);
};

const tryTopicReply = async (question: string): Promise<string | null> => {
  const phone = extractPhoneNumber(question);
  const topics = await fetchTopicDistribution();
  if (!topics.length) return null;

  const matchedTopic = getMatchedTopic(question, topics);
  const topicOverviewQuestion = isTopicOverviewQuestion(question);

  if (phone && !matchedTopic && topicOverviewQuestion) {
    const searchResponse = await fetchTopicSearch({ phone });
    if (searchResponse) {
      return formatCustomerTopicOverview(phone, searchResponse);
    }
  }

  if (matchedTopic) {
    const searchResponse = await fetchTopicSearch({ phone, topic: matchedTopic.name });
    if (searchResponse) {
      return formatTopicMatches(matchedTopic, searchResponse, phone);
    }
    return phone
      ? `ไม่พบข้อมูลของลูกค้า ${phone} ในหัวข้อ "${matchedTopic.name}"`
      : `ไม่พบข้อมูลลูกค้าที่อยู่ในหัวข้อ "${matchedTopic.name}"`;
  }

  if (topicOverviewQuestion) {
    return formatTopicOverview(topics);
  }

  return null;
};

const requestWarrantyReply = async (question: string): Promise<string> => {
  const payload = await fetchJson(`${API_BASE}/api/v1/warranty/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const answerText = extractAnswerText(payload);
  if (!answerText || looksLikeFailureText(answerText)) {
    return CHATBOT_FALLBACK_MESSAGE;
  }

  return answerText;
};

export const getChatbotReply = async (question: string): Promise<string> => {
  const normalizedQuestion = String(question || '').trim();
  if (!normalizedQuestion) return CHATBOT_FALLBACK_MESSAGE;

  const topicReply = await tryTopicReply(normalizedQuestion);
  if (topicReply) {
    return topicReply;
  }

  return requestWarrantyReply(normalizedQuestion);
};
