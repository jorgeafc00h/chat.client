# React Client Integration Guide for FusionHit Chat API

## Table of Contents
1. [Project Setup](#project-setup)
2. [SignalR Client Implementation](#signalr-client-implementation)
3. [React Components](#react-components)
4. [API Service](#api-service)
5. [Styling with Tailwind CSS](#styling-with-tailwind-css)
6. [Testing the Integration](#testing-the-integration)
7. [Deployment](#deployment)

## Project Setup

### 1. Create React Application

```bash
# Create new React app with TypeScript
npx create-react-app fusionhit-chat-client --template typescript
cd fusionhit-chat-client

# Install required dependencies
npm install @microsoft/signalr
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### 2. Package.json Configuration

```json
{
  "name": "fusionhit-chat-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@microsoft/signalr": "^8.0.0",
    "@types/node": "^16.7.13",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.4.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/jest": "^27.0.1"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

### 3. Tailwind CSS Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fusion-blue': {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply bg-fusion-blue-600 hover:bg-fusion-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200;
  }
  
  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200;
  }
  
  .chat-message {
    @apply max-w-3xl p-4 rounded-lg shadow-sm;
  }
  
  .chat-message-user {
    @apply bg-fusion-blue-500 text-white ml-12;
  }
  
  .chat-message-assistant {
    @apply bg-white text-gray-800 mr-12 border;
  }
}
```

## SignalR Client Implementation

### 1. Type Definitions

```typescript
// src/types/chat.ts
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  metadata?: Record<string, any>;
}

export interface Citation {
  documentId: string;
  filename: string;
  pageNumber: number;
  quote: string;
  confidence: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  lastActivityAt: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors: string[];
}

export interface DocumentStatus {
  documentId: string;
  fileName: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  createdAt: string;
  processedAt?: string;
  errorMessage?: string;
  processedChunks: number;
  totalChunks: number;
  progressPercentage: number;
}
```

### 2. SignalR Service

```typescript
// src/services/signalRService.ts
import * as signalR from "@microsoft/signalr";
import { ChatMessage, Citation } from '../types/chat';

export interface ServerToClientEvents {
  SessionJoined: (data: { SessionId: string; Messages: ChatMessage[] }) => void;
  MessageReceived: (message: ChatMessage) => void;
  MessageSent: (confirmation: { SessionId: string; Message: string; Timestamp: string; Role: string }) => void;
  SuggestionsReceived: (data: { SessionId: string; Suggestions: string[] }) => void;
  UserTyping: (data: { SessionId: string; ConnectionId: string; IsTyping: boolean }) => void;
  Error: (message: string) => void;
  DocumentIngested: (document: any) => void;
  IngestionProgress: (data: { DocumentId: string; Progress: number; Status: string }) => void;
}

export class SignalRService {
  private connection: signalR.HubConnection;
  private readonly baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(baseUrl: string = 'http://localhost:5272') {
    this.baseUrl = baseUrl;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/chatHub`, {
        // Configure transport types - WebSockets first, then fallbacks
        transport: signalR.HttpTransportType.WebSockets | 
                  signalR.HttpTransportType.ServerSentEvents | 
                  signalR.HttpTransportType.LongPolling,
        
        // Skip negotiation if using WebSockets (optional optimization)
        skipNegotiation: false,
        
        // Configure headers if needed for authentication
        headers: {
          // Add any custom headers here if needed
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          console.log(`SignalR reconnect attempt ${retryContext.previousRetryCount + 1}`);
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          return null; // Stop retrying after 4 attempts
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.connection.onreconnecting((error) => {
      console.log('SignalR connection reconnecting...', error);
      this.reconnectAttempts++;
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR connection reconnected. Connection ID:', connectionId);
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      console.error('SignalR connection closed:', error);
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    });
  }

  async start(): Promise<void> {
    try {
      console.log(`Connecting to SignalR hub at: ${this.baseUrl}/chatHub`);
      await this.connection.start();
      console.log('SignalR connection established successfully');
      console.log('Connection ID:', this.connection.connectionId);
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('Failed to start the connection')) {
          throw new Error('Cannot connect to chat service. Please ensure the API server is running on http://localhost:5272 and accessible.');
        } else if (error.message.includes('CORS')) {
          throw new Error('CORS error: Please check that the API server allows connections from this domain.');
        }
      }
      
      throw new Error('Failed to connect to chat service. Please check your internet connection and try again.');
    }
  }

  async stop(): Promise<void> {
    try {
      await this.connection.stop();
      console.log('SignalR connection stopped');
    } catch (error) {
      console.error('Error stopping SignalR connection:', error);
    }
  }

  get isConnected(): boolean {
    return this.connection.state === signalR.HubConnectionState.Connected;
  }

  get connectionState(): string {
    switch (this.connection.state) {
      case signalR.HubConnectionState.Disconnected:
        return 'Disconnected';
      case signalR.HubConnectionState.Connecting:
        return 'Connecting';
      case signalR.HubConnectionState.Connected:
        return 'Connected';
      case signalR.HubConnectionState.Disconnecting:
        return 'Disconnecting';
      case signalR.HubConnectionState.Reconnecting:
        return 'Reconnecting';
      default:
        return 'Unknown';
    }
  }

  // Chat Methods
  async joinSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`SignalR connection is not established. Current state: ${this.connectionState}`);
    }
    console.log(`Joining session: ${sessionId}`);
    await this.connection.invoke("JoinSession", sessionId);
  }

  async leaveSession(sessionId: string): Promise<void> {
    if (!this.isConnected) return;
    console.log(`Leaving session: ${sessionId}`);
    await this.connection.invoke("LeaveSession", sessionId);
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`SignalR connection is not established. Current state: ${this.connectionState}`);
    }
    console.log(`Sending message to session ${sessionId}:`, message);
    await this.connection.invoke("SendMessage", sessionId, message);
  }

  async getSuggestions(sessionId: string): Promise<void> {
    if (!this.isConnected) return;
    console.log(`Getting suggestions for session: ${sessionId}`);
    await this.connection.invoke("GetSuggestions", sessionId);
  }

  async startTyping(sessionId: string): Promise<void> {
    if (!this.isConnected) return;
    await this.connection.invoke("StartTyping", sessionId);
  }

  async stopTyping(sessionId: string): Promise<void> {
    if (!this.isConnected) return;
    await this.connection.invoke("StopTyping", sessionId);
  }

  // Event Listeners
  onSessionJoined(callback: (data: { SessionId: string; Messages: ChatMessage[] }) => void): void {
    this.connection.on("SessionJoined", callback);
  }

  onMessageReceived(callback: (message: ChatMessage) => void): void {
    this.connection.on("MessageReceived", callback);
  }

  onMessageSent(callback: (confirmation: any) => void): void {
    this.connection.on("MessageSent", callback);
  }

  onSuggestionsReceived(callback: (data: { SessionId: string; Suggestions: string[] }) => void): void {
    this.connection.on("SuggestionsReceived", callback);
  }

  onUserTyping(callback: (data: { SessionId: string; ConnectionId: string; IsTyping: boolean }) => void): void {
    this.connection.on("UserTyping", callback);
  }

  onError(callback: (message: string) => void): void {
    this.connection.on("Error", callback);
  }

  onDocumentIngested(callback: (document: any) => void): void {
    this.connection.on("DocumentIngested", callback);
  }

  onIngestionProgress(callback: (data: { DocumentId: string; Progress: number; Status: string }) => void): void {
    this.connection.on("IngestionProgress", callback);
  }

  // Remove event listeners
  removeAllListeners(): void {
    this.connection.off("SessionJoined");
    this.connection.off("MessageReceived");
    this.connection.off("MessageSent");
    this.connection.off("SuggestionsReceived");
    this.connection.off("UserTyping");
    this.connection.off("Error");
    this.connection.off("DocumentIngested");
    this.connection.off("IngestionProgress");
  }

  // Connection State
  get connectionState(): signalR.HubConnectionState {
    return this.connection.state;
  }

  get isConnected(): boolean {
    return this.connection.state === signalR.HubConnectionState.Connected;
  }

  get connectionId(): string | null {
    return this.connection.connectionId;
  }

  // Helper method to test connection
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.start();
      }
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
```

### 3. API Service

```typescript
// src/services/apiService.ts
import { ChatSession, ApiResponse, DocumentStatus } from '../types/chat';

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5272') {
    this.baseUrl = baseUrl;
  }

  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        errors: []
      };
    }
  }

  // Chat Session Methods
  async createSession(userId: string, title?: string): Promise<ApiResponse<ChatSession>> {
    return this.fetchWithErrorHandling<ChatSession>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId, title }),
    });
  }

  async getSession(sessionId: string): Promise<ApiResponse<ChatSession>> {
    return this.fetchWithErrorHandling<ChatSession>(`/api/chat/sessions/${sessionId}`);
  }

  async getUserSessions(userId: string): Promise<ApiResponse<ChatSession[]>> {
    return this.fetchWithErrorHandling<ChatSession[]>(`/api/chat/sessions?userId=${encodeURIComponent(userId)}`);
  }

  async deleteSession(sessionId: string): Promise<ApiResponse<boolean>> {
    return this.fetchWithErrorHandling<boolean>(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getSuggestions(sessionId: string): Promise<ApiResponse<string[]>> {
    return this.fetchWithErrorHandling<string[]>(`/api/chat/sessions/${sessionId}/suggestions`);
  }

  // Document Methods
  async uploadDocument(file: File): Promise<ApiResponse<DocumentStatus>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/document/ingest`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiResponse<DocumentStatus>;
    } catch (error) {
      console.error('Document upload failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Document upload failed',
        errors: []
      };
    }
  }

  async getDocuments(): Promise<ApiResponse<any[]>> {
    return this.fetchWithErrorHandling<any[]>('/api/document');
  }

  async getDocumentStatus(documentId: string): Promise<ApiResponse<DocumentStatus>> {
    return this.fetchWithErrorHandling<DocumentStatus>(`/api/document/status/${documentId}`);
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<boolean>> {
    return this.fetchWithErrorHandling<boolean>(`/api/document/${documentId}`, {
      method: 'DELETE',
    });
  }

  // Health Check
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('Health check failed');
    }
  }
}
```

## React Components

### 1. Main Chat Interface

```typescript
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
  apiBaseUrl?: string;
  userId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiBaseUrl = 'http://localhost:5272', 
  userId 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const signalRService = useRef<SignalRService>();
  const apiService = useRef<ApiService>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
```

### 2. Message List Component

```typescript
// src/components/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types/chat';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 ? (
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
        messages.map((message) => (
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
```

### 3. Message Item Component

```typescript
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
```

### 4. Citation Display Component

```typescript
// src/components/CitationDisplay.tsx
import React from 'react';
import { Citation } from '../types/chat';

interface CitationDisplayProps {
  citations: Citation[];
}

export const CitationDisplay: React.FC<CitationDisplayProps> = ({ citations }) => {
  if (!citations.length) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Sources:
      </h4>
      <div className="space-y-3">
        {citations.map((citation, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-fusion-blue-400">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-800 text-sm">
                📄 {citation.filename}
              </div>
              <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Page {citation.pageNumber}
              </div>
            </div>
            <div className="text-gray-700 text-sm italic border-l-2 border-gray-300 pl-3">
              "{citation.quote}"
            </div>
            {citation.confidence && citation.confidence > 0 && (
              <div className="text-xs text-gray-500 mt-2 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Confidence: {(citation.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 5. Message Input Component

```typescript
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
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
```

## Testing the Integration

### 1. Start the Services

```bash
# Terminal 1: Start the Chat.Api
cd /Users/jorgeflores/github/chat.api/Chat.Api
dotnet run

# Terminal 2: Start the React client
cd fusionhit-chat-client
npm start
```

### 2. Test Scenarios

1. **Connection Test**
   - Open browser to `http://localhost:3000`
   - Verify SignalR connection establishes to `http://localhost:5272/chatHub`
   - Check browser console for connection logs

2. **API Health Check**
   - Verify API is running: `http://localhost:5272/health`
   - Test SignalR readiness: `http://localhost:5272/signalr-test`
   - Use interactive test: `http://localhost:5272/signalr-test.html`

3. **Chat Functionality**
   - Send a test message
   - Verify real-time response
   - Test typing indicators

4. **Document Citations**
   - Ask about company policies
   - Verify citations appear with document references

5. **Document Upload**
   - Upload a PDF document via the API
   - Monitor ingestion progress via SignalR

### 3. Environment Configuration

```bash
# .env.local for React app
REACT_APP_API_BASE_URL=http://localhost:5272
REACT_APP_USER_ID=demo-user
```

### 4. Usage Example with Error Handling

```typescript
// src/App.tsx
import React from 'react';
import { ChatInterface } from './components/ChatInterface';

function App() {
  return (
    <div className="App">
      <ChatInterface 
        apiBaseUrl={process.env.REACT_APP_API_BASE_URL}
        userId={process.env.REACT_APP_USER_ID || 'demo-user'}
      />
    </div>
  );
}

export default App;
```

```typescript
// Example of using the SignalRService directly
import { SignalRService } from './services/signalRService';

const signalRService = new SignalRService(); // Uses default localhost:5272

// In your React component
useEffect(() => {
  const initializeSignalR = async () => {
    try {
      await signalRService.start();
      
      // Set up event listeners
      signalRService.onMessageReceived((message) => {
        console.log('Received message:', message);
        // Update your state with the new message
      });
      
      signalRService.onError((error) => {
        console.error('SignalR error:', error);
        // Handle error in UI
      });
      
      // Join a session
      await signalRService.joinSession('your-session-id');
      
    } catch (error) {
      console.error('Failed to initialize SignalR:', error);
    }
  };
  
  initializeSignalR();
  
  return () => {
    signalRService.stop();
  };
}, []);
```

## Deployment

### 1. Production Build

```bash
# Build React app for production
npm run build

# The build folder can be served by any static file server
# or deployed to Azure Static Web Apps
```

### 2. Azure Deployment

#### Chat API Deployment
```bash
# Deploy to Azure App Service
az webapp up --name fusionhit-chat-api --resource-group fusionhit-rg

# Make sure to configure these environment variables in Azure:
# - AzureOpenAI:Endpoint
# - AzureOpenAI:ApiKey (or use Managed Identity)
# - ConnectionStrings:VectorStore
# - DocumentsPath
```

#### React Client Deployment
```bash
# Build with production API URL
REACT_APP_API_BASE_URL=https://fusionhit-chat-api.azurewebsites.net npm run build

# Deploy to Azure Static Web Apps
az staticwebapp create --name fusionhit-chat-client --resource-group fusionhit-rg --source .
```

#### Production Environment Variables
```bash
# For production React app
REACT_APP_API_BASE_URL=https://your-api.azurewebsites.net
REACT_APP_USER_ID=prod-user
```

## Troubleshooting

### Common Issues

1. **SignalR Connection Failed**
   - ✅ **FIXED**: CORS configuration updated to support SignalR properly
   - ✅ **FIXED**: SignalR service configured with optimal timeout and error handling settings
   - Check that API is running on `http://localhost:5272`
   - Verify WebSocket support is enabled
   - Check firewall settings

2. **Messages Not Appearing**
   - Verify session ID is correct
   - Check SignalR event handlers are properly set up
   - Monitor browser console for errors
   - Ensure you've joined a session before sending messages

3. **Citations Not Displaying**
   - Verify PDF documents are ingested (check `/api/document` endpoint)
   - Check vector search is working
   - Validate citation parsing in message responses

4. **CORS Errors** 
   - ✅ **FIXED**: Enhanced CORS policy with proper SignalR support
   - Verify React app origin is in allowed origins
   - Check that CORS middleware is applied before routing

### Debug Tips

1. **Enable SignalR Logging**
   ```typescript
   .configureLogging(signalR.LogLevel.Debug)
   ```

2. **Monitor Network Requests**
   - Use browser dev tools Network tab
   - Check API response formats
   - Verify CORS headers are present

3. **Check Server Logs**
   - Monitor Chat.Api console output for detailed SignalR logs
   - Check hosted service logs
   - Verify Azure OpenAI calls

4. **Test API Endpoints Directly**
   ```bash
   # Check API health
   curl http://localhost:5272/health
   
   # Test SignalR configuration
   curl http://localhost:5272/signalr-test
   
   # Interactive SignalR test
   # Visit: http://localhost:5272/signalr-test.html
   ```

### Recent Fixes Applied

The following issues have been resolved in the current version:

1. **Enhanced CORS Configuration**: Added proper SignalR negotiation support
2. **SignalR Service Optimization**: Added timeout configuration and detailed error handling
3. **Middleware Order**: Fixed CORS middleware order to apply before routing
4. **Enhanced Logging**: Added comprehensive debugging for SignalR, CORS, and HTTP connections
5. **Connection Diagnostics**: Added test endpoints and interactive testing page

### Connection Test

Use the built-in test page to verify your SignalR connection:
- Visit: `http://localhost:5272/signalr-test.html`
- Click "Connect" and verify the connection establishes successfully
- Monitor the connection log for any errors

This comprehensive guide provides everything needed to implement a full-featured React client that integrates with the FusionHit Chat API via SignalR, providing real-time chat functionality with document citations and comprehensive error handling.

## Additional Resources

- [SignalR Troubleshooting Guide](./SIGNALR_TROUBLESHOOTING.md) - Detailed troubleshooting for SignalR connectivity issues
- [API Health Check](http://localhost:5272/health) - Verify API is running
- [SignalR Test Page](http://localhost:5272/signalr-test.html) - Interactive SignalR connection testing
