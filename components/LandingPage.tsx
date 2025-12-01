'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl w-full space-y-12 animate-fade-in">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="gradient-text">Build Your Specification</span>
              <br />
              <span className="text-[var(--color-foreground)]">
                In Minutes, Not Days
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              Our AI-powered wizard guides you through creating a comprehensive 
              product specification for your software project. Just describe your 
              idea, and we'll help you build a complete requirements document.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link
              href="/chat"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-[var(--radius-lg)] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-pulse-glow"
            >
              <span className="relative z-10">Start Here</span>
              <svg
                className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>

          {/* Confidentiality Disclaimer */}
          <div className="glass-effect rounded-[var(--radius-xl)] p-6 sm:p-8 space-y-4 border border-[var(--color-border)]">
            <div className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 text-[var(--color-warning)] flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Important: Confidentiality Notice
                </h3>
                <p className="text-[var(--color-muted)] leading-relaxed">
                  Please <strong className="text-[var(--color-foreground)]">do not share confidential 
                  or company-sensitive information</strong> during this initial specification process. 
                  Keep your descriptions general until we establish a Non-Disclosure Agreement (NDA) 
                  after submission.
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Detailed confidential discussions will occur after your specification is submitted 
                  and an NDA is in place.
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-3 gap-6 pt-8">
            <div className="text-center space-y-3 p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--color-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-[var(--color-foreground)]">
                Conversational
              </h3>
              <p className="text-sm text-[var(--color-muted)]">
                Natural Q&A flow that adapts to your project
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--color-primary)]"
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
              </div>
              <h3 className="font-semibold text-[var(--color-foreground)]">
                Real-Time Preview
              </h3>
              <p className="text-sm text-[var(--color-muted)]">
                Watch your specification build as you chat
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--color-primary)]"
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
              </div>
              <h3 className="font-semibold text-[var(--color-foreground)]">
                Secure & Private
              </h3>
              <p className="text-sm text-[var(--color-muted)]">
                Your data is encrypted and protected
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 text-sm text-[var(--color-muted)]">
          <div className="flex items-center space-x-2">
            <span>Powered by</span>
            <span className="font-semibold text-[var(--color-secondary)]">
              FlowencyBuild
            </span>
          </div>
          <div className="flex space-x-6">
            <Link
              href="/terms"
              className="hover:text-[var(--color-primary)] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[var(--color-primary)] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
