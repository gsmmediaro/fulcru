import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Fulcru handles your account, run, and billing data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="May 7, 2026">
      <p>
        This policy explains what information Fulcru collects, why, where it
        lives, and what control you have over it. We follow it because we
        want to — and because the GDPR requires us to.
      </p>

      <h2>1. Who is the controller</h2>
      <p>
        Fulcru is operated from Romania. The data controller is the
        individual operator reachable at{" "}
        <a href="mailto:contact@fulcru.app">contact@fulcru.app</a>. Direct
        all privacy questions and rights requests there.
      </p>

      <h2>2. What we collect</h2>

      <h3>Account information</h3>
      <ul>
        <li>Name and email — required to create an account.</li>
        <li>Company name — optional, only if you fill it in at signup.</li>
        <li>
          Password — stored only as a salted, hashed value via Better Auth.
          We never see your plaintext password.
        </li>
        <li>
          Google OAuth identifier and email — only if you sign in with
          Google. We do not request access to your Drive, Gmail, or other
          Google services.
        </li>
      </ul>

      <h3>Workspace data</h3>
      <ul>
        <li>
          The clients, projects, skills, runs, run events, approvals, and
          invoices you create or import — stored as structured rows in our
          database.
        </li>
        <li>
          MCP keys you generate. We store only a SHA-256 hash plus a short
          prefix; the plaintext key is shown to you exactly once at creation
          and cannot be recovered.
        </li>
        <li>
          Onboarding answers (agency size, services, use cases) — used to
          tailor the in-product experience.
        </li>
      </ul>

      <h3>Technical data</h3>
      <ul>
        <li>
          Session cookies issued by Better Auth — HTTP-only, used to keep
          you logged in.
        </li>
        <li>
          Server logs — IP address, user agent, request path, timestamp, and
          status. Retained for up to 30 days for debugging and abuse
          prevention.
        </li>
      </ul>

      <h2>3. What we don&apos;t collect</h2>
      <ul>
        <li>
          We do not run third-party analytics (no Google Analytics, no
          Mixpanel, no PostHog) on the dashboard.
        </li>
        <li>We do not run advertising or marketing pixels.</li>
        <li>
          We do not read or store the content of files in directories you
          point the MCP server at — only the metadata (token counts, run
          duration, event labels) reported by your MCP session.
        </li>
      </ul>

      <h2>4. Where your data lives</h2>
      <ul>
        <li>
          <strong>Application database:</strong> Neon Postgres,
          AWS <code>us-east-2</code> (Ohio).
        </li>
        <li>
          <strong>Application server:</strong> Railway / Vercel, with EU and
          US points of presence.
        </li>
        <li>
          <strong>Authentication:</strong> Better Auth (self-hosted within
          our database) plus Google OAuth (only when you choose Google
          sign-in).
        </li>
      </ul>
      <p>
        These providers are our processors. Personal data may transfer
        outside the EU — we rely on the providers&apos; standard contractual
        clauses for that transfer.
      </p>

      <h2>5. How we use your data</h2>
      <p>We process your data to:</p>
      <ul>
        <li>Operate the service — render dashboards, store runs, sign you in.</li>
        <li>
          Authenticate API and MCP requests — verifying that a Bearer token
          maps to your account.
        </li>
        <li>
          Communicate service-relevant updates — security notices, breaking
          changes, account issues.
        </li>
        <li>
          Detect and prevent abuse — rate-limit and block obviously
          malicious activity.
        </li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>
        We don&apos;t sell your data, share it with advertisers, or use it
        to train AI models.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Fulcru sets a single first-party, HTTP-only session cookie issued
        by Better Auth. We do not use tracking, advertising, or analytics
        cookies. If we add any in the future, we will surface a consent
        banner before they load.
      </p>

      <h2>7. Your rights</h2>
      <p>Under the GDPR (and equivalent laws) you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate data.</li>
        <li>Delete your account and associated data.</li>
        <li>Export your data in a portable format (JSON / CSV).</li>
        <li>Object to or restrict processing.</li>
        <li>
          Lodge a complaint with the Romanian Data Protection Authority
          (ANSPDCP) if you believe we mishandle your data.
        </li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <a href="mailto:contact@fulcru.app">contact@fulcru.app</a>. We
        respond within 30 days.
      </p>

      <h2>8. Retention</h2>
      <ul>
        <li>
          Account, workspace, and run data: kept while your account is
          active and for up to 30 days after deletion (in case you change
          your mind), then permanently removed.
        </li>
        <li>Server logs: up to 30 days.</li>
        <li>Backups: rolling 7-day window, then overwritten.</li>
      </ul>

      <h2>9. Security</h2>
      <p>
        Connections are TLS-only. Passwords and MCP keys are hashed before
        storage. Sessions are bound to HTTP-only cookies. We restrict
        production database access to operators of the service and apply
        provider-default network controls. No system is perfect — we
        respond promptly to any incident that affects user data.
      </p>

      <h2>10. Children</h2>
      <p>
        Fulcru is not directed at children under 16 and we do not knowingly
        collect their personal data.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We&apos;ll post material changes here at least 14 days before they
        take effect, and notify you by email when those changes affect how
        we handle your personal data.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy questions and rights requests:{" "}
        <a href="mailto:contact@fulcru.app">contact@fulcru.app</a>.
      </p>
    </LegalShell>
  );
}
