import { ImageIcon, Video } from "lucide-react";
import type { AgentPropertyListingMediaView } from "@/server/services/agent-property-listing-media-read.service";

export function ListingMediaGallery({
  media,
  compact = false,
}: {
  media: AgentPropertyListingMediaView[];
  compact?: boolean;
}) {
  if (media.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border-soft bg-white p-4 text-sm font-semibold leading-6 text-text-muted">
        No pictures or videos uploaded yet.
      </div>
    );
  }

  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-3" : "grid gap-4"}>
      {media.map((item) => {
        if (!item.publicUrl) {
          return (
            <div
              key={item.id}
              className="rounded-card border border-border-soft bg-white p-4 text-sm font-semibold leading-6 text-text-muted"
            >
              Media uploaded, but public media URL is not configured.
            </div>
          );
        }

        if (item.media_type === "video") {
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-card border border-border-soft bg-white"
            >
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide text-text-muted">
                <Video aria-hidden="true" size={16} strokeWidth={2.6} />
                Video
              </div>

              <video
                controls
                preload="metadata"
                className="aspect-video w-full bg-black object-cover"
              >
                <source src={item.publicUrl} type={item.mime_type} />
                Your browser does not support video playback.
              </video>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-card border border-border-soft bg-white"
          >
            <div
              aria-label={item.original_filename}
              role="img"
              className="aspect-video w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${item.publicUrl})`,
              }}
            />

            <div className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide text-text-muted">
              <ImageIcon aria-hidden="true" size={16} strokeWidth={2.6} />
              {item.is_cover ? "Cover image" : "Image"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
