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
  registrationNo: string;
  serialNo: string;
  orderNumber: string;
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

interface EnrichedTopicSearchResult extends TopicSearchResult {
  registrationNo: string;
  serialNo: string;
  orderNumber: string;
}

interface TopicSearchResponse {
  total: number;
  results: TopicSearchResult[];
}

interface TopicGroupMatch {
  label: string;
  topics: TopicDistributionItem[];
  count: number;
  percentage: number;
}

interface WarrantyMeta {
  registrationNo: string;
  serialNo: string;
  hasWarranty: boolean;
}

interface ExactWarrantyRecord {
  fileId: string;
  registrationNo: string;
  serialNo: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
  brand: string;
  model: string;
  status: string;
  warrantyPeriod: string;
  purchaseDate: string;
  deliveryDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  expiryDate: string;
  saleChannel: string;
  agentId: string;
}

interface ExactHistoryItem {
  fileId: string;
  callTimestamp: string;
  agentId: string;
  callType: string;
  customerPhone: string;
  brand: string;
  sentiment: string;
  topic: string;
  contactReason: string;
  keywords: string[];
  anomaly: {
    label: string;
    reasons: string[];
  };
  deepInsight: {
    customerNeed: string;
    painPoint: string;
    rootCause: string;
    expectation: string;
    recommendedAction: string;
    riskLevel: string;
    confidence?: number;
  } | null;
  summaryLines: string[];
  keyInsightsLines: string[];
}

interface ExactWarrantyQueryMatch {
  record: ExactWarrantyRecord;
  callHistory: {
    fileId: string;
    callDate: string;
    agentId: string;
  } | null;
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

const TOPIC_GROUP_RULES: Array<{ label: string; includes: string[] }> = [
  { label: 'คืนเงิน/ขอเงินคืน', includes: ['คืนเงิน', 'ขอเงินคืน', 'refund'] },
  { label: 'รับคืน/คืนสินค้า', includes: ['รับ', 'รับกลับ', 'รับคืน', 'คืนสินค้า', 'รับที่นอนกลับ'] },
  { label: 'เปลี่ยนสินค้า/เปลี่ยนที่นอน', includes: ['เปลี่ยน', 'เปลี่ยนที่นอน', 'เปลี่ยนสินค้า'] },
  { label: 'จัดส่งสินค้า', includes: ['จัดส่ง', 'ส่งสินค้า', 'การส่งสินค้า', 'delivery', 'ขนส่ง'] },
  { label: 'ประกัน/เงื่อนไข', includes: ['ประกัน', 'รับประกัน', 'เงื่อนไข', 'warranty', 'claim', 'เคลม'] },
  { label: 'ร้องเรียน/ไม่พอใจ', includes: ['ร้องเรียน', 'คอมเพลน', 'ไม่พอใจ', 'complain', 'complaint'] },
  { label: 'แก้ไขปัญหา/ขอความช่วยเหลือ', includes: ['แก้ไข', 'ปัญหา', 'ขอความช่วยเหลือ', 'วิธีแก้ไข'] },
  { label: 'สอบถามข้อมูล', includes: ['สอบถาม', 'อยากทราบ', 'ขอข้อมูล', 'ข้อมูล'] },
];

const WARRANTY_HISTORY_KEYWORDS = [
  'ประวัติ',
  'history',
  'โทร',
  'ติดต่อ',
  'สนทนา',
  'เคส',
  'ร้องเรียน',
  'เคยคุย',
];

const WARRANTY_LOOKUP_KEYWORDS = [
  'ประกัน',
  'รับประกัน',
  'warranty',
  'serial',
  'ทะเบียน',
  'มีไหม',
  'มีมั้ย',
  'มีหรือไม่',
];

export const CHATBOT_SUGGESTED_PROMPTS = [
  'เบอร์ 0819979336 มีประกันอะไรบ้าง',
  'ตรวจทะเบียนประกัน LOT-2026-0102',
  'Serial LT-HY-Q5-774455 หมดประกันวันไหน',
  'ลูกค้าคนไหนขอคืนเงิน',
  'หัวข้อแก้ไขปัญหา/ขอความช่วยเหลือเป็นของลูกค้าคนไหน',
  'RAG ควรใส่ข้อมูลอะไรเข้า Qdrant',
];

const CHATBOT_HELP_KEYWORDS = [
  'ช่วยอะไร',
  'ทำอะไรได้บ้าง',
  'ใช้งานยังไง',
  'ใช้อย่างไร',
  'ตัวอย่าง',
  'ถามอะไรได้บ้าง',
  'help',
];

const RAG_DESIGN_KEYWORDS = [
  'rag',
  'qdrant',
  'vector',
  'embedding',
  'embed',
  'ingest',
];

const RAG_DESIGN_INTENT_KEYWORDS = [
  'ควร',
  'อะไร',
  'ออกแบบ',
  'schema',
  'แบบข้อมูล',
  'เข้า',
  'ingest',
  'ใช้แบบไหน',
  'ใช้งาน',
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

const PLACEHOLDER_TEXT_VALUES = new Set(['', '-', 'n/a', 'none', 'null', 'unknown']);

const hasMeaningfulText = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return !PLACEHOLDER_TEXT_VALUES.has(value.trim().toLowerCase());
};

const pickPreferredText = (primary: unknown, fallback: string): string =>
  hasMeaningfulText(primary) ? String(primary).trim() : fallback;

const extractPhoneNumber = (value: string): string | null => {
  const match = String(value || '').match(/0\d{8,9}/);
  return match ? match[0] : null;
};

const normalizeIdentifierCode = (value: string): string =>
  String(value || '')
    .replace(/^[\s:=#-]+|[\s:=#-]+$/g, '')
    .replace(/[\s_]+/g, '-')
    .toUpperCase();

const extractRegistrationNumber = (value: string): string | null => {
  const text = String(value || '').toUpperCase();
  const keywordMatch = text.match(
    /(?:REGISTRATION(?:\s*NO\.?)?|WARRANTY(?:\s*NO\.?)?|เลข(?:ทะเบียน|ประกัน)|ทะเบียน(?:ประกัน)?)[\s:=#-]*((?:REG|LOT|WR|WRT|WAR|WTY)[A-Z0-9._/-]{3,})/i
  );
  const directMatch = text.match(/(?<![A-Z0-9])(?:REG|LOT|WR|WRT|WAR|WTY)[A-Z0-9._/-]{3,}(?![A-Z0-9])/i);
  const match = keywordMatch?.[1] || directMatch?.[0];

  return match ? normalizeIdentifierCode(match) : null;
};

const extractLegacyAutoId = (value: string): string | null => {
  const match = String(value || '')
    .toUpperCase()
    .match(/(?:^|[^A-Z0-9])AUTO[\s_-]*([A-Z0-9][A-Z0-9_-]{2,31})(?![A-Z0-9_-])/);
  return match?.[1] ? `AUTO-${normalizeIdentifierCode(match[1])}` : null;
};

const extractSerialNumber = (value: string): string | null => {
  const directMatch = String(value || '').match(/(?<![A-Z0-9])((?:SN|LT)[A-Z0-9._/-]{3,})(?![A-Z0-9])/i);
  if (directMatch) {
    return normalizeIdentifierCode(directMatch[1]);
  }

  const keywordMatch = String(value || '').match(
    /(?:serial(?:\s*no\.?|\s*number)?|s\/n|(?:หมายเลข\s*)?ซีเรียล|(?:หมายเลข\s*)?ซีเรียลนัมเบอร์)[\s:=#-]*([A-Za-z0-9][A-Za-z0-9._/-]{2,})/i
  );
  return keywordMatch ? normalizeIdentifierCode(keywordMatch[1]) : null;
};

const extractOrderNumber = (value: string): string | null => {
  const keywordMatch = String(value || '').match(
    /(?:order(?:\s*no\.?|\s*number)?|เลข(?:ออเดอร์|คำสั่งซื้อ)|ออเดอร์)[\s:=#-]*([A-Za-z0-9][A-Za-z0-9._/-]{2,})/i
  );
  if (keywordMatch?.[1]) return normalizeIdentifierCode(keywordMatch[1]);

  const directMatch = String(value || '').match(/(?<![A-Z0-9])(?:ORDER|SO|INV)[A-Z0-9._/-]{3,}(?![A-Z0-9])/i);
  return directMatch ? normalizeIdentifierCode(directMatch[0]) : null;
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

const containsValue = (text: string, value: string): boolean => {
  const normalizedText = compactText(text);
  const normalizedValue = compactText(value);
  return !!normalizedValue && normalizedText.includes(normalizedValue);
};

const formatDisplayDateTime = (value: string): string => {
  const text = String(value || '').trim();
  if (!text) return '-';
  return text.replace('T', ' ').replace(/\.\d+$/, '');
};

const parseDateValue = (value: string): Date | null => {
  const text = String(value || '').trim();
  if (!text || text === '-') return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDisplayDate = (value: string): string => {
  const text = String(value || '').trim();
  if (!text || text === '-') return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;

  const date = parseDateValue(text);
  if (!date) return text;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const calculateExpiryDateFromWarranty = (purchaseDate: string, warrantyPeriod: string): string => {
  const purchase = parseDateValue(purchaseDate);
  if (!purchase) return '-';

  const monthsMatch = String(warrantyPeriod || '').match(/(\d+)/);
  const months = monthsMatch ? Number.parseInt(monthsMatch[1], 10) : 0;
  if (!months) return '-';

  const expiryDate = new Date(purchase);
  expiryDate.setMonth(expiryDate.getMonth() + months);
  return formatDisplayDate(expiryDate.toISOString());
};

const resolveWarrantyCoverage = (record: ExactWarrantyRecord): string => {
  const normalizedStatus = String(record.status || '').trim().toUpperCase();
  if (normalizedStatus === 'EXPIRED' || normalizedStatus === 'หมดอายุ') {
    return 'มีข้อมูลประกัน แต่หมดประกันแล้ว';
  }

  if (normalizedStatus === 'ACTIVE') {
    return 'มีประกัน';
  }

  const expirySource = record.expiryDate !== '-'
    ? record.expiryDate
    : (record.warrantyEndDate !== '-' ? record.warrantyEndDate : calculateExpiryDateFromWarranty(record.purchaseDate, record.warrantyPeriod));
  const expiryDate = parseDateValue(expirySource);
  if (expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate >= today ? 'มีประกัน' : 'มีข้อมูลประกัน แต่หมดประกันแล้ว';
  }

  return 'มีข้อมูลประกันในระบบ';
};

const splitStructuredLines = (value: string): string[] =>
  cleanSummary(value)
    .split(/\s*(?:\||\n)+\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeStructuredLine = (value: string): string =>
  compactText(
    String(value || '')
      .replace(/^[-•]\s*/u, '')
      .replace(/^💡\s*key insights:\s*/iu, '')
      .replace(/^📌\s*/u, '')
      .replace(/^📝\s*/u, '')
      .replace(/^💬\s*/u, '')
      .replace(/^📊\s*/u, '')
      .trim()
  );

const dedupeStructuredLines = (lines: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    const normalized = normalizeStructuredLine(line);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(line.trim());
  }

  return deduped;
};

const stripKeyInsightsPrefix = (value: string): string =>
  String(value || '').replace(/^💡\s*key insights:\s*/iu, '').trim();

type ChatbotTopicRule = {
  label: string;
  terms: string[];
  contactReason: string;
};

const CHATBOT_TOPIC_RULES: ChatbotTopicRule[] = [
  {
    label: 'ตรวจสอบยอดและรายการในบิล',
    terms: ['ยอด', 'บิล', 'สลิป', 'จ่ายแยก', 'ชำระ', 'รูดการ์ด', 'โอน', 'ตัดออกจากยอด', 'รวมในบิล'],
    contactReason: 'ลูกค้าต้องการตรวจสอบยอดชำระ รายการในบิล หรือหลักฐานการชำระเงิน',
  },
  {
    label: 'ยืนยันรายการที่ใช้แล้วและยังไม่ใช้',
    terms: ['ใช้ไปแล้ว', 'แกะใช้', 'ยังไม่ได้แกะ', 'ไม่ได้ใช้', 'เปิดใช้', 'จะคืน', 'ไม่ได้จะคืน'],
    contactReason: 'ลูกค้าต้องการยืนยันสถานะสินค้าที่ใช้แล้วและสินค้าที่ยังไม่ได้ใช้งาน',
  },
  {
    label: 'ตรวจสอบสินค้าและจำนวนที่ได้รับ',
    terms: ['ได้รับ', 'ได้มา', 'แถม', 'จำนวน', 'กี่ใบ', 'กี่ชุด', 'มีอยู่', 'ส่งรูป', 'ถ่ายรูป'],
    contactReason: 'ลูกค้าต้องการเช็กสินค้า จำนวนที่ได้รับ หรือของแถมที่เกี่ยวข้อง',
  },
  {
    label: 'เคลมหรือประกันสินค้า',
    terms: ['เคลม', 'ประกัน', 'warranty', 'claim', 'หมดประกัน', 'รับประกัน'],
    contactReason: 'ลูกค้าติดต่อเรื่องเคลม เงื่อนไขประกัน หรือสถานะการรับประกันสินค้า',
  },
  {
    label: 'ตรวจสอบออเดอร์และรายการสั่งซื้อ',
    terms: ['ออเดอร์', 'สั่งซื้อ', 'รายการซื้อ', 'ใบสั่งซื้อ', 'order'],
    contactReason: 'ลูกค้าต้องการตรวจสอบออเดอร์หรือรายการสั่งซื้อ',
  },
  {
    label: 'สอบถามข้อมูลสินค้า',
    terms: ['สอบถาม', 'อยากทราบ', 'ขอข้อมูล', 'ข้อมูลสินค้า', 'ราคา', 'โปรโมชัน'],
    contactReason: 'ลูกค้าติดต่อเพื่อสอบถามข้อมูลสินค้า ราคา หรือโปรโมชัน',
  },
  {
    label: 'เคสปัญหา/ร้องเรียนสินค้า',
    terms: ['แพ้', 'คัน', 'ผื่น', 'ไม่สบาย', 'เจ็บ', 'ร้องเรียน', 'ไม่พอใจ', 'ปัญหา', 'เสียหาย', 'ชำรุด'],
    contactReason: 'ลูกค้าติดต่อเพื่อแจ้งปัญหา ร้องเรียน หรือขอความช่วยเหลือเกี่ยวกับสินค้า',
  },
];

const ANOMALY_SIGNAL_TERMS = [
  'ไม่พอใจ', 'ร้องเรียน', 'โวย', 'ด่า', 'หยาบ', 'แย่มาก', 'ห่วย', 'โมโห', 'เสียเวลา',
  'ฟ้อง', 'ผู้จัดการ', 'หัวหน้า', 'ไม่รับผิดชอบ', 'เถียง', 'ทะเลาะ', 'ต่อว่า',
  'complain', 'angry', 'rude', 'bad service', 'supervisor', 'manager',
];

const cleanInsightValue = (value: unknown): string =>
  String(value || '').replace(/\s+/g, ' ').trim();

const isUsefulInsightValue = (value: unknown): boolean => {
  const text = cleanInsightValue(value).toLowerCase();
  return !!text && !PLACEHOLDER_TEXT_VALUES.has(text) && text !== 'undefined';
};

const pickInsightText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = cleanInsightValue(value);
    if (isUsefulInsightValue(text)) return text;
  }
  return '';
};

const normalizeSummaryPointForInsight = (value: unknown): string =>
  cleanInsightValue(value)
    .replace(/^[^a-zA-Z0-9\u0E00-\u0E7F]+/, '')
    .replace(/^(?:ประเด็นหลัก|หัวข้อที่สนทนา|หัวข้อหลัก|key\s*insights?|topic|intent)\s*:\s*/iu, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeInsightList = (values: unknown[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = normalizeSummaryPointForInsight(value);
    if (!isUsefulInsightValue(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
};

const collectKeywordValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectKeywordValues);
  if (!isObject(value)) return isUsefulInsightValue(value) ? [cleanInsightValue(value)] : [];

  const values: string[] = [];
  if (Array.isArray(value.keywords)) values.push(...collectKeywordValues(value.keywords));
  if (Array.isArray(value.matched)) values.push(...collectKeywordValues(value.matched));
  if (Array.isArray(value.sentiment_indicators)) values.push(...collectKeywordValues(value.sentiment_indicators));

  if (isObject(value.categories)) {
    Object.values(value.categories).forEach((category) => {
      values.push(...collectKeywordValues(category));
    });
  }

  return values;
};

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (isObject(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeDeepInsightForChatbot = (raw: unknown): ExactHistoryItem['deepInsight'] => {
  const data = parseJsonObject(raw);
  if (!data) return null;

  const confidenceValue = toNumber(data.confidence);
  const insight = {
    customerNeed: pickInsightText(data.customer_need, data.customerNeed),
    painPoint: pickInsightText(data.pain_point, data.painPoint),
    rootCause: pickInsightText(data.root_cause, data.rootCause),
    expectation: pickInsightText(data.expectation),
    recommendedAction: pickInsightText(data.recommended_action, data.recommendedAction),
    riskLevel: pickInsightText(data.risk_level, data.riskLevel),
    confidence: confidenceValue > 0 ? Math.max(0, Math.min(100, Math.round(confidenceValue))) : undefined,
  };

  return Object.values(insight).some((value) => value !== undefined && value !== '') ? insight : null;
};

const findChatbotTopicRule = (value: string): ChatbotTopicRule | null => {
  const text = cleanInsightValue(value).toLowerCase();
  if (!text) return null;

  return CHATBOT_TOPIC_RULES
    .map((rule) => ({
      rule,
      score: rule.terms.reduce((total, term) => total + (text.includes(term.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.rule || null;
};

const buildCallAnomaly = (params: {
  sentiment: string;
  csatScore: number;
  qaScore: number;
  isEscalated: boolean;
  evidenceText: string;
}): ExactHistoryItem['anomaly'] => {
  const sentimentLower = params.sentiment.toLowerCase();
  const isNegative = sentimentLower.includes('negative') || sentimentLower.includes('ลบ');
  const lowCsat = params.csatScore > 0 && params.csatScore <= 2;
  const lowQa = params.qaScore > 0 && params.qaScore <= 5;
  const matchedTerms = ANOMALY_SIGNAL_TERMS
    .filter((term) => params.evidenceText.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 4);

  const reasons = [
    params.isEscalated ? 'รายการนี้ถูกระบุว่าเป็นเคส escalated' : '',
    isNegative ? 'Sentiment เป็น negative' : '',
    lowCsat ? `CSAT ต่ำ (${params.csatScore}/5)` : '',
    lowQa ? `QA ต่ำ (${params.qaScore}/10)` : '',
    matchedTerms.length ? `พบคำ/บริบทเสี่ยง: ${matchedTerms.join(', ')}` : '',
  ].filter(Boolean);

  const level = params.isEscalated || lowCsat || matchedTerms.length >= 2
    ? 'พบความเสี่ยง'
    : (isNegative || lowQa || matchedTerms.length > 0 ? 'ควรเฝ้าระวัง' : 'ไม่พบสัญญาณผิดปกติชัดเจน');

  return {
    label: level,
    reasons: reasons.length ? reasons : ['ไม่พบคำหยาบ การโต้เถียง หรือสัญญาณ escalation จากข้อมูลที่มี'],
  };
};

const parseEnhancedKeywordsPayload = (payload: unknown): string[] => {
  if (!payload) return [];
  const source = isObject(payload) && isObject(payload.keywords) ? payload.keywords : payload;
  return normalizeInsightList(collectKeywordValues(source)).slice(0, 12);
};

const parseEnhancedTopicPayload = (payload: unknown): { topic: string; reason: string } => {
  const source = isObject(payload) && isObject(payload.topic) ? payload.topic : payload;
  if (!isObject(source)) return { topic: '', reason: '' };

  return {
    topic: pickInsightText(source.primary_category, source.topic, source.intent, source.category),
    reason: pickInsightText(source.reason, source.description, source.summary),
  };
};

const fetchEnhancedCallInsightParts = async (fileId: string): Promise<{ keywords: string[]; topic: string; topicReason: string }> => {
  if (!fileId) return { keywords: [], topic: '', topicReason: '' };

  const [keywordsPayload, topicPayload] = await Promise.all([
    fetchJson(`${API_BASE}/api/v1/ai/keywords/${encodeURIComponent(fileId)}`),
    fetchJson(`${API_BASE}/api/v1/ai/topic/${encodeURIComponent(fileId)}`),
  ]);
  const topic = parseEnhancedTopicPayload(topicPayload);

  return {
    keywords: parseEnhancedKeywordsPayload(keywordsPayload),
    topic: topic.topic,
    topicReason: topic.reason,
  };
};

const extractCallIndex = (question: string): number | null => {
  const match = normalizeText(question).match(/(?:สาย|รายการ|เคส)\s*(?:ที่)?\s*(\d{1,2})/iu);
  if (!match?.[1]) return null;

  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
};

const isWarrantyHistoryQuestion = (question: string): boolean => {
  const normalized = normalizeText(question);
  return WARRANTY_HISTORY_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
};

const isWarrantyLookupQuestion = (question: string): boolean => {
  const normalized = normalizeText(question);
  return WARRANTY_LOOKUP_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
};

const isLegacyAutoIdQuestion = (question: string): boolean =>
  !!extractLegacyAutoId(question) || normalizeText(question).includes('auto id');

const isChatbotHelpQuestion = (question: string): boolean => {
  const normalized = normalizeText(question);
  return CHATBOT_HELP_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
};

const isRagDesignQuestion = (question: string): boolean => {
  const normalized = normalizeText(question);
  const hasRagKeyword = RAG_DESIGN_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
  const hasDesignIntent = RAG_DESIGN_INTENT_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
  return hasRagKeyword && hasDesignIntent;
};

const formatChatbotHelpReply = (): string => [
  'Chatbot รุ่นนี้ใช้ค้นข้อมูลประกันจาก backend ก่อน แล้วค่อยถาม RAG/Qdrant สำหรับคำถามปลายเปิด',
  '',
  'ตัวอย่างที่พิมพ์ได้:',
  '- เบอร์ 0819979336 มีประกันอะไรบ้าง',
  '- ตรวจทะเบียนประกัน LOT-2026-0102',
  '- Serial LT-HY-Q5-774455 หมดประกันวันไหน',
  '- ลูกค้าคนไหนขอคืนเงิน',
  '- หัวข้อแก้ไขปัญหา/ขอความช่วยเหลือเป็นของลูกค้าคนไหน',
  '- หัวข้อที่ลูกค้าถามเยอะที่สุดคืออะไร',
  '',
  'สิ่งที่ระบบตอบกลับ:',
  '- สถานะประกัน, ลูกค้า, สินค้า, Serial, วันซื้อ, วันส่ง, วันหมดประกัน',
  '- ประวัติการโทรและหัวข้อสนทนาที่ผูกกับลูกค้า',
  '- รายชื่อลูกค้าหรือเคสที่อยู่ใน Topic Distribution',
].join('\n');

const formatRagDesignReply = (): string => [
  'แบบข้อมูลที่ควรเข้า RAG/Qdrant สำหรับโปรเจคนี้:',
  '',
  '1. Warranty record ต่อ 1 point',
  '- customer_phone, customer_name, registration_no, serial_no, order_number',
  '- brand, model/category, size, warranty_period, purchase_date, delivery_date, expiry_date, status',
  '- sale_channel, agent_id, file_id, warranty_source, qdrant_synced',
  '',
  '2. Call analysis record ต่อ 1 point',
  '- file_id, customer_phone, transcript, summary, summary_points, key_insights',
  '- intent/topic, sentiment, csat_score, qa_score, agent_id, call_timestamp',
  '- brand/product ที่ AI ตรวจจับได้',
  '',
  '3. Payload metadata ที่ควรเก็บไว้ filter',
  '- type: warranty หรือ call_analysis',
  '- customer_phone, registration_no, serial_no, order_number, brand, status, topic, agent_id, created_at',
  '',
  'แนวใช้งานที่แนะนำ:',
  '- ถามแบบระบุตัวตน เช่น เบอร์/ทะเบียน/Serial ให้ค้น structured backend ก่อน เพื่อไม่พลาดแม้ยังไม่ sync Qdrant',
  '- ถามปลายเปิด เช่น “ลูกค้าคนไหนขอคืนเงิน” หรือ “สรุปปัญหาประกัน” ค่อยใช้ RAG/Qdrant เพื่อดึงบริบทจาก transcript และ summary',
].join('\n');

const tryStaticChatbotGuideReply = (question: string): string | null => {
  if (isLegacyAutoIdQuestion(question)) {
    return [
      'ระบบนี้เลิกใช้ Auto ID แล้วครับ',
      'ให้ค้นด้วยข้อมูลจริงแทน เช่น:',
      '- เบอร์โทรลูกค้า',
      '- เลขทะเบียนประกัน เช่น LOT-2026-0102',
      '- Serial No. เช่น LT-HY-Q5-774455',
      '- เลขคำสั่งซื้อ',
    ].join('\n');
  }

  if (isRagDesignQuestion(question)) return formatRagDesignReply();
  if (isChatbotHelpQuestion(question)) return formatChatbotHelpReply();
  return null;
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

const mapTopicToGroupLabel = (name: string): string => {
  const text = compactText(name);
  if (!text) return 'ไม่ระบุหัวข้อ';

  for (const rule of TOPIC_GROUP_RULES) {
    if (rule.includes.some((token) => text.includes(compactText(token)))) return rule.label;
  }

  return name;
};

const groupTopicDistributionItems = (topics: TopicDistributionItem[]): TopicGroupMatch[] => {
  const grouped = new Map<string, TopicDistributionItem[]>();

  for (const topic of topics) {
    const label = mapTopicToGroupLabel(topic.name);
    const bucket = grouped.get(label) || [];
    bucket.push(topic);
    grouped.set(label, bucket);
  }

  const totalCount = topics.reduce((sum, topic) => sum + topic.count, 0);

  return Array.from(grouped.entries())
    .map(([label, groupTopics]) => {
      const count = groupTopics.reduce((sum, topic) => sum + topic.count, 0);
      return {
        label,
        topics: groupTopics,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    })
    .filter((group) => group.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
};

const buildTopicGroupAliases = (group: TopicGroupMatch): string[] => {
  const aliases = new Set<string>([group.label]);

  group.label
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => aliases.add(part));

  for (const topic of group.topics) {
    buildTopicAliases(topic.name).forEach((alias) => aliases.add(alias));
  }

  return Array.from(aliases);
};

const getMatchedTopicGroup = (
  question: string,
  topics: TopicDistributionItem[]
): TopicGroupMatch | null => {
  const normalizedQuestion = compactText(question);
  if (!normalizedQuestion) return null;

  const groups = groupTopicDistributionItems(topics);
  let bestMatch: TopicGroupMatch | null = null;
  let bestScore = 0;

  for (const group of groups) {
    for (const alias of buildTopicGroupAliases(group)) {
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
        bestMatch = group;
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

const extractWarrantyMeta = (payload: unknown): WarrantyMeta | null => {
  if (!isObject(payload) || !isObject(payload.data)) return null;

  const warranty = isObject(payload.data.warranty) ? payload.data.warranty : null;
  const callHistory = isObject(payload.data.call_history) ? payload.data.call_history : null;

  const callHistoryRegistrationNo = toText(
    callHistory?.registration_no ?? payload.data.registration_no,
    '-'
  );
  const warrantyRegistrationNo = toText(warranty?.registration_no, '-');
  const serialNo = toText(
    warranty?.serial_no ?? payload.data.serial_no,
    '-'
  );
  const normalizedStatus = toText(warranty?.status).toUpperCase();
  const normalizedWarrantyRegistrationNo = warrantyRegistrationNo.toUpperCase();
  const isDeleted = normalizedStatus === 'DELETED' || normalizedWarrantyRegistrationNo.startsWith('DELETED-');
  const registrationNo = isDeleted
    ? '-'
    : (warrantyRegistrationNo !== '-' ? warrantyRegistrationNo : callHistoryRegistrationNo);

  if ((!registrationNo || registrationNo === '-') && (!serialNo || serialNo === '-')) {
    return null;
  }

  return {
    registrationNo: registrationNo || '-',
    serialNo: isDeleted ? '-' : (serialNo || '-'),
    hasWarranty: !isDeleted && (registrationNo !== '-' || serialNo !== '-'),
  };
};

const appendWarrantyMeta = (
  answerText: string,
  meta: WarrantyMeta | null,
  options?: { preserveAnswerOnNoWarranty?: boolean }
): string => {
  if (!meta) return answerText;

  const normalizedAnswerText = answerText.replace(
    /🛡️\s*ข้อมูลประกัน:\s*DELETED-[^\n]*/giu,
    '🛡️ ข้อมูลประกัน: ไม่มีประกัน'
  );

  const lines: string[] = [];

  if (!meta.hasWarranty) {
    if (options?.preserveAnswerOnNoWarranty) {
      if (!containsValue(normalizedAnswerText, 'ไม่มีประกัน')) {
        lines.push('🛡️ ข้อมูลประกัน: ไม่มีประกัน');
      }
      if (meta.registrationNo !== '-' && !containsValue(normalizedAnswerText, meta.registrationNo)) {
        lines.push(`เลขทะเบียนประกัน: ${meta.registrationNo}`);
      }
      if (!lines.length) return normalizedAnswerText;
      return `${normalizedAnswerText}\n${lines.join('\n')}`;
    }

    const minimalLines = ['🛡️ ข้อมูลประกัน: ไม่มีประกัน'];
    if (meta.registrationNo !== '-') {
      minimalLines.push(`เลขทะเบียนประกัน: ${meta.registrationNo}`);
    }
    return minimalLines.join('\n');
  }

  if (meta.registrationNo !== '-' && !containsValue(normalizedAnswerText, meta.registrationNo)) {
    lines.push(`เลขทะเบียนประกัน: ${meta.registrationNo}`);
  }

  if (meta.serialNo !== '-' && !containsValue(normalizedAnswerText, meta.serialNo)) {
    lines.push(`🔢 Serial No.: ${meta.serialNo}`);
  }

  if (!lines.length) return normalizedAnswerText;
  return `${normalizedAnswerText}\n${lines.join('\n')}`;
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
        registrationNo: toText(item.registration_no, '-'),
        serialNo: toText(item.serial_no, '-'),
        orderNumber: toText(item.order_number, '-'),
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

const parseWarrantyRecords = (payload: unknown): ExactWarrantyRecord[] => {
  return toArray(payload, ['warranties', 'results', 'items', 'data'])
    .map((item) => {
      if (!isObject(item)) return null;

      return {
        fileId: toText(item.file_id),
        registrationNo: toText(item.registration_no, '-'),
        serialNo: toText(item.serial_no, '-'),
        orderNumber: toText(item.order_number, '-'),
        customerPhone: toText(item.customer_phone ?? item.phone, '-'),
        customerName: toText(item.customer_name, '-'),
        brand: toText(item.brand, '-'),
        model: toText(item.model ?? item.product ?? item.product_name ?? item.category, '-'),
        status: toText(item.status, '-'),
        warrantyPeriod: toText(item.warranty_period, '-'),
        purchaseDate: toText(item.purchase_date ?? item.date_of_purchase, '-'),
        deliveryDate: toText(item.date_of_delivery ?? item.delivery_date, '-'),
        warrantyStartDate: toText(item.warranty_start_date ?? item.registrationDate, '-'),
        warrantyEndDate: toText(item.warranty_end_date, '-'),
        expiryDate: toText(item.expiry_date_of_warranty ?? item.expiry_date ?? item.warranty_expiry_date, '-'),
        saleChannel: toText(item.sale_channel ?? item.purchase_channel, '-'),
        agentId: toText(item.agent_id, '-'),
      };
    })
    .filter((item): item is ExactWarrantyRecord => item !== null);
};

const isDeletedWarrantyRecord = (record: ExactWarrantyRecord): boolean => {
  const normalizedStatus = String(record.status || '').trim().toUpperCase();
  const normalizedRegistration = String(record.registrationNo || '').trim().toUpperCase();
  return normalizedStatus === 'DELETED' || normalizedRegistration.startsWith('DELETED-');
};

const isGeneratedWarrantyRecord = (record: ExactWarrantyRecord): boolean => {
  const normalizedStatus = String(record.status || '').trim().toUpperCase();
  const normalizedRegistration = String(record.registrationNo || '').trim().toUpperCase();
  const normalizedOrder = String(record.orderNumber || '').trim().toUpperCase();
  const normalizedSerial = String(record.serialNo || '').trim().toUpperCase();
  return (
    normalizedStatus === 'INFERRED'
    || normalizedRegistration.startsWith('AUTO-')
    || normalizedOrder.startsWith('CALL-')
    || normalizedSerial.startsWith('MOCK')
  );
};

const filterVisibleWarrantyRecords = (records: ExactWarrantyRecord[]): ExactWarrantyRecord[] =>
  records.filter((record) => !isDeletedWarrantyRecord(record) && !isGeneratedWarrantyRecord(record));

const parseExactWarrantyRecordFromQueryPayload = (payload: unknown): ExactWarrantyQueryMatch | null => {
  if (!isObject(payload) || !isObject(payload.data)) return null;

  const warranty = isObject(payload.data.warranty) ? payload.data.warranty : null;
  const callHistory = isObject(payload.data.call_history) ? payload.data.call_history : null;
  if (!warranty) return null;

  const record: ExactWarrantyRecord = {
    fileId: toText(callHistory?.file_id ?? warranty.file_id),
    registrationNo: toText(warranty.registration_no ?? callHistory?.registration_no, '-'),
    serialNo: toText(warranty.serial_no ?? payload.data.serial_no, '-'),
    orderNumber: toText(warranty.order_number, '-'),
    customerPhone: toText(payload.data.customer_phone ?? callHistory?.customer_phone, '-'),
    customerName: toText(warranty.customer_name, '-'),
    brand: toText(warranty.brand, '-'),
    model: toText(warranty.model ?? warranty.category ?? warranty.product ?? warranty.product_name, '-'),
    status: toText(warranty.status, '-'),
    warrantyPeriod: toText(warranty.warranty_period, '-'),
    purchaseDate: toText(warranty.purchase_date ?? warranty.date_of_purchase, '-'),
    deliveryDate: toText(warranty.date_of_delivery ?? warranty.delivery_date, '-'),
    warrantyStartDate: toText(warranty.warranty_start_date ?? warranty.registrationDate, '-'),
    warrantyEndDate: toText(warranty.warranty_end_date, '-'),
    expiryDate: toText(warranty.expiry_date_of_warranty ?? warranty.expiry_date ?? warranty.warranty_expiry_date, '-'),
    saleChannel: toText(warranty.sale_channel ?? warranty.purchase_channel, '-'),
    agentId: toText(callHistory?.agent_id, '-'),
  };

  if (isDeletedWarrantyRecord(record) || isGeneratedWarrantyRecord(record)) return null;

  const historyFileId = toText(callHistory?.file_id);
  const historyCallDate = toText(
    callHistory?.call_date ?? callHistory?.call_timestamp ?? callHistory?.created_at,
    '-'
  );

  return {
    record,
    callHistory: callHistory
      ? {
          fileId: historyFileId,
          callDate: historyCallDate,
          agentId: toText(callHistory?.agent_id, '-'),
        }
      : null,
  };
};

const findExactWarrantyRecord = (
  records: ExactWarrantyRecord[],
  registrationNo: string | null,
  serialNo: string | null,
  orderNumber: string | null
): ExactWarrantyRecord | null => {
  const exactMatch = records.find((record) => {
    const registrationMatches = registrationNo
      ? compactText(record.registrationNo) === compactText(registrationNo)
      : true;
    const serialMatches = serialNo
      ? compactText(record.serialNo) === compactText(serialNo)
      : true;
    const orderMatches = orderNumber
      ? compactText(record.orderNumber) === compactText(orderNumber)
      : true;

    return registrationMatches && serialMatches && orderMatches;
  });

  if (exactMatch) return exactMatch;

  if (registrationNo) {
    const registrationOnlyMatch = records.find(
      (record) => compactText(record.registrationNo) === compactText(registrationNo)
    );
    if (registrationOnlyMatch) return registrationOnlyMatch;
  }

  if (serialNo) {
    const serialOnlyMatch = records.find(
      (record) => compactText(record.serialNo) === compactText(serialNo)
    );
    if (serialOnlyMatch) return serialOnlyMatch;
  }

  if (orderNumber) {
    const orderOnlyMatch = records.find(
      (record) => compactText(record.orderNumber) === compactText(orderNumber)
    );
    if (orderOnlyMatch) return orderOnlyMatch;
  }

  return null;
};

const fetchExactWarrantyRecord = async (params: {
  registrationNo: string | null;
  serialNo: string | null;
  orderNumber: string | null;
}): Promise<ExactWarrantyRecord | null> => {
  if (!params.registrationNo && !params.serialNo && !params.orderNumber) return null;

  const payload = await fetchJson(`${API_BASE}/api/v1/warranty/list`);
  if (!payload) return null;

  return findExactWarrantyRecord(
    filterVisibleWarrantyRecords(parseWarrantyRecords(payload)),
    params.registrationNo,
    params.serialNo,
    params.orderNumber
  );
};

const fetchVisibleWarrantiesByPhone = async (phone: string): Promise<ExactWarrantyRecord[]> => {
  const normalizedPhone = String(phone || '').trim();
  if (!normalizedPhone) return [];

  const payload = await fetchJson(
    `${API_BASE}/api/v1/customers/${encodeURIComponent(`CUST-${normalizedPhone}`)}`
  );
  if (!payload) return [];

  return filterVisibleWarrantyRecords(parseWarrantyRecords(payload));
};

const fetchExactWarrantyRecordFromBackendQuery = async (question: string): Promise<ExactWarrantyQueryMatch | null> => {
  const payload = await fetchJson(`${API_BASE}/api/v1/warranty/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  return parseExactWarrantyRecordFromQueryPayload(payload);
};

const enrichExactWarrantyRecord = async (record: ExactWarrantyRecord): Promise<ExactWarrantyRecord> => {
  if (!record.fileId) return record;

  const payload = await fetchJson(`${API_BASE}/api/v1/audio/detail/${encodeURIComponent(record.fileId)}`);
  const analysis = isObject(payload) && isObject(payload.analysis) ? payload.analysis : null;
  const file = isObject(payload) && isObject(payload.file) ? payload.file : null;

  return {
    ...record,
    status: pickPreferredText(analysis?.status, record.status),
    purchaseDate: pickPreferredText(analysis?.purchase_date ?? analysis?.date_of_purchase, record.purchaseDate),
    deliveryDate: pickPreferredText(analysis?.date_of_delivery ?? file?.date_of_delivery, record.deliveryDate),
    warrantyStartDate: pickPreferredText(analysis?.warranty_start_date ?? analysis?.registrationDate, record.warrantyStartDate),
    warrantyEndDate: pickPreferredText(analysis?.warranty_end_date, record.warrantyEndDate),
    expiryDate: pickPreferredText(analysis?.expiry_date_of_warranty ?? analysis?.warranty_end_date, record.expiryDate),
  };
};

const fetchExactHistoryItem = async (item: EnrichedTopicSearchResult): Promise<ExactHistoryItem> => {
  const [payload, enhancedParts] = await Promise.all([
    fetchJson(`${API_BASE}/api/v1/audio/detail/${encodeURIComponent(item.fileId)}`),
    fetchEnhancedCallInsightParts(item.fileId),
  ]);
  const analysis = isObject(payload) && isObject(payload.analysis) ? payload.analysis : null;
  const file = isObject(payload) && isObject(payload.file) ? payload.file : null;

  const summaryPointLines = Array.isArray(analysis?.summary_points)
    ? analysis.summary_points
        .flatMap((point) => splitStructuredLines(toText(point)).map(normalizeSummaryPointForInsight))
        .filter(Boolean)
    : [];

  const rawSummaryLines = dedupeStructuredLines([
    ...splitStructuredLines(item.summary),
    ...splitStructuredLines(toText(analysis?.summary ?? analysis?.summary_text)),
    ...summaryPointLines,
  ]);

  const summaryLines = rawSummaryLines.filter((line) => !/^💡\s*key insights:/iu.test(line));
  const keyInsightsLines = dedupeStructuredLines([
    ...rawSummaryLines
      .filter((line) => /^💡\s*key insights:/iu.test(line))
      .map(stripKeyInsightsPrefix),
    ...splitStructuredLines(toText(analysis?.key_insights)).map(stripKeyInsightsPrefix),
  ]);
  const transcriptText = cleanInsightValue(
    toText(analysis?.full_transcript)
    || (Array.isArray(analysis?.transcription)
      ? analysis.transcription
          .map((line) => isObject(line) ? toText(line.text ?? line.subtitle) : '')
          .filter(Boolean)
          .join(' ')
      : '')
  );
  const evidenceText = cleanInsightValue([
    transcriptText,
    item.summary,
    toText(analysis?.summary ?? analysis?.summary_text),
    toText(analysis?.intent ?? analysis?.topic),
    enhancedParts.topic,
    enhancedParts.topicReason,
    toText(analysis?.key_insights),
    ...summaryPointLines,
    ...collectKeywordValues(analysis?.keywords),
    ...enhancedParts.keywords,
  ].join(' '));
  const topicRule = findChatbotTopicRule(evidenceText);
  const normalizedSummaryPoints = normalizeInsightList(summaryPointLines);
  const deepInsight = normalizeDeepInsightForChatbot(
    analysis?.deep_insight ?? analysis?.deep_insight_json ?? (isObject(analysis?.analysis_detail) ? analysis.analysis_detail.deep_insight : null)
  );
  const topic = pickInsightText(
    topicRule?.label,
    enhancedParts.topic,
    analysis?.intent,
    analysis?.topic,
    item.topic
  ) || '-';
  const contactReason = pickInsightText(
    topicRule?.contactReason,
    enhancedParts.topicReason,
    deepInsight?.customerNeed,
    normalizedSummaryPoints[0],
    item.summary
  ) || '-';
  const keywords = normalizeInsightList([
    ...collectKeywordValues(analysis?.keywords),
    ...enhancedParts.keywords,
    item.brand,
    item.product,
  ]).slice(0, 8);
  const sentiment = toText(analysis?.sentiment ?? analysis?.sentiment_label, item.sentiment || '-');

  return {
    fileId: item.fileId,
    callTimestamp: toText(
      analysis?.call_timestamp ?? analysis?.call_date ?? file?.call_date ?? file?.call_timestamp,
      item.createdAt || '-'
    ),
    agentId: toText(analysis?.agent_id, item.agentId || '-'),
    callType: toText(file?.call_type ?? file?.type ?? analysis?.call_type, item.saleChannel || '-'),
    customerPhone: toText(analysis?.customer_phone ?? file?.customer_phone, item.customerPhone || '-'),
    brand: toText(analysis?.brand_name ?? file?.brand_name, item.brand || '-'),
    sentiment,
    topic,
    contactReason,
    keywords,
    anomaly: buildCallAnomaly({
      sentiment,
      csatScore: toNumber(analysis?.csat_score),
      qaScore: toNumber(analysis?.qa_score),
      isEscalated: Boolean(analysis?.is_escalated),
      evidenceText,
    }),
    deepInsight,
    summaryLines,
    keyInsightsLines,
  };
};

const formatKeywordList = (keywords: string[]): string =>
  keywords.length ? keywords.join(', ') : '-';

const appendDeepInsightLines = (lines: string[], item: ExactHistoryItem): void => {
  if (!item.deepInsight) {
    const fallbackInsight = item.keyInsightsLines[0] || item.summaryLines[0];
    if (fallbackInsight) lines.push(`- Key Insight: ${truncateText(fallbackInsight, 180)}`);
    return;
  }

  lines.push('อินไซต์ลูกค้า:');
  if (item.deepInsight.customerNeed) lines.push(`- ลูกค้าต้องการอะไร: ${item.deepInsight.customerNeed}`);
  if (item.deepInsight.painPoint) lines.push(`- ปัญหาหลัก: ${item.deepInsight.painPoint}`);
  if (item.deepInsight.rootCause) lines.push(`- สาเหตุที่น่าจะเกิด: ${item.deepInsight.rootCause}`);
  if (item.deepInsight.expectation) lines.push(`- สิ่งที่ลูกค้าคาดหวัง: ${item.deepInsight.expectation}`);
  if (item.deepInsight.recommendedAction) lines.push(`- สิ่งที่ควรทำต่อ: ${item.deepInsight.recommendedAction}`);

  const riskParts = [
    item.deepInsight.riskLevel ? `ระดับความเสี่ยง ${item.deepInsight.riskLevel}` : '',
    typeof item.deepInsight.confidence === 'number' ? `ความมั่นใจ ${item.deepInsight.confidence}%` : '',
  ].filter(Boolean);
  if (riskParts.length) lines.push(`- ${riskParts.join(' | ')}`);
};

const appendCallSummaryInsightLines = (
  lines: string[],
  item: ExactHistoryItem,
  displayIndex: number
): void => {
  lines.push('', `สายที่ ${displayIndex}:`);
  lines.push(`- วันที่: ${formatDisplayDateTime(item.callTimestamp)}`);
  lines.push(`- Agent: ${item.agentId || '-'}`);
  lines.push(`- File ID: ${item.fileId || '-'}`);
  if (item.callType && item.callType !== '-') lines.push(`- ประเภทสาย: ${item.callType}`);
  if (item.brand && item.brand !== '-') lines.push(`- แบรนด์: ${item.brand}`);
  if (item.sentiment && item.sentiment !== '-') lines.push(`- Sentiment: ${item.sentiment}`);

  lines.push('Summary Insight:');
  if (item.topic && item.topic !== '-') lines.push(`- Topic/Intent: ${item.topic}`);
  if (item.contactReason && item.contactReason !== '-') lines.push(`- สาเหตุการติดต่อ: ${item.contactReason}`);
  lines.push(`- Keywords: ${formatKeywordList(item.keywords)}`);
  lines.push(`- Anomaly Detection: ${item.anomaly.label}`);
  if (item.anomaly.reasons.length) {
    lines.push(`- เหตุผลความเสี่ยง: ${item.anomaly.reasons.join(' | ')}`);
  }
  appendDeepInsightLines(lines, item);
};

const formatExactWarrantyReply = (
  record: ExactWarrantyRecord,
  historyCount: number,
  historyItems: ExactHistoryItem[],
  includeHistory: boolean
): string => {
  const identifier = record.registrationNo !== '-'
    ? record.registrationNo
    : (record.serialNo !== '-' ? `Serial No. ${record.serialNo}` : 'รายการนี้');
  const resolvedDeliveryDate = record.deliveryDate !== '-'
    ? formatDisplayDate(record.deliveryDate)
    : (record.purchaseDate !== '-' ? formatDisplayDate(record.purchaseDate) : '-');
  const resolvedExpiryDate = record.expiryDate !== '-'
    ? formatDisplayDate(record.expiryDate)
    : (record.warrantyEndDate !== '-' ? formatDisplayDate(record.warrantyEndDate) : calculateExpiryDateFromWarranty(record.purchaseDate, record.warrantyPeriod));
  const lines = ['ข้อมูลประกัน:', `- ผลการตรวจสอบ: ${resolveWarrantyCoverage(record)}`];

  if (record.registrationNo !== '-') {
    lines.push(`- เลขทะเบียนประกัน: ${record.registrationNo}`);
  } else {
    lines.push(`- รายการอ้างอิง: ${identifier}`);
  }

  if (record.customerPhone !== '-') lines.push(`- 📞 เบอร์โทร: ${record.customerPhone}`);
  if (record.customerName !== '-') lines.push(`- 👤 ลูกค้า: ${record.customerName}`);

  const productLabel = [record.brand, record.model].filter((value) => value && value !== '-').join(' - ');
  if (productLabel) lines.push(`- 📦 สินค้า: ${productLabel}`);

  if (record.serialNo !== '-') lines.push(`- 🔢 Serial No.: ${record.serialNo}`);
  if (record.orderNumber !== '-') lines.push(`- เลขคำสั่งซื้อ: ${record.orderNumber}`);
  if (record.status !== '-') lines.push(`- 🛡️ สถานะ: ${record.status}`);
  if (record.purchaseDate !== '-') lines.push(`- 📅 วันที่ซื้อ: ${formatDisplayDate(record.purchaseDate)}`);
  if (resolvedDeliveryDate !== '-') lines.push(`- 🚚 วันที่ส่ง: ${resolvedDeliveryDate}`);
  if (record.warrantyPeriod !== '-') lines.push(`- ⏳ ระยะประกัน: ${record.warrantyPeriod}`);
  if (resolvedExpiryDate !== '-') lines.push(`- 📆 วันที่หมดประกัน: ${resolvedExpiryDate}`);
  if (record.saleChannel !== '-') lines.push(`- 🛒 ช่องทางขาย: ${record.saleChannel}`);
  if (record.agentId !== '-') lines.push(`- 🧑‍💼 Agent: ${record.agentId}`);

  if (!includeHistory) return lines.join('\n');

  lines.push('', 'ประวัติการโทร:');

  if (!record.customerPhone || record.customerPhone === '-') {
    lines.push(`- ไม่พบเบอร์โทรที่ใช้ตรวจสอบประวัติการติดต่อของ ${identifier}`);
    return lines.join('\n');
  }

  if (!historyCount) {
    lines.push(`- ไม่พบประวัติการโทรที่ผูกกับ ${identifier} โดยตรง`);
    return lines.join('\n');
  }

  lines.push(`- พบ ${historyCount} สายที่ผูกกับ ${identifier}`);
  lines.push('- แยกแต่ละสายด้วยวันที่, Agent, ประเภทสาย และ File ID');

  historyItems.forEach((item, index) => {
    appendCallSummaryInsightLines(lines, item, index + 1);
  });

  if (historyCount > historyItems.length) {
    lines.push('', `- แสดงล่าสุด ${historyItems.length} จากทั้งหมด ${historyCount} สาย`);
  }

  return lines.join('\n');
};

const formatWarrantyListReply = (phone: string, records: ExactWarrantyRecord[]): string => {
  if (!records.length) {
    return `ไม่พบข้อมูลประกันของลูกค้า ${phone} ในระบบ`;
  }

  const lines = [`พบข้อมูลประกันของลูกค้า ${phone} จำนวน ${records.length} รายการ`];

  records.slice(0, 5).forEach((record, index) => {
    const productLabel = [record.brand, record.model].filter((value) => value && value !== '-').join(' - ') || '-';
    const resolvedDeliveryDate = record.deliveryDate !== '-'
      ? formatDisplayDate(record.deliveryDate)
      : (record.purchaseDate !== '-' ? formatDisplayDate(record.purchaseDate) : '-');
    const resolvedExpiryDate = record.expiryDate !== '-'
      ? formatDisplayDate(record.expiryDate)
      : (record.warrantyEndDate !== '-' ? formatDisplayDate(record.warrantyEndDate) : calculateExpiryDateFromWarranty(record.purchaseDate, record.warrantyPeriod));

    lines.push('', `รายการที่ ${index + 1}:`);
    lines.push(`- ผลการตรวจสอบ: ${resolveWarrantyCoverage(record)}`);
    if (record.registrationNo !== '-') lines.push(`- เลขทะเบียนประกัน: ${record.registrationNo}`);
    if (record.customerName !== '-') lines.push(`- ลูกค้า: ${record.customerName}`);
    lines.push(`- สินค้า: ${productLabel}`);
    if (record.serialNo !== '-') lines.push(`- Serial No.: ${record.serialNo}`);
    if (record.orderNumber !== '-') lines.push(`- เลขคำสั่งซื้อ: ${record.orderNumber}`);
    if (record.status !== '-') lines.push(`- สถานะ: ${record.status}`);
    if (record.purchaseDate !== '-') lines.push(`- วันที่ซื้อ: ${formatDisplayDate(record.purchaseDate)}`);
    if (resolvedDeliveryDate !== '-') lines.push(`- วันที่ส่ง: ${resolvedDeliveryDate}`);
    if (record.warrantyPeriod !== '-') lines.push(`- ระยะประกัน: ${record.warrantyPeriod}`);
    if (resolvedExpiryDate !== '-') lines.push(`- วันที่หมดประกัน: ${resolvedExpiryDate}`);
    if (record.saleChannel !== '-') lines.push(`- ช่องทางขาย: ${record.saleChannel}`);
  });

  if (records.length > 5) {
    lines.push('', `แสดง 5 รายการแรกจากทั้งหมด ${records.length} รายการ`);
  }

  lines.push('', 'ถามต่อได้ เช่น “ขอประวัติการโทรของเบอร์นี้” หรือ “ตรวจ Serial ของรายการที่ต้องการ”');
  return lines.join('\n');
};

const tryStructuredWarrantyLookupReply = async (question: string): Promise<string | null> => {
  const phone = extractPhoneNumber(question);
  if (!phone || !isWarrantyLookupQuestion(question) || isWarrantyHistoryQuestion(question)) {
    return null;
  }

  const records = await fetchVisibleWarrantiesByPhone(phone);
  if (!records.length) {
    return `ไม่พบข้อมูลประกันของลูกค้า ${phone} ในระบบ`;
  }

  const enrichedRecords = await Promise.all(
    records.slice(0, 5).map((record) => enrichExactWarrantyRecord(record))
  );
  const remainingRecords = records.slice(5);
  return formatWarrantyListReply(phone, [...enrichedRecords, ...remainingRecords]);
};

const fetchCustomerWarrantyLookup = async (phone: string): Promise<Map<string, { registrationNo: string; serialNo: string; orderNumber: string }>> => {
  const normalizedPhone = String(phone || '').trim();
  if (!normalizedPhone) return new Map();

  const payload = await fetchJson(
    `${API_BASE}/api/v1/customers/${encodeURIComponent(`CUST-${normalizedPhone}`)}`
  );

  const lookup = new Map<string, { registrationNo: string; serialNo: string; orderNumber: string }>();
  for (const item of toArray(payload, ['warranties'])) {
    if (!isObject(item)) continue;

    const fileId = toText(item.file_id);
    if (!fileId) continue;

    const normalizedStatus = String(item.status || '').trim().toUpperCase();
    const normalizedRegistration = String(item.registration_no || '').trim().toUpperCase();
    const normalizedOrder = String(item.order_number || '').trim().toUpperCase();
    const normalizedSerial = String(item.serial_no || '').trim().toUpperCase();
    if (
      normalizedStatus === 'DELETED'
      || normalizedStatus === 'INFERRED'
      || normalizedRegistration.startsWith('DELETED-')
      || normalizedRegistration.startsWith('AUTO-')
      || normalizedOrder.startsWith('CALL-')
      || normalizedSerial.startsWith('MOCK')
    ) {
      continue;
    }

    lookup.set(fileId, {
      registrationNo: toText(item.registration_no, '-'),
      serialNo: toText(item.serial_no, '-'),
      orderNumber: toText(item.order_number, '-'),
    });
  }

  return lookup;
};

const enrichTopicSearchResults = async (
  results: TopicSearchResult[]
): Promise<EnrichedTopicSearchResult[]> => {
  const phones = Array.from(
    new Set(
      results
        .map((item) => item.customerPhone)
        .filter((phone) => phone && phone !== '-')
    )
  );

  const lookups = new Map<string, Map<string, { registrationNo: string; serialNo: string; orderNumber: string }>>();
  await Promise.all(
    phones.map(async (phone) => {
      lookups.set(phone, await fetchCustomerWarrantyLookup(phone));
    })
  );

  return results.map((item) => {
    const metadata = lookups.get(item.customerPhone)?.get(item.fileId);
    return {
      ...item,
      registrationNo: metadata?.registrationNo || item.registrationNo || '-',
      serialNo: metadata?.serialNo || item.serialNo || '-',
      orderNumber: metadata?.orderNumber || item.orderNumber || '-',
    };
  });
};

const filterEnrichedTopicResults = (
  results: EnrichedTopicSearchResult[],
  registrationNo: string | null,
  serialNo: string | null,
  orderNumber: string | null
): EnrichedTopicSearchResult[] => {
  if (!registrationNo && !serialNo && !orderNumber) return results;

  if (registrationNo) {
    return results.filter(
      (item) => compactText(item.registrationNo) === compactText(registrationNo)
    );
  }

  if (serialNo) {
    return results.filter(
      (item) => compactText(item.serialNo) === compactText(serialNo)
    );
  }

  if (orderNumber) {
    return results.filter(
      (item) => compactText(item.orderNumber) === compactText(orderNumber)
    );
  }

  return results;
};

const getTopicResultKey = (item: TopicSearchResult): string =>
  item.fileId || `${item.customerPhone}-${item.topic}-${item.createdAt}-${item.summary}`;

const dedupeTopicSearchResults = (results: TopicSearchResult[]): TopicSearchResult[] => {
  const seen = new Set<string>();
  const uniqueResults: TopicSearchResult[] = [];

  for (const item of results) {
    const key = getTopicResultKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueResults.push(item);
  }

  return uniqueResults;
};

const isSearchResultInTopicGroup = (item: TopicSearchResult, group: TopicGroupMatch): boolean => {
  const itemTopic = compactText(item.topic);
  if (!itemTopic) return false;

  if (mapTopicToGroupLabel(item.topic) === group.label) return true;

  return group.topics.some((topic) => compactText(topic.name) === itemTopic);
};

const searchTopicGroupResults = async (
  group: TopicGroupMatch,
  phone: string | null
): Promise<TopicSearchResponse | null> => {
  const filteredResponses = await Promise.all(
    group.topics.map((topic) => fetchTopicSearch({ phone, topic: topic.name, perPage: 50 }))
  );

  const filteredResults = filteredResponses.flatMap((response) => response?.results || []);
  const broadResponse = await fetchTopicSearch({ phone, perPage: phone ? 50 : 100 });
  const broadResults = (broadResponse?.results || []).filter((item) => isSearchResultInTopicGroup(item, group));
  const results = dedupeTopicSearchResults([...filteredResults, ...broadResults]);

  if (!results.length) {
    const total = filteredResponses.reduce((sum, response) => sum + (response?.total || 0), 0);
    return total > 0 ? { total, results } : null;
  }

  return {
    total: Math.max(results.length, filteredResponses.reduce((sum, response) => sum + (response?.total || 0), 0)),
    results,
  };
};

const formatTopicOverview = (topics: TopicDistributionItem[]): string => {
  if (!topics.length) {
    return 'ยังไม่พบข้อมูล Topic Distribution ในระบบตอนนี้';
  }

  const groups = groupTopicDistributionItems(topics);
  const lines = ['หัวข้อจาก Topic Distribution ที่พบในระบบ:'];

  groups.slice(0, 10).forEach((group) => {
    const percentage = group.percentage > 0 ? ` (${group.percentage.toFixed(2)}%)` : '';
    lines.push(`- ${group.label}: ${group.count} เคส${percentage}`);
  });

  lines.push('ลองถามต่อได้ เช่น "หัวข้อแก้ไขปัญหา/ขอความช่วยเหลือเป็นของลูกค้าคนไหน" หรือ "เบอร์ 0812345678 อยู่หัวข้ออะไร"');
  return lines.join('\n');
};

const formatTopicMatches = (
  topicGroup: TopicGroupMatch,
  searchResponse: TopicSearchResponse,
  enrichedResults: EnrichedTopicSearchResult[],
  phone: string | null
): string => {
  const displayTotal = enrichedResults.length !== searchResponse.results.length
    ? enrichedResults.length
    : (searchResponse.total || enrichedResults.length);

  if (!enrichedResults.length) {
    return phone
      ? `ไม่พบข้อมูลของลูกค้า ${phone} ในหัวข้อ "${topicGroup.label}"`
      : `ไม่พบข้อมูลลูกค้าที่อยู่ในหัวข้อ "${topicGroup.label}"`;
  }

  if (phone) {
    const lines = [`พบ ${displayTotal} รายการของลูกค้า ${phone} ในหัวข้อ "${topicGroup.label}"`];

    enrichedResults.slice(0, 5).forEach((item, index) => {
      lines.push(`- เคส ${index + 1}`);
      if (item.topic && item.topic !== '-') lines.push(`• Topic จริง: ${item.topic}`);
      lines.push(`• แบรนด์: ${item.brand}`);
      lines.push(`• Sentiment: ${item.sentiment}`);
      lines.push(`• Agent: ${item.agentId}`);
      if (item.registrationNo !== '-') lines.push(`• เลขทะเบียนประกัน: ${item.registrationNo}`);
      if (item.serialNo !== '-') lines.push(`• Serial No.: ${item.serialNo}`);
      if (item.orderNumber !== '-') lines.push(`• เลขคำสั่งซื้อ: ${item.orderNumber}`);
      if (item.summary) {
        lines.push(`สรุป: ${truncateText(item.summary)}`);
      }
    });

    return lines.join('\n');
  }

  const grouped = new Map<string, EnrichedTopicSearchResult[]>();
  for (const item of enrichedResults) {
    const key = item.customerPhone || item.fileId;
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const lines = [`พบ ${displayTotal} รายการในหัวข้อ "${topicGroup.label}" จาก ${grouped.size} ลูกค้า`];

  Array.from(grouped.entries()).slice(0, 5).forEach(([customerPhone, items]) => {
    const latest = items[0];
    lines.push(`- ลูกค้า ${customerPhone}: ${items.length} เคส`);
    if (latest.topic && latest.topic !== '-') lines.push(`• Topic จริงล่าสุด: ${latest.topic}`);
    lines.push(`• แบรนด์: ${latest.brand}`);
    lines.push(`• Agent: ${latest.agentId}`);
    if (latest.registrationNo !== '-') lines.push(`• เลขทะเบียนประกัน: ${latest.registrationNo}`);
    if (latest.serialNo !== '-') lines.push(`• Serial No.: ${latest.serialNo}`);
    if (latest.orderNumber !== '-') lines.push(`• เลขคำสั่งซื้อ: ${latest.orderNumber}`);
    if (latest.summary) {
      lines.push(`สรุปล่าสุด: ${truncateText(latest.summary)}`);
    }
  });

  if (displayTotal === searchResponse.results.length && searchResponse.total > searchResponse.results.length) {
    lines.push(`และยังมีอีก ${searchResponse.total - searchResponse.results.length} รายการ`);
  }

  return lines.join('\n');
};

const formatCustomerTopicOverview = (
  phone: string,
  searchResponse: TopicSearchResponse,
  enrichedResults: EnrichedTopicSearchResult[]
): string => {
  if (!enrichedResults.length) {
    return `ยังไม่พบข้อมูลหัวข้อของลูกค้า ${phone}`;
  }

  const grouped = new Map<string, EnrichedTopicSearchResult[]>();
  for (const item of enrichedResults) {
    const key = item.topic && item.topic !== '-'
      ? mapTopicToGroupLabel(item.topic)
      : 'ไม่ระบุหัวข้อ';
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
      if (latest.topic && latest.topic !== '-' && latest.topic !== topicName) {
        lines.push(`• Topic จริงล่าสุด: ${latest.topic}`);
      }
      if (latest.registrationNo !== '-') lines.push(`• เลขทะเบียนประกัน: ${latest.registrationNo}`);
      if (latest.serialNo !== '-') lines.push(`• Serial No.: ${latest.serialNo}`);
      if (latest.orderNumber !== '-') lines.push(`• เลขคำสั่งซื้อ: ${latest.orderNumber}`);
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

const fetchTopicSearch = async (params: { phone?: string | null; topic?: string; perPage?: number }): Promise<TopicSearchResponse | null> => {
  const query = new URLSearchParams();

  if (params.phone) query.set('q', params.phone);
  if (params.topic) query.set('topic', params.topic);
  query.set('page', '1');
  query.set('per_page', String(params.perPage ?? (params.phone ? 10 : 20)));

  const payload = await fetchJson(`${API_BASE}/api/v1/search/advanced?${query.toString()}`);
  if (!payload) return null;

  return parseSearchResults(payload);
};

const fetchCustomerCallHistoryResults = async (
  phone: string,
  options?: {
    registrationNo?: string | null;
    serialNo?: string | null;
    orderNumber?: string | null;
    perPage?: number;
  }
): Promise<{ total: number; results: EnrichedTopicSearchResult[] }> => {
  const searchResponse = await fetchTopicSearch({ phone, perPage: options?.perPage ?? 50 });
  if (!searchResponse) return { total: 0, results: [] };

  const enrichedResults = filterEnrichedTopicResults(
    await enrichTopicSearchResults(searchResponse.results),
    options?.registrationNo ?? null,
    options?.serialNo ?? null,
    options?.orderNumber ?? null
  );

  return {
    total: enrichedResults.length !== searchResponse.results.length
      ? enrichedResults.length
      : (searchResponse.total || enrichedResults.length),
    results: enrichedResults,
  };
};

const formatPhoneCallHistoryReply = (params: {
  phone: string;
  total: number;
  historyItems: ExactHistoryItem[];
  requestedIndex: number | null;
  displayStartIndex: number;
}): string => {
  if (!params.total) {
    return `ไม่พบประวัติการโทรของเบอร์ ${params.phone} ในระบบ`;
  }

  if (params.requestedIndex && !params.historyItems.length) {
    return `เบอร์ ${params.phone} มีประวัติ ${params.total} สาย แต่ไม่พบสายที่ ${params.requestedIndex}`;
  }

  const lines = [`ประวัติการโทรของเบอร์ ${params.phone}:`];
  lines.push(`- พบทั้งหมด ${params.total} สาย`);
  lines.push('- แยกแต่ละสายด้วยวันที่, Agent, ประเภทสาย และ File ID');

  params.historyItems.forEach((item, index) => {
    appendCallSummaryInsightLines(lines, item, params.displayStartIndex + index);
  });

  if (!params.requestedIndex && params.total > params.historyItems.length) {
    lines.push('', `- แสดงล่าสุด ${params.historyItems.length} จากทั้งหมด ${params.total} สาย`);
    lines.push(`- ถ้าต้องการเจาะสายเดียว ให้ถามเช่น "ขอสายที่ 2 ของเบอร์ ${params.phone}"`);
  }

  return lines.join('\n');
};

const tryCallHistoryReply = async (question: string): Promise<string | null> => {
  const phone = extractPhoneNumber(question);
  if (!phone || !isWarrantyHistoryQuestion(question)) return null;

  const requestedIndex = extractCallIndex(question);
  const registrationNo = extractRegistrationNumber(question);
  const serialNo = extractSerialNumber(question);
  const orderNumber = extractOrderNumber(question);
  const { total, results } = await fetchCustomerCallHistoryResults(phone, {
    registrationNo,
    serialNo,
    orderNumber,
    perPage: 50,
  });

  if (!total || !results.length) {
    return `ไม่พบประวัติการโทรของเบอร์ ${phone} ในระบบ`;
  }

  const selectedResults = requestedIndex
    ? results.slice(requestedIndex - 1, requestedIndex)
    : results.slice(0, 5);
  const historyItems = await Promise.all(selectedResults.map((item) => fetchExactHistoryItem(item)));

  return formatPhoneCallHistoryReply({
    phone,
    total,
    historyItems,
    requestedIndex,
    displayStartIndex: requestedIndex || 1,
  });
};

const tryTopicReply = async (question: string): Promise<string | null> => {
  const phone = extractPhoneNumber(question);
  const registrationNo = extractRegistrationNumber(question);
  const serialNo = extractSerialNumber(question);
  const orderNumber = extractOrderNumber(question);
  const topics = await fetchTopicDistribution();
  if (!topics.length) return null;

  const matchedTopicGroup = getMatchedTopicGroup(question, topics);
  const topicOverviewQuestion = isTopicOverviewQuestion(question);

  if (phone && !matchedTopicGroup && topicOverviewQuestion) {
    const searchResponse = await fetchTopicSearch({ phone });
    if (searchResponse) {
      const enrichedResults = await enrichTopicSearchResults(searchResponse.results);
      return formatCustomerTopicOverview(phone, searchResponse, enrichedResults);
    }
  }

  if (matchedTopicGroup) {
    const searchResponse = await searchTopicGroupResults(matchedTopicGroup, phone);
    if (searchResponse) {
      const enrichedResults = filterEnrichedTopicResults(
        await enrichTopicSearchResults(searchResponse.results),
        registrationNo,
        serialNo,
        orderNumber
      );

      if (!enrichedResults.length && (registrationNo || serialNo || orderNumber)) {
        return null;
      }

      return formatTopicMatches(matchedTopicGroup, searchResponse, enrichedResults, phone);
    }

    if (registrationNo || serialNo || orderNumber) {
      return null;
    }

    return phone
      ? `ไม่พบข้อมูลของลูกค้า ${phone} ในหัวข้อ "${matchedTopicGroup.label}"`
      : `ไม่พบข้อมูลลูกค้าที่อยู่ในหัวข้อ "${matchedTopicGroup.label}"`;
  }

  if (topicOverviewQuestion) {
    return formatTopicOverview(topics);
  }

  return null;
};

const formatCallInsightForRagContext = (item: ExactHistoryItem, index: number): string => {
  const parts = [
    `สายที่ ${index}`,
    `file_id: ${item.fileId || '-'}`,
    `customer_phone: ${item.customerPhone || '-'}`,
    `call_timestamp: ${formatDisplayDateTime(item.callTimestamp)}`,
    `agent_id: ${item.agentId || '-'}`,
    `call_type: ${item.callType || '-'}`,
    `brand: ${item.brand || '-'}`,
    `sentiment: ${item.sentiment || '-'}`,
    `topic_intent: ${item.topic || '-'}`,
    `contact_reason: ${item.contactReason || '-'}`,
    `keywords: ${formatKeywordList(item.keywords)}`,
    `anomaly: ${item.anomaly.label}`,
  ];

  if (item.deepInsight?.customerNeed) parts.push(`customer_need: ${item.deepInsight.customerNeed}`);
  if (item.deepInsight?.painPoint) parts.push(`pain_point: ${item.deepInsight.painPoint}`);
  if (item.deepInsight?.rootCause) parts.push(`root_cause: ${item.deepInsight.rootCause}`);
  if (item.deepInsight?.expectation) parts.push(`expectation: ${item.deepInsight.expectation}`);
  if (item.deepInsight?.recommendedAction) parts.push(`recommended_action: ${item.deepInsight.recommendedAction}`);
  if (!item.deepInsight && item.summaryLines[0]) parts.push(`summary_context: ${truncateText(item.summaryLines[0], 180)}`);
  if (item.keyInsightsLines[0]) parts.push(`key_insight: ${truncateText(item.keyInsightsLines[0], 180)}`);

  return parts.join('\n');
};

const buildRagQuestionWithCallInsights = async (question: string): Promise<string> => {
  const phone = extractPhoneNumber(question);
  if (!phone) return question;

  const { total, results } = await fetchCustomerCallHistoryResults(phone, { perPage: 12 });
  if (!total || !results.length) return question;

  const historyItems = await Promise.all(
    results.slice(0, 5).map((item) => fetchExactHistoryItem(item))
  );
  if (!historyItems.length) return question;

  const context = historyItems
    .map((item, index) => formatCallInsightForRagContext(item, index + 1))
    .join('\n\n');

  return [
    question,
    '',
    'บริบทประวัติการโทรจริงจากระบบสำหรับตอบคำถามนี้:',
    `พบประวัติของเบอร์ ${phone} ทั้งหมด ${total} สาย และแนบล่าสุด ${historyItems.length} สาย`,
    context,
    '',
    'ให้ตอบโดยอ้างอิง Summary Insight, อินไซต์ลูกค้า, keyword, anomaly และ metadata ด้านบนก่อน ถ้าคำถามไม่เกี่ยวกับประวัติการโทรให้ตอบจากข้อมูลประกันตามปกติ',
  ].join('\n');
};

const requestWarrantyReply = async (question: string): Promise<string> => {
  const phone = extractPhoneNumber(question);
  const includeHistory = isWarrantyHistoryQuestion(question);
  if (phone && isWarrantyLookupQuestion(question) && !includeHistory) {
    const visibleWarranties = await fetchVisibleWarrantiesByPhone(phone);
    if (!visibleWarranties.length) {
      return `ไม่พบข้อมูลประกันของลูกค้า ${phone} ในระบบ`;
    }
  }

  const ragQuestion = await buildRagQuestionWithCallInsights(question);
  const payload = await fetchJson(`${API_BASE}/api/v1/warranty/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: ragQuestion }),
  });

  const answerText = extractAnswerText(payload);
  if (!answerText || looksLikeFailureText(answerText)) {
    return CHATBOT_FALLBACK_MESSAGE;
  }

  return appendWarrantyMeta(answerText, extractWarrantyMeta(payload), {
    preserveAnswerOnNoWarranty: includeHistory,
  });
};

const tryExactWarrantyReply = async (question: string): Promise<string | null> => {
  const registrationNo = extractRegistrationNumber(question);
  const serialNo = extractSerialNumber(question);
  const orderNumber = extractOrderNumber(question);
  if (!registrationNo && !serialNo && !orderNumber) return null;

  const includeHistory = isWarrantyHistoryQuestion(question);

  const [backendMatch, structuredRecord] = await Promise.all([
    fetchExactWarrantyRecordFromBackendQuery(question),
    fetchExactWarrantyRecord({ registrationNo, serialNo, orderNumber }),
  ]);
  const baseRecord = structuredRecord || backendMatch?.record || null;
  if (!baseRecord) {
    const backendReply = await requestWarrantyReply(question);
    if (backendReply !== CHATBOT_FALLBACK_MESSAGE) {
      return backendReply;
    }

    return registrationNo
      ? `ไม่พบข้อมูลประกัน ${registrationNo} ในระบบ`
      : (serialNo
        ? `ไม่พบข้อมูลประกันที่ผูกกับ Serial No. ${serialNo} ในระบบ`
        : `ไม่พบข้อมูลประกันที่ผูกกับเลขคำสั่งซื้อ ${orderNumber} ในระบบ`);
  }

  const record = await enrichExactWarrantyRecord(baseRecord);

  if (!includeHistory) {
    return formatExactWarrantyReply(record, 0, [], false);
  }

  const searchResponse = record.customerPhone !== '-'
    ? await fetchTopicSearch({ phone: record.customerPhone })
    : null;
  const historyResults = searchResponse
    ? filterEnrichedTopicResults(
        await enrichTopicSearchResults(searchResponse.results),
        record.registrationNo !== '-' ? record.registrationNo : registrationNo,
        record.serialNo !== '-' ? record.serialNo : serialNo,
        record.orderNumber !== '-' ? record.orderNumber : orderNumber
      )
    : [];

  const historyItemsRaw = await Promise.all(
    historyResults.slice(0, 3).map((item) => fetchExactHistoryItem(item))
  );

  const historyItems = historyItemsRaw.map((item, index) => {
    const backendCallDate = backendMatch?.callHistory?.callDate || '-';
    if (!backendMatch?.callHistory || backendCallDate === '-') return item;

    const sameFile = !!backendMatch.callHistory.fileId && item.fileId === backendMatch.callHistory.fileId;
    if (sameFile || historyItemsRaw.length === 1) {
      return {
        ...item,
        callTimestamp: backendCallDate,
        agentId: backendMatch.callHistory.agentId !== '-' ? backendMatch.callHistory.agentId : item.agentId,
      };
    }

    if (index === 0 && !historyItemsRaw.some((historyItem) => historyItem.fileId === backendMatch.callHistory?.fileId)) {
      return {
        ...item,
        callTimestamp: backendCallDate,
      };
    }

    return item;
  });

  return formatExactWarrantyReply(record, historyResults.length, historyItems, true);
};

export const getChatbotReply = async (question: string): Promise<string> => {
  const normalizedQuestion = String(question || '').trim();
  if (!normalizedQuestion) return CHATBOT_FALLBACK_MESSAGE;

  const guideReply = tryStaticChatbotGuideReply(normalizedQuestion);
  if (guideReply) {
    return guideReply;
  }

  const callHistoryReply = await tryCallHistoryReply(normalizedQuestion);
  if (callHistoryReply) {
    return callHistoryReply;
  }

  const exactWarrantyReply = await tryExactWarrantyReply(normalizedQuestion);
  if (exactWarrantyReply) {
    return exactWarrantyReply;
  }

  const structuredWarrantyReply = await tryStructuredWarrantyLookupReply(normalizedQuestion);
  if (structuredWarrantyReply) {
    return structuredWarrantyReply;
  }

  const phone = extractPhoneNumber(normalizedQuestion);
  const registrationNo = extractRegistrationNumber(normalizedQuestion);
  const serialNo = extractSerialNumber(normalizedQuestion);
  const orderNumber = extractOrderNumber(normalizedQuestion);

  const topicReply = await tryTopicReply(normalizedQuestion);
  if (topicReply) {
    if (phone || registrationNo || serialNo || orderNumber) {
      const warrantyReply = await requestWarrantyReply(normalizedQuestion);
      if (warrantyReply !== CHATBOT_FALLBACK_MESSAGE) {
        return `${warrantyReply}\n\n${topicReply}`;
      }
    }
    return topicReply;
  }

  return requestWarrantyReply(normalizedQuestion);
};
