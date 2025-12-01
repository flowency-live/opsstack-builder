'use client';

import { useState, useEffect, useRef } from 'react';
import { Specification } from '@/lib/models/types';

export interface SpecPreviewPanelProps {
  sessionId: string;
  specification: Specification;
  viewMode: 'simple' | 'detailed';
  onViewModeChange: (mode: 'simple' | 'detailed') => void;
  isOpen: boolean;
  onToggle: () => void;
  onExport?: () => void;
  onShare?: () => void;
  recentlyUpdatedSections?: string[];
}

export function SpecPreviewPanel({
  sessionId,
  specification,
  viewMode,
  onViewModeChange,
  isOpen,
  onToggle,
  onExport,
  onShare,
  recentlyUpdatedSections = [],
}: SpecPreviewPanelProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const isRecentlyUpdated = (sectionId: string) => {
    return recentlyUpdatedSections.includes(sectionId);
  };

  const renderSimpleView = () => {
    const { plainEnglishSummary } = specification;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Overview Section */}
        <section
          className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
            isRecentlyUpdated('overview') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
          }`}
        >
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Overview
            {isRecentlyUpdated('overview') && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
            )}
          </h3>
          <p className="text-[var(--color-muted)] leading-relaxed">
            {plainEnglishSummary.overview || 'No overview yet. Keep chatting to build your specification.'}
          </p>
        </section>

        {/* Key Features Section */}
        <section
          className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
            isRecentlyUpdated('features') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
          }`}
        >
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Key Features
            {isRecentlyUpdated('features') && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
            )}
          </h3>
          {plainEnglishSummary.keyFeatures.length > 0 ? (
            <ul className="space-y-2">
              {plainEnglishSummary.keyFeatures.map((feature, index) => (
                <li key={index} className="flex items-start text-[var(--color-muted)]">
                  <span className="mr-2 text-[var(--color-primary)]">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--color-muted)] italic">No features defined yet.</p>
          )}
        </section>

        {/* Target Users Section */}
        <section
          className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
            isRecentlyUpdated('users') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
          }`}
        >
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Target Users
            {isRecentlyUpdated('users') && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
            )}
          </h3>
          <p className="text-[var(--color-muted)]">
            {plainEnglishSummary.targetUsers || 'Target users not specified yet.'}
          </p>
        </section>

        {/* Integrations Section */}
        {plainEnglishSummary.integrations.length > 0 && (
          <section
            className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
              isRecentlyUpdated('integrations') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
            }`}
          >
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Integrations
              {isRecentlyUpdated('integrations') && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {plainEnglishSummary.integrations.map((integration, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] rounded-full text-sm border border-[var(--color-border)]"
                >
                  {integration}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Complexity Estimate */}
        {plainEnglishSummary.estimatedComplexity && (
          <section className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Estimated Complexity
            </h3>
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                plainEnglishSummary.estimatedComplexity === 'Simple'
                  ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                  : plainEnglishSummary.estimatedComplexity === 'Medium'
                  ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                  : 'bg-[var(--color-destructive)]/20 text-[var(--color-destructive)]'
              }`}
            >
              {plainEnglishSummary.estimatedComplexity}
            </span>
          </section>
        )}
      </div>
    );
  };

  const renderDetailedView = () => {
    const { formalPRD } = specification;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Introduction */}
        <section
          className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
            isRecentlyUpdated('introduction') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
          }`}
        >
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
            Introduction
            {isRecentlyUpdated('introduction') && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
            )}
          </h3>
          <p className="text-[var(--color-muted)] leading-relaxed">
            {formalPRD.introduction || 'Introduction will be generated as we gather more information.'}
          </p>
        </section>

        {/* Glossary */}
        {Object.keys(formalPRD.glossary).length > 0 && (
          <section
            className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
              isRecentlyUpdated('glossary') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
            }`}
          >
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
              Glossary
              {isRecentlyUpdated('glossary') && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
              )}
            </h3>
            <dl className="space-y-3">
              {Object.entries(formalPRD.glossary).map(([term, definition]) => (
                <div key={term} className="border-l-2 border-[var(--color-primary)] pl-3">
                  <dt className="font-semibold text-[var(--color-foreground)]">{term}</dt>
                  <dd className="text-[var(--color-muted)] mt-1">{definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Requirements */}
        <section
          className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
            isRecentlyUpdated('requirements') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
          }`}
        >
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
            Requirements
            {isRecentlyUpdated('requirements') && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
            )}
          </h3>
          {formalPRD.requirements.length > 0 ? (
            <div className="space-y-4">
              {formalPRD.requirements.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] border border-[var(--color-border)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-[var(--color-muted)]">{req.id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        req.priority === 'must-have'
                          ? 'bg-[var(--color-destructive)]/20 text-[var(--color-destructive)]'
                          : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                      }`}
                    >
                      {req.priority}
                    </span>
                  </div>
                  <p className="text-[var(--color-foreground)] mb-2 italic">{req.userStory}</p>
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Acceptance Criteria:</p>
                    <ul className="space-y-1">
                      {req.acceptanceCriteria.map((criteria, index) => (
                        <li key={index} className="text-sm text-[var(--color-muted)] flex items-start">
                          <span className="mr-2 text-[var(--color-primary)]">•</span>
                          <span>{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-muted)] italic">No requirements defined yet.</p>
          )}
        </section>

        {/* Non-Functional Requirements */}
        {formalPRD.nonFunctionalRequirements.length > 0 && (
          <section
            className={`p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] ${
              isRecentlyUpdated('nfr') ? 'ring-2 ring-[var(--color-primary)] animate-pulse-glow' : ''
            }`}
          >
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center">
              Non-Functional Requirements
              {isRecentlyUpdated('nfr') && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">Updated</span>
              )}
            </h3>
            <div className="space-y-3">
              {formalPRD.nonFunctionalRequirements.map((nfr) => (
                <div
                  key={nfr.id}
                  className="p-3 bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] border border-[var(--color-border)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-[var(--color-muted)]">{nfr.id}</span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full">
                      {nfr.category}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">{nfr.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onToggle}
          style={{ opacity: isAnimating ? 0 : 1 }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] bg-[var(--color-background)] border-l border-[var(--color-border)] z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Specification Preview</h2>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={() => onViewModeChange('simple')}
              className={`flex-1 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                viewMode === 'simple'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              }`}
            >
              Simple View
            </button>
            <button
              onClick={() => onViewModeChange('detailed')}
              className={`flex-1 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              }`}
            >
              Detailed View
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onExport}
              className="flex-1 px-4 py-2 bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary)] transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
            <button
              onClick={onShare}
              className="flex-1 px-4 py-2 bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary)] transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>
          </div>

          {/* Metadata */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted)]">
            <span>Version {specification.version}</span>
            <span>Last updated: {new Date(specification.lastUpdated).toLocaleString()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-240px)] px-6 py-6">
          {viewMode === 'simple' ? renderSimpleView() : renderDetailedView()}
        </div>
      </div>
    </>
  );
}


export default SpecPreviewPanel;
