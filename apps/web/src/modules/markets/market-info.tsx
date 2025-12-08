"use client";

import { motion } from "framer-motion";
import type { Market } from "@rekon/types";

interface MarketInfoProps {
  market: Market;
}

export function MarketInfo({ market }: MarketInfoProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Format category path (e.g., "esports -> league of legends -> match winner")
  const categoryPath = market.category
    ? market.subcategory
      ? `${market.category} / ${market.subcategory}`
      : market.category
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-white/10 bg-[#0a1220]/80 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Market Information
        </h2>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Market ID */}
          <InfoItem
            label="Market ID"
            value={market.id}
            mono
            truncate
          />

          {/* Created At */}
          <InfoItem
            label="Created"
            value={formatDate(market.createdAt)}
          />

          {/* End Date */}
          <InfoItem
            label="End Date"
            value={formatDate(market.endDate)}
          />

          {/* Liquidity Source */}
          <InfoItem
            label="Liquidity"
            value="Polymarket CLOB"
          />

          {/* Resolution Source */}
          <InfoItem
            label="Resolution"
            value={market.resolutionSource || "Esports Official API"}
          />

          {/* Category */}
          {categoryPath && (
            <InfoItem
              label="Category"
              value={categoryPath}
            />
          )}
        </div>

        {/* Market Description */}
        {market.description && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="mb-3 text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Description
            </div>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
              {market.description.trim()}
            </p>
          </div>
        )}

        {/* Market Question (if different from description) */}
        {market.question && market.question !== market.description && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="mb-3 text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Question
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {market.question}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
        {label}
      </div>
      <div
        className={`text-sm text-white/80 ${mono ? "font-mono" : ""} ${
          truncate ? "truncate" : ""
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
