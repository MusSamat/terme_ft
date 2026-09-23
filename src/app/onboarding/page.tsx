"use client";

import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/features/onboarding/welcome-screen";
import { markOnboardingSeen } from "@/components/features/onboarding/onboarding-gate";
import { markRoleChosen } from "@/store/role-prompt";
import { useAuth } from "@/store/auth";

export default function OnboardingPage() {
  const router = useRouter();
  const setActiveMode = useAuth((s) => s.setActiveMode);

  return (
    <WelcomeScreen
      onContinue={(mode) => {
        // Persist the first-selected role, then enter the app on the main hub
        // «/» (search) in that role — not straight into the results list.
        setActiveMode(mode);
        markOnboardingSeen();
        // The welcome role pick IS the one-time role choice — record it so the
        // hub gate modal doesn't ask again on arrival.
        markRoleChosen();
        router.replace("/");
      }}
    />
  );
}
