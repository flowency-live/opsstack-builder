'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { SpecPreviewPanel } from '@/components/SpecPreviewPanel';
import { ExportModal } from '@/components/ExportModal';
import { Message, Specification } from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');

  const [sessionId, setSessionId] = useState<string>(sessionIdFromUrl || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [specification, setSpecification] = useState<Specification | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [recentlyUpdatedSections, setRecentlyUpdatedSections] = useState<string[]>([]);

  // Initialize or load session
  useEffect(() => {
    const initializeSession = async () => {
      if (sessionIdFromUrl) {
        // Load existing session
        try {
          const response = await fetch(`/api/sessions/${sessionIdFromUrl}`);
          if (response.ok) {
            const data = await response.json();
            setMessages(data.session.state.conversationHistory || []);
            setSpecification(data.session.state.specification || null);
            setSessionId(sessionIdFromUrl);
            return;
          }
        } catch (error) {
          console.error('Failed to load session:', error);
        }
      }

      // Create new session
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.session.id);

          // Add welcome message
          const welcomeMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: "Hello! I'm here to help you create a comprehensive specification for your software project. Let's start by understanding what you want to build.\n\nCould you tell me about your project idea? What kind of software or digital product are you looking to create?",
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };

    initializeSession();
  }, [sessionIdFromUrl]);

  const handleRequestSummary = () => {
    handleMessageSent(
      "Can you provide a summary of what we've covered so far in my specification, highlight any important topics we haven't discussed yet, and suggest next steps?"
    );
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handleShare = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/magic-link`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const link = data.sessionUrl;
        await navigator.clipboard.writeText(link);
        alert(`Link copied to clipboard!\n\nShare this link:\n${link}\n\nAnyone with this link can view and continue this specification.`);
      } else {
        alert('Failed to generate share link. Please try again.');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleMessageSent = async (content: string) => {
    if (!sessionId) return;

    // Add user message immediately
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      // Call the real API with streaming
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  assistantContent += data.chunk;

                  // Update the streaming message
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, content: assistantContent },
                      ];
                    } else {
                      return [
                        ...prev,
                        {
                          id: uuidv4(),
                          role: 'assistant',
                          content: assistantContent,
                          timestamp: new Date(),
                        },
                      ];
                    }
                  });
                }

                // Handle completion event with specification data
                if (data.type === 'complete' && data.data) {
                  console.log('[CLIENT] Spec update received:', {
                    specUpdated: data.data.specUpdated,
                    hasSpecification: !!data.data.specification,
                    version: data.data.specification?.version,
                    messageCount: messages.length + 1
                  });

                  if (data.data.specification) {
                    console.log('[CLIENT] Specification data:', {
                      overview: data.data.specification.plainEnglishSummary.overview.substring(0, 100) + '...',
                      featuresCount: data.data.specification.plainEnglishSummary.keyFeatures.length,
                      targetUsers: data.data.specification.plainEnglishSummary.targetUsers,
                      requirementsCount: data.data.specification.formalPRD.requirements.length
                    });

                    setSpecification(data.data.specification);
                    if (data.data.specUpdated) {
                      setRecentlyUpdatedSections(['overview', 'features']);
                      setTimeout(() => setRecentlyUpdatedSections([]), 3000);
                    }
                  }
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <ChatInterface
        sessionId={sessionId}
        onMessageSent={handleMessageSent}
        messages={messages}
        isStreaming={isStreaming}
        onOpenSpec={() => setIsPreviewOpen(true)}
        onRequestSummary={handleRequestSummary}
      />

      {specification && (
        <SpecPreviewPanel
          sessionId={sessionId}
          specification={specification}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isOpen={isPreviewOpen}
          onToggle={() => setIsPreviewOpen(!isPreviewOpen)}
          onExport={handleExport}
          onShare={handleShare}
          recentlyUpdatedSections={recentlyUpdatedSections}
        />
      )}

      {specification && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          sessionId={sessionId}
          specification={specification}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
