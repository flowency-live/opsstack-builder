/**
 * Unit tests for ChatInterface component
 * Tests message rendering, input handling, and streaming display
 * Requirements: 1.2, 9.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatInterface from '@/components/ChatInterface';
import { Message } from '@/lib/models/types';

describe('ChatInterface', () => {
  const mockOnMessageSent = jest.fn();
  const defaultProps = {
    sessionId: 'test-session-123',
    onMessageSent: mockOnMessageSent,
    messages: [] as Message[],
    isStreaming: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock scrollIntoView which is not available in jsdom
    Element.prototype.scrollIntoView = jest.fn();
  });

  describe('Message Rendering', () => {
    it('should render empty state when no messages', () => {
      render(<ChatInterface {...defaultProps} />);
      
      expect(screen.getByText("Let's build your specification")).toBeInTheDocument();
      expect(
        screen.getByText(/Tell me about your software project idea/i)
      ).toBeInTheDocument();
    });

    it('should render user messages with correct styling', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'I want to build a booking system',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
      ];

      const { container } = render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const messageElement = screen.getByText('I want to build a booking system');
      expect(messageElement).toBeInTheDocument();
      
      // Find the message bubble div - it's the child of the flex container
      const flexContainer = messageElement.parentElement?.parentElement;
      const messageBubble = flexContainer?.querySelector('.bg-\\[var\\(--color-primary\\)\\]');
      expect(messageBubble).toBeInTheDocument();
    });

    it('should render assistant messages with correct styling', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'Tell me more about your booking system',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
      ];

      const { container } = render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const messageElement = screen.getByText('Tell me more about your booking system');
      expect(messageElement).toBeInTheDocument();
      
      // Find the message bubble div - it's the child of the flex container
      const flexContainer = messageElement.parentElement?.parentElement;
      const messageBubble = flexContainer?.querySelector('.bg-\\[var\\(--color-surface\\)\\]');
      expect(messageBubble).toBeInTheDocument();
    });

    it('should render system messages with warning styling', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'system',
          content: 'Session restored from magic link',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
      ];

      const { container } = render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const messageElement = screen.getByText('Session restored from magic link');
      expect(messageElement).toBeInTheDocument();
      
      // Find the message bubble div - it's the child of the flex container
      const flexContainer = messageElement.parentElement?.parentElement;
      const messageBubble = flexContainer?.querySelector('.bg-\\[var\\(--color-warning\\)\\]\\/10');
      expect(messageBubble).toBeInTheDocument();
    });

    it('should display timestamp for each message', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date('2024-01-01T10:30:00'),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      // Check that a time is displayed (format may vary by locale)
      expect(screen.getByText(/10:30|10:30 AM/i)).toBeInTheDocument();
    });

    it('should show spec updated indicator when metadata is present', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'I have updated your specification',
          timestamp: new Date(),
          metadata: {
            specUpdated: true,
          },
        },
      ];

      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      expect(screen.getByText('✓ Specification updated')).toBeInTheDocument();
    });

    it('should render multiple messages in order', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'First message',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          id: '2',
          role: 'user',
          content: 'Second message',
          timestamp: new Date('2024-01-01T10:01:00'),
        },
        {
          id: '3',
          role: 'assistant',
          content: 'Third message',
          timestamp: new Date('2024-01-01T10:02:00'),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const allMessages = screen.getAllByText(/message/i);
      expect(allMessages).toHaveLength(3);
      expect(allMessages[0]).toHaveTextContent('First message');
      expect(allMessages[1]).toHaveTextContent('Second message');
      expect(allMessages[2]).toHaveTextContent('Third message');
    });
  });

  describe('Input Handling', () => {
    it('should render input field and send button', () => {
      render(<ChatInterface {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Describe your project idea...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should update input value when typing', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...') as HTMLTextAreaElement;
      await user.type(input, 'My project idea');
      
      expect(input.value).toBe('My project idea');
    });

    it('should call onMessageSent when form is submitted', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      expect(mockOnMessageSent).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...') as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      expect(input.value).toBe('');
    });

    it('should send message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...');
      
      await user.type(input, 'Test message{Enter}');
      
      expect(mockOnMessageSent).toHaveBeenCalledWith('Test message');
    });

    it('should add new line when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...') as HTMLTextAreaElement;
      
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');
      
      expect(input.value).toContain('\n');
      expect(mockOnMessageSent).not.toHaveBeenCalled();
    });

    it('should not send empty or whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, '   ');
      await user.click(sendButton);
      
      expect(mockOnMessageSent).not.toHaveBeenCalled();
    });

    it('should trim whitespace from messages before sending', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, '  Test message  ');
      await user.click(sendButton);
      
      expect(mockOnMessageSent).toHaveBeenCalledWith('Test message');
    });

    it('should disable input and send button when streaming', () => {
      render(<ChatInterface {...defaultProps} isStreaming={true} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...') as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /send/i }) as HTMLButtonElement;
      
      expect(input.disabled).toBe(true);
      expect(sendButton.disabled).toBe(true);
    });

    it('should not send message when streaming', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} isStreaming={true} />);
      
      const input = screen.getByPlaceholderText('Describe your project idea...');
      
      await user.type(input, 'Test message');
      fireEvent.submit(input.closest('form')!);
      
      expect(mockOnMessageSent).not.toHaveBeenCalled();
    });
  });

  describe('Streaming Display', () => {
    it('should show typing indicator when streaming', () => {
      const { container } = render(<ChatInterface {...defaultProps} isStreaming={true} />);
      
      // Check for animated dots (typing indicator) - look for small rounded divs
      const typingIndicators = container.querySelectorAll('.w-2.h-2.rounded-full');
      
      expect(typingIndicators.length).toBeGreaterThan(0);
    });

    it('should not show typing indicator when not streaming', () => {
      render(<ChatInterface {...defaultProps} isStreaming={false} />);
      
      const typingIndicators = document.querySelectorAll('.animate-bounce');
      expect(typingIndicators.length).toBe(0);
    });

    it('should show typing indicator after messages', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'My question',
          timestamp: new Date(),
        },
      ];

      render(<ChatInterface {...defaultProps} messages={messages} isStreaming={true} />);
      
      expect(screen.getByText('My question')).toBeInTheDocument();
      
      const typingIndicators = document.querySelectorAll('.animate-bounce');
      expect(typingIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Header Actions', () => {
    it('should render magic link button', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const magicLinkButton = screen.getByTitle('Continue on another device');
      expect(magicLinkButton).toBeInTheDocument();
    });

    it('should render need help button', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const helpButton = screen.getByRole('button', { name: /need help/i });
      expect(helpButton).toBeInTheDocument();
    });

    it('should show alert when magic link button is clicked', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ChatInterface {...defaultProps} />);
      
      const magicLinkButton = screen.getByTitle('Continue on another device');
      await user.click(magicLinkButton);
      
      expect(alertSpy).toHaveBeenCalledWith(
        'Magic link generation will be implemented in a future task'
      );
      
      alertSpy.mockRestore();
    });

    it('should show alert when need help button is clicked', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ChatInterface {...defaultProps} />);
      
      const helpButton = screen.getByRole('button', { name: /need help/i });
      await user.click(helpButton);
      
      expect(alertSpy).toHaveBeenCalledWith(
        'Contact form will be implemented in a future task'
      );
      
      alertSpy.mockRestore();
    });
  });

  describe('Auto-scroll', () => {
    it('should have a scroll container for messages', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const scrollContainer = document.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should have a ref element at the end of messages for auto-scroll', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
        },
      ];

      const { container } = render(<ChatInterface {...defaultProps} messages={messages} />);
      
      // The messagesEndRef div should exist (even if not visible)
      const scrollTarget = container.querySelector('.overflow-y-auto > div > div:last-child');
      expect(scrollTarget).toBeInTheDocument();
    });
  });
});
