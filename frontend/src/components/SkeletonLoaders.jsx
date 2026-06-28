import React from 'react';

/* ============================================================
 *  SKELETON LOADER COMPONENTS
 *  Reusable animated shimmer placeholders used across tabs.
 *  Use: isFetching && data.length === 0 → show skeleton
 *       data.length === 0 && !isFetching  → show empty state
 *       data.length > 0                   → show real content
 * ============================================================ */

// ── Base shimmer block ──────────────────────────────────────
const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// ── KPI Stat Card skeleton (Dashboard top row) ──────────────
export const SkeletonStatCard = () => (
  <div className="stat-card">
    <Shimmer className="w-9 h-9 rounded-lg flex-shrink-0" />
    <div className="flex flex-col gap-1.5 flex-1">
      <Shimmer className="h-3 w-20" />
      <Shimmer className="h-6 w-12" />
    </div>
  </div>
);

// ── Table row skeleton (Dashboard & CustomerHistory orders) ──
export const SkeletonTableRow = ({ cols = 8 }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Shimmer className={`h-3.5 ${i === 0 ? 'w-16' : i === 2 ? 'w-28' : i === cols - 1 ? 'w-10 mx-auto' : 'w-20'}`} />
      </td>
    ))}
  </tr>
);

// ── Customer card skeleton (CustomerHistory grid) ────────────
export const SkeletonCustomerCard = () => (
  <div className="card p-4 flex items-start gap-3">
    <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <Shimmer className="h-4 w-32" />
      <Shimmer className="h-3 w-24" />
      <div className="flex gap-2 mt-1">
        <Shimmer className="h-5 w-16 rounded-full" />
        <Shimmer className="h-5 w-20 rounded-full" />
      </div>
    </div>
    <Shimmer className="w-6 h-6 rounded" />
  </div>
);

// ── Analytics summary card skeleton ─────────────────────────
export const SkeletonAnalyticsCard = () => (
  <div className="card p-5 flex flex-col gap-3">
    <div className="flex justify-between items-center">
      <Shimmer className="h-3.5 w-28" />
      <Shimmer className="h-6 w-6 rounded" />
    </div>
    <Shimmer className="h-8 w-24" />
    <Shimmer className="h-2.5 w-full rounded-full" />
    <Shimmer className="h-3 w-16" />
  </div>
);

// ── Analytics chart area skeleton ───────────────────────────
export const SkeletonChart = ({ height = 'h-48' }) => (
  <div className={`card p-5 flex flex-col gap-4`}>
    <div className="flex justify-between items-center">
      <Shimmer className="h-4 w-36" />
      <Shimmer className="h-7 w-28 rounded-lg" />
    </div>
    {/* Fake bar chart */}
    <div className={`${height} flex items-end gap-2 px-2`}>
      {[60, 85, 45, 70, 90, 55, 75, 40, 80, 65, 95, 50].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div
            className="w-full rounded-t bg-gray-200 animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
          />
        </div>
      ))}
    </div>
    {/* X-axis labels */}
    <div className="flex gap-2 px-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Shimmer key={i} className="flex-1 h-2.5" />
      ))}
    </div>
  </div>
);

// ── Full-page table skeleton (combined stat + table) ─────────
export const SkeletonDashboard = () => (
  <div className="flex flex-col gap-5">
    {/* Stats row */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
    {/* Table card */}
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-3">
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-3 w-36" />
        </div>
        <Shimmer className="h-8 w-64 rounded-lg" />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {['Order ID', 'Bill No.', 'Customer', 'Mobile', 'Date', 'Amount', 'Status', 'View'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTableRow key={i} cols={8} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Customer history skeleton ────────────────────────────────
export const SkeletonCustomerHistory = () => (
  <div className="flex flex-col gap-5">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-3 w-44" />
      </div>
      <Shimmer className="h-8 w-64 rounded-lg" />
    </div>
    {/* Customer cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCustomerCard key={i} />)}
    </div>
  </div>
);

// ── Analytics skeleton ───────────────────────────────────────
export const SkeletonAnalytics = () => (
  <div className="flex flex-col gap-5">
    {/* Month selector row */}
    <div className="flex items-center gap-3">
      <Shimmer className="h-8 w-40 rounded-lg" />
      <Shimmer className="h-8 w-24 rounded-lg" />
    </div>
    {/* Summary cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonAnalyticsCard key={i} />)}
    </div>
    {/* Chart */}
    <SkeletonChart height="h-52" />
    {/* Second row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SkeletonChart height="h-40" />
      <SkeletonChart height="h-40" />
    </div>
  </div>
);
