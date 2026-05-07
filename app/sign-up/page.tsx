import { redirect } from "next/navigation";
import { AuthShell, AuthCard } from "@/components/auth/auth-shell";
import { MarketingCard } from "@/components/auth/marketing-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSession, isOnboarded } from "@/lib/auth-server";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/agency";

  if (session?.user) {
    if (await isOnboarded(session.user.id)) {
      redirect(redirectTo);
    }
    redirect("/onboarding");
  }

  return (
    <AuthShell>
      <MarketingCard />
      <AuthCard>
        <SignUpForm redirectTo={redirectTo} />
      </AuthCard>
    </AuthShell>
  );
}
