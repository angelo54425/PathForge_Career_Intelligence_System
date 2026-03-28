import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export const metadata = { title: "Privacy Policy — PathForge" };

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Effective date: 28 March 2026 · Last updated: 28 March 2026</p>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">

          <section>
            <p>
              PathForge Career Intelligence System (&quot;PathForge&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal information.
              This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data when you use our platform at{" "}
              <span className="font-medium text-slate-900 dark:text-white">pathforge.live</span>.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Information We Collect</h2>
            <div className="space-y-3">
              <div className="card p-4">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Account Information</p>
                <p>When you register or sign in with Google, we collect your name, email address, and profile picture. This information is used solely to identify your account.</p>
              </div>
              <div className="card p-4">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Assessment & Skill Data</p>
                <p>We collect the skill proficiency scores you submit during career assessments, your selected target career, and your assessment history. This data powers your personalised recommendations.</p>
              </div>
              <div className="card p-4">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Usage Data</p>
                <p>We may collect anonymised usage data such as pages visited and features used to improve the platform. We do not sell this data to third parties.</p>
              </div>
            </div>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>Provide personalised career gap analysis, roadmaps, and market intelligence.</li>
              <li>Display your skill progress and readiness scores across sessions.</li>
              <li>Authenticate your account securely via NextAuth and Google OAuth.</li>
              <li>Improve our ML models and recommendation quality (using aggregated, anonymised data only).</li>
              <li>Send essential service notifications (e.g., account-related emails). We do not send marketing emails without your explicit consent.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. Data Storage & Security</h2>
            <p className="mb-3">
              Your personal data and assessment records are stored in a hosted PostgreSQL database (Neon) located in secure cloud infrastructure. We use industry-standard encryption in transit (TLS) and at rest.
            </p>
            <p>
              Session tokens are encrypted using NextAuth v5 JWE encryption. We do not store raw passwords — Google OAuth handles authentication entirely.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. Third-Party Services</h2>
            <p className="mb-3">PathForge uses the following third-party services to operate:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Service</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Google OAuth", "Authentication — your Google account login"],
                    ["Vercel", "Frontend hosting and deployment"],
                    ["Railway", "Backend API and ML model hosting"],
                    ["Neon (PostgreSQL)", "User data and assessment storage"],
                  ].map(([svc, purpose]) => (
                    <tr key={svc} className="border border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{svc}</td>
                      <td className="px-4 py-2">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">Each provider has its own privacy policy. We encourage you to review them.</p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your personal data with advertisers or third-party marketers. Data may be shared only when required by law or with service providers listed above who process data on our behalf under strict confidentiality obligations.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">6. Your Rights</h2>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li><span className="font-medium text-slate-900 dark:text-white">Access:</span> Request a copy of the personal data we hold about you.</li>
              <li><span className="font-medium text-slate-900 dark:text-white">Correction:</span> Update your name and career preferences from your Profile page at any time.</li>
              <li><span className="font-medium text-slate-900 dark:text-white">Deletion:</span> Request deletion of your account and all associated data by contacting us.</li>
              <li><span className="font-medium text-slate-900 dark:text-white">Portability:</span> Request an export of your assessment data in JSON format.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">7. Cookies</h2>
            <p>
              PathForge uses a single session cookie (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">authjs.session-token</code>) to maintain your login state. We do not use advertising or tracking cookies.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">8. Children&apos;s Privacy</h2>
            <p>
              PathForge is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by updating the effective date above. Continued use of PathForge after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">10. Contact</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at{" "}
              <span className="font-medium text-primary">support@pathforge.live</span>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700 flex gap-4 text-sm text-slate-500">
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <span>·</span>
          <Link href="/" className="hover:text-primary">Back to PathForge</Link>
        </div>

      </main>
    </div>
  );
}
