
import React from 'react';
import { WizardProvider } from '@/components/WizardContext';
import WizardContent from '@/components/WizardContent';

const Wizard = () => {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
};

export default Wizard;
