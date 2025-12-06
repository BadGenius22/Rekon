import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/modules/home/app-footer";

export const metadata = {
  title: "Terms of Service | REKON",
  description: "Terms of Service for REKON - Esports Prediction Markets",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#030711] text-white">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 xl:px-10">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
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
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using REKON ("the Service"), you accept and
                agree to be bound by the terms and provision of this agreement.
                If you do not agree to abide by the above, please do not use
                this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                2. Description of Service
              </h2>
              <p>
                REKON is a platform that provides real-time esports prediction
                markets powered by Polymarket. The Service allows users to view
                market data, odds, and trading information for esports events.
                REKON acts as an interface to Polymarket's prediction market
                infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                3. Use of Service
              </h2>
              <p className="mb-3">You agree to use the Service only for lawful
                purposes and in accordance with these Terms. You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service in any way that violates any applicable
                  federal, state, local, or international law or regulation</li>
                <li>Attempt to gain unauthorized access to, interfere with,
                  damage, or disrupt any parts of the Service</li>
                <li>Use any automated system, including "robots," "spiders," or
                  "offline readers," to access the Service</li>
                <li>Reproduce, duplicate, copy, sell, resell, or exploit any
                  portion of the Service without express written permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                4. Polymarket Integration
              </h2>
              <p>
                REKON integrates with Polymarket to provide market data and
                trading functionality. By using REKON, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>All trading activities are conducted through Polymarket's
                  platform</li>
                <li>You are subject to Polymarket's terms of service and
                  policies</li>
                <li>REKON is not responsible for Polymarket's services,
                  transactions, or outcomes</li>
                <li>Market data is provided "as is" and may not always be
                  accurate or up-to-date</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                5. Risk Disclaimer
              </h2>
              <p className="mb-3">
                Trading in prediction markets involves substantial risk of loss.
                You should carefully consider whether such trading is suitable
                for you in light of your circumstances, knowledge, and financial
                resources. You may lose all or more than your initial investment.
              </p>
              <p>
                Past performance is not indicative of future results. The value
                of positions can fluctuate, and you may lose money. REKON does
                not provide investment advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. Intellectual Property
              </h2>
              <p>
                The Service and its original content, features, and functionality
                are owned by REKON and are protected by international copyright,
                trademark, patent, trade secret, and other intellectual property
                laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                7. Limitation of Liability
              </h2>
              <p>
                REKON shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, or any loss of profits or
                revenues, whether incurred directly or indirectly, or any loss
                of data, use, goodwill, or other intangible losses resulting
                from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                8. Indemnification
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless REKON and its
                officers, directors, employees, and agents from and against any
                claims, liabilities, damages, losses, and expenses, including
                without limitation, reasonable attorney's fees and costs, arising
                out of or in any way connected with your access to or use of the
                Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                9. Changes to Terms
              </h2>
              <p>
                REKON reserves the right, at its sole discretion, to modify or
                replace these Terms at any time. If a revision is material, we
                will provide at least 30 days notice prior to any new terms
                taking effect. What constitutes a material change will be
                determined at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                10. Governing Law
              </h2>
              <p>
                These Terms shall be governed and construed in accordance with
                the laws of the jurisdiction in which REKON operates, without
                regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                11. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms, please contact us
                through our official channels.
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

