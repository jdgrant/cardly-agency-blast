import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackFBPixelEvent, FB_EVENTS } from '@/utils/facebookPixel';

export interface ClientRecord {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface Template {
  id: string;
  name: string;
  preview_url: string;
  description: string;
}

export interface PricingTier {
  name: string;
  quantity: number;
  regularPrice: number;
  earlyBirdPrice: number;
}

export interface WizardState {
  step: number;
  selectedTemplate: string | null;
  selectedMessage: string;
  customMessage: string;
  logo: File | null;
  logoUrl: string | null; // Add this field
  signature: File | null;
  signatureUrl: string | null; // Add this field
  signatureSelected: boolean;
  signaturePurchased: boolean; // Add this field to track signature upsell
  mailingWindow: string | null;
  shippingWindow: string | null;
  postageOption: 'standard' | 'first-class';
  selectedTier: PricingTier | null;
  clientList: ClientRecord[];
  csvFile: File | null;
  earlyBirdActive: boolean;
  promoCode: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress: string;
  returnAddressName: string;
  returnAddressLine1: string;
  returnAddressLine2: string;
  returnAddressCity: string;
  returnAddressState: string;
  returnAddressZip: string;
}

interface WizardContextType {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
  clearSession: () => void;
  pricingTiers: PricingTier[];
}

const pricingTiers: PricingTier[] = [
  { name: 'Starter', quantity: 250, regularPrice: 750, earlyBirdPrice: 750 }, // $3 per card, no sale
  { name: 'Growth', quantity: 500, regularPrice: 1500, earlyBirdPrice: 1275 }, // $3 regular, $2.55 sale
  { name: 'Agency Elite', quantity: 1000, regularPrice: 2500, earlyBirdPrice: 2130 }, // $2.50 regular, $2.13 sale
  { name: 'Agency Pro', quantity: 2000, regularPrice: 4500, earlyBirdPrice: 3820 }, // $2.25 regular, $1.91 sale
];

const initialState: WizardState = {
  step: 1,
  selectedTemplate: null,
  selectedMessage: '',
  customMessage: '',
  logo: null,
  logoUrl: null, // Add this field
  signature: null,
  signatureUrl: null, // Add this field
  signatureSelected: false,
  signaturePurchased: false, // Add this field
  mailingWindow: null,
  shippingWindow: null,
  postageOption: 'standard',
  selectedTier: null,
  clientList: [],
  csvFile: null,
  earlyBirdActive: true,
  promoCode: '',
  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  billingAddress: '',
  returnAddressName: '',
  returnAddressLine1: '',
  returnAddressLine2: '',
  returnAddressCity: '',
  returnAddressState: '',
  returnAddressZip: '',
};

const STORAGE_KEY = 'sendyourcards-wizard-session';

// Helper functions for session persistence
const saveSessionToStorage = (state: WizardState) => {
  try {
    // Only save if user has made meaningful progress (past step 1 or has selections)
    if (state.step > 1 || state.selectedTemplate || state.selectedMessage || state.logo || state.signature) {
      const sessionData = {
        ...state,
        // Don't persist file objects, only file names/flags
        logo: state.logo ? 'uploaded' : null,
        signature: state.signature ? 'uploaded' : null,
        csvFile: state.csvFile ? 'uploaded' : null,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    }
  } catch (error) {
    console.warn('Failed to save wizard session:', error);
  }
};

const loadSessionFromStorage = (): WizardState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sessionData = JSON.parse(stored);
      // Check if session is less than 7 days old
      const daysSinceCreation = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        // Convert back file flags to null since actual files can't be persisted
        return {
          ...sessionData,
          logo: null,
          logoUrl: sessionData.logoUrl || null, // Preserve storage URLs
          signature: null,
          signatureUrl: sessionData.signatureUrl || null, // Preserve storage URLs
          csvFile: null
        };
      }
    }
  } catch (error) {
    console.warn('Failed to load wizard session:', error);
  }
  return null;
};

const clearSessionFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear wizard session:', error);
  }
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WizardState>(initialState);
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('wizard_session_id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('wizard_session_id', newId);
    return newId;
  });

  // Track wizard session in database
  useEffect(() => {
    const trackSession = async () => {
      try {
        const { data: existingSession } = await supabase
          .from('wizard_sessions')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (!existingSession && state.step === 1) {
          // Create new session
          await supabase.from('wizard_sessions').insert({
            session_id: sessionId,
            current_step: 1,
          });
          
          // Track InitiateCheckout when wizard starts
          trackFBPixelEvent(FB_EVENTS.INITIATE_CHECKOUT, {
            content_category: 'greeting_cards',
            content_name: 'wizard_started',
          });
        }
      } catch (error) {
        console.error('Error tracking wizard session:', error);
      }
    };

    trackSession();
  }, [sessionId, state.step]);

  // Load saved session on mount and parse URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPromoCode = urlParams.get('promo') || urlParams.get('promocode');
    
    const savedSession = loadSessionFromStorage();
    if (savedSession) {
      // If there's a URL promo code, prioritize it over saved session
      if (urlPromoCode) {
        setState({ ...savedSession, promoCode: urlPromoCode });
      } else {
        setState(savedSession);
      }
    } else if (urlPromoCode) {
      // No saved session but URL has promo code
      setState({ ...initialState, promoCode: urlPromoCode });
    }
  }, []);

  // Save session whenever state changes
  useEffect(() => {
    saveSessionToStorage(state);
    
    // Update database session
    if (state.step > 1) {
      (async () => {
        try {
          await supabase
            .from('wizard_sessions')
            .update({
              current_step: state.step,
              template_selected: state.selectedTemplate || null,
              user_email: state.contactEmail || null,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId);
          
          // Track ViewContent for step progression
          trackFBPixelEvent(FB_EVENTS.VIEW_CONTENT, {
            content_name: `wizard_step_${state.step}`,
            content_category: 'greeting_cards',
          });
        } catch (error) {
          console.error('Error updating wizard session:', error);
        }
      })();
    }
  }, [state, sessionId]);

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 7) }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  };

  const resetWizard = () => {
    setState(initialState);
    clearSessionFromStorage();
    
    // Mark session as abandoned in database
    (async () => {
      try {
        await supabase
          .from('wizard_sessions')
          .update({ abandoned_at: new Date().toISOString() })
          .eq('session_id', sessionId);
        console.log('Session marked as abandoned');
      } catch (error) {
        console.error('Error marking session as abandoned:', error);
      }
    })();
  };

  const clearSession = () => {
    clearSessionFromStorage();
  };

  return (
    <WizardContext.Provider value={{ 
      state, 
      updateState, 
      nextStep, 
      prevStep, 
      resetWizard,
      clearSession,
      pricingTiers
    }}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};
