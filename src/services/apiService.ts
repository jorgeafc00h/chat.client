// src/services/apiService.ts
import { ChatSession, ApiResponse, DocumentStatus } from '../types/chat';

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
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
