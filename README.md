# FontAI — AI Voice Intelligence System (v1.0 — Real AI)

## สิ่งที่อัปเดต

### Real AI Integration
- **Whisper AI** (Groq API) สำหรับ Speech-to-Text จริง — ถอดเสียงจากไฟล์ .wav เป็นข้อความภาษาไทย
- **Llama 3.3 70B** (Groq API) สำหรับ NLP Analysis — Summary, Sentiment, CSAT, Brand/Product extraction
- **Fallback Mock** ถ้ายังไม่ได้ตั้ง API Key จะใช้ Mock AI แทน

### Sentiment Logic
- **NEUTRAL** = ลูกค้าสอบถามข้อมูลทั่วไป
- **NEGATIVE** = ลูกค้าแจ้งปัญหา/ร้องเรียน
- **POSITIVE** = ลูกค้าชมเชย/พอใจ

### Brand & Product Extraction
- Llama จะตรวจจับ Brand จาก Transcription: LOTUS, OMAZZ, DUNLOPILLO, MIDAS, BEDGEAR, LALABED, ZINUS, EASTMAN HOUSE, MALOUF, LOTO MOBILI, WOODFIELD, RESTONIC
- Llama จะตรวจจับ Product: Mattress, Pillow, Bedding, Bed Frame, Topper, Protector

### CSAT & QA Score
- **CSAT (1-5)**: Llama ประเมินจาก Transcription + บริบทการสนทนา
- **QA Score (0-10)**: Llama ประเมินคุณภาพการให้บริการของ Agent

### Seekable Audio Player
- กดเล่นเสียงได้จริง
- เลื่อน waveform bar เพื่อเลือกช่วงเวลาได้
- แสดง current time / total duration

---

## วิธี Setup (5 นาที)

### 1. Backend

```bash
cd project-backend
pip install -r requirements.txt
```

### 2. Groq API Key (ฟรี!)

1. ไปที่ https://console.groq.com
2. สมัครบัญชี (ฟรี)
3. ไป API Keys → Create API Key
4. ตั้ง environment variable:

```bash
# Mac/Linux
export GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxxxxx"

# Windows PowerShell
$env:GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxxxxx"

# Windows CMD
set GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxx
```

### 3. รัน Backend

```bash
cd project-backend
uvicorn main:app --reload --port 8000
```

ตรวจสอบว่า AI พร้อม: http://localhost:8000/api/v1/ai/ai-status

### 4. Frontend

```bash
cd project-frontend
npm install
npm run dev
```

เปิดเว็บ: http://localhost:3000/files

---

## การทำงานของ AI Pipeline

```
ไฟล์เสียง (.wav)
    │
    ▼
┌─────────────────────────┐
│  Whisper large-v3       │  ← Groq API
│  Speech-to-Text (ไทย)   │
│  พร้อม timestamps       │
└─────────┬───────────────┘
          │ transcript
          ▼
┌─────────────────────────┐
│  Llama 3.3 70B          │  ← Groq API
│  • แยก Agent/Customer   │
│  • Summary (ภาษาไทย)    │
│  • Sentiment Analysis   │
│  • Brand/Product detect │
│  • CSAT scoring (1-5)   │
│  • QA scoring (0-10)    │
│  • Key Insights         │
└─────────┬───────────────┘
          │ analysis result
          ▼
┌─────────────────────────┐
│  Frontend Display       │
│  • Chat-style transcript│
│  • Summary bullets      │
│  • Metadata sidebar     │
│  • Seekable audio player│
│  • Key Insights card    │
└─────────────────────────┘
```

---

## API Endpoints

| Method | URL | หน้าที่ |
|--------|-----|---------|
| GET | /api/v1/audio/list | รายการไฟล์ทั้งหมด |
| GET | /api/v1/audio/detail/{file_id} | ข้อมูลไฟล์ + ผล AI |
| POST | /api/v1/audio/upload | อัปโหลดไฟล์เสียง |
| GET | /api/v1/audio/play/{file_id} | เล่นเสียง |
| DELETE | /api/v1/audio/delete/{file_id} | ลบไฟล์ |
| POST | /api/v1/ai/analyze/{file_id} | สั่งวิเคราะห์ AI |
| GET | /api/v1/ai/status/{task_id} | ตรวจสถานะ |
| GET | /api/v1/ai/ai-status | ตรวจสอบ AI พร้อมหรือไม่ |
