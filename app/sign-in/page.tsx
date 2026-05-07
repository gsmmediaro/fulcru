import { redirect } from "next/navigation";
import { AuthShell, AuthCard } from "@/components/auth/auth-shell";
import { MarketingCard } from "@/components/auth/marketing-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession, isOnboarded } from "@/lib/auth-server";

export default async function SignInPage({
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
        <SignInForm redirectTo={redirectTo} />
      </AuthCard>
    </AuthShell>
  );
}
