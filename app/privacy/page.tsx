import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-[var(--color-primary)] hover:text-[var(--color-primary-light)] mb-8 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>

        <div className="glass-effect rounded-[var(--radius-xl)] p-8 sm:p-12 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-foreground)] mb-4">
              Privacy Policy
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-6 text-[var(--color-muted-foreground)] leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                1. Information We Collect
              </h2>
              <p>
                We collect information you provide during the specification creation process, 
                including project descriptions, requirements, and contact information when you 
                submit a specification.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                2. How We Use Your Information
              </h2>
              <p>
                Your information is used to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Generate and maintain your product specifications</li>
                <li>Provide you with quotations and project proposals</li>
                <li>Improve our AI-powered OpsStack Builder</li>
                <li>Communicate with you about your project</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                3. Data Security
              </h2>
              <p>
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of data at rest and in transit</li>
                <li>Secure AWS infrastructure</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                4. Data Retention
              </h2>
              <p>
                We retain your specification data for a minimum of 30 days to allow session 
                restoration. Submitted specifications are retained for quotation and project 
                management purposes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                5. Your Rights (GDPR Compliance)
              </h2>
              <p>
                Under GDPR and other data protection regulations, you have the following rights:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data (see below)</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured format</li>
                <li><strong>Right to Object:</strong> Object to processing of your data</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="mt-4">
                <strong>To exercise your data deletion rights:</strong> You can request deletion of 
                your data by contacting us with your email address and session ID. We will process 
                your request within 30 days and permanently delete all associated data including 
                conversation history, specifications, and contact information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                6. Cookies and Tracking
              </h2>
              <p>
                We use browser local storage to maintain your session state and provide a 
                seamless experience across devices. No third-party tracking cookies are used.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                7. Third-Party Services
              </h2>
              <p>
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>AWS (data storage and infrastructure)</li>
                <li>OpenAI/Anthropic (AI language models)</li>
              </ul>
              <p className="mt-2">
                These services have their own privacy policies and security measures.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                8. Changes to This Policy
              </h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any 
                changes by posting the new policy on this page with an updated date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                9. Contact Us
              </h2>
              <p>
                For questions about this Privacy Policy or to exercise your data rights, please
                contact us through the OpsStack website.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
