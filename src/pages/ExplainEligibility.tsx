import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Home, ChevronRight, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, Target, ArrowRight, Bot, User, Send, Loader2, Lightbulb,
  TrendingUp, FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { MatchedScheme, Scheme } from "@/types";
import { matchScheme } from "@/lib/matchScheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

// ─── Types ─────────────────────────────────────────────
interface EligibilityCondition {
  label: string;
  field: string;
  required: string;
  actual: string;
  matched: boolean;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Helpers ───────────────────────────────────────────
function analyzeEligibility(scheme: Scheme, profile: any): EligibilityCondition[] {
  const conditions: EligibilityCondition[] = [];
  const e = scheme.eligibility;

  if (e.minAge || e.maxAge) {
    let age = 0;
    if (profile.dob) {
      age = Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000);
    }
    const req = [e.minAge && `≥${e.minAge}`, e.maxAge && `≤${e.maxAge}`].filter(Boolean).join(" & ");
    conditions.push({
      label: "Age", field: "age", required: req,
      actual: age ? `${age} years` : "Unknown",
      matched: age > 0 && (!e.minAge || age >= e.minAge) && (!e.maxAge || age <= e.maxAge),
    });
  }

  if (e.maxIncome) {
    conditions.push({
      label: "Income", field: "income",
      required: `≤ ₹${e.maxIncome.toLocaleString("en-IN")}`,
      actual: profile.income ? `₹${profile.income.toLocaleString("en-IN")}` : "Unknown",
      matched: !!profile.income && profile.income <= e.maxIncome,
    });
  }

  if (e.gender && e.gender !== "any") {
    conditions.push({
      label: "Gender", field: "gender",
      required: e.gender,
      actual: profile.gender || "Unknown",
      matched: !!profile.gender && e.gender === profile.gender,
    });
  }

  if (e.states && e.states.length > 0) {
    conditions.push({
      label: "State", field: "state",
      required: e.states.join(", "),
      actual: profile.state || "Unknown",
      matched: !!profile.state && e.states.includes(profile.state),
    });
  }

  if (e.categories && e.categories.length > 0) {
    const userCats = [profile.category, profile.casteCategory].filter(Boolean);
    conditions.push({
      label: "Category", field: "category",
      required: e.categories.join(" / "),
      actual: userCats.join(", ") || "Unknown",
      matched: userCats.length > 0 && e.categories.some((c: string) => userCats.includes(c)),
    });
  }

  if (e.occupations && e.occupations.length > 0) {
    const terms = `${profile.employmentStatus || ""} ${profile.occupationType || ""}`.toLowerCase().trim();
    conditions.push({
      label: "Occupation", field: "occupation",
      required: e.occupations.join(" / "),
      actual: terms || "Unknown",
      matched: !!terms && e.occupations.some((o: string) => terms.includes(o.toLowerCase())),
    });
  }

  if (scheme.state === "All India") {
    conditions.push({
      label: "Region", field: "region",
      required: "All India",
      actual: profile.state || "Any state",
      matched: true,
    });
  }

  return conditions;
}

function parseBenefitAmount(benefits: string): number {
  const lakhMatch = benefits.match(/₹([\d.]+)\s*lakh/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const numMatch = benefits.match(/₹([\d,]+)/);
  if (numMatch) return parseInt(numMatch[1].replace(/,/g, ""));
  return 0;
}

// ─── Graph Node Component ──────────────────────────────
function GraphNode({
  label, value, matched, delay, type,
}: {
  label: string; value: string; matched?: boolean; delay: number;
  type: "citizen" | "scheme" | "result";
}) {
  const colors = {
    citizen: "border-primary/30 bg-primary/5",
    scheme: "border-accent/30 bg-accent/5",
    result: matched ? "border-success/40 bg-success/5" : "border-destructive/30 bg-destructive/5",
  };

  const iconColors = {
    citizen: "text-primary", scheme: "text-accent",
    result: matched ? "text-success" : "text-destructive",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${colors[type]}`}
    >
      {type === "result" && (
        matched
          ? <CheckCircle2 className={`h-4 w-4 shrink-0 ${iconColors[type]}`} />
          : <XCircle className={`h-4 w-4 shrink-0 ${iconColors[type]}`} />
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold truncate ${type === "result" && !matched ? "text-destructive" : "text-foreground"}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Graph Section ─────────────────────────────────────
function EligibilityGraph({
  conditions, profile, scheme, score, t,
}: {
  conditions: EligibilityCondition[]; profile: any; scheme: MatchedScheme; score: number;
  t: (key: string, opts?: any) => string;
}) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setPhase(1);
    const t1 = setTimeout(() => setPhase(2), 1200);
    const t2 = setTimeout(() => setPhase(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [scheme.id]);

  const citizenNodes = [
    { label: t("age"), value: profile.dob ? `${Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000)} ${t("years")}` : "—" },
    { label: t("occupation"), value: profile.employmentStatus || profile.occupationType || "—" },
    { label: t("income_label"), value: profile.income ? `₹${profile.income.toLocaleString("en-IN")}` : "—" },
    { label: t("state"), value: profile.state || "—" },
    { label: t("category_label"), value: [profile.category, profile.casteCategory].filter(Boolean).join(", ") || "—" },
    { label: t("gender"), value: profile.gender || "—" },
  ].filter(n => n.value !== "—");

  const schemeNodes = conditions.map(c => ({ label: c.label, value: c.required }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs">
        {[
          { n: 1, label: t("your_profile"), color: "bg-primary" },
          { n: 2, label: t("scheme_rules"), color: "bg-accent" },
          { n: 3, label: t("match_result"), color: "bg-success" },
        ].map(p => (
          <div key={p.n} className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all ${phase >= p.n ? `${p.color}/15 font-medium` : "bg-muted text-muted-foreground"}`}>
            <span className={`h-2 w-2 rounded-full ${phase >= p.n ? p.color : "bg-muted-foreground/30"}`} />
            {p.label}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0.3 }} className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-primary">{t("citizen_graph")}</span>
          </motion.div>
          <AnimatePresence>
            {phase >= 1 && citizenNodes.map((n, i) => (
              <GraphNode key={n.label} label={n.label} value={n.value} delay={i * 0.1} type="citizen" />
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0.3 }} className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-xs font-semibold text-accent">{t("scheme_rules")}</span>
          </motion.div>
          <AnimatePresence>
            {phase >= 2 && schemeNodes.map((n, i) => (
              <GraphNode key={n.label} label={n.label} value={n.value} delay={i * 0.1} type="scheme" />
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase >= 3 ? 1 : 0.3 }} className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <span className="text-xs font-semibold text-success">{t("match_result")}</span>
          </motion.div>
          <AnimatePresence>
            {phase >= 3 && conditions.map((c, i) => (
              <GraphNode key={c.label} label={c.label} value={c.matched ? `✓ ${c.actual}` : `✗ ${c.actual}`} matched={c.matched} delay={i * 0.12} type="result" />
            ))}
          </AnimatePresence>

          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: conditions.length * 0.12 + 0.2, type: "spring", stiffness: 200 }}
              className="mt-3 flex items-center justify-center"
            >
              <div className={`rounded-2xl px-5 py-3 text-center ${
                score >= 70 ? "bg-success/10 border border-success/30"
                  : score >= 40 ? "bg-warning/10 border border-warning/30"
                  : "bg-destructive/10 border border-destructive/30"
              }`}>
                <p className={`text-2xl font-bold ${score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive"}`}>{score}%</p>
                <p className="text-[10px] font-medium text-muted-foreground">{t("eligibility_score")}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Chatbot ──────────────────────────────────────
function GapChatbot({ scheme, profile, gaps, t }: {
  scheme: MatchedScheme | null; profile: any; gaps: EligibilityCondition[];
  t: (key: string, opts?: any) => string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { setMessages([]); }, [scheme?.id]);

  const suggestions = useMemo(() => {
    if (!scheme) return [t("how_increase_eligibility")];
    const s: string[] = [];
    if (gaps.length > 0) s.push(t("how_become_eligible_for", { name: scheme.name }));
    s.push(t("what_docs_needed"));
    if (gaps.some(g => g.field === "occupation")) s.push(t("how_register_msme"));
    s.push(t("how_to_apply"));
    return s.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme, gaps]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("gap-assist", {
        body: {
          message: text,
          scheme: scheme ? { name: scheme.name, description: scheme.description, benefits: scheme.benefits } : null,
          profile,
          gaps: gaps.map(g => ({ label: g.label, required: g.required, actual: g.actual })),
        },
      });

      if (error) throw error;
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: data.reply || data.error || t("chatbot_no_response") },
      ]);
    } catch {
      toast.error(t("chatbot_error"));
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: t("chatbot_connection_error") },
      ]);
    }
    setLoading(false);
  };

  return (
    <Card className="border-border/60 shadow-soft sticky top-24">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold">{t("eligibility_assistant")}</span>
            <p className="text-[10px] text-muted-foreground">{t("ask_about_eligibility")}</p>
          </div>
        </div>

        <div ref={chatRef} className="max-h-[420px] min-h-[200px] overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t("ask_about_eligibility")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Ask anything about scheme eligibility</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "assistant" ? "bg-card border" : "gradient-primary text-primary-foreground"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
              <div className="rounded-xl border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">{t("thinking")}</div>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestions.map(s => (
              <Button key={s} size="sm" variant="outline" className="h-7 rounded-full text-[10px] border-primary/20" onClick={() => sendMessage(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}

        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); sendMessage(input); }}>
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder={t("ask_eligibility_placeholder")} className="h-8 text-xs rounded-lg flex-1" disabled={loading} />
          <Button type="submit" size="icon" className="h-8 w-8 rounded-lg" disabled={!input.trim() || loading}>
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────
const ExplainEligibility = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [selectedScheme, setSelectedScheme] = useState<MatchedScheme | null>(null);

  const matchedSchemes = useMemo(() => {
    return sampleSchemes
      .map(s => ({ ...s, matchScore: matchScheme(s, profile) }))
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [profile]);

  const conditions = useMemo(() => {
    if (!selectedScheme) return [];
    return analyzeEligibility(selectedScheme, profile);
  }, [selectedScheme, profile]);

  const gaps = conditions.filter(c => !c.matched);
  const matched = conditions.filter(c => c.matched);

  return (
    <PageTransition>
      <AppHeader title={t("explain_title")}>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard")}>
          <Home className="mr-1.5 h-4 w-4" /> {t("dashboard")}
        </Button>
      </AppHeader>

      <div className="container max-w-5xl py-8 md:py-10">
        <StaggerContainer>
          <StaggerItem>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{t("explainable_ai")}</h1>
                  <p className="text-sm text-muted-foreground">{t("see_how_determined")}</p>
                </div>
              </div>
            </div>
          </StaggerItem>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <StaggerItem>
                <Card className="border-border/60 shadow-soft overflow-hidden">
                  <CardContent className="p-6">
                    {selectedScheme ? (
                      <>
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">{t("eligibility_analysis")}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {SCHEME_CATEGORIES[selectedScheme.category]?.icon}{" "}
                            {SCHEME_CATEGORIES[selectedScheme.category]?.label}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{selectedScheme.name}</h3>
                        <p className="text-xs text-muted-foreground mb-5">{selectedScheme.description}</p>
                        <EligibilityGraph conditions={conditions} profile={profile} scheme={selectedScheme} score={selectedScheme.matchScore} t={t} />
                      </>
                    ) : (
                      <div className="py-16 text-center">
                        <Target className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">{t("select_scheme_below")}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{t("to_see_graph")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </StaggerItem>

              {selectedScheme && gaps.length > 0 && (
                <StaggerItem>
                  <Card className="border-border/60 shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-sm font-semibold">{t("gap_analysis")}</span>
                      </div>

                      <div className="space-y-3 mb-5">
                        {gaps.map((g, i) => (
                          <motion.div key={g.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-3 rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3">
                            <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">{g.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {t("required_label")}: <strong>{g.required}</strong> · {t("your_value")}: <strong>{g.actual}</strong>
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">{t("how_to_eligible")}</span>
                        </div>
                        <div className="space-y-2">
                          {gaps.map((g, i) => (
                            <div key={g.label} className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                              <p className="text-xs text-foreground/80">
                                {g.field === "occupation" && `Register or update your occupation to: ${g.required}`}
                                {g.field === "income" && `Your income needs to be ${g.required}. Check if you qualify under different income criteria.`}
                                {g.field === "category" && `You need ${g.required} category status. Apply for the relevant certificate from your district office.`}
                                {g.field === "age" && `Age requirement: ${g.required}. This scheme may be available to you in the future.`}
                                {g.field === "state" && `This scheme is available in: ${g.required}. Check for similar schemes in your state.`}
                                {g.field === "gender" && `This scheme is for ${g.required} applicants.`}
                                {!["occupation", "income", "category", "age", "state", "gender"].includes(g.field) && `Meet the requirement: ${g.required}`}
                              </p>
                            </div>
                          ))}
                        </div>

                        {selectedScheme.matchScore >= 40 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
                            <TrendingUp className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-xs font-medium text-success">{t("future_opportunity")}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {t("future_eligible_desc")} — {t("estimated_future_score")}: <strong className="text-success">{Math.min(selectedScheme.matchScore + gaps.length * 12, 98)}%</strong>
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              )}

              {selectedScheme && gaps.length === 0 && (
                <StaggerItem>
                  <Card className="border-success/30 bg-success/5 shadow-soft">
                    <CardContent className="p-6 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-3" />
                      <p className="font-semibold text-success">{t("fully_eligible")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("meet_all_requirements", { count: matched.length })}</p>
                      {selectedScheme.applicationUrl && (
                        <Button className="mt-4 rounded-full" size="sm" onClick={() => window.open(selectedScheme.applicationUrl, "_blank")}>
                          {t("apply_now")} <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </StaggerItem>
              )}

              <StaggerItem>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {t("select_scheme_to_explain", { count: matchedSchemes.length })}
                    </h2>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {matchedSchemes.slice(0, 12).map((scheme, i) => {
                      const isSelected = selectedScheme?.id === scheme.id;
                      const amount = parseBenefitAmount(scheme.benefits);
                      return (
                        <motion.div key={scheme.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                          <Card className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${isSelected ? "border-primary ring-2 ring-primary/20 shadow-card" : "border-border/60 shadow-soft hover:shadow-card-hover"}`} onClick={() => setSelectedScheme(scheme)}>
                            <CardContent className="p-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {SCHEME_CATEGORIES[scheme.category]?.icon}{" "}
                                      {SCHEME_CATEGORIES[scheme.category]?.label}
                                    </Badge>
                                    {amount > 0 && (
                                      <span className="text-[10px] font-medium text-success">
                                        ₹{amount >= 100000 ? `${(amount / 100000).toFixed(1)}L` : amount.toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-xs font-semibold truncate">{scheme.name}</h3>
                                </div>
                                <Badge variant={scheme.matchScore >= 70 ? "default" : "secondary"} className="shrink-0 text-xs font-bold">{scheme.matchScore}%</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </StaggerItem>
            </div>

            <div className="space-y-4">
              <StaggerItem>
                <GapChatbot scheme={selectedScheme} profile={profile} gaps={gaps} t={t} />
              </StaggerItem>
            </div>
          </div>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default ExplainEligibility;