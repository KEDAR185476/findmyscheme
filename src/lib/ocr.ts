import { createWorker, OEM } from "tesseract.js";

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

// Parse extracted text based on document type
export function parseExtractedText(
  rawText: string,
  docType: string
): Record<string, { value: string; confidence: number }> {
  const text = rawText.replace(/\n+/g, " ").replace(/\s+/g, " ");
  const fields: Record<string, { value: string; confidence: number }> = {};

  // Common name patterns
  const nameMatch = text.match(/(?:Name|नाम)\s*[:\-]?\s*([A-Za-z\s]{3,40})/i);
  if (nameMatch) {
    fields.name = { value: nameMatch[1].trim(), confidence: 0.8 };
  }

  // DOB patterns
  const dobMatch = text.match(
    /(?:DOB|Date of Birth|जन्म\s*तिथि|Year of Birth)\s*[:\-]?\s*(\d{1,2}[\/.\\-]\d{1,2}[\/.\\-]\d{2,4})/i
  );
  if (dobMatch) {
    const raw = dobMatch[1];
    // Try to normalize to YYYY-MM-DD
    const parts = raw.split(/[\/.\\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? `19${y}` : y;
      fields.dob = { value: `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, confidence: 0.75 };
    }
  }

  // Gender
  const genderMatch = text.match(/(?:Gender|लिंग|Sex)\s*[:\-]?\s*(Male|Female|Other|पुरुष|महिला|MALE|FEMALE)/i);
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    const mapped = g.includes("male") || g.includes("पुरुष") ? "male" : g.includes("female") || g.includes("महिला") ? "female" : "other";
    fields.gender = { value: mapped, confidence: 0.9 };
  }

  // Aadhaar number
  if (docType === "aadhaar") {
    const aadhaarMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (aadhaarMatch) {
      fields.aadhaarNumber = {
        value: aadhaarMatch[1].replace(/\s/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3"),
        confidence: 0.85,
      };
    }
  }

  // PAN number
  if (docType === "pan") {
    const panMatch = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
    if (panMatch) {
      fields.panNumber = { value: panMatch[1], confidence: 0.9 };
    }
  }

  // Address — grab a long string after "Address" keyword
  const addressMatch = text.match(/(?:Address|पता)\s*[:\-]?\s*(.{10,80})/i);
  if (addressMatch) {
    fields.address = { value: addressMatch[1].trim().replace(/\s+/g, " "), confidence: 0.6 };
  }

  // State detection from known states
  const stateList = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
  ];
  for (const state of stateList) {
    if (text.toLowerCase().includes(state.toLowerCase())) {
      fields.state = { value: state, confidence: 0.7 };
      break;
    }
  }

  // Income
  if (docType === "income" || docType === "ration") {
    const incomeMatch = text.match(/(?:Income|आय|Annual Income)\s*[:\-]?\s*(?:Rs\.?|₹)?\s*([\d,]+)/i);
    if (incomeMatch) {
      fields.income = { value: incomeMatch[1].replace(/,/g, ""), confidence: 0.7 };
    }
  }

  // Category (BPL/APL/AAY)
  if (docType === "ration") {
    const catMatch = text.match(/\b(APL|BPL|AAY)\b/i);
    if (catMatch) {
      fields.category = { value: catMatch[1].toUpperCase(), confidence: 0.85 };
    }
  }

  // Caste category
  if (docType === "caste") {
    const casteMatch = text.match(/\b(General|OBC|SC|ST|Other Backward Class|Scheduled Caste|Scheduled Tribe)\b/i);
    if (casteMatch) {
      const raw = casteMatch[1];
      const mapped = raw.match(/OBC|Other Backward/i) ? "OBC" : raw.match(/SC|Scheduled Caste/i) ? "SC" : raw.match(/ST|Scheduled Tribe/i) ? "ST" : "General";
      fields.casteCategory = { value: mapped, confidence: 0.85 };
    }
  }

  return fields;
}
