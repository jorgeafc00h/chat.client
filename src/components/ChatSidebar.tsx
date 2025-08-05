// src/components/ChatSidebar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { ChatSession } from '../types/chat';

interface ChatSidebarProps {
  apiService: ApiService;
  userId: string;
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  apiService,
  userId,
  currentSessionId,
  onSessionSelect,
  onClose
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserSessions(userId);
      if (response.success && response.data) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [apiService, userId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createNewSession = async () => {
    try {
      const response = await apiService.createSession(userId, 'New Chat');
      if (response.success && response.data) {
        setSessions(prev => [response.data!, ...prev]);
        onSessionSelect(response.data.id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Chat Sessions</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={createNewSession}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No chat sessions yet</div>
        ) : (
          <div className="space-y-2 p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  session.id === currentSessionId
                    ? 'bg-fusion-blue-100 border border-fusion-blue-300'
                    : 'hover:bg-white border border-transparent'
                }`}
              >
                <div className="font-medium text-sm text-gray-800 truncate">
                  {session.title || 'Untitled Chat'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(session.lastActivityAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
