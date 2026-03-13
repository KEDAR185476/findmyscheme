import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Search, Smartphone, Zap, ChevronRight, ArrowRight, CheckCircle2, Lock, Users } from "lucide-react";
import logo from "@/assets/FindMyScheme_logo.png";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { ThemeLangSwitcher } from "@/components/ThemeLangSwitcher";
import { useTranslation } from "react-i18next";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <PageTransition>
      <div className="bg-background">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 glass-nav">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="FindMyScheme" className="h-9 w-9 object-contain" />
              <span className="text-[17px] font-bold tracking-tight text-foreground">FindMyScheme</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeLangSwitcher />
              <Button onClick={() => navigate("/login")} size="sm" className="rounded-full px-5 shadow-sm">
                {t("get_started")} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden pb-20 pt-16 md:pb-32 md:pt-24">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="container relative">
            <StaggerContainer className="mx-auto max-w-3xl text-center">
              <StaggerItem>
                <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary">
                  <Zap className="h-4 w-4" /> {t("hero_badge")}
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-[56px]">
                  {t("hero_title_1")}{" "}
                  <span className="text-gradient">{t("hero_title_2")}</span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {t("hero_desc")}
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" className="h-12 w-full rounded-full px-8 text-base shadow-lg shadow-primary/20 sm:w-auto" onClick={() => navigate("/login")}>
                    {t("get_started_free")} <ChevronRight className="ml-1 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 w-full rounded-full px-8 text-base sm:w-auto" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                    {t("how_it_works")}
                  </Button>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> {t("hero_free")}</span>
                  <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-success" /> {t("hero_privacy")}</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-success" /> {t("hero_states")}</span>
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
                { value: "500+", label: t("stats_schemes") },
                { value: "36", label: t("stats_states") },
                { value: "5", label: t("stats_docs") },
                { value: "2 Min", label: t("stats_time") },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }} className="text-center">
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
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{t("simple_process")}</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("how_it_works_title")}</h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{t("how_it_works_desc")}</p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              {[
                { icon: FileText, title: t("step_upload_title"), desc: t("step_upload_desc"), step: "01", color: "bg-primary/10 text-primary" },
                { icon: MessageSquare, title: t("step_questions_title"), desc: t("step_questions_desc"), step: "02", color: "bg-accent/10 text-accent" },
                { icon: Search, title: t("step_discover_title"), desc: t("step_discover_desc"), step: "03", color: "bg-success/10 text-success" },
              ].map((item, i) => (
                <motion.div key={item.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }} className="group relative rounded-2xl border bg-card p-8 shadow-soft transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
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
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{t("key_features")}</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("features_title")}</h2>
            </motion.div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Zap, title: t("feature_secure_title"), desc: t("feature_secure_desc") },
                { icon: Smartphone, title: t("feature_mobile_title"), desc: t("feature_mobile_desc") },
                { icon: Zap, title: t("feature_ai_title"), desc: t("feature_ai_desc") },
              ].map((feature, i) => (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-2xl border bg-card p-7 shadow-soft transition-all duration-300 hover:shadow-card-hover">
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
            <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="gradient-primary rounded-3xl p-10 text-center shadow-glow md:p-16">
              <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">{t("cta_title")}</h2>
              <p className="mx-auto mb-8 max-w-xl text-primary-foreground/75 text-lg">{t("cta_desc")}</p>
              <Button size="lg" variant="secondary" className="h-12 rounded-full px-8 text-base font-semibold shadow-lg" onClick={() => navigate("/login")}>
                {t("cta_button")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-10">
          <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="FindMyScheme" className="h-7 w-7 object-contain" />
              <span className="font-semibold text-foreground">FindMyScheme</span>
            </div>
            <p>{t("footer_text")}</p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Index;
