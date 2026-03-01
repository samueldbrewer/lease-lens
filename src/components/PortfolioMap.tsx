"use client";

import dynamic from "next/dynamic";

const PortfolioMapContent = dynamic(
  () => import("./PortfolioMapContent"),
  { ssr: false }
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

  if (properties.length === 0) return null;

  return <PortfolioMapContent properties={properties} />;
}
