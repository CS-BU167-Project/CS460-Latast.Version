# Script อธิบาย Workflow การ Scrape และ Mermaid Diagram

## Script พูดอธิบาย Workflow

ในส่วนนี้ผมจะอธิบาย workflow ของระบบ ตั้งแต่ผู้ใช้ใส่ URL จนถึงการได้ผลลัพธ์จาก AI ครับ

ระบบเริ่มจากฝั่ง frontend ซึ่งสร้างด้วย React และ Vite ผู้ใช้จะกรอก URL ของหน้าเว็บที่ต้องการวิเคราะห์ พร้อมกับ prompt หรือคำสั่งที่ต้องการ เช่น ให้สรุป ให้ดึงประเด็นสำคัญ หรือให้เปรียบเทียบข้อมูล

เมื่อผู้ใช้กดปุ่มเริ่มวิเคราะห์ frontend จะส่ง request ไปที่ endpoint `/myai/api/analyze` โดยส่งข้อมูลเป็น JSON ประกอบด้วย `url`, `prompt` และ `lang`

ในขั้นตอน development Vite จะ proxy path `/myai/api` ไปยัง backend ที่รันอยู่บน `localhost:8000` และ rewrite path ให้กลายเป็น `/api/analyze` ซึ่งเป็น endpoint จริงของ FastAPI ครับ

เมื่อ backend ได้รับ request แล้ว จะเริ่มจากตรวจสอบ API key จากไฟล์ `.env` โดยใช้ตัวแปรชื่อ `GROQ_API_KEY`

ถ้าไม่พบ API key ระบบจะส่ง error กลับไปทันที เพื่อบอกว่าต้องตั้งค่า key ก่อนใช้งาน

ถ้ามี API key ระบบจะสร้าง client ผ่าน OpenAI SDK แต่กำหนด `base_url` ให้ชี้ไปที่ Groq API คือ `https://api.groq.com/openai/v1` ทำให้สามารถเรียก Groq model ด้วยรูปแบบ OpenAI-compatible API ได้ครับ

ต่อมา backend จะใช้ไลบรารี `trafilatura` เพื่อ scrape หน้าเว็บ โดยเริ่มจาก `trafilatura.fetch_url(url)` เพื่อดาวน์โหลด HTML จาก URL ที่ผู้ใช้ใส่เข้ามา

ถ้าดาวน์โหลดไม่ได้ เช่น URL ผิด หรือเว็บไซต์บล็อกการเข้าถึง ระบบจะส่ง error กลับไปยังหน้าเว็บ

ถ้าดาวน์โหลดสำเร็จ ระบบจะเรียก `trafilatura.extract()` เพื่อดึงเฉพาะเนื้อหาหลักของหน้าเว็บออกมา โดยลดส่วนที่ไม่จำเป็น เช่น comment หรือ element ที่ไม่เกี่ยวกับบทความ

หลังจากได้ text content แล้ว backend จะสร้าง full prompt โดยรวม instruction ของระบบ, prompt ที่ผู้ใช้กรอก, ภาษาที่เลือก และเนื้อหาจากหน้าเว็บเข้าด้วยกัน

จากนั้น backend จะส่ง prompt นี้ไปยัง Groq โดยใช้โมเดล `llama-3.1-8b-instant`

AI model จะประมวลผลและส่งผลลัพธ์กลับมาเป็นข้อความสรุปหรือบทวิเคราะห์

backend จะส่งผลลัพธ์นี้กลับไปยัง frontend ในรูปแบบ JSON

สุดท้าย frontend จะนำข้อความที่ได้มา parse และแสดงผลให้สวยงามบนหน้าเว็บ เช่น แปลง heading, bullet point, table และ code block ให้อยู่ในรูปแบบ HTML ที่อ่านง่าย

ผู้ใช้สามารถอ่านผลลัพธ์บนหน้าเว็บ คัดลอกข้อความ หรือ export เป็น PDF และ PNG ได้ครับ

## Flow แบบย่อ

1. ผู้ใช้กรอก URL และ prompt
2. Frontend ส่ง request ไปที่ `/myai/api/analyze`
3. Vite proxy ส่งต่อไปยัง FastAPI endpoint `/api/analyze`
4. Backend ตรวจสอบ `GROQ_API_KEY`
5. `trafilatura.fetch_url()` ดาวน์โหลดหน้าเว็บ
6. `trafilatura.extract()` ดึงเนื้อหาหลัก
7. Backend สร้าง prompt ตามภาษาและคำสั่งผู้ใช้
8. ส่ง prompt ไปที่ Groq model `llama-3.1-8b-instant`
9. Backend ส่งผลลัพธ์กลับ frontend
10. Frontend แสดงผล และรองรับ export เป็น PDF/PNG
