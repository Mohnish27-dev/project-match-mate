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
    console.log("🚀 Starting AI match generation for project:", projectId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("📋 Fetching project details with owner profile...");
    
    // Get project details with owner profile
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, profiles!projects_owner_id_fkey(*)")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    console.log(`✅ Project loaded: "${project.title}" (Type: ${project.project_type || 'freelance_gig'})`);

    // Get all potential candidates (expanded user types)
    const { data: freelancers, error: freelancersError } = await supabase
      .from("profiles")
      .select("*, freelancer_profiles(*)")
      .in("user_role", [
        "freelancer",
        "open_source_contributor",
        "open_source_maintainer",
        "job_seeker",
        "hackathon_participant"
      ]);

    if (freelancersError) throw freelancersError;

    console.log(`👥 Found ${freelancers?.length || 0} potential candidates`);

    let aiCallCount = 0;
    let matchesCreated = 0;

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

      // Only create matches for candidates with >30% skill match
      if (skillMatchPercentage < 30) continue;

      console.log(`🔍 Processing ${freelancer.full_name || freelancer.email} (${Math.round(skillMatchPercentage)}% skill match)`);
      aiCallCount++;

      // Use AI to generate personalized match reasoning
      let matchReason = "";
      try {
        const projectContext = `
Project Type: ${project.project_type || 'freelance_gig'}
Project: ${project.title}
Required Skills: ${projectSkills.join(", ")}
Budget: $${project.budget_min || 0} - $${project.budget_max || 0}
Timeline: ${project.timeline || 'Not specified'}
Description: ${project.description}
Owner Role: ${project.profiles?.user_role || 'project_owner'}
`;

        const candidateContext = `
Candidate: ${freelancer.full_name || freelancer.email}
Role: ${freelancer.user_role}
Skills: ${freelancerSkills.join(", ")}
Experience: ${freelancerProfile.years_experience || 0} years
Rate: $${freelancerProfile.hourly_rate || 0}/hr
GitHub: ${freelancerProfile.github_url || 'Not provided'}
LinkedIn: ${freelancerProfile.linkedin_url || 'Not provided'}
Open Source Contributions: ${freelancerProfile.open_source_contributions?.join(", ") || 'None listed'}
Hackathon Wins: ${freelancerProfile.hackathon_wins || 0}
Portfolio: ${freelancerProfile.portfolio_url || 'Not provided'}
`;

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
                content: "You are an expert AI talent matcher for a platform connecting freelancers, open source contributors, startup founders, job seekers, and hackathon participants with opportunities. Analyze the candidate's profile against project requirements and provide a compelling, personalized 2-3 sentence explanation of why this is a great match. Focus on specific skills, experience, unique qualifications, and how their background aligns with the project type. Be specific and actionable.",
              },
              {
                role: "user",
                content: `${projectContext}\n${candidateContext}\n\nThis is a ${Math.round(skillMatchPercentage)}% skill match. Provide a compelling, personalized reason why this candidate would be perfect for this project.`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          matchReason = aiData.choices?.[0]?.message?.content || "";
          console.log(`✨ AI generated match reason for ${freelancer.full_name || freelancer.email}`);
        } else {
          const errorText = await aiResponse.text();
          console.error("⚠️ AI API error:", aiResponse.status, errorText);
          matchReason = `Strong ${Math.round(skillMatchPercentage)}% skill match with ${freelancerProfile.years_experience || 0} years of experience in ${matchedSkills.join(", ")}.`;
        }
      } catch (error) {
        console.error("❌ AI reasoning error:", error);
        matchReason = `Strong ${Math.round(skillMatchPercentage)}% skill match with ${freelancerProfile.years_experience || 0} years of experience in ${matchedSkills.join(", ")}.`;
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
        console.error("❌ Match creation error:", matchError);
      } else {
        matchesCreated++;
      }
    }

    console.log(`✅ AI Match Generation Complete!`);
    console.log(`   - Processed ${aiCallCount} AI calls`);
    console.log(`   - Created ${matchesCreated} matches`);
    console.log(`   - Project: "${project.title}"`);

    return new Response(
      JSON.stringify({ 
        success: true,
        matchCount: matchesCreated,
        aiCallsMade: aiCallCount,
        projectTitle: project.title
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("💥 Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
