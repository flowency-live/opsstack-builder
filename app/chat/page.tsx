'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { SpecPreviewPanel } from '@/components/SpecPreviewPanel';
import { ExportModal } from '@/components/ExportModal';
import { ShareModal } from '@/components/ShareModal';
import { Message, Specification } from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');

  const [sessionId, setSessionId] = useState<string>(sessionIdFromUrl || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [specification, setSpecification] = useState<Specification | null>(null);
  const [completeness, setCompleteness] = useState<{
    missingSections: string[];
    readyForHandoff: boolean;
    lastEvaluated: Date;
  } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
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
            content: "OpsStack Builder can help you refine your ideas and problems into product specifications that we can then work with you to implement and deliver! Chat with me about your ideas, challenges, bottlenecks or just paste anything you have already and we'll work together to refine it to something we can build!",
            timestamp: new Date().toISOString(),
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
        setShareUrl(link);
        setIsShareModalOpen(true);
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
      timestamp: new Date().toISOString(),
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
                          timestamp: new Date().toISOString(),
                        },
                      ];
                    }
                  });
                }

                // Handle completion event with specification data
                if (data.type === 'complete' && data.data) {
                  const newSpec = data.data.specification;
                  const newCompleteness = data.data.completeness;

                  console.log('[CLIENT] Spec update received:', {
                    specUpdated: data.data.specUpdated,
                    hasSpecification: !!newSpec,
                    version: newSpec?.version,
                    messageCount: messages.length + 1
                  });

                  if (newSpec) {
                    // Only update if version is newer (ignore stale out-of-order updates)
                    if (!specification || newSpec.version > specification.version) {
                      console.log('[CLIENT] Applying spec update (version:', newSpec.version, ')');
                      console.log('[CLIENT] Specification data:', {
                        overview: newSpec.plainEnglishSummary.overview.substring(0, 100) + '...',
                        featuresCount: newSpec.plainEnglishSummary.keyFeatures.length,
                        targetUsers: newSpec.plainEnglishSummary.targetUsers,
                        requirementsCount: newSpec.formalPRD.requirements.length
                      });

                      setSpecification(newSpec);
                      setCompleteness(newCompleteness);

                      if (data.data.specUpdated) {
                        setRecentlyUpdatedSections(['overview', 'features']);
                        setTimeout(() => setRecentlyUpdatedSections([]), 3000);
                      }
                    } else {
                      console.log('[CLIENT] Ignoring stale spec update (version:', newSpec.version, 'vs current:', specification.version, ')');
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
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = async () => {
    if (!completeness?.readyForHandoff) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Specification submitted successfully! We will review and get back to you within 48 hours.');
        console.log('[CLIENT] Submission response:', data);
      } else {
        alert('Failed to submit specification. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting specification:', error);
      alert('Failed to submit specification. Please try again.');
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
        <>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            sessionId={sessionId}
            specification={specification}
          />

          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            shareUrl={shareUrl}
            specTitle={specification.plainEnglishSummary.overview.substring(0, 50) || 'My Specification'}
          />
        </>
      )}

      {completeness?.readyForHandoff && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors"
          >
            Submit Spec
          </button>
        </div>
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
