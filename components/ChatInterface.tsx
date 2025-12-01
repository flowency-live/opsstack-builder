'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/models/types';

export interface ChatInterfaceProps {
  sessionId: string;
  onMessageSent: (message: string) => void;
  messages: Message[];
  isStreaming: boolean;
  onOpenSpec?: () => void;
}

export default function ChatInterface({
  sessionId,
  onMessageSent,
  messages,
  isStreaming,
  onOpenSpec,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      onMessageSent(inputValue.trim());
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMagicLink = async () => {
    // TODO: Implement magic link generation in future task
    alert('Magic link generation will be implemented in a future task');
  };

  const handleContactUs = () => {
    // TODO: Implement contact modal in future task
    alert('Contact form will be implemented in a future task');
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
            Flowency Build
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {onOpenSpec && (
            <button
              onClick={onOpenSpec}
              className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors rounded-[var(--radius-md)] hover:bg-[var(--color-surface-elevated)] flex items-center gap-2"
              title="View specification"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="hidden sm:inline">View Spec</span>
            </button>
          )}
          <button
            onClick={handleMagicLink}
            className="px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors rounded-[var(--radius-md)] hover:bg-[var(--color-surface-elevated)]"
            title="Continue on another device"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <button
            onClick={handleContactUs}
            className="px-3 py-1.5 text-sm bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] hover:bg-[var(--color-primary)] transition-colors rounded-[var(--radius-md)]"
          >
            Need Help?
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--color-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                Let's build your specification
              </h2>
              <p className="text-[var(--color-muted)]">
                Tell me about your software project idea, and I'll guide you through
                creating a comprehensive specification.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[var(--color-primary)] text-white'
                      : message.role === 'system'
                      ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20'
                      : 'bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)]'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  {message.metadata?.specUpdated && (
                    <div className="mt-2 pt-2 border-t border-current/20 text-xs opacity-75">
                      ✓ Specification updated
                    </div>
                  )}
                  <div className="mt-1 text-xs opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your project idea..."
                disabled={isStreaming}
                rows={1}
                className="w-full px-4 py-3 bg-[var(--color-input)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  minHeight: '48px',
                  maxHeight: '200px',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isStreaming}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Send</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)] text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
