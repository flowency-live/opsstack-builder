'use client';

/**
 * ExportModal Component
 * Modal for exporting and sharing specifications
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState } from 'react';
import type { Specification } from '../lib/models/types';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  specification: Specification;
}

type ExportFormat = 'pdf' | 'email' | 'share';

export function ExportModal({
  isOpen,
  onClose,
  sessionId,
  specification,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!selectedFormat) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedFormat === 'pdf') {
        // Download PDF
        const response = await fetch(`/api/export/pdf?sessionId=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `specification-${sessionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess('PDF downloaded successfully!');
      } else if (selectedFormat === 'email') {
        // Send email
        if (!email || !email.includes('@')) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/export/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            recipient: email,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send email');
        }

        setSuccess(`Email sent successfully to ${email}!`);
        setEmail('');
      } else if (selectedFormat === 'share') {
        // Generate share link
        const response = await fetch(`/api/export/share?sessionId=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to generate share link');
        }

        const data = await response.json();
        setShareLink(data.shareLink);
        setSuccess('Share link generated successfully!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Export & Share
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Format Selection */}
          {!selectedFormat && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Choose how you'd like to export or share your specification:
              </p>

              <button
                onClick={() => setSelectedFormat('pdf')}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-semibold text-gray-900">Download PDF</h3>
                  <p className="text-sm text-gray-600">
                    Get a professionally formatted PDF document
                  </p>
                </div>
              </button>

              <button
                onClick={() => setSelectedFormat('email')}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-semibold text-gray-900">Email PDF</h3>
                  <p className="text-sm text-gray-600">
                    Send the PDF and magic link via email
                  </p>
                </div>
              </button>

              <button
                onClick={() => setSelectedFormat('share')}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-semibold text-gray-900">Share Link</h3>
                  <p className="text-sm text-gray-600">
                    Generate a shareable presentation page
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Email Input */}
          {selectedFormat === 'email' && !success && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedFormat(null)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Share Link Display */}
          {selectedFormat === 'share' && shareLink && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedFormat(null);
                  setShareLink(null);
                }}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shareable Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(shareLink)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Share this link with stakeholders to view your specification
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
          {selectedFormat && !shareLink && !success && (
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
