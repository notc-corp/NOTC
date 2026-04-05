import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-amber-600 border-b border-amber-700 px-4 py-3 flex items-center gap-2">
        <img src="/logo.png" alt="" className="w-8 h-8" />
        <span className="text-xl font-bold text-white">TruckAudit</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-amber-600 hover:text-amber-700 text-sm font-medium mb-6 inline-block"
        >
          &larr; Back to Login
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: March 20, 2026</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          {/* Intro */}
          <section>
            <p>
              TruckAudit is a trucking expense auditing app that helps drivers log trips
              and expenses, and helps business owners keep track of everything. This policy
              explains what information we collect, how we use it, and who can see it. We
              wrote this in plain language so it is easy to understand.
            </p>
          </section>

          {/* What We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">What Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account info:</strong> Your name, PIN (stored in a hashed/encrypted
                form &mdash; we never store your actual PIN), truck number, and optionally
                your phone number.
              </li>
              <li>
                <strong>Trip data:</strong> Starting and ending mileage, odometer readings,
                dates, and locations.
              </li>
              <li>
                <strong>Expense data:</strong> Fuel amounts, prices per gallon, total costs,
                and receipt details.
              </li>
              <li>
                <strong>Photos:</strong> Pictures of odometer readings and fuel receipts that
                you take through the app.
              </li>
            </ul>
          </section>

          {/* How We Use It */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Trip and expense tracking:</strong> To record your trips and expenses
                so your business owner can run daily audit reports.
              </li>
              <li>
                <strong>Photo processing:</strong> When you take a photo of an odometer or
                receipt, the image is sent to Anthropic&apos;s Claude AI service to read the
                numbers and text from the photo (OCR). This helps auto-fill your trip and
                expense forms so you don&apos;t have to type everything in manually.
              </li>
              <li>
                <strong>Reports:</strong> Your data is used to generate daily audit reports
                that help the business owner spot problems and manage the fleet.
              </li>
              <li>
                <strong>Authentication:</strong> Your hashed PIN is used to verify your
                identity when you log in.
              </li>
            </ul>
          </section>

          {/* Photo Handling */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Photo and Image Handling</h2>
            <p className="mb-2">
              When you take a photo through TruckAudit, here is what happens:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The photo is sent to Anthropic&apos;s API (the company behind Claude AI) so
                their system can read the text and numbers in the image.
              </li>
              <li>
                Photos are stored locally on the server that runs TruckAudit. They are not
                uploaded to any public cloud storage.
              </li>
              <li>
                Anthropic processes the image to extract text and does not use your photos to
                train their AI models. See{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:text-amber-700 underline"
                >
                  Anthropic&apos;s privacy policy
                </a>{" "}
                for more details on how they handle data sent through their API.
              </li>
            </ul>
          </section>

          {/* Who Can See Your Data */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Who Can See Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Drivers:</strong> You can only see your own trips, expenses, and
                photos. You cannot see other drivers&apos; information.
              </li>
              <li>
                <strong>Business owner:</strong> The owner account has full access to all
                driver data, trips, expenses, photos, and reports. This is necessary for
                running the business and auditing expenses.
              </li>
              <li>
                <strong>No one else:</strong> We do not share your data with any other
                third parties, except for sending photos to Anthropic for text extraction
                as described above.
              </li>
            </ul>
          </section>

          {/* No Selling Data */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">We Do Not Sell Your Data</h2>
            <p>
              We do not sell, rent, or trade your personal information to anyone. Your data
              is used only for running TruckAudit and nothing else.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Cookies</h2>
            <p>
              TruckAudit uses a single session cookie to keep you logged in. We do not use
              any tracking cookies, advertising cookies, or analytics cookies. The session
              cookie is deleted when you log out.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Retention</h2>
            <p>
              Your trip data, expense records, and photos are kept for as long as the
              business needs them for auditing and record-keeping purposes. If you are
              removed as a driver, your past records may be retained for the business
              owner&apos;s records. Contact the business owner if you want to know more
              about how long your data is kept.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Security</h2>
            <p>
              We take reasonable steps to protect your information. PINs are hashed before
              storage so they cannot be read, even by the system administrator. However,
              no system is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. If we make significant
              changes, we will update the &quot;Last updated&quot; date at the top of this
              page.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact Us</h2>
            <p>
              If you have questions about this privacy policy or your data, contact the
              business owner or system administrator who set up TruckAudit for your company.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-400 pb-8">
          <p>&copy; 2026 TruckAudit. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
