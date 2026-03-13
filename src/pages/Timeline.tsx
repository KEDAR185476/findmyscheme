import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, GraduationCap, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { matchScheme } from "@/lib/matchScheme";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";
import { useTranslation } from "react-i18next";

interface Milestone { age: number; schemes: { id: string; name: string; benefits: string; category: string; matchScore: number; preparation?: string[] }[]; }

const Timeline = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  const currentAge = useMemo(() => {
    if (!profile.dob) return 25;
    return Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000);
  }, [profile.dob]);

  const milestones = useMemo(() => {
    const ages = [18, 21, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
    const relevantAges = ages.filter(a => a >= currentAge);
    const results: Milestone[] = [];
    for (const age of relevantAges) {
      const year = new Date().getFullYear() - age;
      const simProfile = { ...profile, dob: `${year}-06-15` };
      const matched = sampleSchemes.map(s => ({ ...s, matchScore: matchScheme(s, simProfile) })).filter(s => s.matchScore >= 60).sort((a, b) => b.matchScore - a.matchScore);
      if (matched.length > 0) results.push({ age, schemes: matched.slice(0, 5).map(s => ({ id: s.id, name: s.name, benefits: s.benefits, category: s.category, matchScore: s.matchScore, preparation: getPreparation(s) })) });
    }
    return results;
  }, [profile, currentAge]);

  const totalFutureBenefits = useMemo(() => {
    const seen = new Set<string>(); let total = 0;
    milestones.forEach(m => m.schemes.forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); const match = s.benefits.match(/₹([\d,]+)/); if (match) total += parseInt(match[1].replace(/,/g, "")); } }));
    return total;
  }, [milestones]);

  const uniqueSchemeCount = useMemo(() => { const seen = new Set<string>(); milestones.forEach(m => m.schemes.forEach(s => seen.add(s.id))); return seen.size; }, [milestones]);

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
            <div className="mb-8 grid grid-cols-2 gap-4">
              <Card className="border-border/60 shadow-soft"><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-primary">{uniqueSchemeCount}</p><p className="text-xs text-muted-foreground mt-1">{t("schemes_lifetime")}</p></CardContent></Card>
              <Card className="border-border/60 shadow-soft"><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-accent">{totalFutureBenefits > 0 ? `₹${(totalFutureBenefits / 1000).toFixed(0)}K` : "—"}</p><p className="text-xs text-muted-foreground mt-1">{t("estimated_future")}</p></CardContent></Card>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mb-8 overflow-x-auto pb-4">
              <div className="flex items-center gap-0 min-w-max px-4">
                {milestones.map((m, i) => {
                  const isCurrent = m.age === currentAge || (m.age === milestones[0]?.age && currentAge <= m.age);
                  const isSelected = selectedMilestone === i;
                  return (
                    <div key={m.age} className="flex items-center">
                      <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08 }} onClick={() => setSelectedMilestone(isSelected ? null : i)} className="relative flex flex-col items-center cursor-pointer group">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isCurrent ? "bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20" : isSelected ? "bg-accent text-accent-foreground shadow-lg ring-4 ring-accent/20" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>{m.age}</div>
                        <span className="text-xs text-muted-foreground mt-2 whitespace-nowrap">{m.schemes.length} {t("schemes")}</span>
                        {isCurrent && <Badge className="absolute -top-3 text-[10px] px-1.5 py-0">You</Badge>}
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
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold">{milestones[selectedMilestone].age}</span>
                  {t("schemes_at_age", { age: milestones[selectedMilestone].age })}
                </h3>
                <div className="space-y-3">
                  {milestones[selectedMilestone].schemes.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                      <Card className="border-border/60 shadow-soft"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0">
                        <Badge variant="secondary" className={`text-xs mb-1.5 ${SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.color || ""}`}>{SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.icon} {SCHEME_CATEGORIES[s.category as keyof typeof SCHEME_CATEGORIES]?.label}</Badge>
                        <p className="font-semibold text-sm">{s.name}</p><p className="text-xs text-muted-foreground mt-1">{s.benefits}</p>
                        {s.preparation && s.preparation.length > 0 && milestones[selectedMilestone].age > currentAge && (
                          <div className="mt-3 rounded-xl bg-accent/5 border border-accent/20 p-3"><p className="text-xs font-semibold text-accent flex items-center gap-1 mb-2"><GraduationCap className="h-3.5 w-3.5" /> {t("preparation_needed")}</p><ul className="text-xs text-muted-foreground space-y-1">{s.preparation.map((p, pi) => <li key={pi} className="flex items-start gap-1.5"><span className="text-accent mt-0.5">•</span> {p}</li>)}</ul></div>
                        )}
                      </div><Badge variant={s.matchScore >= 70 ? "default" : "secondary"} className="shrink-0 font-bold">{s.matchScore}%</Badge></div></CardContent></Card>
                    </motion.div>
                  ))}
                </div>
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
