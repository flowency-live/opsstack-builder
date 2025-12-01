/**
 * Unit tests for SpecPreviewPanel component
 * Tests view toggling, content rendering, and slide-out animation
 * Requirements: 3.2, 3.5
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpecPreviewPanel from '../../components/SpecPreviewPanel';
import { Specification } from '@/lib/models/types';

describe('SpecPreviewPanel', () => {
  const mockSpecification: Specification = {
    id: 'spec-123',
    version: 1,
    lastUpdated: new Date('2024-01-01T12:00:00Z'),
    plainEnglishSummary: {
      overview: 'A booking system for appointments',
      keyFeatures: ['Online booking', 'Calendar integration', 'Email notifications'],
      targetUsers: 'Small business owners and their customers',
      integrations: ['Google Calendar', 'Stripe'],
      estimatedComplexity: 'Medium',
    },
    formalPRD: {
      introduction: 'This system enables online appointment booking.',
      glossary: {
        'Booking System': 'A software system that manages appointments',
        'User': 'A person who books appointments',
      },
      requirements: [
        {
          id: 'REQ-1',
          userStory: 'As a user, I want to book appointments online',
          acceptanceCriteria: [
            'User can select date and time',
            'User receives confirmation email',
          ],
          priority: 'must-have',
        },
        {
          id: 'REQ-2',
          userStory: 'As a user, I want to cancel appointments',
          acceptanceCriteria: ['User can cancel up to 24 hours before'],
          priority: 'nice-to-have',
        },
      ],
      nonFunctionalRequirements: [
        {
          id: 'NFR-1',
          category: 'Performance',
          description: 'System should respond within 2 seconds',
        },
      ],
    },
  };

  const defaultProps = {
    sessionId: 'session-123',
    specification: mockSpecification,
    viewMode: 'simple' as const,
    onViewModeChange: jest.fn(),
    isOpen: true,
    onToggle: jest.fn(),
    onExport: jest.fn(),
    onShare: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('View Toggling', () => {
    it('should render simple view by default when viewMode is simple', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      // Check for simple view content
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('A booking system for appointments')).toBeInTheDocument();
      expect(screen.getByText('Key Features')).toBeInTheDocument();
      expect(screen.getByText('Online booking')).toBeInTheDocument();
    });

    it('should render detailed view when viewMode is detailed', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      // Check for detailed view content
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('This system enables online appointment booking.')).toBeInTheDocument();
      expect(screen.getByText('Glossary')).toBeInTheDocument();
      expect(screen.getByText('Booking System')).toBeInTheDocument();
    });

    it('should call onViewModeChange when Simple View button is clicked', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      const simpleViewButton = screen.getByText('Simple View');
      fireEvent.click(simpleViewButton);

      expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('simple');
    });

    it('should call onViewModeChange when Detailed View button is clicked', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="simple" />);

      const detailedViewButton = screen.getByText('Detailed View');
      fireEvent.click(detailedViewButton);

      expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('detailed');
    });

    it('should highlight active view button', () => {
      const { rerender } = render(<SpecPreviewPanel {...defaultProps} viewMode="simple" />);

      const simpleButton = screen.getByText('Simple View');
      expect(simpleButton).toHaveClass('bg-[var(--color-primary)]');

      rerender(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      const detailedButton = screen.getByText('Detailed View');
      expect(detailedButton).toHaveClass('bg-[var(--color-primary)]');
    });
  });

  describe('Content Rendering - Simple View', () => {
    it('should render all sections in simple view', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Key Features')).toBeInTheDocument();
      expect(screen.getByText('Target Users')).toBeInTheDocument();
      expect(screen.getByText('Integrations')).toBeInTheDocument();
      expect(screen.getByText('Estimated Complexity')).toBeInTheDocument();
    });

    it('should render all key features', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Online booking')).toBeInTheDocument();
      expect(screen.getByText('Calendar integration')).toBeInTheDocument();
      expect(screen.getByText('Email notifications')).toBeInTheDocument();
    });

    it('should render all integrations', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Google Calendar')).toBeInTheDocument();
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    it('should render target users', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Small business owners and their customers')).toBeInTheDocument();
    });

    it('should render complexity with appropriate styling', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      const complexityBadge = screen.getByText('Medium');
      expect(complexityBadge).toBeInTheDocument();
      expect(complexityBadge).toHaveClass('bg-[var(--color-warning)]/20');
    });

    it('should show placeholder when no features are defined', () => {
      const emptySpec = {
        ...mockSpecification,
        plainEnglishSummary: {
          ...mockSpecification.plainEnglishSummary,
          keyFeatures: [],
        },
      };

      render(<SpecPreviewPanel {...defaultProps} specification={emptySpec} />);

      expect(screen.getByText('No features defined yet.')).toBeInTheDocument();
    });

    it('should not render integrations section when empty', () => {
      const noIntegrationsSpec = {
        ...mockSpecification,
        plainEnglishSummary: {
          ...mockSpecification.plainEnglishSummary,
          integrations: [],
        },
      };

      render(<SpecPreviewPanel {...defaultProps} specification={noIntegrationsSpec} />);

      expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
    });
  });

  describe('Content Rendering - Detailed View', () => {
    it('should render all sections in detailed view', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Glossary')).toBeInTheDocument();
      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(screen.getByText('Non-Functional Requirements')).toBeInTheDocument();
    });

    it('should render all requirements with correct details', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      expect(screen.getByText('REQ-1')).toBeInTheDocument();
      expect(screen.getByText('As a user, I want to book appointments online')).toBeInTheDocument();
      expect(screen.getByText('User can select date and time')).toBeInTheDocument();
      expect(screen.getByText('User receives confirmation email')).toBeInTheDocument();
    });

    it('should render priority badges correctly', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      const mustHaveBadges = screen.getAllByText('must-have');
      expect(mustHaveBadges.length).toBeGreaterThan(0);
      expect(mustHaveBadges[0]).toHaveClass('bg-[var(--color-destructive)]/20');

      const niceToHaveBadges = screen.getAllByText('nice-to-have');
      expect(niceToHaveBadges.length).toBeGreaterThan(0);
      expect(niceToHaveBadges[0]).toHaveClass('bg-[var(--color-warning)]/20');
    });

    it('should render glossary terms and definitions', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      expect(screen.getByText('Booking System')).toBeInTheDocument();
      expect(screen.getByText('A software system that manages appointments')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('A person who books appointments')).toBeInTheDocument();
    });

    it('should render non-functional requirements', () => {
      render(<SpecPreviewPanel {...defaultProps} viewMode="detailed" />);

      expect(screen.getByText('NFR-1')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('System should respond within 2 seconds')).toBeInTheDocument();
    });

    it('should show placeholder when no requirements are defined', () => {
      const emptySpec = {
        ...mockSpecification,
        formalPRD: {
          ...mockSpecification.formalPRD,
          requirements: [],
        },
      };

      render(<SpecPreviewPanel {...defaultProps} specification={emptySpec} viewMode="detailed" />);

      expect(screen.getByText('No requirements defined yet.')).toBeInTheDocument();
    });

    it('should not render glossary section when empty', () => {
      const noGlossarySpec = {
        ...mockSpecification,
        formalPRD: {
          ...mockSpecification.formalPRD,
          glossary: {},
        },
      };

      render(<SpecPreviewPanel {...defaultProps} specification={noGlossarySpec} viewMode="detailed" />);

      expect(screen.queryByText('Glossary')).not.toBeInTheDocument();
    });

    it('should not render NFR section when empty', () => {
      const noNFRSpec = {
        ...mockSpecification,
        formalPRD: {
          ...mockSpecification.formalPRD,
          nonFunctionalRequirements: [],
        },
      };

      render(<SpecPreviewPanel {...defaultProps} specification={noNFRSpec} viewMode="detailed" />);

      expect(screen.queryByText('Non-Functional Requirements')).not.toBeInTheDocument();
    });
  });

  describe('Slide-out Animation', () => {
    it('should apply translate-x-0 class when isOpen is true', () => {
      const { container } = render(<SpecPreviewPanel {...defaultProps} isOpen={true} />);

      const panel = container.querySelector('.fixed.right-0');
      expect(panel).toHaveClass('translate-x-0');
    });

    it('should apply translate-x-full class when isOpen is false', () => {
      const { container } = render(<SpecPreviewPanel {...defaultProps} isOpen={false} />);

      const panel = container.querySelector('.fixed.right-0');
      expect(panel).toHaveClass('translate-x-full');
    });

    it('should render overlay when panel is open', () => {
      const { container } = render(<SpecPreviewPanel {...defaultProps} isOpen={true} />);

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
    });

    it('should not render overlay when panel is closed', () => {
      const { container } = render(<SpecPreviewPanel {...defaultProps} isOpen={false} />);

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should call onToggle when overlay is clicked', () => {
      const { container } = render(<SpecPreviewPanel {...defaultProps} isOpen={true} />);

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(defaultProps.onToggle).toHaveBeenCalled();
    });

    it('should call onToggle when close button is clicked', () => {
      render(<SpecPreviewPanel {...defaultProps} isOpen={true} />);

      const closeButton = screen.getByLabelText('Close panel');
      fireEvent.click(closeButton);

      expect(defaultProps.onToggle).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('should call onExport when Export button is clicked', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      expect(defaultProps.onExport).toHaveBeenCalled();
    });

    it('should call onShare when Share button is clicked', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      expect(defaultProps.onShare).toHaveBeenCalled();
    });
  });

  describe('Metadata Display', () => {
    it('should display version number', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    it('should display last updated timestamp', () => {
      render(<SpecPreviewPanel {...defaultProps} />);

      const lastUpdatedText = screen.getByText(/Last updated:/);
      expect(lastUpdatedText).toBeInTheDocument();
    });
  });

  describe('Recently Updated Sections', () => {
    it('should highlight recently updated sections with ring and badge', () => {
      render(
        <SpecPreviewPanel
          {...defaultProps}
          recentlyUpdatedSections={['overview', 'features']}
        />
      );

      const updatedBadges = screen.getAllByText('Updated');
      expect(updatedBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('should not show updated badge for non-updated sections', () => {
      render(
        <SpecPreviewPanel
          {...defaultProps}
          recentlyUpdatedSections={['overview']}
        />
      );

      const updatedBadges = screen.getAllByText('Updated');
      // Only overview should have the badge
      expect(updatedBadges.length).toBe(1);
    });

    it('should apply pulse-glow animation to recently updated sections', () => {
      const { container } = render(
        <SpecPreviewPanel
          {...defaultProps}
          recentlyUpdatedSections={['overview']}
        />
      );

      const sections = container.querySelectorAll('.animate-pulse-glow');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive width classes', () => {
      const { container } = render(<SpecPreviewPanel {...defaultProps} />);

      const panel = container.querySelector('.fixed.right-0');
      expect(panel).toHaveClass('w-full');
      expect(panel).toHaveClass('md:w-[600px]');
      expect(panel).toHaveClass('lg:w-[700px]');
    });
  });
});
