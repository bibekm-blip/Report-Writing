import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import { 
  FileText, 
  Send, 
  Printer, 
  RefreshCw, 
  BookOpen, 
  User, 
  Hash, 
  GraduationCap, 
  Calendar,
  Layers,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateReport, generateReportImage, type ReportMetadata } from './services/gemini';
import { cn } from './lib/utils';

// --- Styled Components ---

const InputField = ({ 
  label, 
  icon: Icon, 
  ...props 
}: { 
  label: string; 
  icon: any; 
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="flex flex-col gap-2" id={`field-${props.name}`}>
    <label className="text-[11px] uppercase tracking-[0.1em] text-text-dim flex items-center gap-2">
      <Icon size={12} className="text-accent" />
      {label}
    </label>
    <input 
      {...props}
      className="bg-[#262B35] border border-[#3F444E] rounded focus:border-accent p-2.5 text-[13px] text-white outline-none transition-all placeholder:text-slate-600"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'form' | 'loading' | 'report'>('form');
  const [metadata, setMetadata] = useState<ReportMetadata>({
    studentName: '',
    rollNumber: '',
    courseName: '',
    subject: '',
    topicName: '',
    submissionDate: new Date().toISOString().split('T')[0]
  });
  const [reportParts, setReportParts] = useState<{ type: 'content' | 'image'; value: string; caption?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadata.topicName || !metadata.studentName) return;

    setStep('loading');
    setError(null);
    setReportParts([]);

    try {
      const content = await generateReport(metadata);
      if (!content) throw new Error("No content generated");

      // Parse the content for image markers
      const parts: { type: 'content' | 'image'; value: string; caption?: string }[] = [];
      
      const imageRegex = /\[IMAGE_AREA_(\d+):\s*(.*?)\]\s*\[CAPTION_\d+:\s*(.*?)\]/gs;
      let lastIndex = 0;
      let match;

      while ((match = imageRegex.exec(content)) !== null) {
        // Text before the image
        if (match.index > lastIndex) {
          parts.push({ type: 'content', value: content.substring(lastIndex, match.index) });
        }
        
        // The image slot
        parts.push({ 
          type: 'image', 
          value: match[2], // The prompt
          caption: match[3] // The caption
        });
        
        lastIndex = imageRegex.lastIndex;
      }

      // Remaining text
      if (lastIndex < content.length) {
        parts.push({ type: 'content', value: content.substring(lastIndex) });
      }

      // Generate images for the slots
      const processedParts = await Promise.all(parts.map(async (part) => {
        if (part.type === 'image') {
          const imgData = await generateReportImage(part.value);
          return { ...part, value: imgData || '' };
        }
        return part;
      }));

      setReportParts(processedParts);
      setStep('report');
    } catch (err) {
      console.error(err);
      setError("Failed to generate report. Please try again.");
      setStep('form');
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    
    setIsDownloading(true);
    try {
      const element = reportRef.current;
      
      // Options for PDF generation
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Academic_Report_${metadata.studentName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          onclone: (clonedDoc) => {
            // Remove oklch colors that html2canvas can't parse
            const elements = clonedDoc.getElementsByTagName('*');
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLElement;
              const style = window.getComputedStyle(el);
              if (style.color && style.color.includes('oklch')) el.style.color = '#000000';
              if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
                 el.style.backgroundColor = 'transparent';
              }
              if (style.borderColor && style.borderColor.includes('oklch')) el.style.borderColor = '#e2e8f0';
            }
          }
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Download failed:", err);
      // Fallback to print if library fails
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setStep('form');
    setReportParts([]);
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white selection:bg-accent/20">
      <div className="flex flex-col md:flex-row min-h-screen relative overflow-hidden">
        
        {/* Sidebar-style Header Area (Form Step) */}
        <div className={cn(
          "w-full md:w-[400px] bg-sidebar-bg border-r border-[#2D3139] p-8 flex flex-col gap-8 transition-all duration-500 z-20 print:hidden",
          step === 'report' ? "hidden md:flex" : "flex"
        )}>
          <div className="mb-4">
            <div className="text-2xl font-serif italic text-accent tracking-tighter mb-1">Academic.AI</div>
            <p className="text-[11px] text-text-dim uppercase tracking-wider">Advanced Report Engine</p>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-6">
            <InputField 
              label="Student Name" 
              icon={User} 
              name="studentName"
              value={metadata.studentName}
              onChange={handleInputChange}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField 
                label="Roll Number" 
                icon={Hash} 
                name="rollNumber"
                value={metadata.rollNumber}
                onChange={handleInputChange}
                required
              />
              <InputField 
                label="Date" 
                icon={Calendar} 
                name="submissionDate"
                type="date"
                value={metadata.submissionDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField 
                label="Course" 
                icon={GraduationCap} 
                name="courseName"
                value={metadata.courseName}
                onChange={handleInputChange}
                placeholder="e.g. B.Tech"
              />
              <InputField 
                label="Subject" 
                icon={BookOpen} 
                name="subject"
                value={metadata.subject}
                onChange={handleInputChange}
                placeholder="e.g. Physics"
              />
            </div>
            <InputField 
              label="Assessment Topic" 
              icon={Layers} 
              name="topicName"
              value={metadata.topicName}
              onChange={handleInputChange}
              placeholder="Enter topic..."
              required
            />

            {error && (
              <p className="text-red-400 text-[11px] font-medium uppercase tracking-wider">{error}</p>
            )}

            <button
              type="submit"
              disabled={step === 'loading'}
              className="bg-accent text-[#1A1D23] border-none p-3.5 rounded font-bold uppercase text-[12px] tracking-[0.1em] cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
            >
              {step === 'loading' ? 'Generating Report...' : 'Generate 1000-Word Report'}
            </button>
          </form>

          <div className="mt-auto space-y-2 pt-8">
            <div className="text-[11px] text-text-dim flex items-center justify-between">
              <span>AI Engine</span>
              <span className="text-white">Gen AI Academic v2.5</span>
            </div>
            <div className="text-[11px] text-text-dim flex items-center justify-between">
              <span>Status</span>
              <span className="text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                Ready
              </span>
            </div>
          </div>
        </div>

        {/* Preview Container Area */}
        <div className="flex-grow p-4 md:p-12 flex justify-center items-start bg-[radial-gradient(circle_at_center,_#1E2229_0%,_#0F1115_100%)] overflow-auto z-10 print:bg-white print:p-0 print:block">
          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.div 
                key="welcome" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="hidden md:flex flex-col items-center justify-center text-center mt-20 text-text-dim"
              >
                <div className="p-8 border border-dashed border-white/10 rounded-full mb-6">
                  <BookOpen size={48} className="opacity-20" />
                </div>
                <h2 className="text-xl font-serif italic text-white mb-2">Ready to compile</h2>
                <p className="max-w-xs text-sm">Fill in the details in the sidebar to generate a comprehensive academic report.</p>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center mt-20 text-center"
              >
                <Loader2 size={48} className="text-accent animate-spin mb-6" />
                <h2 className="text-xl font-serif italic text-white mb-2">Constructing Report</h2>
                <p className="text-text-dim text-sm">Synthesizing deep research data...</p>
              </motion.div>
            )}

            {step === 'report' && (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-8 w-full max-w-3xl print:w-full print:block"
              >
                {/* Mobile Reset */}
                <div className="flex justify-between w-full md:hidden mb-4">
                   <button onClick={handleReset} className="text-accent text-sm uppercase tracking-wider font-bold">← Edit Details</button>
                   <button onClick={handlePrint} className="text-white text-sm uppercase tracking-wider font-bold">Download Report</button>
                </div>

                <div 
                  ref={reportRef}
                  className="w-full max-w-[640px] bg-white text-black p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.5)] font-serif relative print:shadow-none print:p-0 print:w-full report-safe-bg" 
                  id="report-paper"
                  style={{ backgroundColor: '#ffffff', color: '#000000' }}
                >
                  
                  <div className="text-center border-b-2 border-[#E2E8F0] pb-6 mb-8 mt-4">
                    <h1 className="text-xl font-bold uppercase tracking-widest text-[#000000] font-sans" style={{ color: '#000000' }}>
                      Class Assessment Report
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-[12px] mb-10 border-b border-[#F1F5F9] pb-6 font-sans">
                    <div className="flex items-baseline gap-2">
                       <strong className="text-[#64748B] uppercase tracking-tighter">Student:</strong>
                       <span className="flex-1 border-b border-dotted border-[#cbd5e1] pb-0.5 text-black" style={{ color: '#000000' }}>{metadata.studentName}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <strong className="text-[#64748B] uppercase tracking-tighter">Roll No:</strong>
                       <span className="flex-1 border-b border-dotted border-[#cbd5e1] pb-0.5 text-black" style={{ color: '#000000' }}>{metadata.rollNumber}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <strong className="text-[#64748B] uppercase tracking-tighter">Course:</strong>
                       <span className="flex-1 border-b border-dotted border-[#cbd5e1] pb-0.5 text-black" style={{ color: '#000000' }}>{metadata.courseName || 'N/A'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <strong className="text-[#64748B] uppercase tracking-tighter">Subject:</strong>
                       <span className="flex-1 border-b border-dotted border-[#cbd5e1] pb-0.5 text-black" style={{ color: '#000000' }}>{metadata.subject || 'N/A'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <strong className="text-[#64748B] uppercase tracking-tighter">Date:</strong>
                       <span className="flex-1 border-b border-dotted border-[#cbd5e1] pb-0.5 text-black" style={{ color: '#000000' }}>{metadata.submissionDate}</span>
                    </div>
                    <div className="col-span-2 flex items-baseline gap-2 mt-2">
                       <strong className="text-[#64748B] uppercase tracking-tighter">Topic:</strong>
                       <span className="flex-1 border-b border-dotted border-[#cbd5e1] pb-0.5 text-black font-bold" style={{ color: '#000000' }}>{metadata.topicName}</span>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none text-black text-justify leading-[1.6] font-serif 
                    prose-headings:text-black prose-headings:font-bold prose-headings:flex prose-headings:items-center prose-headings:gap-2 prose-headings:mt-8 prose-headings:mb-4
                    report-content"
                    style={{ color: '#000000' }}
                  >
                    {reportParts.map((part, idx) => {
                      if (part.type === 'content') {
                        return <ReactMarkdown key={idx}>{part.value}</ReactMarkdown>;
                      } else if (part.type === 'image' && part.value) {
                        return (
                          <figure key={idx} className="my-10 break-inside-avoid">
                            <div className="w-full h-72 border border-slate-200 overflow-hidden rounded bg-white relative group">
                                <img 
                                  src={part.value} 
                                  alt={part.caption} 
                                  className="w-full h-full object-contain transition-transform duration-700 font-sans" 
                                  crossOrigin="anonymous"
                                />
                            </div>
                            <figcaption className="mt-3 text-center text-[10px] uppercase tracking-widest text-[#94A3B8] font-sans font-medium">
                              Fig {idx + 1}: {part.caption}
                            </figcaption>
                          </figure>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <div className="text-center mt-20 pt-8 border-t border-slate-100">
                    <span className="text-[11px] text-[#94A3B8] font-sans">Page <span className="counter-page"></span></span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 print:hidden pb-12 w-full max-w-[640px]">
                  <button onClick={handleReset} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A1D23] text-white border border-[#2D3139] rounded text-xs uppercase tracking-widest font-bold hover:bg-[#262B35] transition-all">
                    Reset
                  </button>
                  <button 
                    onClick={handleDownload} 
                    disabled={isDownloading}
                    className="flex-1 flex items-center justify-center gap-2 px-8 py-2.5 bg-accent text-[#1A1D23] rounded text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Printer size={16} />
                        Download PDF
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 text-white border border-white/10 rounded text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all"
                  >
                    Open in New Tab
                  </button>
                </div>
                
                <p className="text-[10px] text-text-dim/60 text-center uppercase tracking-[0.15em] max-w-sm mt-[-1rem] print:hidden">
                  If the download is blocked by your browser, please use the <strong className="text-accent underline cursor-pointer" onClick={() => window.open(window.location.href, '_blank')}>Open in New Tab</strong> button above to download directly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { 
            background: white !important; 
            color: black !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden { display: none !important; }
          #report-paper { 
            box-shadow: none !important; 
            width: 100% !important; 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          
          footer { display: none !important; }
          
          @page {
            margin: 2cm;
          }

          /* Ensure images don't break across pages */
          figure {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          h1, h2, h3 {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
        }
        
        #report-paper h1, #report-paper h2, #report-paper h3, #report-paper p, #report-paper span, #report-paper strong, #report-paper figcaption {
           color: #000000 !important;
        }

        .report-content h1, .report-content h2 {
           break-after: avoid;
           border-bottom: 2px solid #3b82f6 !important; 
           width: 100%;
           padding-bottom: 0.5rem;
           color: #000000 !important;
        }

        #report-paper * {
          color-scheme: light !important;
        }

        .report-content figure {
           break-inside: avoid;
        }

        #report-paper::after {
          display: block;
          content: "DOCUMENT END";
          text-align: center;
          font-size: 10px;
          color: #94A3B8;
          margin-top: 50px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-family: sans-serif;
          border-top: 1px solid #E2E8F0;
          padding-top: 20px;
        }

        .report-content h1::before, .report-content h2::before, .report-content h3::before {
          content: 'SECTION';
          font-size: 0.6em;
          opacity: 0.5;
          letter-spacing: 0.1em;
          font-family: sans-serif;
          margin-right: 0.5rem;
        }
      `}} />
    </div>
  );
}
