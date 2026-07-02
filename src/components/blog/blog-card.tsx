import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { BlogPost } from "@/content/blog-posts";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BlogCardProps = {
  post: BlogPost;
};

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group">
      <Card className="h-full transition hover:border-primary/30 hover:bg-primary-soft/20">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="primary">{post.category}</Badge>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
              <Clock3 aria-hidden="true" size={14} strokeWidth={2.4} />
              {post.readingTime}
            </span>
          </div>

          <CardTitle className="mt-4 text-xl leading-8 group-hover:text-primary">
            {post.title}
          </CardTitle>

          <CardDescription className="text-base leading-7">
            {post.description}
          </CardDescription>

          <span className="inline-flex items-center gap-2 pt-2 text-sm font-extrabold text-primary group-hover:text-primary-hover">
            Read article
            <ArrowRight aria-hidden="true" size={17} strokeWidth={2.6} />
          </span>
        </CardHeader>
      </Card>
    </Link>
  );
}
