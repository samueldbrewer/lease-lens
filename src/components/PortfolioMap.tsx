"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

const PortfolioMapContent = dynamic(
  () => import("./PortfolioMapContent"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Portfolio Map</h2>
          <p className="text-xs text-gray-500 mt-0.5">Loading map...</p>
        </div>
        <div className="flex items-center justify-center" style={{ height: "400px" }}>
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      </div>
    ),
  }
);

interface Document {
  id: string;
  filename: string;
  leaseTerms?: {
    propertyAddress?: string | null;
    tenantName?: string | null;
    monthlyRent?: string | number | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

export default function PortfolioMap({ documents }: { documents: Document[] }) {
  const properties = documents
    .filter(
      (doc) =>
        doc.leaseTerms?.latitude != null &&
        doc.leaseTerms?.longitude != null &&
        doc.leaseTerms?.propertyAddress
    )
    .map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      propertyAddress: doc.leaseTerms!.propertyAddress!,
      tenantName: doc.leaseTerms!.tenantName,
      monthlyRent: doc.leaseTerms!.monthlyRent,
      latitude: doc.leaseTerms!.latitude!,
      longitude: doc.leaseTerms!.longitude!,
    }));

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Portfolio Map</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <MapPin className="w-10 h-10 mb-2" />
          <p className="text-sm">No properties with mapped locations</p>
          <p className="text-xs mt-1">Property addresses are geocoded during document processing</p>
        </div>
      </div>
    );
  }

  return <PortfolioMapContent properties={properties} />;
}
