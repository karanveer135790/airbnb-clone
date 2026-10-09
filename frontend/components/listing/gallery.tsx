"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Grid2X2, ImageOff } from "lucide-react";
import { Modal } from "@/components/modal";

export function PropertyPhoto({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={`image-fallback ${className}`}>
      <ImageOff size={30} />
      Photo unavailable
    </span>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
export function Gallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const change = (direction: number) =>
    setIndex(
      (value) => ((value ?? 0) + direction + photos.length) % photos.length,
    );
  return (
    <>
      <section className={`property-gallery photos-${Math.min(photos.length, 5)}`} aria-label="Property photos">
        {photos.slice(0, 5).map((src, i) => (
          <button
            key={src}
            className={`gallery-tile tile-${i}`}
            onClick={() => setIndex(i)}
            aria-label={`Open photo ${i + 1} of ${title}`}
          >
            <PropertyPhoto
              src={src}
              alt={`${title}, photo ${i + 1}`}
              eager={i === 0}
            />
          </button>
        ))}
        <button className="show-photos" onClick={() => setIndex(0)}>
          <Grid2X2 size={16} />
          {photos.length === 1 ? "View photo" : "Show all photos"}
        </button>
      </section>
      {index !== null && (
        <Modal
          title={`${index + 1} / ${photos.length} · ${title}`}
          onClose={() => setIndex(null)}
        >
          <div
            className="gallery-viewer"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                change(1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                change(-1);
              }
            }}
          >
            <PropertyPhoto
              key={photos[index]}
              src={photos[index]}
              alt={`${title}, photo ${index + 1}`}
              eager
            />
            <div className="gallery-controls">
              <button
                className="icon-button"
                disabled={photos.length < 2}
                aria-label="Previous photo"
                onClick={() => change(-1)}
              >
                <ChevronLeft />
              </button>
              <p aria-live="polite">
                Photo {index + 1} of {photos.length}
              </p>
              <button
                className="icon-button"
                disabled={photos.length < 2}
                aria-label="Next photo"
                onClick={() => change(1)}
              >
                <ChevronRight />
              </button>
            </div>
            <div className="gallery-thumbnails">
              {photos.map((src, i) => (
                <button
                  aria-label={`View photo ${i + 1}`}
                  aria-pressed={i === index}
                  key={src}
                  className={i === index ? "selected" : ""}
                  onClick={() => setIndex(i)}
                >
                  <PropertyPhoto src={src} alt={`Thumbnail ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
