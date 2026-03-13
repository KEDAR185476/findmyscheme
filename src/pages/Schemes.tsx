import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, Search, Bookmark, BookmarkCheck, ExternalLink, Filter, ArrowRight, Home, FileText, Share2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { Scheme, MatchedScheme } from "@/types";

const matchScheme = (scheme: Scheme, profile: any): number => {
  let score = 50; // Base
  const e = scheme.eligibility;

  // Age check
  if (profile.dob && (e.minAge || e.maxAge)) {
    const age = Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000);
    if (e.minAge && age < e.minAge) return 0;
    if (e.maxAge && age > e.maxAge) return 0;
    score += 10;
  }

  // Income check
  if (profile.income && e.maxIncome) {
    if (profile.income > e.maxIncome) return 0;
    score += 15;
  }

  // Gender check
  if (e.gender && e.gender !== "any" && profile.gender && e.gender !== profile.gender) return 0;
  if (e.gender && e.gender !== "any" && e.gender === profile.gender) score += 10;

  // Category check
  if (e.categories && e.categories.length > 0) {
    const userCats = [profile.category, profile.casteCategory].filter(Boolean);
    if (userCats.length > 0 && !e.categories.some((c: string) => userCats.includes(c))) return 0;
    if (userCats.some((c: string) => e.categories!.includes(c))) score += 15;
  }

  // State check
  if (e.states && e.states.length > 0) {
    if (profile.state && !e.states.includes(profile.state)) return 0;
    if (profile.state && e.states.includes(profile.state)) score += 10;
  }
  if (scheme.state === "All India") score += 5;

  // Occupation
  if (e.occupations && e.occupations.length > 0 && profile.employmentStatus) {
    const emp = profile.employmentStatus.toLowerCase();
    if (e.occupations.some((o: string) => emp.includes(o))) score += 10;
  }

  return Math.min(score, 98);
};

const Schemes = () => {
  const navigate = useNavigate();
  const { profile, savedSchemes, toggleSaveScheme } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedScheme, setSelectedScheme] = useState<MatchedScheme | null>(null);

  const matchedSchemes = useMemo(() => {
    return sampleSchemes
      .map(s => ({ ...s, matchScore: matchScheme(s, profile) }))
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [profile]);

  const filtered = useMemo(() => {
    let result = matchedSchemes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter(s => s.category === categoryFilter);
    }
    return result;
  }, [matchedSchemes, search, categoryFilter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">Scheme Results</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <Home className="mr-1 h-4 w-4" /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Summary */}
          <div className="mb-6 rounded-xl border bg-card p-6">
            <h1 className="text-2xl font-bold">🎯 {matchedSchemes.length} Schemes Found</h1>
            <p className="mt-1 text-muted-foreground">Based on your profile, here are the welfare schemes you may be eligible for.</p>
          </div>

          {/* Search + Filter */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schemes..." className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={categoryFilter === "" ? "default" : "outline"}
                onClick={() => setCategoryFilter("")}
                className="rounded-full"
              >
                All
              </Button>
              {Object.entries(SCHEME_CATEGORIES).slice(0, 5).map(([key, cat]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={categoryFilter === key ? "default" : "outline"}
                  onClick={() => setCategoryFilter(key === categoryFilter ? "" : key)}
                  className="rounded-full"
                >
                  {cat.icon} {cat.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Scheme Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((scheme, i) => (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedScheme(scheme)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                            {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{scheme.state}</Badge>
                        </div>
                        <h3 className="mb-1 font-semibold leading-tight">{scheme.name}</h3>
                        <p className="text-xs text-muted-foreground">{scheme.department}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{scheme.benefits}</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative h-12 w-12">
                          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15.5" fill="none"
                              stroke={scheme.matchScore >= 80 ? "hsl(var(--success))" : scheme.matchScore >= 60 ? "hsl(var(--warning))" : "hsl(var(--accent))"}
                              strokeWidth="3"
                              strokeDasharray={`${scheme.matchScore} ${100 - scheme.matchScore}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {scheme.matchScore}%
                          </span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleSaveScheme(scheme.id); }}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {savedSchemes.includes(scheme.id) ? (
                            <BookmarkCheck className="h-5 w-5 text-primary" />
                          ) : (
                            <Bookmark className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-lg text-muted-foreground">No schemes match your current filters.</p>
              <Button variant="link" onClick={() => { setSearch(""); setCategoryFilter(""); }}>Clear filters</Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedScheme} onOpenChange={() => setSelectedScheme(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selectedScheme && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={SCHEME_CATEGORIES[selectedScheme.category]?.color}>
                    {SCHEME_CATEGORIES[selectedScheme.category]?.icon} {SCHEME_CATEGORIES[selectedScheme.category]?.label}
                  </Badge>
                  <Badge variant="outline">{selectedScheme.matchScore}% Match</Badge>
                </div>
                <DialogTitle className="text-xl">{selectedScheme.name}</DialogTitle>
                <DialogDescription>{selectedScheme.department}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedScheme.description}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Benefits</h4>
                  <p className="text-sm text-muted-foreground">{selectedScheme.benefits}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Documents Required</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedScheme.documentsRequired.map(d => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        <FileText className="mr-1 h-3 w-3" /> {d}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Deadline</h4>
                  <p className="text-sm text-muted-foreground">{selectedScheme.deadline}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" asChild>
                    <a href={selectedScheme.applicationUrl} target="_blank" rel="noopener noreferrer">
                      Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => toggleSaveScheme(selectedScheme.id)}>
                    {savedSchemes.includes(selectedScheme.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => {
                    navigator.share?.({ title: selectedScheme.name, text: selectedScheme.description, url: selectedScheme.applicationUrl })
                      .catch(() => { navigator.clipboard.writeText(selectedScheme.applicationUrl); toast("Link copied!"); });
                  }}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Need toast import
import { toast } from "sonner";

export default Schemes;
