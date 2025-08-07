// src/services/signalRService.ts
import * as signalR from "@microsoft/signalr";
import { ChatMessage } from '../types/chat';

export interface ServerToClientEvents {
  SessionJoined: (data: { sessionId: string; messages: ChatMessage[] }) => void;
  MessageReceived: (message: ChatMessage) => void;
  MessageSent: (confirmation: { sessionId: string; messageId: string; timestamp: string }) => void;
  Error: (message: string) => void;
  DocumentIngested: (document: any) => void;
  IngestionProgress: (data: { documentId: string; progress: number; status: string }) => void;
}

export class SignalRService {
  private connection: signalR.HubConnection;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(baseUrl: string = 'https://localhost:7265', apiKey: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.REACT_APP_API_KEY || 'fusionhit-web-client-2025-secret-key';
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/chathub?api_key=${encodeURIComponent(this.apiKey)}`, {
        // Configure transport types - WebSockets first, then fallbacks
        transport: signalR.HttpTransportType.WebSockets | 
                  signalR.HttpTransportType.ServerSentEvents | 
                  signalR.HttpTransportType.LongPolling,
        
        // Skip negotiation if using WebSockets (optional optimization)
        skipNegotiation: false,
        
        // Configure headers with API key (fallback if query param doesn't work)
        headers: {
          'X-API-Key': this.apiKey
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
      console.log(`Connecting to SignalR hub at: ${this.baseUrl}/chathub`);
      await this.connection.start();
      console.log('SignalR connection established successfully');
      console.log('Connection ID:', this.connection.connectionId);
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        console.error('[SignalR] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        if (error.message.includes('Failed to start the connection')) {
          throw new Error('Cannot connect to chat service. Please ensure the API server is running on https://localhost:7265 and accessible.');
        } else if (error.message.includes('CORS')) {
          throw new Error('CORS error: Please check that the API server allows connections from this domain.');
        } else if (error.message.includes('negotiate')) {
          throw new Error('SignalR negotiation failed. Please check the server configuration and ensure /chathub is properly configured.');
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

  // Event Listeners
  onSessionJoined(callback: (data: { sessionId: string; messages: ChatMessage[] }) => void): void {
    this.connection.on("SessionJoined", callback);
  }

  onMessageReceived(callback: (message: ChatMessage) => void): void {
    this.connection.on("MessageReceived", callback);
  }

  onMessageSent(callback: (confirmation: any) => void): void {
    this.connection.on("MessageSent", callback);
  }

  onError(callback: (message: string) => void): void {
    this.connection.on("Error", callback);
  }

  onDocumentIngested(callback: (document: any) => void): void {
    this.connection.on("DocumentIngested", callback);
  }

  onIngestionProgress(callback: (data: { documentId: string; progress: number; status: string }) => void): void {
    this.connection.on("IngestionProgress", callback);
  }

  // Connection state event handlers
  onConnectionReconnected(callback: (connectionId?: string) => void): void {
    this.connection.onreconnected(callback);
  }

  onConnectionReconnecting(callback: (error?: Error) => void): void {
    this.connection.onreconnecting(callback);
  }

  onConnectionClosed(callback: (error?: Error) => void): void {
    this.connection.onclose(callback);
  }

  // Remove event listeners
  removeAllListeners(): void {
    this.connection.off("SessionJoined");
    this.connection.off("MessageReceived");
    this.connection.off("MessageSent");
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
