'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessageItem } from '@/components/ChatMessageItem';
import { Sparkles, Send, Zap, Rocket, Globe, Film, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videoUrl?: string;
  productName?: string;
  statusMessage?: string;
  error?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
    };

    setInput('');
    setIsGenerating(true);

    // Append user message immediately
    setMessages(prev => [...prev, userMessage]);

    // Append initial assistant placeholder
    setMessages(prev => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        statusMessage: 'Analyzing message...',
      },
    ]);

    try {
      // Step-by-step progress indicator timer
      const progressSteps = [
        'Analyzing product page & security checks...',
        'Extracting page metadata & imagery...',
        'Generating creative UGC hook and script...',
        'Selecting visuals, reaction GIF & audio...',
        'Rendering vertical 1080x1920 video on AWS Lambda...',
      ];
      let stepIdx = 0;

      const progressInterval = setInterval(() => {
        if (stepIdx < progressSteps.length - 1) {
          stepIdx++;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId ? { ...m, statusMessage: progressSteps[stepIdx] } : m
            )
          );
        }
      }, 3500);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || data.error) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: '',
                  statusMessage: undefined,
                  error: data.error || 'Failed to process request.',
                }
              : m
          )
        );
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: data.replyText || '',
                  statusMessage: undefined,
                  videoUrl: data.result?.videoUrl,
                  productName: data.result?.product?.productName,
                }
              : m
          )
        );
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: '',
                statusMessage: undefined,
                error: 'Network request failed. Please try again.',
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePresetClick = (presetText: string) => {
    setInput(presetText);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-pink-500/30 selection:text-pink-200">
      
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-600 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-500/20">
            8x
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white tracking-tight">UGC Studio</h1>
              <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                AI Engine
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready to Create</span>
          </span>
        </div>
      </header>

      {/* Main Conversation Thread Area */}
      <main className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4 pb-24">
        <div className="flex-1 space-y-4">
          
          {/* Centered Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 my-auto animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-pink-400 mb-5 shadow-xl shadow-pink-500/5">
                <Film className="w-7 h-7" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                Turn any product into a UGC video
              </h2>

              <p className="text-sm text-zinc-400 max-w-lg mb-8 leading-relaxed">
                Paste any product URL. The AI will extract key features, write a scroll-stopping hook, select visuals and audio, and render a high-converting 9:16 social video.
              </p>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                <button
                  type="button"
                  onClick={() => handlePresetClick('Create a UGC video for https://linear.app')}
                  className="p-3.5 text-left bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition duration-150 flex flex-col justify-between gap-2 group shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-pink-400" />
                    <span className="font-semibold text-xs text-white group-hover:text-pink-300 transition">Linear App</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 truncate">https://linear.app</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetClick('Make a video for https://raycast.com')}
                  className="p-3.5 text-left bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition duration-150 flex flex-col justify-between gap-2 group shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-xs text-white group-hover:text-purple-300 transition">Raycast</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 truncate">https://raycast.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetClick('Create a UGC video for https://warp.dev')}
                  className="p-3.5 text-left bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition duration-150 flex flex-col justify-between gap-2 group shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-xs text-white group-hover:text-emerald-300 transition">Any Product URL</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 truncate">https://warp.dev</span>
                </button>
              </div>
            </div>
          )}

          {/* Message Thread */}
          {messages.map(msg => (
            <ChatMessageItem
              key={msg.id}
              role={msg.role}
              content={msg.content}
              videoUrl={msg.videoUrl}
              productName={msg.productName}
              statusMessage={msg.statusMessage}
              error={msg.error}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Composer Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 p-4 border-t border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-3xl w-full mx-auto relative flex items-center">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Paste a product URL or ask a question... (e.g. https://linear.app)"
            rows={1}
            className="w-full resize-none bg-zinc-900/90 text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500/80 focus:ring-1 focus:ring-pink-500/50 focus:outline-none rounded-2xl py-3.5 pl-4 pr-14 text-sm shadow-inner transition duration-200 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            aria-label="Send message"
            className="absolute right-2 p-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-800/80 text-white disabled:text-zinc-600 transition duration-150 shadow-md shadow-pink-600/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}
