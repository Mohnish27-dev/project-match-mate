import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const skillsList = [
  "React", "Vue", "Angular", "Node.js", "Python", "Django", "Flask",
  "JavaScript", "TypeScript", "Java", "C#", "PHP", "Ruby", "Go",
  "PostgreSQL", "MongoDB", "MySQL", "Redis", "GraphQL", "REST API",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD",
  "UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator",
  "Machine Learning", "TensorFlow", "PyTorch", "Data Science",
  "Mobile Development", "React Native", "Flutter", "iOS", "Android",
  "DevOps", "Linux", "Git", "Agile", "Scrum"
];

const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
  "Kate", "Liam", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Rachel", "Sam", "Tara"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

const projectTitles = [
  "E-commerce Platform Redesign", "Mobile App Development", "AI Chatbot Implementation",
  "Data Analytics Dashboard", "CRM System Integration", "Marketing Website",
  "Inventory Management System", "Payment Gateway Integration", "Social Media Platform",
  "Video Streaming Service", "Healthcare Portal", "Educational Platform",
  "Real Estate Marketplace", "Food Delivery App", "Fitness Tracking System"
];

const projectDescriptions = [
  "We need a modern, responsive platform with excellent UX",
  "Looking for experienced developers to build a cross-platform mobile application",
  "Seeking AI expertise to implement intelligent chatbot features",
  "Need comprehensive analytics solution with real-time data visualization",
  "Integration of CRM system with existing infrastructure",
  "Professional marketing website with SEO optimization",
  "Full-featured inventory system with reporting capabilities",
  "Secure payment processing integration",
  "Build engaging social platform with modern features",
  "Scalable video streaming solution",
  "HIPAA-compliant healthcare management portal",
  "Interactive learning platform with gamification",
  "Property listing and management marketplace",
  "On-demand food ordering and delivery system",
  "Comprehensive fitness tracking and goal management"
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomSkills(count: number): string[] {
  const shuffled = [...skillsList].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting dummy data generation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const createdUsers: any[] = [];

    // Generate 50 Freelancers
    console.log("Generating 50 freelancers...");
    for (let i = 0; i < 50; i++) {
      const email = `freelancer${i + 1}@example.com`;
      const password = "Password123!";
      const fullName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          user_role: "freelancer",
        },
      });

      if (authError) {
        console.error(`Error creating freelancer ${i + 1}:`, authError);
        continue;
      }

      // Create freelancer profile
      const skills = randomSkills(randomInt(3, 8));
      await supabase.from("freelancer_profiles").insert({
        user_id: authData.user.id,
        skills,
        years_experience: randomInt(1, 15),
        hourly_rate: randomInt(25, 200),
        availability: randomElement(["full-time", "part-time", "contract"]),
      });

      createdUsers.push({ id: authData.user.id, email, role: "freelancer" });
      console.log(`Created freelancer ${i + 1}/50`);
    }

    // Generate 50 Project Owners
    console.log("Generating 50 project owners...");
    for (let i = 0; i < 50; i++) {
      const email = `owner${i + 1}@example.com`;
      const password = "Password123!";
      const fullName = `${randomElement(firstNames)} ${randomElement(lastNames)} (Owner)`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          user_role: "project_owner",
        },
      });

      if (authError) {
        console.error(`Error creating project owner ${i + 1}:`, authError);
        continue;
      }

      // Create 1-3 projects for each owner
      const projectCount = randomInt(1, 3);
      for (let j = 0; j < projectCount; j++) {
        const requiredSkills = randomSkills(randomInt(2, 5));
        await supabase.from("projects").insert({
          owner_id: authData.user.id,
          title: randomElement(projectTitles),
          description: randomElement(projectDescriptions),
          required_skills: requiredSkills,
          budget_min: randomInt(1000, 5000),
          budget_max: randomInt(5000, 20000),
          timeline: randomElement(["1-2 weeks", "2-4 weeks", "1-2 months", "2-3 months", "3-6 months"]),
          status: "open",
        });
      }

      createdUsers.push({ id: authData.user.id, email, role: "project_owner" });
      console.log(`Created project owner ${i + 1}/50`);
    }

    // Generate matches for all projects
    console.log("Generating AI matches for projects...");
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("status", "open");

    if (allProjects) {
      for (const project of allProjects) {
        try {
          await supabase.functions.invoke("generate-matches", {
            body: { projectId: project.id },
          });
        } catch (error) {
          console.error("Error generating matches for project:", error);
        }
      }
    }

    console.log("Dummy data generation complete!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Generated 50 freelancers and 50 project owners with projects and matches",
        stats: {
          freelancers: 50,
          project_owners: 50,
          projects: allProjects?.length || 0,
        },
      }),
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
