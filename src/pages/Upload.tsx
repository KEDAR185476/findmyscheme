import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Upload, Camera, CheckCircle2, FileText, CreditCard, FileCheck, ArrowRight, SkipForward } from "lucide-react";
import { DocumentUpload } from "@/types";
import { toast } from "sonner";

const DOC_TYPES: { type: DocumentUpload["type"]; label: string; icon: typeof FileText; required: boolean }[] = [
  { type: "aadhaar", label: "Aadhaar Card", icon: Shield, required: true },
  { type: "pan", label: "PAN Card", icon: CreditCard, required: false },
  { type: "ration", label: "Ration Card", icon: FileText, required: false },
  { type: "income", label: "Income Certificate", icon: FileCheck, required: false },
  { type: "caste", label: "Caste Certificate", icon: FileCheck, required: false },
];

const UploadPage = () => {
  const navigate = useNavigate();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [documents, setDocuments] = useState<Record<string, { file: File | null; status: string }>>({});

  const uploadedCount = Object.values(documents).filter(d => d.file).length;
  const progress = (uploadedCount / DOC_TYPES.length) * 100;

  const handleFileSelect = (type: string, file: File) => {
    setDocuments(prev => ({ ...prev, [type]: { file, status: "uploaded" } }));
    toast.success(`${DOC_TYPES.find(d => d.type === type)?.label} uploaded`);
  };

  const handleContinue = () => {
    if (uploadedCount === 0) {
      toast.error("Please upload at least one document");
      return;
    }
    // Store uploaded doc types for verify page
    const uploadedTypes = Object.entries(documents)
      .filter(([, v]) => v.file)
      .map(([k]) => k);
    localStorage.setItem("fms_uploaded_docs", JSON.stringify(uploadedTypes));
    navigate("/verify");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">FindMyScheme</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{uploadedCount}/{DOC_TYPES.length} uploaded</span>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 text-2xl font-bold">Upload Your Documents</h1>
          <p className="mb-6 text-muted-foreground">
            Upload your identity documents. Our OCR will extract details automatically — no manual typing needed.
          </p>

          <Progress value={progress} className="mb-8 h-2" />

          <div className="space-y-4">
            {DOC_TYPES.map((doc, i) => {
              const uploaded = documents[doc.type]?.file;
              return (
                <motion.div
                  key={doc.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`transition-all ${uploaded ? "border-success/50 bg-success/5" : ""}`}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${uploaded ? "bg-success/10" : "bg-muted"}`}>
                        {uploaded ? (
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        ) : (
                          <doc.icon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{doc.label}</span>
                          {doc.required && (
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                              Recommended
                            </span>
                          )}
                        </div>
                        {uploaded && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{uploaded.name}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={el => { fileInputRefs.current[doc.type] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(doc.type, file);
                          }}
                        />
                        <Button
                          size="sm"
                          variant={uploaded ? "outline" : "default"}
                          onClick={() => fileInputRefs.current[doc.type]?.click()}
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          {uploaded ? "Replace" : "Upload"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const input = fileInputRefs.current[doc.type];
                            if (input) {
                              input.setAttribute("capture", "environment");
                              input.click();
                              input.removeAttribute("capture");
                            }
                          }}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => { navigate("/verify"); toast.info("Skipped document upload"); }}>
              <SkipForward className="mr-2 h-4 w-4" /> Skip for Now
            </Button>
            <Button onClick={handleContinue} disabled={uploadedCount === 0}>
              Continue to Verification <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UploadPage;
