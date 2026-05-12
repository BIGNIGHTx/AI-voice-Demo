'use client';

import Sidebar from '@/components/Sidebar';
import { 
  SendHorizonal, 
  Bot, 
  User, 
  ArrowLeft,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CHATBOT_SUGGESTED_PROMPTS, getChatbotReply } from '@/lib/chatbot';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const normalizeForDedup = (line: string): string => {
  const trimmed = line.trim().toLowerCase();
  return trimmed
    .replace(/^((📌|📝)\s*)+/u, '')
    .replace(/^💡\s*key insights:\s*/i, '')
    .replace(/^💬\s*หัวข้อที่สนทนา:\s*/i, '')
    .replace(/^💬\s*อารมณ์โดยรวม:\s*/i, '')
    .replace(/^📊\s*คะแนน:\s*/i, '')
    .replace(/^🛡️\s*ข้อมูลประกัน:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatBotMessage = (text: string): string[] => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const formatted: string[] = [];
  const seen = new Set<string>();
  let itemSection = '';

  for (const line of lines) {
    if (/^(?:รายการที่|สายที่)\s*\d+/u.test(line)) {
      itemSection = line;
    }

    if (line.startsWith('📝') && line.includes('|')) {
      const chunks = line
        .split('|')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      for (const chunk of chunks) {
        const normalizedChunk = normalizeForDedup(chunk);
        const key = itemSection ? `${itemSection}:${normalizedChunk}` : normalizedChunk;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        formatted.push(chunk);
      }
      continue;
    }

    const normalizedLine = normalizeForDedup(line);
    const key = itemSection ? `${itemSection}:${normalizedLine}` : normalizedLine;
    if (!key || seen.has(key)) continue;

    seen.add(key);
    formatted.push(line);
  }

  return formatted;
};

const parseSentimentLine = (line: string): { label: string; value: string } | null => {
  const match = line.match(/^💬\s*(Sentiment|อารมณ์โดยรวม):\s*(.+)$/iu);
  if (!match?.[2]) return null;

  return {
    label: `💬 ${match[1]}:`,
    value: match[2].trim(),
  };
};

const getSentimentBadgeClass = (value: string): string => {
  const normalized = value.toLowerCase();
  if (normalized.includes('negative') || normalized.includes('เชิงลบ') || normalized.includes('ลบ')) {
    return 'bg-red-100 text-red-700 ring-red-200 shadow-red-100';
  }
  if (normalized.includes('positive') || normalized.includes('เชิงบวก') || normalized.includes('บวก')) {
    return 'bg-emerald-100 text-emerald-700 ring-emerald-200 shadow-emerald-100';
  }
  return 'bg-slate-100 text-slate-700 ring-slate-200 shadow-slate-100';
};

export default function WarrantyChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'สวัสดีครับ ผมช่วยตรวจข้อมูลประกันจาก backend ก่อน และใช้ RAG/Qdrant สำหรับคำถามปลายเปิด ลองถามด้วยเบอร์โทร เลขทะเบียนประกัน หรือ Serial ได้เลย' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const botResponse = await getChatbotReply(
        userMsg,
        messages.map((message) => message.text).join('\n')
      );
      
      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: 'ขออภัย ไม่สามารถตอบคำถามนี้ได้ในขณะนี้' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (loading) return;
    setInput(prompt);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/warranty" className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Bot className="text-blue-600" size={24} />
                AI Warranty Assistant
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">RAG-Powered Chat System</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase">Ready</span>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] p-4 space-y-4 [background-size:24px_24px] sm:p-6 sm:space-y-5 lg:p-8 lg:space-y-6"
        >
            <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
                  m.role === 'bot' 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' 
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  {m.role === 'bot' ? <Bot size={20} /> : <User size={20} />}
                </div>
                
                <div className="group max-w-[85%] sm:max-w-[70%]">
                  <div className={`px-6 py-4 rounded-3xl shadow-sm leading-relaxed text-sm ${
                    m.role === 'bot'
                      ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                      : 'bg-blue-600 text-white rounded-tr-none'
                  }`}>
                    {m.role === 'bot' ? (
                      <div className="space-y-2">
                        {formatBotMessage(m.text).map((line, lineIndex) => {
                          const isSectionTitle = line.endsWith(':');
                          const sentiment = parseSentimentLine(line);
                          return (
                            <p
                              key={`${i}-${lineIndex}`}
                              className={sentiment
                                ? 'flex flex-wrap items-center gap-1.5 text-slate-700'
                                : (isSectionTitle ? 'pt-1 font-semibold text-slate-800' : 'text-slate-700')}
                            >
                              {sentiment ? (
                                <>
                                  <span>{sentiment.label}</span>
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ring-1 ${getSentimentBadgeClass(sentiment.value)}`}>
                                    {sentiment.value}
                                  </span>
                                </>
                              ) : line}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                  <div className={`mt-1.5 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity ${
                    m.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {m.role.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex items-start gap-4 animate-in fade-in duration-300">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl rounded-tl-none shadow-sm h-12 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-4 shadow-[0_-1px_10px_rgba(0,0,0,0.02)] sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto relative group">
            <div className="mb-3 flex flex-wrap gap-2">
              {CHATBOT_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggestedPrompt(prompt)}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold leading-tight text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              placeholder="ถามด้วยเบอร์โทร เลขทะเบียนประกัน Serial หรือ Topic..."
              className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50 px-6 py-4 pr-16 font-medium outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 sm:px-8 sm:py-5 sm:pr-20"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={`absolute bottom-2 right-2 top-2 flex items-center justify-center rounded-2xl px-4 transition-all sm:bottom-3 sm:right-3 sm:top-3 sm:px-6 ${
                input.trim() && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <SendHorizonal size={20} />
            </button>
          </div>
          <p className="max-w-4xl mx-auto mt-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[2px]">
            AI CAN SEARCH ACROSS ENTIRE WARRANTY REPOSITORY INSTANTLY
          </p>
        </div>
      </main>
    </div>
  );
}
