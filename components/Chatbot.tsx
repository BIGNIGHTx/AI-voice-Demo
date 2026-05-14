'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Barcode,
  Bot,
  Calendar,
  CalendarCheck,
  CircleCheck,
  FileText,
  KeyRound,
  Lightbulb,
  Loader2,
  MessageCircle,
  PhoneCall,
  Pin,
  Puzzle,
  Search,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  SquareCheck,
  Tag,
  Target,
  TriangleAlert,
  Truck,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { CHATBOT_SUGGESTED_PROMPTS, getChatbotReply } from '@/lib/chatbot';

interface Message {
  id: string;
  role: 'ai' | 'user';
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

const formatAiMessage = (text: string): string[] => {
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
    label: `${match[1]}:`,
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

const warrantyFieldIcons: Array<{ pattern: RegExp; strip: RegExp; Icon: LucideIcon }> = [
  { pattern: /^🛡️?\s*ข้อมูลประกัน:/u, strip: /^🛡️?\s*/u, Icon: Shield },
  { pattern: /^📞\s*ประเภทสาย:/u, strip: /^📞\s*/u, Icon: PhoneCall },
  { pattern: /^📞\s*เบอร์โทร:/u, strip: /^📞\s*/u, Icon: PhoneCall },
  { pattern: /^👤\s*ลูกค้า:/u, strip: /^👤\s*/u, Icon: UserCheck },
  { pattern: /^🏷️?\s*แบรนด์:/u, strip: /^🏷️?\s*/u, Icon: Tag },
  { pattern: /^✨\s*Summary Insight:/iu, strip: /^✨\s*/u, Icon: Sparkles },
  { pattern: /^🎯\s*Topic\/Intent:/iu, strip: /^🎯\s*/u, Icon: Target },
  { pattern: /^📌\s*สาเหตุการติดต่อ:/u, strip: /^📌\s*/u, Icon: Pin },
  { pattern: /^🔑\s*Keywords:/iu, strip: /^🔑\s*/u, Icon: KeyRound },
  { pattern: /^⚠️?\s*Anomaly Detection:/iu, strip: /^⚠️?\s*/u, Icon: TriangleAlert },
  { pattern: /^🧾\s*เหตุผลความเสี่ยง:/u, strip: /^🧾\s*/u, Icon: FileText },
  { pattern: /^💡\s*อินไซต์ลูกค้า:/u, strip: /^💡\s*/u, Icon: Lightbulb },
  { pattern: /^🙋\s*ลูกค้าต้องการอะไร:/u, strip: /^🙋\s*/u, Icon: UserCheck },
  { pattern: /^🧩\s*ปัญหาหลัก:/u, strip: /^🧩\s*/u, Icon: Puzzle },
  { pattern: /^🔎\s*สาเหตุที่น่าจะเกิด:/u, strip: /^🔎\s*/u, Icon: Search },
  { pattern: /^✅\s*สิ่งที่ลูกค้าคาดหวัง:/u, strip: /^✅\s*/u, Icon: SquareCheck },
  { pattern: /^🛠️?\s*สิ่งที่ควรทำต่อ:/u, strip: /^🛠️?\s*/u, Icon: SquareCheck },
  { pattern: /^🚦\s*ระดับความเสี่ยง/u, strip: /^🚦\s*/u, Icon: TriangleAlert },
  { pattern: /^🧾\s*เลขทะเบียนประกัน:/u, strip: /^🧾\s*/u, Icon: Barcode },
  { pattern: /^📦\s*สินค้า:/u, strip: /^📦\s*/u, Icon: FileText },
  { pattern: /^🔢\s*Serial No\.:/iu, strip: /^🔢\s*/u, Icon: Barcode },
  { pattern: /^🧮\s*เลขคำสั่งซื้อ:/u, strip: /^🧮\s*/u, Icon: FileText },
  { pattern: /^✅\s*ผลการตรวจสอบ:/u, strip: /^✅\s*/u, Icon: CircleCheck },
  { pattern: /^🟢\s*สถานะ:/u, strip: /^🟢\s*/u, Icon: CircleCheck },
  { pattern: /^📅\s*วันที่ซื้อ:/u, strip: /^📅\s*/u, Icon: Calendar },
  { pattern: /^🚚\s*วันที่ส่ง:/u, strip: /^🚚\s*/u, Icon: Truck },
  { pattern: /^⏳\s*ระยะประกัน:/u, strip: /^⏳\s*/u, Icon: Shield },
  { pattern: /^📆\s*วันที่หมดประกัน:/u, strip: /^📆\s*/u, Icon: CalendarCheck },
  { pattern: /^🛒\s*ช่องทางขาย:/u, strip: /^🛒\s*/u, Icon: ShoppingBag },
];

const renderLineWithBoldLabel = (line: string) => {
  const iconRule = warrantyFieldIcons.find((rule) => rule.pattern.test(line));
  const displayLine = iconRule ? line.replace(iconRule.strip, '') : line;
  const match = displayLine.match(/^([^:：]{1,48}:)(\s*)(.+)$/u);
  const content = match ? (
    <>
      <span className="font-bold text-slate-800">{match[1]}</span>
      {match[2]}
      {match[3]}
    </>
  ) : displayLine;

  if (iconRule) {
    const Icon = iconRule.Icon;
    return (
      <span className="inline-flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.2} />
        <span>{content}</span>
      </span>
    );
  }

  if (!match) return line;

  return content;
};

export default function Chatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: 'สวัสดีครับ ค้นประกันด้วยเบอร์โทร เลขทะเบียนประกัน หรือ Serial ได้เลย ถ้าข้อมูลยังไม่เข้า Qdrant ผมจะตรวจจาก backend ก่อน'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    // Add user message
    const newMessage: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const aiResponseText = await getChatbotReply(
        userText,
        messages.map((message) => message.text).join('\n')
      );

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: aiResponseText }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: 'ขออภัย ไม่สามารถตอบคำถามนี้ได้ในขณะนี้'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading) return;
    setInput(prompt);
  };
  const isFilesPage = pathname === '/files';

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Warranty Assistant"
          suppressHydrationWarning
          className={`fixed right-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 transition-transform duration-300 hover:scale-105 hover:bg-blue-700 sm:right-6 sm:h-16 sm:w-16 lg:right-8 ${isFilesPage ? 'bottom-24 sm:bottom-28 lg:bottom-32' : 'bottom-5 sm:bottom-6 lg:bottom-8'}`}
          style={{ animation: 'float 3s ease-in-out infinite' }}
        >
          <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="animation-slide-up fixed bottom-3 right-3 z-[9999] flex h-[min(500px,calc(100vh-24px))] w-[min(320px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white font-sans shadow-2xl sm:bottom-5 sm:right-5 sm:h-[540px] sm:w-[340px] lg:bottom-8 lg:right-8 lg:w-[350px]">
          {/* Header */}
          <div className="z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:h-9 sm:w-9">
                  <Bot className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Warranty Assistant</h3>
                <p className="text-emerald-500 text-[11px] font-medium leading-none mt-1">Backend + RAG Ready</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Warranty Assistant"
              suppressHydrationWarning
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4 scroll-smooth sm:space-y-4 sm:p-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-600/20'
                    : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                  }`}>
                  {msg.role === 'ai' ? (
                    <div className="space-y-1.5">
                      {formatAiMessage(msg.text).map((line, index) => {
                        const sentiment = parseSentimentLine(line);
                        const isWarrantyItemHeader = /^รายการที่\s*\d+:/u.test(line);
                        const isCallItemHeader = /^สายที่\s*\d+:/u.test(line);
                        const itemHeaderIcon = isCallItemHeader ? PhoneCall : FileText;
                        const ItemHeaderIcon = itemHeaderIcon;
                        if (isWarrantyItemHeader || isCallItemHeader) {
                          return (
                            <p key={`${msg.id}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-bold text-slate-800 shadow-sm">
                              <ItemHeaderIcon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.2} />
                              <span>{line}</span>
                            </p>
                          );
                        }

                        return sentiment ? (
                          <p key={`${msg.id}-${index}`} className="flex flex-wrap items-center gap-1.5 leading-relaxed text-slate-700">
                            <MessageCircle className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.2} />
                            <span className="font-bold text-slate-800">{sentiment.label}</span>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ring-1 ${getSentimentBadgeClass(sentiment.value)}`}>
                              {sentiment.value}
                            </span>
                          </p>
                        ) : (
                          <p key={`${msg.id}-${index}`} className="leading-relaxed text-slate-700">{renderLineWithBoldLabel(line)}</p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-3.5 py-2.5 text-slate-500 shadow-sm sm:px-4 sm:py-3">
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 bg-white p-3.5 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CHATBOT_SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggestedPrompt(prompt)}
                  disabled={isLoading}
                  suppressHydrationWarning
                  className="max-w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-semibold leading-tight text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                suppressHydrationWarning
                placeholder="ถามด้วยเบอร์ / ทะเบียน / Serial..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-11 text-[13px] text-slate-700 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:py-3 sm:pr-12 sm:text-sm"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                suppressHydrationWarning
                className="absolute right-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="ml-0.5 h-4 w-4" />
              </button>
            </div>
            <div className="mt-2.5 text-center sm:mt-3">
              <span className="text-[10px] text-slate-400 font-medium">Powered by Asyntai</span>
            </div>
          </div>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
            .animation-slide-up {
              animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes slideUp {
              0% { opacity: 0; transform: translateY(20px) scale(0.95); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
