from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import trafilatura
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: str
    prompt: str
    lang: str = "th"

@app.post("/api/analyze")
async def analyze_url(req: AnalyzeRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key not found. Please set GROQ_API_KEY in your .env file.")

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
    )

    downloaded = trafilatura.fetch_url(req.url)
    if downloaded is None:
        raise HTTPException(status_code=400, detail="Error: ไม่สามารถดาวน์โหลดข้อมูลจากหน้าเว็บได้ (เว็บอาจบล็อกบอทหรือ URL ผิด)")

    text = trafilatura.extract(downloaded, include_comments=False, include_tables=True)
    if text is None:
        raise HTTPException(status_code=400, detail="Error: ไม่พบเนื้อหาหลักในหน้าเว็บนี้")

    # ประกอบร่าง Prompt - ใช้ template + user instruction ส่วนตัว
    user_instruction = f" คำขอพิเศษจากผู้ใช้: {req.prompt}" if req.prompt else ""

    if req.lang == "en":
        full_prompt = f"""You are an elite Data Analyst and Executive Editor.
Your primary task is: "{req.prompt if req.prompt else 'Summarize the main points'}"

Analyze the provided article deeply and extract the most valuable insights. Format the output flawlessly in Markdown.

**CRITICAL FORMATTING INSTRUCTIONS BASED ON THE TASK:**

1. If the task is **"Summarize"** (Comprehensive overview):
   - # [Catchy & Accurate Title]
   - ## Executive Summary (A powerful 2-3 sentence overview)
   - ## Core Context (The 5W1H - Who, What, When, Where, Why, How)
   - ## Detailed Breakdown (Use sub-bullet points for depth)
   - > **Key Quote / Insight**: (Extract the most powerful statement from the text)

2. If the task is **"Key Takeaways"** (Focus on critical points & terms):
   - # [Analytical Title]
   - ## Top Actionable Insights (3-5 highly detailed bullet points)
   - ## Technical Glossary (Use a Markdown table `| Term | Definition | Context |`)
   - ## Why It Matters (Impact analysis in 1-2 paragraphs)

3. If the task is **"Pros & Cons"** (Deep critical analysis):
   - # [Evaluation Title]
   - ## Strengths & Benefits (Pros) 
   - ## Weaknesses & Risks (Cons) 
   - ## Strategic Recommendations (How to mitigate the cons or maximize the pros)
   - ## Final Verdict (A clear, objective conclusion)

4. If the task is **"Compare"** (Analytical evaluation):
   - # [Comparison Title]
   - ## The Contenders (Briefly introduce what is being compared)
   - ## Head-to-Head Analysis (Use a detailed Markdown table `| Criteria | Subject A | Subject B |`)
   - ## Core Similarities
   - ## Critical Differences
   - ## Final Assessment (Which is better for what situation?)

5. If the task is **"Presentation"** (Ready for PowerPoint/Slides):
   - # [Slide Title: Hook the Audience]
   - ## Slide 1: The Big Picture (Bullet points, max 10 words each)
   - ## Slide 2: The Data & Facts (Highlight numbers, stats, or core facts)
   - ## Slide 3: The Impact (What this means for the future)
   - ## Slide 4: Call to Action / Next Steps

**ABSOLUTE RULES FOR ALL RESPONSES:**
- Output Language: **ENGLISH ONLY**.
- Use Markdown rigorously: **Bold** key metrics/names, use nested lists, blockquotes (`>`), and tables where relevant.
- NO FILLER WORDS. DO NOT say "Here is the summary". Start directly with the `# Title`.

--- Article Content ---
{text}
--- End of Content ---"""

    else:
        full_prompt = f"""คุณเป็นสุดยอดนักวิเคราะห์ข้อมูลและบรรณาธิการบริหาร (Elite Data Analyst & Executive Editor)
หน้าที่หลักของคุณคือ: "{req.prompt if req.prompt else 'สรุปเนื้อหาหลักให้เข้าใจง่าย'}"

จงวิเคราะห์บทความอย่างละเอียดลึกซึ้ง และสกัดข้อมูลที่มีมูลค่าที่สุดออกมา จัดรูปแบบผลลัพธ์ให้ออกมาเป็น Markdown ที่สมบูรณ์แบบ

**คำสั่งบังคับโครงสร้างอย่างละเอียด (เลือกใช้ตามหน้าที่หลัก):**

1. หากคำสั่งคือ **"สรุปบทความ"** (เน้นความเข้าใจที่ครอบคลุม):
   - # [ชื่อเรื่องที่ดึงดูดและตรงประเด็น]
   - ## สรุปสำหรับผู้บริหาร (ภาพรวมที่ทรงพลัง 2-3 ประโยค)
   - ## บริบทสำคัญ (วิเคราะห์ 5W1H - ใคร, ทำอะไร, ที่ไหน, เมื่อไหร่, ทำไม, อย่างไร)
   - ## เจาะลึกรายละเอียด (ใช้ Bullet points และมีข้อย่อยเพื่อลงลึกรายละเอียด)
   - > **วาทะเด็ด / ข้อคิดสำคัญ**: (คัดลอกประโยคหรือใจความที่อิมแพคที่สุดจากบทความมาใส่ Blockquote)

2. หากคำสั่งคือ **"เน้นหลักสำคัญ"** (เน้นเนื้อๆ แก่นแท้ และคำศัพท์):
   - # [ชื่อเรื่องเชิงวิเคราะห์]
   - ## แก่นแท้ที่นำไปใช้ได้จริง (3-5 Bullet points พร้อมอธิบายเชิงลึก)
   - ## เจาะลึกคำศัพท์/คีย์เวิร์ด (บังคับใช้ตาราง Markdown `| คำศัพท์ | ความหมาย | บริบทในเรื่อง |`)
   - ## ผลกระทบและสิ่งที่จะเกิดขึ้น (ทำไมเรื่องนี้ถึงสำคัญ)

3. หากคำสั่งคือ **"วิเคราะห์ข้อดี-ข้อเสีย"** (วิเคราะห์เชิงวิพากษ์):
   - # [ชื่อเรื่องการประเมิน]
   - ## ข้อดีและจุดแข็ง 
   - ## ข้อเสียและความเสี่ยง 
   - ## ข้อเสนอแนะเชิงกลยุทธ์ (วิธีรับมือข้อเสีย หรือวิธีต่อยอดข้อดี)
   - ## บทสรุปการประเมิน (ฟันธงอย่างเป็นกลางและชัดเจน)

4. หากคำสั่งคือ **"เปรียบเทียบข้อมูล"** (ประเมินความต่าง):
   - # [ชื่อเรื่องการเปรียบเทียบ]
   - ## สิ่งที่นำมาเปรียบเทียบ (แนะนำสั้นๆ ว่ากำลังเทียบอะไรกับอะไร)
   - ## ตารางเปรียบเทียบเชิงลึก (บังคับใช้ตาราง Markdown `| เกณฑ์การประเมิน | สิ่งที่ 1 | สิ่งที่ 2 |`)
   - ## จุดร่วมที่เหมือนกัน
   - ## ความแตกต่างที่เป็นจุดชี้วัด
   - ## สรุปผลลัพธ์ (ฟันธงว่าอะไรเหมาะกับสถานการณ์ไหน)

5. หากคำสั่งคือ **"สรุปเพื่อนำเสนอ"** (พร้อมทำสไลด์):
   - # [ชื่อสไลด์: ดึงดูดความสนใจ]
   - ## สไลด์ที่ 1: ภาพรวมสำคัญ (Bullet points สั้นๆ ห้ามเกินข้อละ 1-2 บรรทัด)
   - ## สไลด์ที่ 2: ข้อมูลและข้อเท็จจริง (เน้นตัวเลข สถิติ หรือ फैक्ट ที่สำคัญ)
   - ## สไลด์ที่ 3: ผลกระทบ (เรื่องนี้ส่งผลต่ออนาคตอย่างไร)
   - ## สไลด์ที่ 4: บทสรุป / สิ่งที่ต้องทำต่อ (Call to Action)

**กฎเหล็กที่ห้ามละเมิดเด็ดขาด:**
- ภาษาที่ใช้ตอบ: **ภาษาไทยเท่านั้น**
- ใช้รูปแบบ Markdown อย่างเต็มพิกัด: เน้น **ตัวหนา** ที่ตัวเลข/ชื่อคน/คำสำคัญ, ใช้ตาราง, และใช้ Blockquote (`>`) ให้สวยงาม
- ห้ามมีคำเกริ่นนำเด็ดขาด (เช่น "นี่คือสรุป...", "ได้เลยครับ") ให้เริ่มทำงานที่ `# ชื่อเรื่อง` ทันที

--- เนื้อหาบทความ ---
{text}
--- จบเนื้อหา ---"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": full_prompt}
            ]
        )
        return {"result": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")
