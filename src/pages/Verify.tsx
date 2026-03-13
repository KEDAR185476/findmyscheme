import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, ArrowRight, Trash2, Lock, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { INDIAN_STATES } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const color = confidence >= 0.9 ? "text-success" : confidence >= 0.75 ? "text-warning" : "text-destructive";
  const Icon = confidence >= 0.9 ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.round(confidence * 100)}%
    </div>
  );
};

const FIELD_ORDER = [
  "name", "dob", "age", "gender", "address", "state", "district",
  "income", "category", "casteCategory", "residency",
];

const FIELD_LABELS: Record<string, string> = {
  name: "Full Name",
  dob: "Date of Birth",
  age: "Age",
  gender: "Gender",
  address: "Address",
  state: "State",
  district: "District",
  income: "Annual Income (₹)",
  category: "Income Category (APL/BPL/AAY)",
  casteCategory: "Caste Category",
  residency: "Area of Residence",
};

const REQUIRED_DISPLAY_FIELDS = ["name", "dob", "age", "gender", "state", "income", "category", "residency"];

const Verify = () => {
  const navigate = useNavigate();
  const { auth, setProfile, syncProfileToServer } = useAuth();
  const [fields, setFields] = useState<Record<string, { value: string; confidence: number }>>({});
  const [processing, setProcessing] = useState(true);
  const [docsCleared, setDocsCleared] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationAlerts, setVerificationAlerts] = useState<string[]>([]);

  useEffect(() => {
    const ocrFields = localStorage.getItem("fms_ocr_fields");
    let parsed: Record<string, { value: string; confidence: number }> = {};
    if (ocrFields) {
      try { parsed = JSON.parse(ocrFields); } catch (e) { console.error("Failed to parse OCR fields:", e); }
    }
    delete parsed.aadhaarNumber;
    delete parsed.panNumber;
    for (const key of REQUIRED_DISPLAY_FIELDS) {
      if (!parsed[key]) parsed[key] = { value: key === "residency" ? "rural" : "", confidence: 0 };
    }
    if (parsed.dob?.value && (!parsed.age || !parsed.age.value)) {
      try {
        const dob = new Date(parsed.dob.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const md = today.getMonth() - dob.getMonth();
        if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
        if (age > 0 && age < 150) parsed.age = { value: String(age), confidence: parsed.dob.confidence };
      } catch {}
    }
    setFields(parsed);
    setProcessing(false);
    localStorage.removeItem("fms_ocr_fields");
    localStorage.removeItem("fms_uploaded_docs");
    setDocsCleared(true);
  }, []);

  const updateField = (key: string, value: string) => {
    setFields(prev => {
      const next = { ...prev, [key]: { value, confidence: 1 } };
      if (key === "dob" && value) {
        try {
          const dob = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const md = today.getMonth() - dob.getMonth();
          if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
          if (age > 0 && age < 150) next.age = { value: String(age), confidence: 1 };
        } catch {}
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const updates: Record<string, any> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (key === "age") continue;
      if (key === "income") updates[key] = val.value ? parseInt(val.value) : null;
      else updates[key] = val.value;
    }

    // Run identity verification silently
    setVerifying(true);
    setVerificationAlerts([]);

    try {
      const ocrFieldsRaw = localStorage.getItem("fms_ocr_fields_backup");
      let ocrFields: Record<string, { value: string; confidence: number }> = {};
      try { ocrFields = ocrFieldsRaw ? JSON.parse(ocrFieldsRaw) : {}; } catch {}

      const { data: verdict, error } = await supabase.functions.invoke("verify-identity", {
        body: {
          phone: auth.phone,
          profile: { ...updates, age: fields.age?.value ? parseInt(fields.age.value) : null },
          ocrFields,
        },
      });

      if (!error && verdict) {
        // Store verification metadata locally (non-sensitive)
        localStorage.setItem("fms_verification", JSON.stringify({
          safe: verdict.safe,
          duplicateLevel: verdict.duplicate?.level,
          fraudLevel: verdict.fraud?.level,
          fraudScore: verdict.fraud?.score,
        }));

        if (verdict.alerts && verdict.alerts.length > 0) {
          setVerificationAlerts(verdict.alerts);

          // High risk: block progression
          if (!verdict.safe) {
            setVerifying(false);
            toast.error("Identity verification flagged. Please review your details.");
            return;
          }

          // Medium risk: warn but allow
          verdict.alerts.forEach((a: string) => toast.warning(a, { duration: 6000 }));
        }
      }
    } catch (err) {
      console.error("Verification check failed (non-blocking):", err);
      // Non-blocking: allow user to proceed even if verification service fails
    }

    setVerifying(false);
    localStorage.removeItem("fms_ocr_fields_backup");

    setProfile(prev => ({ ...prev, ...updates }));
    syncProfileToServer();
    navigate("/questions");
    toast.success("Profile verified! Let's refine your eligibility.");
  };

  const sortedFields = Object.entries(fields).sort(([a], [b]) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-6 h-16 w-16">
            <div className="h-full w-full animate-spin rounded-full border-[3px] border-muted border-t-primary" />
          </div>
          <h2 className="text-xl font-semibold">Loading Extracted Data...</h2>
          <p className="mt-2 text-muted-foreground">Preparing verification screen</p>
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <AppHeader />

      <div className="container max-w-2xl py-8 md:py-12">
        <StaggerContainer>
          <StaggerItem>
            <div className="mb-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Step 2 of 3</p>
            </div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">Verify Extracted Information</h1>
            <p className="mb-5 text-muted-foreground leading-relaxed">
              Review the details extracted from your documents. Edit any field that looks incorrect.
            </p>
          </StaggerItem>

          {docsCleared && (
            <StaggerItem>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-5 py-3"
              >
                <Trash2 className="h-5 w-5 text-success shrink-0" />
                <p className="text-sm text-success">
                  <strong>Documents deleted.</strong> Your uploaded files have been securely removed.
                </p>
              </motion.div>
            </StaggerItem>
          )}

          <StaggerItem>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-5 py-3">
              <Lock className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-primary/90">
                <strong>Privacy first:</strong> Only derived attributes are stored — never your original documents.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <Card className="shadow-card border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {sortedFields.map(([key, { value, confidence }]) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-sm font-medium">{FIELD_LABELS[key] || key}</Label>
                      {confidence > 0 && <ConfidenceBadge confidence={confidence} />}
                    </div>
                    {key === "gender" ? (
                      <Select value={value} onValueChange={v => updateField(key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : key === "state" ? (
                      <Select value={value} onValueChange={v => updateField(key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : key === "category" ? (
                      <Select value={value} onValueChange={v => updateField(key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select income category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APL">APL (Above Poverty Line)</SelectItem>
                          <SelectItem value="BPL">BPL (Below Poverty Line)</SelectItem>
                          <SelectItem value="AAY">AAY (Antyodaya Anna Yojana)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : key === "casteCategory" ? (
                      <Select value={value} onValueChange={v => updateField(key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select caste category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="OBC">OBC</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="ST">ST</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : key === "residency" ? (
                      <Select value={value} onValueChange={v => updateField(key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select area type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rural">Rural</SelectItem>
                          <SelectItem value="urban">Urban</SelectItem>
                          <SelectItem value="semi-urban">Semi-Urban</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : key === "age" ? (
                      <Input id={key} type="number" value={value} readOnly className="h-11 bg-muted/30" title="Computed from Date of Birth" />
                    ) : (
                      <Input
                        id={key}
                        type={key === "income" ? "number" : key === "dob" ? "date" : "text"}
                        value={value}
                        onChange={e => updateField(key, e.target.value)}
                        className={`h-11 ${confidence > 0 && confidence < 0.75 ? "border-warning" : ""}`}
                        placeholder={FIELD_LABELS[key]}
                      />
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-8 flex justify-end">
              <Button onClick={handleConfirm} size="lg" className="h-12 rounded-lg px-8 shadow-sm">
                Confirm & Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default Verify;
