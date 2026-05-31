import { BopaLoader } from "@/components/ui/bopa-loader";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-16">
      <BopaLoader size="lg" label="Preparing agent workspace..." />
    </div>
  );
}
