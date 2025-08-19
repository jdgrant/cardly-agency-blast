import { useState, useEffect } from 'react';

const STORAGE_KEY = 'sendyourcards-wizard-session';

export interface WizardSession {
  hasActiveSession: boolean;
  step: number;
  progress: number;
}

export const useWizardSession = (): WizardSession => {
  const [session, setSession] = useState<WizardSession>({
    hasActiveSession: false,
    step: 1,
    progress: 0
  });

  useEffect(() => {
    const checkSession = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const sessionData = JSON.parse(stored);
          // Check if session is less than 7 days old
          const daysSinceCreation = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60 * 24);
          if (daysSinceCreation < 7) {
            // Calculate progress based on step and data completeness
            let progress = (sessionData.step / 7) * 100;
            
            // Bonus progress for filled data
            if (sessionData.selectedTemplate) progress += 5;
            if (sessionData.selectedMessage) progress += 5;
            if (sessionData.logo === 'uploaded') progress += 5;
            if (sessionData.signature === 'uploaded') progress += 5;
            if (sessionData.mailingWindow) progress += 5;
            if (sessionData.clientList?.length > 0) progress += 10;
            
            setSession({
              hasActiveSession: true,
              step: sessionData.step,
              progress: Math.min(progress, 100)
            });
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to check wizard session:', error);
      }
      
      setSession({
        hasActiveSession: false,
        step: 1,
        progress: 0
      });
    };

    checkSession();
    
    // Listen for storage changes (in case multiple tabs)
    const handleStorageChange = () => checkSession();
    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically for changes
    const interval = setInterval(checkSession, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return session;
};