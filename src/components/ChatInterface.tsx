// src/components/ChatInterface.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SignalRService } from '../services/signalRService';
import { ApiService } from '../services/apiService';
import { ChatMessage } from '../types/chat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatSidebar } from './ChatSidebar';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBanner } from './ErrorBanner';

interface ChatInterfaceProps {
  apiBaseUrl: string;
  userId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ apiBaseUrl, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const signalRService = useRef<SignalRService | null>(null);
  const apiService = useRef<ApiService | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeServices();
    return () => {
      cleanup();
    };
  }, []);

  const initializeServices = async () => {
    try {
      setIsConnecting(true);
      
      // Initialize services
      signalRService.current = new SignalRService(apiBaseUrl);
      apiService.current = new ApiService(apiBaseUrl);
      
      // Setup SignalR event handlers
      setupSignalREventHandlers();

      // Start SignalR connection
      await signalRService.current.start();
      setIsConnected(true);

      // Create or get a session
      await createOrJoinSession();
      
    } catch (error) {
      console.error('Failed to initialize services:', error);
      setError('Failed to connect to chat service. Please refresh the page and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const setupSignalREventHandlers = () => {
    if (!signalRService.current) return;

    signalRService.current.onSessionJoined((data) => {
      setMessages(data.Messages);
      setCurrentSessionId(data.SessionId);
    });

    signalRService.current.onMessageReceived((message) => {
      setMessages(prev => [...prev, message]);
    });

    signalRService.current.onMessageSent((confirmation) => {
      console.log('Message sent confirmation:', confirmation);
    });

    signalRService.current.onSuggestionsReceived((data) => {
      setSuggestions(data.Suggestions);
    });

    signalRService.current.onUserTyping((data) => {
      setIsTyping(data.IsTyping);
      
      if (data.IsTyping) {
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set timeout to hide typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });

    signalRService.current.onError((message) => {
      setError(message);
      setTimeout(() => setError(''), 5000);
    });

    signalRService.current.onDocumentIngested((document) => {
      console.log('Document ingested:', document);
      // Show notification or update document list
    });
  };

  const createOrJoinSession = async () => {
    try {
      if (!apiService.current) return;

      const response = await apiService.current.createSession(userId);
      if (response.success && response.data) {
        setCurrentSessionId(response.data.id);
        
        if (signalRService.current) {
          await signalRService.current.joinSession(response.data.id);
        }
      } else {
        throw new Error(response.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create chat session');
    }
  };

  const sendMessage = useCallback(async (message: string) => {
    if (!signalRService.current || !currentSessionId || !message.trim()) {
      return;
    }

    try {
      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId: currentSessionId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send via SignalR
      await signalRService.current.sendMessage(currentSessionId, message);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  }, [currentSessionId]);

  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!signalRService.current || !currentSessionId) return;

    try {
      if (isTyping) {
        await signalRService.current.startTyping(currentSessionId);
      } else {
        await signalRService.current.stopTyping(currentSessionId);
      }
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [currentSessionId]);

  const getSuggestions = useCallback(async () => {
    if (!signalRService.current || !currentSessionId) return;

    try {
      await signalRService.current.getSuggestions(currentSessionId);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }, [currentSessionId]);

  const cleanup = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (signalRService.current) {
      signalRService.current.removeAllListeners();
      signalRService.current.stop();
    }
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Connecting to FusionHit Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
        <ChatSidebar 
          apiService={apiService.current!}
          userId={userId}
          currentSessionId={currentSessionId}
          onSessionSelect={setCurrentSessionId}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-semibold text-gray-800">FusionHit Assistant</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Error Banner */}
        {error && (
          <ErrorBanner message={error} onClose={() => setError('')} />
        )}
        
        {/* Messages */}
        <MessageList 
          messages={messages}
          isTyping={isTyping}
        />
        
        {/* Message Input */}
        <MessageInput
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          suggestions={suggestions}
          onGetSuggestions={getSuggestions}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
};
