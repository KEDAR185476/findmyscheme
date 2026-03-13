import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Camera, CheckCircle2, Loader2, FileUp, AlertTriangle } from "lucide-react";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploadCardProps {
  type: string;
  label: string;
  icon: React.ElementType;
  required: boolean;
  status: "idle" | "processing" | "done" | "error";
  progress: number;
  fieldCount: number;
  avgConfidence?: number;
  fileName?: string;
  disabled: boolean;
  onFileSelect: (file: File) => void;
}

export const DocumentUploadCard = ({
  type,
  label,
  icon: Icon,
  required,
  status,
  progress: ocrProgress,
  fieldCount,
  fileName,
  disabled,
  onFileSelect,
}: DocumentUploadCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  const isProcessing = status === "processing";
  const isDone = status === "done";
  const isError = status === "error";

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported format. Please upload JPG, PNG, or PDF.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  }, []);

  const showPreview = useCallback((file: File) => {
    setPreviewFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(undefined);
    }
    setPreviewOpen(true);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const error = validateFile(file);
      if (error) {
        // Use toast from parent context
        import("sonner").then(({ toast }) => toast.error(error));
        return;
      }
      showPreview(file);
    },
    [validateFile, showPreview]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleConfirmPreview = useCallback(() => {
    if (previewFile) {
      onFileSelect(previewFile);
      setPreviewOpen(false);
      setPreviewFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(undefined);
    }
  }, [previewFile, previewUrl, onFileSelect]);

  return (
    <>
      <Card
        className={`transition-all ${
          isDone
            ? "border-success/50 bg-success/5"
            : isError
            ? "border-destructive/50 bg-destructive/5"
            : dragActive
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-4">
          {/* Drop zone overlay */}
          {dragActive && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/10">
              <div className="text-center">
                <FileUp className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-1 text-sm font-medium text-primary">Drop file here</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                isDone
                  ? "bg-success/10"
                  : isProcessing
                  ? "bg-primary/10"
                  : isError
                  ? "bg-destructive/10"
                  : "bg-muted"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : isDone ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : isError ? (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              ) : (
                <Icon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {required && (
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                    Required
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">JPG, PNG, PDF</span>
              </div>
              {isProcessing && (
                <div className="mt-1.5">
                  <Progress value={ocrProgress} className="h-1.5" />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Extracting text... {ocrProgress}%
                  </p>
                </div>
              )}
              {isDone && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {fieldCount} field{fieldCount !== 1 ? "s" : ""} extracted from {fileName}
                </p>
              )}
              {isError && (
                <p className="mt-0.5 text-xs text-destructive">Processing failed — try again</p>
              )}
              {!isProcessing && !isDone && !isError && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Drag & drop or click to upload
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  // Reset input so same file can be re-selected
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant={isDone ? "outline" : "default"}
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || disabled}
              >
                <Upload className="mr-1 h-4 w-4" />
                {isDone ? "Replace" : "Upload"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isProcessing || disabled}
                onClick={() => {
                  const input = fileInputRef.current;
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
          </div>
        </CardContent>
      </Card>

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
        docLabel={label}
        onConfirm={handleConfirmPreview}
        previewUrl={previewUrl}
      />
    </>
  );
};
