import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Save, AlertTriangle, CheckCircle, Settings, ArrowLeft, RefreshCw } from "lucide-react";

interface SystemConfig {
  config_key: string;
  config_value: string;
  description: string;
  value_type: string;
  updated_by?: string;
  updated_at?: string;
}

export default function TokenLimitsAdmin() {
  const [minTokens, setMinTokens] = useState<number>(10);
  const [maxTokens, setMaxTokens] = useState<number>(20);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current token limit configurations
  const { data: configs, isLoading, error } = useQuery<SystemConfig[]>({
    queryKey: ["/api/admin/config"],
    retry: 1,
  });

  // Update state when data loads
  useEffect(() => {
    if (configs && configs.length > 0) {
      const minConfig = configs.find(c => c.config_key === 'free_user_min_tokens');
      const maxConfig = configs.find(c => c.config_key === 'free_user_max_tokens');
      
      if (minConfig) {
        setMinTokens(parseInt(minConfig.config_value) || 10);
      }
      if (maxConfig) {
        setMaxTokens(parseInt(maxConfig.config_value) || 20);
      }
      
      setIsInitialized(minConfig !== undefined && maxConfig !== undefined);
      setHasChanges(false);
    }
  }, [configs]);

  // Initialize default configurations
  const initDefaultsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/config/init-defaults", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Defaults Initialized",
        description: "Default token limit configurations have been created successfully.",
      });
      setIsInitialized(true);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize default configurations.",
        variant: "destructive",
      });
    },
  });

  // Save token limits mutation
  const saveMinTokensMutation = useMutation({
    mutationFn: async (value: number) => {
      return await apiRequest("/api/admin/config/free_user_min_tokens", "PUT", {
        value: value.toString(),
        description: "Minimum word count for free user responses",
        valueType: "number"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save minimum token limit.",
        variant: "destructive",
      });
    },
  });

  const saveMaxTokensMutation = useMutation({
    mutationFn: async (value: number) => {
      return await apiRequest("/api/admin/config/free_user_max_tokens", "PUT", {
        value: value.toString(),
        description: "Maximum word count for free user responses",
        valueType: "number"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save maximum token limit.",
        variant: "destructive",
      });
    },
  });

  const handleMinTokensChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setMinTokens(numValue);
    setHasChanges(true);
  };

  const handleMaxTokensChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setMaxTokens(numValue);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!validateInput()) return;

    try {
      await Promise.all([
        saveMinTokensMutation.mutateAsync(minTokens),
        saveMaxTokensMutation.mutateAsync(maxTokens)
      ]);

      toast({
        title: "Token Limits Updated",
        description: `Free user responses will now be limited to ${minTokens}-${maxTokens} words.`,
      });
      
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
    } catch (error) {
      console.error("Failed to save token limits:", error);
    }
  };

  const validateInput = (): boolean => {
    if (minTokens <= 0 || maxTokens <= 0) {
      toast({
        title: "Validation Error",
        description: "Token limits must be positive numbers.",
        variant: "destructive",
      });
      return false;
    }

    if (minTokens >= maxTokens) {
      toast({
        title: "Validation Error",
        description: "Minimum tokens must be less than maximum tokens.",
        variant: "destructive",
      });
      return false;
    }

    if (maxTokens > 200) {
      toast({
        title: "Validation Warning",
        description: "Very high token limits may impact premium subscription value.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const isPending = saveMinTokensMutation.isPending || saveMaxTokensMutation.isPending;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin")}
            className="text-gray-600 hover:text-navy"
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              Token Limit Configuration
            </h1>
            <p className="text-gray-600 mt-1">
              Manage word count limits for free user responses
            </p>
          </div>
        </div>

        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Settings className="w-3 h-3 mr-1" />
          Admin Config
        </Badge>
      </div>

      {/* Initialization Notice */}
      {!isInitialized && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <span>
                Token limit configurations need to be initialized. Click the button to create default settings.
              </span>
              <Button
                onClick={() => initDefaultsMutation.mutate()}
                disabled={initDefaultsMutation.isPending}
                size="sm"
                className="ml-4 bg-orange-600 hover:bg-orange-700"
                data-testid="button-init-defaults"
              >
                {initDefaultsMutation.isPending ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 mr-1" />
                )}
                Initialize Defaults
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Configuration Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Free User Response Limits
          </CardTitle>
          <CardDescription>
            Configure the word count range for responses shown to free users. 
            Premium users will always receive full, unlimited responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Limit Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="minTokens" className="text-sm font-medium text-gray-700">
                Minimum Words
              </Label>
              <Input
                id="minTokens"
                type="number"
                value={minTokens}
                onChange={(e) => handleMinTokensChange(e.target.value)}
                min="1"
                max="100"
                className="text-center font-mono text-lg"
                placeholder="10"
                data-testid="input-min-tokens"
              />
              <p className="text-xs text-gray-500">
                Minimum word count for free user responses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens" className="text-sm font-medium text-gray-700">
                Maximum Words
              </Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => handleMaxTokensChange(e.target.value)}
                min="1"
                max="200"
                className="text-center font-mono text-lg"
                placeholder="20"
                data-testid="input-max-tokens"
              />
              <p className="text-xs text-gray-500">
                Maximum word count for free user responses
              </p>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Current Settings Preview</h4>
            <p className="text-sm text-gray-600">
              Free users will receive responses limited to approximately{" "}
              <Badge variant="secondary" className="mx-1">
                {Math.round((minTokens + maxTokens) / 2)} words
              </Badge>
              (range: {minTokens}-{maxTokens} words)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Responses will be truncated with an upgrade prompt for premium subscription.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const minConfig = configs?.find(c => c.config_key === 'free_user_min_tokens');
                  const maxConfig = configs?.find(c => c.config_key === 'free_user_max_tokens');
                  setMinTokens(parseInt(minConfig?.config_value || '10'));
                  setMaxTokens(parseInt(maxConfig?.config_value || '20'));
                  setHasChanges(false);
                }}
                disabled={!hasChanges || isPending}
                data-testid="button-reset"
              >
                Reset
              </Button>

              <Button
                onClick={handleSave}
                disabled={!hasChanges || isPending || !isInitialized}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-token-limits"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Token Limits
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Configuration Display */}
      {configs && configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Current System Configuration
            </CardTitle>
            <CardDescription>
              All token limit related configurations in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configs
                .filter(config => config.config_key.includes('token'))
                .map((config) => (
                  <div
                    key={config.config_key}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{config.config_key}</p>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-mono">
                        {config.config_value}
                      </Badge>
                      {config.updated_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Updated: {new Date(config.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notice */}
      <Alert className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Changes to token limits will immediately affect all AI responses for free users. 
          Ensure these limits balance user experience with premium subscription value. 
          Very low limits may frustrate users, while very high limits may reduce premium conversions.
        </AlertDescription>
      </Alert>
    </div>
  );
}