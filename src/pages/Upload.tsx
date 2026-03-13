import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, FileText, CreditCard, FileCheck, ArrowRight, SkipForward, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { DocumentUpload } from "@/types";
import { extractTextFromImage, parseExtractedText } from "@/lib/ocr";
import { pdfToImage } from "@/lib/pdf-to-image";
import { DocumentUploadCard } from "@/components/DocumentUploadCard";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/PageTransition";
import { AppHeader } from "@/components/AppHeader";
import { useTranslation } from "react-i18next";

const UploadPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const DOC_TYPES: { type: DocumentUpload["type"]; labelKey: string; icon: typeof FileText; required: boolean }[] = [
    { type: "aadhaar", labelKey: "doc_aadhaar", icon: Shield, required: true },
    { type: "income", labelKey: "doc_income", icon: FileCheck, required: true },
    { type: "pan", labelKey: "doc_pan", icon: CreditCard, required: false },
    { type: "ration", labelKey: "doc_ration", icon: FileText, required: false },
    { type: "caste", labelKey: "doc_caste", icon: FileCheck, required: false },
  ];

  interface DocState {
    file: File | null;
    status: "idle" | "processing" | "done" | "error";
    progress: number;
    fields: Record<string, { value: string; confidence: number }>;
    avgConfidence: number;
  }

  const [documents, setDocuments] = useState<Record<string, DocState>>({});

  const uploadedCount = Object.values(documents).filter(d => d.status === "done").length;
  const processingCount = Object.values(documents).filter(d => d.status === "processing").length;
  const progress = (uploadedCount / DOC_TYPES.length) * 100;

  const handleFileSelect = async (type: string, file: File) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { file, status: "processing", progress: 0, fields: {}, avgConfidence: 0 },
    }));

    try {
      let imageInput: File | Blob = file;
      if (file.type === "application/pdf") {
        setDocuments(prev => ({ ...prev, [type]: { ...prev[type], progress: 5 } }));
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

      const fields = await parseExtractedText(rawText, type);
      const fieldCount = Object.keys(fields).length;
      const confidences = Object.values(fields).map(f => f.confidence);
      const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

      setDocuments(prev => ({ ...prev, [type]: { file, status: "done", progress: 100, fields, avgConfidence } }));

      const docLabel = t(DOC_TYPES.find(d => d.type === type)?.labelKey || type);
      if (avgConfidence < 0.7) {
        toast.warning(`${docLabel}: ${fieldCount} field${fieldCount !== 1 ? "s" : ""} extracted with low confidence.`);
      } else {
        toast.success(`${docLabel}: ${fieldCount} field${fieldCount !== 1 ? "s" : ""} extracted`);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setDocuments(prev => ({ ...prev, [type]: { file, status: "error", progress: 0, fields: {}, avgConfidence: 0 } }));
      toast.error(`Failed to process ${t(DOC_TYPES.find(d => d.type === type)?.labelKey || type)}`);
    }
  };

  const handleContinue = () => {
    if (uploadedCount === 0) { toast.error(t("upload_at_least_one")); return; }
    const allFields: Record<string, { value: string; confidence: number }> = {};
    for (const [, doc] of Object.entries(documents)) {
      if (doc.status === "done") {
        for (const [key, val] of Object.entries(doc.fields)) {
          if (!allFields[key] || val.confidence > allFields[key].confidence) allFields[key] = val;
        }
      }
    }
    localStorage.setItem("fms_ocr_fields", JSON.stringify(allFields));
    const uploadedTypes = Object.entries(documents).filter(([, v]) => v.status === "done").map(([k]) => k);
    localStorage.setItem("fms_uploaded_docs", JSON.stringify(uploadedTypes));
    navigate("/verify");
  };

  return (
    <PageTransition>
      <AppHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-medium text-muted-foreground">{uploadedCount}/{DOC_TYPES.length}</span>
          </div>
        </div>
      </AppHeader>

      <div className="container max-w-2xl py-8 md:py-12">
        <StaggerContainer>
          <StaggerItem>
            <div className="mb-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("upload_step")}</p>
            </div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">{t("upload_title")}</h1>
            <p className="mb-5 text-muted-foreground leading-relaxed">{t("upload_desc")}</p>
          </StaggerItem>

          <StaggerItem>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-5 py-3">
              <Lock className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-primary/90">
                <strong>{t("upload_secure")}</strong> {t("upload_secure_desc")}
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mb-8 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-2 rounded-full gradient-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
            </div>
          </StaggerItem>

          <div className="space-y-3">
            {DOC_TYPES.map((doc) => {
              const state = documents[doc.type];
              return (
                <StaggerItem key={doc.type}>
                  <DocumentUploadCard
                    type={doc.type}
                    label={t(doc.labelKey)}
                    icon={doc.icon}
                    required={doc.required}
                    status={state?.status || "idle"}
                    progress={state?.progress || 0}
                    fieldCount={state?.fields ? Object.keys(state.fields).length : 0}
                    avgConfidence={state?.avgConfidence}
                    fileName={state?.file?.name}
                    disabled={processingCount > 0 && state?.status !== "processing"}
                    onFileSelect={(file) => handleFileSelect(doc.type, file)}
                  />
                </StaggerItem>
              );
            })}
          </div>

          <StaggerItem>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="ghost" className="text-muted-foreground" onClick={() => { navigate("/verify"); toast.info(t("skipped_upload")); }}>
                <SkipForward className="mr-2 h-4 w-4" /> {t("skip")}
              </Button>
              <Button onClick={handleContinue} disabled={uploadedCount === 0 || processingCount > 0} className="h-11 rounded-lg px-6 shadow-sm">
                {processingCount > 0 ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("processing")}</>
                ) : (
                  <>{t("continue_verify")} <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default UploadPage;