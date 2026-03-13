import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rawText, docType } = await req.json();

    if (!rawText || typeof rawText !== "string") {
      return new Response(JSON.stringify({ error: "rawText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a world-class document data extractor specializing in Indian government identity documents (Aadhaar, PAN, Income Certificate, Ration Card, Caste Certificate, Student ID).

You receive raw OCR text extracted from a document photo. The text may be messy, multilingual (English, Hindi, Tamil), and contain noise from image processing.

YOUR TASK: Extract ONLY the specific field VALUES. Follow these rules strictly:

## CRITICAL RULES

### 1. NAME EXTRACTION
- Extract ONLY the person's full name — nothing else.
- Remove ALL labels: "Name", "Name of Applicant", "Applicant Name", "नाम", "பெயர்", etc.
- Do NOT include father's name, spouse's name, titles (Mr./Mrs./Shri), or suffixes.
- If multiple languages show the same name (e.g., English + Hindi + Tamil), use the ENGLISH version only.
- Example: OCR says "Name of Applicant: Siva Rama Pandian" → extract "Siva Rama Pandian"

### 2. DATE OF BIRTH
- Format as YYYY-MM-DD always.
- Parse DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY correctly (Indian format = day first).
- If only year is available, use YYYY-01-01.

### 3. GENDER
- Normalize to exactly: "male", "female", or "other"
- Handle Hindi (पुरुष/महिला) and Tamil (ஆண்/பெண்) equivalents.

### 4. ADDRESS — MULTI-LINE HANDLING
- Combine ALL address lines into a single comma-separated string.
- Include house number, street, locality, city, state, PIN code.
- Example: OCR has address across 4 lines → combine as "12 Gandhi Street, Madurai, Tamil Nadu, 625001"

### 5. STATE
- Extract the Indian state or Union Territory name.
- If found in address, extract it separately too.
- Use standard names: "Tamil Nadu" not "TN", "Uttar Pradesh" not "UP".

### 6. DISTRICT
- Extract district/city name from address if present.

### 7. AADHAAR NUMBER
- 12-digit number formatted as XXXX-XXXX-XXXX.

### 8. PAN NUMBER
- 10-character alphanumeric code (e.g., ABCDE1234F).

### 9. INCOME
- Extract numeric annual income value only — no currency symbols, commas, or text.
- "Rs. 1,80,000" → "180000"
- "₹2,50,000 per annum" → "250000"

### 10. INCOME CATEGORY
- Extract: "APL", "BPL", or "AAY" only.

### 11. CASTE CATEGORY
- Extract: "General", "OBC", "SC", or "ST" only.

## MULTILINGUAL DEDUPLICATION
Indian documents often print the same information in 2-3 languages.
- ALWAYS prefer the English version of any field.
- Do NOT create duplicate fields from Hindi/Tamil translations.
- If the same name appears in English and Hindi, use English only.

## FRONT + BACK DOCUMENT HANDLING
When OCR text contains data from both sides of a document (e.g., front has name/DOB, back has address):
- Extract fields from ALL sections.
- Merge them into one unified output.

## OUTPUT FORMAT
Return ONLY a valid JSON object. Keys are field names, values are objects with:
- "value": the extracted string
- "confidence": a number 0-1 indicating extraction reliability

Example: {"name": {"value": "Siva Rama Pandian", "confidence": 0.95}, "dob": {"value": "2003-05-12", "confidence": 0.9}}

If a field is NOT clearly present, OMIT it entirely. Do NOT guess or fabricate.
Do NOT include any explanation, markdown formatting, or extra text. ONLY the JSON object.`;

    const userPrompt = `Document type: ${docType || "unknown"}

Raw OCR text (complete extraction from document image):
"""
${rawText.substring(0, 4000)}
"""

Extract all identifiable fields precisely. Remember:
- Each field must contain ONLY its specific value, no labels
- Prefer English text over Hindi/Tamil duplicates
- Combine multi-line addresses into one string
- Parse Indian date format (DD/MM/YYYY) correctly`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.05,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON, stripping any markdown fences
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let fields: Record<string, { value: string; confidence: number }>;

    try {
      fields = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      fields = {};
    }

    // Post-processing: compute age from DOB
    if (fields.dob?.value) {
      try {
        const dob = new Date(fields.dob.value);
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          if (age > 0 && age < 150) {
            fields.age = { value: String(age), confidence: fields.dob.confidence };
          }
        }
      } catch { /* ignore invalid dates */ }
    }

    // Post-processing: extract state from address if not already present
    if (fields.address?.value && !fields.state?.value) {
      const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
        "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
        "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
      ];
      for (const state of indianStates) {
        if (fields.address.value.toLowerCase().includes(state.toLowerCase())) {
          fields.state = { value: state, confidence: fields.address.confidence * 0.9 };
          break;
        }
      }
    }

    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-fields error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
