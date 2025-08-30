import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignatureExtractor from '@/components/signature/SignatureExtractor';

interface SignatureReviewCardProps {
  order: {
    id: string;
    signature_url: string | null;
    cropped_signature_url?: string | null;
    signature_needs_review?: boolean;
  };
  onOrderUpdate: () => void;
}

const SignatureReviewCard: React.FC<SignatureReviewCardProps> = ({ order, onOrderUpdate }) => {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const downloadSignature = async () => {
    if (!order.signature_url) return;

    try {
      // Check if signature_url is a full URL or just a file path
      let actualPath = order.signature_url;
      if (order.signature_url.startsWith('https://')) {
        // Extract file path from full URL
        const urlParts = order.signature_url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'holiday-cards');
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          actualPath = urlParts.slice(bucketIndex + 1).join('/');
        } else {
          throw new Error('Invalid file URL format');
        }
      }

      const { data, error } = await supabase.storage
        .from('holiday-cards')
        .download(actualPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signature-${order.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Signature file downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading signature:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download signature file",
        variant: "destructive"
      });
    }
  };

  const handleCroppedSignatureUpload = async (signatureUrl: string) => {
    if (!order?.id) return;

    setUploading(true);
    try {
      // Update order record with cropped signature URL and clear review flag
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          cropped_signature_url: signatureUrl,
          signature_needs_review: false
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      setShowUploadDialog(false);
      onOrderUpdate();

      toast({
        title: "Success",
        description: "Cropped signature uploaded successfully and review completed",
      });

    } catch (error) {
      console.error('Error uploading cropped signature:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload cropped signature",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const markReviewComplete = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ signature_needs_review: false })
        .eq('id', order.id);

      if (error) throw error;

      onOrderUpdate();

      toast({
        title: "Review Complete",
        description: "Signature review marked as complete",
      });
    } catch (error) {
      console.error('Error updating review status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update review status",
        variant: "destructive"
      });
    }
  };

  if (!order.signature_url) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Signature Review</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No signature uploaded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Signature Review</span>
            </div>
            <Badge 
              variant={order.signature_needs_review ? "destructive" : "default"}
              className="flex items-center space-x-1"
            >
              {order.signature_needs_review ? (
                <>
                  <AlertCircle className="w-3 h-3" />
                  <span>Needs Review</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>Reviewed</span>
                </>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Review and manage the uploaded signature file. Download the original signature, then upload a cropped version if needed.
            </p>
            
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                onClick={downloadSignature}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Original Signature
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(true)}
                className="w-full justify-start"
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {order.cropped_signature_url ? 'Replace Cropped Signature' : 'Upload Cropped Signature'}
              </Button>
              
              {order.signature_needs_review && (
                <Button
                  variant="default"
                  onClick={markReviewComplete}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Review Complete
                </Button>
              )}
              
              {order.cropped_signature_url && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  ✓ Cropped signature available - this will be used in cards
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Upload Cropped Signature</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            <SignatureExtractor onSignatureExtracted={handleCroppedSignatureUpload} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SignatureReviewCard;