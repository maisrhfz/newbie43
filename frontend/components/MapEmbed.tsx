"use client";

import type { LatLng } from "@/lib/types";

type Props = {
  origin: LatLng;
  destination: LatLng;
};

export function MapEmbed({ origin, destination }: Props) {
  // Leaflet map HTML with Start (Green) and End (Red) markers
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #1e293b; }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map');

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Green icon for Origin
          const greenIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          // Red icon for Destination
          const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          const start = [${origin.lat}, ${origin.lng}];
          const end = [${destination.lat}, ${destination.lng}];

          L.marker(start, { icon: greenIcon }).addTo(map).bindPopup('Origin');
          L.marker(end, { icon: redIcon }).addTo(map).bindPopup('Destination');

          const bounds = L.latLngBounds([start, end]);
          map.fitBounds(bounds, { padding: [40, 40] });
        </script>
      </body>
    </html>
  `;

  return (
    <div
      style={{
        width: "100%",
        height: "260px",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        marginTop: "16px",
      }}
    >
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        srcDoc={mapHtml}
        title="Route Map with Origin and Destination"
      />
    </div>
  );
}