import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Wizard } from "@/components/onboarding/wizard";
import { OnboardingTopRight } from "@/components/onboarding/top-right";
import { getSession, isOnboarded } from "@/lib/auth-server";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in?redirect=/onboarding");
  }
  if (await isOnboarded(session.user.id)) {
    redirect("/agency");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-app)]">
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[var(--color-stroke-soft)] px-[24px]">
        <Link href="/" className="group/logo">
          <Logo />
        </Link>
        <OnboardingTopRight
          userName={session.user.name ?? session.user.email ?? ""}
          userImage={session.user.image ?? undefined}
        />
      </header>
      <main className="flex flex-1 items-start justify-center px-[16px] pt-[18vh]">
        <Wizard />
      </main>
    </div>
  );
}
