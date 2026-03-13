import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Search, Shield, Smartphone, Zap, ChevronRight, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">FindMyScheme</span>
          </Link>
          <Button onClick={() => navigate("/login")} size="sm">
            Get Started <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container relative">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4 text-accent" /> AI-Powered Scheme Discovery
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="mb-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Find the Government Schemes{" "}
              <span className="text-gradient">You Deserve</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mb-10 text-lg text-muted-foreground md:text-xl">
              Upload your documents, answer a few smart questions, and discover welfare schemes
              you're eligible for — across all Indian states. Minimal effort, maximum benefits.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="w-full sm:w-auto text-base px-8" onClick={() => navigate("/login")}>
                Get Started Free <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                How It Works
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card py-12">
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
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-extrabold text-primary md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-14 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">How It Works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to discover your benefits</p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: FileText, title: "Upload Documents", desc: "Upload Aadhaar, PAN, or any ID. Our OCR extracts your details automatically — no manual forms.", step: "01" },
              { icon: MessageSquare, title: "Answer Smart Questions", desc: "Our AI asks only the questions that matter based on your profile. No lengthy forms, just a quick chat.", step: "02" },
              { icon: Search, title: "Discover Schemes", desc: "Get a personalized dashboard of schemes you're eligible for, with match scores and direct application links.", step: "03" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative rounded-xl border bg-card p-8 transition-shadow hover:shadow-lg"
              >
                <div className="absolute -top-4 left-6 flex h-8 items-center rounded-full bg-accent px-3 text-sm font-bold text-accent-foreground">
                  Step {item.step}
                </div>
                <div className="mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-14 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Why FindMyScheme?</h2>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: "Secure & Private", desc: "Your documents are processed in-browser. We never store raw files on any server." },
              { icon: Smartphone, title: "Works Everywhere", desc: "Responsive PWA that works seamlessly on any device — desktop, tablet, or mobile." },
              { icon: Zap, title: "AI-Powered Matching", desc: "Smart algorithms match your profile against 500+ schemes for accurate results." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border bg-card p-6"
              >
                <feature.icon className="mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-primary rounded-2xl p-10 text-center text-primary-foreground md:p-16"
          >
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Discover Your Benefits?</h2>
            <p className="mx-auto mb-8 max-w-xl text-primary-foreground/80">
              Join thousands of citizens who have found the government schemes they're eligible for.
            </p>
            <Button size="lg" variant="secondary" className="text-base px-8" onClick={() => navigate("/login")}>
              Start Now — It's Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">FindMyScheme</span>
          </div>
          <p>© 2026 FindMyScheme. Empowering citizens with information.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
