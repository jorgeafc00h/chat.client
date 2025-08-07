// src/components/MessageItem.tsx
import React from 'react';
import { ChatMessage } from '../types/chat';
import { CitationDisplay } from './CitationDisplay';

interface MessageItemProps {
  message: ChatMessage;
  apiBaseUrl?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, apiBaseUrl }) => {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
        <div className="flex-1 min-w-0">
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
          
          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <CitationDisplay citations={message.citations} apiBaseUrl={apiBaseUrl} />
          )}
          
          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
};
