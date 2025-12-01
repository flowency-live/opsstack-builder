'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import { Message } from '@/lib/models/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm here to help you create a comprehensive specification for your software project. Let's start by understanding what you want to build.\n\nCould you tell me about your project idea? What kind of software or digital product are you looking to create?",
      timestamp: new Date(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleMessageSent = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate streaming response (will be replaced with actual API call in future tasks)
    setIsStreaming(true);
    
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content:
        "Thank you for sharing that! I'm processing your input and will ask follow-up questions to help build your specification. (Note: Full AI integration will be implemented in future tasks)",
      timestamp: new Date(),
      metadata: {
        specUpdated: true,
      },
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(false);
  };

  return (
    <ChatInterface
      sessionId="demo-session"
      onMessageSent={handleMessageSent}
      messages={messages}
      isStreaming={isStreaming}
    />
  );
}
