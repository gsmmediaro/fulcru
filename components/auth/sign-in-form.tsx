"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/i18n/provider";
import { TextField } from "./text-field";
import { GoogleButton } from "./google-button";
import { AuthLanguageToggle } from "./language-toggle";

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError(t("signin.invalid"));
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const res = await authClient.signIn.email({
        email,
        password,
        callbackURL: redirectTo,
      });
      if (res.error) {
        setError(t("signin.invalid"));
        setPending(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(t("signin.unknownError"));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-[24px] p-[28px] sm:p-[36px]">
      <header className="flex items-start justify-between gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-0.01em] text-[var(--color-text-strong)]">
            {t("signin.title")}
          </h1>
          <p className="text-[13px] leading-[18px] text-[var(--color-text-soft)]">
            {t("signin.noAccount")}{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-[var(--color-brand-400)] underline underline-offset-2 hover:text-[var(--color-brand-500)]"
            >
              {t("signin.signUpLink")}
            </Link>
          </p>
        </div>
        <AuthLanguageToggle />
      </header>

      <GoogleButton
        label={t("signin.continueGoogle")}
        callbackURL={redirectTo}
      />

      <Divider label={t("auth.orWith")} />

      <form onSubmit={onSubmit} className="flex flex-col gap-[16px]">
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error && !email ? t("auth.required") : undefined}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          required
          togglePassword
          showLabel={t("auth.passwordShow")}
          hideLabel={t("auth.passwordHide")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && email && password ? (
          <p className="-mt-[8px] text-[12px] leading-[16px] text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-[8px] inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[var(--color-accent-orange)] text-[14px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-[var(--color-accent-orange-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[var(--shadow-button-orange-focus)]"
        >
          {pending ? t("signin.signingIn") : t("signin.submit")}
        </button>
      </form>

      <Link
        href="/forgot-password"
        className="self-start text-[13px] font-medium text-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
      >
        {t("signin.forgot")}
      </Link>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-[12px] text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
      <span aria-hidden className="h-px flex-1 bg-[var(--color-stroke-soft)]" />
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-[var(--color-stroke-soft)]" />
    </div>
  );
}
