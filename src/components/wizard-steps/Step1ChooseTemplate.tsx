import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

// Define occasions
const occasions = [
  { id: 'christmas', label: 'Christmas', color: 'bg-red-100 text-red-800' },
  { id: 'hanukkah', label: 'Hanukkah', color: 'bg-blue-100 text-blue-800' },
  { id: 'kwanzaa', label: 'Kwanzaa', color: 'bg-green-100 text-green-800' },
  { id: 'new-year', label: 'New Year', color: 'bg-purple-100 text-purple-800' },
  { id: 'holidays', label: 'General Holidays', color: 'bg-orange-100 text-orange-800' }
];

// Export the template data so other steps can use it
export const mockTemplates = [
  {
    id: 'template-1',
    name: 'Classic Christmas',
    description: 'Traditional red and white Christmas design',
    preview_url: '/lovable-uploads/0e09068d-0fb0-4584-b970-36402e4bfbca.png',
    occasions: ['christmas']
  },
  {
    id: 'template-2',
    name: 'Happy Holidays',
    description: 'Festive blue and red holiday pattern',
    preview_url: '/lovable-uploads/8584b492-9272-4478-90fb-dd4c4c855270.png',
    occasions: ['holidays']
  },
  {
    id: 'template-3',
    name: 'Winter Snowflakes',
    description: 'Elegant red background with snowflakes',
    preview_url: '/lovable-uploads/f721400e-9a73-496e-b8f9-e549240a3ffa.png',
    occasions: ['christmas']
  },
  {
    id: 'template-4',
    name: 'Santa Pattern',
    description: 'Fun geometric pattern with Santa faces',
    preview_url: '/lovable-uploads/754635ac-6b1d-4205-8836-d362e9d77ffd.png',
    occasions: ['christmas']
  },
  {
    id: 'template-5',
    name: 'Modern Trees',
    description: 'Contemporary Christmas tree design',
    preview_url: '/lovable-uploads/f268f327-cd21-4cd4-ac86-6f844c77f6ae.png',
    occasions: ['christmas']
  },
  {
    id: 'template-6',
    name: 'Holly Jolly',
    description: 'Split design with decorative elements',
    preview_url: '/lovable-uploads/bfe3ad13-f658-486a-9f72-1c7f74255b7c.png',
    occasions: ['christmas']
  },
  {
    id: 'template-7',
    name: 'Festive Dots',
    description: 'Clean holiday design with dotted text',
    preview_url: '/lovable-uploads/93254d6d-926a-4d11-9572-27ea043566fe.png',
    occasions: ['holidays']
  },
  {
    id: 'template-8',
    name: 'Winter Story',
    description: 'Blue winter scene with Christmas tree',
    preview_url: '/lovable-uploads/3498a312-1399-4642-bbc1-23489b9bcc4d.png',
    occasions: ['christmas']
  },
  {
    id: 'template-9',
    name: 'Modern Navy',
    description: 'Sophisticated navy design with abstract elements',
    preview_url: '/lovable-uploads/359ed24a-2e1b-4f5b-a30a-b18384ab769c.png',
    occasions: ['holidays']
  },
  {
    id: 'template-11',
    name: 'Christmas Penguin',
    description: 'Cute penguin with Christmas lights',
    preview_url: '/lovable-uploads/c5aa71c0-e8a0-4223-bd76-40da834b1cdc.png',
    occasions: ['christmas']
  },
  {
    id: 'template-12',
    name: 'Happy Holidays Snowfall',
    description: 'Festive pattern with colorful snowflakes',
    preview_url: '/lovable-uploads/fba644eb-03c7-4308-a943-9e6173a3a619.png',
    occasions: ['holidays']
  },
  {
    id: 'template-13',
    name: 'Ho Ho Ho',
    description: 'Playful winter design with snowflake border',
    preview_url: '/lovable-uploads/7c0d16e0-6f2f-4003-85bf-78acd04feab3.png',
    occasions: ['christmas']
  },
  {
    id: 'template-14',
    name: 'Holiday Bear',
    description: 'Adorable bear in festive winter sweater',
    preview_url: '/lovable-uploads/f6fcf785-4b5f-472b-85c9-0c9bc03b95a2.png',
    occasions: ['holidays']
  },
  {
    id: 'template-15',
    name: 'Santa & Reindeer',
    description: 'Classic Santa with reindeer in winter scene',
    preview_url: '/lovable-uploads/35a20383-2af5-4567-a9de-61e8f9e5769c.png',
    occasions: ['christmas']
  },
  {
    id: 'template-16',
    name: 'Be Merry & Bright',
    description: 'Cheerful yellow design with festive berries',
    preview_url: '/lovable-uploads/be90f913-fa55-4d78-9b89-3989c0493ee3.png',
    occasions: ['christmas']
  },
  {
    id: 'template-17',
    name: 'Warm Wishes',
    description: 'Cozy orange design with holiday foliage',
    preview_url: '/lovable-uploads/9f51f7b4-3bb5-443c-b549-3e169e01204e.png',
    occasions: ['holidays']
  },
  {
    id: 'template-18',
    name: 'Happy Holidays Ornaments',
    description: 'Elegant design with ornaments and snowflakes',
    preview_url: '/lovable-uploads/66db12bd-1d65-4797-a8c0-dd1e77b1aa31.png',
    occasions: ['holidays']
  },
  {
    id: 'template-19',
    name: 'Merry Christmas Classic',
    description: 'Traditional Christmas greeting with ornaments',
    preview_url: '/lovable-uploads/3d89fde9-f969-40b2-942f-4f8416e3accc.png',
    occasions: ['christmas']
  },
  {
    id: 'template-20',
    name: 'Festive Reindeer',
    description: 'Elegant coral design with festive reindeer and lights',
    preview_url: '/lovable-uploads/cf4deb7e-b260-41ed-bc93-7c9f3b69a6b9.png',
    occasions: ['christmas']
  },
  {
    id: 'template-21',
    name: 'Happy Holidays Snowflakes',
    description: 'Modern geometric pattern with holiday elements',
    preview_url: '/lovable-uploads/1933c517-f886-496f-8d3e-52d9fc80e756.png',
    occasions: ['holidays']
  },
  {
    id: 'template-22',
    name: 'Rainbow Christmas Tree',
    description: 'Modern colorful geometric Christmas tree',
    preview_url: '/lovable-uploads/16959889-806a-430a-ae8b-6662ce95c578.png',
    occasions: ['christmas']
  },
  {
    id: 'template-23',
    name: 'Geometric Tree',
    description: 'Contemporary design with geometric Christmas tree',
    preview_url: '/lovable-uploads/1000fb99-0e75-4bb8-adb0-a85765f7e6d6.png',
    occasions: ['christmas']
  },
  {
    id: 'template-24',
    name: 'Happy New Year Pattern',
    description: 'Modern geometric pattern with holiday elements',
    preview_url: '/lovable-uploads/8652e290-f200-4789-b27e-d2747903d8f1.png',
    occasions: ['new-year']
  },
  {
    id: 'template-25',
    name: 'Colorful Snowflakes',
    description: 'Elegant design with colorful snowflakes and circles',
    preview_url: '/lovable-uploads/b4db1c44-92b9-4b31-8fec-222edd74055d.png',
    occasions: ['holidays']
  },
  {
    id: 'template-26',
    name: 'JOY Christmas',
    description: 'Bold typography design with Christmas tree',
    preview_url: '/lovable-uploads/a89d69ab-08ec-4590-8ba3-20745fa974db.png',
    occasions: ['christmas']
  },
  {
    id: 'template-27',
    name: 'Joy Geometric',
    description: 'Modern geometric pattern with JOY message',
    preview_url: '/lovable-uploads/9d4b655c-c736-4288-a943-2c47d864214c.png',
    occasions: ['holidays']
  },
  {
    id: 'template-28',
    name: 'Retro Holiday Tree',
    description: 'Vintage-style colorful Christmas tree design',
    preview_url: '/lovable-uploads/8215d3f7-b9fe-496a-a21b-5fd79f848ee1.png',
    occasions: ['christmas']
  },
  {
    id: 'template-29',
    name: 'Minimalist Christmas',
    description: 'Clean navy design with white Christmas trees',
    preview_url: '/lovable-uploads/1f9187dc-651f-4769-a1ae-bca2f0c56afe.png',
    occasions: ['christmas']
  },
  {
    id: 'template-30',
    name: 'Elegant Christmas',
    description: 'Sophisticated navy design with botanical elements',
    preview_url: '/lovable-uploads/23bc8fab-f523-47fa-9ccd-631ca48edc03.png',
    occasions: ['christmas']
  },
  {
    id: 'template-31',
    name: 'Ornament Elegance',
    description: 'Modern teal design with elegant Christmas ornaments',
    preview_url: '/lovable-uploads/c2c85a6a-4fe3-4b24-83d4-8bef51ef7320.png',
    occasions: ['christmas']
  },
  {
    id: 'template-32',
    name: 'Geometric Forest',
    description: 'Contemporary green design with geometric Christmas trees',
    preview_url: '/lovable-uploads/0012c4e2-7885-452f-ba85-b26ca8bc9ed3.png',
    occasions: ['christmas']
  },
  {
    id: 'template-33',
    name: 'Holiday Wildlife',
    description: 'Charming illustration with reindeer and winter gifts',
    preview_url: '/lovable-uploads/2461302f-36b5-4101-b3c8-7e81b104cea7.png',
    occasions: ['christmas']
  },
  {
    id: 'template-34',
    name: 'Be Jolly Santa',
    description: 'Whimsical Santa design with festive ornaments',
    preview_url: '/lovable-uploads/05ffd764-82f5-4b71-9cb0-adfd17483982.png',
    occasions: ['christmas']
  },
  {
    id: 'template-35',
    name: 'Holiday Deer Duo',
    description: 'Elegant design with decorative reindeer silhouettes',
    preview_url: '/lovable-uploads/57f72615-5a69-4cf7-8b9e-e0ee2e3c38bd.png',
    occasions: ['christmas']
  },
  {
    id: 'template-36',
    name: 'Festive Pattern',
    description: 'Vibrant green design with holiday symbols and stars',
    preview_url: '/lovable-uploads/573b7e1e-d99f-478e-aa39-4625e435cf44.png',
    occasions: ['holidays']
  },
  {
    id: 'template-37',
    name: 'Colorblock Holidays',
    description: 'Modern geometric pattern with bold holiday colors',
    preview_url: '/lovable-uploads/4d86837d-418d-49d0-a84d-c1865edeb7a5.png',
    occasions: ['holidays']
  },
  {
    id: 'template-38',
    name: 'Merry Typography',
    description: 'Bold typographic design with festive holly berries',
    preview_url: '/lovable-uploads/54056ed4-a5a4-4e89-b9e2-418cae36adbc.png',
    occasions: ['christmas']
  },
  {
    id: 'template-39',
    name: 'Classic Ornaments',
    description: 'Traditional design with hanging Christmas ornaments',
    preview_url: '/lovable-uploads/c89f658a-8076-4240-ba9f-c182b4505552.png',
    occasions: ['christmas']
  },
  {
    id: 'template-40',
    name: 'Wishing You Joy',
    description: 'Elegant green design with holly berries and festive script',
    preview_url: '/lovable-uploads/763fd7b1-12ad-48c4-88f4-fc21d684a8b9.png',
    occasions: ['christmas']
  },
  {
    id: 'template-41',
    name: 'New Year Gifts',
    description: 'Sophisticated navy design with elegant gift boxes and "Happy New Year" message',
    preview_url: '/lovable-uploads/4e3150fa-089d-43ef-b4ea-a6105bbbef65.png',
    occasions: ['new-year']
  },
  {
    id: 'template-42',
    name: 'New Year Celebration',
    description: 'Festive navy design with golden snowflakes and stars for New Year',
    preview_url: '/lovable-uploads/38553b11-9c4a-40d5-a2dd-709e10741e75.png',
    occasions: ['new-year']
  },
  {
    id: 'template-43',
    name: 'Happy Hanukkah Blue',
    description: 'Elegant blue Hanukkah design with menorah and festive elements',
    preview_url: '/lovable-uploads/449d246e-cf03-4a40-ae84-32f5cfaa7b22.png',
    occasions: ['hanukkah']
  },
  {
    id: 'template-44',
    name: 'Happy Kwanzaa Celebration',
    description: 'Vibrant Kwanzaa design with kinara and colorful African patterns',
    preview_url: '/lovable-uploads/05e9dcf4-947d-41f7-bd17-8851b71c8550.png',
    occasions: ['kwanzaa']
  },
  {
    id: 'template-45',
    name: 'Happy New Year Script',
    description: 'Clean and elegant Happy New Year design with red typography',
    preview_url: '/lovable-uploads/d769a133-7232-49fe-958a-f8b1fa24211d.png',
    occasions: ['new-year']
  },
  {
    id: 'template-46',
    name: 'Happy Kwanzaa Geometric',
    description: 'Modern geometric Kwanzaa design with traditional colors',
    preview_url: '/lovable-uploads/e5b398b5-e5fc-4e39-a57a-eed496d220a3.png',
    occasions: ['kwanzaa']
  },
  {
    id: 'template-47',
    name: 'Happy Hanukkah Festive',
    description: 'Colorful Hanukkah design with menorah, dreidels and gifts',
    preview_url: '/lovable-uploads/cd415865-0124-4471-afad-6733af6be629.png',
    occasions: ['hanukkah']
  },
  {
    id: 'template-48',
    name: 'Happy Hanukkah Modern',
    description: 'Contemporary Hanukkah design with stylized menorah',
    preview_url: '/lovable-uploads/b301a3d8-7e81-483d-a07d-6d81d2509b91.png',
    occasions: ['hanukkah']
  },
  {
    id: 'template-49',
    name: 'Happy Hanukkah Elegant',
    description: 'Sophisticated light blue Hanukkah design with menorah',
    preview_url: '/lovable-uploads/65392199-52d8-4833-83f6-eb291386a412.png',
    occasions: ['hanukkah']
  },
  {
    id: 'template-50',
    name: 'Merry Christmas & Happy Hanukkah',
    description: 'Inclusive holiday design celebrating both Christmas and Hanukkah',
    preview_url: '/lovable-uploads/9219f576-11e5-4037-bb12-11e47a367c1f.png',
    occasions: ['christmas', 'hanukkah']
  }
];

const Step1ChooseTemplate = () => {
  const { state, updateState, nextStep } = useWizard();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    occasions.map(o => o.id) // All occasions selected by default
  );

  const handleTemplateSelect = (templateId: string) => {
    updateState({ selectedTemplate: templateId });
  };

  const handleContinue = () => {
    if (state.selectedTemplate) {
      nextStep();
    }
  };

  const handleOccasionToggle = (occasionId: string) => {
    setSelectedOccasions(prev => 
      prev.includes(occasionId) 
        ? prev.filter(id => id !== occasionId)
        : [...prev, occasionId]
    );
  };

  // Filter templates based on selected occasions
  const filteredTemplates = mockTemplates.filter(template => 
    template.occasions.some(occasion => selectedOccasions.includes(occasion))
  );

  const selectedTemplate = mockTemplates.find(t => t.id === state.selectedTemplate);
  const previewTemplateData = mockTemplates.find(t => t.id === previewTemplate);

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

      <div className="flex justify-between pt-6 bg-white">
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
        <DialogContent className="max-w-2xl bg-white">
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
