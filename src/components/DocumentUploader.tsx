"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UploadResult {
  filename: string;
  id?: string;
  status: string;
  error?: string;
  note?: string;
}

export default function DocumentUploader({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState<string[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setResults([]);
      setProgress(
        acceptedFiles.map(
          (f) => `Processing ${f.name}...`
        )
      );

      const formData = new FormData();
      for (const file of acceptedFiles) {
        formData.append("files", file);
      }

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.results) {
          setResults(data.results);
        } else if (data.error) {
          setResults([{ filename: "Upload", status: "error", error: data.error }]);
        }

        onUploadComplete?.();
      } catch (error) {
        setResults([
          {
            filename: "Upload",
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          },
        ]);
      } finally {
        setUploading(false);
        setProgress([]);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    disabled: uploading,
  });

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : uploading
              ? "border-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Processing Documents...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Extracting text and analyzing lease terms with AI
              </p>
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              {progress.map((p, i) => (
                <p key={i} className="text-xs text-gray-500 animate-pulse">
                  {p}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-semibold text-gray-700">
                {isDragActive
                  ? "Drop lease documents here"
                  : "Upload Lease Documents"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop PDF files or click to browse. Supports multiple
                files.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              PDFs will be analyzed and structured automatically using AI
            </p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-6 py-4">
            <h3 className="font-semibold text-gray-800">Upload Results</h3>
          </div>
          {results.map((result, i) => (
            <div
              key={i}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">{result.filename}</p>
                  {result.error && (
                    <p className="text-sm text-red-500">{result.error}</p>
                  )}
                  {result.note && (
                    <p className="text-sm text-amber-600">{result.note}</p>
                  )}
                </div>
              </div>
              {result.status === "ready" ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
