import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, User, RefreshCw, BookmarkCheck, LogOut, ArrowRight, FileText, Search, Bell, TrendingUp, Gift, Target, Clock, IndianRupee, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { Scheme, MatchedScheme, computeAgeRange } from "@/types";
import { matchScheme } from "@/lib/matchScheme";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { auth, profile, savedSchemes, logout, loadProfileFromServer } = useAuth();
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadProfileFromServer();
    }
    // Track last visit for notifications
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

  // Simulate new schemes for returning users (schemes launched after last visit)
  const newSchemes = useMemo(() => {
    if (!lastVisit || !auth.isReturningUser) return [];
    return allMatched.filter(s => s.launchDate && new Date(s.launchDate) > new Date("2023-01-01")).slice(0, 3);
  }, [allMatched, lastVisit, auth.isReturningUser]);

  // Profile completion score
  const profileFields = ["name", "dob", "gender", "state", "income", "category", "employmentStatus", "educationLevel", "occupationType", "residency"];
  const filledFields = profileFields.filter(f => {
    const val = (profile as any)[f];
    return val !== null && val !== undefined && val !== "" && val !== false;
  });
  const profileCompletion = Math.round((filledFields.length / profileFields.length) * 100);

  // Total benefits estimate
  const totalBenefits = useMemo(() => {
    let total = 0;
    eligible.forEach(s => {
      const match = s.benefits.match(/₹([\d,]+)/);
      if (match) total += parseInt(match[1].replace(/,/g, ""));
    });
    return total;
  }, [eligible]);

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/schemes")}>
              <Search className="mr-1 h-4 w-4" /> Find Schemes
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              Welcome back{profile.name ? `, ${profile.name}` : ""}! 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              {profile.state && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.state}</span>}
              {profile.state && " · "}
              Here's your personalized scheme dashboard.
            </p>
          </div>

          {/* New scheme notifications */}
          {newSchemes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-5 w-5 text-accent-foreground" />
                <span className="font-semibold text-sm">
                  {newSchemes.length} new scheme{newSchemes.length !== 1 ? "s" : ""} matching your profile
                </span>
              </div>
              <div className="space-y-2">
                {newSchemes.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">You may be eligible · {s.matchScore}% match</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate("/schemes")}>
                      View <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Gamified Stats */}
          <div className="mb-6 grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-primary/10 mb-2">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{eligible.length}</p>
                <p className="text-xs text-muted-foreground">Eligible Schemes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-accent/20 mb-2">
                  <Clock className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="text-2xl font-bold">{nearlyEligible.length}</p>
                <p className="text-xs text-muted-foreground">Nearly Eligible</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-success/10 mb-2">
                  <IndianRupee className="h-5 w-5 text-success" />
                </div>
                <p className="text-2xl font-bold">₹{totalBenefits > 0 ? (totalBenefits / 1000).toFixed(0) + "K" : "—"}</p>
                <p className="text-xs text-muted-foreground">Benefits Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-primary/10 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{profileCompletion}%</p>
                <p className="text-xs text-muted-foreground">Profile Complete</p>
                <Progress value={profileCompletion} className="mt-1.5 h-1" />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/upload")}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Update Documents</p>
                  <p className="text-xs text-muted-foreground">Upload new IDs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/questions")}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                  <RefreshCw className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Re-check Eligibility</p>
                  <p className="text-xs text-muted-foreground">AI-powered questions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/schemes")}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Search className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Browse All Schemes</p>
                  <p className="text-xs text-muted-foreground">{allMatched.length} matching</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Eligible Schemes */}
          {eligible.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  ✅ Top Eligible Schemes
                </h2>
                <Button variant="link" size="sm" onClick={() => navigate("/schemes")}>
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {eligible.slice(0, 4).map(scheme => (
                  <Card key={scheme.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/schemes")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                              {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm truncate">{scheme.name}</h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{scheme.benefits}</p>
                        </div>
                        <Badge variant={scheme.matchScore >= 80 ? "default" : "secondary"} className="shrink-0">
                          {scheme.matchScore}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Future Opportunities */}
          {futureOpportunities.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent-foreground" /> Future Opportunities ({futureOpportunities.length})
                  <span className="text-xs font-normal text-muted-foreground">— you may qualify later</span>
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {futureOpportunities.slice(0, 4).map(scheme => (
                  <Card key={scheme.id} className="cursor-pointer transition-shadow hover:shadow-md opacity-80" onClick={() => navigate("/schemes")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                              {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm truncate">{scheme.name}</h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{scheme.benefits}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-muted-foreground">
                          {scheme.matchScore}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Profile Summary */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Profile Summary</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/verify")}>Edit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
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
                  <div key={f.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-sm font-medium capitalize">{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved Schemes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-primary" /> Saved Schemes ({saved.length})
              </h2>
            </div>
            {saved.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">No saved schemes yet.</p>
                  <Button variant="link" onClick={() => navigate("/schemes")}>Browse schemes →</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {saved.map(scheme => (
                  <Card key={scheme.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/schemes")}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                            {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-sm truncate">{scheme.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{scheme.benefits}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
