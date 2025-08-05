// src/services/signalRService.ts
import * as signalR from "@microsoft/signalr";
import { ChatMessage } from '../types/chat';

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

  constructor(baseUrl: string) {
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
          throw new Error('Cannot connect to chat service. Please ensure the API server is running on https://localhost:7265 and accessible.');
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
