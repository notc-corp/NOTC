import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TruckAudit — Fleet Management for Independent Truckers",
  description: "Pre/post trip inspections, OCR receipt scanning, GPS tracking, driver reports. Built for owner-operators. 30-day free trial.",
};

const FEATURES = [
  { icon: "✅", title: "DOT-Compliant Inspections", desc: "Pre and post trip checklists with driver signature. Out-of-service detection built in." },
  { icon: "📷", title: "AI Receipt Scanner", desc: "Photo your fuel receipt — AI reads the numbers instantly. Edit and confirm in seconds." },
  { icon: "📍", title: "GPS Fleet Tracking", desc: "Live map with driver positions, speed, and full trip history." },
  { icon: "📊", title: "Daily Audit Reports", desc: "Automatic anomaly detection. Know if mileage or fuel numbers don't add up." },
  { icon: "👆", title: "Biometric Login", desc: "Face ID and fingerprint sign-in on iOS and Android. No PIN to remember." },
  { icon: "📒", title: "Gross Ledger", desc: "Car-hauling fuel/load tracker with auto net calculation and weekly payout summary." },
  { icon: "💵", title: "Driver Payroll", desc: "Hourly or per-ton pay tracking. Owner pays, driver sees their earnings." },
  { icon: "🔧", title: "Issue Tracking", desc: "Drivers report defects with photos. Owner resolves and tracks status." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-8 h-8" />
          <span className="text-lg font-bold text-slate-900">TruckAudit</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 pt-16 pb-14 max-w-2xl mx-auto text-center">
        <div className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-amber-200">
          🚛 Built for owner-operators
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
          Fleet management that fits in your pocket
        </h1>
        <p className="text-lg text-slate-500 mb-8 leading-relaxed">
          Pre-trip inspections, AI receipt scanning, GPS tracking, and driver payroll — all in one app. No hardware required. No long-term contract.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="h-14 px-8 rounded-xl bg-amber-600 text-white text-lg font-bold hover:bg-amber-700 transition-colors flex items-center justify-center"
          >
            Start Free 30-Day Trial
          </Link>
          <Link
            href="/login"
            className="h-14 px-8 rounded-xl border-2 border-slate-200 text-slate-700 text-lg font-semibold hover:border-slate-300 transition-colors flex items-center justify-center"
          >
            Sign In →
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">No credit card required · Cancel anytime</p>
      </section>

      {/* Features */}
      <section className="bg-slate-50 px-4 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Everything you need to run your fleet</h2>
          <p className="text-center text-slate-500 mb-10">One app for drivers and owners. Works on iOS, Android, and desktop.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-14 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-10">How it works</h2>
        <div className="space-y-6">
          {[
            { n: "1", title: "Driver starts trip", body: "Completes DOT pre-trip inspection checklist, signs it, and photos the odometer." },
            { n: "2", title: "Driver logs expenses", body: "Photos fuel receipts — AI reads the total, gallons, and station. Driver confirms in seconds." },
            { n: "3", title: "Driver ends trip", body: "Post-trip inspection + end odometer photo. Trip is sealed and ready for audit." },
            { n: "4", title: "Owner reviews", body: "Daily report shows all trips, expenses, mileage. Anomaly detection flags anything off." },
          ].map((s) => (
            <div key={s.n} className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-600 text-white font-bold text-lg flex items-center justify-center">
                {s.n}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 px-4 py-14">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Simple pricing</h2>
          <p className="text-center text-slate-500 mb-8">Start free. No credit card. Cancel anytime.</p>
          <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-lg p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl font-bold text-slate-900">Solo Plan</span>
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">Most popular</span>
            </div>
            <div className="mb-4">
              <span className="text-4xl font-extrabold text-slate-900">$9</span>
              <span className="text-slate-500">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-700 mb-6">
              {[
                "Unlimited trips & expenses",
                "AI receipt OCR",
                "GPS fleet tracking",
                "Pre/post trip inspections",
                "Daily audit reports",
                "Biometric login",
                "Gross Ledger (car-hauling)",
                "Unlimited driver accounts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full h-12 rounded-xl bg-amber-600 text-white text-base font-bold text-center leading-[3rem] hover:bg-amber-700 transition-colors"
            >
              Start Free 30-Day Trial
            </Link>
            <p className="text-center text-xs text-slate-400 mt-3">Then $9/month · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-14 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Common questions</h2>
        <div className="space-y-6">
          {[
            { q: "Do I need to buy any hardware?", a: "No. TruckAudit works on your existing smartphone — iOS or Android. No GPS trackers or tablets required." },
            { q: "How many drivers can I add?", a: "As many as you need. All driver accounts are included in the Solo plan at no extra charge." },
            { q: "Is it DOT compliant?", a: "The inspection checklists follow FMCSA DVIR requirements. Always consult your compliance officer for jurisdiction-specific requirements." },
            { q: "Can I export my data?", a: "Yes. Trip reports, expense records, and inspection logs are exportable. Your data belongs to you." },
            { q: "What happens after the free trial?", a: "You'll be prompted to subscribe at $9/month. If you don't subscribe, your account is paused — no data is deleted for 30 days." },
          ].map((faq) => (
            <div key={faq.q}>
              <h3 className="font-semibold text-slate-900 mb-1">{faq.q}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-amber-600 px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to simplify your fleet?</h2>
        <p className="text-amber-100 mb-7">Join truckers who already use TruckAudit every day.</p>
        <Link
          href="/signup"
          className="inline-block h-14 px-10 rounded-xl bg-white text-amber-700 text-lg font-bold hover:bg-amber-50 transition-colors"
        >
          Start Free — No Credit Card
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-slate-100 text-center text-sm text-slate-400">
        <p className="mb-2">&copy; 2026 TruckAudit. All rights reserved.</p>
        <div className="flex justify-center gap-4">
          <Link href="/login" className="hover:text-slate-600">Sign In</Link>
          <Link href="/signup" className="hover:text-slate-600">Sign Up</Link>
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
