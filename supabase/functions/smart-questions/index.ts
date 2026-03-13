import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an intelligent eligibility assistant for FindMyScheme, a government welfare scheme discovery platform for Indian citizens.

Your goal: Ask the MINIMUM number of targeted questions to gather eligibility information based on the user's profile. You must respond with a JSON tool call.

USER PROFILE (already known):
${JSON.stringify(profile, null, 2)}

RULES:
1. Analyze what's already known and what's missing for scheme eligibility.
2. Generate ONE question at a time — the most impactful one based on what you know.
3. Each question MUST have a "key" that maps to a profile field, a clear "question" text, and 3-7 "suggestions" (quick-reply chips).
4. Consider the user's age, state, gender, income when choosing what to ask.
5. Use conditional logic:
   - If age 18-25: prioritize education/student status, scholarship eligibility
   - If occupation is farming: ask about land ownership, crop type
   - If female: ask about maternity-related eligibility
   - If income < 250000: focus on BPL/welfare schemes
   - If student: ask for institution type, enrollment status
6. Category verification questions:
   - Students: institution type, education level, enrollment status
   - Farmers: land ownership, agriculture type, farm size
   - Business owners: business type, registration status, MSME
7. When you have enough information (all critical fields filled), set "complete" to true.
8. NEVER ask about Aadhaar numbers, PAN numbers, or any document numbers.
9. Keep questions conversational and simple.

PROFILE FIELDS TO GATHER (if missing):
- employmentStatus: current work status
- occupationType: type of occupation/work
- educationLevel: highest education
- maritalStatus: marital status
- hasDisability: disability status (boolean)
- landOwnership: agricultural land ownership
- hasBankAccount: bank account linked with Aadhaar (boolean)
- income: annual family income (number)
- residency: rural/urban/semi-urban
- category: APL/BPL/AAY (if not set)
- Additional category-specific: institutionType, enrollmentStatus, agricultureType, businessType, startupStatus`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
    ];

    // If no conversation history, add initial user message
    if (!conversationHistory || conversationHistory.length === 0) {
      messages.push({ role: "user", content: "Please start asking me questions to determine my eligibility for government schemes." });
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
              description: "Ask the user a question to gather eligibility information",
              parameters: {
                type: "object",
                properties: {
                  question: { type: "string", description: "The question to ask" },
                  key: { type: "string", description: "Profile field this question fills" },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Quick-reply suggestion chips (3-7 options)",
                  },
                  complete: {
                    type: "boolean",
                    description: "True if enough information has been gathered",
                  },
                  greeting: {
                    type: "string",
                    description: "Optional greeting or context message before the question",
                  },
                },
                required: ["question", "key", "suggestions", "complete"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "ask_question" } },
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
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if no tool call
    return new Response(JSON.stringify({
      question: "What is your current employment status?",
      key: "employmentStatus",
      suggestions: ["Employed", "Self-Employed", "Farmer", "Student", "Unemployed", "Retired"],
      complete: false,
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
