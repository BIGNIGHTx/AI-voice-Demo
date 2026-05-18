'use client';

import {
  getAgentPerformance,
  getBrandDistribution,
  getKeywordFrequency,
  getMockFileById,
  getTopicDistribution,
  getWarrantyByFileId,
  mockFiles,
  mockWarranties,
  type MockAudioFile,
  type MockWarranty,
} from '@/lib/mock-data';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

const DEMO_USER = {
  id: 'demo-admin',
  name: 'Pitching Demo',
  email: 'demo@aivoice.local',
  role: 'admin',
  createdAt: '2026-05-18T00:00:00.000Z',
  lastLoginAt: '2026-05-18T09:00:00.000Z',
};

let installed = false;
let demoFiles = [...mockFiles];
let demoWarranties = [...mockWarranties];

const jsonResponse = (payload: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

const emptyOk = () => jsonResponse({ ok: true, success: true });

const normalizePhone = (value: string) => String(value || '').replace(/\D/g, '');
const numberedLines = (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');

const getRequestUrl = (input: FetchInput) => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const getRequestMethod = (input: FetchInput, init?: FetchInit) => {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === 'object' && 'method' in input && input.method) return input.method.toUpperCase();
  return 'GET';
};

const fileToListRow = (file: MockAudioFile) => ({
  file_id: file.fileId,
  audio_file_id: file.fileId,
  id: file.fileId,
  name: file.name,
  original_filename: file.name,
  customer: file.customerPhone,
  customer_name: file.customerName,
  customer_phone: file.customerPhone,
  agent: file.agentId,
  agent_id: file.agentId,
  agent_name: file.agentName,
  brand: file.brand,
  product: file.product,
  product_category: file.product,
  model: file.model,
  sentiment: file.sentiment,
  status: file.status === 'REVIEW' ? 'COMPLETE' : file.status,
  date: file.callDate,
  analyzed_date: file.callDate,
  call_datetime: file.callDate,
  call_date: file.callDate,
  upload_date: file.uploadDate,
  sale_channel: file.saleChannel,
  call_direction: file.callType,
  call_type: file.callType,
  calltype: file.callType,
  topic: file.topic,
  intent: file.intent,
  qa_score: file.qaScore,
  csat_score: file.csatScore,
  serial_no: file.serialNo,
  registration_no: file.registrationNo,
  order_number: file.orderNumber,
});

const getDemoDeepInsight = (file: MockAudioFile) => {
  if (file.fileId === 'AV-2026-0518-001') {
    return {
      customer_need: 'ต้องการให้บริษัทตรวจสอบที่นอนที่ทำให้เกิดอาการคันและผื่นของครอบครัวอย่างละเอียด และดำเนินการแก้ไขโดยเปลี่ยนสินค้าหรือคืนเงิน',
      pain_point: 'อาการคัน ผื่น ตาไหล และอาการแพ้ของสมาชิกทุกคนทำให้ไม่สามารถนอนได้และส่งผลต่อสุขภาพและคุณภาพชีวิต',
      root_cause: 'อาจเกิดจากสารเคมีหรือกลิ่นอับที่ปล่อยจากวัสดุในที่นอน เช่น โฟม ผ้าปู ที่ทำให้เกิดการระคายเคืองและอาการแพ้',
      expectation: 'ต้องการให้บริษัทรับเรื่อง ตรวจสอบตัวอย่างที่นอน ส่งผลการตรวจสอบให้ทราบอย่างเร็วที่สุด และจัดหาที่นอนใหม่หรือคืนเงินโดยไม่มีค่าใช้จ่ายเพิ่มเติม',
      risk_level: 'high',
      recommended_action: numberedLines([
        'จัดทีมตรวจสอบภายในและส่งที่นอนไปห้องปฏิบัติการวิเคราะห์สารเคมีภายใน 24–48 ชม.',
        'เสนอให้ลูกค้าใช้ที่นอนสำรองหรือเปลี่ยนเป็นรุ่นอื่นทันที',
        'หากตรวจพบข้อบกพร่อง ดำเนินการคืนเงินหรือเปลี่ยนสินค้าเต็มจำนวน',
        'ติดตามผลการรักษาและความพึงพอใจของลูกค้าอย่างต่อเนื่อง',
        'ปรับปรุงกระบวนการคัดเลือกวัสดุและทดสอบการปล่อยสารเคมีก่อนจำหน่าย',
      ]),
      confidence: 85,
    };
  }

  if (file.fileId === 'AV-2026-0517-014') {
    return {
      customer_need: 'ต้องการยืนยันวันจัดส่งเตียงปรับระดับ MIDAS หลังถูกเลื่อนนัด และต้องการทราบให้ชัดเจนว่าประกันเริ่มนับจากวันซื้อหรือวันที่ส่งและติดตั้งสินค้า',
      pain_point: 'ลูกค้าไม่มั่นใจเรื่องวันจัดส่งใหม่และกังวลว่าการเลื่อนส่งจะทำให้วันเริ่มประกันคลาดเคลื่อน',
      root_cause: 'ข้อมูลการจัดส่งและเงื่อนไขวันเริ่มประกันยังไม่ได้ถูกสื่อสารให้ลูกค้าเห็นเป็นลายลักษณ์อักษร',
      expectation: 'ต้องการ SMS หรือหลักฐานยืนยันวันส่งใหม่ ช่วงเวลาจัดส่ง และวันเริ่มประกันที่ถูกต้อง',
      risk_level: 'medium',
      recommended_action: numberedLines([
        'ส่ง SMS ยืนยันวันและช่วงเวลาจัดส่งใหม่ทันที',
        'แจ้งให้ลูกค้าทราบว่าประกันเริ่มนับจากวันที่ส่งและติดตั้งสำเร็จ',
        'บันทึก delivery date ใหม่ในระบบ Warranty ให้ตรงกับข้อมูลขนส่ง',
        'ติดตามหลังจัดส่งเพื่อยืนยันว่าลูกค้าได้รับสินค้าและเอกสารประกันครบ',
      ]),
      confidence: 82,
    };
  }

  if (file.fileId === 'AV-2026-0516-027') {
    return {
      customer_need: 'ต้องการยืนยันว่าการลงทะเบียนประกันหมอน BEDGEAR สำเร็จแล้ว และต้องการช่องทางตรวจสอบวันหมดประกันด้วยตนเองในอนาคต',
      pain_point: 'ลูกค้าพึงพอใจกับสินค้าแต่ยังไม่แน่ใจว่าจะตรวจสอบข้อมูลประกันย้อนหลังได้จากช่องทางไหน',
      root_cause: 'หลังการซื้อยังไม่มีข้อความสรุปลิงก์ตรวจสอบประกันที่ลูกค้าสามารถเก็บไว้ใช้งานได้',
      expectation: 'ต้องการลิงก์หรือข้อความยืนยันที่เปิดดูข้อมูลประกันได้ง่ายผ่าน LINE',
      risk_level: 'low',
      recommended_action: numberedLines([
        'ส่งลิงก์ Warranty Lookup ให้ลูกค้าทาง LINE',
        'แจ้งเลขทะเบียนประกันและวันหมดประกันในข้อความเดียวกัน',
        'ติด tag ลูกค้าเป็น promoter สำหรับแคมเปญหลังการขาย',
        'เสนอสินค้าเสริมที่เกี่ยวข้องอย่างนุ่มนวล เช่น ปลอกหมอนหรือผ้าปูที่เหมาะกับรุ่น Storm',
      ]),
      confidence: 88,
    };
  }

  if (file.fileId === 'AV-2026-0515-006') {
    return {
      customer_need: 'ต้องการขอคืนเงินหรือให้บริษัทพิจารณาทางออกเพิ่มเติมสำหรับ topper ที่ใช้งานแล้วไม่สบายหลัง แม้เคสอาจเกินเงื่อนไขคืนสินค้าแล้ว',
      pain_point: 'ลูกค้ารู้สึกว่าเงื่อนไขคืนสินค้าและประกันไม่ได้ถูกอธิบายชัดเจนตอนซื้อ และเริ่มมีความเสี่ยงร้องเรียน',
      root_cause: 'ความเข้าใจเรื่องระยะคืนสินค้าแตกต่างจากระยะรับประกัน ทำให้ลูกค้าคาดหวังว่าจะยังคืนเงินได้',
      expectation: 'ต้องการให้บริษัทรับเรื่องอย่างจริงจัง ตรวจสอบสภาพสินค้า และเสนอทางออกแบบ goodwill',
      risk_level: 'high',
      recommended_action: numberedLines([
        'ส่งข้อความรับทราบปัญหาและขอโทษที่เงื่อนไขไม่ชัดเจนสำหรับลูกค้า',
        'ส่งสรุปเงื่อนไขคืนสินค้าและประกันแบบภาษาง่ายให้ลูกค้า',
        'ส่งต่อหัวหน้าทีม retention เพื่อพิจารณา goodwill inspection',
        'นัดหมายโทรกลับภายในวันเดียวกันก่อน 17:00',
        'เตรียมข้อเสนอทางเลือก เช่น ตรวจสภาพฟรี ส่วนลดเปลี่ยนรุ่น หรือคูปองชดเชย',
      ]),
      confidence: 85,
    };
  }

  if (file.fileId === 'AV-2026-0514-019') {
    return {
      customer_need: 'ต้องการลงทะเบียนรับประกันที่นอน SEALY ให้สำเร็จด้วยเบอร์โทร เพราะสแกน QR บนใบเสร็จไม่สำเร็จ',
      pain_point: 'ลูกค้าไม่สามารถใช้ QR ลงทะเบียนเองได้และกังวลว่า serial จะไม่ถูกบันทึกในระบบ',
      root_cause: 'ช่องทาง QR บนใบเสร็จไม่พร้อมใช้งานหรือสแกนไม่ติดจากอุปกรณ์ของลูกค้า',
      expectation: 'ต้องการให้เจ้าหน้าที่ลงทะเบียนแทนและส่ง SMS ยืนยันเลขทะเบียนประกัน',
      risk_level: 'low',
      recommended_action: numberedLines([
        'ยืนยัน serial number และเบอร์โทรกับลูกค้าอีกครั้ง',
        'บันทึกข้อมูลประกันผ่านระบบ manual registration',
        'ส่ง SMS ยืนยันเลขทะเบียน SEA-2026-0077 ให้ลูกค้า',
        'แนบวิธีตรวจสอบข้อมูลประกันย้อนหลังผ่านเบอร์โทร',
      ]),
      confidence: 86,
    };
  }

  return {
    customer_need: file.intent,
    pain_point: file.keyInsights[0],
    root_cause: file.keyInsights[1] || file.topic,
    expectation: file.resolution,
    risk_level: file.riskLevel,
    recommended_action: numberedLines(file.actionItems),
    confidence: file.riskLevel === 'High' ? 85 : 78,
  };
};

const fileToDetail = (file: MockAudioFile) => ({
  file: {
    file_id: file.fileId,
    original_filename: file.name,
    customer_phone: file.customerPhone,
    agent_id: file.agentId,
    agent_name: file.agentName,
    sale_channel: file.saleChannel,
    call_date: file.callDate,
    upload_date: file.uploadDate,
  },
  analysis: {
    analysis_id: `AN-${file.fileId}`,
    file_id: file.fileId,
    agent_id: file.agentId,
    agent_name: file.agentName,
    customer_phone: file.customerPhone,
    sale_channel: file.saleChannel,
    call_duration_seconds: file.durationSeconds,
    duration: file.durationSeconds,
    call_timestamp: file.callDate,
    brand_name: file.brand,
    brand: file.brand,
    product_category: file.product,
    product: file.model,
    qa_score: file.qaScore,
    csat_score: file.csatScore,
    sentiment: file.sentiment,
    sentiment_label: file.sentiment,
    sentiment_reason: file.summary,
    summary: file.summary,
    summary_text: file.summary,
    summary_points: file.keyInsights,
    full_transcript: file.transcript.map((line) => line.text).join(' '),
    transcription: file.transcript.map((line) => ({
      speaker: line.speaker,
      time: line.time,
      subtitle: line.text,
      text: line.text,
    })),
    subtitle_segments: file.transcript.map((line) => ({
      speaker: line.speaker,
      time: line.time,
      subtitle: line.text,
      text: line.text,
    })),
    key_insights: file.keyInsights.join(' | '),
    intent: file.intent,
    topic: file.topic,
    keywords: file.keywords,
    deep_insight: getDemoDeepInsight(file),
    action_items: file.actionItems,
    is_escalated: file.status === 'ESCALATED',
    wav2vec2_emotion: {
      dominant: file.sentiment,
      scores: {
        positive: file.sentiment === 'positive' ? 0.78 : 0.12,
        neutral: file.sentiment === 'neutral' ? 0.72 : 0.2,
        negative: file.sentiment === 'negative' ? 0.81 : 0.1,
      },
    },
    model_versions: {
      whisper: 'demo-whisper-v3',
      wav2vec2: 'demo-emotion-v2',
      llama: 'demo-llm-v1',
    },
    created_at: file.uploadDate,
    serial_no: file.serialNo,
    warranty_period: getWarrantyByFileId(file.fileId)?.warrantyPeriod,
    purchase_date: getWarrantyByFileId(file.fileId)?.purchaseDate,
    date_of_purchase: getWarrantyByFileId(file.fileId)?.purchaseDate,
    date_of_delivery: getWarrantyByFileId(file.fileId)?.deliveryDate,
    expiry_date_of_warranty: getWarrantyByFileId(file.fileId)?.expiryDate,
    registrationDate: getWarrantyByFileId(file.fileId)?.purchaseDate,
  },
});

const warrantyToRecord = (warranty: MockWarranty) => ({
  file_id: warranty.relatedFileId,
  registration_no: warranty.registrationNo,
  customer_name: warranty.customerName,
  customer_phone: warranty.customerPhone,
  brand: warranty.brand,
  category: warranty.category,
  product_category: warranty.category,
  model: warranty.model,
  size: warranty.size,
  serial_no: warranty.serialNo,
  warranty_period: warranty.warrantyPeriod,
  date_of_purchase: warranty.purchaseDate,
  purchase_date: warranty.purchaseDate,
  date_of_delivery: warranty.deliveryDate,
  delivery_date: warranty.deliveryDate,
  expiry_date_of_warranty: warranty.expiryDate,
  warranty_start_date: warranty.deliveryDate,
  warranty_end_date: warranty.expiryDate,
  registrationDate: warranty.purchaseDate,
  purchase_channel: warranty.purchaseChannel,
  sale_channel: warranty.purchaseChannel,
  order_number: warranty.orderNumber,
  status: warranty.status,
  qdrant_synced: warranty.qdrantSynced,
  warranty_source: 'manual',
  ai_mode: 'manual',
  notes: warranty.notes,
});

const getCustomerNameParts = (name: string) => {
  const stripped = name.replace(/^คุณ/, '').trim();
  const [firstName, ...rest] = stripped.split(/\s+/);
  return {
    first_name: firstName || stripped || name,
    last_name: rest.join(' '),
  };
};

const buildCustomerDetail = (phoneOrCustomerId: string) => {
  const phone = normalizePhone(phoneOrCustomerId);
  const customerWarranties = demoWarranties.filter((warranty) => warranty.customerPhone === phone);
  const customerFiles = demoFiles.filter((file) => file.customerPhone === phone);
  const source = customerWarranties[0] || customerFiles[0];

  if (!source) return null;

  const name = source.customerName;
  const nameParts = getCustomerNameParts(name);

  return {
    customer: {
      customer_id: `CUST-${phone}`,
      ...nameParts,
      nickname: nameParts.first_name,
      phone,
      email: `${phone}@demo.local`,
      gender: '-',
      address_line1: 'Demo Customer Address',
      district: 'Bangkok',
      province: 'Bangkok',
      postal_code: '10110',
      created_at: '2026-05-01T09:00:00',
      createdAt: '2026-05-01T09:00:00',
    },
    warranties: customerWarranties.map(warrantyToRecord),
    call_history: customerFiles.map((file) => ({
      date: file.callDate.slice(0, 10),
      time: file.callDate.slice(11, 16),
      file_id: file.fileId,
      agent_id: file.agentId,
      title: file.topic,
      sentiment: file.sentiment,
    })),
  };
};

const buildCustomerList = () => {
  const phones = Array.from(new Set([
    ...demoFiles.map((file) => file.customerPhone),
    ...demoWarranties.map((warranty) => warranty.customerPhone),
  ]));

  return phones.map((phone) => {
    const detail = buildCustomerDetail(phone);
    const files = demoFiles.filter((file) => file.customerPhone === phone);
    const warranties = demoWarranties.filter((warranty) => warranty.customerPhone === phone);
    const latestFile = files[0];
    const customer = detail?.customer;

    return {
      customer_id: `CUST-${phone}`,
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      phone,
      email: customer?.email || `${phone}@demo.local`,
      agent_id: latestFile?.agentId || '-',
      brand: warranties[0]?.brand || latestFile?.brand || '-',
      product_category: warranties[0]?.category || latestFile?.product || '-',
      sale_channel: warranties[0]?.purchaseChannel || latestFile?.saleChannel || '-',
      total_calls: files.length,
      last_call_date: latestFile?.callDate || '2026-05-18T09:00:00',
      sentiment_summary: latestFile?.sentiment || 'neutral',
      has_warranty: warranties.length > 0,
      warranty_count: warranties.length,
      call_type: latestFile?.callType || 'inbound',
      call_type_counts: {
        inbound: files.filter((file) => file.callType === 'inbound').length,
        outbound: files.filter((file) => file.callType === 'outbound').length,
        unknown: 0,
      },
    };
  });
};

const paginate = <T,>(items: T[], url: URL) => {
  const page = Number(url.searchParams.get('page') || '1');
  const perPage = Number(url.searchParams.get('per_page') || '100');
  const start = Math.max(0, (page - 1) * perPage);
  const pageItems = items.slice(start, start + perPage);

  return {
    files: pageItems,
    items: pageItems,
    data: pageItems,
    results: pageItems,
    total: items.length,
    total_pages: Math.max(1, Math.ceil(items.length / perPage)),
    page,
    per_page: perPage,
  };
};

const handleAudioList = (url: URL) => {
  const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').toLowerCase();
  const brand = (url.searchParams.get('brand') || '').toLowerCase();

  const rows = demoFiles
    .filter((file) => {
      const haystack = [
        file.fileId,
        file.name,
        file.customerName,
        file.customerPhone,
        file.agentId,
        file.agentName,
        file.brand,
        file.model,
        file.registrationNo,
        file.serialNo,
        file.topic,
      ].join(' ').toLowerCase();

      return (!search || haystack.includes(search)) && (!brand || file.brand.toLowerCase() === brand);
    })
    .map(fileToListRow);

  return jsonResponse(paginate(rows, url));
};

const handleWarrantyList = () => jsonResponse({
  warranties: demoWarranties.map(warrantyToRecord),
  total: demoWarranties.length,
});

const handleAgentPerformance = () => jsonResponse({
  agent_performance: getAgentPerformance().map((agent) => ({
    agent_id: agent.agentId,
    agent_name: agent.name,
    avg_qa_score: agent.avgQa,
    avg_csat_score: agent.avgCsat,
    total_calls: agent.totalCalls,
    positive_calls: demoFiles.filter((file) => file.agentId === agent.agentId && file.sentiment === 'positive').length,
    negative_calls: demoFiles.filter((file) => file.agentId === agent.agentId && file.sentiment === 'negative').length,
    resolution_rate: agent.resolutionRate,
    avg_handling_time: 360,
  })),
});

const handleBrandIntelligence = () => jsonResponse({
  brand_intelligence: getBrandDistribution().map((brand) => ({
    brand_name: brand.brand,
    total_mentions: brand.total,
    positive_mentions: brand.positive,
    negative_mentions: brand.negative,
    avg_sentiment_score: brand.total ? (brand.positive - brand.negative) / brand.total : 0,
  })),
});

const handleTopicDistribution = () => jsonResponse({
  topics: getTopicDistribution().map((topic) => ({
    name: topic.name,
    value: topic.value,
    count: topic.value,
    percentage: Math.round((topic.value / Math.max(1, demoFiles.length)) * 100),
    avgCsat: 4,
    avgQa: 8,
  })),
});

const handleCustomerList = (url: URL) => {
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const rows = buildCustomerList().filter((customer) => {
    const haystack = [
      customer.customer_id,
      customer.first_name,
      customer.last_name,
      customer.phone,
      customer.brand,
      customer.product_category,
    ].join(' ').toLowerCase();
    return !search || haystack.includes(search);
  });

  const pageData = paginate(rows, url);
  return jsonResponse({
    customers: pageData.items,
    total: pageData.total,
    total_pages: pageData.total_pages,
    page: pageData.page,
    per_page: pageData.per_page,
  });
};

const handleEscalationSummary = () => {
  const total = demoFiles.length;
  const escalated = demoFiles.filter((file) => file.status === 'ESCALATED').length;
  const positive = demoFiles.filter((file) => file.sentiment === 'positive').length;
  const neutral = demoFiles.filter((file) => file.sentiment === 'neutral').length;
  const negative = demoFiles.filter((file) => file.sentiment === 'negative').length;
  const avgCsat = demoFiles.reduce((sum, file) => sum + file.csatScore, 0) / Math.max(1, total);
  const avgQa = demoFiles.reduce((sum, file) => sum + file.qaScore, 0) / Math.max(1, total);

  return jsonResponse({
    total_calls: total,
    escalation: {
      total_escalated: escalated,
      escalation_rate: Math.round((escalated / Math.max(1, total)) * 100),
      non_escalated: total - escalated,
    },
    customer_status_distribution: {
      green: { count: 2, percentage: 40, label: 'Stable' },
      yellow: { count: 1, percentage: 20, label: 'Monitor' },
      red: { count: 2, percentage: 40, label: 'Urgent' },
    },
    sentiment: {
      positive,
      neutral,
      negative,
      positive_rate: Math.round((positive / Math.max(1, total)) * 100),
      negative_rate: Math.round((negative / Math.max(1, total)) * 100),
    },
    quality: {
      avg_csat: avgCsat,
      avg_qa: avgQa,
      low_csat_calls: demoFiles.filter((file) => file.csatScore < 3).length,
      high_csat_calls: demoFiles.filter((file) => file.csatScore >= 4).length,
    },
    top_escalating_agents: getAgentPerformance().map((agent) => ({
      agent_id: agent.agentId,
      agent_name: agent.name,
      total_calls: agent.totalCalls,
      escalated_calls: agent.escalated,
      escalation_rate: agent.totalCalls ? Math.round((agent.escalated / agent.totalCalls) * 100) : 0,
    })),
  });
};

const handleEscalationAgents = () => jsonResponse(
  getAgentPerformance().map((agent) => {
    const escalationRate = agent.totalCalls ? Math.round((agent.escalated / agent.totalCalls) * 100) : 0;
    const status = escalationRate >= 50 ? 'red' : escalationRate > 0 ? 'yellow' : 'green';
    return {
      agent_id: agent.agentId,
      agent_name: agent.name,
      agent_status_color: status,
      agent_status_label: status === 'red' ? 'Needs coaching' : status === 'yellow' ? 'Monitor' : 'Healthy',
      escalation_rate: escalationRate,
      escalation_count: agent.escalated,
      total_calls: agent.totalCalls,
      avg_csat: agent.avgCsat,
      avg_qa: agent.avgQa,
      performance_score: Math.round(((agent.avgQa / 10) * 60) + ((agent.avgCsat / 5) * 40)),
      recommendations: agent.escalated > 0 ? ['Review warranty objection handling', 'Follow escalation script'] : ['Maintain current quality'],
      needs_coaching: agent.escalated > 0,
    };
  })
);

const handleSearchResults = async (init?: FetchInit) => {
  let query = '';
  try {
    if (typeof init?.body === 'string') {
      const parsed = JSON.parse(init.body) as { query?: string };
      query = parsed.query || '';
    }
  } catch {
    query = '';
  }

  const normalized = query.toLowerCase();
  const results = demoFiles
    .filter((file) => {
      const haystack = [
        file.fileId,
        file.customerName,
        file.customerPhone,
        file.brand,
        file.model,
        file.topic,
        file.summary,
        file.registrationNo,
        file.serialNo,
      ].join(' ').toLowerCase();
      return !normalized || normalized === 'test' || haystack.includes(normalized);
    })
    .map((file) => ({
      file_id: file.fileId,
      audio_file_id: file.fileId,
      customer_phone: file.customerPhone,
      customer_name: file.customerName,
      agent_id: file.agentId,
      agent_name: file.agentName,
      brand: file.brand,
      product: file.model,
      serial_no: file.serialNo,
      registration_no: file.registrationNo,
      order_number: file.orderNumber,
      sentiment: file.sentiment,
      topic: file.topic,
      summary: file.summary,
      score: 0.92,
      highlight: file.summary,
      date: file.callDate,
      created_at: file.callDate,
    }));

  return jsonResponse({ results, total: results.length });
};

const handleEntities = (file: MockAudioFile) => jsonResponse({
  entities: {
    brands: [file.brand],
    products: [file.product, file.model],
    orders: [file.orderNumber],
    order_numbers: [file.orderNumber],
    amounts: [],
  },
});

const handleKeywords = (file: MockAudioFile) => jsonResponse({
  keywords: {
    keywords: file.keywords,
    categories: {
      intent: { matched: [file.intent], count: 1 },
      risk: { matched: [file.riskLevel], count: 1 },
      product: { matched: [file.brand, file.model], count: 2 },
    },
    sentiment_indicators: [file.sentiment],
    urgency_level: file.riskLevel,
  },
});

const handleTopic = (file: MockAudioFile) => jsonResponse({
  topic: {
    primary_category: file.topic,
    secondary_categories: [file.intent],
    confidence: 0.92,
    reason: file.summary,
  },
});

const handleQa = (file: MockAudioFile) => jsonResponse({
  qa_score: {
    overall_score: file.qaScore,
    grade: file.qaScore >= 9 ? 'A' : file.qaScore >= 8 ? 'B+' : 'B',
    criteria: {
      greeting: { score: 9, max_score: 10 },
      listening: { score: Math.round(file.qaScore), max_score: 10 },
      resolution: { score: Math.max(6, Math.round(file.qaScore - 1)), max_score: 10 },
      closing: { score: 8, max_score: 10 },
    },
    strengths: file.keyInsights.slice(0, 2),
    areas_for_improvement: file.actionItems.slice(0, 2),
  },
});

const handleCsat = (file: MockAudioFile) => jsonResponse({
  csat: {
    csat_score: file.csatScore,
    reasoning: file.summary,
  },
});

const findFileFromPath = (path: string, prefix: string) => {
  const fileId = decodeURIComponent(path.slice(prefix.length));
  return demoFiles.find((file) => file.fileId === fileId) || getMockFileById(fileId);
};

const findWarrantyFromCustomerPath = (path: string) => {
  const match = path.match(/^\/api\/v1\/customers\/([^/]+)\/warranty\/([^/]+)/);
  if (!match) return null;
  const phone = normalizePhone(decodeURIComponent(match[1]));
  const key = decodeURIComponent(match[2]).toLowerCase();
  return demoWarranties.find((warranty) =>
    warranty.customerPhone === phone &&
    [warranty.relatedFileId, warranty.registrationNo, warranty.serialNo].some((value) => value.toLowerCase() === key)
  ) || null;
};

const handleWarrantyQuery = async (init?: FetchInit) => {
  let question = '';
  try {
    if (typeof init?.body === 'string') {
      const parsed = JSON.parse(init.body) as { question?: string };
      question = parsed.question || '';
    }
  } catch {
    question = '';
  }

  const normalized = question.toLowerCase();
  const warranty = demoWarranties.find((item) =>
    [item.customerPhone, item.registrationNo, item.serialNo, item.orderNumber]
      .some((value) => normalized.includes(value.toLowerCase()))
  );

  if (!warranty) {
    const matchedFile = demoFiles.find((file) =>
      [file.customerPhone, file.registrationNo, file.serialNo, file.orderNumber, file.fileId]
        .some((value) => value && normalized.includes(value.toLowerCase()))
    );

    if (matchedFile) {
      return jsonResponse({
        answer: [
          'ข้อมูลประกัน: ไม่มีประกัน',
          `ลูกค้า: ${matchedFile.customerName} (${matchedFile.customerPhone})`,
          `สินค้า: ${matchedFile.brand} ${matchedFile.model}`,
          `Serial No.: ${matchedFile.serialNo}`,
          `ผลการตรวจสอบ: ไม่พบรายการประกันที่ผูกกับเคสนี้ใน mockup`,
        ].join('\n'),
        data: {
          warranty: null,
          call_history: {
            file_id: matchedFile.fileId,
            registration_no: '-',
            customer_phone: matchedFile.customerPhone,
            agent_id: matchedFile.agentId,
            call_date: matchedFile.callDate,
          },
          customer_phone: matchedFile.customerPhone,
          serial_no: '-',
        },
        warranty: null,
        matches: [],
      });
    }
  }

  const resolvedWarranty = warranty || demoWarranties[0];

  return jsonResponse({
    answer: [
      `ข้อมูลประกัน: ${resolvedWarranty.registrationNo}`,
      `ลูกค้า: ${resolvedWarranty.customerName} (${resolvedWarranty.customerPhone})`,
      `สินค้า: ${resolvedWarranty.brand} ${resolvedWarranty.model}`,
      `Serial No.: ${resolvedWarranty.serialNo}`,
      `สถานะ: ${resolvedWarranty.status}`,
      `วันที่หมดประกัน: ${resolvedWarranty.expiryDate}`,
      `ผลการตรวจสอบ: ${resolvedWarranty.notes}`,
    ].join('\n'),
    data: {
      warranty: warrantyToRecord(resolvedWarranty),
      call_history: {
        file_id: resolvedWarranty.relatedFileId,
        registration_no: resolvedWarranty.registrationNo,
        customer_phone: resolvedWarranty.customerPhone,
        agent_id: getMockFileById(resolvedWarranty.relatedFileId)?.agentId || '-',
        call_date: getMockFileById(resolvedWarranty.relatedFileId)?.callDate || resolvedWarranty.purchaseDate,
      },
      customer_phone: resolvedWarranty.customerPhone,
      serial_no: resolvedWarranty.serialNo,
    },
    warranty: warrantyToRecord(resolvedWarranty),
    matches: [{ record: warrantyToRecord(resolvedWarranty) }],
  });
};

const maybeMockFetch = async (input: FetchInput, init?: FetchInit): Promise<Response | null> => {
  const method = getRequestMethod(input, init);
  const rawUrl = getRequestUrl(input);
  const url = new URL(rawUrl, window.location.origin);
  const path = url.pathname;

  if (path === '/api/auth/session') return jsonResponse({ user: DEMO_USER });
  if (path === '/api/activity') return emptyOk();
  if (path === '/api/background-analysis') return emptyOk();

  if (path === '/api/v1/audio/list') return handleAudioList(url);
  if (path === '/api/v1/analytics/agent-performance') return handleAgentPerformance();
  if (path === '/api/v1/analytics/brand-intelligence') return handleBrandIntelligence();
  if (path === '/api/v1/analytics/topic-distribution') return handleTopicDistribution();
  if (path === '/api/v1/analytics/trends') return jsonResponse({ trends: getTopicDistribution().map((topic) => ({ date: '2026-05-18', topic: topic.name, count: topic.value })) });
  if (path === '/api/v1/ai/ai-status') return jsonResponse({ status: 'ready', mode: 'demo-mockup' });
  if (path === '/api/v1/customers') return handleCustomerList(url);
  if (path === '/api/v1/search/keyword' || path === '/api/v1/search/semantic') return handleSearchResults(init);
  if (path === '/api/v1/escalation/summary') return handleEscalationSummary();
  if (path === '/api/v1/escalation/agent-performance') return handleEscalationAgents();
  if (path === '/api/v1/warranty/list') return handleWarrantyList();
  if (path === '/api/v1/warranty/sync') return jsonResponse({ success: demoWarranties.length, total: demoWarranties.length });
  if (path === '/api/v1/warranty/query') return handleWarrantyQuery(init);

  if (path.startsWith('/api/v1/audio/detail/')) {
    const file = findFileFromPath(path, '/api/v1/audio/detail/');
    return file ? jsonResponse(fileToDetail(file)) : jsonResponse({ detail: 'File not found' }, { status: 404 });
  }

  if (path.startsWith('/api/v1/ai/entities/')) {
    const file = findFileFromPath(path, '/api/v1/ai/entities/');
    return file ? handleEntities(file) : jsonResponse({}, { status: 404 });
  }

  if (path.startsWith('/api/v1/ai/keywords/')) {
    const file = findFileFromPath(path, '/api/v1/ai/keywords/');
    if (file) return handleKeywords(file);
    return jsonResponse({ keywords: { keywords: getKeywordFrequency().map((item) => item.keyword) } });
  }

  if (path.startsWith('/api/v1/ai/topic/')) {
    const file = findFileFromPath(path, '/api/v1/ai/topic/');
    return file ? handleTopic(file) : jsonResponse({}, { status: 404 });
  }

  if (path.startsWith('/api/v1/ai/qa-score/')) {
    const file = findFileFromPath(path, '/api/v1/ai/qa-score/');
    return file ? handleQa(file) : jsonResponse({}, { status: 404 });
  }

  if (path.startsWith('/api/v1/ai/csat/')) {
    const file = findFileFromPath(path, '/api/v1/ai/csat/');
    return file ? handleCsat(file) : jsonResponse({}, { status: 404 });
  }

  if (path.startsWith('/api/v1/ai/analyze/')) return jsonResponse({ task_id: 'demo-analysis-task', status: 'completed' });
  if (path.startsWith('/api/v1/ai/status/')) return jsonResponse({ status: 'completed', progress: 100 });

  if (path.startsWith('/api/v1/audio/delete/') && method === 'DELETE') {
    const fileId = decodeURIComponent(path.slice('/api/v1/audio/delete/'.length));
    demoFiles = demoFiles.filter((file) => file.fileId !== fileId);
    demoWarranties = demoWarranties.filter((warranty) => warranty.relatedFileId !== fileId);
    return emptyOk();
  }

  if (path === '/api/v1/audio/upload' && method === 'POST') {
    const seed = Date.now();
    const fileId = `AV-DEMO-${seed}`;
    const source = mockFiles[0];
    demoFiles = [{
      ...source,
      fileId,
      name: `demo_upload_${seed}.mp3`,
      status: 'REVIEW',
      callDate: '2026-05-18T16:30:00',
      uploadDate: '2026-05-18T16:31:00',
    }, ...demoFiles];
    return jsonResponse({ file_id: fileId, status: 'PROCESSING' });
  }

  if (path.startsWith('/api/v1/customers/')) {
    const warranty = findWarrantyFromCustomerPath(path);
    if (warranty) {
      const detail = buildCustomerDetail(warranty.customerPhone);
      return jsonResponse({
        customer: detail?.customer,
        warranty: {
          ...warrantyToRecord(warranty),
          customer_phone: warranty.customerPhone,
          customer_name: warranty.customerName,
          created_at: '2026-05-18T09:00:00',
          qa_score: getMockFileById(warranty.relatedFileId)?.qaScore || 0,
          qa_grade: 'B+',
          qa_reason: getMockFileById(warranty.relatedFileId)?.summary || warranty.notes,
          csat_score: getMockFileById(warranty.relatedFileId)?.csatScore || 0,
          csat_reason: warranty.notes,
          sentiment: getMockFileById(warranty.relatedFileId)?.sentiment || 'neutral',
          sentiment_confidence: 0.9,
          sentiment_reason: getMockFileById(warranty.relatedFileId)?.summary || warranty.notes,
          intent: getMockFileById(warranty.relatedFileId)?.intent || warranty.notes,
          duration: getMockFileById(warranty.relatedFileId)?.durationSeconds || 0,
          file_size: 2420000,
          upload_date: getMockFileById(warranty.relatedFileId)?.uploadDate || '2026-05-18T09:00:00',
          images: [],
        },
      });
    }

    const customerId = decodeURIComponent(path.replace('/api/v1/customers/', '').split('/')[0]);
    const detail = buildCustomerDetail(customerId);
    return detail ? jsonResponse(detail) : jsonResponse({ detail: 'Customer not found' }, { status: 404 });
  }

  if (path.startsWith('/api/v1/search/advanced')) {
    const query = (url.searchParams.get('q') || '').toLowerCase();
    const topic = (url.searchParams.get('topic') || '').toLowerCase();
    const results = demoFiles
      .filter((file) =>
        (!query || [file.customerPhone, file.customerName, file.fileId].some((value) => value.toLowerCase().includes(query))) &&
        (!topic || file.topic.toLowerCase().includes(topic))
      )
      .map((file) => ({
        file_id: file.fileId,
        audio_file_id: file.fileId,
        fileId: file.fileId,
        registration_no: file.registrationNo,
        registrationNo: file.registrationNo,
        serial_no: file.serialNo,
        serialNo: file.serialNo,
        order_number: file.orderNumber,
        orderNumber: file.orderNumber,
        customer_phone: file.customerPhone,
        customerPhone: file.customerPhone,
        agent_id: file.agentId,
        agentId: file.agentId,
        agent_name: file.agentName,
        agentName: file.agentName,
        brand: file.brand,
        product: file.model,
        sale_channel: file.saleChannel,
        saleChannel: file.saleChannel,
        sentiment: file.sentiment,
        topic: file.topic,
        summary: file.summary,
        created_at: file.callDate,
        createdAt: file.callDate,
      }));
    return jsonResponse({ total: results.length, results });
  }

  return null;
};

export const installDemoFetchMock = () => {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: FetchInput, init?: FetchInit) => {
    const mocked = await maybeMockFetch(input, init);
    if (mocked) return mocked;
    return originalFetch(input, init);
  };
};
