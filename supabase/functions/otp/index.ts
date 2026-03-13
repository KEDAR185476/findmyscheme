import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, action, code } = await req.json();

    if (!phone || !action) {
      return new Response(JSON.stringify({ error: "Phone and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "send") {
      // Generate 6-digit OTP (mock — always 123456 for dev, random in prod)
      const otp = "123456"; // TODO: Replace with real OTP via Twilio
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Delete old OTPs for this phone
      await supabase.from("otp_codes").delete().eq("phone", phone);

      // Insert new OTP
      const { error } = await supabase.from("otp_codes").insert({
        phone,
        code: otp,
        expires_at: expiresAt,
      });

      if (error) throw error;

      console.log(`OTP sent to ${phone}: ${otp}`);

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent (dev: use 123456)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!code) {
        return new Response(JSON.stringify({ error: "OTP code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check OTP
      const { data: otpRecord, error: otpError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("phone", phone)
        .eq("code", code)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as verified
      await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

      // Check if user profile exists (returning user)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("phone", phone)
        .single();

      const isReturningUser = !!profile && !!profile.onboarding_complete;

      // Create profile if new user
      if (!profile) {
        await supabase.from("user_profiles").insert({ phone });
      }

      return new Response(
        JSON.stringify({
          success: true,
          isReturningUser,
          profile: profile || { phone },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OTP error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
