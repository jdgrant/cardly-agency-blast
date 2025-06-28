import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Expanded template data with all 40 uploaded images
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
  },
  {
    id: 'template-11',
    name: 'Merry & Bright Snowflakes',
    description: 'Elegant beige design with blue snowflakes',
    preview_url: '/lovable-uploads/449019ff-fa63-4453-b187-dea0a98ce376.png'
  },
  {
    id: 'template-12',
    name: 'Happy Holidays Snowfall',
    description: 'Festive pattern with colorful snowflakes',
    preview_url: '/lovable-uploads/fba644eb-03c7-4308-a943-9e6173a3a619.png'
  },
  {
    id: 'template-13',
    name: 'Ho Ho Ho',
    description: 'Playful winter design with snowflake border',
    preview_url: '/lovable-uploads/7c0d16e0-6f2f-4003-85bf-78acd04feab3.png'
  },
  {
    id: 'template-14',
    name: 'Christmas Penguin',
    description: 'Cute penguin with Christmas lights',
    preview_url: '/lovable-uploads/3fc9d0d1-5cda-41e1-a1c5-edc35642161b.png'
  },
  {
    id: 'template-15',
    name: 'Holiday Bear',
    description: 'Adorable bear in festive winter sweater',
    preview_url: '/lovable-uploads/5f758811-9dad-4b62-a29c-4977b7cf1129.png'
  },
  {
    id: 'template-16',
    name: 'Santa & Reindeer',
    description: 'Classic Santa with reindeer in winter scene',
    preview_url: '/lovable-uploads/6544f16d-4367-4130-ac09-a7304e0da5b4.png'
  },
  {
    id: 'template-17',
    name: 'Be Merry & Bright',
    description: 'Cheerful yellow design with festive berries',
    preview_url: '/lovable-uploads/49b49a47-9cb3-4dea-9681-99c431cdd9d4.png'
  },
  {
    id: 'template-18',
    name: 'Warm Wishes',
    description: 'Cozy orange design with holiday foliage',
    preview_url: '/lovable-uploads/b86b6ae0-bf14-4082-b945-bfc374cf7e74.png'
  },
  {
    id: 'template-19',
    name: 'Happy Holidays Ornaments',
    description: 'Elegant design with ornaments and snowflakes',
    preview_url: '/lovable-uploads/475e2fdc-9459-4806-a636-860b23fa4b5e.png'
  },
  {
    id: 'template-20',
    name: 'Merry Christmas Classic',
    description: 'Traditional Christmas greeting with ornaments',
    preview_url: '/lovable-uploads/0df324f2-fca3-48e1-a7e4-f7654a0cd1e9.png'
  },
  {
    id: 'template-21',
    name: 'Festive Reindeer',
    description: 'Elegant coral design with festive reindeer and lights',
    preview_url: '/lovable-uploads/481f64e4-7c7d-4e01-8768-084a0a232a5e.png'
  },
  {
    id: 'template-22',
    name: 'Rainbow Christmas Tree',
    description: 'Modern colorful geometric Christmas tree',
    preview_url: '/lovable-uploads/16959889-806a-430a-ae8b-6662ce95c578.png'
  },
  {
    id: 'template-23',
    name: 'Geometric Tree',
    description: 'Contemporary design with geometric Christmas tree',
    preview_url: '/lovable-uploads/1000fb99-0e75-4bb8-adb0-a85765f7e6d6.png'
  },
  {
    id: 'template-24',
    name: 'Happy New Year Pattern',
    description: 'Modern geometric pattern with holiday elements',
    preview_url: '/lovable-uploads/8652e290-f200-4789-b27e-d2747903d8f1.png'
  },
  {
    id: 'template-25',
    name: 'Happy Holidays Snowflakes',
    description: 'Elegant design with colorful snowflakes and circles',
    preview_url: '/lovable-uploads/b4db1c44-92b9-4b31-8fec-222edd74055d.png'
  },
  {
    id: 'template-26',
    name: 'JOY Christmas',
    description: 'Bold typography design with Christmas tree',
    preview_url: '/lovable-uploads/a89d69ab-08ec-4590-8ba3-20745fa974db.png'
  },
  {
    id: 'template-27',
    name: 'Joy Geometric',
    description: 'Modern geometric pattern with JOY message',
    preview_url: '/lovable-uploads/9d4b655c-c736-4288-a943-2c47d864214c.png'
  },
  {
    id: 'template-28',
    name: 'Retro Holiday Tree',
    description: 'Vintage-style colorful Christmas tree design',
    preview_url: '/lovable-uploads/8215d3f7-b9fe-496a-a21b-5fd79f848ee1.png'
  },
  {
    id: 'template-29',
    name: 'Minimalist Christmas',
    description: 'Clean navy design with white Christmas trees',
    preview_url: '/lovable-uploads/1f9187dc-651f-4769-a1ae-bca2f0c56afe.png'
  },
  {
    id: 'template-30',
    name: 'Elegant Christmas',
    description: 'Sophisticated navy design with botanical elements',
    preview_url: '/lovable-uploads/23bc8fab-f523-47fa-9ccd-631ca48edc03.png'
  },
  {
    id: 'template-31',
    name: 'Ornament Elegance',
    description: 'Modern teal design with elegant Christmas ornaments',
    preview_url: '/lovable-uploads/c2c85a6a-4fe3-4b24-83d4-8bef51ef7320.png'
  },
  {
    id: 'template-32',
    name: 'Geometric Forest',
    description: 'Contemporary green design with geometric Christmas trees',
    preview_url: '/lovable-uploads/0012c4e2-7885-452f-ba85-b26ca8bc9ed3.png'
  },
  {
    id: 'template-33',
    name: 'Holiday Wildlife',
    description: 'Charming illustration with reindeer and winter gifts',
    preview_url: '/lovable-uploads/2461302f-36b5-4101-b3c8-7e81b104cea7.png'
  },
  {
    id: 'template-34',
    name: 'Be Jolly Santa',
    description: 'Whimsical Santa design with festive ornaments',
    preview_url: '/lovable-uploads/05ffd764-82f5-4b71-9cb0-adfd17483982.png'
  },
  {
    id: 'template-35',
    name: 'Holiday Deer Duo',
    description: 'Elegant design with decorative reindeer silhouettes',
    preview_url: '/lovable-uploads/57f72615-5a69-4cf7-8b9e-e0ee2e3c38bd.png'
  },
  {
    id: 'template-36',
    name: 'Festive Pattern',
    description: 'Vibrant green design with holiday symbols and stars',
    preview_url: '/lovable-uploads/573b7e1e-d99f-478e-aa39-4625e435cf44.png'
  },
  {
    id: 'template-37',
    name: 'Colorblock Holidays',
    description: 'Modern geometric pattern with bold holiday colors',
    preview_url: '/lovable-uploads/4d86837d-418d-49d0-a84d-c1865edeb7a5.png'
  },
  {
    id: 'template-38',
    name: 'Merry Typography',
    description: 'Bold typographic design with festive holly berries',
    preview_url: '/lovable-uploads/54056ed4-a5a4-4e89-b9e2-418cae36adbc.png'
  },
  {
    id: 'template-39',
    name: 'Classic Ornaments',
    description: 'Traditional design with hanging Christmas ornaments',
    preview_url: '/lovable-uploads/c89f658a-8076-4240-ba9f-c182b4505552.png'
  },
  {
    id: 'template-40',
    name: 'Wishing You Joy',
    description: 'Elegant green design with holly berries and festive script',
    preview_url: '/lovable-uploads/763fd7b1-12ad-48c4-88f4-fc21d684a8b9.png'
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
