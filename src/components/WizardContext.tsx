
import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  logo: File | null;
  signature: File | null;
  mailingWindow: string | null;
  postageOption: 'standard' | 'first-class';
  selectedTier: PricingTier | null;
  clientList: ClientRecord[];
  csvFile: File | null;
  earlyBirdActive: boolean;
}

interface WizardContextType {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
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
  logo: null,
  signature: null,
  mailingWindow: null,
  postageOption: 'standard',
  selectedTier: null,
  clientList: [],
  csvFile: null,
  earlyBirdActive: true, // Hardcoded as requested
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WizardState>(initialState);

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 6) }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  };

  const resetWizard = () => {
    setState(initialState);
  };

  return (
    <WizardContext.Provider value={{ 
      state, 
      updateState, 
      nextStep, 
      prevStep, 
      resetWizard,
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
