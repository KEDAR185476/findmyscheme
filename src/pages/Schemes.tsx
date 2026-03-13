import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Bookmark, BookmarkCheck, ExternalLink, Home, FileText, Share2, Globe, MapPin, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { Scheme, MatchedScheme } from "@/types";
import { matchScheme } from "@/lib/matchScheme";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";

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
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.benefits.toLowerCase().includes(q));
    }
    if (categoryFilter) result = result.filter(s => s.category === categoryFilter);
    return result;
  }, [matchedSchemes, search, categoryFilter]);

  const eligible = filtered.filter(s => s.matchScore >= 70);
  const nearlyEligible = filtered.filter(s => s.matchScore >= 40 && s.matchScore < 70);

  return (
    <PageTransition>
      <AppHeader title="Scheme Results">
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/dashboard")}>
          <Home className="mr-1.5 h-4 w-4" /> Dashboard
        </Button>
      </AppHeader>

      <div className="container py-6 md:py-8">
        <StaggerContainer>
          {/* Summary */}
          <StaggerItem>
            <div className="mb-6 rounded-2xl border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{matchedSchemes.length} Schemes Found</h1>
                  <p className="text-sm text-muted-foreground">
                    {profile.state && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {profile.state} + Central schemes
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* Search + Filter */}
          <StaggerItem>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schemes..." className="h-11 rounded-xl pl-10" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={categoryFilter === "" ? "default" : "outline"} onClick={() => setCategoryFilter("")} className="rounded-full">
                  All
                </Button>
                {Object.entries(SCHEME_CATEGORIES).map(([key, cat]) => (
                  <Button key={key} size="sm" variant={categoryFilter === key ? "default" : "outline"} onClick={() => setCategoryFilter(key === categoryFilter ? "" : key)} className="rounded-full">
                    {cat.icon} {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* Eligible Schemes */}
          {eligible.length > 0 && (
            <StaggerItem>
              <div className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success text-sm">✓</span>
                  Eligible Schemes ({eligible.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {eligible.map((scheme, i) => (
                    <SchemeCard key={scheme.id} scheme={scheme} index={i} savedSchemes={savedSchemes} toggleSaveScheme={toggleSaveScheme} onClick={() => setSelectedScheme(scheme)} />
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}

          {/* Nearly Eligible */}
          {nearlyEligible.length > 0 && (
            <StaggerItem>
              <div className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning text-sm">◌</span>
                  Nearly Eligible ({nearlyEligible.length})
                  <span className="text-xs font-normal text-muted-foreground">— minor conditions may apply</span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {nearlyEligible.map((scheme, i) => (
                    <SchemeCard key={scheme.id} scheme={scheme} index={i} savedSchemes={savedSchemes} toggleSaveScheme={toggleSaveScheme} onClick={() => setSelectedScheme(scheme)} />
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}

          {filtered.length === 0 && (
            <StaggerItem>
              <div className="py-16 text-center">
                <p className="text-lg text-muted-foreground">No schemes match your current filters.</p>
                <Button variant="link" onClick={() => { setSearch(""); setCategoryFilter(""); }}>Clear filters</Button>
              </div>
            </StaggerItem>
          )}
        </StaggerContainer>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedScheme} onOpenChange={() => setSelectedScheme(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selectedScheme && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={SCHEME_CATEGORIES[selectedScheme.category]?.color}>
                    {SCHEME_CATEGORIES[selectedScheme.category]?.icon} {SCHEME_CATEGORIES[selectedScheme.category]?.label}
                  </Badge>
                  <Badge variant="outline">{selectedScheme.matchScore}% Match</Badge>
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="mr-1 h-3 w-3" />{selectedScheme.state}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedScheme.name}</DialogTitle>
                <DialogDescription>{selectedScheme.department}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 mt-4">
                <div>
                  <h4 className="mb-1.5 text-sm font-semibold">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedScheme.description}</p>
                </div>
                <div className="rounded-xl bg-primary/5 p-4">
                  <h4 className="mb-1 text-sm font-semibold text-primary">Benefits</h4>
                  <p className="text-sm font-medium text-primary">{selectedScheme.benefits}</p>
                </div>
                <div>
                  <h4 className="mb-1.5 text-sm font-semibold">Target Beneficiaries</h4>
                  <p className="text-sm text-muted-foreground">{selectedScheme.targetBeneficiaries}</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Documents Required</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedScheme.documentsRequired.map(d => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        <FileText className="mr-1 h-3 w-3" /> {d}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <h4 className="mb-1 text-xs font-semibold text-muted-foreground">Deadline</h4>
                    <p className="text-sm">{selectedScheme.deadline}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="mb-1 text-xs font-semibold text-muted-foreground">Source</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {selectedScheme.source}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 h-11 rounded-lg shadow-sm" asChild>
                    <a href={selectedScheme.applicationUrl} target="_blank" rel="noopener noreferrer">
                      Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-lg" onClick={() => toggleSaveScheme(selectedScheme.id)}>
                    {savedSchemes.includes(selectedScheme.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-lg" onClick={() => {
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
    </PageTransition>
  );
};

const SchemeCard = ({ scheme, index, savedSchemes, toggleSaveScheme, onClick }: {
  scheme: MatchedScheme;
  index: number;
  savedSchemes: string[];
  toggleSaveScheme: (id: string) => void;
  onClick: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.4 }}
  >
    <Card className="group cursor-pointer border-border/60 shadow-soft transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-2.5 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={`text-xs ${SCHEME_CATEGORIES[scheme.category]?.color || ""}`}>
                {SCHEME_CATEGORIES[scheme.category]?.icon} {SCHEME_CATEGORIES[scheme.category]?.label}
              </Badge>
              <Badge variant="outline" className="text-xs border-border/60">
                <MapPin className="mr-0.5 h-2.5 w-2.5" />{scheme.state}
              </Badge>
            </div>
            <h3 className="mb-1 font-semibold leading-tight tracking-tight">{scheme.name}</h3>
            <p className="text-xs text-muted-foreground">{scheme.department}</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{scheme.benefits}</p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/50">Source: {scheme.source}</p>
          </div>
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={scheme.matchScore >= 80 ? "hsl(var(--success))" : scheme.matchScore >= 60 ? "hsl(var(--warning))" : "hsl(var(--accent))"}
                  strokeWidth="2.5"
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
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
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
);

export default Schemes;
