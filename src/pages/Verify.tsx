import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CheckCircle2, AlertCircle, ArrowRight, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { INDIAN_STATES } from "@/types";
import { toast } from "sonner";

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const color = confidence >= 0.9 ? "text-success" : confidence >= 0.75 ? "text-warning" : "text-destructive";
  const Icon = confidence >= 0.9 ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.round(confidence * 100)}%
    </div>
  );
};

// Ordered list of fields to display — ensures consistent layout
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

// The minimum set of fields to always show, even if not extracted
const REQUIRED_DISPLAY_FIELDS = ["name", "dob", "age", "gender", "state", "income", "category", "residency"];

const Verify = () => {
  const navigate = useNavigate();
  const { setProfile, syncProfileToServer } = useAuth();
  const [fields, setFields] = useState<Record<string, { value: string; confidence: number }>>({});
  const [processing, setProcessing] = useState(true);
  const [docsCleared, setDocsCleared] = useState(false);

  useEffect(() => {
    // Load real OCR-extracted fields
    const ocrFields = localStorage.getItem("fms_ocr_fields");
    let parsed: Record<string, { value: string; confidence: number }> = {};

    if (ocrFields) {
      try {
        parsed = JSON.parse(ocrFields);
      } catch (e) {
        console.error("Failed to parse OCR fields:", e);
      }
    }

    // Remove sensitive document data — only derived attributes shown
    delete parsed.aadhaarNumber;
    delete parsed.panNumber;

    // Ensure all required display fields exist
    for (const key of REQUIRED_DISPLAY_FIELDS) {
      if (!parsed[key]) {
        parsed[key] = { value: key === "residency" ? "rural" : "", confidence: 0 };
      }
    }

    // Compute age from DOB if DOB exists but age doesn't
    if (parsed.dob?.value && (!parsed.age || !parsed.age.value)) {
      try {
        const dob = new Date(parsed.dob.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const md = today.getMonth() - dob.getMonth();
        if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
        if (age > 0 && age < 150) {
          parsed.age = { value: String(age), confidence: parsed.dob.confidence };
        }
      } catch {}
    }

    setFields(parsed);
    setProcessing(false);

    // Security: clear uploaded document data from localStorage immediately
    localStorage.removeItem("fms_ocr_fields");
    localStorage.removeItem("fms_uploaded_docs");
    setDocsCleared(true);
  }, []);

  // Recompute age when DOB changes
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
          if (age > 0 && age < 150) {
            next.age = { value: String(age), confidence: 1 };
          }
        } catch {}
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const updates: Record<string, any> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (key === "age") continue; // age is derived, not stored
      if (key === "income") {
        updates[key] = val.value ? parseInt(val.value) : null;
      } else {
        updates[key] = val.value;
      }
    }
    setProfile(prev => ({ ...prev, ...updates }));
    syncProfileToServer();
    navigate("/questions");
    toast.success("Profile verified! Let's refine your eligibility.");
  };

  // Sort fields by FIELD_ORDER, then any extras
  const sortedFields = Object.entries(fields).sort(([a], [b]) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <h2 className="text-xl font-semibold">Loading Extracted Data...</h2>
          <p className="mt-2 text-muted-foreground">Preparing verification screen</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">FindMyScheme</span>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 text-2xl font-bold">Verify Extracted Information</h1>
          <p className="mb-4 text-muted-foreground">
            Review the details extracted from your documents. Edit any field that looks incorrect.
          </p>

          {/* Security notice — documents deleted */}
          {docsCleared && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2.5"
            >
              <Trash2 className="h-4 w-4 text-success" />
              <p className="text-xs text-success">
                <strong>Documents deleted.</strong> Your uploaded files have been securely removed. Only extracted text is retained.
              </p>
            </motion.div>
          )}

          <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-xs text-primary">
              <strong>Privacy first:</strong> Only derived attributes are stored — never your original documents.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedFields.map(([key, { value, confidence }]) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={key}>{FIELD_LABELS[key] || key}</Label>
                    {confidence > 0 && <ConfidenceBadge confidence={confidence} />}
                  </div>
                  {key === "gender" ? (
                    <Select value={value} onValueChange={v => updateField(key, v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : key === "state" ? (
                    <Select value={value} onValueChange={v => updateField(key, v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : key === "category" ? (
                    <Select value={value} onValueChange={v => updateField(key, v)}>
                      <SelectTrigger><SelectValue placeholder="Select income category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APL">APL (Above Poverty Line)</SelectItem>
                        <SelectItem value="BPL">BPL (Below Poverty Line)</SelectItem>
                        <SelectItem value="AAY">AAY (Antyodaya Anna Yojana)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : key === "casteCategory" ? (
                    <Select value={value} onValueChange={v => updateField(key, v)}>
                      <SelectTrigger><SelectValue placeholder="Select caste category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="OBC">OBC</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="ST">ST</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : key === "residency" ? (
                    <Select value={value} onValueChange={v => updateField(key, v)}>
                      <SelectTrigger><SelectValue placeholder="Select area type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rural">Rural</SelectItem>
                        <SelectItem value="urban">Urban</SelectItem>
                        <SelectItem value="semi-urban">Semi-Urban</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : key === "age" ? (
                    <Input
                      id={key}
                      type="number"
                      value={value}
                      readOnly
                      className="bg-muted/50"
                      title="Computed from Date of Birth"
                    />
                  ) : (
                    <Input
                      id={key}
                      type={key === "income" ? "number" : key === "dob" ? "date" : "text"}
                      value={value}
                      onChange={e => updateField(key, e.target.value)}
                      className={confidence > 0 && confidence < 0.75 ? "border-warning" : ""}
                      placeholder={FIELD_LABELS[key]}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleConfirm} size="lg">
              Confirm & Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Verify;
