import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Simple SHA-256 hash using Web Crypto API
 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fraud risk scoring based on data consistency analysis
 */
function computeFraudRisk(profile: Record<string, unknown>): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  const age = typeof profile.age === "number"
    ? profile.age
    : profile.dob
    ? Math.floor((Date.now() - new Date(profile.dob as string).getTime()) / 31557600000)
    : null;

  const income = typeof profile.income === "number" ? profile.income : null;
  const occupation = ((profile.employmentStatus || profile.occupationType || "") as string).toLowerCase();
  const landOwnership = ((profile.landOwnership || "") as string).toLowerCase();
  const education = ((profile.educationLevel || "") as string).toLowerCase();

  // Rule 1: Very young person claiming high land ownership
  if (age && age < 22 && landOwnership && !["no land", "none", ""].includes(landOwnership)) {
    if (landOwnership.includes("5 acres") || landOwnership.includes("above")) {
      score += 25;
      reasons.push("Young age with significant land ownership");
    }
  }

  // Rule 2: High asset ownership with very low declared income
  if (landOwnership && !["no land", "none", ""].includes(landOwnership) && income && income < 50000) {
    score += 20;
    reasons.push("Land ownership inconsistent with reported income");
  }

  // Rule 3: Student claiming business ownership or high income
  if (occupation.includes("student") && income && income > 500000) {
    score += 20;
    reasons.push("Student status inconsistent with high income");
  }

  // Rule 4: Retired person with very young age
  if (occupation.includes("retired") && age && age < 40) {
    score += 25;
    reasons.push("Retirement status inconsistent with age");
  }

  // Rule 5: Farmer without any land
  if (occupation.includes("farmer") && (!landOwnership || ["no land", "none"].includes(landOwnership))) {
    score += 10;
    reasons.push("Farmer occupation but no land ownership declared");
  }

  // Rule 6: Post-graduate education with very low income (possible, but flaggable)
  if (education.includes("post graduate") && income && income < 30000) {
    score += 8;
    reasons.push("High education level with very low income");
  }

  // Rule 7: Age below 14 (too young for most schemes, possible data error)
  if (age && age < 14) {
    score += 15;
    reasons.push("Age below 14 — possible data entry error");
  }

  // Rule 8: Age above 120 (impossible)
  if (age && age > 120) {
    score += 30;
    reasons.push("Age exceeds 120 — data error");
  }

  return { score: Math.min(score, 100), reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, profile, ocrFields } = await req.json();

    if (!phone || typeof phone !== "string") {
      return new Response(JSON.stringify({ error: "Phone number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Step 1: Generate identity fingerprint ---
    const aadhaar = ocrFields?.aadhaarNumber?.value?.replace(/[-\s]/g, "") || "";
    const dob = ocrFields?.dob?.value || profile?.dob || "";
    const name = (ocrFields?.name?.value || profile?.name || "").toLowerCase().trim();

    // Build composite fingerprint (only if we have enough data)
    let fingerprintHash = "";
    let partialDobHash = "";
    let partialNameHash = "";
    const partialPhoneHash = await sha256(phone);

    if (aadhaar && dob) {
      // Strong fingerprint: aadhaar + dob + phone
      fingerprintHash = await sha256(`${aadhaar}:${dob}:${phone}`);
    } else if (name && dob && phone) {
      // Moderate fingerprint: name + dob + phone
      fingerprintHash = await sha256(`${name}:${dob}:${phone}`);
    } else {
      // Weak: phone-only fingerprint
      fingerprintHash = partialPhoneHash;
    }

    if (dob) partialDobHash = await sha256(dob);
    if (name) partialNameHash = await sha256(name.split(" ")[0]); // first name hash

    // --- Step 2: Check for duplicates ---
    let duplicateRiskLevel = "none";
    const duplicateReasons: string[] = [];

    // Check exact fingerprint match
    const { data: exactMatches } = await supabase
      .from("identity_fingerprints")
      .select("id, phone, duplicate_risk_level")
      .eq("fingerprint_hash", fingerprintHash)
      .neq("phone", phone)
      .limit(5);

    if (exactMatches && exactMatches.length > 0) {
      duplicateRiskLevel = "high";
      duplicateReasons.push("Exact identity fingerprint matches an existing account");
    }

    // Check same phone with different fingerprint
    if (duplicateRiskLevel !== "high") {
      const { data: phoneMatches } = await supabase
        .from("identity_fingerprints")
        .select("id, fingerprint_hash")
        .eq("phone", phone)
        .neq("fingerprint_hash", fingerprintHash)
        .limit(5);

      if (phoneMatches && phoneMatches.length > 0) {
        duplicateRiskLevel = "medium";
        duplicateReasons.push("Phone number previously used with different identity data");
      }
    }

    // Check partial overlap: same DOB hash + same name hash but different phone
    if (duplicateRiskLevel === "none" && partialDobHash && partialNameHash) {
      const { data: partialMatches } = await supabase
        .from("identity_fingerprints")
        .select("id, phone")
        .eq("partial_dob_hash", partialDobHash)
        .eq("partial_name_hash", partialNameHash)
        .neq("phone", phone)
        .limit(5);

      if (partialMatches && partialMatches.length > 0) {
        duplicateRiskLevel = "medium";
        duplicateReasons.push("Similar identity (name + DOB) found on another account");
      }
    }

    // --- Step 3: Compute fraud risk score ---
    const { score: fraudRiskScore, reasons: fraudReasons } = computeFraudRisk(profile || {});

    const fraudRiskLevel = fraudRiskScore >= 60 ? "high" : fraudRiskScore >= 30 ? "medium" : "low";

    // --- Step 4: Upsert fingerprint record ---
    const { error: upsertError } = await supabase
      .from("identity_fingerprints")
      .upsert(
        {
          phone,
          fingerprint_hash: fingerprintHash,
          partial_name_hash: partialNameHash || null,
          partial_dob_hash: partialDobHash || null,
          partial_phone_hash: partialPhoneHash,
          duplicate_risk_level: duplicateRiskLevel,
          fraud_risk_score: fraudRiskScore,
          fraud_risk_reasons: fraudReasons,
          flagged: duplicateRiskLevel === "high" || fraudRiskScore >= 60,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone", ignoreDuplicates: false }
      );

    if (upsertError) {
      console.error("Fingerprint upsert error:", upsertError);
      // Non-blocking: don't prevent user from proceeding
    }

    // --- Step 5: Return verdict ---
    const verdict = {
      safe: duplicateRiskLevel !== "high" && fraudRiskScore < 60,
      duplicate: {
        level: duplicateRiskLevel,
        reasons: duplicateReasons,
      },
      fraud: {
        level: fraudRiskLevel,
        score: fraudRiskScore,
        reasons: fraudReasons,
      },
      // User-facing messages
      alerts: [] as string[],
    };

    if (duplicateRiskLevel === "high") {
      verdict.alerts.push(
        "We detected an existing profile with similar identity information. Please verify your details or log in to your existing account."
      );
    } else if (duplicateRiskLevel === "medium") {
      verdict.alerts.push(
        "Some of your information matches another profile. Please ensure your details are accurate."
      );
    }

    if (fraudRiskScore >= 60) {
      verdict.alerts.push(
        "Some submitted information appears inconsistent. Please review your details before continuing."
      );
    } else if (fraudRiskScore >= 30) {
      verdict.alerts.push(
        "Minor inconsistencies detected in your profile. You may proceed, but please verify accuracy."
      );
    }

    return new Response(JSON.stringify(verdict), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-identity error:", err);
    return new Response(JSON.stringify({ error: "Verification service error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
