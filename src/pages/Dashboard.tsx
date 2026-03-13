import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, RefreshCw, BookmarkCheck, LogOut, ArrowRight, FileText, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sampleSchemes, SCHEME_CATEGORIES } from "@/data/schemes";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { auth, profile, savedSchemes, logout } = useAuth();

  const saved = useMemo(() => {
    return sampleSchemes.filter(s => savedSchemes.includes(s.id));
  }, [savedSchemes]);

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

      <div className="container max-w-3xl py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">
              Welcome back{profile.name ? `, ${profile.name}` : ""}! 👋
            </h1>
            <p className="mt-1 text-muted-foreground">Here's your scheme discovery dashboard.</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
                  <p className="text-xs text-muted-foreground">Answer questions again</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/schemes")}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Search className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Browse Schemes</p>
                  <p className="text-xs text-muted-foreground">View all matches</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Summary */}
          <Card className="mb-8">
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
                  { label: "Gender", value: profile.gender },
                  { label: "Category", value: profile.category },
                  { label: "Caste Category", value: profile.casteCategory },
                  { label: "Income", value: profile.income ? `₹${profile.income.toLocaleString("en-IN")}` : "" },
                  { label: "Employment", value: profile.employmentStatus },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-sm font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved Schemes */}
          <div>
            <div className="mb-4 flex items-center justify-between">
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
