import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// More focused skill sets that overlap better
const skillSets = {
  frontend: ["React", "Vue", "Angular", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind"],
  backend: ["Node.js", "Python", "Django", "Flask", "Java", "C#", "PHP", "Ruby", "Go"],
  mobile: ["React Native", "Flutter", "iOS", "Android", "Mobile Development"],
  database: ["PostgreSQL", "MongoDB", "MySQL", "Redis"],
  devops: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "DevOps", "Linux"],
  design: ["UI/UX Design", "Figma", "Adobe XD", "Photoshop"],
  ai: ["Machine Learning", "TensorFlow", "PyTorch", "Data Science"],
  api: ["GraphQL", "REST API"],
};

// Flatten all skills
const allSkills = Object.values(skillSets).flat();

const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
  "Kate", "Liam", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Rachel", "Sam", "Tara"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

const projectTypes = ["E-commerce Platform", "Mobile App", "AI System", "Data Dashboard", 
  "CRM System", "Marketing Website", "Inventory System", "Payment Gateway", 
  "Social Platform", "Video Service", "Healthcare Portal", "Educational Platform",
  "Real Estate App", "Food Delivery", "Fitness Tracker"];

const projectDescriptions = [
  "Modern, responsive platform with excellent UX",
  "Cross-platform mobile application with native features",
  "Intelligent AI-powered features and automation",
  "Real-time data visualization and analytics",
  "CRM integration with existing infrastructure",
  "Professional website with SEO optimization",
  "Full-featured system with reporting capabilities",
  "Secure processing and integration",
  "Engaging platform with modern features",
  "Scalable streaming solution",
  "HIPAA-compliant management portal",
  "Interactive learning with gamification",
  "Property listing and management",
  "On-demand ordering and delivery",
  "Comprehensive tracking and goals"
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// Get skills from specific categories to ensure better matches
function getSkillMix(): string[] {
  const categories = Object.keys(skillSets);
  const selectedCategories: string[] = [];
  
  // Select 2-4 random categories
  const numCategories = randomInt(2, 4);
  for (let i = 0; i < numCategories; i++) {
    const category = randomElement(categories);
    if (!selectedCategories.includes(category)) {
      selectedCategories.push(category);
    }
  }
  
  // Get 1-3 skills from each selected category
  const skills: string[] = [];
  for (const cat of selectedCategories) {
    const catSkills = skillSets[cat as keyof typeof skillSets];
    const numSkills = randomInt(1, Math.min(3, catSkills.length));
    for (let i = 0; i < numSkills; i++) {
      const skill = randomElement(catSkills);
      if (!skills.includes(skill)) {
        skills.push(skill);
      }
    }
  }
  
  return skills;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting dummy data generation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate 50 Freelancers
    console.log("👥 Generating 50 freelancers...");
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
          user_role: randomElement(["freelancer", "open_source_contributor", "job_seeker", "hackathon_participant"]),
        },
      });

      if (authError) {
        console.error(`❌ Error creating freelancer ${i + 1}:`, authError);
        continue;
      }

      // Create freelancer profile with overlapping skills
      const skills = getSkillMix();
      await supabase.from("freelancer_profiles").insert({
        user_id: authData.user.id,
        skills,
        years_experience: randomInt(1, 15),
        hourly_rate: randomInt(25, 200),
        availability: randomElement(["full-time", "part-time", "contract"]),
        github_url: `https://github.com/user${i + 1}`,
        linkedin_url: `https://linkedin.com/in/user${i + 1}`,
      });

      console.log(`✅ Created freelancer ${i + 1}/50`);
    }

    // Generate 50 Project Owners
    console.log("📋 Generating 50 project owners...");
    const projectIds: string[] = [];
    
    for (let i = 0; i < 50; i++) {
      const email = `owner${i + 1}@example.com`;
      const password = "Password123!";
      const fullName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          user_role: randomElement(["project_owner", "startup_founder"]),
        },
      });

      if (authError) {
        console.error(`❌ Error creating project owner ${i + 1}:`, authError);
        continue;
      }

      // Create 1-2 projects for each owner
      const projectCount = randomInt(1, 2);
      for (let j = 0; j < projectCount; j++) {
        // Use skill mix to ensure better matches
        const requiredSkills = getSkillMix();
        
        const { data: project, error: projectError } = await supabase.from("projects").insert({
          owner_id: authData.user.id,
          title: randomElement(projectTypes),
          description: randomElement(projectDescriptions),
          required_skills: requiredSkills,
          budget_min: randomInt(1000, 5000),
          budget_max: randomInt(5000, 20000),
          timeline: randomElement(["1-2 weeks", "2-4 weeks", "1-2 months", "2-3 months"]),
          status: "open",
          project_type: randomElement(["freelance_gig", "open_source_project", "startup_opportunity", "contract_work"]),
        }).select().single();
        
        if (project && !projectError) {
          projectIds.push(project.id);
        }
      }

      console.log(`✅ Created project owner ${i + 1}/50`);
    }

    console.log(`🎯 Generated ${projectIds.length} projects. Now generating AI matches (this may take 1-2 minutes)...`);

    // Generate matches for first 20 projects to avoid timeout
    // The rest can be matched when users browse
    const projectsToMatch = projectIds.slice(0, 20);
    let matchCount = 0;
    
    for (const projectId of projectsToMatch) {
      try {
        const { data: matchData } = await supabase.functions.invoke("generate-matches", {
          body: { projectId },
        });
        if (matchData?.matchCount) {
          matchCount += matchData.matchCount;
        }
      } catch (error) {
        console.error("❌ Error generating matches for project:", error);
      }
    }

    console.log(`✅ Dummy data generation complete!`);
    console.log(`   📊 Stats: 50 freelancers, 50 project owners, ${projectIds.length} projects, ${matchCount} AI matches created`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated 50 freelancers, 50 project owners, ${projectIds.length} projects, and ${matchCount} AI-powered matches!`,
        stats: {
          freelancers: 50,
          project_owners: 50,
          projects: projectIds.length,
          matches: matchCount,
        },
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
