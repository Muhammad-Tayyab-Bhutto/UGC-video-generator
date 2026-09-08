'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessageItem } from '@/components/ChatMessageItem';

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
  };

  return (
    <main className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            8x
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">UGC Studio</h1>
            <p className="text-xs text-zinc-400">AI Product Video Generator</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            AWS Lambda Ready
          </span>
        </div>
      </header>

      {/* Main Conversation Thread Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 max-w-3xl w-full mx-auto space-y-4">
        {/* Empty State / Welcome Screen */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl mb-4 shadow-xl">
              🎬
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Turn any product into a UGC video</h2>
            <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
              Send me a product landing page URL and I’ll extract product features, write a hook & copy, pick visuals & audio, and render a high-converting video on AWS Lambda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={() => handlePresetClick('Create a UGC video for https://linear.app')}
                className="p-3 text-left bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-xs text-zinc-300 flex flex-col space-y-1 group"
              >
                <span className="font-semibold text-white group-hover:text-pink-400">⚡ Linear App</span>
                <span className="text-zinc-500">Create a UGC video for https://linear.app</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('Make a video for https://raycast.com')}
                className="p-3 text-left bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-xs text-zinc-300 flex flex-col space-y-1 group"
              >
                <span className="font-semibold text-white group-hover:text-pink-400">🚀 Raycast</span>
                <span className="text-zinc-500">Make a video for https://raycast.com</span>
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

      {/* Input Composer */}
      <footer className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-3xl w-full mx-auto relative flex items-center">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Paste a product URL or ask a question... (e.g. https://linear.app)"
            rows={1}
            className="w-full resize-none bg-zinc-900 text-white placeholder-zinc-500 border border-zinc-700/80 focus:border-pink-500 focus:outline-none rounded-2xl py-3.5 pl-4 pr-14 text-sm shadow-inner transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            aria-label="Send message"
            className="absolute right-2 p-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-800 text-white disabled:text-zinc-600 transition shadow-md"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </footer>
    </main>
  );
}
