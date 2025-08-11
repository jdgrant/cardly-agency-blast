import { supabase } from '@/integrations/supabase/client';

export interface Template {
  id: string;
  name: string;
  description: string;
  preview_url: string;
  occasions: string[];
}

// Hardcoded templates as fallback
export const fallbackTemplates: Template[] = [
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
  }
];

export const fetchTemplates = async (): Promise<Template[]> => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      return fallbackTemplates;
    }

    // Transform database templates to match expected structure
    const transformedTemplates = data.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || '',
      preview_url: template.preview_url,
      occasions: template.occasions || ['christmas', 'holidays'] // Use database occasions or fallback
    }));

    return transformedTemplates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return fallbackTemplates;
  }
};

export const getTemplateById = async (id: string): Promise<Template | null> => {
  const templates = await fetchTemplates();
  return templates.find(template => template.id === id) || null;
};