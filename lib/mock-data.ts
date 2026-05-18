'use client';

export type MockSentiment = 'positive' | 'neutral' | 'negative';
export type MockWarrantyStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CLAIM_OPEN';
export type MockRiskLevel = 'Low' | 'Medium' | 'High';

export interface MockTranscriptLine {
  time: string;
  speaker: 'Agent' | 'Customer';
  text: string;
}

export interface MockAudioFile {
  fileId: string;
  name: string;
  customerName: string;
  customerPhone: string;
  agentId: string;
  agentName: string;
  brand: string;
  product: string;
  model: string;
  serialNo: string;
  registrationNo: string;
  orderNumber: string;
  sentiment: MockSentiment;
  status: 'COMPLETE' | 'REVIEW' | 'ESCALATED';
  callType: 'inbound' | 'outbound';
  saleChannel: string;
  callDate: string;
  uploadDate: string;
  durationSeconds: number;
  qaScore: number;
  csatScore: number;
  topic: string;
  intent: string;
  summary: string;
  keyInsights: string[];
  keywords: string[];
  riskLevel: MockRiskLevel;
  resolution: string;
  actionItems: string[];
  transcript: MockTranscriptLine[];
}

export interface MockWarranty {
  warrantyId: string;
  relatedFileId: string;
  registrationNo: string;
  customerName: string;
  customerPhone: string;
  brand: string;
  category: string;
  model: string;
  size: string;
  serialNo: string;
  warrantyPeriod: string;
  purchaseDate: string;
  deliveryDate: string;
  expiryDate: string;
  purchaseChannel: string;
  orderNumber: string;
  status: MockWarrantyStatus;
  qdrantSynced: boolean;
  claimCount: number;
  notes: string;
}

export interface MockAgent {
  agentId: string;
  name: string;
  team: string;
}

export const DEMO_TODAY = '2026-05-18';

export const mockAgents: MockAgent[] = [
  { agentId: '102', name: 'Nicha W.', team: 'Warranty Care' },
  { agentId: '202', name: 'Tanapon K.', team: 'Retention' },
];

export const mockFiles: MockAudioFile[] = [
  {
    fileId: 'AV-2026-0518-001',
    name: 'call_0819979336_lotos_warranty_claim.mp3',
    customerName: 'คุณพิมพ์ชนก ศรีวัฒน์',
    customerPhone: '0819979336',
    agentId: '102',
    agentName: 'Nicha W.',
    brand: 'LOTOS',
    product: 'Mattress',
    model: 'Hybrid Comfort Q5',
    serialNo: 'LT-HY-Q5-774455',
    registrationNo: 'LOT-2026-0102',
    orderNumber: 'SO-260518-1104',
    sentiment: 'negative',
    status: 'COMPLETE',
    callType: 'inbound',
    saleChannel: 'Online Store',
    callDate: '2026-05-18T10:24:00',
    uploadDate: '2026-05-18T10:42:00',
    durationSeconds: 487,
    qaScore: 8.6,
    csatScore: 3.2,
    topic: 'ตรวจสอบอาการแพ้จากที่นอน',
    intent: 'ต้องการให้บริษัทตรวจสอบที่นอนและดำเนินการเปลี่ยนสินค้าหรือคืนเงิน',
    summary: '',
    keyInsights: [],
    keywords: [
      'อาการคัน',
      'ผื่น',
      'อาการแพ้',
      'ตรวจสอบที่นอน',
      'สารเคมี',
      'กลิ่นอับ',
      'ห้องปฏิบัติการ',
      'ที่นอนสำรอง',
      'เปลี่ยนสินค้า',
      'คืนเงิน',
    ],
    riskLevel: 'High',
    resolution: 'รับเรื่อง ตรวจสอบคุณภาพ และเสนอเปลี่ยนสินค้าหรือคืนเงินตามผลตรวจ',
    actionItems: [],
    transcript: [
      { time: '00:00', speaker: 'Agent', text: 'สวัสดีค่ะ LOTOS Care นิชารับสายค่ะ ไม่ทราบว่าต้องการให้ช่วยดูแลเรื่องใดคะ' },
      { time: '00:18', speaker: 'Customer', text: 'สวัสดีค่ะ พอดีซื้อที่นอน LOTOS รุ่น Hybrid Comfort Q5 มาใช้ แล้วทั้งบ้านเริ่มมีอาการคัน มีผื่น ตาไหล และนอนไม่ค่อยได้ค่ะ' },
      { time: '00:52', speaker: 'Agent', text: 'ต้องขออภัยมากนะคะ ขออนุญาตรับเรื่องตรวจสอบทันทีค่ะ อาการเริ่มเกิดหลังใช้งานกี่วัน และเป็นทุกคนในครอบครัวเลยใช่ไหมคะ' },
      { time: '01:20', speaker: 'Customer', text: 'ประมาณไม่ถึงหกเดือนค่ะ ช่วงแรกคิดว่าเป็นฝุ่นหรือผ้าปู แต่พอเปลี่ยนผ้าปู ทำความสะอาดห้อง และหยุดใช้ที่นอนชั่วคราว อาการก็ดีขึ้นค่ะ' },
      { time: '01:58', speaker: 'Agent', text: 'เข้าใจค่ะ เดี๋ยวขอเช็กข้อมูลสินค้าเพิ่มเติมนะคะ รบกวนยืนยันเบอร์โทร เลข serial หรือรูปป้ายข้างที่นอน และวันที่ได้รับสินค้าให้หน่อยค่ะ' },
      { time: '02:30', speaker: 'Customer', text: 'เบอร์นี้เลยค่ะ 0819979336 รุ่น Hybrid Comfort Q5 ส่งมาช่วงกลางเดือนมกราคม กลิ่นที่นอนยังค่อนข้างแรง โดยเฉพาะตอนปิดห้องนอนค่ะ' },
      { time: '03:06', speaker: 'Agent', text: 'ขอบคุณสำหรับข้อมูลค่ะ เบื้องต้นรบกวนถ่ายรูปที่นอน ป้าย serial จุดที่มีกลิ่น หรือสภาพผิววัสดุส่งทาง LINE ให้ทีมตรวจสอบได้ไหมคะ' },
      { time: '03:36', speaker: 'Customer', text: 'ส่งได้ค่ะ แต่อยากให้บริษัทตรวจจริงจัง เพราะตอนนี้ลูกก็นอนไม่ได้ สามีก็เป็นผื่น ถ้าตรวจแล้วพบปัญหาก็อยากเปลี่ยนสินค้า หรือถ้าไม่มั่นใจก็ขอคืนเงินค่ะ' },
      { time: '04:15', speaker: 'Agent', text: 'รับทราบค่ะ เคสนี้จะเปิดเป็นเรื่องเร่งด่วนให้ ทีมคุณภาพจะตรวจสอบข้อมูลภายใน และประสานรับตัวอย่างหรือส่งที่นอนไปวิเคราะห์สารเคมีภายใน 24 ถึง 48 ชั่วโมงค่ะ' },
      { time: '04:52', speaker: 'Customer', text: 'ระหว่างนี้เราจะนอนที่ไหนคะ เพราะถ้าใช้ต่อก็กลัวอาการแพ้หนักขึ้น และไม่อยากซื้อใหม่เองก่อนที่ผลตรวจจะออกค่ะ' },
      { time: '05:20', speaker: 'Agent', text: 'เข้าใจค่ะ ทางเราจะเสนอทางเลือกให้ทันที เช่น จัดที่นอนสำรองให้ชั่วคราว หรือพิจารณาเปลี่ยนเป็นรุ่นอื่นระหว่างรอผลตรวจ โดยจะให้หัวหน้าทีมอนุมัติและติดต่อกลับค่ะ' },
      { time: '05:58', speaker: 'Customer', text: 'ถ้ามีค่ารักษาหรือใบรับรองแพทย์ต้องส่งด้วยไหมคะ ตอนนี้มีรูปผื่นกับยาที่ซื้อจากร้านขายยาอยู่ค่ะ' },
      { time: '06:25', speaker: 'Agent', text: 'ส่งมาได้เลยค่ะ รูปอาการ ใบเสร็จค่ายา หรือข้อมูลแพทย์จะช่วยประกอบการพิจารณา เราจะเก็บไว้ในเคสเดียวกันและแจ้งขั้นตอนถัดไปเป็นลายลักษณ์อักษรค่ะ' },
      { time: '06:58', speaker: 'Customer', text: 'ขอให้ส่งข้อความยืนยันด้วยนะคะ เพราะอยากมีหลักฐานว่าบริษัทรับเรื่องแล้ว และอยากทราบกำหนดว่าจะมีคนติดต่อกลับเมื่อไรค่ะ' },
      { time: '07:24', speaker: 'Agent', text: 'ได้ค่ะ ภายในวันนี้จะส่งข้อความขอโทษ ยืนยันเลขเคส ช่องทางส่งรูป และกรอบเวลาตรวจสอบให้ทาง LINE พร้อมแจ้งว่าจะมีเจ้าหน้าที่ติดต่อกลับเพื่อจัดการรับที่นอนหรือเสนอรุ่นสำรองค่ะ' },
      { time: '07:55', speaker: 'Customer', text: 'โอเคค่ะ ถ้าผลตรวจพบว่ามีปัญหาจริง ขอให้ดำเนินการคืนเงินหรือเปลี่ยนสินค้าเต็มจำนวน และช่วยติดตามผลอาการของครอบครัวด้วยนะคะ' },
      { time: '08:12', speaker: 'Agent', text: 'รับทราบครบถ้วนค่ะ ทางเราจะติดตามผลการรักษาและความพึงพอใจอย่างต่อเนื่อง รวมถึงส่ง feedback ให้ทีมวัสดุปรับปรุงการทดสอบการปล่อยสารเคมีก่อนจำหน่ายด้วยค่ะ' },
    ],
  },
  {
    fileId: 'AV-2026-0517-014',
    name: 'call_0824451180_midas_delivery_followup.mp3',
    customerName: 'คุณอัครเดช วงศ์สา',
    customerPhone: '0824451180',
    agentId: '202',
    agentName: 'Tanapon K.',
    brand: 'MIDAS',
    product: 'Adjustable Bed',
    model: 'Ergo Lift M2',
    serialNo: 'MD-EL-M2-923110',
    registrationNo: 'MID-2026-0038',
    orderNumber: 'SO-260515-0842',
    sentiment: 'neutral',
    status: 'COMPLETE',
    callType: 'inbound',
    saleChannel: 'Central Rama 9',
    callDate: '2026-05-18T09:15:00',
    uploadDate: '2026-05-18T09:28:00',
    durationSeconds: 312,
    qaScore: 7.9,
    csatScore: 3.8,
    topic: 'ติดตามการจัดส่ง',
    intent: 'ตรวจสอบวันจัดส่งและเอกสารรับประกัน',
    summary:
      'ลูกค้าติดตามเตียงปรับระดับ MIDAS ที่เลื่อนส่งหนึ่งครั้ง ต้องการยืนยันวันส่งใหม่และถามว่าประกันเริ่มนับจากวันซื้อหรือวันส่งสินค้า',
    keyInsights: [
      'ลูกค้ายังไม่ไม่พอใจมาก แต่ต้องการคำยืนยันที่ชัดเจน',
      'คำถามประกันเกี่ยวข้องกับวันส่ง จึงควรอัปเดต delivery date ให้ตรงกัน',
      'ควรส่ง SMS ยืนยัน slot ส่งสินค้า',
    ],
    keywords: ['จัดส่ง', 'เลื่อนส่ง', 'วันส่ง', 'ประกันเริ่มนับ', 'SMS'],
    riskLevel: 'Medium',
    resolution: 'ยืนยันวันส่งใหม่และแจ้งว่าประกันเริ่มนับจากวันส่งสินค้า',
    actionItems: [
      'ส่ง SMS ยืนยันช่วงเวลา 10:00-12:00',
      'ปรับวันเริ่มประกันเป็น 20 พ.ค. 2026 หลังส่งสำเร็จ',
    ],
    transcript: [
      { time: '00:00', speaker: 'Agent', text: 'สวัสดีครับ MIDAS Care ธนพลรับสายครับ' },
      { time: '00:11', speaker: 'Customer', text: 'เตียงที่นัดส่งถูกเลื่อน อยากเช็กว่าวันใหม่คือวันไหนครับ' },
      { time: '00:39', speaker: 'Agent', text: 'ระบบระบุส่งวันที่ 20 พฤษภาคม ช่วง 10 โมงถึงเที่ยงครับ' },
      { time: '01:21', speaker: 'Customer', text: 'แล้วประกันเริ่มนับจากวันที่ซื้อหรือวันที่ส่งครับ' },
      { time: '01:49', speaker: 'Agent', text: 'ประกันจะเริ่มนับจากวันที่ส่งสินค้าและติดตั้งเรียบร้อยครับ ผมจะส่ง SMS ยืนยันให้อีกครั้ง' },
    ],
  },
  {
    fileId: 'AV-2026-0516-027',
    name: 'call_0892214455_bedgear_positive_feedback.mp3',
    customerName: 'คุณสุพัตรา แซ่ลิ้ม',
    customerPhone: '0892214455',
    agentId: '102',
    agentName: 'Mali P.',
    brand: 'BEDGEAR',
    product: 'Pillow',
    model: 'Storm Performance Pillow',
    serialNo: 'BG-ST-PW-118204',
    registrationNo: 'BED-2026-0211',
    orderNumber: 'SO-260507-2210',
    sentiment: 'positive',
    status: 'COMPLETE',
    callType: 'outbound',
    saleChannel: 'Shopee Mall',
    callDate: '2026-05-18T11:08:00',
    uploadDate: '2026-05-18T11:18:00',
    durationSeconds: 198,
    qaScore: 9.2,
    csatScore: 4.7,
    topic: 'ติดตามความพึงพอใจ',
    intent: 'สอบถามหลังการขายและยืนยันลงทะเบียนประกัน',
    summary:
      'ลูกค้าให้ feedback เชิงบวกกับหมอน BEDGEAR และยืนยันว่าได้รับเอกสารประกันเรียบร้อย ต้องการทราบวิธีดูวันหมดประกันในอนาคต',
    keyInsights: [
      'ลูกค้าพึงพอใจกับคุณภาพสินค้าและการจัดส่ง',
      'มีโอกาสเสนอ cross-sell ปลอกหมอนหรือผ้าปูที่เหมาะกับรุ่น Storm',
      'ควรส่งลิงก์ตรวจสอบประกันด้วยเบอร์โทร',
    ],
    keywords: ['พึงพอใจ', 'ลงทะเบียนประกัน', 'วิธีตรวจสอบ', 'cross-sell'],
    riskLevel: 'Low',
    resolution: 'ส่งลิงก์ตรวจสอบประกันและบันทึก feedback เชิงบวก',
    actionItems: [
      'ส่งลิงก์ Warranty Lookup ผ่าน LINE',
      'ใส่ tag ลูกค้าเป็น promoter',
    ],
    transcript: [
      { time: '00:00', speaker: 'Agent', text: 'สวัสดีค่ะ โทรจาก BEDGEAR เพื่อติดตามการใช้งานหมอน Storm ค่ะ' },
      { time: '00:17', speaker: 'Customer', text: 'ใช้ดีมากค่ะ นอนสบายขึ้นเยอะ ส่งก็เร็ว' },
      { time: '00:44', speaker: 'Agent', text: 'ดีใจมากค่ะ ตอนนี้ประกัน BED-2026-0211 ลงทะเบียนเรียบร้อยแล้วนะคะ' },
      { time: '01:12', speaker: 'Customer', text: 'ถ้าจะดูวันหมดประกันภายหลังต้องดูตรงไหนคะ' },
      { time: '01:36', speaker: 'Agent', text: 'หนูส่งลิงก์ตรวจสอบด้วยเบอร์โทรให้ทาง LINE ได้เลยค่ะ' },
    ],
  },
  {
    fileId: 'AV-2026-0515-006',
    name: 'call_0867742201_slumberland_refund_request.mp3',
    customerName: 'คุณรชต เมธากุล',
    customerPhone: '0867742201',
    agentId: '202',
    agentName: 'Krit S.',
    brand: 'SLUMBERLAND',
    product: 'Mattress Topper',
    model: 'Cloud Touch 3.5',
    serialNo: 'SL-CT-35-660901',
    registrationNo: 'SLB-2025-1189',
    orderNumber: 'SO-251218-7719',
    sentiment: 'negative',
    status: 'COMPLETE',
    callType: 'inbound',
    saleChannel: 'Lazada',
    callDate: '2026-05-18T13:34:00',
    uploadDate: '2026-05-18T13:50:00',
    durationSeconds: 541,
    qaScore: 7.4,
    csatScore: 2.6,
    topic: 'ขอคืนเงินหลังหมดประกัน',
    intent: 'ขอ refund และสอบถามสิทธิ์ประกัน',
    summary:
      'ลูกค้าขอคืนเงิน topper ที่ซื้อปลายปี 2025 เนื่องจากไม่พอใจกับการใช้งาน แต่สินค้าหมดระยะรับประกันและเกินช่วงคืนสินค้าแล้ว',
    keyInsights: [
      'ลูกค้าไม่ทราบความแตกต่างระหว่างระยะคืนสินค้าและระยะรับประกัน',
      'มีความเสี่ยง escalated เพราะลูกค้าใช้คำว่า “จะร้องเรียน”',
      'ควรเสนอทางเลือกตรวจสภาพสินค้าแบบ goodwill แทนการปฏิเสธทันที',
    ],
    keywords: ['คืนเงิน', 'หมดประกัน', 'ร้องเรียน', 'goodwill', 'Lazada'],
    riskLevel: 'High',
    resolution: 'ส่งต่อหัวหน้าทีมเพื่อพิจารณา goodwill inspection',
    actionItems: [
      'แจ้งหัวหน้าทีม retention',
      'ส่งเงื่อนไขคืนสินค้าและประกันแบบสรุปสั้น',
      'นัดโทรกลับก่อน 17:00',
    ],
    transcript: [
      { time: '00:00', speaker: 'Agent', text: 'สวัสดีครับ Slumberland Care กฤตรับสายครับ' },
      { time: '00:15', speaker: 'Customer', text: 'ผมอยากคืนเงิน topper ตัวนี้ ใช้แล้วไม่สบายหลังเลยครับ' },
      { time: '00:51', speaker: 'Agent', text: 'ขอตรวจสอบเลขทะเบียน SLB-2025-1189 ก่อนนะครับ' },
      { time: '02:10', speaker: 'Customer', text: 'ถ้าไม่ได้คืนเงินผมคงต้องร้องเรียน เพราะตอนซื้อไม่ได้บอกละเอียดแบบนี้' },
      { time: '03:03', speaker: 'Agent', text: 'ผมเข้าใจครับ เคสนี้เกินระยะคืนสินค้าแล้ว แต่จะส่งให้หัวหน้าทีมพิจารณาตรวจสภาพแบบ goodwill ให้ครับ' },
    ],
  },
  {
    fileId: 'AV-2026-0514-019',
    name: 'call_0801187742_sealy_manual_registration.mp3',
    customerName: 'คุณธัญญา วัฒนกุล',
    customerPhone: '0801187742',
    agentId: '102',
    agentName: 'Nicha W.',
    brand: 'SEALY',
    product: 'Mattress',
    model: 'Posturepedic Plus',
    serialNo: 'SY-PP-KG-442019',
    registrationNo: 'SEA-2026-0077',
    orderNumber: 'SO-260501-0911',
    sentiment: 'neutral',
    status: 'COMPLETE',
    callType: 'inbound',
    saleChannel: 'Mega Bangna',
    callDate: '2026-05-18T15:42:00',
    uploadDate: '2026-05-18T16:02:00',
    durationSeconds: 266,
    qaScore: 8.8,
    csatScore: 4.1,
    topic: 'ลงทะเบียนรับประกัน',
    intent: 'ขอลงทะเบียนประกันจากใบเสร็จหน้าร้าน',
    summary:
      'ลูกค้าซื้อที่นอน SEALY จากหน้าร้านและต้องการลงทะเบียนรับประกันด้วยเบอร์โทร เนื่องจากสแกน QR บนใบเสร็จไม่สำเร็จ',
    keyInsights: [
      'ลูกค้าไม่ได้มีปัญหากับสินค้า แต่ติดขั้นตอนลงทะเบียน',
      'ควรทำให้เลข serial ถูกบันทึกชัดเจนเพื่อลดปัญหา claim ในอนาคต',
      'เคสนี้เหมาะใช้เป็นตัวอย่าง voice-to-warranty registration',
    ],
    keywords: ['ลงทะเบียน', 'QR', 'ใบเสร็จ', 'serial', 'หน้าร้าน'],
    riskLevel: 'Low',
    resolution: 'ลงทะเบียนประกันสำเร็จและส่ง SMS ยืนยัน',
    actionItems: [
      'ยืนยันข้อมูล serial SY-PP-KG-442019',
      'ส่ง SMS ยืนยันทะเบียน SEA-2026-0077',
    ],
    transcript: [
      { time: '00:00', speaker: 'Agent', text: 'SEALY Care สวัสดีค่ะ น้องนิชารับสายค่ะ' },
      { time: '00:13', speaker: 'Customer', text: 'สแกน QR ลงทะเบียนประกันไม่ติดค่ะ เลยโทรมาขอลงทะเบียนให้หน่อย' },
      { time: '00:58', speaker: 'Agent', text: 'ได้ค่ะ ขอเลข serial และเบอร์โทรสำหรับผูกประกันนะคะ' },
      { time: '02:01', speaker: 'Customer', text: 'Serial SY-PP-KG-442019 ค่ะ ซื้อที่ Mega Bangna' },
      { time: '03:22', speaker: 'Agent', text: 'ลงทะเบียนเรียบร้อย เลขประกัน SEA-2026-0077 หนูส่ง SMS ยืนยันให้นะคะ' },
    ],
  },
];

export const mockWarranties: MockWarranty[] = [
  {
    warrantyId: 'WTY-001',
    relatedFileId: 'AV-2026-0518-001',
    registrationNo: 'LOT-2026-0102',
    customerName: 'คุณพิมพ์ชนก ศรีวัฒน์',
    customerPhone: '0819979336',
    brand: 'LOTOS',
    category: 'Mattress',
    model: 'Hybrid Comfort Q5',
    size: 'Queen 5 ft',
    serialNo: 'LT-HY-Q5-774455',
    warrantyPeriod: '120 Months',
    purchaseDate: '2026-01-12',
    deliveryDate: '2026-01-15',
    expiryDate: '2036-01-15',
    purchaseChannel: 'Online Store',
    orderNumber: 'SO-260518-1104',
    status: 'CLAIM_OPEN',
    qdrantSynced: true,
    claimCount: 1,
    notes: 'เปิดเคสเคลมจากเสียงสนทนาเรื่องอาการคัน ผื่น และความกังวลสารเคมีจากที่นอน',
  },
  {
    warrantyId: 'WTY-002',
    relatedFileId: 'AV-2026-0517-014',
    registrationNo: 'MID-2026-0038',
    customerName: 'คุณอัครเดช วงศ์สา',
    customerPhone: '0824451180',
    brand: 'MIDAS',
    category: 'Adjustable Bed',
    model: 'Ergo Lift M2',
    size: 'King 6 ft',
    serialNo: 'MD-EL-M2-923110',
    warrantyPeriod: '60 Months',
    purchaseDate: '2026-05-15',
    deliveryDate: '2026-05-20',
    expiryDate: '2031-05-20',
    purchaseChannel: 'Central Rama 9',
    orderNumber: 'SO-260515-0842',
    status: 'ACTIVE',
    qdrantSynced: true,
    claimCount: 0,
    notes: 'ประกันเริ่มนับจากวันจัดส่งและติดตั้ง',
  },
  {
    warrantyId: 'WTY-003',
    relatedFileId: 'AV-2026-0516-027',
    registrationNo: 'BED-2026-0211',
    customerName: 'คุณสุพัตรา แซ่ลิ้ม',
    customerPhone: '0892214455',
    brand: 'BEDGEAR',
    category: 'Pillow',
    model: 'Storm Performance Pillow',
    size: 'Standard',
    serialNo: 'BG-ST-PW-118204',
    warrantyPeriod: '24 Months',
    purchaseDate: '2026-05-07',
    deliveryDate: '2026-05-09',
    expiryDate: '2028-05-09',
    purchaseChannel: 'Shopee Mall',
    orderNumber: 'SO-260507-2210',
    status: 'ACTIVE',
    qdrantSynced: true,
    claimCount: 0,
    notes: 'ลูกค้าให้ feedback เชิงบวกหลังใช้งาน',
  },
  {
    warrantyId: 'WTY-005',
    relatedFileId: 'AV-2026-0514-019',
    registrationNo: 'SEA-2026-0077',
    customerName: 'คุณธัญญา วัฒนกุล',
    customerPhone: '0801187742',
    brand: 'SEALY',
    category: 'Mattress',
    model: 'Posturepedic Plus',
    size: 'King 6 ft',
    serialNo: 'SY-PP-KG-442019',
    warrantyPeriod: '120 Months',
    purchaseDate: '2026-05-01',
    deliveryDate: '2026-05-03',
    expiryDate: '2036-05-03',
    purchaseChannel: 'Mega Bangna',
    orderNumber: 'SO-260501-0911',
    status: 'ACTIVE',
    qdrantSynced: true,
    claimCount: 0,
    notes: 'ลงทะเบียนจาก call detail หลัง QR บนใบเสร็จใช้งานไม่ได้',
  },
];

export const getMockFileById = (fileId: string): MockAudioFile | undefined =>
  mockFiles.find((file) => file.fileId === fileId);

export const getWarrantyByFileId = (fileId: string): MockWarranty | undefined =>
  mockWarranties.find((warranty) => warranty.relatedFileId === fileId);

export const getWarrantyByRegistrationNo = (registrationNo: string): MockWarranty | undefined =>
  mockWarranties.find((warranty) => warranty.registrationNo.toLowerCase() === registrationNo.toLowerCase());

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const formatDisplayDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDisplayDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const daysUntil = (value: string): number => {
  const target = new Date(value);
  const today = new Date(DEMO_TODAY);
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

export const getSentimentLabel = (sentiment: MockSentiment): string => {
  if (sentiment === 'positive') return 'Positive';
  if (sentiment === 'negative') return 'Negative';
  return 'Neutral';
};

export const getRiskLabel = (risk: MockRiskLevel): string => {
  if (risk === 'High') return 'High Risk';
  if (risk === 'Medium') return 'Monitor';
  return 'Low Risk';
};

export const getDashboardSummary = () => {
  const totalCalls = mockFiles.length;
  const avgQa = mockFiles.reduce((sum, file) => sum + file.qaScore, 0) / totalCalls;
  const avgCsat = mockFiles.reduce((sum, file) => sum + file.csatScore, 0) / totalCalls;
  const openClaims = mockWarranties.filter((item) => item.status === 'CLAIM_OPEN').length;
  const highRisk = mockFiles.filter((file) => file.riskLevel === 'High').length;
  const synced = mockWarranties.filter((item) => item.qdrantSynced).length;

  return {
    totalCalls,
    avgQa,
    avgCsat,
    openClaims,
    highRisk,
    synced,
    warrantyTotal: mockWarranties.length,
  };
};

export const getTopicDistribution = () => {
  const groups = new Map<string, { name: string; value: number; files: MockAudioFile[] }>();
  mockFiles.forEach((file) => {
    const existing = groups.get(file.topic) || { name: file.topic, value: 0, files: [] };
    existing.value += 1;
    existing.files.push(file);
    groups.set(file.topic, existing);
  });
  return Array.from(groups.values()).sort((a, b) => b.value - a.value);
};

export const getBrandDistribution = () => {
  const groups = new Map<string, { brand: string; total: number; positive: number; neutral: number; negative: number }>();
  mockFiles.forEach((file) => {
    const existing = groups.get(file.brand) || { brand: file.brand, total: 0, positive: 0, neutral: 0, negative: 0 };
    existing.total += 1;
    existing[file.sentiment] += 1;
    groups.set(file.brand, existing);
  });
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
};

export const getAgentPerformance = () =>
  mockAgents.map((agent) => {
    const files = mockFiles.filter((file) => file.agentId === agent.agentId);
    const avgQa = files.length ? files.reduce((sum, file) => sum + file.qaScore, 0) / files.length : 0;
    const avgCsat = files.length ? files.reduce((sum, file) => sum + file.csatScore, 0) / files.length : 0;
    const escalated = files.filter((file) => file.status === 'ESCALATED').length;

    return {
      ...agent,
      totalCalls: files.length,
      avgQa,
      avgCsat,
      escalated,
      resolutionRate: files.length ? Math.round(((files.length - escalated) / files.length) * 100) : 0,
    };
  });

export const getKeywordFrequency = () => {
  const counts = new Map<string, number>();
  mockFiles.forEach((file) => {
    file.keywords.forEach((keyword) => counts.set(keyword, (counts.get(keyword) || 0) + 1));
  });
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
  return Array.from(counts.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};
