import { createWorker, OEM } from "tesseract.js";
import { supabase } from "@/integrations/supabase/client";

export interface OcrResult {
  rawText: string;
  fields: Record<string, { value: string; confidence: number }>;
}

// Extract text from an image file using Tesseract.js
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const worker = await createWorker("eng+hin", OEM.DEFAULT, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const {
    data: { text },
  } = await worker.recognize(file);
  await worker.terminate();
  return text;
}

// Use AI to precisely extract fields from raw OCR text
export async function parseExtractedText(
  rawText: string,
  docType: string
): Promise<Record<string, { value: string; confidence: number }>> {
  try {
    const { data, error } = await supabase.functions.invoke("extract-fields", {
      body: { rawText, docType },
    });

    if (error) {
      console.error("AI extraction error:", error);
      return fallbackParse(rawText, docType);
    }

    return data?.fields || {};
  } catch (err) {
    console.error("AI extraction failed, using fallback:", err);
    return fallbackParse(rawText, docType);
  }
}

// Minimal regex fallback if AI is unavailable
function fallbackParse(
  rawText: string,
  docType: string
): Record<string, { value: string; confidence: number }> {
  const text = rawText.replace(/\n+/g, " ").replace(/\s+/g, " ");
  const fields: Record<string, { value: string; confidence: number }> = {};

  const nameMatch = text.match(/(?:Name|नाम)\s*[:\-]?\s*([A-Za-z\s]{3,40})/i);
  if (nameMatch) {
    // Take only the first 2-3 words as the name
    const words = nameMatch[1].trim().split(/\s+/).slice(0, 4);
    fields.name = { value: words.join(" "), confidence: 0.6 };
  }

  const dobMatch = text.match(
    /(?:DOB|Date of Birth|जन्म\s*तिथि|Year of Birth)\s*[:\-]?\s*(\d{1,2}[\/.\\-]\d{1,2}[\/.\\-]\d{2,4})/i
  );
  if (dobMatch) {
    const parts = dobMatch[1].split(/[\/.\\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? `19${y}` : y;
      fields.dob = { value: `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, confidence: 0.5 };
    }
  }

  if (docType === "aadhaar") {
    const aadhaarMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (aadhaarMatch) {
      fields.aadhaarNumber = {
        value: aadhaarMatch[1].replace(/\s/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3"),
        confidence: 0.7,
      };
    }
  }

  if (docType === "pan") {
    const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
    if (panMatch) {
      fields.panNumber = { value: panMatch[1], confidence: 0.7 };
    }
  }

  return fields;
}
