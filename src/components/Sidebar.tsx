"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileUp,
  MessageSquare,
  FileText,
} from "lucide-react";

const nav = [
  { href: "/", label: "Upload", icon: FileUp },
  { href: "/dashboard", label: "Portfolio", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">LeaseLens</h1>
            <p className="text-xs text-slate-400">Lease Intelligence</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="px-4 py-3 bg-slate-800 rounded-lg">
          <p className="text-xs text-slate-400">Powered by Claude AI</p>
          <p className="text-xs text-slate-500 mt-1">
            Lease analysis &amp; portfolio intelligence
          </p>
        </div>
      </div>
    </aside>
  );
}
