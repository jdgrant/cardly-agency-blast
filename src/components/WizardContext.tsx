
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  signature: File | null;
  signatureSelected: boolean;
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
  { name: 'Starter', quantity: 250, regularPrice: 750, earlyBirdPrice: 637.50 },
  { name: 'Growth', quantity: 500, regularPrice: 1375, earlyBirdPrice: 1168.75 },
  { name: 'Agency Elite', quantity: 1000, regularPrice: 2500, earlyBirdPrice: 2125 },
  { name: 'Agency Pro', quantity: 2000, regularPrice: 4500, earlyBirdPrice: 3825 },
];

const initialState: WizardState = {
  step: 1,
  selectedTemplate: null,
  selectedMessage: '',
  customMessage: '',
  logo: null,
  signature: null,
  signatureSelected: false,
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
          signature: null,
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

  // Load saved session on mount
  useEffect(() => {
    const savedSession = loadSessionFromStorage();
    if (savedSession) {
      setState(savedSession);
    }
  }, []);

  // Save session whenever state changes
  useEffect(() => {
    saveSessionToStorage(state);
  }, [state]);

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
