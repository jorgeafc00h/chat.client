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
