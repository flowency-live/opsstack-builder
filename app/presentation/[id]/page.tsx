/**
 * Presentation Page
 * Branded presentation page for sharing specifications
 * 
 * Requirements: 7.3
 */

import { notFound } from 'next/navigation';
import { exportService } from '@/lib/services/export-service';
import type { Specification } from '@/lib/models/types';

interface PresentationPageProps {
  params: {
    id: string;
  };
}

export default async function PresentationPage({ params }: PresentationPageProps) {
  const { id } = params;

  // Get presentation data
  const presentationData = await exportService.getPresentationData(id);

  if (!presentationData) {
    notFound();
  }

  const { specification, createdAt } = presentationData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Product Specification
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Created {new Date(createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-600">
                Flowency Build
              </div>
              <div className="text-xs text-gray-500">by FlowencyBuild</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive Summary */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
            Executive Summary
          </h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {specification.plainEnglishSummary.overview || 'No overview provided yet.'}
            </p>
            
            {specification.plainEnglishSummary.estimatedComplexity && (
              <div className="mt-4">
                <span className="font-semibold text-gray-900">Estimated Complexity: </span>
                <span className="text-gray-700">
                  {specification.plainEnglishSummary.estimatedComplexity}
                </span>
              </div>
            )}
            
            {specification.plainEnglishSummary.targetUsers && (
              <div className="mt-2">
                <span className="font-semibold text-gray-900">Target Users: </span>
                <span className="text-gray-700">
                  {specification.plainEnglishSummary.targetUsers}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Key Features */}
        {specification.plainEnglishSummary.keyFeatures.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
              Key Features
            </h2>
            <ul className="space-y-3">
              {specification.plainEnglishSummary.keyFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5"
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
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Integrations */}
        {specification.plainEnglishSummary.integrations.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
              Integrations
            </h2>
            <ul className="space-y-3">
              {specification.plainEnglishSummary.integrations.map((integration, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="text-gray-700">{integration}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Formal PRD */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
            Product Requirements Document
          </h2>
          
          {specification.formalPRD.introduction && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Introduction</h3>
              <p className="text-gray-700 leading-relaxed">
                {specification.formalPRD.introduction}
              </p>
            </div>
          )}
          
          {Object.keys(specification.formalPRD.glossary).length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Glossary</h3>
              <dl className="space-y-2">
                {Object.entries(specification.formalPRD.glossary).map(([term, definition]) => (
                  <div key={term} className="border-l-4 border-purple-300 pl-4">
                    <dt className="font-semibold text-purple-700">{term}</dt>
                    <dd className="text-gray-700 mt-1">{definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>

        {/* Requirements */}
        {specification.formalPRD.requirements.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
              Functional Requirements
            </h2>
            <div className="space-y-6">
              {specification.formalPRD.requirements.map((req) => (
                <div key={req.id} className="border-l-4 border-purple-400 pl-6 py-2">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{req.id}</h3>
                    <span
                      className={`ml-3 px-3 py-1 text-xs font-bold rounded-full ${
                        req.priority === 'must-have'
                          ? 'bg-yellow-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {req.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 italic mb-3">{req.userStory}</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Acceptance Criteria:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {req.acceptanceCriteria.map((criteria, index) => (
                        <li key={index}>{criteria}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Non-Functional Requirements */}
        {specification.formalPRD.nonFunctionalRequirements.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
              Non-Functional Requirements
            </h2>
            <div className="space-y-4">
              {specification.formalPRD.nonFunctionalRequirements.map((nfr) => (
                <div key={nfr.id} className="border-l-4 border-indigo-400 pl-6 py-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {nfr.id} - {nfr.category}
                  </h3>
                  <p className="text-gray-700 mt-1">{nfr.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-gray-600">
          <p className="text-sm">
            Generated by Flowency Build - FlowencyBuild
          </p>
          <p className="text-xs mt-2">
            This document is confidential and intended for the recipient only.
          </p>
        </footer>
      </main>
    </div>
  );
}
