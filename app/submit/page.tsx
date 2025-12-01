'use client';

/**
 * Submission Page
 * Page for submitting specifications with contact information
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SubmissionForm } from '../../components/SubmissionForm';
import { SubmissionConfirmation } from '../../components/SubmissionConfirmation';
import type { ContactInfo } from '../../lib/models/types';

export default function SubmitPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
    }
  }, [sessionId, router]);

  const handleSubmit = async (contactInfo: ContactInfo) => {
    setIsSubmitting(true);
    setError(null);
    setValidationErrors([]);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          contactInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        }
        setError(data.error || 'Submission failed');
        return;
      }

      // Success
      setReferenceNumber(data.submission.referenceNumber);
      setContactEmail(contactInfo.email || '');
      setSubmissionComplete(true);
    } catch (err) {
      console.error('Submission error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/chat?sessionId=${sessionId}`);
  };

  const handleClose = () => {
    router.push('/');
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {submissionComplete ? (
            <SubmissionConfirmation
              referenceNumber={referenceNumber}
              contactEmail={contactEmail}
              onClose={handleClose}
            />
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      {validationErrors.length > 0 && (
                        <div className="mt-2 text-sm text-red-700">
                          <ul className="list-disc list-inside space-y-1">
                            {validationErrors.map((err, index) => (
                              <li key={index}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <SubmissionForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
