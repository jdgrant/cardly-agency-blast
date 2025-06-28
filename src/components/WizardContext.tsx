
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ClientRecord {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface WizardState {
  step: number;
  selectedTemplate: string | null;
  clientList: ClientRecord[];
  csvFile: File | null;
  logo: File | null;
  signature: File | null;
  shippingWindow: string | null;
  promoCode: string;
}

interface WizardContextType {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
}

const initialState: WizardState = {
  step: 1,
  selectedTemplate: null,
  clientList: [],
  csvFile: null,
  logo: null,
  signature: null,
  shippingWindow: null,
  promoCode: '',
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WizardState>(initialState);

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 5) }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  };

  const resetWizard = () => {
    setState(initialState);
  };

  return (
    <WizardContext.Provider value={{ state, updateState, nextStep, prevStep, resetWizard }}>
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
