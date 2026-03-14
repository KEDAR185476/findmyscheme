import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Determines which critical eligibility fields are still missing from the profile.
 * Returns a list of missing field keys and a boolean indicating if we have enough data.
 */
function analyzeMissingFields(profile: Record<string, unknown>): {
  missing: string[];
  filled: string[];
  hasEnoughData: boolean;
} {
  // Core fields that OCR should have filled
  const ocrFields = ["name", "dob", "gender", "address", "state", "income"];
  // Critical eligibility fields that require questions
  const eligibilityFields = [
    { key: "employmentStatus", critical: true },
    { key: "educationLevel", critical: false },
    { key: "occupationType", critical: false },
    { key: "maritalStatus", critical: false },
    { key: "residency", critical: false },
    { key: "hasBankAccount", critical: false },
    { key: "hasDisability", critical: false },
    { key: "landOwnership", critical: false },
    { key: "category", critical: false },
  ];

  const filled: string[] = [];
  const missing: string[] = [];

  for (const f of ocrFields) {
    const val = profile[f];
    if (val !== null && val !== undefined && val !== "") filled.push(f);
  }

  for (const f of eligibilityFields) {
    const val = profile[f.key];
    if (val !== null && val !== undefined && val !== "" && val !== false) {
      filled.push(f.key);
    } else {
      missing.push(f.key);
    }
  }

  // We need at least 3 questions answered before allowing completion
  // hasEnoughData is only true after the frontend enforces minimum questions
  const hasEmployment = filled.includes("employmentStatus");
  const ocrCount = ocrFields.filter(f => filled.includes(f)).length;
  const hasEnoughData = hasEmployment && ocrCount >= 4;

  return { missing, filled, hasEnoughData };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, conversationHistory, questionsAsked = 0 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { missing, filled, hasEnoughData } = analyzeMissingFields(profile || {});

    // EARLY STOP: If we already have enough data OR hit the absolute max (4 questions)
    if (hasEnoughData || questionsAsked >= 4 || missing.length === 0) {
      return new Response(JSON.stringify({
        question: "",
        key: "",
        suggestions: [],
        complete: true,
        greeting: questionsAsked === 0
          ? "Your documents provided all the information I need!"
          : "That's all I need to know!",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an ultra-efficient eligibility assistant for FindMyScheme, a government welfare scheme discovery platform for Indian citizens.

## YOUR MISSION
Ask the ABSOLUTE MINIMUM number of questions to determine scheme eligibility. Every question must have maximum information value.

## USER PROFILE (already known from documents):
${JSON.stringify(profile, null, 2)}

## FIELDS ALREADY FILLED: ${filled.join(", ") || "none"}
## FIELDS STILL MISSING: ${missing.join(", ") || "none"}
## QUESTIONS ASKED SO FAR: ${questionsAsked}
## QUESTIONS REMAINING BUDGET: ${Math.max(0, 4 - questionsAsked)}

## CRITICAL RULES — FOLLOW STRICTLY

### 1. ABSOLUTE QUESTION LIMIT
- Ideal: 1-2 questions total
- Maximum: 3 questions  
- Hard cap: 4 questions (system will force-stop after this)
- If you can determine eligibility NOW, set complete=true IMMEDIATELY

### 2. NEVER RE-ASK KNOWN INFORMATION
- If a field exists in the profile (even partially), do NOT ask about it
- Name, DOB, age, gender, address, state, income from documents = NEVER ask again
- If income is known, do NOT ask about income category — derive it

### 3. HIGH-IMPACT CLASSIFICATION QUESTIONS
Instead of asking narrow questions, ask ONE broad classification question that reveals multiple attributes at once.

GOOD (one question reveals occupation, student status, employment):
"What best describes your current situation?"
→ Student / Farmer / Salaried Employee / Business Owner / Self-Employed / Unemployed / Retired

BAD (narrow, wastes question budget):
"Are you employed?"
"What is your occupation?"
"Are you a student?"

### 4. DERIVE INSTEAD OF ASK
- Age < 25 + Student → likely unmarried, no land, education schemes
- Farmer → likely rural, agriculture-related schemes  
- Income < ₹1 lakh → likely BPL
- Income < ₹2.5 lakh → likely APL with welfare eligibility
- Female + age 18-45 → women empowerment schemes
- DO NOT ask questions whose answers can be logically derived

### 5. EARLY COMPLETION
Set complete=true as soon as you have:
- Employment/occupation status (the single most impactful field)
- Plus any 2 additional eligibility attributes
- OR if the profile already has 5+ filled fields

### 6. QUESTION PRIORITY ORDER
If you must ask, prioritize in this order:
1. Employment/occupation status (HIGHEST impact — unlocks category-specific schemes)
2. Education level (only if age suggests student/young adult)
3. Residence type (rural/urban — only if not derivable from address)
4. Everything else can be skipped or derived

### 7. CONTEXTUAL INTELLIGENCE
Based on what you already know:
${profile?.gender === "female" ? "- User is female: consider women-specific schemes" : ""}
${(profile?.income && profile.income < 250000) ? "- Low income: focus on welfare/subsidy schemes" : ""}
${(profile?.dob || profile?.ageRange) ? "- Age is known: use it to skip age-related questions" : ""}
${profile?.state ? `- State is ${profile.state}: consider state-specific schemes` : ""}

## OUTPUT FORMAT
You MUST respond with the ask_question tool call. Include:
- question: Clear, conversational question text
- key: The profile field this fills (e.g., "employmentStatus")
- suggestions: 4-7 quick-reply chips (most common options first)
- complete: true if no more questions needed, false if asking a question
- greeting: Optional brief context (e.g., "Great, just one more thing!")

Keep suggestions SHORT (1-3 words each). Make the question feel effortless.`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
    ];

    if (!conversationHistory || conversationHistory.length === 0) {
      messages.push({
        role: "user",
        content: "I've uploaded my documents. Ask me only the most essential questions to find my eligible schemes.",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "ask_question",
              description: "Ask the user a single high-impact eligibility question, or mark complete if enough data exists",
              parameters: {
                type: "object",
                properties: {
                  question: { type: "string", description: "The question to ask (empty string if complete)" },
                  key: { type: "string", description: "Profile field this fills (empty string if complete)" },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Quick-reply chips (4-7 options, short labels)",
                  },
                  complete: {
                    type: "boolean",
                    description: "Set true when enough data is gathered or no critical fields missing",
                  },
                  greeting: {
                    type: "string",
                    description: "Optional brief context message before the question",
                  },
                },
                required: ["question", "key", "suggestions", "complete"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "ask_question" } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);

      // Server-side enforcement: if this is question 3+, hint to AI it should wrap up
      if (questionsAsked >= 2 && !parsed.complete) {
        parsed.greeting = parsed.greeting
          ? `${parsed.greeting} (Last question!)`
          : "Almost done — just one final question!";
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: ask the single most impactful question
    return new Response(JSON.stringify({
      question: "What best describes your current situation?",
      key: "employmentStatus",
      suggestions: ["Student", "Farmer", "Salaried", "Business Owner", "Self-Employed", "Unemployed", "Retired"],
      complete: false,
      greeting: "Just one quick question to find your best schemes!",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Smart questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
