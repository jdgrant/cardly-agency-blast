
import React, { useState, useEffect } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Edit3, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTemplateById } from '@/services/templatesService';

// Message data organized by occasion
const messagesByOccasion = {
  christmas: [
    "Wishing you a joyful Christmas wrapped in love and laughter.",
    "May your home be filled with the peace and wonder of Christmas.",
    "Here's to warm cocoa, bright lights, and cherished memories.",
    "Merry Christmas! May the season bring comfort and joy to your heart.",
    "May every ornament on your tree hold a happy memory.",
    "Sending you holiday hugs and Christmas cheer across the miles.",
    "May this Christmas be a peaceful pause in a busy world.",
    "Joy, love, and laughter—may your days be full of them this Christmas.",
    "Hope your Christmas is as magical as the first snowfall of the season.",
    "Wishing you and yours all the blessings of this beautiful season."
  ],
  hanukkah: [
    "Wishing you eight bright nights filled with joy and meaning.",
    "May the lights of Hanukkah bring warmth to your heart and home.",
    "Chag Sameach! Celebrate with love, laughter, and light.",
    "May each candle shine a little hope into your world.",
    "Sending love and blessings your way this Festival of Lights."
  ],
  kwanzaa: [
    "Wishing you a Kwanzaa rich with heritage, unity, and purpose.",
    "May the seven principles inspire you throughout the year.",
    "Joyous Kwanzaa! Celebrate culture, family, and community.",
    "Lighting the candles of reflection, resilience, and renewal.",
    "Here's to a meaningful celebration and a hopeful tomorrow."
  ],
  'new-year': [
    "Cheers to a year of possibility, progress, and peace.",
    "May 2026 bring fresh energy and bold new beginnings.",
    "Wishing you health, happiness, and all good things in the new year.",
    "Here's to new goals, new dreams, and new adventures.",
    "May your year ahead be full of little joys and big wins."
  ],
  holidays: [
    "Warmest wishes for a joyful and restful holiday season.",
    "However you celebrate, may it be filled with love and light.",
    "Sending peace, joy, and hope to you this holiday season.",
    "Wishing you a season of stillness, sweetness, and celebration.",
    "May your holidays be filled with meaning, connection, and cheer.",
    "Happy Holidays! May each day be wrapped in kindness and comfort.",
    "Here's to shared stories, good food, and brighter days ahead.",
    "From our hearts to yours, wishing you a beautiful holiday season.",
    "Sending a little extra warmth your way this season.",
    "May your holidays bring calm to your soul and joy to your spirit."
  ]
};

const occasionLabels = {
  christmas: { label: 'Christmas', emoji: '🎄', color: 'bg-red-100 text-red-800' },
  hanukkah: { label: 'Hanukkah', emoji: '🕎', color: 'bg-blue-100 text-blue-800' },
  kwanzaa: { label: 'Kwanzaa', emoji: '🧧', color: 'bg-green-100 text-green-800' },
  'new-year': { label: 'New Year', emoji: '🎉', color: 'bg-purple-100 text-purple-800' },
  holidays: { label: 'General Holiday', emoji: '❄️', color: 'bg-orange-100 text-orange-800' }
};

const Step2SelectMessage = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();
  const { toast } = useToast();
  const [isCustom, setIsCustom] = useState(false);
  const [availableOccasions, setAvailableOccasions] = useState<string[]>([]);

  // Get the selected template and its occasions
  useEffect(() => {
    const loadTemplate = async () => {
      if (state.selectedTemplate) {
        // Find the template and get its occasions
        const template = await getTemplateById(state.selectedTemplate);
        if (template) {
          const normalize = (arr: string[]) => {
            const set = new Set<string>();
            arr.forEach((item) => {
              const key = (item || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/_/g, '-');
              if (key === 'general-holiday' || key === 'holiday' || key === 'holidays') {
                set.add('holidays');
              } else if (key === 'new-year' || key === 'newyear') {
                set.add('new-year');
              } else {
                set.add(key);
              }
            });
            return Array.from(set).filter((k) => Object.prototype.hasOwnProperty.call(messagesByOccasion, k));
          };
          setAvailableOccasions(normalize(template.occasions || ['holidays']));
        }
      }
    };
    loadTemplate();
  }, [state.selectedTemplate]);

  const handleMessageSelect = (message: string) => {
    updateState({ selectedMessage: message });
    setIsCustom(false);
    // Auto-advance to next step after selecting a message
    setTimeout(() => {
      nextStep();
    }, 300);
  };

  const handleCustomMessageChange = (message: string) => {
    updateState({ customMessage: message, selectedMessage: '' });
  };

  const handleResetToPreset = () => {
    setIsCustom(false);
    updateState({ customMessage: '', selectedMessage: '' });
  };

  const getCurrentMessage = () => {
    return isCustom ? state.customMessage : state.selectedMessage;
  };

  const canContinue = () => {
    return isCustom ? state.customMessage.trim().length > 0 : state.selectedMessage.length > 0;
  };

  const handleContinue = () => {
    if (!canContinue()) {
      toast({
        title: "Message Required",
        description: "Please select a pre-written message or enter your own custom message to continue.",
        variant: "destructive"
      });
      return;
    }
    nextStep();
  };

  // Get selected template for preview
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  useEffect(() => {
    const loadSelectedTemplate = async () => {
      if (state.selectedTemplate) {
        const template = await getTemplateById(state.selectedTemplate);
        setSelectedTemplate(template);
      }
    };
    loadSelectedTemplate();
  }, [state.selectedTemplate]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Card Message</h2>
        <p className="text-gray-600">Choose a pre-written message or create your own personal greeting</p>
      </div>

      {/* Occasion Display */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {availableOccasions.map(occasion => {
          const info = occasionLabels[occasion as keyof typeof occasionLabels];
          return info ? (
            <Badge key={occasion} className={`${info.color} text-sm font-medium`}>
              {info.emoji} {info.label}
            </Badge>
          ) : null;
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Template Preview - Left Side - Much Smaller */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selected Template</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-3">
                  <div className="aspect-[3/4] max-w-48 mx-auto overflow-hidden rounded-lg border bg-gray-50">
                    <img 
                      src={selectedTemplate.preview_url} 
                      alt={selectedTemplate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 text-sm">{selectedTemplate.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{selectedTemplate.description}</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] max-w-48 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No template selected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Selection - Right Side - Takes up more space */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pre-written Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Choose a Message</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea type="always" scrollHideDelay={0} className="h-64 pr-4">
                <div className="space-y-4">
                  {availableOccasions.map(occasion => {
                  const messages = messagesByOccasion[occasion as keyof typeof messagesByOccasion] || [];
                  const info = occasionLabels[occasion as keyof typeof occasionLabels];
                  
                  return (
                    <div key={occasion} className="space-y-3">
                      {info && (
                        <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                          <span>{info.emoji}</span>
                          <span>{info.label}</span>
                        </h4>
                      )}
                      <div className="space-y-2">
                        {messages.map((message, index) => (
                          <div
                            key={`${occasion}-${index}`}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              state.selectedMessage === message && !isCustom
                                ? 'border-blue-500 bg-blue-50 text-blue-900'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => handleMessageSelect(message)}
                          >
                            <p className="text-sm leading-relaxed">{message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Custom Message Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-5 h-5" />
                  <span>Custom Message</span>
                </div>
                {isCustom && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToPreset}
                    className="flex items-center space-x-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Write your own personal message here..."
                  value={state.customMessage}
                  onChange={(e) => {
                    handleCustomMessageChange(e.target.value);
                    setIsCustom(true);
                  }}
                  className="min-h-32 text-sm leading-relaxed"
                />
                <div className="text-xs text-gray-500">
                  {state.customMessage.length}/500 characters
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Preview */}
      {getCurrentMessage() && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">Message Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <p className="text-gray-800 leading-relaxed text-center italic">
                "{getCurrentMessage()}"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          className="text-white"
          style={{ backgroundColor: '#069668' }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step2SelectMessage;
