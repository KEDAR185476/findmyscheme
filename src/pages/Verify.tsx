import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { INDIAN_STATES } from "@/types";
import { toast } from "sonner";

const mockOcrData: Record<string, Record<string, { value: string; confidence: number }>> = {
  aadhaar: {
    name: { value: "Rajesh Kumar", confidence: 0.95 },
    dob: { value: "1990-05-15", confidence: 0.88 },
    gender: { value: "male", confidence: 0.99 },
    address: { value: "123 Main Street, Block A", confidence: 0.72 },
    state: { value: "Uttar Pradesh", confidence: 0.85 },
    district: { value: "Lucknow", confidence: 0.80 },
    aadhaarNumber: { value: "1234-5678-9012", confidence: 0.92 },
  },
  pan: {
    name: { value: "Rajesh Kumar", confidence: 0.97 },
    panNumber: { value: "ABCDE1234F", confidence: 0.96 },
    dob: { value: "1990-05-15", confidence: 0.90 },
  },
  ration: {
    category: { value: "BPL", confidence: 0.88 },
    income: { value: "120000", confidence: 0.70 },
  },
  income: {
    income: { value: "150000", confidence: 0.85 },
  },
  caste: {
    casteCategory: { value: "OBC", confidence: 0.92 },
  },
};

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

const Verify = () => {
  const navigate = useNavigate();
  const { profile, setProfile, syncProfileToServer } = useAuth();
  const [fields, setFields] = useState<Record<string, { value: string; confidence: number }>>({});
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Simulate OCR processing
    const timer = setTimeout(() => {
      const uploadedDocs: string[] = JSON.parse(localStorage.getItem("fms_uploaded_docs") || "[]");
      const merged: Record<string, { value: string; confidence: number }> = {};

      // Merge OCR data from all uploaded docs (later ones override earlier with higher confidence)
      for (const docType of uploadedDocs) {
        const data = mockOcrData[docType] || {};
        for (const [key, val] of Object.entries(data)) {
          if (!merged[key] || val.confidence > merged[key].confidence) {
            merged[key] = val;
          }
        }
      }

      // If no docs uploaded, provide empty fields
      if (Object.keys(merged).length === 0) {
        setFields({
          name: { value: "", confidence: 0 },
          dob: { value: "", confidence: 0 },
          gender: { value: "", confidence: 0 },
          state: { value: "", confidence: 0 },
        });
      } else {
        setFields(merged);
      }
      setProcessing(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const updateField = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: { value, confidence: 1 } }));
  };

  const handleConfirm = () => {
    const updates: Record<string, any> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (key === "income") {
        updates[key] = val.value ? parseInt(val.value) : null;
      } else {
        updates[key] = val.value;
      }
    }
    setProfile(prev => ({ ...prev, ...updates }));
    // Sync to server
    syncProfileToServer();
    navigate("/questions");
    toast.success("Profile verified! Let's refine your eligibility.");
  };

  const FIELD_LABELS: Record<string, string> = {
    name: "Full Name", dob: "Date of Birth", gender: "Gender", address: "Address",
    state: "State", district: "District", aadhaarNumber: "Aadhaar Number",
    panNumber: "PAN Number", income: "Annual Income (₹)", category: "Category (APL/BPL/AAY)",
    casteCategory: "Caste Category",
  };

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <h2 className="text-xl font-semibold">Processing Documents...</h2>
          <p className="mt-2 text-muted-foreground">Extracting information using OCR</p>
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
          <p className="mb-6 text-muted-foreground">
            Review the details extracted from your documents. Edit any field that looks incorrect.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(fields).map(([key, { value, confidence }]) => (
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
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APL">APL</SelectItem>
                        <SelectItem value="BPL">BPL</SelectItem>
                        <SelectItem value="AAY">AAY</SelectItem>
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
                  ) : (
                    <Input
                      id={key}
                      type={key === "income" ? "number" : key === "dob" ? "date" : "text"}
                      value={value}
                      onChange={e => updateField(key, e.target.value)}
                      className={confidence > 0 && confidence < 0.75 ? "border-warning" : ""}
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
