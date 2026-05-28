import { ImageIcon, Video } from "lucide-react";
import type { AgentPropertyListingMediaView } from "@/server/services/agent-property-listing-media-read.service";

function getMediaCounts(media: AgentPropertyListingMediaView[]) {
  return {
    images: media.filter((item) => item.media_type === "image").length,
    videos: media.filter((item) => item.media_type === "video").length,
  };
}

function getCoverMedia(media: AgentPropertyListingMediaView[]) {
  return (
    media.find((item) => item.is_cover && item.publicUrl) ??
    media.find((item) => item.media_type === "image" && item.publicUrl) ??
    media.find((item) => item.publicUrl) ??
    null
  );
}

export function ListingMediaSummary({
  media,
}: {
  media: AgentPropertyListingMediaView[];
}) {
  const counts = getMediaCounts(media);
  const cover = getCoverMedia(media);

  if (media.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-button border border-dashed border-border-soft bg-white p-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-background text-text-muted">
          <ImageIcon aria-hidden="true" size={20} strokeWidth={2.6} />
        </div>

        <div>
          <p className="text-sm font-black text-text-strong">No media yet</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
            Add pictures or short videos before sharing this listing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-button bg-white p-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-background">
        {cover?.publicUrl && cover.media_type === "image" ? (
          <div
            aria-label={cover.original_filename}
            role="img"
            className="size-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${cover.publicUrl})`,
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-text-muted">
            <Video aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-black text-text-strong">
          {counts.images} {counts.images === 1 ? "photo" : "photos"} ·{" "}
          {counts.videos} {counts.videos === 1 ? "video" : "videos"}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
          Media is available on the tenant-facing listing page.
        </p>
      </div>
    </div>
  );
}

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
