# สรุป Tech Stack หลักของโปรเจกต์

## Project Overview

โปรเจกต์นี้คือ **AI Smart Research Assistant / Smart Digest** เป็น full-stack web application สำหรับ scrape เนื้อหาจากหน้าเว็บ แล้วใช้ AI ช่วยสรุปหรือวิเคราะห์ข้อมูลตาม prompt ของผู้ใช้

ระบบแบ่งออกเป็น 2 ส่วนหลัก คือ frontend สำหรับรับ input และแสดงผล และ backend สำหรับ scrape ข้อมูลจาก URL, สร้าง prompt และเรียก AI model

## Frontend

### React

ใช้ React เป็น framework หลักสำหรับสร้าง user interface ของเว็บแอป

หน้าที่หลักคือจัดการ state ของ URL, prompt, language, loading state และ result ที่ได้จาก backend

### TypeScript

ใช้ TypeScript เพื่อช่วยให้โค้ดฝั่ง frontend มี type safety มากขึ้น ลดโอกาสเกิด error จากการส่งข้อมูลผิดรูปแบบ

### Vite

ใช้ Vite เป็น development server และ build tool

ในโปรเจกต์นี้ Vite ยังทำหน้าที่ proxy request จาก `/myai/api` ไปยัง backend ที่ `localhost:8000` ในระหว่าง development

### Tailwind CSS

ใช้ Tailwind CSS สำหรับจัด styling ของหน้าเว็บ ทำให้สามารถสร้าง layout และ design ได้รวดเร็ว

### Lucide React

ใช้ Lucide React สำหรับ icon ต่างๆ ในหน้าเว็บ เช่น icon ของ URL, export, copy และ loading

### html2canvas

ใช้ html2canvas เพื่อ capture ผลลัพธ์บนหน้าเว็บให้กลายเป็น canvas สำหรับนำไป export เป็นรูปภาพหรือ PDF

### jsPDF

ใช้ jsPDF สำหรับสร้างไฟล์ PDF จากผลลัพธ์ที่แสดงบนหน้าเว็บ

## Backend

### Python

ใช้ Python เป็นภาษาหลักของ backend เพราะเหมาะกับงาน API และการประมวลผลข้อมูลจากเว็บ

### FastAPI

ใช้ FastAPI สำหรับสร้าง REST API endpoint หลักคือ `/api/analyze`

endpoint นี้รับข้อมูลจาก frontend ได้แก่ URL, prompt และภาษา จากนั้นประมวลผลและส่งผลลัพธ์กลับไป

### Uvicorn

ใช้ Uvicorn เป็น ASGI server สำหรับรัน FastAPI backend

### Pydantic

ใช้ Pydantic สำหรับกำหนด schema ของ request body ผ่าน `AnalyzeRequest`

ข้อมูลที่รับเข้ามาคือ:

- `url`: URL ของหน้าเว็บที่ต้องการวิเคราะห์
- `prompt`: คำสั่งจากผู้ใช้
- `lang`: ภาษาที่ต้องการให้ AI ตอบกลับ ค่าเริ่มต้นคือ `th`

### Trafilatura

ใช้ Trafilatura สำหรับ scrape และ extract เนื้อหาหลักจากหน้าเว็บ

ใน workflow มี 2 ขั้นตอนสำคัญ:

- `trafilatura.fetch_url(url)` สำหรับดาวน์โหลดข้อมูลจาก URL
- `trafilatura.extract(downloaded)` สำหรับดึงเนื้อหาหลักออกจาก HTML

### python-dotenv

ใช้ python-dotenv สำหรับโหลด environment variable จากไฟล์ `.env`

ตัวแปรสำคัญคือ `GROQ_API_KEY`

## AI และ Model

### Groq

โปรเจกต์นี้ใช้ Groq เป็นผู้ให้บริการ AI inference

backend เรียกใช้งาน Groq ผ่าน OpenAI-compatible API โดยใช้ OpenAI SDK และตั้งค่า `base_url` เป็น:

```text
https://api.groq.com/openai/v1
```

### OpenAI SDK

แม้จะใช้ Groq เป็น provider แต่ backend ใช้ package `openai` เพื่อเรียก API เพราะ Groq รองรับรูปแบบ API ที่ compatible กับ OpenAI

### Model ที่ใช้

โมเดลหลักที่ใช้ในโปรเจกต์คือ:

```text
llama-3.1-8b-instant
```

โมเดลนี้ถูกเรียกใน backend ผ่าน:

```python
client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[
        {"role": "user", "content": full_prompt}
    ]
)
```

## API Flow หลัก

1. Frontend ส่ง request ไปที่ `/myai/api/analyze`
2. Vite proxy ส่งต่อไปยัง backend `/api/analyze`
3. FastAPI รับ request และตรวจสอบ `GROQ_API_KEY`
4. Backend ใช้ Trafilatura scrape และ extract เนื้อหาจาก URL
5. Backend สร้าง full prompt จากคำสั่งผู้ใช้ ภาษา และเนื้อหาที่ scrape ได้
6. Backend เรียก Groq model `llama-3.1-8b-instant`
7. Backend ส่งผลลัพธ์กลับ frontend
8. Frontend แสดงผล และรองรับ copy, export PDF และ export PNG

## Deployment และ Runtime

### Bun

ใช้ Bun สำหรับจัดการ dependency และรัน script ฝั่ง frontend

### Docker

โปรเจกต์มีไฟล์ Docker สำหรับ backend และ production compose ทำให้สามารถ containerize ระบบเพื่อนำไป deploy ได้

### Environment Variable

ค่าที่ต้องตั้งก่อนใช้งานจริงคือ:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## สรุปแบบสั้นสำหรับพูดนำเสนอ

โปรเจกต์นี้ใช้ React, TypeScript, Vite และ Tailwind CSS ในฝั่ง frontend ส่วน backend ใช้ Python FastAPI ร่วมกับ Trafilatura สำหรับ scrape เนื้อหาจากเว็บ และใช้ OpenAI SDK เพื่อเรียก Groq API

AI model ที่ใช้คือ `llama-3.1-8b-instant` โดยหน้าที่ของโมเดลคือรับเนื้อหาที่ scrape ได้พร้อมกับ prompt ของผู้ใช้ แล้วสร้างผลลัพธ์เป็นบทสรุปหรือบทวิเคราะห์กลับมาให้แสดงบนหน้าเว็บครับ
