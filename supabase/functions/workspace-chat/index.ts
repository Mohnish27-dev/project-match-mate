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
    const { workspaceId, question } = await req.json();
    console.log("Processing workspace chat question:", question);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather workspace context
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) throw workspaceError;

    // Get workspace members with profiles
    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select("*, profiles(full_name, email, bio), freelancer_profiles(*)")
      .eq("workspace_id", workspaceId);

    if (membersError) throw membersError;

    // Get workspace projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*, applications(*)")
      .eq("workspace_id", workspaceId);

    if (projectsError) throw projectsError;

    // Get workspace activity
    const { data: activities, error: activitiesError } = await supabase
      .from("workspace_activity")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (activitiesError) throw activitiesError;

    // Build context for AI
    const contextData = {
      workspace: {
        name: workspace.name,
        description: workspace.description,
        member_count: members?.length || 0,
        project_count: projects?.length || 0,
      },
      members: members?.map(m => ({
        name: m.profiles?.full_name,
        email: m.profiles?.email,
        role: m.role,
        skills: m.freelancer_profiles?.[0]?.skills || [],
        experience: m.freelancer_profiles?.[0]?.years_experience || 0,
        joined: m.joined_at,
      })) || [],
      projects: projects?.map(p => ({
        title: p.title,
        description: p.description,
        status: p.status,
        skills: p.required_skills || [],
        budget: `$${p.budget_min || 0} - $${p.budget_max || 0}`,
        timeline: p.timeline,
        applications: p.applications?.length || 0,
      })) || [],
      recent_activity: activities?.slice(0, 20).map(a => ({
        type: a.activity_type,
        description: a.description,
        date: a.created_at,
      })) || [],
    };

    // Call AI with context
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
            content: `You are an AI assistant for a collaborative workspace. You have access to workspace data including members, projects, and activities. Answer questions accurately based on the provided context. Be helpful, specific, and provide actionable insights when possible.

Context Data:
${JSON.stringify(contextData, null, 2)}`,
          },
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    console.log("Generated answer for workspace chat");

    return new Response(
      JSON.stringify({ success: true, answer, context: contextData }),
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
