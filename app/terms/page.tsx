import Link from 'next/link';

export default function TermsOfService() {
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
              Terms of Service
            </h1>
            <p className="text-[var(--color-muted)]">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-6 text-[var(--color-muted)] leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using the Specification Wizard, you accept and agree to be bound 
                by the terms and provision of this agreement.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                2. User Responsibilities and Confidentiality
              </h2>
              <p>
                <strong>Important:</strong> You are responsible for maintaining the confidentiality 
                of any information you provide. You agree not to share confidential or company-sensitive 
                information during the initial specification process until a Non-Disclosure Agreement (NDA) 
                is established.
              </p>
              <p className="mt-2">
                <strong>NDA Process:</strong> After you submit your specification and we provide a 
                quotation, we will execute a formal NDA before engaging in any detailed confidential 
                discussions or technical planning. This ensures your proprietary information is 
                legally protected throughout our engagement.
              </p>
              <p className="mt-2">
                You also agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and truthful information</li>
                <li>Keep initial descriptions general until NDA is in place</li>
                <li>Not use the service for any unlawful purpose</li>
                <li>Not attempt to circumvent security measures</li>
                <li>Not interfere with the proper functioning of the service</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                3. Service Description
              </h2>
              <p>
                The Specification Wizard is an AI-powered tool designed to help you create 
                product specifications. While we strive for accuracy, the generated specifications 
                should be reviewed and validated before use in production environments.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                4. Intellectual Property
              </h2>
              <p>
                The specifications you create remain your intellectual property. We retain the 
                right to use anonymized data to improve our services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                5. Data Security and Privacy
              </h2>
              <p>
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All data is encrypted at rest and in transit using TLS 1.3</li>
                <li>CSRF protection on all API endpoints</li>
                <li>Rate limiting to prevent abuse</li>
                <li>Input validation and sanitization</li>
                <li>Regular security audits and updates</li>
              </ul>
              <p className="mt-2">
                For more information, please see our <Link href="/privacy" className="text-[var(--color-primary)] hover:underline">Privacy Policy</Link>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                6. Limitation of Liability
              </h2>
              <p>
                The service is provided "as is" without warranties of any kind. We are not liable 
                for any damages arising from the use of this service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                7. Termination
              </h2>
              <p>
                We reserve the right to terminate or suspend access to our service immediately, 
                without prior notice or liability, for any reason whatsoever, including without 
                limitation if you breach the Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                8. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. We will provide 
                notice of any material changes by posting the new Terms on this page with an 
                updated date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
                9. Contact Information
              </h2>
              <p>
                For questions about these Terms of Service, please contact us through the 
                FlowencyBuild website.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
