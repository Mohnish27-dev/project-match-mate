import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    console.log("Generating matches for project:", projectId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    // Get all freelancers
    const { data: freelancers, error: freelancersError } = await supabase
      .from("profiles")
      .select("*, freelancer_profiles(*)")
      .eq("user_role", "freelancer");

    if (freelancersError) throw freelancersError;

    console.log(`Found ${freelancers?.length || 0} freelancers`);

    // Use AI to analyze matches
    for (const freelancer of freelancers || []) {
      if (!freelancer.freelancer_profiles?.[0]) continue;

      const freelancerProfile = freelancer.freelancer_profiles[0];
      
      // Calculate skill match
      const projectSkills = project.required_skills || [];
      const freelancerSkills = freelancerProfile.skills || [];
      
      const matchedSkills = projectSkills.filter((skill: string) =>
        freelancerSkills.some((fSkill: string) =>
          fSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(fSkill.toLowerCase())
        )
      );

      const skillMatchPercentage = projectSkills.length > 0
        ? (matchedSkills.length / projectSkills.length) * 100
        : 0;

      // Only create matches for candidates with >40% skill match
      if (skillMatchPercentage < 40) continue;

      // Use AI to generate match reasoning
      let matchReason = "";
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are an AI matchmaker. Explain in 1-2 sentences why this freelancer is a good match for this project. Be specific about skills and experience.",
              },
              {
                role: "user",
                content: `Project: ${project.title}\nRequired Skills: ${projectSkills.join(", ")}\nBudget: $${project.budget_min}-$${project.budget_max}\n\nFreelancer: ${freelancer.full_name}\nSkills: ${freelancerSkills.join(", ")}\nExperience: ${freelancerProfile.years_experience || 0} years\nRate: $${freelancerProfile.hourly_rate || 0}/hr\n\nWhy is this a good match?`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          matchReason = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (error) {
        console.error("AI reasoning error:", error);
      }

      // Create match entry
      const { error: matchError } = await supabase
        .from("matches")
        .upsert({
          project_id: projectId,
          freelancer_id: freelancer.id,
          match_score: Math.round(skillMatchPercentage),
          match_reason: matchReason || `Strong skill match with ${matchedSkills.length} matching skills`,
        }, {
          onConflict: "project_id,freelancer_id",
        });

      if (matchError) {
        console.error("Match creation error:", matchError);
      }
    }

    console.log("Matches generated successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Matches generated" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
