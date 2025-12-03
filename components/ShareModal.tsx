'use client';

import React from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  specTitle?: string;
}

export function ShareModal({ isOpen, onClose, shareUrl, specTitle = 'My Specification' }: ShareModalProps) {
  if (!isOpen) return null;

  const shareText = `Check out my specification: ${specTitle}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(specTitle);
    const body = encodeURIComponent(`I'd like to share my specification with you:\n\n${shareUrl}\n\nView and continue the specification using this link.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSMS = () => {
    const body = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.location.href = `sms:?&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: specTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Share Specification</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Share link display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Share Link:</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-900 flex-1 truncate font-mono">{shareUrl}</p>
              <button
                onClick={handleCopyLink}
                className="flex-shrink-0 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Share options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Share via:</p>

            {/* Native share (mobile) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-gray-900 font-medium">More options...</span>
              </button>
            )}

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="text-gray-900 font-medium">WhatsApp</span>
            </button>

            {/* Email */}
            <button
              onClick={handleEmail}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-900 font-medium">Email</span>
            </button>

            {/* SMS */}
            <button
              onClick={handleSMS}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-gray-900 font-medium">Text Message</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600">
            Anyone with this link can view and continue this specification.
          </p>
        </div>
      </div>
    </div>
  );
}
