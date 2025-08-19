import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail } from 'lucide-react';
import { useWizardSession } from '@/hooks/useWizardSession';

export const CartIcon: React.FC = () => {
  const { hasActiveSession, step, progress } = useWizardSession();

  if (!hasActiveSession) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/wizard">
            <Button 
              variant="outline" 
              size="sm" 
              className="relative p-2 hover:bg-emerald-50 border-emerald-200"
            >
              <Mail className="w-5 h-5 text-emerald-600" />
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-emerald-600 text-white border-2 border-white"
              >
                1
              </Badge>
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-white border border-gray-200 shadow-lg">
          <div className="p-2 text-sm">
            <p className="font-medium text-gray-900">Active Card Project</p>
            <p className="text-gray-600">Step {step} of 7 • {Math.round(progress)}% complete</p>
            <p className="text-emerald-600 mt-1">Click to continue</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};