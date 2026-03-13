import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Phone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("otp", {
        body: { phone, action: "send" },
      });
      if (error) throw error;
      setStep("otp");
      toast.success("OTP sent! (Dev mode: use 123456)");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("otp", {
        body: { phone, action: "verify", code: otp },
      });

      if (error) throw error;

      if (!data?.success) {
        toast.error(data?.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      const isReturning = data.isReturningUser;
      login(phone, isReturning, data.profile);

      if (isReturning) {
        navigate("/dashboard");
        toast.success(`Welcome back${data.profile?.name ? ` ${data.profile.name}` : ""}!`);
      } else {
        navigate("/upload");
        toast.success("Login successful! Let's set up your profile.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">FindMyScheme</h1>
          <p className="mt-1 text-muted-foreground">Login to discover your benefits</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {step === "phone" ? "Enter Phone Number" : "Verify OTP"}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "We'll send you a one-time verification code"
                : `OTP sent to +91 ${phone}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-medium text-muted-foreground">
                    +91
                  </div>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    className="flex-1"
                  />
                </div>
                <Button className="w-full" onClick={handleSendOtp} disabled={loading || phone.length !== 10}>
                  {loading ? "Sending..." : "Send OTP"}
                  <Phone className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>
                  {loading ? "Verifying..." : "Verify & Login"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => { setStep("phone"); setOtp(""); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Change Number
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
