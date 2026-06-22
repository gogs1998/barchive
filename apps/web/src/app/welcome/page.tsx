import { PageShell } from "@/components/PageShell";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export const metadata = {
  title: "Welcome — BarIQ",
  description:
    "Set up your bar in 30 seconds and find out which cocktails you can make right now.",
};

export default function WelcomePage() {
  return (
    <PageShell>
      <OnboardingWizard />
    </PageShell>
  );
}
