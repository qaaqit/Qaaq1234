import { Circle, CircleDot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LEDIndicatorProps {
  matched: boolean;
  actualValue?: string;
  expectedValue?: string;
  size?: "sm" | "md" | "lg";
}

export default function LEDIndicator({ matched, actualValue, expectedValue, size = "md" }: LEDIndicatorProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const IconComponent = matched ? CircleDot : Circle;
  
  const tooltipContent = actualValue 
    ? `${matched ? '✓ Match' : '✗ No match'}: ${actualValue}${expectedValue ? ` (Required: ${expectedValue})` : ''}`
    : matched ? 'Specification met' : 'Specification not met';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <IconComponent
              className={cn(
                sizeClasses[size],
                "transition-colors",
                matched 
                  ? "text-green-500 fill-green-500" 
                  : "text-gray-400"
              )}
              data-testid={`led-indicator-${matched ? 'matched' : 'unmatched'}`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}