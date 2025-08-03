// src/components/MessageInput.tsx
import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  suggestions: string[];
  onGetSuggestions: () => void;
  disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  suggestions,
  onGetSuggestions,
  disabled
}) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Handle typing indicator
    if (value.length > 0) {
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    } else {
      onTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      onTyping(false);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested questions:</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full text-left p-2 text-sm text-gray-600 hover:bg-white hover:text-gray-800 rounded border border-transparent hover:border-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Connecting..." : "Ask me about company policies, procedures, or anything else..."}
            disabled={disabled}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-fusion-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={1}
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              {message.length}/2000 characters
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSuggestions(!showSuggestions);
                if (!showSuggestions) {
                  onGetSuggestions();
                }
              }}
              className="text-xs text-fusion-blue-600 hover:text-fusion-blue-700 font-medium"
            >
              {showSuggestions ? 'Hide' : 'Show'} suggestions
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Send</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};
