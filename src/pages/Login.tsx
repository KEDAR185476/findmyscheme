import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Phone, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import { ThemeLangSwitcher } from "@/components/ThemeLangSwitcher";
import { useTranslation } from "react-i18next";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length !== 10) { toast.error(t("invalid_phone")); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("otp", { body: { phone, action: "send" } });
      if (error) throw error;
      setStep("otp");
      toast.success(t("otp_sent_success"));
    } catch (e: any) {
      toast.error(e.message || t("otp_send_failed"));
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error(t("invalid_otp")); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("otp", { body: { phone, action: "verify", code: otp } });
      if (error) throw error;
      if (!data?.success) { toast.error(data?.error || "Invalid OTP"); setLoading(false); return; }
      const isReturning = data.isReturningUser;
      login(phone, isReturning, data.profile);
      if (isReturning) {
        navigate("/dashboard");
        toast.success(t("welcome_back", { name: data.profile?.name ? ` ${data.profile.name}` : "" }));
      } else {
        navigate("/upload");
        toast.success(t("login_success"));
      }
    } catch (e: any) {
      toast.error(e.message || t("otp_verify_failed"));
    } finally { setLoading(false); }
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Theme/Lang switcher top-right */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeLangSwitcher />
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-md">
          <div className="mb-10 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight">{t("login_title")}</h1>
            <p className="mt-1.5 text-muted-foreground">{t("login_subtitle")}</p>
          </div>

          <Card className="shadow-card border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{step === "phone" ? t("enter_phone") : t("verify_otp")}</CardTitle>
              <CardDescription>{step === "phone" ? t("phone_desc") : t("otp_sent_to", { phone })}</CardDescription>
            </CardHeader>
            <CardContent>
              {step === "phone" ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex h-11 items-center rounded-lg border bg-muted/50 px-3.5 text-sm font-semibold text-muted-foreground">+91</div>
                    <Input type="tel" placeholder={t("enter_10_digit")} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} className="h-11 flex-1 text-base" />
                  </div>
                  <Button className="h-11 w-full rounded-lg text-base" onClick={handleSendOtp} disabled={loading || phone.length !== 10}>
                    {loading ? t("sending") : t("send_otp")} <Phone className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center py-2">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                        <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button className="h-11 w-full rounded-lg text-base" onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>
                    {loading ? t("verifying") : t("verify_login")}
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setStep("phone"); setOtp(""); }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t("change_number")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /><span>{t("data_encrypted")}</span>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
