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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
  errorMessage?: string;
  processedChunks: number;
  totalChunks: number;
  progressPercentage: number;
}
