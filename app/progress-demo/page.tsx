'use client';

import { useState } from 'react';
import ProgressIndicator from '@/components/ProgressIndicator';
import { ProgressState } from '@/lib/models/types';

export default function ProgressDemoPage() {
  const [progressState, setProgressState] = useState<ProgressState>({
    topics: [
      { id: 'overview', name: 'Project Overview', status: 'complete', required: true },
      { id: 'users', name: 'Target Users', status: 'complete', required: true },
      { id: 'features', name: 'Key Features', status: 'in-progress', required: true },
      { id: 'integrations', name: 'Integrations', status: 'not-started', required: true },
      { id: 'data', name: 'Data Requirements', status: 'not-started', required: true },
      { id: 'workflows', name: 'User Workflows', status: 'not-started', required: false },
    ],
    overallCompleteness: 42,
    projectComplexity: 'Medium',
  });

  const simulateProgress = () => {
    setProgressState((prev) => {
      const topics = [...prev.topics];
      // Find first not-started or in-progress topic and advance it
      const topicToAdvance = topics.find(
        (t) => t.status === 'not-started' || t.status === 'in-progress'
      );
      
      if (topicToAdvance) {
        if (topicToAdvance.status === 'not-started') {
          topicToAdvance.status = 'in-progress';
        } else if (topicToAdvance.status === 'in-progress') {
          topicToAdvance.status = 'complete';
        }
      }

      // Recalculate completeness
      const requiredTopics = topics.filter((t) => t.required);
      const completedCount = requiredTopics.filter((t) => t.status === 'complete').length;
      const inProgressCount = requiredTopics.filter((t) => t.status === 'in-progress').length;
      const totalProgress = completedCount + inProgressCount * 0.5;
      const overallCompleteness = Math.round((totalProgress / requiredTopics.length) * 100);

      return {
        ...prev,
        topics,
        overallCompleteness,
      };
    });
  };

  const resetProgress = () => {
    setProgressState({
      topics: [
        { id: 'overview', name: 'Project Overview', status: 'not-started', required: true },
        { id: 'users', name: 'Target Users', status: 'not-started', required: true },
        { id: 'features', name: 'Key Features', status: 'not-started', required: true },
        { id: 'integrations', name: 'Integrations', status: 'not-started', required: true },
        { id: 'data', name: 'Data Requirements', status: 'not-started', required: true },
        { id: 'workflows', name: 'User Workflows', status: 'not-started', required: false },
      ],
      overallCompleteness: 0,
      projectComplexity: 'Medium',
    });
  };

  const changeComplexity = (complexity: 'Simple' | 'Medium' | 'Complex') => {
    setProgressState((prev) => ({
      ...prev,
      projectComplexity: complexity,
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
            Progress Indicator Demo
          </h1>
          <p className="text-[var(--color-muted)]">
            Test the ProgressIndicator component with different states
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={simulateProgress}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Advance Progress
          </button>
          <button
            onClick={resetProgress}
            className="px-4 py-2 bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-border)] transition-colors"
          >
            Reset Progress
          </button>
          <button
            onClick={() => changeComplexity('Simple')}
            className="px-4 py-2 bg-[var(--color-success)] text-white rounded-[var(--radius-md)] hover:opacity-80 transition-opacity"
          >
            Simple
          </button>
          <button
            onClick={() => changeComplexity('Medium')}
            className="px-4 py-2 bg-[var(--color-warning)] text-white rounded-[var(--radius-md)] hover:opacity-80 transition-opacity"
          >
            Medium
          </button>
          <button
            onClick={() => changeComplexity('Complex')}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] hover:opacity-80 transition-opacity"
          >
            Complex
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <ProgressIndicator sessionId="demo-session" progress={progressState} />
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              Current State
            </h2>
            <pre className="text-xs text-[var(--color-muted)] overflow-auto">
              {JSON.stringify(progressState, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
