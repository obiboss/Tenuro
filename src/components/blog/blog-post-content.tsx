import Link from "next/link";
import type {
  BlogContentBlock,
  BlogInlinePart,
} from "@/content/blog-posts";

function renderInlineParts(parts: BlogInlinePart[]) {
  return parts.map((part, index) => {
    if (typeof part === "string") {
      return <span key={index}>{part}</span>;
    }

    return (
      <Link
        key={index}
        href={part.href}
        className="font-semibold text-primary underline-offset-2 hover:text-primary-hover hover:underline"
      >
        {part.text}
      </Link>
    );
  });
}

type BlogPostContentProps = {
  sections: BlogContentBlock[];
};

export function BlogPostContent({ sections }: BlogPostContentProps) {
  return (
    <div className="space-y-6 text-base leading-8 text-text-normal">
      {sections.map((section, index) => {
        switch (section.type) {
          case "paragraph":
            return (
              <p key={index}>{renderInlineParts(section.parts)}</p>
            );

          case "heading":
            return (
              <h2
                key={index}
                className="pt-2 text-2xl font-extrabold tracking-tight text-text-strong"
              >
                {section.text}
              </h2>
            );

          case "list":
            if (section.ordered) {
              return (
                <ol
                  key={index}
                  className="list-decimal space-y-3 pl-6 marker:font-bold marker:text-primary"
                >
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ol>
              );
            }

            return (
              <ul
                key={index}
                className="list-disc space-y-3 pl-6 marker:text-primary"
              >
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );

          case "checklist":
            return (
              <ul key={index} className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex items-start gap-3 rounded-2xl border border-border-soft bg-background px-4 py-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border border-border-soft text-xs font-bold text-text-muted"
                    >
                      □
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );

          case "disclaimer":
            return (
              <p
                key={index}
                className="rounded-2xl border border-border-soft bg-background px-4 py-4 text-sm leading-7 text-text-muted"
              >
                This article is for general information only and is not legal
                advice. For a real dispute, speak with a qualified lawyer.
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
