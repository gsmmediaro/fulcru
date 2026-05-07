import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing your use of Fulcru - the agency dashboard for AI-coding work.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="May 7, 2026">
      <h2>1. Agreement</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) form a binding agreement
        between you (&quot;you&quot;, &quot;your&quot;) and Fulcru
        (&quot;Fulcru&quot;, &quot;we&quot;, &quot;us&quot;). By creating an
        account or using the service, you agree to these Terms. If you do not
        agree, do not use the service.
      </p>

      <h2>2. The service</h2>
      <p>
        Fulcru is a dashboard for tracking, approving, and invoicing
        AI-assisted client work - primarily Claude Code sessions captured via
        the Model Context Protocol (MCP). The product is provided
        &quot;as-is&quot;, in active development, and may change without
        notice.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You can register with email and password or via Google OAuth. You are
        responsible for the credentials you use, the activity on your account,
        and the security of any MCP keys you generate. Notify us immediately
        if you suspect unauthorized access.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>
          Don&apos;t use Fulcru to track or bill work performed for clients
          without their knowledge or consent where such consent is required.
        </li>
        <li>
          Don&apos;t share MCP keys publicly, commit them to source control,
          or use them on infrastructure you don&apos;t control.
        </li>
        <li>
          Don&apos;t attempt to disrupt the service, scrape data you
          don&apos;t own, reverse-engineer auth, or abuse rate limits.
        </li>
        <li>
          Don&apos;t store unlawful content, personal data unrelated to your
          billing relationship, or content that infringes third-party rights.
        </li>
      </ul>

      <h2>5. Pricing</h2>
      <p>
        Fulcru is currently free to use while we acquire early users. We may
        introduce paid tiers in the future; if we do, we will give you written
        notice before any plan you signed up for begins charging, and your
        existing data will remain accessible.
      </p>

      <h2>6. Your data</h2>
      <p>
        The clients, projects, skills, runs, approvals, and invoices you
        create remain your data. You can export or delete them at any time
        through the dashboard or by contacting us. We process this data only
        to operate the service. See our{" "}
        <a href="/privacy">Privacy Policy</a> for details.
      </p>

      <h2>7. Service availability</h2>
      <p>
        Fulcru is beta software. We do not commit to any uptime SLA. Scheduled
        and unscheduled downtime, data resets in non-production environments,
        and breaking changes can occur. We will avoid destructive changes to
        production data without notice.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may close your account at any time. We may suspend or terminate
        accounts that violate these Terms, that pose a security or abuse risk,
        or that are inactive for an extended period. Where lawful, we will
        give you reasonable notice and a chance to export your data.
      </p>

      <h2>9. Disclaimers and liability</h2>
      <p>
        To the maximum extent permitted by law, Fulcru is provided{" "}
        <strong>without warranties</strong> of any kind, express or implied,
        including merchantability, fitness for a particular purpose, and
        non-infringement. To the maximum extent permitted by law, our total
        liability arising out of or relating to the service is limited to the
        amounts you paid us in the twelve months preceding the claim, or
        EUR 100 if you paid nothing.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms. Material changes will be announced by
        email or in-app at least 14 days before they take effect. Continued
        use after the effective date constitutes acceptance.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of Romania, without regard to
        conflict-of-law rules. Disputes are subject to the exclusive
        jurisdiction of the courts of București, Romania, except where
        applicable consumer-protection law grants you other rights.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:contact@fulcru.app">contact@fulcru.app</a>.
      </p>
    </LegalShell>
  );
}
