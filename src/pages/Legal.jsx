// File: src/pages/Legal.jsx
// Public legal pages: Terms of Service, Privacy Policy, Risk Disclosure.
// Reached at /legal?doc=terms|privacy|risk (default: terms). These are
// STARTING DRAFTS — a qualified attorney must review and localize them before
// launch. Placeholders in [brackets] must be filled in.
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldAlert, FileText, Lock, AlertTriangle } from "lucide-react";

// ─── Fill these in (or wire to env) before launch ───────────────────────────
const COMPANY = "[Company Name]";
const JURISDICTION = "[State/Country]";
const CONTACT = "[legal@yourdomain.com]";
const EFFECTIVE = "October 3, 2026";

const DOCS = [
  { id: "terms", label: "Terms of Service", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: Lock },
  { id: "risk", label: "Risk Disclosure", icon: AlertTriangle },
];

export default function Legal() {
  const [params, setParams] = useSearchParams();
  const doc = DOCS.some((d) => d.id === params.get("doc")) ? params.get("doc") : "terms";

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-neutral-200">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-[#121212] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-400">
            <span>⬢</span> NeoV6
          </Link>
          <Link to="/" className="text-sm text-neutral-400 hover:text-white">← Back</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[200px_1fr]">
        {/* Doc nav */}
        <nav className="h-fit space-y-1 md:sticky md:top-10">
          {DOCS.map((d) => {
            const Icon = d.icon;
            const active = d.id === doc;
            return (
              <button
                key={d.id}
                onClick={() => setParams({ doc: d.id })}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active ? "bg-emerald-500/15 font-semibold text-emerald-300" : "text-neutral-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" /> {d.label}
              </button>
            );
          })}
        </nav>

        {/* Doc body */}
        <main className="min-w-0">
          {/* Draft banner */}
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Draft for review. These documents are starting templates, not legal advice — have a qualified attorney review and localize them, and fill in the bracketed placeholders, before you charge customers or go live.</span>
          </div>
          {doc === "terms" && <Terms />}
          {doc === "privacy" && <Privacy />}
          {doc === "risk" && <Risk />}
        </main>
      </div>
    </div>
  );
}

// ── Shared typography helpers ────────────────────────────────────────────────
const H1 = ({ children }) => <h1 className="text-3xl font-bold text-white">{children}</h1>;
const Meta = () => <p className="mt-1 text-xs text-neutral-500">Effective {EFFECTIVE} · {COMPANY}</p>;
const H2 = ({ children }) => <h2 className="mt-8 mb-2 text-lg font-semibold text-emerald-400">{children}</h2>;
const P = ({ children }) => <p className="mb-3 text-sm leading-relaxed text-neutral-300">{children}</p>;
const LI = ({ children }) => <li className="mb-1.5 text-sm leading-relaxed text-neutral-300">{children}</li>;
const UL = ({ children }) => <ul className="mb-3 list-disc space-y-0 pl-5">{children}</ul>;

function Terms() {
  return (
    <article>
      <H1>Terms of Service</H1>
      <Meta />
      <H2>1. Acceptance</H2>
      <P>By creating an account or using NeoV6 (the “Service”), operated by {COMPANY}, you agree to these Terms and to the Risk Disclosure and Privacy Policy, which are incorporated by reference. If you do not agree, do not use the Service.</P>
      <H2>2. What the Service is</H2>
      <P>NeoV6 is software that lets you design, backtest, and paper-trade automated cryptocurrency strategies, and — on paid plans — hand a validated configuration off for live deployment. The Service is a software tool only. It is <b>not</b> a broker-dealer, exchange, investment adviser, or custodian, and it does not hold your funds or execute trades on a custodial basis on your behalf.</P>
      <H2>3. No investment advice</H2>
      <P>Nothing in the Service is financial, investment, legal, or tax advice, or a recommendation to buy, sell, or hold any asset. All signals, scores, backtests, and “readiness” indicators are informational. You are solely responsible for your trading decisions. See the Risk Disclosure.</P>
      <H2>4. Eligibility</H2>
      <P>You must be at least 18 and legally permitted to use automated-trading software and to trade crypto assets in your jurisdiction. You are responsible for compliance with all laws that apply to you.</P>
      <H2>5. Accounts & security</H2>
      <P>You are responsible for your credentials and for any exchange API keys you connect. Grant API keys the minimum permissions needed and never enable withdrawal permissions. You are responsible for all activity under your account.</P>
      <H2>6. Subscriptions, billing & refunds</H2>
      <UL>
        <LI>Paper trading is free. Paid plans unlock live-trading features and are billed through our payment processor (Stripe) on a recurring monthly or annual basis.</LI>
        <LI>Subscriptions renew automatically until cancelled. You can cancel anytime from the billing portal; access continues through the end of the paid period.</LI>
        <LI>Except where required by law, fees are non-refundable. Free trials, if offered, convert to paid unless cancelled before the trial ends.</LI>
        <LI>We may change prices with reasonable notice; changes apply to the next billing cycle.</LI>
      </UL>
      <H2>7. Acceptable use</H2>
      <P>Do not misuse the Service: no unlawful activity, market manipulation, reverse engineering, overloading or probing the infrastructure, reselling access, or using the Service where prohibited.</P>
      <H2>8. No warranty</H2>
      <P>The Service is provided “as is” and “as available,” without warranties of any kind. We do not warrant that it will be uninterrupted, error-free, or that any strategy, backtest, or signal will be accurate or profitable. Market data and third-party integrations may be delayed, incomplete, or wrong.</P>
      <H2>9. Limitation of liability</H2>
      <P>To the maximum extent permitted by law, {COMPANY} and its affiliates are not liable for any trading losses or for any indirect, incidental, special, consequential, or exemplary damages. Our aggregate liability for any claim is limited to the amount you paid us in the 12 months before the claim.</P>
      <H2>10. Termination</H2>
      <P>You may stop using the Service at any time. We may suspend or terminate access for violation of these Terms or to comply with law. Sections that by their nature should survive (e.g., 3, 8, 9) survive termination.</P>
      <H2>11. Changes</H2>
      <P>We may update these Terms; material changes will be posted here with a new effective date, and continued use constitutes acceptance.</P>
      <H2>12. Governing law & contact</H2>
      <P>These Terms are governed by the laws of {JURISDICTION}, without regard to conflict-of-laws rules. Questions: {CONTACT}.</P>
    </article>
  );
}

function Privacy() {
  return (
    <article>
      <H1>Privacy Policy</H1>
      <Meta />
      <H2>1. What we collect</H2>
      <UL>
        <LI><b>Account data:</b> username, email, and (if you connect one) your public wallet address.</LI>
        <LI><b>Exchange API keys:</b> stored encrypted at rest; secrets are never displayed back to you. Grant read/trade-only keys — never withdrawal access.</LI>
        <LI><b>Usage data:</b> fleet configurations, backtests, trade history, and basic logs/analytics needed to run the Service.</LI>
        <LI><b>Billing data:</b> handled by our payment processor (Stripe). We store your plan and subscription status, not your full card details.</LI>
      </UL>
      <H2>2. How we use it</H2>
      <P>To operate the Service, authenticate you, run and improve strategies, process subscriptions, send transactional email (verification, password reset, trade alerts you opt into), and keep the platform secure.</P>
      <H2>3. Third parties</H2>
      <P>We share data with processors only as needed to run the Service: hosting providers, our database, our payment processor (Stripe), market-data providers, and email delivery. We do not sell your personal data.</P>
      <H2>4. Cookies & local storage</H2>
      <P>We use your browser’s local storage for session tokens and UI preferences. We do not use third-party advertising trackers.</P>
      <H2>5. Security</H2>
      <P>We use industry-standard measures (encryption in transit, encrypted API-key storage, scoped access). No system is perfectly secure; use a strong, unique password.</P>
      <H2>6. Data retention & your rights</H2>
      <P>We keep your data while your account is active and as required by law. You may request access, correction, or deletion of your data, subject to legal retention obligations. Contact {CONTACT}.</P>
      <H2>7. Changes</H2>
      <P>We may update this policy; material changes will be posted here with a new effective date.</P>
    </article>
  );
}

function Risk() {
  return (
    <article>
      <H1>Risk Disclosure</H1>
      <Meta />
      <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
        <P><b className="text-red-300">Trading cryptocurrencies is extremely high risk. You can lose some or all of your money. Never trade with funds you cannot afford to lose.</b></P>
      </div>
      <H2>Not advice, not a guarantee</H2>
      <P>NeoV6 is a software tool, not a financial adviser, broker, or fiduciary. Nothing it produces — signals, scores, backtests, “validated” or “readiness” indicators — is a recommendation or a promise of results. All trading decisions are yours alone.</P>
      <H2>Past & simulated performance ≠ future results</H2>
      <UL>
        <LI>Backtests are hypothetical, computed on historical data with the benefit of hindsight, and do not account for all real-world conditions.</LI>
        <LI>Paper-trading results use simulated balances and do not reflect real execution, slippage, fees, latency, or liquidity. Live results can differ substantially and be worse.</LI>
        <LI>A strategy that passed validation can still lose money going forward. Markets change.</LI>
      </UL>
      <H2>Crypto-specific risks</H2>
      <UL>
        <LI><b>Volatility:</b> crypto prices can move violently and gap; stops may fill far from their level.</LI>
        <LI><b>Leverage / shorting:</b> margin and short positions can lose more than your initial outlay and be liquidated.</LI>
        <LI><b>24/7 markets & outages:</b> exchanges, data feeds, and this software can be delayed, go down, or malfunction, and orders may not execute as intended.</LI>
        <LI><b>Regulatory & custody:</b> crypto is subject to changing regulation; you are responsible for taxes and for the security of funds held at your exchange.</LI>
      </UL>
      <H2>Software risk</H2>
      <P>Automated software can contain bugs or behave unexpectedly, and third-party data can be wrong. Monitor any live deployment, keep exchange API keys trade-only (never withdrawal), and use position sizes you can afford to lose.</P>
      <H2>Your responsibility</H2>
      <P>By using NeoV6 you acknowledge these risks and agree that {COMPANY} is not liable for your trading losses, to the fullest extent permitted by law. If you do not understand a risk, do not trade — consult a licensed professional.</P>
    </article>
  );
}
