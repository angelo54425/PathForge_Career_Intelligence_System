import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export const metadata = { title: "Terms of Service — PathForge" };

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 py-12 pb-24">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-slate-500 hover:text-primary flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to PathForge
          </Link>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Effective date: 28 March 2026 · Last updated: 28 March 2026</p>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">

          <section>
            <p>
              Welcome to PathForge. By accessing or using <span className="font-medium text-slate-900 dark:text-white">pathforge.live</span> (the &quot;Service&quot;),
              you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the Service.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Description of Service</h2>
            <p>
              PathForge is a career intelligence platform designed for students and professionals in East Africa. It provides
              AI-powered career gap analysis, personalised learning roadmaps, salary market intelligence, and university
              programme alignment — based on your self-reported skill profile.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. Eligibility & Accounts</h2>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>You must be at least 13 years of age to use PathForge.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to provide accurate information when creating an account.</li>
              <li>One person may not maintain more than one active account.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable regulations.</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
              <li>Scrape, crawl, or systematically extract data from the Service without written permission.</li>
              <li>Submit false, misleading, or deliberately inaccurate skill assessments to manipulate recommendations.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of our ML models or APIs.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. Intellectual Property</h2>
            <p className="mb-3">
              All content on PathForge — including but not limited to the ML career recommendation models, salary market data,
              roadmap logic, UI design, and brand assets — is the intellectual property of PathForge and its licensors.
            </p>
            <p>
              You retain ownership of the skill data and assessment responses you submit. By submitting this data, you grant PathForge
              a non-exclusive, royalty-free licence to use it to provide and improve the Service, including training anonymised ML models.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">5. Accuracy of Information</h2>
            <p>
              PathForge provides career intelligence based on aggregated market research and machine learning models. All salary figures,
              demand scores, and readiness estimates are <span className="font-medium text-slate-900 dark:text-white">indicative only</span> and
              should not be relied upon as professional career, financial, or legal advice. PathForge does not guarantee employment outcomes
              or specific salary levels.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">6. Third-Party Links & Services</h2>
            <p>
              PathForge may display links to external universities, employers, or resources. We do not endorse and are not responsible
              for the content or practices of third-party websites. Your use of those sites is governed by their own terms.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided <span className="font-medium text-slate-900 dark:text-white">&quot;as is&quot;</span> and
              &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
              PathForge does not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, PathForge and its team shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service,
              even if advised of the possibility of such damages. Our total liability to you for any claim shall not exceed
              the amount you paid us in the twelve months preceding the claim (or USD 10 if you have not made any payments).
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at our discretion if you violate these Terms or engage
              in conduct harmful to other users or the Service. You may delete your account at any time by contacting us at{" "}
              <span className="font-medium text-primary">support@pathforge.live</span>.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of PathForge after changes are posted constitutes your
              acceptance of the revised Terms. We will notify you of material changes by updating the effective date above.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of Kenya. Any disputes arising under these
              Terms shall be subject to the exclusive jurisdiction of the courts of Nairobi, Kenya.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">12. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{" "}
              <span className="font-medium text-primary">support@pathforge.live</span>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700 flex gap-4 text-sm text-slate-500">
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <span>·</span>
          <Link href="/" className="hover:text-primary">Back to PathForge</Link>
        </div>

      </main>
    </div>
  );
}
