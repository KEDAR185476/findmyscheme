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

    const systemPrompt = `You are a precise document data extractor for Indian government identity documents. 
Your job is to extract ONLY the specific fields from raw OCR text. Be extremely precise:

RULES:
1. For "name" — extract ONLY the person's full name. Do NOT include titles, father's name, addresses, or any other text.
2. For "dob" — extract ONLY the date of birth in YYYY-MM-DD format. If only year is available, use YYYY-01-01.
3. For "gender" — extract ONLY: "male", "female", or "other". Normalize Hindi text too.
4. For "aadhaarNumber" — extract ONLY the 12-digit Aadhaar number, formatted as XXXX-XXXX-XXXX.
5. For "panNumber" — extract ONLY the 10-character PAN (e.g., ABCDE1234F).
6. For "address" — extract ONLY the residential address.
7. For "state" — extract ONLY the Indian state/UT name.
8. For "income" — extract ONLY the numeric annual income (no currency symbols or commas).
9. For "category" — extract ONLY: APL, BPL, or AAY.
10. For "casteCategory" — extract ONLY: General, OBC, SC, or ST.

If a field is not clearly present in the text, do NOT guess or fabricate it. Omit it entirely.

Return ONLY a valid JSON object where keys are field names and values are objects with "value" (string) and "confidence" (number 0-1).
Example: {"name": {"value": "Raj Kumar", "confidence": 0.95}}

Do NOT include any explanation, markdown, or extra text. Return ONLY the JSON object.`;

    const userPrompt = `Document type: ${docType || "unknown"}

Raw OCR text:
"""
${rawText.substring(0, 3000)}
"""

Extract all identifiable fields from this text precisely. Remember: each field should contain ONLY its specific value, nothing else.`;

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
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // Parse the JSON from the AI response, stripping any markdown fences
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let fields: Record<string, { value: string; confidence: number }>;

    try {
      fields = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      fields = {};
    }

    // Compute age from DOB if present
    if (fields.dob?.value) {
      try {
        const dob = new Date(fields.dob.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age > 0 && age < 150) {
          fields.age = { value: String(age), confidence: fields.dob.confidence };
        }
      } catch {}
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
