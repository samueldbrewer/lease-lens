"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileUp,
  MessageSquare,
  FileText,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/", label: "Upload", icon: FileUp },
  { href: "/dashboard", label: "Portfolio", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  // Don't render sidebar on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col min-h-screen">
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
          {session?.user && (
            <div className="px-4 py-3 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-200 font-medium truncate">
                {session.user.name || session.user.email}
              </p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 mt-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          <span className="text-lg font-bold">LeaseLens</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {mobileOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile slide-over menu */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-[52px] right-0 z-50 w-64 bg-slate-900 text-white shadow-xl rounded-bl-xl">
            <nav className="p-4 space-y-1">
              {nav.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
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
              {session?.user && (
                <div className="border-t border-slate-700 mt-2 pt-2">
                  <p className="px-4 py-1 text-xs text-slate-400 truncate">{session.user.email}</p>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign out</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        </>
      )}

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-1 safe-area-bottom">
        <div className="flex justify-around">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors ${
                  active
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
