
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, AlertTriangle } from 'lucide-react';
import { useWizard } from '../WizardContext';

const PreLaunchChecklist = () => {
  const { state } = useWizard();

  const checklistItems = [
    {
      id: 'template',
      label: 'Template selected',
      completed: !!state.selectedTemplate,
      required: true
    },
    {
      id: 'message',
      label: 'Message selected or customized',
      completed: !!(state.selectedMessage || state.customMessage),
      required: true
    },
    {
      id: 'mailingWindow',
      label: 'Mailing window selected',
      completed: !!state.mailingWindow,
      required: true
    },
    {
      id: 'package',
      label: 'Package tier selected',
      completed: !!state.selectedTier,
      required: true
    },
    {
      id: 'clientList',
      label: 'Client list uploaded',
      completed: state.clientList.length > 0,
      required: true
    },
    {
      id: 'logo',
      label: 'Company logo uploaded',
      completed: !!state.logo,
      required: false
    },
    {
      id: 'signature',
      label: 'Signature added',
      completed: !!state.signature,
      required: false
    }
  ];

  const requiredItems = checklistItems.filter(item => item.required);
  const completedRequired = requiredItems.filter(item => item.completed).length;
  const allRequiredComplete = completedRequired === requiredItems.length;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>Pre-Launch Checklist</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          {allRequiredComplete ? 
            'All required items completed! You\'re ready to proceed.' : 
            `${completedRequired}/${requiredItems.length} required items completed`
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              <span className={`flex-1 ${item.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                {item.label}
                {!item.required && <span className="text-xs text-gray-500 ml-1">(optional)</span>}
              </span>
            </div>
          ))}
        </div>
        
        {!allRequiredComplete && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Complete all required items before submitting your order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreLaunchChecklist;
