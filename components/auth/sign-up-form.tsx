"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/i18n/provider";
import { TextField } from "./text-field";
import { GoogleButton } from "./google-button";
import { AuthLanguageToggle } from "./language-toggle";

export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!firstName.trim() || !email.trim() || password.length < 8) {
      setError(
        password.length < 8 ? t("signup.weakPassword") : t("auth.required"),
      );
      return;
    }
    setPending(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    try {
      const res = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: fullName,
        ...(company.trim()
          ? ({ company: company.trim() } as Record<string, string>)
          : {}),
        callbackURL: redirectTo,
      });
      if (res.error) {
        const code = res.error.code ?? res.error.message ?? "";
        if (/exist|taken|already/i.test(String(code))) {
          setError(t("signup.taken"));
        } else if (/password/i.test(String(code))) {
          setError(t("signup.weakPassword"));
        } else {
          setError(t("signup.unknownError"));
        }
        setPending(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(t("signup.unknownError"));
      setPending(false);
    }
  }

  const consent = t("signup.consent", {
    terms: "__TERMS__",
    privacy: "__PRIVACY__",
  });
  const consentParts = consent.split(/(__TERMS__|__PRIVACY__)/g);

  return (
    <div className="flex flex-col gap-[24px] p-[28px] sm:p-[36px]">
      <header className="flex items-start justify-between gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-0.01em] text-[var(--color-text-strong)]">
            {t("signup.title")}
          </h1>
          <p className="text-[13px] leading-[18px] text-[var(--color-text-soft)]">
            {t("signup.haveAccount")}{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-[var(--color-brand-400)] underline underline-offset-2 hover:text-[var(--color-brand-500)]"
            >
              {t("signup.logInLink")}
            </Link>
          </p>
        </div>
        <AuthLanguageToggle />
      </header>

      <GoogleButton label={t("signup.continueGoogle")} callbackURL={redirectTo} />

      <form onSubmit={onSubmit} className="flex flex-col gap-[16px]">
        <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
          <TextField
            label={t("auth.firstName")}
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label={t("auth.lastName")}
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t("auth.company")}
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          required
          togglePassword
          minLength={8}
          hint={t("auth.passwordHint")}
          showLabel={t("auth.passwordShow")}
          hideLabel={t("auth.passwordHide")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p className="-mt-[4px] text-[12px] leading-[16px] text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-[8px] inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[var(--color-accent-orange)] text-[14px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-[var(--color-accent-orange-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[var(--shadow-button-orange-focus)]"
        >
          {pending ? t("signup.creating") : t("signup.submit")}
        </button>
      </form>

      <p className="text-[12px] leading-[18px] text-[var(--color-text-soft)]">
        {consentParts.map((part, i) => {
          if (part === "__TERMS__") {
            return (
              <Link
                key={i}
                href="/terms"
                className="text-[var(--color-brand-400)] underline underline-offset-2 hover:text-[var(--color-brand-500)]"
              >
                {t("signup.terms")}
              </Link>
            );
          }
          if (part === "__PRIVACY__") {
            return (
              <Link
                key={i}
                href="/privacy"
                className="text-[var(--color-brand-400)] underline underline-offset-2 hover:text-[var(--color-brand-500)]"
              >
                {t("signup.privacy")}
              </Link>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </p>
    </div>
  );
}
