// src/components/MessageItem.tsx
import React from 'react';
import { ChatMessage } from '../types/chat';
import { CitationDisplay } from './CitationDisplay';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 mr-3">
            <div className="w-8 h-8 bg-fusion-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
          
          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <CitationDisplay citations={message.citations} />
          )}
          
          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {timestamp}
          </div>
        </div>
        
        {/* User Avatar */}
        {isUser && (
          <div className="flex-shrink-0 ml-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
