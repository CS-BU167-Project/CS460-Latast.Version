# AI Smart Research Assistant (CS460)

AI Smart Research Assistant, also shown in the UI as **Smart Digest**, is a full-stack web application for extracting, summarizing, and analyzing information from web pages with AI.

The user enters a URL and a prompt. The backend scrapes the main page content with `trafilatura`, sends the extracted content to Groq, and returns a readable summary or analysis.

## Features

- **Web content extraction:** Downloads and extracts clean text from a URL using `trafilatura`.
- **AI-powered analysis:** Uses Groq model `llama-3.1-8b-instant`.
- **OpenAI-compatible client:** Calls Groq through the `openai` Python SDK with Groq's `base_url`.
- **Thai and English output:** Supports `th` and `en` response modes.
- **Modern frontend:** React, TypeScript, Vite, Tailwind CSS, and Lucide React.
- **Export results:** Copy output or export as PDF/PNG with `html2canvas` and `jsPDF`.

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
- OpenAI SDK
- Groq API
- Model: `llama-3.1-8b-instant`
- python-dotenv

## Prerequisites

- Bun for frontend package management and scripts.
- Python 3.x for the FastAPI backend.
- A Groq API key from GroqCloud.

## Setup

Run these commands from the `my-ai-app` directory unless stated otherwise.

### 1. Create Environment File

```bash
copy .env.example .env
```

Edit `.env` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Install Frontend Dependencies

```bash
cd frontend
bun install
cd ..
```

### 3. Install Backend Dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

On macOS/Linux, activate the virtual environment with:

```bash
source venv/bin/activate
```

## Run Locally

From `my-ai-app`, run:

```bash
bun run dev
```

This runs the frontend script from `frontend/package.json`, which starts:

- Vite frontend on `http://localhost:3000`
- FastAPI backend on `http://localhost:8000`

Open the app at:

```text
http://localhost:3000/myai/
```

Backend API docs:

```text
http://localhost:8000/docs
```

## API Endpoint

### `POST /api/analyze`

Request body:

```json
{
  "url": "https://example.com/article",
  "prompt": "Summarize the main points",
  "lang": "th"
}
```

Fields:

- `url`: Web page URL to scrape.
- `prompt`: User instruction for the AI.
- `lang`: Output language, either `th` or `en`.

During frontend development, Vite proxies:

```text
/myai/api/analyze -> http://localhost:8000/api/analyze
```

## Workflow

1. User enters a URL, prompt, and language in the React frontend.
2. Frontend sends `POST /myai/api/analyze`.
3. Vite rewrites `/myai/api` to `/api` and proxies the request to FastAPI.
4. Backend checks `GROQ_API_KEY`.
5. Backend downloads the page with `trafilatura.fetch_url(url)`.
6. Backend extracts main content with `trafilatura.extract()`.
7. Backend builds a full prompt using the extracted content, user prompt, and selected language.
8. Backend calls Groq model `llama-3.1-8b-instant`.
9. Backend returns `{ "result": "..." }`.
10. Frontend renders the result and enables copy/PDF/PNG export.

## Usage

1. Open `http://localhost:3000/myai/`.
2. Paste the URL of an article or web page.
3. Enter a prompt, or choose a quick prompt.
4. Select Thai or English output.
5. Click the analyze button.
6. Wait for the AI-generated result.
7. Copy the result or export it as PDF/PNG.

## Presentation Scripts

Project presentation notes are available in the root `script/` folder:

- `10-minute-presentation-script.md`
- `presentation-basic-usage-script.md`
- `scraping-workflow-script-and-diagram.md`
- `tech-stack-summary.md`
