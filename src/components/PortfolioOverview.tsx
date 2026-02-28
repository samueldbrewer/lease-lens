"use client";

import {
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface PortfolioStats {
  totalLeases: number;
  totalMonthlyRent: number;
  expiringWithin90Days: number;
  leaseTypes: Record<string, number>;
}

export default function PortfolioOverview({
  stats,
}: {
  stats: PortfolioStats;
}) {
  const cards = [
    {
      label: "Active Leases",
      value: stats.totalLeases,
      icon: Building2,
      color: "blue",
    },
    {
      label: "Monthly Portfolio Rent",
      value: `$${stats.totalMonthlyRent.toLocaleString()}`,
      icon: DollarSign,
      color: "green",
    },
    {
      label: "Expiring Within 90 Days",
      value: stats.expiringWithin90Days,
      icon: Calendar,
      color: stats.expiringWithin90Days > 0 ? "amber" : "gray",
    },
    {
      label: "Attention Needed",
      value: stats.expiringWithin90Days > 0 ? "Yes" : "None",
      icon: AlertTriangle,
      color: stats.expiringWithin90Days > 0 ? "red" : "green",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    gray: "bg-gray-100 text-gray-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">{label}</span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      ))}
    </div>
  );
}
