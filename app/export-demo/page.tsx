'use client';

/**
 * Export Demo Page
 * Demonstrates the export and share functionality
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState } from 'react';
import SpecPreviewPanel from '@/components/SpecPreviewPanel';
import { ExportModal } from '@/components/ExportModal';
import type { Specification } from '@/lib/models/types';

export default function ExportDemoPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Demo specification data
  const demoSpecification: Specification = {
    id: 'demo-spec-1',
    version: 1,
    plainEnglishSummary: {
      overview:
        'A modern task management application that helps teams collaborate effectively. The system will allow users to create, assign, and track tasks with real-time updates and notifications.',
      targetUsers:
        'Small to medium-sized teams (5-50 members) looking for a simple yet powerful task management solution',
      keyFeatures: [
        'Create and manage tasks with priorities and due dates',
        'Assign tasks to team members',
        'Real-time collaboration and updates',
        'Email and in-app notifications',
        'Dashboard with analytics and reporting',
        'Mobile-responsive design',
      ],
      flows: [
        'User logs in → Views dashboard → Creates new task → Assigns to team member → Team member receives notification',
        'Team member opens app → Views assigned tasks → Updates task status → System sends update notification',
      ],
      rulesAndConstraints: [
        'Tasks must have a title and due date',
        'Only team leads can delete tasks',
        'Notifications must be sent within 5 seconds of task updates',
      ],
      nonFunctional: [
        'System must support up to 1000 concurrent users',
        'Page load times must be under 2 seconds',
        'Must work on mobile devices',
      ],
      mvpDefinition: {
        included: [
          'Basic task creation and assignment',
          'Email notifications',
          'Simple dashboard',
        ],
        excluded: [
          'Advanced analytics',
          'Third-party integrations',
          'Custom workflows',
        ],
      },
    },
    formalPRD: {
      introduction:
        'This document specifies the requirements for a collaborative task management system designed for small to medium-sized teams. The system will provide core task management functionality with real-time collaboration features.',
      glossary: {
        'Task Management System':
          'The software application being developed for managing tasks and team collaboration',
        'Task': 'A unit of work that can be assigned, tracked, and completed',
        'Team Member': 'A user who has access to the system and can be assigned tasks',
        Dashboard: 'The main interface showing task overview and analytics',
      },
      requirements: [
        {
          id: 'REQ-1',
          userStory:
            'As a team lead, I want to create tasks with details, so that I can organize work for my team',
          acceptanceCriteria: [
            'WHEN a user creates a task THEN the system SHALL capture title, description, priority, and due date',
            'WHEN a task is created THEN the system SHALL assign a unique identifier',
            'WHEN a task is saved THEN the system SHALL persist it to the database',
          ],
          priority: 'must-have',
        },
        {
          id: 'REQ-2',
          userStory:
            'As a team member, I want to receive notifications about task assignments, so that I stay informed',
          acceptanceCriteria: [
            'WHEN a task is assigned to a user THEN the system SHALL send an email notification',
            'WHEN a task is assigned THEN the system SHALL show an in-app notification',
            'WHEN a user views notifications THEN the system SHALL mark them as read',
          ],
          priority: 'must-have',
        },
        {
          id: 'REQ-3',
          userStory:
            'As a manager, I want to view team analytics, so that I can track productivity',
          acceptanceCriteria: [
            'WHEN viewing the dashboard THEN the system SHALL display task completion rates',
            'WHEN viewing analytics THEN the system SHALL show tasks by status',
            'WHEN generating reports THEN the system SHALL allow export to CSV',
          ],
          priority: 'nice-to-have',
        },
      ],
      nonFunctionalRequirements: [
        {
          id: 'NFR-1',
          category: 'Performance',
          description:
            'The system SHALL load the dashboard within 2 seconds under normal network conditions',
        },
        {
          id: 'NFR-2',
          category: 'Security',
          description:
            'The system SHALL encrypt all data in transit using TLS 1.3 and at rest using AES-256',
        },
        {
          id: 'NFR-3',
          category: 'Scalability',
          description:
            'The system SHALL support up to 1000 concurrent users without performance degradation',
        },
      ],
    },
    lastUpdated: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Export & Share Demo
              </h1>
              <p className="text-gray-600 mt-2">
                Test the export and share functionality with a sample specification
              </p>
            </div>
            <button
              onClick={() => setIsPanelOpen(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>View Specification</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Available Export Options
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* PDF Export */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                PDF Export
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Download a professionally formatted PDF document with your complete
                specification
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Executive summary</li>
                <li>✓ Detailed requirements</li>
                <li>✓ Branded template</li>
                <li>✓ Ready to share</li>
              </ul>
            </div>

            {/* Email */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Email Delivery
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Send the PDF and a magic link directly to your email or stakeholders
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ PDF attachment</li>
                <li>✓ Magic link included</li>
                <li>✓ Professional template</li>
                <li>✓ Instant delivery</li>
              </ul>
            </div>

            {/* Share Link */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Shareable Link
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Generate a branded presentation page hosted on opstack.uk
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Beautiful presentation</li>
                <li>✓ No download required</li>
                <li>✓ Easy to share</li>
                <li>✓ Mobile-friendly</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Try It Out
            </h3>
            <p className="text-gray-700 mb-4">
              Click "View Specification" above to open the preview panel, then use
              the Export or Share buttons to test the functionality.
            </p>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Open Export Modal Directly
            </button>
          </div>
        </div>
      </main>

      {/* Spec Preview Panel */}
      <SpecPreviewPanel
        sessionId="demo-session"
        specification={demoSpecification}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
        onExport={() => setIsExportModalOpen(true)}
        onShare={() => setIsExportModalOpen(true)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessionId="demo-session"
        specification={demoSpecification}
      />
    </div>
  );
}
