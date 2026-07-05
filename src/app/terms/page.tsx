import Link from "next/link";

export const metadata = { title: "Terms of Service — TruckAudit" };

export default function TermsPage() {
  const effectiveDate = "July 1, 2026";

  return (
    <div className="min-h-screen bg-white px-4 py-10 max-w-3xl mx-auto">
      <Link href="/login" className="text-amber-600 text-sm font-medium mb-6 inline-block">← Back to sign in</Link>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-slate-500 text-sm mb-8">Effective date: {effectiveDate}</p>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Agreement</h2>
          <p>By creating an account on TruckAudit ("Service", "we", "us"), you ("Customer") agree to these Terms. If you do not agree, do not use the Service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Service Description</h2>
          <p>TruckAudit is fleet management software for trucking companies. Features include driver management, trip tracking, pre/post trip inspections, expense tracking, GPS fleet map, and Gross Ledger for car-hauling operations.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Accounts</h2>
          <p>You must be 18 or older to create an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately of any unauthorized use.</p>
          <p className="mt-2">One account is created per company ("Company Account"). The owner may add multiple drivers under their account.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Free Trial</h2>
          <p>New accounts receive a 30-day free trial with full access to all features. No credit card is required to start a trial. At the end of the trial, continued access requires a paid subscription.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Subscriptions & Billing</h2>
          <p>Paid plans are billed monthly via Stripe. Prices are listed on the billing page. You authorize us to charge your payment method on a recurring basis until you cancel.</p>
          <p className="mt-2">You may cancel your subscription at any time through the customer portal. Cancellation takes effect at the end of the current billing period. We do not offer pro-rated refunds for partial billing periods.</p>
          <p className="mt-2">If payment fails, your account may be suspended. We will notify you before suspension.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Acceptable Use</h2>
          <p>You agree not to: (a) use the Service for unlawful purposes; (b) attempt to gain unauthorized access to our systems; (c) upload content that violates third-party rights; (d) resell or sublicense the Service without our written permission.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Data Ownership</h2>
          <p>You own all data you submit to the Service (trip records, photos, inspections, etc.). We process your data to provide the Service. See our <Link href="/privacy" className="text-amber-600 underline">Privacy Policy</Link> for details.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Data Export & Deletion</h2>
          <p>You may request an export of your data at any time. Upon account deletion, your data will be removed from our systems within 30 days, except where retention is required by law.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Uptime & Availability</h2>
          <p>We strive for high availability but do not guarantee uninterrupted service. We are not liable for losses resulting from downtime, data loss, or service interruptions beyond our reasonable control.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Disclaimer of Warranties</h2>
          <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE OR THAT IT MEETS ALL REGULATORY REQUIREMENTS APPLICABLE TO YOUR BUSINESS (INCLUDING FMCSA/DOT COMPLIANCE).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">11. Limitation of Liability</h2>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE THREE MONTHS PRECEDING THE CLAIM.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">12. Changes to Terms</h2>
          <p>We may update these Terms. We will notify you by email or in-app notice at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">13. Governing Law</h2>
          <p>These Terms are governed by the laws of the United States. Disputes shall be resolved by binding arbitration under AAA rules, except for claims eligible for small claims court.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">14. Contact</h2>
          <p>Questions? Email us at <a href="mailto:support@truckaudit.com" className="text-amber-600 underline">support@truckaudit.com</a></p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-slate-100 text-center text-sm text-slate-400">
        &copy; 2026 TruckAudit. All rights reserved.
      </div>
    </div>
  );
}
