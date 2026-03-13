import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Upload, Camera, CheckCircle2, FileText, CreditCard, FileCheck, ArrowRight, SkipForward, Loader2 } from "lucide-react";
import { DocumentUpload } from "@/types";
import { extractTextFromImage, parseExtractedText } from "@/lib/ocr";
import { toast } from "sonner";

const DOC_TYPES: { type: DocumentUpload["type"]; label: string; icon: typeof FileText; required: boolean }[] = [
  { type: "aadhaar", label: "Aadhaar Card", icon: Shield, required: true },
  { type: "pan", label: "PAN Card", icon: CreditCard, required: false },
  { type: "ration", label: "Ration Card", icon: FileText, required: false },
  { type: "income", label: "Income Certificate", icon: FileCheck, required: false },
  { type: "caste", label: "Caste Certificate", icon: FileCheck, required: false },
];

interface DocState {
  file: File | null;
  status: "idle" | "processing" | "done" | "error";
  progress: number;
  fields: Record<string, { value: string; confidence: number }>;
}

const UploadPage = () => {
  const navigate = useNavigate();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [documents, setDocuments] = useState<Record<string, DocState>>({});

  const uploadedCount = Object.values(documents).filter(d => d.status === "done").length;
  const processingCount = Object.values(documents).filter(d => d.status === "processing").length;
  const progress = (uploadedCount / DOC_TYPES.length) * 100;

  const handleFileSelect = async (type: string, file: File) => {
    // Only accept images for OCR
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG) for OCR extraction");
      return;
    }

    setDocuments(prev => ({
      ...prev,
      [type]: { file, status: "processing", progress: 0, fields: {} },
    }));

    try {
      const rawText = await extractTextFromImage(file, (p) => {
        setDocuments(prev => ({
          ...prev,
          [type]: { ...prev[type], progress: p },
        }));
      });

      const fields = parseExtractedText(rawText, type);
      const fieldCount = Object.keys(fields).length;

      setDocuments(prev => ({
        ...prev,
        [type]: { file, status: "done", progress: 100, fields },
      }));

      toast.success(
        `${DOC_TYPES.find(d => d.type === type)?.label}: ${fieldCount} field${fieldCount !== 1 ? "s" : ""} extracted`
      );
    } catch (err) {
      console.error("OCR error:", err);
      setDocuments(prev => ({
        ...prev,
        [type]: { file, status: "error", progress: 0, fields: {} },
      }));
      toast.error(`Failed to process ${DOC_TYPES.find(d => d.type === type)?.label}`);
    }
  };

  const handleContinue = () => {
    if (uploadedCount === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    // Merge all extracted fields and store for Verify page
    const allFields: Record<string, { value: string; confidence: number }> = {};
    for (const [, doc] of Object.entries(documents)) {
      if (doc.status === "done") {
        for (const [key, val] of Object.entries(doc.fields)) {
          if (!allFields[key] || val.confidence > allFields[key].confidence) {
            allFields[key] = val;
          }
        }
      }
    }

    localStorage.setItem("fms_ocr_fields", JSON.stringify(allFields));
    const uploadedTypes = Object.entries(documents)
      .filter(([, v]) => v.status === "done")
      .map(([k]) => k);
    localStorage.setItem("fms_uploaded_docs", JSON.stringify(uploadedTypes));
    navigate("/verify");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">FindMyScheme</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{uploadedCount}/{DOC_TYPES.length} processed</span>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 text-2xl font-bold">Upload Your Documents</h1>
          <p className="mb-6 text-muted-foreground">
            Upload images of your identity documents. Tesseract OCR will extract details automatically.
          </p>

          <Progress value={progress} className="mb-8 h-2" />

          <div className="space-y-4">
            {DOC_TYPES.map((doc, i) => {
              const state = documents[doc.type];
              const isProcessing = state?.status === "processing";
              const isDone = state?.status === "done";
              const isError = state?.status === "error";

              return (
                <motion.div
                  key={doc.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`transition-all ${isDone ? "border-success/50 bg-success/5" : isError ? "border-destructive/50 bg-destructive/5" : ""}`}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${isDone ? "bg-success/10" : isProcessing ? "bg-primary/10" : "bg-muted"}`}>
                        {isProcessing ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : isDone ? (
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
                        {isProcessing && (
                          <div className="mt-1.5">
                            <Progress value={state.progress} className="h-1.5" />
                            <p className="mt-0.5 text-xs text-muted-foreground">Processing... {state.progress}%</p>
                          </div>
                        )}
                        {isDone && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {Object.keys(state.fields).length} fields extracted from {state.file?.name}
                          </p>
                        )}
                        {isError && (
                          <p className="mt-0.5 text-xs text-destructive">Processing failed — try again</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={el => { fileInputRefs.current[doc.type] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(doc.type, file);
                          }}
                        />
                        <Button
                          size="sm"
                          variant={isDone ? "outline" : "default"}
                          onClick={() => fileInputRefs.current[doc.type]?.click()}
                          disabled={isProcessing}
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          {isDone ? "Replace" : "Upload"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
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
            <Button onClick={handleContinue} disabled={uploadedCount === 0 || processingCount > 0}>
              {processingCount > 0 ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>Continue to Verification <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UploadPage;
