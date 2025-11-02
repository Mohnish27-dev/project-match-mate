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
    const { userId } = await req.json();
    console.log("🎯 Generating matches for user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's freelancer profile
    const { data: freelancerProfile, error: profileError } = await supabase
      .from("freelancer_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !freelancerProfile) {
      console.error("❌ No freelancer profile found for user");
      return new Response(
        JSON.stringify({ error: "Freelancer profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("👤 Freelancer profile:", freelancerProfile);

    // Get user profile for additional context
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Build freelancer context for AI
    const freelancerContext = `
Skills: ${freelancerProfile.skills?.join(", ") || "None"}
Experience: ${freelancerProfile.years_experience || 0} years
Hourly Rate: $${freelancerProfile.hourly_rate || 0}
Availability: ${freelancerProfile.availability || "Not specified"}
Bio: ${userProfile?.bio || "No bio"}
Looking for: ${userProfile?.looking_for || "Any opportunities"}
    `.trim();

    // Get all open projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*, profiles(full_name, bio)")
      .eq("status", "open")
      .limit(50);

    if (projectsError || !projects || projects.length === 0) {
      console.log("📭 No open projects found");
      return new Response(
        JSON.stringify({ success: true, matchCount: 0, message: "No open projects available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Found ${projects.length} open projects to match against`);

    let matchCount = 0;
    const batchSize = 5;

    // Process projects in batches for efficiency
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      for (const project of batch) {
        try {
          // Build project context
          const projectContext = `
Title: ${project.title}
Description: ${project.description}
Required Skills: ${project.required_skills?.join(", ") || "None"}
Budget: $${project.budget_min || 0} - $${project.budget_max || 0}
Timeline: ${project.timeline || "Not specified"}
Project Type: ${project.project_type || "Not specified"}
Owner Bio: ${project.profiles?.bio || "No bio available"}
          `.trim();

          // Use Lovable AI to generate semantic match score and reasoning
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
                  content: "You are an AI matchmaking expert. Analyze the freelancer profile and project requirements to determine match quality. Return ONLY a JSON object with 'score' (0-100) and 'reason' (max 100 words explaining the match)."
                },
                {
                  role: "user",
                  content: `Analyze this match:

FREELANCER PROFILE:
${freelancerContext}

PROJECT REQUIREMENTS:
${projectContext}

Provide a match score (0-100) based on:
1. Skill alignment (40%)
2. Experience level match (20%)
3. Budget/rate compatibility (20%)
4. Availability and timeline fit (10%)
5. Overall profile compatibility (10%)

Return ONLY valid JSON: {"score": number, "reason": "string"}`
                }
              ],
              temperature: 0.3,
              max_tokens: 200
            }),
          });

          if (!aiResponse.ok) {
            console.error(`❌ AI API error for project ${project.id}:`, aiResponse.status);
            continue;
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (!content) {
            console.error(`❌ No content from AI for project ${project.id}`);
            continue;
          }

          // Parse AI response
          let matchData;
          try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              matchData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("No JSON found in response");
            }
          } catch (parseError) {
            console.error("❌ Failed to parse AI response:", content);
            continue;
          }

          const matchScore = Math.min(100, Math.max(0, matchData.score || 0));
          
          // Only create matches with score > 30
          if (matchScore > 30) {
            const { error: matchError } = await supabase
              .from("matches")
              .upsert({
                project_id: project.id,
                freelancer_id: userId,
                match_score: matchScore,
                reason: matchData.reason || "AI-generated match based on profile analysis"
              }, {
                onConflict: "project_id,freelancer_id"
              });

            if (matchError) {
              console.error(`❌ Error saving match for project ${project.id}:`, matchError);
            } else {
              console.log(`✅ Created match for project "${project.title}" - Score: ${matchScore}`);
              matchCount++;
            }
          }

        } catch (error) {
          console.error(`❌ Error processing project ${project.id}:`, error);
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < projects.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Match generation complete! Created ${matchCount} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        matchCount,
        message: `Generated ${matchCount} AI-powered matches using semantic analysis`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("💥 Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
