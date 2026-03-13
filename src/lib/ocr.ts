import { createWorker, OEM } from "tesseract.js";
import { supabase } from "@/integrations/supabase/client";
import { preprocessImage } from "./image-preprocess";

export interface OcrResult {
  rawText: string;
  fields: Record<string, { value: string; confidence: number }>;
}

/**
 * Step 2+3: Preprocess image and extract ALL text using Tesseract.js
 * Supports English, Hindi, and Tamil for Indian government documents.
 * Does NOT attempt field parsing — just raw text extraction.
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Step 2: Image preprocessing for better OCR accuracy
  if (onProgress) onProgress(2);

  let processedInput: File | Blob;
  try {
    const preprocessed = await preprocessImage(file);
    processedInput = new File([preprocessed], "processed.png", { type: "image/png" });
  } catch (err) {
    console.warn("Image preprocessing failed, using original:", err);
    processedInput = file;
  }

  if (onProgress) onProgress(5);

  // Step 3: Full OCR text extraction with multilingual support (eng + hin + tam)
  const worker = await createWorker("eng+hin+tam", OEM.DEFAULT, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        // Map progress: 5% preprocessing done, 5-95% OCR, 95-100% AI parsing
        onProgress(5 + Math.round(m.progress * 90));
      }
    },
  });

  const {
    data: { text },
  } = await worker.recognize(processedInput);
  await worker.terminate();

  return text;
}

/**
 * Step 6: Use AI to precisely extract structured fields from raw OCR text.
 * Sends the full OCR output to the extract-fields edge function for
 * intelligent label cleaning, multi-line address handling, and
 * multilingual deduplication.
 */
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

/**
 * Minimal regex fallback if AI is unavailable.
 * Handles basic field extraction for common Indian documents.
 */
function fallbackParse(
  rawText: string,
  docType: string
): Record<string, { value: string; confidence: number }> {
  const text = rawText.replace(/\n+/g, " ").replace(/\s+/g, " ");
  const fields: Record<string, { value: string; confidence: number }> = {};

  // Name extraction — stop at next label or line boundary
  const nameMatch = text.match(
    /(?:Name(?:\s+of\s+(?:Applicant|Holder|Card\s*Holder))?|नाम|பெயர்)\s*[:\-]?\s*([A-Za-z\s]{3,40}?)(?=\s*(?:Date|DOB|Gender|Father|Mother|S\/O|D\/O|W\/O|Address|जन्म|लिंग|पिता|$))/i
  );
  if (nameMatch) {
    const words = nameMatch[1].trim().split(/\s+/).slice(0, 4);
    fields.name = { value: words.join(" "), confidence: 0.5 };
  }

  // DOB
  const dobMatch = text.match(
    /(?:DOB|Date\s+of\s+Birth|जन्म\s*तिथि|பிறந்த\s*தேதி|Year\s+of\s+Birth)\s*[:\-]?\s*(\d{1,2}[\/.\\-]\d{1,2}[\/.\\-]\d{2,4})/i
  );
  if (dobMatch) {
    const parts = dobMatch[1].split(/[\/.\\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? `20${parseInt(y) > 50 ? "19" : "20"}${y}`.slice(-4) : y;
      fields.dob = {
        value: `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        confidence: 0.45,
      };
    }
  }

  // Gender
  const genderMatch = text.match(/(?:Gender|Sex|लिंग|பாலினம்)\s*[:\-]?\s*(Male|Female|Other|पुरुष|महिला|ஆண்|பெண்)/i);
  if (genderMatch) {
    const raw = genderMatch[1].toLowerCase();
    const gender = raw.includes("female") || raw.includes("महिला") || raw.includes("பெண்")
      ? "female"
      : raw.includes("male") || raw.includes("पुरुष") || raw.includes("ஆண்")
      ? "male"
      : "other";
    fields.gender = { value: gender, confidence: 0.5 };
  }

  // Aadhaar number
  if (docType === "aadhaar") {
    const aadhaarMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (aadhaarMatch) {
      fields.aadhaarNumber = {
        value: aadhaarMatch[1].replace(/\s/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3"),
        confidence: 0.6,
      };
    }
  }

  // PAN number
  if (docType === "pan") {
    const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
    if (panMatch) {
      fields.panNumber = { value: panMatch[1], confidence: 0.6 };
    }
  }

  return fields;
}
