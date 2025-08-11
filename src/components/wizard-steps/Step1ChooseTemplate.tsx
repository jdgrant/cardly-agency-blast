import React, { useState, useEffect } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { fetchTemplates, Template } from '@/services/templatesService';

// Define occasions
const occasions = [
  { id: 'christmas', label: 'Christmas', color: 'bg-red-100 text-red-800' },
  { id: 'hanukkah', label: 'Hanukkah', color: 'bg-blue-100 text-blue-800' },
  { id: 'kwanzaa', label: 'Kwanzaa', color: 'bg-green-100 text-green-800' },
  { id: 'new-year', label: 'New Year', color: 'bg-purple-100 text-purple-800' },
  { id: 'holidays', label: 'General Holidays', color: 'bg-orange-100 text-orange-800' }
];

const Step1ChooseTemplate = () => {
  const { state, updateState, nextStep } = useWizard();
  const { toast } = useToast();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    occasions.map(o => o.id) // All occasions selected by default
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const templatesData = await fetchTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: "Error loading templates",
          description: "Failed to load templates. Using fallback templates.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [toast]);

  const handleTemplateSelect = (templateId: string) => {
    updateState({ selectedTemplate: templateId });
    // Automatically advance to next step when template is selected
    setTimeout(() => {
      nextStep();
    }, 300); // Small delay to show selection feedback
  };

  const handleOccasionToggle = (occasionId: string) => {
    setSelectedOccasions(prev => 
      prev.includes(occasionId) 
        ? prev.filter(id => id !== occasionId)
        : [...prev, occasionId]
    );
  };

  // Filter templates based on selected occasions
  const filteredTemplates = templates.filter(template => 
    template.occasions.some(occasion => selectedOccasions.includes(occasion))
  );

  const selectedTemplate = templates.find(t => t.id === state.selectedTemplate);
  const previewTemplateData = templates.find(t => t.id === previewTemplate);

  if (loading) {
    return (
      <div className="space-y-6 bg-white">
        <div className="text-center mb-8 bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Greeting Card Template</h2>
          <p className="text-gray-600">Loading templates...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="cursor-pointer hover:shadow-lg transition-shadow animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-gray-200 rounded-t-lg"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      <div className="text-center mb-8 bg-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Greeting Card Template</h2>
        <p className="text-gray-600">Select a design that represents your agency perfectly</p>
      </div>

      {/* Occasion Filter */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Occasion</h3>
        <div className="flex flex-wrap gap-4">
          {occasions.map((occasion) => (
            <div key={occasion.id} className="flex items-center space-x-2">
              <Checkbox
                id={occasion.id}
                checked={selectedOccasions.includes(occasion.id)}
                onCheckedChange={() => handleOccasionToggle(occasion.id)}
              />
              <label 
                htmlFor={occasion.id} 
                className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${occasion.color}`}
              >
                {occasion.label}
              </label>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Showing {filteredTemplates.length} templates
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg bg-white border border-gray-200 ${
              state.selectedTemplate === template.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardContent className="p-0 bg-white">
              <div className="relative bg-white">
                <img 
                  src={template.preview_url} 
                  alt={template.name}
                  className="w-full h-48 object-cover rounded-t-lg bg-white"
                  style={{ backgroundColor: 'white' }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm border border-gray-200"
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
              <div className="p-4 bg-white border-t border-gray-100">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.occasions.map(occasionId => {
                    const occasion = occasions.find(o => o.id === occasionId);
                    return occasion ? (
                      <span 
                        key={occasionId}
                        className={`px-2 py-1 rounded text-xs font-medium ${occasion.color}`}
                      >
                        {occasion.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader className="bg-white">
            <DialogTitle>{previewTemplateData?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplateData && (
            <div className="flex justify-center bg-white p-4 rounded-lg">
              <img 
                src={previewTemplateData.preview_url} 
                alt={previewTemplateData.name}
                className="max-w-full h-auto rounded-lg"
                style={{ backgroundColor: 'white' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Step1ChooseTemplate;
