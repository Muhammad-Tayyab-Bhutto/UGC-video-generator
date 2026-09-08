import React from 'react';
import { Sparkles, ExternalLink, AlertTriangle, Video, Loader2 } from 'lucide-react';

export interface ChatMessageItemProps {
  role: 'user' | 'assistant';
  content: string;
  videoUrl?: string;
  productName?: string;
  statusMessage?: string;
  error?: string;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  role,
  content,
  videoUrl,
  productName,
  statusMessage,
  error,
}) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full my-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
      <div className={`flex items-start gap-3 max-w-[90%] sm:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar Icon */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-sm ${
            isUser
              ? 'bg-zinc-700 text-zinc-200 border border-zinc-600'
              : 'bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-pink-500/20 shadow-md'
          }`}
        >
          {isUser ? 'You' : <Sparkles className="w-4 h-4 text-white" />}
        </div>

        {/* Message Bubble Surface */}
        <div
          className={`rounded-2xl px-4 py-3.5 shadow-sm text-sm ${
            isUser
              ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-tr-xs'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-xs'
          }`}
        >
          {!isUser && (
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-pink-400">
              <span>UGC Studio</span>
            </div>
          )}

          {/* Text Content */}
          {content && (
            <div className="leading-relaxed whitespace-pre-wrap text-zinc-100 font-normal">
              {content}
            </div>
          )}

          {/* Progress / Generation Steps */}
          {statusMessage && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
              <Loader2 className="w-4 h-4 text-pink-400 animate-spin shrink-0" />
              <span className="text-xs font-medium text-zinc-300">{statusMessage}</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-3 p-3 bg-red-950/40 border border-red-900/60 text-red-300 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Could not generate video</p>
                <p className="text-red-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Video Result Card */}
          {videoUrl && (
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col items-center">
              {productName && (
                <div className="w-full text-left mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Video className="w-3.5 h-3.5 text-pink-400" />
                    <span>Rendered UGC Video for <strong className="text-white">{productName}</strong></span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                    9:16 • 1080x1920
                  </span>
                </div>
              )}

              {/* 9:16 Vertical Video Container */}
              <div className="relative w-full max-w-[280px] aspect-[9/16] bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/80 group">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                  poster="/assets/sample_bg.jpg"
                />
              </div>

              {/* External Link Action */}
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-pink-400 hover:text-pink-300 transition hover:underline"
              >
                <span>Open MP4 in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
