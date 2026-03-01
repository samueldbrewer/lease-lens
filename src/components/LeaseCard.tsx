"use client";

import Link from "next/link";
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";

interface LeaseCardProps {
  document: {
    id: string;
    filename: string;
    status: string;
    pageCount: number;
    createdAt: string;
    errorMessage?: string | null;
    leaseTerms?: {
      propertyAddress?: string | null;
      tenantName?: string | null;
      landlordName?: string | null;
      leaseStart?: string | null;
      leaseEnd?: string | null;
      monthlyRent?: string | number | null;
      leaseType?: string | null;
      summary?: string | null;
    } | null;
  };
}

export default function LeaseCard({ document: doc }: LeaseCardProps) {
  const terms = doc.leaseTerms;
  const isExpiringSoon =
    terms?.leaseEnd &&
    new Date(terms.leaseEnd).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/leases/${doc.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              doc.status === "ready"
                ? "bg-green-100"
                : doc.status === "error"
                  ? "bg-red-100"
                  : "bg-yellow-100"
            }`}
          >
            {doc.status === "ready" ? (
              <Building2 className="w-5 h-5 text-green-600" />
            ) : doc.status === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 line-clamp-1">
              {terms?.propertyAddress || doc.filename}
            </h3>
            {terms?.propertyAddress && (
              <p className="text-xs text-gray-500">{doc.filename}</p>
            )}
          </div>
        </div>
        {isExpiringSoon && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            Expiring Soon
          </span>
        )}
        {doc.status === "ready" && !isExpiringSoon && (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
      </div>

      {doc.status === "error" && (
        <p className="text-sm text-red-500 mb-3">
          {doc.errorMessage || "Processing failed"}
        </p>
      )}

      {terms && (
        <div className="space-y-2">
          {terms.tenantName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>
                {terms.tenantName}
                {terms.landlordName && ` / ${terms.landlordName}`}
              </span>
            </div>
          )}

          {(terms.leaseStart || terms.leaseEnd) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                {terms.leaseStart
                  ? new Date(terms.leaseStart).toLocaleDateString()
                  : "??"}{" "}
                -{" "}
                {terms.leaseEnd
                  ? new Date(terms.leaseEnd).toLocaleDateString()
                  : "??"}
              </span>
            </div>
          )}

          {terms.monthlyRent && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>
                ${Number(terms.monthlyRent).toLocaleString()}/mo
                {terms.leaseType && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {terms.leaseType}
                  </span>
                )}
              </span>
            </div>
          )}

          {terms.summary && (
            <p className="text-xs text-gray-500 mt-3 line-clamp-2">
              {terms.summary}
            </p>
          )}
        </div>
      )}

      {!terms && doc.status === "ready" && (
        <p className="text-sm text-gray-500">
          Document processed. Click to view details.
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-3">
          {doc.status === "ready" && (
            <a
              href={`/api/documents/${doc.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              View PDF
            </a>
          )}
          <span className="text-xs text-gray-400">
            {new Date(doc.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
