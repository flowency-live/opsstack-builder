'use client';

/**
 * SubmissionConfirmation Component
 * Displays confirmation after successful submission with reference number
 */

import React from 'react';

export interface SubmissionConfirmationProps {
  referenceNumber: string;
  contactEmail: string;
  onClose?: () => void;
}

export const SubmissionConfirmation: React.FC<SubmissionConfirmationProps> = ({
  referenceNumber,
  contactEmail,
  onClose,
}) => {
  return (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Specification Submitted Successfully!
        </h2>
        <p className="text-gray-600">
          Thank you for submitting your specification. We'll review it and get back to you soon.
        </p>
      </div>

      {/* Reference Number */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-sm text-gray-600 mb-2">Your Reference Number</p>
        <p className="text-2xl font-mono font-bold text-blue-600">{referenceNumber}</p>
        <p className="text-sm text-gray-500 mt-2">
          Please save this reference number for your records
        </p>
      </div>

      {/* Next Steps */}
      <div className="bg-gray-50 rounded-lg p-6 text-left">
        <h3 className="text-lg font-medium text-gray-900 mb-3">What happens next?</h3>
        <ol className="space-y-3 text-gray-600">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              1
            </span>
            <span>
              You'll receive a confirmation email at <strong>{contactEmail}</strong> with your
              specification and reference number.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              2
            </span>
            <span>
              Our team will review your specification and may reach out for clarification if needed.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              3
            </span>
            <span>
              We'll prepare a detailed quotation and timeline for your project, typically within 2-3
              business days.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              4
            </span>
            <span>
              Once you approve the quotation, we'll execute an NDA and begin detailed planning.
            </span>
          </li>
        </ol>
      </div>

      {/* NDA Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-gray-900">Confidentiality & NDA Process</h4>
            <p className="text-sm text-gray-700">
              <strong>Before detailed discussions:</strong> We will execute a Non-Disclosure Agreement (NDA) 
              to protect your confidential information. This typically happens after we review your 
              specification and before we begin detailed planning discussions.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Your information is secure:</strong> All data you've shared is encrypted and stored 
              securely. We treat your project information with the utmost confidentiality.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Next steps:</strong> Once you approve our quotation, we'll send you an NDA for 
              signature before proceeding with any confidential technical discussions or detailed planning.
            </p>
          </div>
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Close
        </button>
      )}
    </div>
  );
};
