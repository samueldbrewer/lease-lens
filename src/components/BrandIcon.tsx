export default function BrandIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Building */}
      <rect x="4" y="10" width="20" height="26" rx="2" fill="#0f766e" />
      {/* Windows row 1 */}
      <rect x="8" y="14" width="4" height="4" rx="0.5" fill="#99f6e4" />
      <rect x="16" y="14" width="4" height="4" rx="0.5" fill="#99f6e4" />
      {/* Windows row 2 */}
      <rect x="8" y="22" width="4" height="4" rx="0.5" fill="#99f6e4" />
      <rect x="16" y="22" width="4" height="4" rx="0.5" fill="#99f6e4" />
      {/* Door */}
      <rect x="11" y="30" width="6" height="6" rx="1" fill="#14b8a6" />
      {/* Document overlay */}
      <rect x="20" y="4" width="16" height="20" rx="2" fill="white" stroke="#0f766e" strokeWidth="1.5" />
      {/* Document lines */}
      <line x1="24" y1="9" x2="32" y2="9" stroke="#0f766e" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="13" x2="32" y2="13" stroke="#0f766e" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="17" x2="29" y2="17" stroke="#0f766e" strokeWidth="1.2" strokeLinecap="round" />
      {/* Checkmark */}
      <circle cx="30" cy="20" r="6" fill="#14b8a6" />
      <path d="M27 20l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
