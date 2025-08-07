// src/components/CitationDisplay.tsx
import React from 'react';
import { Citation } from '../types/chat';

interface CitationDisplayProps {
  citations: Citation[];
  apiBaseUrl?: string;
}

export const CitationDisplay: React.FC<CitationDisplayProps> = ({ citations, apiBaseUrl }) => {
  if (!citations.length) return null;

  const handleDocumentClick = async (citation: Citation) => {
    const apiKey = process.env.REACT_APP_API_KEY || 'fusionhit-web-client-2025-secret-key';
    
    console.group('[CitationDisplay] Document Click Debug');
    console.log('Citation object:', citation);
    console.log('API Base URL:', apiBaseUrl);
    console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
    console.log('Filename (raw):', citation.filename);
    console.log('Filename (encoded):', encodeURIComponent(citation.filename));
    console.groupEnd();
    
    if (!apiBaseUrl) {
      console.warn('[CitationDisplay] ❌ No API base URL available');
      return;
    }

    try {
      // Fetch PDF with proper authentication headers
      const pdfUrl = `${apiBaseUrl}/api/document/pdf/${encodeURIComponent(citation.filename)}`;
      console.log('[CitationDisplay] 📥 Fetching PDF from:', pdfUrl);
      
      const response = await fetch(pdfUrl, {
        headers: {
          'X-API-Key': apiKey
        }
      });

      console.log('[CitationDisplay] PDF fetch response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create blob from PDF data
      const pdfBlob = await response.blob();
      console.log('[CitationDisplay] 📄 PDF blob created, size:', pdfBlob.size, 'bytes');
      
      // Create blob URL and open in new tab
      const blobUrl = URL.createObjectURL(pdfBlob);
      console.log('[CitationDisplay] 🔗 Opening PDF blob URL:', blobUrl);
      
      const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      
      // Clean up blob URL after a delay to allow browser to load it
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        console.log('[CitationDisplay] 🧹 Cleaned up blob URL');
      }, 10000);
      
      if (!newWindow) {
        console.warn('[CitationDisplay] ⚠️ Popup blocked. Trying alternative approach...');
        // Fallback: create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = citation.filename;
        link.click();
      }

    } catch (error) {
      console.error('[CitationDisplay] ❌ Error loading PDF:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Could not open PDF: ${errorMessage}\n\nPlease check:\n- The document exists on the server\n- Your API key is valid\n- The server is running`);
    }
  };

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
              <button
                onClick={() => handleDocumentClick(citation)}
                className="font-medium text-fusion-blue-600 hover:text-fusion-blue-800 text-sm cursor-pointer transition-colors duration-200 flex items-center"
                title="Click to open PDF in new tab"
              >
                📄 {citation.filename}
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
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
