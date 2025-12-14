import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/modules/home/app-footer";

export const metadata = {
  title: "Risk Disclaimer | REKON",
  description: "Important risk information and disclaimers for using REKON.",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#030711] text-white">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 xl:px-10">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Risk Disclaimer</h1>
            <p className="mt-2 text-sm text-white/60">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed text-white/80">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Overview
              </h2>
              <p>
                REKON provides an interface to view and interact with esports
                prediction markets. The information on this site is provided for
                general informational purposes only and does not constitute
                investment, financial, legal, or tax advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Nature of Risk
              </h2>
              <p>
                Trading in prediction markets involves a significant risk of
                loss. Market prices can be volatile and may move rapidly. You
                may lose some or all of the funds you use to participate in
                these markets. Never trade with funds you cannot afford to lose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Not Financial Advice
              </h2>
              <p>
                Content on REKON is not intended to be investment advice or a
                recommendation to buy, sell, or hold any position. If you are
                unsure about the suitability of any activity, consult a
                qualified professional who can provide personalized guidance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                No Warranty; Third-Party Services
              </h2>
              <p>
                REKON is an interface that surfaces market data provided by
                third parties (including Polymarket). While we strive for
                accuracy, we make no representations or warranties regarding the
                completeness, reliability, or timeliness of information
                displayed. Use of third-party services is subject to their own
                terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Legal &amp; Regulatory Considerations
              </h2>
              <p>
                Prediction market availability and legality vary by
                jurisdiction. It is your responsibility to ensure that your
                participation complies with all applicable laws and regulations
                where you reside. REKON does not provide legal or regulatory
                advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Responsible Use
              </h2>
              <p>
                If you choose to participate in markets, do so responsibly.
                Consider limits, take breaks, and seek help if you believe you
                may have a problem with gambling or risk-taking behavior.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Limitation of Liability
              </h2>
              <p>
                To the fullest extent permitted by law, REKON and its affiliates
                will not be liable for any direct, indirect, consequential, or
                other damages arising from your use of the Service or reliance
                on any information provided.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Questions
              </h2>
              <p>
                If you have questions about this disclaimer, please reach out
                through our official channels (e.g., Discord or support) and we
                will respond as appropriate.
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
