# AI Smart Research Assistant (CS460)

AI Smart Research Assistant, also shown in the UI as **Smart Digest**, is a full-stack web application that helps users extract, summarize, and analyze content from web pages with AI.

Users provide a URL and a prompt. The backend scrapes the main page content, sends it to an AI model, and returns a clean, readable summary or analysis.

## Features

- **Web content extraction:** Scrapes and extracts clean article text from a URL using `trafilatura`.
- **AI-powered analysis:** Uses Groq with the `llama-3.1-8b-instant` model to summarize or analyze extracted content.
- **Thai and English output:** Supports language selection through the frontend.
- **Modern UI:** Built with React, TypeScript, Vite, Tailwind CSS, and Lucide React icons.
- **Export support:** Results can be copied or exported as PDF/PNG.
- **Fast API backend:** Uses FastAPI and Uvicorn for the backend service.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Lucide React
- html2canvas
- jsPDF

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- Trafilatura
- OpenAI SDK with Groq-compatible API
- Groq model: `llama-3.1-8b-instant`
- python-dotenv

## Project Structure

```text
.
├── my-ai-app/
│   ├── backend/
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── frontend/
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── .env.example
│   ├── docker-compose.yml
│   └── README.md
└── script/
    ├── 10-minute-presentation-script.md
    ├── presentation-basic-usage-script.md
    ├── scraping-workflow-script-and-diagram.md
    └── tech-stack-summary.md
```

## Quick Start

See [my-ai-app/README.md](my-ai-app/README.md) for full setup and run instructions.

Short version:

```bash
cd my-ai-app
copy .env.example .env
```

Add your Groq API key to `.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Install frontend dependencies:

```bash
cd frontend
bun install
cd ..
```

Install backend dependencies:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

Run both frontend and backend:

```bash
bun run dev
```

- Frontend: `http://localhost:3000/myai/`
- Backend API docs: `http://localhost:8000/docs`

## Basic Usage

1. Open the frontend in a browser.
2. Paste a URL into the URL field.
3. Enter a prompt, or select a quick prompt.
4. Choose Thai or English output.
5. Click the analyze button.
6. Review the AI-generated result.
7. Copy the result or export it as PDF/PNG.

## Workflow Summary

1. The user enters a URL, prompt, and language.
2. The React frontend sends a request to `/myai/api/analyze`.
3. Vite proxies `/myai/api` to the FastAPI backend at `/api/analyze`.
4. FastAPI checks `GROQ_API_KEY`.
5. `trafilatura.fetch_url()` downloads the page.
6. `trafilatura.extract()` extracts the main content.
7. The backend builds a full prompt from the extracted content and user prompt.
8. Groq model `llama-3.1-8b-instant` generates the analysis.
9. The frontend renders the result and supports copy/PDF/PNG export.
