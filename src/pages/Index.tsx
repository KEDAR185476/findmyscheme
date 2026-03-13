import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Search, Smartphone, Zap, ChevronRight, ArrowRight, CheckCircle2, Lock, Users } from "lucide-react";
import logo from "@/assets/FindMyScheme_logo.png";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";

const Index = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="bg-background">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 glass-nav">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
                <Shield className="h-[18px] w-[18px] text-primary-foreground" />
              </div>
              <span className="text-[17px] font-bold tracking-tight text-foreground">FindMyScheme</span>
            </Link>
            <Button onClick={() => navigate("/login")} size="sm" className="rounded-full px-5 shadow-sm">
              Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden pb-20 pt-16 md:pb-32 md:pt-24">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="container relative">
            <StaggerContainer className="mx-auto max-w-3xl text-center">
              <StaggerItem>
                <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary">
                  <Zap className="h-4 w-4" /> AI-Powered Scheme Discovery
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-[56px]">
                  Find Government Schemes{" "}
                  <span className="text-gradient">You Deserve</span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Upload your documents, answer a few smart questions, and discover welfare schemes
                  you're eligible for — across all Indian states.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" className="h-12 w-full rounded-full px-8 text-base shadow-lg shadow-primary/20 sm:w-auto" onClick={() => navigate("/login")}>
                    Get Started Free <ChevronRight className="ml-1 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 w-full rounded-full px-8 text-base sm:w-auto" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                    How It Works
                  </Button>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> 100% Free</span>
                  <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-success" /> Privacy First</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-success" /> All States</span>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-card/50 py-14">
          <div className="container">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { value: "500+", label: "Schemes Covered" },
                { value: "36", label: "States & UTs" },
                { value: "5", label: "Document Types" },
                { value: "2 Min", label: "Average Time" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="text-center"
                >
                  <div className="text-3xl font-extrabold text-primary md:text-4xl">{stat.value}</div>
                  <div className="mt-1.5 text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-28">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Simple Process</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How It Works</h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Three simple steps to discover the government schemes you qualify for</p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              {[
                { icon: FileText, title: "Upload Documents", desc: "Upload Aadhaar or Income Certificate. Our OCR extracts your details automatically — no manual forms.", step: "01", color: "bg-primary/10 text-primary" },
                { icon: MessageSquare, title: "Answer Smart Questions", desc: "Our AI asks only the questions that matter based on your profile. No lengthy forms, just a quick chat.", step: "02", color: "bg-accent/10 text-accent" },
                { icon: Search, title: "Discover Schemes", desc: "Get a personalized dashboard of schemes you're eligible for, with match scores and direct application links.", step: "03", color: "bg-success/10 text-success" },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="group relative rounded-2xl border bg-card p-8 shadow-soft transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
                >
                  <div className="absolute -top-3.5 left-6 flex h-7 items-center rounded-full gradient-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm">
                    Step {item.step}
                  </div>
                  <div className={`mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2.5 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Key Features</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why FindMyScheme?</h2>
            </motion.div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Shield, title: "Secure & Private", desc: "Your documents are processed in-browser using on-device OCR. We never store raw files on any server." },
                { icon: Smartphone, title: "Works Everywhere", desc: "Responsive PWA that works seamlessly on any device — desktop, tablet, or mobile." },
                { icon: Zap, title: "AI-Powered Matching", desc: "Smart algorithms match your profile against 500+ government schemes for accurate results." },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border bg-card p-7 shadow-soft transition-all duration-300 hover:shadow-card-hover"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="gradient-primary rounded-3xl p-10 text-center shadow-glow md:p-16"
            >
              <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">Ready to Discover Your Benefits?</h2>
              <p className="mx-auto mb-8 max-w-xl text-primary-foreground/75 text-lg">
                Join thousands of citizens who have found the government schemes they're eligible for.
              </p>
              <Button size="lg" variant="secondary" className="h-12 rounded-full px-8 text-base font-semibold shadow-lg" onClick={() => navigate("/login")}>
                Start Now — It's Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-10">
          <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
                <Shield className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">FindMyScheme</span>
            </div>
            <p>© 2026 FindMyScheme. Empowering citizens with information.</p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Index;
