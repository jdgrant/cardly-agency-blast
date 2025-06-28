
import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const templates = [
  { id: 'winter-wonderland', name: 'Winter Wonderland', preview: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&h=400&fit=crop' },
  { id: 'festive-gold', name: 'Festive Gold', preview: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=300&h=400&fit=crop' },
  { id: 'modern-minimal', name: 'Modern Minimal', preview: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=400&fit=crop' },
  { id: 'classic-red', name: 'Classic Red', preview: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=400&fit=crop' },
  { id: 'snowy-pine', name: 'Snowy Pine', preview: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=400&fit=crop' },
  { id: 'elegant-navy', name: 'Elegant Navy', preview: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=400&fit=crop' },
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

  const selectedTemplate = templates.find(t => t.id === state.selectedTemplate);
  const previewTemplateData = templates.find(t => t.id === previewTemplate);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Holiday Card Template</h2>
        <p className="text-gray-600">Select a design that represents your agency perfectly</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {templates.map((template) => (
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
                  src={template.preview} 
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
                src={previewTemplateData.preview} 
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
