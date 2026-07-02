import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogCta } from "@/content/blog-posts";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BlogCtaCardProps = {
  cta: BlogCta;
};

export function BlogCtaCard({ cta }: BlogCtaCardProps) {
  return (
    <Card className="mt-10 border border-primary/20 bg-primary-soft/30">
      <CardHeader>
        <CardTitle className="text-xl">{cta.title}</CardTitle>
        {cta.description ? (
          <CardDescription className="text-base leading-7 text-text-normal">
            {cta.description}
          </CardDescription>
        ) : null}
      </CardHeader>

      <Link href={cta.href}>
        <Button size="lg">
          {cta.label}
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
        </Button>
      </Link>
    </Card>
  );
}
