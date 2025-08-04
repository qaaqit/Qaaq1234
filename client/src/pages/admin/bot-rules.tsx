import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Save, AlertTriangle, CheckCircle, Clock, FileText, ArrowLeft } from "lucide-react";

interface BotRule {
  id: string;
  name: string;
  version: string;
  content: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export default function BotRulesAdmin() {
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current bot rules
  const { data: botRule, isLoading, error } = useQuery<BotRule>({
    queryKey: ["/api/admin/bot-rules/QBOTRULESV1"],
    retry: 1,
  });

  // Update content when data loads
  useEffect(() => {
    if (botRule) {
      setContent(botRule.content);
      setVersion(botRule.version);
      setHasChanges(false);
    }
  }, [botRule]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== (botRule?.content || ""));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { content: string; version: string }) => {
      return await apiRequest("/api/admin/bot-rules/QBOTRULESV1", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Bot Rules Updated",
        description: "QBOT rules have been successfully updated and are now active.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bot-rules/QBOTRULESV1"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update bot rules. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast({
        title: "Validation Error",
        description: "Bot rules content cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    const newVersion = (parseFloat(version) + 0.1).toFixed(1);
    saveMutation.mutate({ content, version: newVersion });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load bot rules. Please check your permissions and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin")}
              className="text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-8 w-8 text-blue-600" />
                QBOT Rules Editor
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Edit QBOTRULESV1.md - Changes apply immediately to the live bot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Clock className="h-3 w-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
            <Badge variant={botRule?.status === 'active' ? 'default' : 'secondary'}>
              {botRule?.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
              {botRule?.status || 'Unknown'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Metadata Card */}
      {botRule && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{botRule.name}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Version</p>
                <p className="text-gray-900 dark:text-white">{botRule.version}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Category</p>
                <p className="text-gray-900 dark:text-white">{botRule.category}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(botRule.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor Card */}
      <Card>
        <CardHeader>
          <CardTitle>QBOTRULESV1.md Content</CardTitle>
          <CardDescription>
            Edit the complete bot rules document. Changes will be automatically applied to QBOT behavior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Enter QBOT rules content..."
              className="min-h-[600px] font-mono text-sm"
              disabled={saveMutation.isPending}
            />
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {content.length.toLocaleString()} characters
                {hasChanges && " • Unsaved changes"}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saveMutation.isPending || !content.trim()}
                  className="flex items-center gap-2"
                >
                  {saveMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Changes to bot rules will immediately affect QBOT behavior. 
          Test thoroughly before saving critical updates. All changes are versioned and tracked.
        </AlertDescription>
      </Alert>
    </div>
  );
}