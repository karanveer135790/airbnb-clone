"use client";
import { useState } from "react";
import { House, MapPin } from "lucide-react";
/** Static, non-interactive viewport of nine standard raster tiles. */
export function StaticMap({
  latitude,
  longitude,
  city,
}: {
  latitude: number;
  longitude: number;
  city: string;
}) {
  const [failed, setFailed] = useState(false);
  const zoom = 12,
    scale = 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const lat = (Math.min(85, Math.max(-85, latitude)) * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale;
  const centerX = Math.floor(x),
    centerY = Math.floor(y);
  return (
    <div
      className="location-map"
      role="region"
      aria-label={`Static map of the approximate demo location in ${city}`}
    >
      {!failed && (
        <div
          className="map-tile-grid"
          style={{
            transform: "scale(2.25)",
            transformOrigin: `${(x - centerX + 1) * 256}px ${(y - centerY + 1) * 256}px`,
            left: `calc(50% - ${(x - centerX + 1) * 256}px)`,
            top: `calc(50% - ${(y - centerY + 1) * 256}px)`,
          }}
        >
          {[-1, 0, 1].flatMap((row) =>
            [-1, 0, 1].map((column) => (
              <img
                key={`${row}:${column}`}
                src={`https://tile.openstreetmap.org/${zoom}/${(centerX + column + scale) % scale}/${centerY + row}.png`}
                alt=""
                width={256}
                height={256}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => setFailed(true)}
              />
            )),
          )}
        </div>
      )}
      <span className="map-home">
        <House size={24} />
      </span>
      {failed && (
        <div className="map-unavailable">
          <MapPin size={24} />
          <p>Map unavailable</p>
          <small>
            {latitude.toFixed(3)}, {longitude.toFixed(3)}
          </small>
        </div>
      )}
      <span className="map-location-label">{city} · approximate location</span>
      <a
        className="map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
