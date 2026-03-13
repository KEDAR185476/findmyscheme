import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FlaskConical, TrendingUp, TrendingDown, Minus, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { matchScheme } from "@/lib/matchScheme";
import { INDIAN_STATES } from "@/types";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";

interface SimProfile {
  income: number;
  age: number;
  gender: string;
  state: string;
  category: string;
  employmentStatus: string;
  educationLevel: string;
  landOwnership: string;
  occupationType: string;
}

const profileToSim = (profile: any): SimProfile => {
  let age = 25;
  if (profile.dob) {
    age = Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000);
  }
  return {
    income: profile.income || 200000,
    age,
    gender: profile.gender || "male",
    state: profile.state || "Delhi",
    category: profile.category || "",
    employmentStatus: profile.employmentStatus || "",
    educationLevel: profile.educationLevel || "",
    landOwnership: profile.landOwnership || "",
    occupationType: profile.occupationType || "",
  };
};

const simToMatchProfile = (sim: SimProfile) => {
  const year = new Date().getFullYear() - sim.age;
  return {
    dob: `${year}-06-15`,
    income: sim.income,
    gender: sim.gender,
    state: sim.state,
    category: sim.category,
    employmentStatus: sim.employmentStatus,
    educationLevel: sim.educationLevel,
    landOwnership: sim.landOwnership,
    occupationType: sim.occupationType,
    casteCategory: sim.category,
  };
};

const Simulator = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const original = useMemo(() => profileToSim(profile), [profile]);
  const [sim, setSim] = useState<SimProfile>(() => profileToSim(profile));

  const originalResults = useMemo(() => {
    const mp = simToMatchProfile(original);
    return sampleSchemes
      .map(s => ({ ...s, matchScore: matchScheme(s, mp) }))
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [original]);

  const simResults = useMemo(() => {
    const mp = simToMatchProfile(sim);
    return sampleSchemes
      .map(s => ({ ...s, matchScore: matchScheme(s, mp) }))
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [sim]);

  const origEligible = originalResults.filter(s => s.matchScore >= 70);
  const simEligible = simResults.filter(s => s.matchScore >= 70);

  const newlyEligible = simEligible.filter(s => !origEligible.find(o => o.id === s.id));
  const lostEligibility = origEligible.filter(s => !simEligible.find(o => o.id === s.id));
  const changed = simResults.filter(s => {
    const orig = originalResults.find(o => o.id === s.id);
    return orig && orig.matchScore !== s.matchScore;
  });

  const reset = useCallback(() => setSim(profileToSim(profile)), [profile]);

  const update = (key: keyof SimProfile, val: any) => setSim(p => ({ ...p, [key]: val }));

  return (
    <PageTransition>
      <AppHeader title="What-If Simulator">
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Dashboard
        </Button>
      </AppHeader>

      <div className="container max-w-5xl py-8">
        <StaggerContainer>
          <StaggerItem>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-primary" /> Eligibility Simulator
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Adjust your profile parameters to see how life changes affect your scheme eligibility.
              </p>
            </div>
          </StaggerItem>

          {/* Info banner */}
          <StaggerItem>
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>You are testing a <strong>simulated scenario</strong> using your digital twin profile. Changes here don't affect your real profile.</span>
            </div>
          </StaggerItem>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Controls - left */}
            <StaggerItem className="lg:col-span-2">
              <Card className="border-border/60 shadow-soft sticky top-24">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Adjust Parameters</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs rounded-full" onClick={reset}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Income */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Annual Income</span>
                      <span className="font-semibold">₹{(sim.income / 1000).toFixed(0)}K</span>
                    </div>
                    <Slider
                      value={[sim.income]}
                      min={0}
                      max={1500000}
                      step={10000}
                      onValueChange={([v]) => update("income", v)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>₹0</span><span>₹15L</span>
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Age</span>
                      <span className="font-semibold">{sim.age} years</span>
                    </div>
                    <Slider
                      value={[sim.age]}
                      min={14}
                      max={80}
                      step={1}
                      onValueChange={([v]) => update("age", v)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>14</span><span>80</span>
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Gender</label>
                    <Select value={sim.gender} onValueChange={v => update("gender", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* State */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">State</label>
                    <Select value={sim.state} onValueChange={v => update("state", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Category</label>
                    <Select value={sim.category || "none"} onValueChange={v => update("category", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="OBC">OBC</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="ST">ST</SelectItem>
                        <SelectItem value="BPL">BPL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Occupation</label>
                    <Select value={sim.occupationType || "none"} onValueChange={v => update("occupationType", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="farmer">Farmer</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="self-employed">Self-Employed</SelectItem>
                        <SelectItem value="salaried">Salaried</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="business">Business Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Education */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Education</label>
                    <Select value={sim.educationLevel || "none"} onValueChange={v => update("educationLevel", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="below-10th">Below 10th</SelectItem>
                        <SelectItem value="10th-pass">10th Pass</SelectItem>
                        <SelectItem value="12th-pass">12th Pass</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                        <SelectItem value="post-graduate">Post Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Results - right */}
            <div className="lg:col-span-3 space-y-6">
              {/* Summary cards */}
              <StaggerItem>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-border/60 shadow-soft">
                    <CardContent className="p-4 text-center">
                      <motion.p
                        key={simEligible.length}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-bold text-primary"
                      >
                        {simEligible.length}
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-1">Eligible Now</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 shadow-soft">
                    <CardContent className="p-4 text-center">
                      <motion.p
                        key={newlyEligible.length}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-bold text-success"
                      >
                        +{newlyEligible.length}
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-1">Newly Eligible</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 shadow-soft">
                    <CardContent className="p-4 text-center">
                      <motion.p
                        key={lostEligibility.length}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-bold text-destructive"
                      >
                        -{lostEligibility.length}
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-1">Lost Eligibility</p>
                    </CardContent>
                  </Card>
                </div>
              </StaggerItem>

              {/* Newly eligible */}
              {newlyEligible.length > 0 && (
                <StaggerItem>
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-success" /> Newly Eligible
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {newlyEligible.map(s => (
                          <motion.div
                            key={s.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                          >
                            <Card className="border-success/30 bg-success/5 shadow-soft">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[s.category]?.color || ""}`}>
                                      {SCHEME_CATEGORIES[s.category]?.icon} {SCHEME_CATEGORIES[s.category]?.label}
                                    </Badge>
                                    <Badge className="bg-success/10 text-success border-0 text-xs">NEW</Badge>
                                  </div>
                                  <p className="font-semibold text-sm truncate">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.benefits}</p>
                                </div>
                                <Badge className="shrink-0 font-bold">{s.matchScore}%</Badge>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* Lost eligibility */}
              {lostEligibility.length > 0 && (
                <StaggerItem>
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <TrendingDown className="h-4 w-4 text-destructive" /> Lost Eligibility
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {lostEligibility.map(s => (
                          <motion.div
                            key={s.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                          >
                            <Card className="border-destructive/20 bg-destructive/5 shadow-soft opacity-70">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <Badge variant="secondary" className={`text-xs mb-1 ${SCHEME_CATEGORIES[s.category]?.color || ""}`}>
                                    {SCHEME_CATEGORIES[s.category]?.icon} {SCHEME_CATEGORIES[s.category]?.label}
                                  </Badge>
                                  <p className="font-semibold text-sm truncate line-through">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.benefits}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-destructive">Lost</Badge>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* All simulated results */}
              <StaggerItem>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Minus className="h-4 w-4 text-muted-foreground" /> All Matching Schemes ({simResults.length})
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {simResults.slice(0, 12).map(s => {
                        const orig = originalResults.find(o => o.id === s.id);
                        const diff = orig ? s.matchScore - orig.matchScore : s.matchScore;
                        return (
                          <motion.div
                            key={s.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                          >
                            <Card className="border-border/60 shadow-soft">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <Badge variant="secondary" className={`text-xs mb-1 ${SCHEME_CATEGORIES[s.category]?.color || ""}`}>
                                    {SCHEME_CATEGORIES[s.category]?.icon} {SCHEME_CATEGORIES[s.category]?.label}
                                  </Badge>
                                  <p className="font-semibold text-sm truncate">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.benefits}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {diff !== 0 && (
                                    <span className={`text-xs font-medium ${diff > 0 ? "text-success" : "text-destructive"}`}>
                                      {diff > 0 ? "+" : ""}{diff}%
                                    </span>
                                  )}
                                  <Badge variant={s.matchScore >= 70 ? "default" : "secondary"} className="font-bold">
                                    {s.matchScore}%
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </StaggerItem>
            </div>
          </div>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default Simulator;
