import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchedScheme } from "@/types";
import { SCHEME_CATEGORIES } from "@/data/schemes";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface BenefitScheme {
  id: string;
  name: string;
  category: string;
  amount: number;
  matchScore: number;
}

interface BenefitsInsightsProps {
  eligibleSchemes: MatchedScheme[];
  savedSchemeIds: string[];
}

/** Parse ₹ amount from benefits text */
function parseBenefitAmount(benefits: string): number {
  // Match patterns like ₹6,000 or ₹1,20,000 or ₹6 lakh
  const lakhMatch = benefits.match(/₹([\d.]+)\s*lakh/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  const croreMatch = benefits.match(/₹([\d.]+)\s*crore/i);
  if (croreMatch) return parseFloat(croreMatch[1]) * 10000000;

  const numMatch = benefits.match(/₹([\d,]+)/);
  if (numMatch) return parseInt(numMatch[1].replace(/,/g, ""));

  return 0;
}

/** Animated number counter hook */
function useCountUp(target: number, duration = 1800, delay = 300): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(target * eased));
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return current;
}

/** Format INR amount */
function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

/** Donut chart colors */
const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(152, 60%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(40, 80%, 50%)",
];

/** SVG Donut Chart Component */
function DonutChart({
  segments,
  size = 180,
  strokeWidth = 24,
  centerLabel = "Total Benefits",
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const center = size / 2;

  let accumulated = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      {/* Segments */}
      {segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0;
        const dashLen = pct * circumference;
        const dashOffset = -accumulated * circumference;
        accumulated += pct;

        return (
          <motion.circle
            key={seg.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dashLen} ${circumference - dashLen}` }}
            transition={{ duration: 1.2, delay: 0.3 + i * 0.15, ease: "easeOut" }}
          />
        );
      })}
      {/* Center text */}
      <text
        x={center}
        y={center - 6}
        textAnchor="middle"
        className="fill-foreground text-lg font-bold"
        style={{ fontSize: "18px", fontWeight: 700 }}
      >
        {formatINR(total)}
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: "11px" }}
      >
        {centerLabel}
      </text>
    </svg>
  );
}

/** Horizontal bar for opportunity visualization */
function OpportunityBar({
  claimed,
  unclaimed,
  appliedLabel = "Applied",
  notAppliedLabel = "Not Yet Applied",
}: {
  claimed: number;
  unclaimed: number;
  appliedLabel?: string;
  notAppliedLabel?: string;
}) {
  const total = claimed + unclaimed;
  const claimedPct = total > 0 ? (claimed / total) * 100 : 0;
  const unclaimedPct = total > 0 ? (unclaimed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{appliedLabel}</span>
        <span className="text-muted-foreground">{notAppliedLabel}</span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-success/70"
          initial={{ width: 0 }}
          animate={{ width: `${claimedPct}%` }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full gradient-primary"
          initial={{ width: 0 }}
          animate={{ width: `${unclaimedPct}%` }}
          transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-success">{formatINR(claimed)}</span>
        <span className="text-primary">{formatINR(unclaimed)}</span>
      </div>
    </div>
  );
}

export function BenefitsInsights({ eligibleSchemes, savedSchemeIds }: BenefitsInsightsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Parse benefit amounts from scheme data
  const benefitSchemes: BenefitScheme[] = eligibleSchemes
    .map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      amount: parseBenefitAmount(s.benefits),
      matchScore: s.matchScore,
    }))
    .filter(s => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalBenefits = benefitSchemes.reduce((sum, s) => sum + s.amount, 0);
  const animatedTotal = useCountUp(totalBenefits);

  // Claimed = saved schemes with amounts, unclaimed = rest
  const claimedAmount = benefitSchemes
    .filter(s => savedSchemeIds.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0);
  const unclaimedAmount = totalBenefits - claimedAmount;
  const unclaimedSchemes = benefitSchemes.filter(s => !savedSchemeIds.includes(s.id));

  // Donut segments (top 6 + "Others")
  const donutSegments = (() => {
    const top = benefitSchemes.slice(0, 6);
    const rest = benefitSchemes.slice(6);
    const segments = top.map((s, i) => ({
      label: s.name,
      value: s.amount,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
    if (rest.length > 0) {
      segments.push({
        label: `${rest.length} others`,
        value: rest.reduce((sum, s) => sum + s.amount, 0),
        color: DONUT_COLORS[6],
      });
    }
    return segments;
  })();

  if (benefitSchemes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{t("benefits_insights")}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* LEFT PANEL — Total Benefits Discovery Meter */}
        <Card className="border-border/60 shadow-soft overflow-hidden">
          <CardContent className="p-6">
            {/* Header */}
            <div className="mb-5 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("total_benefits")}</span>
            </div>

            {/* Animated counter + donut */}
            <div className="flex flex-col items-center gap-4">
              {/* Big animated number */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  ₹{animatedTotal.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("across_schemes", { count: benefitSchemes.length })}
                </p>
              </motion.div>

              {/* Donut chart */}
              <DonutChart segments={donutSegments} size={160} strokeWidth={20} centerLabel={t("total_benefits")} />

              {/* Legend */}
              <div className="w-full space-y-1.5 mt-2">
                {donutSegments.slice(0, 5).map((seg, i) => (
                  <motion.div
                    key={seg.label}
                    className="flex items-center justify-between text-xs"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="truncate text-muted-foreground">{seg.label}</span>
                    </div>
                    <span className="font-medium shrink-0 ml-2">{formatINR(seg.value)}</span>
                  </motion.div>
                ))}
                {donutSegments.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    +{donutSegments.length - 5} more
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL — Unused Benefits Discovery */}
        <Card className="border-border/60 shadow-soft overflow-hidden">
          <CardContent className="p-6">
            {/* Header */}
            <div className="mb-5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Unused Benefits</span>
            </div>

            {/* Opportunity bar */}
            <OpportunityBar claimed={claimedAmount} unclaimed={unclaimedAmount} />

            {/* Insight text */}
            <motion.div
              className="mt-5 rounded-xl border border-accent/15 bg-accent/5 px-4 py-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-xs leading-relaxed text-accent-foreground/80">
                  You're eligible for{" "}
                  <strong className="text-foreground">{unclaimedSchemes.length} scheme{unclaimedSchemes.length !== 1 ? "s" : ""}</strong>{" "}
                  worth{" "}
                  <strong className="text-foreground">{formatINR(unclaimedAmount)}</strong>{" "}
                  that you haven't applied for yet.
                </p>
              </div>
            </motion.div>

            {/* Unclaimed scheme list */}
            <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {unclaimedSchemes.slice(0, 6).map((scheme, i) => (
                <motion.div
                  key={scheme.id}
                  className="group flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/70"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  onClick={() => navigate("/schemes")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{scheme.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {SCHEME_CATEGORIES[scheme.category as keyof typeof SCHEME_CATEGORIES]?.icon}{" "}
                        {SCHEME_CATEGORIES[scheme.category as keyof typeof SCHEME_CATEGORIES]?.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{scheme.matchScore}% match</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-xs font-bold text-primary">{formatINR(scheme.amount)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </motion.div>
              ))}
              {unclaimedSchemes.length > 6 && (
                <p className="text-center text-[10px] text-muted-foreground pt-1">
                  +{unclaimedSchemes.length - 6} more schemes available
                </p>
              )}
            </div>

            {/* CTA */}
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full rounded-xl border-primary/20 text-primary hover:bg-primary/5"
              onClick={() => navigate("/schemes")}
            >
              View All Schemes <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
