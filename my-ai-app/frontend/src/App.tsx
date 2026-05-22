import { useRef, useState } from 'react';
import { Globe, Sparkles, FileDown, Image, Loader2, ExternalLink, ChevronRight, Copy, Check, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { GlowingEffect } from './components/ui/glowing-effect';
import { MeshGradientBackground } from './components/ui/mesh-gradient';

type ParsedResult = {
  title: string;
  subtitle: string | null;
  panelHtml: string;
  exportHtml: string;
};

const quickPromptsTH = [
  { label: 'สรุปบทความ', value: 'สรุปเนื้อหาหลักให้เข้าใจง่าย' },
  { label: 'เน้นหลักสำคัญ', value: 'เน้นหลักสำคัญและคำศัพท์เทคนิค' },
  { label: 'วิเคราะห์ข้อดี-ข้อเสีย', value: 'วิเคราะห์ข้อดีและข้อเสียอย่างละเอียด' },
  { label: 'เปรียบเทียบข้อมูล', value: 'เปรียบเทียบและวิเคราะห์' },
  { label: 'สรุปเพื่อนำเสนอ', value: 'สรุปสั้นๆ เหมาะสำหรับนำเสนอ' },
];

const quickPromptsEN = [
  { label: 'Summarize', value: 'Summarize the main points' },
  { label: 'Key Takeaways', value: 'Focus on key points' },
  { label: 'Pros & Cons', value: 'Analyze pros and cons' },
  { label: 'Compare', value: 'Compare and analyze' },
  { label: 'Presentation', value: 'Brief for presentation' },
];

const labels = {
  th: {
    title: 'Smart Digest',
    tagline: 'วิเคราะห์เว็บไซต์ด้วย AI',
    urlLabel: 'URL',
    urlPlaceholder: 'https://example.com/article',
    promptLabel: 'สิ่งที่ต้องการ',
    promptPlaceholder: 'พิมพ์คำสั่ง หรือเลือกด้านล่าง…',
    submitBtn: 'เริ่มวิเคราะห์',
    analyzing: 'กำลังประมวลผล…',
    resultLabel: 'ผลลัพธ์',
    emptyTitle: 'พร้อมวิเคราะห์',
    emptyDesc: 'ใส่ URL และเลือกสิ่งที่ต้องการ จากนั้นกดเริ่มวิเคราะห์',
    titleFallback: 'สรุปผลการวิเคราะห์',
    exportedFrom: 'ที่มา',
    exportedAt: 'ส่งออกเมื่อ',
  },
  en: {
    title: 'Smart Digest',
    tagline: 'AI-powered web analysis',
    urlLabel: 'URL',
    urlPlaceholder: 'https://example.com/article',
    promptLabel: 'What to extract',
    promptPlaceholder: 'Type a prompt, or pick one below…',
    submitBtn: 'Start Analysis',
    analyzing: 'Processing…',
    resultLabel: 'Analysis',
    emptyTitle: 'Ready to analyze',
    emptyDesc: 'Enter a URL, pick what to extract, then click Start Analysis',
    titleFallback: 'Analysis Result',
    exportedFrom: 'Source',
    exportedAt: 'Exported',
  },
};

function App() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [formattedResult, setFormattedResult] = useState<string>('');
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const l = labels[lang];
  const quickPrompts = lang === 'th' ? quickPromptsTH : quickPromptsEN;

  const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatInline = (value: string): string => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  const isMarkdownTableSeparator = (line: string): boolean => /^\|?[\s:-]+\|[\s|:-]*$/.test(line.trim());

  const convertTableToHtml = (rows: string[]): string => {
    const dataRows = rows
      .filter((row) => !isMarkdownTableSeparator(row))
      .map((row) => row.split('|').slice(1, -1).map((cell) => formatInline(cell.trim())));

    if (dataRows.length < 2) {
      return `<p>${formatInline(rows.join(' '))}</p>`;
    }

    const [headers, ...body] = dataRows;
    return [
      '<div class="table-wrap"><table><thead><tr>',
      headers.map((cell) => `<th>${cell}</th>`).join(''),
      '</tr></thead><tbody>',
      body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join(''),
      '</tbody></table></div>',
    ].join('');
  };

  const parseResult = (text: string): ParsedResult => {
    const filterPatterns = [
      'ผู้ใช้ต้องการให้', 'ฉันจะสรุป', 'ใช้ภาษาง่าย',
      'คุณเป็นผู้ช่วย', 'คำขอพิเศษ', 'ขอบคุณที่',
      'The user wants', 'The user asked', 'Let me analyze',
      'จุดสำคัญ', 'เคล็ดลับ', 'ข้อมูลส่วนเกิน',
    ];

    const cleanedLines = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => {
        const lower = line.toLowerCase().trim();
        if (!lower || lower === '---' || lower === '***' || lower === '___') return false;
        if (lower.includes('<think>')) return false;
        if (filterPatterns.some((pattern) => lower.includes(pattern.toLowerCase()))) return false;
        if (/^[💡📌⭐❌🚨]+/u.test(lower)) return false;
        return true;
      });

    let title = '';
    let subtitle = '';
    let listItems: string[] = [];
    let tableRows: string[] = [];
    let codeLines: string[] = [];
    let inCodeBlock = false;
    const contentParts: string[] = [];

    const flushList = () => {
      if (!listItems.length) return;
      contentParts.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`);
      listItems = [];
    };

    const flushTable = () => {
      if (!tableRows.length) return;
      flushList();
      contentParts.push(convertTableToHtml(tableRows));
      tableRows = [];
    };

    const flushCode = () => {
      if (!codeLines.length) return;
      flushList();
      flushTable();
      contentParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      codeLines = [];
    };

    for (const rawLine of cleanedLines) {
      const line = rawLine.trim();

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCode();
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(rawLine);
        continue;
      }

      if (line.startsWith('|') && line.endsWith('|')) {
        tableRows.push(line);
        continue;
      }

      flushTable();

      if (line.startsWith('# ')) {
        flushList();
        const heading = line.slice(2).trim();
        if (!title) {
          title = heading;
        } else {
          contentParts.push(`<h2>${formatInline(heading)}</h2>`);
        }
        continue;
      }

      if (line.startsWith('## ')) {
        flushList();
        const heading = line.slice(3).trim();
        if (!subtitle && contentParts.length === 0) {
          subtitle = heading;
        } else {
          contentParts.push(`<h2>${formatInline(heading)}</h2>`);
        }
        continue;
      }

      if (line.startsWith('### ')) {
        flushList();
        contentParts.push(`<h3>${formatInline(line.slice(4).trim())}</h3>`);
        continue;
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        listItems.push(formatInline(line.slice(2).trim()));
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        listItems.push(formatInline(line.replace(/^\d+\.\s+/, '')));
        continue;
      }

      flushList();
      contentParts.push(`<p>${formatInline(line)}</p>`);
    }

    if (inCodeBlock) {
      flushCode();
    }
    flushTable();
    flushList();

    const finalTitle = title || l.titleFallback;
    const subtitleHtml = subtitle ? `<p class="result-subtitle">${formatInline(subtitle)}</p>` : '';
    const panelHtml = `
      <article class="result-article">
        <header class="result-hero">
          <p class="result-kicker">${escapeHtml(l.resultLabel)}</p>
          <h1>${formatInline(finalTitle)}</h1>
          ${subtitleHtml}
        </header>
        <section class="result-body">
          ${contentParts.join('')}
        </section>
      </article>
    `;

    const timestamp = new Date().toLocaleString(lang === 'th' ? 'th-TH' : 'en-US');
    const exportHtml = `
      <article class="export-article">
        <header class="export-header">
          <p class="export-kicker">${escapeHtml(l.title)}</p>
          <h1>${formatInline(finalTitle)}</h1>
          ${subtitle ? `<p class="export-subtitle">${formatInline(subtitle)}</p>` : ''}
          <div class="export-meta">
            <span>${escapeHtml(l.exportedFrom)}: ${escapeHtml(url)}</span>
            <span>${escapeHtml(l.exportedAt)}: ${escapeHtml(timestamp)}</span>
          </div>
        </header>
        <section class="export-body">
          ${contentParts.join('')}
        </section>
      </article>
    `;

    return {
      title: finalTitle,
      subtitle: subtitle || null,
      panelHtml,
      exportHtml,
    };
  };

  const buildExportElement = (html: string, mode: 'pdf' | 'png') => {
    const exportDiv = document.createElement('div');
    exportDiv.className = `export-surface export-surface-${mode}`;
    exportDiv.innerHTML = html;
    document.body.appendChild(exportDiv);
    return exportDiv;
  };

 const exportPDF = async () => {
    if (!resultRef.current || !result) return;
    try {
      const PAGE_W = 210;
      const PAGE_H = 297;
      const MARGIN = 15;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const parsed = parseResult(result);
      const exportDiv = buildExportElement(parsed.exportHtml, 'pdf');

      const canvas = await html2canvas(exportDiv, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(exportDiv);

      const imgW = PAGE_W;
      const pxPerMm = canvas.width / PAGE_W;
      const pageContentH = (PAGE_H - MARGIN * 2) * pxPerMm;
      const totalH = canvas.height;

      let offset = 0;
      let page = 0;
      while (offset < totalH) {
        const sliceH = Math.min(pageContentH, totalH - offset);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx?.drawImage(canvas, 0, -offset);
        const imgData = sliceCanvas.toDataURL('image/png');
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, MARGIN, imgW, sliceH / pxPerMm);
        offset += sliceH;
        page++;
      }

      pdf.save('smartdigest.pdf');
    } catch (err) {
      console.error(err);
    }
  };

  const exportPNG = async () => {
    if (!resultRef.current || !result) return;
    try {
      const parsed = parseResult(result);
      const exportDiv = buildExportElement(parsed.exportHtml, 'png');
      const canvas = await html2canvas(exportDiv, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(exportDiv);
      const a = document.createElement('a');
      a.download = 'smartdigest.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setFormattedResult('');
    try {
      const res = await fetch('/myai/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      const parsed = parseResult(data.result);
      setResult(data.result);
      setFormattedResult(parsed.panelHtml);
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectQuickPrompt = (v: string) => { setPrompt(v); };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative isolate overflow-hidden bg-black">
      <MeshGradientBackground className="pointer-events-none z-0" />
      <header className="sticky top-0 z-50 glass-header">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="navbar-brand liquid-glass-inner">
            <div className="navbar-logo">
              <FileText size={15} strokeWidth={2.4} />
            </div>
            <span className="navbar-title">{l.title}</span>
          </div>
          <button
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="navbar-language"
            aria-label="Switch language"
          >
            <Globe size={13} />
            <span className="tabular-nums">{lang === 'th' ? 'EN' : 'TH'}</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-widest mb-6 liquid-glass-inner" style={{ color: 'var(--color-muted)' }}>{l.tagline}</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 order-1 relative">
            <GlowingEffect blur={3} spread={50} glow movementDuration={1.5} disabled={false} />
            <form onSubmit={handleSubmit} className="relative z-10 space-y-4 liquid-glass rounded-3xl p-5">
              <div>
                <label className="block text-xs font-medium mb-1.5 liquid-glass-inner" style={{ color: 'var(--color-fg)' }}>
                  {l.urlLabel}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder={l.urlPlaceholder}
                  required
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-default glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 liquid-glass-inner" style={{ color: 'var(--color-fg)' }}>
                  {l.promptLabel}
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={l.promptPlaceholder}
                  rows={4}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none transition-default glass-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectQuickPrompt(qp.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-default ${qp.value === prompt ? 'glass-chip active' : 'glass-chip'}`}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || !url}
                className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-default glass-btn hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                {isLoading ? (
                  <><Loader2 size={15} className="animate-spin" /> <span>{l.analyzing}</span></>
                ) : (
                  <><Sparkles size={15} /> <span>{l.submitBtn}</span> <ChevronRight size={14} /></>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-3 order-2 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden min-h-[300px]">
              <GlowingEffect blur={3} spread={50} glow movementDuration={1.5} disabled={false} />

              {!result && !isLoading && (
                <div className="relative z-10 liquid-glass rounded-3xl p-10 sm:p-14 text-center accent-glow h-full flex items-center justify-center">
                  <div className="liquid-glass-inner">
                    <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center glass-chip">
                      <ExternalLink size={18} style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-fg)' }}>{l.emptyTitle}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{l.emptyDesc}</p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="relative z-10 liquid-glass rounded-3xl p-10 sm:p-14 text-center h-full flex items-center justify-center">
                  <div className="liquid-glass-inner">
                    <Loader2 size={28} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-accent)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>{l.analyzing}</p>
                  </div>
                </div>
              )}

              {result && !isLoading && (
                <div className="relative z-10 liquid-glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-md result-toolbar">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-fg)' }}>{l.resultLabel}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={exportPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 glass-chip transition-all hover:bg-white/10"
                      >
                        <FileDown size={12} /> PDF
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 glass-chip transition-all hover:bg-white/10"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={exportPNG}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 glass-chip transition-all hover:bg-white/10"
                      >
                        <Image size={12} /> PNG
                      </button>
                    </div>
                  </div>

                  <div
                    ref={resultRef}
                    className="result-content p-8 overflow-auto liquid-glass-inner"
                    style={{ maxHeight: '600px', fontSize: '1rem', lineHeight: '1.8', color: '#e4e4e7' }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: formattedResult || result }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;