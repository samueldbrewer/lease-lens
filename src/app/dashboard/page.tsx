"use client";

import { useState, useEffect } from "react";
import LeaseCard from "@/components/LeaseCard";
import PortfolioOverview from "@/components/PortfolioOverview";
import { Search, SlidersHorizontal } from "lucide-react";

interface Document {
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
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    if (filter === "ready" && doc.status !== "ready") return false;
    if (filter === "error" && doc.status !== "error") return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        doc.filename.toLowerCase().includes(s) ||
        doc.leaseTerms?.propertyAddress?.toLowerCase().includes(s) ||
        doc.leaseTerms?.tenantName?.toLowerCase().includes(s) ||
        doc.leaseTerms?.landlordName?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const readyDocs = documents.filter((d) => d.status === "ready");

  const stats = {
    totalLeases: readyDocs.length,
    totalMonthlyRent: readyDocs.reduce(
      (sum, d) => sum + (Number(d.leaseTerms?.monthlyRent) || 0),
      0
    ),
    expiringWithin90Days: readyDocs.filter((d) => {
      if (!d.leaseTerms?.leaseEnd) return false;
      const diff =
        new Date(d.leaseTerms.leaseEnd).getTime() - Date.now();
      return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
    }).length,
    leaseTypes: readyDocs.reduce(
      (acc, d) => {
        const type = d.leaseTerms?.leaseType || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Lease Portfolio</h1>
        <p className="text-gray-500 mt-1">
          {documents.length} document{documents.length !== 1 ? "s" : ""} in your
          portfolio
        </p>
      </div>

      {documents.length > 0 && <PortfolioOverview stats={stats} />}

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by property, tenant, or landlord..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="ready">Analyzed</option>
            <option value="error">Errors</option>
          </select>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">
            {documents.length === 0
              ? "No documents uploaded yet. Go to Upload to add lease documents."
              : "No documents match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <LeaseCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
