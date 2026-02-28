"use client";

import { useState, useEffect } from "react";
import DocumentUploader from "@/components/DocumentUploader";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface DocumentStatus {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
}

export default function UploadPage() {
  const [recentDocs, setRecentDocs] = useState<DocumentStatus[]>([]);

  const fetchRecent = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setRecentDocs(data.documents?.slice(0, 5) || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Upload Lease Documents
          </h1>
          <p className="text-gray-500 mt-2">
            Upload your commercial lease PDFs for AI-powered analysis. Each
            document will be parsed, structured, and made searchable through the
            chat interface.
          </p>
        </div>

        <DocumentUploader onUploadComplete={fetchRecent} />

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium text-gray-800">Upload</h3>
              <p className="text-sm text-gray-500">
                Drop your lease PDFs. We support bulk uploads of any number of
                documents.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-medium text-gray-800">AI Analysis</h3>
              <p className="text-sm text-gray-500">
                Claude AI extracts key terms: rent, dates, obligations,
                insurance, maintenance, and more.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-medium text-gray-800">Query & Compare</h3>
              <p className="text-sm text-gray-500">
                Use the chat interface to ask questions across your entire
                portfolio.
              </p>
            </div>
          </div>
        </div>

        {recentDocs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                Recently Uploaded
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {doc.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    {doc.status === "ready" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : doc.status === "processing" ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : doc.status === "error" ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
