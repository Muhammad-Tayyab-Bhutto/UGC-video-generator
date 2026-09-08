import React from 'react';

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
    <div className={`flex w-full my-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-none'
        }`}
      >
        {!isUser && (
          <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-zinc-700/60">
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">
              UGC Studio Agent
            </span>
          </div>
        )}

        {/* Text Content */}
        {content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>}

        {/* Status Message / Loading State */}
        {statusMessage && (
          <div className="flex items-center space-x-3 mt-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-700/50">
            <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-zinc-300">{statusMessage}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-3 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Video Player Output */}
        {videoUrl && (
          <div className="mt-4 pt-3 border-t border-zinc-700/60 flex flex-col items-center">
            {productName && (
              <div className="w-full text-left mb-2">
                <span className="text-xs font-medium text-zinc-400">Rendered Video for </span>
                <span className="text-xs font-bold text-white">{productName}</span>
              </div>
            )}
            
            <div className="relative w-full max-w-[280px] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-700">
              <video
                src={videoUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
                poster="/assets/sample_bg.jpg"
              />
            </div>

            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center text-xs font-medium text-pink-400 hover:text-pink-300 underline"
            >
              Open Video in New Tab ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
