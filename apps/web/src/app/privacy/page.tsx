import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/modules/home/app-footer";

export const metadata = {
  title: "Privacy Policy | REKON",
  description: "Privacy Policy for REKON - Esports Prediction Markets",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030711] text-white">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 xl:px-10">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="mt-2 text-sm text-white/60">
              Last updated: {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed text-white/80">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                1. Introduction
              </h2>
              <p>
                REKON ("we," "our," or "us") is committed to protecting your
                privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                2. Information We Collect
              </h2>
              <p className="mb-3">We may collect information about you in a
                variety of ways. The information we may collect includes:</p>
              
              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">
                2.1. Automatically Collected Information
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device information (browser type, device type, operating
                  system)</li>
                <li>Usage data (pages visited, time spent, interactions)</li>
                <li>IP address and location data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">
                2.2. Information You Provide
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Wallet addresses (if you connect a wallet)</li>
                <li>Preferences and settings</li>
                <li>Communications with us</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                3. How We Use Your Information
              </h2>
              <p className="mb-3">We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our Service</li>
                <li>Personalize your experience and deliver relevant content</li>
                <li>Analyze usage patterns and optimize performance</li>
                <li>Detect, prevent, and address technical issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                4. Information Sharing and Disclosure
              </h2>
              <p className="mb-3">We do not sell your personal information.
                We may share your information in the following circumstances:</p>
              
              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">
                4.1. Service Providers
              </h3>
              <p>
                We may share information with third-party service providers who
                perform services on our behalf, such as analytics, hosting, and
                customer support.
              </p>

              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">
                4.2. Polymarket Integration
              </h3>
              <p>
                When you interact with Polymarket through our Service, your
                information may be shared with Polymarket in accordance with
                their privacy policy. We are not responsible for Polymarket's
                privacy practices.
              </p>

              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">
                4.3. Legal Requirements
              </h3>
              <p>
                We may disclose your information if required to do so by law or
                in response to valid requests by public authorities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                5. Cookies and Tracking Technologies
              </h2>
              <p>
                We use cookies and similar tracking technologies to track
                activity on our Service and hold certain information. You can
                instruct your browser to refuse all cookies or to indicate when
                a cookie is being sent. However, if you do not accept cookies,
                you may not be able to use some portions of our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. Data Security
              </h2>
              <p>
                We implement appropriate technical and organizational security
                measures to protect your personal information. However, no method
                of transmission over the Internet or electronic storage is 100%
                secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                7. Your Rights
              </h2>
              <p className="mb-3">Depending on your location, you may have
                certain rights regarding your personal information, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access your personal information</li>
                <li>The right to rectify inaccurate information</li>
                <li>The right to request deletion of your information</li>
                <li>The right to object to processing of your information</li>
                <li>The right to data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                8. Children's Privacy
              </h2>
              <p>
                Our Service is not intended for individuals under the age of 18.
                We do not knowingly collect personal information from children.
                If you are a parent or guardian and believe your child has
                provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                9. International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and maintained on
                computers located outside of your state, province, country, or
                other governmental jurisdiction where data protection laws may
                differ from those in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                10. Changes to This Privacy Policy
              </h2>
              <p>
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last updated" date. You are advised
                to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                11. Contact Us
              </h2>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us through our official channels.
              </p>
            </section>
          </div>

          <div className="pt-8 border-t border-white/10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

