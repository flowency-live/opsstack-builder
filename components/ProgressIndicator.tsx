'use client';

import { ProgressState, Topic } from '@/lib/models/types';

export interface ProgressIndicatorProps {
  sessionId: string;
  progress: ProgressState;
}

export default function ProgressIndicator({
  sessionId,
  progress,
}: ProgressIndicatorProps) {
  const { topics, overallCompleteness, projectComplexity } = progress;

  // Get status icon and color
  const getStatusIcon = (status: Topic['status']) => {
    switch (status) {
      case 'complete':
        return (
          <svg
            className="w-5 h-5 text-[var(--color-success)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'in-progress':
        return (
          <svg
            className="w-5 h-5 text-[var(--color-warning)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'not-started':
      default:
        return (
          <svg
            className="w-5 h-5 text-[var(--color-muted)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // Get complexity badge color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simple':
        return 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/30';
      case 'Medium':
        return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30';
      case 'Complex':
        return 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30';
      default:
        return 'bg-[var(--color-muted)]/20 text-[var(--color-muted)] border-[var(--color-muted)]/30';
    }
  };

  // Get progress bar color based on completeness
  const getProgressColor = () => {
    if (overallCompleteness >= 80) return 'bg-[var(--color-success)]';
    if (overallCompleteness >= 50) return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-primary)]';
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Specification Progress
        </h2>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full border ${getComplexityColor(
            projectComplexity
          )}`}
        >
          {projectComplexity} Project
        </span>
      </div>

      {/* Overall Completeness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted)]">Overall Completeness</span>
          <span className="font-semibold text-[var(--color-foreground)]">
            {overallCompleteness}%
          </span>
        </div>
        <div className="w-full h-3 bg-[var(--color-input)] rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${overallCompleteness}%` }}
          />
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-muted)] uppercase tracking-wide">
          Topics to Cover
        </h3>
        <div className="space-y-2">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center space-x-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              <div className="flex-shrink-0">{getStatusIcon(topic.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-sm font-medium ${
                      topic.status === 'complete'
                        ? 'text-[var(--color-foreground)]'
                        : topic.status === 'in-progress'
                        ? 'text-[var(--color-warning)]'
                        : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {topic.name}
                  </span>
                  {topic.required && (
                    <span className="text-xs text-[var(--color-destructive)]">
                      *
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span
                  className={`text-xs ${
                    topic.status === 'complete'
                      ? 'text-[var(--color-success)]'
                      : topic.status === 'in-progress'
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-muted)]'
                  }`}
                >
                  {topic.status === 'complete'
                    ? 'Done'
                    : topic.status === 'in-progress'
                    ? 'In Progress'
                    : 'Not Started'}
                </span>
              </div>
            </div>
          ))}
        </div>
        {topics.some((t) => t.required) && (
          <p className="text-xs text-[var(--color-muted)] mt-3">
            <span className="text-[var(--color-destructive)]">*</span> Required
            for submission
          </p>
        )}
      </div>

      {/* Status Message */}
      {overallCompleteness === 100 ? (
        <div className="p-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-[var(--radius-md)]">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--color-success)]">
                Specification Complete!
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                All required topics have been covered. You're ready to submit.
              </p>
            </div>
          </div>
        </div>
      ) : overallCompleteness >= 50 ? (
        <div className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-[var(--radius-md)]">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--color-warning)]">
                Making Good Progress
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Keep going! A few more topics to cover.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-[var(--radius-md)]">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--color-primary)]">
                Just Getting Started
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                I'll guide you through each topic as we build your specification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
