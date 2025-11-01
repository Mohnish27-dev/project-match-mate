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
    const { workspaceId } = await req.json();
    console.log("Generating member recommendations for workspace:", workspaceId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get workspace details and projects
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*, projects(*)")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) throw workspaceError;

    // Get current workspace members
    const { data: currentMembers, error: membersError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId);

    if (membersError) throw membersError;

    const currentMemberIds = currentMembers?.map(m => m.user_id) || [];

    // Get all freelancers not in workspace
    const { data: freelancers, error: freelancersError } = await supabase
      .from("profiles")
      .select("*, freelancer_profiles(*)")
      .eq("user_role", "freelancer")
      .not("id", "in", `(${currentMemberIds.join(",")})`);

    if (freelancersError) throw freelancersError;

    console.log(`Found ${freelancers?.length || 0} potential candidates`);

    const recommendations = [];

    // Collect all required skills from workspace projects
    const workspaceSkills = workspace.projects
      ?.flatMap((p: any) => p.required_skills || [])
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) || [];

    // Analyze each freelancer
    for (const freelancer of freelancers || []) {
      if (!freelancer.freelancer_profiles?.[0]) continue;

      const freelancerProfile = freelancer.freelancer_profiles[0];
      const freelancerSkills = freelancerProfile.skills || [];

      // Calculate skill match with workspace needs
      const matchedSkills = workspaceSkills.filter((skill: string) =>
        freelancerSkills.some((fSkill: string) =>
          fSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(fSkill.toLowerCase())
        )
      );

      const matchPercentage = workspaceSkills.length > 0
        ? Math.round((matchedSkills.length / workspaceSkills.length) * 100)
        : 50;

      // Only recommend candidates with >30% match
      if (matchPercentage < 30) continue;

      // Use AI to generate recommendation reasoning
      let reason = "";
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
                content: "You are a talent matchmaker. Explain in 1-2 sentences why this freelancer would be a great addition to the workspace based on their skills and experience.",
              },
              {
                role: "user",
                content: `Workspace: ${workspace.name}\nWorkspace Skills Needed: ${workspaceSkills.join(", ")}\nProjects: ${workspace.projects?.length || 0}\n\nFreelancer: ${freelancer.full_name}\nSkills: ${freelancerSkills.join(", ")}\nExperience: ${freelancerProfile.years_experience || 0} years\nRate: $${freelancerProfile.hourly_rate || 0}/hr\n\nWhy recommend for this workspace?`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          reason = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (error) {
        console.error("AI reasoning error:", error);
      }

      recommendations.push({
        freelancer_id: freelancer.id,
        freelancer_name: freelancer.full_name,
        freelancer_email: freelancer.email,
        skills: freelancerSkills,
        match_percentage: matchPercentage,
        reason: reason || `Strong skill match with ${matchedSkills.length} relevant skills for workspace projects`,
      });
    }

    // Sort by match percentage
    recommendations.sort((a, b) => b.match_percentage - a.match_percentage);

    console.log(`Generated ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({ success: true, recommendations }),
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
