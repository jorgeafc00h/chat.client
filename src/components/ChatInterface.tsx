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
  const [error, setError] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const signalRService = useRef<SignalRService | null>(null);
  const apiService = useRef<ApiService | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const apiKey = process.env.REACT_APP_API_KEY;

  const initializeServices = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Initialize services
      signalRService.current = new SignalRService(apiBaseUrl, apiKey);
      apiService.current = new ApiService(apiBaseUrl, apiKey);
      
      // Setup SignalR event handlers BEFORE starting connection
      setupSignalREventHandlers();

      // Start SignalR connection
      await signalRService.current.start();
      setIsConnected(true);
      setError(''); // Clear any previous connection errors
      console.log('[ChatInterface] SignalR connection established, now creating/joining session');

      // Create or get a session
      await createOrJoinSession();
      
    } catch (error) {
      console.error('Failed to initialize services:', error);
      setError('Failed to connect to chat service. Please refresh the page and try again.');
    } finally {
      setIsConnecting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  useEffect(() => {
    initializeServices();
    return () => {
      cleanup();
    };
  }, [initializeServices]);

  const setupSignalREventHandlers = () => {
    if (!signalRService.current) return;

    // Handle connection state changes
    signalRService.current.onConnectionReconnected(() => {
      console.log('[ChatInterface] SignalR reconnected successfully');
      setIsConnected(true);
      setError(''); // Clear error message on successful reconnection
    });

    signalRService.current.onConnectionReconnecting(() => {
      console.log('[ChatInterface] SignalR reconnecting...');
      setIsConnected(false);
    });

    signalRService.current.onConnectionClosed(() => {
      console.log('[ChatInterface] SignalR connection closed');
      setIsConnected(false);
    });

    signalRService.current.onSessionJoined((data) => {
      console.log('[ChatInterface] SessionJoined event received:', data);
      setMessages(data.messages || []);
      setCurrentSessionId(data.sessionId);
      console.log('[ChatInterface] Updated sessionId to:', data.sessionId);
    });

    signalRService.current.onMessageReceived((message) => {
      console.log('[ChatInterface] Received message from server:', message);
      console.log('[ChatInterface] Message details:', {
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      });
      setMessages(prev => [...prev, message]);
    });

    signalRService.current.onMessageSent((confirmation) => {
      console.log('Message sent confirmation:', confirmation);
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

  const createOrJoinSession = useCallback(async () => {
    try {
      if (!apiService.current) return;

      console.log('[ChatInterface] Creating session for user:', userId);
      const response = await apiService.current.createSession(userId);
      console.log('[ChatInterface] Create session response:', response);
      
      if (response.success && response.data) {
        console.log('[ChatInterface] Setting sessionId to:', response.data.id);
        setCurrentSessionId(response.data.id);
        
        if (signalRService.current) {
          console.log('[ChatInterface] Joining SignalR session:', response.data.id);
          await signalRService.current.joinSession(response.data.id);
          console.log('[ChatInterface] Successfully joined SignalR session');
        }
      } else {
        throw new Error(response.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create chat session');
    }
  }, [userId]);

  const sendMessage = useCallback(async (message: string) => {
    console.log('[ChatInterface] sendMessage called with:', {
      message: message,
      currentSessionId: currentSessionId,
      hasSignalR: !!signalRService.current,
      signalRConnected: signalRService.current?.isConnected
    });
    
    if (!signalRService.current || !currentSessionId || !message.trim()) {
      console.warn('[ChatInterface] Cannot send message - missing requirements:', {
        hasSignalR: !!signalRService.current,
        hasSessionId: !!currentSessionId,
        hasMessage: !!message.trim()
      });
      return;
    }

    try {
      console.log(`[ChatInterface] Preparing to send message to session ${currentSessionId}`);
      console.log(`[ChatInterface] Message content:`, message);
      
      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId: currentSessionId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      console.log(`[ChatInterface] Added user message to UI`);
      
      // Send via SignalR
      console.log(`[ChatInterface] Sending message via SignalR...`);
      await signalRService.current.sendMessage(currentSessionId, message);
      console.log(`[ChatInterface] Message sent successfully via SignalR`);
      
    } catch (error) {
      console.error('[ChatInterface] Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  }, [currentSessionId]);

  const handleTyping = useCallback(async (isTyping: boolean) => {
    // Typing indicators removed as per guidelines
    // This can be re-implemented when the backend supports it
  }, []);

  const getSuggestions = useCallback(async () => {
    // Suggestions removed as per guidelines  
    // This can be re-implemented when the backend supports it
  }, []);

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
          isTyping={false}
        />
        
        {/* Message Input */}
        <MessageInput
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          suggestions={[]}
          onGetSuggestions={getSuggestions}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
};
