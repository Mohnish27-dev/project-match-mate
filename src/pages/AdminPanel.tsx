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
      const { data, error } = await supabase.functions.invoke("generate-dummy-data");
      
      if (error) throw error;

      toast({
        title: "Success!",
        description: `${data.message}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
          <Button onClick={generateDummyData} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Database className="mr-2 h-4 w-4" />
            Generate 100 Users & Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
