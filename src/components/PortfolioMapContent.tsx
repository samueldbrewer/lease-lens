"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default icon paths for bundled environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapProperty {
  id: string;
  filename: string;
  propertyAddress: string;
  tenantName?: string | null;
  monthlyRent?: string | number | null;
  latitude: number;
  longitude: number;
}

function FitBounds({ properties }: { properties: MapProperty[] }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length === 0) return;

    const bounds = L.latLngBounds(
      properties.map((p) => [p.latitude, p.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [map, properties]);

  return null;
}

export default function PortfolioMapContent({
  properties,
}: {
  properties: MapProperty[];
}) {
  if (properties.length === 0) return null;

  const center: [number, number] = [
    properties.reduce((sum, p) => sum + p.latitude, 0) / properties.length,
    properties.reduce((sum, p) => sum + p.longitude, 0) / properties.length,
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Portfolio Map</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {properties.length} propert{properties.length === 1 ? "y" : "ies"} with mapped locations
        </p>
      </div>
      <div style={{ height: "400px" }}>
        <MapContainer
          center={center}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds properties={properties} />
          {properties.map((property) => (
            <Marker
              key={property.id}
              position={[property.latitude, property.longitude]}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{property.propertyAddress}</p>
                  {property.tenantName && (
                    <p className="text-gray-600">Tenant: {property.tenantName}</p>
                  )}
                  {property.monthlyRent && (
                    <p className="text-gray-600">
                      Rent: ${Number(property.monthlyRent).toLocaleString()}/mo
                    </p>
                  )}
                  <a
                    href={`/leases/${property.id}`}
                    className="text-teal-700 hover:text-teal-900 underline text-xs mt-1 inline-block"
                  >
                    View Details
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
