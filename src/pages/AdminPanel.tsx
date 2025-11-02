import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Database, Loader2 } from "lucide-react";

export default function AdminPanel() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateDummyData = async () => {
    setLoading(true);
    try {
      toast({
        title: "Generating data...",
        description: "This may take 1-2 minutes. Please wait...",
      });

      const { data, error } = await supabase.functions.invoke("generate-dummy-data", {
        body: {},
      });
      
      if (error) throw error;

      toast({
        title: "Success!",
        description: data.message || "Dummy data generated successfully!",
      });
      
      // Refresh the page after 2 seconds to show new data
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate dummy data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate Dummy Data</CardTitle>
          <CardDescription>
            Create 50 freelancers and 50 project owners with projects and AI-powered matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateDummyData} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating... (1-2 min)
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Generate 100 Users & Data
              </>
            )}
          </Button>
          {loading && (
            <p className="text-sm text-muted-foreground mt-4">
              Please wait while we create users, projects, and AI-powered matches...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
