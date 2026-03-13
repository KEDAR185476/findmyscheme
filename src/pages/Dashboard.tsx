import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, BookmarkCheck, LogOut, ArrowRight, FileText, Search, Bell, TrendingUp, Gift, Target, Clock, IndianRupee, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { computeAgeRange } from "@/types";
import { matchScheme } from "@/lib/matchScheme";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";

const Dashboard = () => {
  const navigate = useNavigate();
  const { auth, profile, savedSchemes, logout, loadProfileFromServer } = useAuth();
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated) loadProfileFromServer();
    const lv = localStorage.getItem("fms_last_visit");
    setLastVisit(lv);
    localStorage.setItem("fms_last_visit", new Date().toISOString());
  }, [auth.isAuthenticated]);

  const allMatched = useMemo(() => {
    return sampleSchemes
      .map(s => ({ ...s, matchScore: matchScheme(s, profile) }))
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [profile]);

  const eligible = allMatched.filter(s => s.matchScore >= 70);
  const nearlyEligible = allMatched.filter(s => s.matchScore >= 40 && s.matchScore < 70);
  const futureOpportunities = allMatched.filter(s => s.matchScore > 0 && s.matchScore < 40);
  const saved = useMemo(() => sampleSchemes.filter(s => savedSchemes.includes(s.id)), [savedSchemes]);

  const newSchemes = useMemo(() => {
    if (!lastVisit || !auth.isReturningUser) return [];
    return allMatched.filter(s => s.launchDate && new Date(s.launchDate) > new Date("2023-01-01")).slice(0, 3);
  }, [allMatched, lastVisit, auth.isReturningUser]);

  const profileFields = ["name", "dob", "gender", "state", "income", "category", "employmentStatus", "educationLevel", "occupationType", "residency"];
  const filledFields = profileFields.filter(f => {
    const val = (profile as any)[f];
    return val !== null && val !== undefined && val !== "" && val !== false;
  });
  const profileCompletion = Math.round((filledFields.length / profileFields.length) * 100);

  const totalBenefits = useMemo(() => {
    let total = 0;
    eligible.forEach(s => {
      const match = s.benefits.match(/₹([\d,]+)/);
      if (match) total += parseInt(match[1].replace(/,/g, ""));
    });
    return total;
  }, [eligible]);

  const handleLogout = () => { logout(); navigate("/"); toast.success("Logged out successfully"); };

  return (
    <PageTransition>
      <AppHeader title="Dashboard">
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/schemes")}>
          <Search className="mr-1.5 h-4 w-4" /> Schemes
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={handleLogout}>
          <LogOut className="mr-1.5 h-4 w-4" /> Logout
        </Button>
      </AppHeader>

      <div className="container max-w-4xl py-8 md:py-10">
        <StaggerContainer>
          {/* Welcome */}
          <StaggerItem>
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Welcome back{profile.name ? `, ${profile.name}` : ""}! 👋
              </h1>
              <p className="mt-2 text-muted-foreground">
                {profile.state && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.state}</span>}
                {profile.state && " · "}
                Here's your personalized scheme dashboard.
              </p>
            </div>
          </StaggerItem>

          {/* New scheme notifications */}
          {newSchemes.length > 0 && (
            <StaggerItem>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8 rounded-2xl border border-accent/20 bg-accent/5 p-5"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <Bell className="h-4 w-4 text-accent" />
                  </div>
                  <span className="font-semibold text-sm">
                    {newSchemes.length} new scheme{newSchemes.length !== 1 ? "s" : ""} matching your profile
                  </span>
                </div>
                <div className="space-y-2">
                  {newSchemes.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-background/80 px-4 py-3 shadow-soft">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">You may be eligible · {s.matchScore}% match</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/schemes")}>
                        View <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </StaggerItem>
          )}

          {/* Gamified Stats */}
          <StaggerItem>
            <div className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
              {[
                { icon: Target, label: "Eligible", value: eligible.length, color: "bg-primary/10 text-primary" },
                { icon: Clock, label: "Nearly Eligible", value: nearlyEligible.length, color: "bg-accent/10 text-accent" },
                { icon: IndianRupee, label: "Benefits", value: totalBenefits > 0 ? `₹${(totalBenefits / 1000).toFixed(0)}K` : "—", color: "bg-success/10 text-success" },
                { icon: TrendingUp, label: "Profile", value: `${profileCompletion}%`, color: "bg-primary/10 text-primary", showProgress: true },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <Card className="border-border/60 shadow-soft hover:shadow-card transition-shadow duration-300">
                    <CardContent className="p-5 text-center">
                      <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
                      {stat.showProgress && (
                        <div className="mt-2 mx-auto w-16 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="h-1.5 rounded-full gradient-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${profileCompletion}%` }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </StaggerItem>

          {/* Quick Actions */}
          <StaggerItem>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: FileText, title: "Update Documents", desc: "Upload new IDs", color: "bg-primary/10 text-primary", route: "/upload" },
                { icon: RefreshCw, title: "Re-check Eligibility", desc: "AI-powered questions", color: "bg-accent/10 text-accent", route: "/questions" },
                { icon: Search, title: "Browse All Schemes", desc: `${allMatched.length} matching`, color: "bg-success/10 text-success", route: "/schemes" },
              ].map((action, i) => (
                <Card
                  key={action.title}
                  className="group cursor-pointer border-border/60 shadow-soft transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
                  onClick={() => navigate(action.route)}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.color} transition-transform duration-300 group-hover:scale-110`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </StaggerItem>

          {/* Top Eligible Schemes */}
          {eligible.length > 0 && (
            <StaggerItem>
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success text-sm">✓</span>
                    Top Eligible Schemes
                  </h2>
                  <Button variant="link" size="sm" className="text-primary" onClick={() => navigate("/schemes")}>
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {eligible.slice(0, 4).map((scheme, i) => (
                    <motion.div
                      key={scheme.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                    >
                      <Card className="group cursor-pointer border-border/60 shadow-soft transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5" onClick={() => navigate("/schemes")}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                                  {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-sm truncate">{scheme.name}</h3>
                              <p className="text-xs text-muted-foreground truncate mt-1">{scheme.benefits}</p>
                            </div>
                            <Badge variant={scheme.matchScore >= 80 ? "default" : "secondary"} className="shrink-0 font-bold">
                              {scheme.matchScore}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}

          {/* Future Opportunities */}
          {futureOpportunities.length > 0 && (
            <StaggerItem>
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Future Opportunities ({futureOpportunities.length})</h2>
                  <span className="text-xs font-normal text-muted-foreground">— you may qualify later</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {futureOpportunities.slice(0, 4).map((scheme, i) => (
                    <motion.div
                      key={scheme.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                    >
                      <Card className="cursor-pointer border-border/60 shadow-soft opacity-80 transition-all duration-300 hover:opacity-100 hover:shadow-card-hover" onClick={() => navigate("/schemes")}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                                  {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-sm truncate">{scheme.name}</h3>
                              <p className="text-xs text-muted-foreground truncate mt-1">{scheme.benefits}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-muted-foreground">
                              {scheme.matchScore}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}

          {/* Profile Summary */}
          <StaggerItem>
            <Card className="mb-8 border-border/60 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">Profile Summary</CardTitle>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/verify")}>Edit</Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    { label: "Name", value: profile.name },
                    { label: "Phone", value: auth.phone ? `+91 ${auth.phone}` : "" },
                    { label: "State", value: profile.state },
                    { label: "Age Range", value: profile.ageRange || computeAgeRange(profile.dob) },
                    { label: "Gender", value: profile.gender },
                    { label: "Income", value: profile.income ? `₹${profile.income.toLocaleString("en-IN")}` : "" },
                    { label: "Category", value: profile.category },
                    { label: "Occupation", value: profile.occupationType || profile.employmentStatus },
                    { label: "Education", value: profile.educationLevel },
                    { label: "Residency", value: profile.residency },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <span className="text-sm font-medium capitalize">{f.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Saved Schemes */}
          <StaggerItem>
            <div>
              <div className="mb-4 flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Saved Schemes ({saved.length})</h2>
              </div>
              {saved.length === 0 ? (
                <Card className="border-border/60 shadow-soft">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No saved schemes yet.</p>
                    <Button variant="link" className="mt-1" onClick={() => navigate("/schemes")}>Browse schemes →</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {saved.map(scheme => (
                    <Card key={scheme.id} className="cursor-pointer border-border/60 shadow-soft transition-all duration-300 hover:shadow-card-hover" onClick={() => navigate("/schemes")}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                              {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-sm truncate">{scheme.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{scheme.benefits}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
