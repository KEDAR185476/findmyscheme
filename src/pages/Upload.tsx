import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, FileText, CreditCard, FileCheck, ArrowRight, SkipForward, Loader2, Lock } from "lucide-react";
import { DocumentUpload } from "@/types";
import { extractTextFromImage, parseExtractedText } from "@/lib/ocr";
import { pdfToImage } from "@/lib/pdf-to-image";
import { DocumentUploadCard } from "@/components/DocumentUploadCard";
import { toast } from "sonner";

const DOC_TYPES: { type: DocumentUpload["type"]; label: string; icon: typeof FileText; required: boolean }[] = [
  { type: "aadhaar", label: "Aadhaar Card", icon: Shield, required: true },
  { type: "income", label: "Income Certificate", icon: FileCheck, required: true },
  { type: "pan", label: "PAN Card", icon: CreditCard, required: false },
  { type: "ration", label: "Ration Card", icon: FileText, required: false },
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
  const [documents, setDocuments] = useState<Record<string, DocState>>({});

  const uploadedCount = Object.values(documents).filter(d => d.status === "done").length;
  const processingCount = Object.values(documents).filter(d => d.status === "processing").length;
  const progress = (uploadedCount / DOC_TYPES.length) * 100;

  const handleFileSelect = async (type: string, file: File) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { file, status: "processing", progress: 0, fields: {} },
    }));

    try {
      let imageInput: File | Blob = file;

      // Convert PDF to image first
      if (file.type === "application/pdf") {
        setDocuments(prev => ({
          ...prev,
          [type]: { ...prev[type], progress: 5 },
        }));
        const { blob } = await pdfToImage(file);
        imageInput = blob;
      }

      const rawText = await extractTextFromImage(
        imageInput instanceof File ? imageInput : new File([imageInput], "page.png", { type: "image/png" }),
        (p) => {
          setDocuments(prev => ({
            ...prev,
            [type]: { ...prev[type], progress: file.type === "application/pdf" ? 5 + Math.round(p * 0.95) : p },
          }));
        }
      );

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
          <p className="mb-4 text-muted-foreground">
            Upload your identity documents as images (JPG, PNG) or PDFs. All processing happens securely in your browser.
          </p>

          {/* Security badge */}
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-xs text-primary">
              <strong>End-to-end secure:</strong> Documents are processed locally using on-device OCR. No files leave your browser.
            </p>
          </div>

          <Progress value={progress} className="mb-8 h-2" />

          <div className="space-y-4">
            {DOC_TYPES.map((doc, i) => {
              const state = documents[doc.type];
              return (
                <motion.div
                  key={doc.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <DocumentUploadCard
                    type={doc.type}
                    label={doc.label}
                    icon={doc.icon}
                    required={doc.required}
                    status={state?.status || "idle"}
                    progress={state?.progress || 0}
                    fieldCount={state?.fields ? Object.keys(state.fields).length : 0}
                    fileName={state?.file?.name}
                    disabled={processingCount > 0 && state?.status !== "processing"}
                    onFileSelect={(file) => handleFileSelect(doc.type, file)}
                  />
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
