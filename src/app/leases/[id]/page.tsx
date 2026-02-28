"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  Wrench,
  FileText,
  MapPin,
  Scale,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface LeaseDetail {
  id: string;
  filename: string;
  status: string;
  pageCount: number;
  createdAt: string;
  leaseTerms?: {
    propertyAddress?: string | null;
    tenantName?: string | null;
    landlordName?: string | null;
    leaseStart?: string | null;
    leaseEnd?: string | null;
    monthlyRent?: string | number | null;
    securityDeposit?: string | number | null;
    leaseType?: string | null;
    squareFootage?: number | null;
    permittedUse?: string | null;
    renewalOptions?: string | null;
    terminationClauses?: string | null;
    maintenanceObligations?: {
      tenant?: string[];
      landlord?: string[];
    } | null;
    insuranceRequirements?: {
      types?: string[];
      minimumCoverage?: string;
    } | null;
    taxObligations?: string | null;
    camCharges?: string | null;
    escalationClauses?: string | null;
    keyProvisions?: string[] | null;
    summary?: string | null;
  } | null;
  chunks?: { id: string; chunkIndex: number; section: string | null; content: string }[];
}

export default function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<LeaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${id}`);
        const data = await res.json();
        setDoc(data.document);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  const terms = doc.leaseTerms;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {terms?.propertyAddress || doc.filename}
            </h1>
            {terms?.propertyAddress && (
              <p className="text-sm text-gray-500">{doc.filename}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          title="Delete document"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {terms?.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-blue-800">{terms.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-800">Basic Information</h2>
          </div>
          <InfoRow label="Tenant" value={terms?.tenantName} />
          <InfoRow label="Landlord" value={terms?.landlordName} />
          <InfoRow label="Property" value={terms?.propertyAddress} />
          <InfoRow label="Lease Type" value={terms?.leaseType} />
          <InfoRow
            label="Square Footage"
            value={
              terms?.squareFootage
                ? `${terms.squareFootage.toLocaleString()} sq ft`
                : null
            }
          />
          <InfoRow label="Permitted Use" value={terms?.permittedUse} />
        </div>

        {/* Financial Terms */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-gray-800">Financial Terms</h2>
          </div>
          <InfoRow
            label="Monthly Rent"
            value={
              terms?.monthlyRent
                ? `$${Number(terms.monthlyRent).toLocaleString()}`
                : null
            }
          />
          <InfoRow
            label="Security Deposit"
            value={
              terms?.securityDeposit
                ? `$${Number(terms.securityDeposit).toLocaleString()}`
                : null
            }
          />
          <InfoRow label="CAM Charges" value={terms?.camCharges} />
          <InfoRow label="Tax Obligations" value={terms?.taxObligations} />
        </div>

        {/* Dates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-800">Key Dates</h2>
          </div>
          <InfoRow
            label="Lease Start"
            value={
              terms?.leaseStart
                ? new Date(terms.leaseStart).toLocaleDateString()
                : null
            }
          />
          <InfoRow
            label="Lease End"
            value={
              terms?.leaseEnd
                ? new Date(terms.leaseEnd).toLocaleDateString()
                : null
            }
          />
          <InfoRow label="Renewal Options" value={terms?.renewalOptions} />
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-800">Maintenance</h2>
          </div>
          {terms?.maintenanceObligations?.tenant &&
            terms.maintenanceObligations.tenant.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Tenant Responsible
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {terms.maintenanceObligations.tenant.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">&#8226;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {terms?.maintenanceObligations?.landlord &&
            terms.maintenanceObligations.landlord.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Landlord Responsible
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {terms.maintenanceObligations.landlord.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">&#8226;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {!terms?.maintenanceObligations && (
            <p className="text-sm text-gray-400">Not specified</p>
          )}
        </div>

        {/* Insurance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-gray-800">Insurance</h2>
          </div>
          {terms?.insuranceRequirements?.types &&
            terms.insuranceRequirements.types.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Required Types
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {terms.insuranceRequirements.types.map((type, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">&#8226;</span>
                      {type}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          <InfoRow
            label="Minimum Coverage"
            value={terms?.insuranceRequirements?.minimumCoverage}
          />
          {!terms?.insuranceRequirements && (
            <p className="text-sm text-gray-400">Not specified</p>
          )}
        </div>

        {/* Escalation & Termination */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-gray-800">
              Escalation & Termination
            </h2>
          </div>
          <InfoRow
            label="Escalation Clauses"
            value={terms?.escalationClauses}
          />
          <InfoRow
            label="Termination Clauses"
            value={terms?.terminationClauses}
          />
        </div>
      </div>

      {/* Key Provisions */}
      {terms?.keyProvisions && terms.keyProvisions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-teal-500" />
            <h2 className="font-semibold text-gray-800">Key Provisions</h2>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {terms.keyProvisions.map((provision, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 flex items-start gap-2 bg-gray-50 rounded-lg p-3"
              >
                <MapPin className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                {provision}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw Document Text */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowRawText(!showRawText)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">
              Document Sections ({doc.chunks?.length || 0} chunks)
            </h2>
          </div>
          <span className="text-sm text-blue-600">
            {showRawText ? "Hide" : "Show"}
          </span>
        </button>
        {showRawText && doc.chunks && (
          <div className="px-5 pb-5 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
            {doc.chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700"
              >
                {chunk.section && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mb-2">
                    {chunk.section}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{chunk.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
