// src/components/MessageList.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { ChatMessage } from '../types/chat';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages?: ChatMessage[];
  isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Safeguard: ensure messages is always an array using useMemo for performance
  const safeMessages = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [safeMessages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {safeMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg font-medium">Welcome to FusionHit Assistant</p>
          <p className="text-sm text-center max-w-md mt-2">
            I'm here to help you with company policies, procedures, and any questions about your onboarding process.
          </p>
        </div>
      ) : (
        safeMessages.map((message) => (
          <MessageItem 
            key={message.id}
            message={message}
          />
        ))
      )}
      
      {isTyping && <TypingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
