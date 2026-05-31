import { BopaLoader } from "@/components/ui/bopa-loader";

export default function Loading() {
  return (
    <BopaLoader
      fullScreen
      size="lg"
      label="Opening your secure onboarding link..."
    />
  );
}
