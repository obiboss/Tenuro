import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/content/blog-posts";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RelatedPostsProps = {
  posts: BlogPost[];
};

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-border-soft pt-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-text-strong">
        Related articles
      </h2>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
            <Card className="h-full transition hover:border-primary/30 hover:bg-primary-soft/20">
              <CardHeader>
                <Badge tone="primary">{post.category}</Badge>
                <CardTitle className="mt-3 text-base leading-7 group-hover:text-primary">
                  {post.title}
                </CardTitle>
                <CardDescription>{post.description}</CardDescription>
                <span className="inline-flex items-center gap-2 pt-2 text-sm font-extrabold text-primary group-hover:text-primary-hover">
                  Read article
                  <ArrowRight aria-hidden="true" size={16} strokeWidth={2.6} />
                </span>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
