import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, action, profile: profileData, scheme_id } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET profile
    if (action === "get") {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("phone", phone)
        .single();

      if (error) throw error;

      // Also get saved schemes
      const { data: saved } = await supabase
        .from("saved_schemes")
        .select("scheme_id")
        .eq("phone", phone);

      return new Response(
        JSON.stringify({ profile: data, savedSchemes: (saved || []).map((s: any) => s.scheme_id) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE profile
    if (action === "update") {
      const { error } = await supabase
        .from("user_profiles")
        .update(profileData)
        .eq("phone", phone);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SAVE/UNSAVE scheme
    if (action === "save_scheme") {
      if (!scheme_id) {
        return new Response(JSON.stringify({ error: "scheme_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Toggle: check if exists
      const { data: existing } = await supabase
        .from("saved_schemes")
        .select("id")
        .eq("phone", phone)
        .eq("scheme_id", scheme_id)
        .single();

      if (existing) {
        await supabase.from("saved_schemes").delete().eq("id", existing.id);
      } else {
        await supabase.from("saved_schemes").insert({ phone, scheme_id });
      }

      return new Response(
        JSON.stringify({ success: true, saved: !existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Profile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
