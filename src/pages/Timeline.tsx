import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, GraduationCap, Sparkles, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { Scheme } from "@/types";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";
import { useTranslation } from "react-i18next";

interface TimelineScheme {
  id: string;
  name: string;
  benefits: string;
  category: string;
  matchScore: number;
  preparation?: string[];
  status: "new" | "ongoing" | "expiring";
}

interface Milestone {
  age: number;
  year: number;
  schemes: TimelineScheme[];
  newSchemes: TimelineScheme[];
  expiringSchemes: TimelineScheme[];
  totalEligible: number;
}

/** Compute match score for a given simulated age */
function matchSchemeAtAge(scheme: Scheme, profile: any, simulatedAge: number): number {
  let score = 40;
  let maxScore = 40;
  const e = scheme.eligibility;

  // Age check using simulatedAge directly (not from dob)
  if (e.minAge || e.maxAge) {
    if (e.minAge && simulatedAge < e.minAge) return 0;
    if (e.maxAge && simulatedAge > e.maxAge) return 0;
    score += 12;
    maxScore += 12;
  }

  if (e.maxIncome) {
    maxScore += 15;
    if (profile.income && profile.income > e.maxIncome) return 0;
    if (profile.income) score += 15;
  }

  if (e.gender && e.gender !== "any") {
    maxScore += 10;
    if (profile.gender && e.gender !== profile.gender) return 0;
    if (profile.gender && e.gender === profile.gender) score += 10;
  }

  if (e.states && e.states.length > 0) {
    maxScore += 15;
    if (profile.state && !e.states.includes(profile.state)) return 0;
    if (profile.state && e.states.includes(profile.state)) score += 15;
  }
  if (scheme.state === "All India") {
    score += 5;
    maxScore += 5;
  }

  if (e.categories && e.categories.length > 0) {
    maxScore += 12;
    const userCats = [profile.category, profile.casteCategory].filter(Boolean);
    if (userCats.length > 0 && !e.categories.some((c: string) => userCats.includes(c))) return 0;
    if (userCats.some((c: string) => e.categories!.includes(c))) score += 12;
  }

  if (e.occupations && e.occupations.length > 0) {
    maxScore += 10;
    if (profile.employmentStatus || profile.occupationType) {
      const terms = `${profile.employmentStatus} ${profile.occupationType}`.toLowerCase();
      if (e.occupations.some((o: string) => terms.includes(o.toLowerCase()))) score += 10;
    }
  }

  return Math.min(Math.round((score / maxScore) * 98), 98);
}

const Timeline = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  const currentAge = useMemo(() => {
    if (!profile.dob) return 25;
    return Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000);
  }, [profile.dob]);

  const currentYear = new Date().getFullYear();

  const milestones = useMemo(() => {
    const ages = [currentAge, currentAge + 5, currentAge + 10, currentAge + 15, currentAge + 20, currentAge + 25, currentAge + 30, currentAge + 35, currentAge + 40].filter(a => a >= 18 && a <= 80);
    // Deduplicate and sort
    const uniqueAges = [...new Set(ages)].sort((a, b) => a - b);

    let prevEligibleIds = new Set<string>();
    const results: Milestone[] = [];

    for (const age of uniqueAges) {
      const eligible = sampleSchemes
        .map(s => ({ ...s, matchScore: matchSchemeAtAge(s, profile, age) }))
        .filter(s => s.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      const eligibleIds = new Set(eligible.map(s => s.id));

      const newSchemes: TimelineScheme[] = eligible
        .filter(s => !prevEligibleIds.has(s.id))
        .map(s => ({ id: s.id, name: s.name, benefits: s.benefits, category: s.category, matchScore: s.matchScore, preparation: getPreparation(s), status: "new" as const }));

      const expiringSchemes: TimelineScheme[] = [...prevEligibleIds]
        .filter(id => !eligibleIds.has(id))
        .map(id => {
          const s = sampleSchemes.find(sc => sc.id === id)!;
          return { id: s.id, name: s.name, benefits: s.benefits, category: s.category, matchScore: 0, status: "expiring" as const };
        });

      const ongoingSchemes: TimelineScheme[] = eligible
        .filter(s => prevEligibleIds.has(s.id))
        .map(s => ({ id: s.id, name: s.name, benefits: s.benefits, category: s.category, matchScore: s.matchScore, preparation: getPreparation(s), status: "ongoing" as const }));

      const allSchemes = [...newSchemes, ...ongoingSchemes, ...expiringSchemes];

      results.push({
        age,
        year: currentYear + (age - currentAge),
        schemes: allSchemes,
        newSchemes,
        expiringSchemes,
        totalEligible: eligible.length,
      });

      prevEligibleIds = eligibleIds;
    }
    return results;
  }, [profile, currentAge, currentYear]);

  const totalFutureBenefits = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    milestones.forEach(m => m.schemes.forEach(s => {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        const match = s.benefits.match(/₹([\d,]+)/);
        if (match) total += parseInt(match[1].replace(/,/g, ""));
      }
    }));
    return total;
  }, [milestones]);

  const uniqueSchemeCount = useMemo(() => {
    const seen = new Set<string>();
    milestones.forEach(m => m.schemes.forEach(s => seen.add(s.id)));
    return seen.size;
  }, [milestones]);

  return (
    <PageTransition>
      <AppHeader title={t("welfare_timeline")}>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-1.5 h-4 w-4" /> {t("dashboard")}</Button>
      </AppHeader>
      <div className="container max-w-4xl py-8">
        <StaggerContainer>
          <StaggerItem>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CalendarDays className="h-6 w-6 text-accent" /> {t("timeline_title")}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{t("timeline_desc")}</p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mb-8 grid grid-cols-3 gap-4">
              <Card className="border-border/60 shadow-soft"><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-primary">{uniqueSchemeCount}</p><p className="text-xs text-muted-foreground mt-1">{t("schemes_lifetime")}</p></CardContent></Card>
              <Card className="border-border/60 shadow-soft"><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-accent">{totalFutureBenefits > 0 ? `₹${(totalFutureBenefits / 1000).toFixed(0)}K` : "—"}</p><p className="text-xs text-muted-foreground mt-1">{t("estimated_future")}</p></CardContent></Card>
              <Card className="border-border/60 shadow-soft"><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-success">{milestones.length}</p><p className="text-xs text-muted-foreground mt-1">Life Stages</p></CardContent></Card>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mb-8 overflow-x-auto pb-4">
              <div className="flex items-center gap-0 min-w-max px-4">
                {milestones.map((m, i) => {
                  const isCurrent = m.age === currentAge;
                  const isSelected = selectedMilestone === i;
                  const hasChanges = m.newSchemes.length > 0 || m.expiringSchemes.length > 0;
                  return (
                    <div key={m.age} className="flex items-center">
                      <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08 }} onClick={() => setSelectedMilestone(isSelected ? null : i)} className="relative flex flex-col items-center cursor-pointer group">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isCurrent ? "bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20" : isSelected ? "bg-accent text-accent-foreground shadow-lg ring-4 ring-accent/20" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>{m.age}</div>
                        <span className="text-[10px] text-muted-foreground mt-1.5">{m.year}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{m.totalEligible} {t("schemes")}</span>
                        {isCurrent && <Badge className="absolute -top-3 text-[10px] px-1.5 py-0">You</Badge>}
                        {hasChanges && !isCurrent && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-pulse" />
                        )}
                      </motion.button>
                      {i < milestones.length - 1 && <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.2 + i * 0.08 }} className="h-0.5 w-12 bg-border origin-left" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </StaggerItem>

          {selectedMilestone !== null && milestones[selectedMilestone] && (
            <StaggerItem>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-5">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold">{milestones[selectedMilestone].age}</span>
                  {t("schemes_at_age", { age: milestones[selectedMilestone].age })}
                  <span className="text-sm font-normal text-muted-foreground">({milestones[selectedMilestone].year})</span>
                </h3>

                {/* Newly eligible */}
                {milestones[selectedMilestone].newSchemes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">
                        {milestones[selectedMilestone].age === currentAge ? "Currently Eligible" : "Newly Eligible"}
                        {" "}({milestones[selectedMilestone].newSchemes.length})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {milestones[selectedMilestone].newSchemes.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                          <Card className="border-success/20 shadow-soft bg-success/5">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <Badge variant="secondary" className={`text-xs mb-1.5 ${SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.color || ""}`}>
                                    {SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.icon} {SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.label}
                                  </Badge>
                                  <p className="font-semibold text-sm">{s.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{s.benefits}</p>
                                  {s.preparation && s.preparation.length > 0 && milestones[selectedMilestone].age > currentAge && (
                                    <div className="mt-3 rounded-xl bg-accent/5 border border-accent/20 p-3">
                                      <p className="text-xs font-semibold text-accent flex items-center gap-1 mb-2"><GraduationCap className="h-3.5 w-3.5" /> {t("preparation_needed")}</p>
                                      <ul className="text-xs text-muted-foreground space-y-1">{s.preparation.map((p, pi) => <li key={pi} className="flex items-start gap-1.5"><span className="text-accent mt-0.5">•</span> {p}</li>)}</ul>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="default" className="shrink-0 font-bold">{s.matchScore}%</Badge>
                                  <Badge variant="outline" className="text-[10px] text-success border-success/30">NEW</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expiring schemes */}
                {milestones[selectedMilestone].expiringSchemes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">No Longer Eligible ({milestones[selectedMilestone].expiringSchemes.length})</span>
                    </div>
                    <div className="space-y-3">
                      {milestones[selectedMilestone].expiringSchemes.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                          <Card className="border-destructive/20 shadow-soft bg-destructive/5 opacity-80">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <Badge variant="secondary" className="text-xs mb-1.5">
                                    {SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.icon} {SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.label}
                                  </Badge>
                                  <p className="font-semibold text-sm line-through text-muted-foreground">{s.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{s.benefits}</p>
                                </div>
                                <Badge variant="destructive" className="shrink-0 text-[10px]">EXPIRED</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ongoing schemes */}
                {milestones[selectedMilestone].schemes.filter(s => s.status === "ongoing").length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">Still Eligible ({milestones[selectedMilestone].schemes.filter(s => s.status === "ongoing").length})</span>
                    </div>
                    <div className="space-y-2">
                      {milestones[selectedMilestone].schemes.filter(s => s.status === "ongoing").slice(0, 5).map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                          <Card className="border-border/60 shadow-soft">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.benefits}</p>
                                </div>
                                <Badge variant="secondary" className="shrink-0">{s.matchScore}%</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      {milestones[selectedMilestone].schemes.filter(s => s.status === "ongoing").length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{milestones[selectedMilestone].schemes.filter(s => s.status === "ongoing").length - 5} more ongoing schemes
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {milestones[selectedMilestone].newSchemes.length === 0 && milestones[selectedMilestone].expiringSchemes.length === 0 && milestones[selectedMilestone].schemes.filter(s => s.status === "ongoing").length > 0 && (
                  <p className="text-sm text-muted-foreground italic">No changes in eligibility at this age — all schemes continue from the previous stage.</p>
                )}
              </motion.div>
            </StaggerItem>
          )}

          <StaggerItem>
            <Card className="border-accent/20 bg-accent/5 shadow-soft"><CardContent className="p-5 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("lifetime_insight", { count: uniqueSchemeCount })}</p>
                {totalFutureBenefits > 0 && <p className="text-xs text-muted-foreground mt-1">{t("estimated_total", { amount: totalFutureBenefits.toLocaleString("en-IN") })}</p>}
              </div>
            </CardContent></Card>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

function getPreparation(scheme: any): string[] {
  const preps: string[] = [];
  if (scheme.documentsRequired) scheme.documentsRequired.slice(0, 3).forEach((d: string) => preps.push(`Obtain ${d}`));
  if (scheme.eligibility?.occupations?.length) preps.push(`Relevant occupation: ${scheme.eligibility.occupations.join(", ")}`);
  return preps;
}

export default Timeline;
