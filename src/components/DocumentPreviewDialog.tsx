import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Loader2 } from "lucide-react";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  docLabel: string;
  onConfirm: () => void;
  previewUrl?: string;
}

export const DocumentPreviewDialog = ({
  open,
  onOpenChange,
  file,
  docLabel,
  onConfirm,
  previewUrl: externalPreviewUrl,
}: DocumentPreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isPdf = file?.type === "application/pdf";

  useEffect(() => {
    if (!file || !open) return;
    if (externalPreviewUrl) {
      setPreviewUrl(externalPreviewUrl);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file, open, externalPreviewUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Preview: {docLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {previewUrl ? (
            <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
              <img
                src={previewUrl}
                alt={`Preview of ${docLabel}`}
                className="mx-auto max-h-[400px] w-auto object-contain"
              />
            </div>
          ) : isPdf ? (
            <div className="flex h-48 w-full items-center justify-center rounded-lg border bg-muted">
              <div className="text-center text-muted-foreground">
                <Shield className="mx-auto mb-2 h-10 w-10" />
                <p className="text-sm font-medium">PDF Document</p>
                <p className="text-xs">{file?.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-lg border bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="w-full rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Your document is processed locally in your browser. No files are sent to any server.</span>
            </div>
          </div>

          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(1)} KB · {file.type.split("/")[1].toUpperCase()}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Process Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
