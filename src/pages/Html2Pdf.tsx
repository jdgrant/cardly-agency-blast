import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
  preview_url: string;
  description: string;
}

const Html2Pdf = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const [template, setTemplate] = useState<Template | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      });
    }
  };

  const generatePDF = async () => {
    if (!template) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-template-pdf', {
        body: { templateId: template.id }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "Success",
          description: "PDF generated successfully!",
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!templateId) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">No Template Selected</h1>
              <p className="text-muted-foreground mb-4">Please select a template to preview.</p>
              <Link to="/admin">
                <Button>Go to Admin</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">HTML to PDF Preview</h1>
          </div>
          <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Generate PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HTML Preview */}
          <Card>
            <CardHeader>
              <CardTitle>HTML Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="w-full aspect-[7/5.125] border-2 border-border rounded-lg overflow-hidden bg-white shadow-lg"
                style={{ maxWidth: '350px', margin: '0 auto' }}
              >
                <div className="w-full h-full relative">
                  <div 
                    className="w-full h-full bg-cover bg-center bg-no-repeat rounded-lg"
                    style={{ backgroundImage: `url(${template.preview_url})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-lg">
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="text-lg font-bold mb-1 text-shadow-lg">
                          {template.name}
                        </h3>
                        <p className="text-sm opacity-90 line-clamp-2">
                          {template.description || 'Holiday Card Template'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
                    7" × 5.125"
                  </div>
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground font-mono">
                    ID: {template.id}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Details */}
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Template Name</label>
                <p className="text-lg font-semibold">{template.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{template.description || 'No description available'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Template ID</label>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{template.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                <p className="text-sm">7" × 5.125" (Standard Holiday Card)</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Preview URL</label>
                <p className="text-xs text-muted-foreground break-all">{template.preview_url}</p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={generatePDF} 
                  disabled={isGenerating} 
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Generate & Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Html2Pdf;