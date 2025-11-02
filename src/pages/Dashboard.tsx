import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Plus, Briefcase, Users, Star, TrendingUp, Folder, Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    await loadProfile();
    setLoading(false);
  };

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      
      if (profileData.user_role === 'project_owner') {
        await loadOwnerData(user.id);
      } else {
        await loadFreelancerData(user.id);
      }
    }
  };

  const loadOwnerData = async (userId: string) => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, applications(count)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    setProjects(projectsData || []);
  };

  const loadFreelancerData = async (userId: string) => {
    setLoadingMatches(true);
    
    // First check for existing matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*, projects(*)')
      .eq('freelancer_id', userId)
      .order('match_score', { ascending: false })
      .limit(10);

    const { data: applicationsData } = await supabase
      .from('applications')
      .select('*, projects(*)')
      .eq('freelancer_id', userId)
      .order('created_at', { ascending: false });

    // If no matches exist, generate them with AI
    if (!matchesData || matchesData.length === 0) {
      try {
        const { data: generateData, error: generateError } = await supabase.functions.invoke('generate-user-matches', {
          body: { userId }
        });

        if (!generateError && generateData?.matchCount > 0) {
          // Reload matches after generation
          const { data: newMatches } = await supabase
            .from('matches')
            .select('*, projects(*)')
            .eq('freelancer_id', userId)
            .order('match_score', { ascending: false })
            .limit(10);

          setMatches(newMatches || []);
          toast.success(`Generated ${generateData.matchCount} AI-powered matches!`);
        } else {
          setMatches([]);
        }
      } catch (error) {
        console.error('Error generating matches:', error);
        setMatches([]);
      }
    } else {
      setMatches(matchesData);
    }

    setApplications(applicationsData || []);
    setLoadingMatches(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            MatchAI
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {profile?.user_role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name}!
          </h2>
          <p className="text-muted-foreground">
            {profile?.user_role === 'project_owner' 
              ? 'Manage your projects and find the perfect talent'
              : 'Discover new opportunities and grow your career'}
          </p>
        </div>

        {profile?.user_role === 'project_owner' ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">My Projects</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/workspaces')} className="gap-2">
                  <Folder className="h-4 w-4" />
                  Workspaces
                </Button>
                <Button onClick={() => navigate('/post-project')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Post New Project
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              {projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No projects yet</p>
                    <Button 
                      className="mt-4"
                      onClick={() => navigate('/post-project')}
                    >
                      Post Your First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-card transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{project.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {project.description}
                          </CardDescription>
                        </div>
                        <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.required_skills?.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          Budget: ${project.budget_min} - ${project.budget_max}
                        </span>
                        <span>{project.applications?.[0]?.count || 0} applications</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        ) : (
          <Tabs defaultValue="matches" className="space-y-6">
            <TabsList>
              <TabsTrigger value="matches" className="gap-2">
                <Star className="h-4 w-4" />
                AI Matches
              </TabsTrigger>
              <TabsTrigger value="browse" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Browse Projects
              </TabsTrigger>
              <TabsTrigger value="applications" className="gap-2">
                <Users className="h-4 w-4" />
                My Applications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matches" className="space-y-4">
              {loadingMatches ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">
                      Generating AI-powered matches using semantic analysis and embeddings...
                    </p>
                  </CardContent>
                </Card>
              ) : matches.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-semibold mb-2">No AI matches yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate test data to see AI-powered project matching with embeddings in action
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={() => navigate('/admin')}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Generate Test Data
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/projects')}
                      >
                        Browse Projects
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                matches.map((match) => (
                  <Card key={match.id} className="hover:shadow-card transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{match.projects.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {match.projects.description}
                          </CardDescription>
                        </div>
                        <Badge className="bg-gradient-primary">
                          {match.match_score}% Match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {match.projects.required_skills?.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                      {match.match_reason && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Why it's a match:</strong> {match.match_reason}
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Budget: ${match.projects.budget_min} - ${match.projects.budget_max}
                        </span>
                        <Button onClick={() => navigate(`/project/${match.projects.id}`)}>
                          View Project
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="browse">
              <div className="text-center py-8">
                <Button onClick={() => navigate('/projects')}>
                  Browse All Projects
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="applications" className="space-y-4">
              {applications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No applications yet</p>
                  </CardContent>
                </Card>
              ) : (
                applications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{app.projects.title}</CardTitle>
                        <Badge variant={app.status === 'pending' ? 'secondary' : 'default'}>
                          {app.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </p>
                      <Button variant="outline" onClick={() => navigate(`/project/${app.projects.id}`)}>
                        View Project
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
