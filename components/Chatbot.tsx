'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { getChatbotReply } from '@/lib/chatbot';

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

  for (const line of lines) {
    if (line.startsWith('📝') && line.includes('|')) {
      const chunks = line
        .split('|')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      for (const chunk of chunks) {
        const key = normalizeForDedup(chunk);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        formatted.push(chunk);
      }
      continue;
    }

    const key = normalizeForDedup(line);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    formatted.push(line);
  }

  return formatted;
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: 'สวัสดีครับ ถามข้อมูลประกัน ข้อมูลลูกค้า หรือถามตามหัวข้อจาก Topic Distribution ได้เลย เช่น "ลูกค้าคนไหนขอคืนเงิน"'
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
      const aiResponseText = await getChatbotReply(userText);

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

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-10 right-10 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-transform duration-300 z-[9999]"
          style={{ animation: 'float 3s ease-in-out infinite' }}
        >
          <MessageCircle size={32} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-10 right-10 w-[360px] max-w-[calc(100vw-40px)] h-[560px] max-h-[calc(100vh-40px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[9999] border border-slate-100 font-sans animation-slide-up">
          {/* Header */}
          <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <Bot size={20} />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">AI Support</h3>
                <p className="text-emerald-500 text-[11px] font-medium leading-none mt-1">Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-600/20'
                    : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                  }`}>
                  {msg.role === 'ai' ? (
                    <div className="space-y-1.5">
                      {formatAiMessage(msg.text).map((line, index) => (
                        <p key={`${msg.id}-${index}`} className="leading-relaxed text-slate-700">{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100 text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message.."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
            <div className="text-center mt-3">
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
