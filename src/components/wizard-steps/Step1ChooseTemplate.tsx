
import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Mock template data using the uploaded images
const mockTemplates = [
  {
    id: 'template-1',
    name: 'Classic Christmas',
    description: 'Traditional red and white Christmas design',
    preview_url: '/lovable-uploads/0e09068d-0fb0-4584-b970-36402e4bfbca.png'
  },
  {
    id: 'template-2',
    name: 'Happy Holidays',
    description: 'Festive blue and red holiday pattern',
    preview_url: '/lovable-uploads/8584b492-9272-4478-90fb-dd4c4c855270.png'
  },
  {
    id: 'template-3',
    name: 'Winter Snowflakes',
    description: 'Elegant red background with snowflakes',
    preview_url: '/lovable-uploads/f721400e-9a73-496e-b8f9-e549240a3ffa.png'
  },
  {
    id: 'template-4',
    name: 'Santa Pattern',
    description: 'Fun geometric pattern with Santa faces',
    preview_url: '/lovable-uploads/754635ac-6b1d-4205-8836-d362e9d77ffd.png'
  },
  {
    id: 'template-5',
    name: 'Modern Trees',
    description: 'Contemporary Christmas tree design',
    preview_url: '/lovable-uploads/f268f327-cd21-4cd4-ac86-6f844c77f6ae.png'
  },
  {
    id: 'template-6',
    name: 'Holly Jolly',
    description: 'Split design with decorative elements',
    preview_url: '/lovable-uploads/bfe3ad13-f658-486a-9f72-1c7f74255b7c.png'
  },
  {
    id: 'template-7',
    name: 'Festive Dots',
    description: 'Clean holiday design with dotted text',
    preview_url: '/lovable-uploads/93254d6d-926a-4d11-9572-27ea043566fe.png'
  },
  {
    id: 'template-8',
    name: 'Winter Story',
    description: 'Blue winter scene with Christmas tree',
    preview_url: '/lovable-uploads/ab3b378f-82b6-41fb-ab61-0ccefe9be59e.png'
  },
  {
    id: 'template-9',
    name: 'Modern Navy',
    description: 'Sophisticated navy design with abstract elements',
    preview_url: '/lovable-uploads/359ed24a-2e1b-4f5b-a30a-b18384ab769c.png'
  },
  {
    id: 'template-10',
    name: 'Merry & Bright',
    description: 'Light background with snowflake border',
    preview_url: '/lovable-uploads/ccbe10cf-f23b-4d46-97d1-880e5cccbc8a.png'
  }
];

const Step1ChooseTemplate = () => {
  const { state, updateState, nextStep } = useWizard();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    updateState({ selectedTemplate: templateId });
  };

  const handleContinue = () => {
    if (state.selectedTemplate) {
      nextStep();
    }
  };

  const selectedTemplate = mockTemplates.find(t => t.id === state.selectedTemplate);
  const previewTemplateData = mockTemplates.find(t => t.id === previewTemplate);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Holiday Card Template</h2>
        <p className="text-gray-600">Select a design that represents your agency perfectly</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {mockTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              state.selectedTemplate === template.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardContent className="p-0">
              <div className="relative">
                <img 
                  src={template.preview_url} 
                  alt={template.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(template.id);
                  }}
                >
                  Preview
                </Button>
                {state.selectedTemplate === template.id && (
                  <div className="absolute inset-0 bg-blue-500/20 rounded-t-lg flex items-center justify-center">
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Selected
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <div></div>
        <Button 
          onClick={handleContinue}
          disabled={!state.selectedTemplate}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplateData?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplateData && (
            <div className="flex justify-center">
              <img 
                src={previewTemplateData.preview_url} 
                alt={previewTemplateData.name}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Step1ChooseTemplate;
