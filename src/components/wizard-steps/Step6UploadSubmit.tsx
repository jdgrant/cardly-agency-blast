
import React, { useState, useCallback } from 'react';
import { useWizard, ClientRecord } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Step6UploadSubmit = () => {
  const { state, updateState, prevStep, resetWizard } = useWizard();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClientRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const parseCSV = useCallback((csvText: string): ClientRecord[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredFields = ['firstname', 'lastname', 'address', 'city', 'state', 'zip'];
    
    const missingFields = requiredFields.filter(field => 
      !headers.some(header => header.includes(field.toLowerCase().replace(/\s+/g, '')))
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required columns: ${missingFields.join(', ')}`);
    }

    const firstNameIndex = headers.findIndex(h => h.includes('firstname') || h.includes('first_name'));
    const lastNameIndex = headers.findIndex(h => h.includes('lastname') || h.includes('last_name'));
    const addressIndex = headers.findIndex(h => h.includes('address'));
    const cityIndex = headers.findIndex(h => h.includes('city'));
    const stateIndex = headers.findIndex(h => h.includes('state'));
    const zipIndex = headers.findIndex(h => h.includes('zip'));

    const records: ClientRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length >= Math.max(firstNameIndex, lastNameIndex, addressIndex, cityIndex, stateIndex, zipIndex) + 1) {
        records.push({
          firstName: values[firstNameIndex] || '',
          lastName: values[lastNameIndex] || '',
          address: values[addressIndex] || '',
          city: values[cityIndex] || '',
          state: values[stateIndex] || '',
          zip: values[zipIndex] || '',
        });
      }
    }

    return records;
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const records = parseCSV(csvText);
        setPreview(records.slice(0, 5));
        updateState({ csvFile: file, clientList: records });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
        setPreview([]);
      }
    };
    
    reader.readAsText(file);
  }, [parseCSV, updateState]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleFileUpload(file);
      } else {
        setError('Please upload a CSV file');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('holiday-cards')
      .upload(path, file);
    
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    if (!state.selectedTemplate || !state.selectedTier || !state.mailingWindow || !state.csvFile) {
      toast({
        title: "Missing Information",
        description: "Please complete all required steps before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload files to Supabase Storage
      const timestamp = Date.now();
      let logoUrl = null;
      let signatureUrl = null;
      let csvUrl = null;

      if (state.logo) {
        logoUrl = await uploadFile(state.logo, `logos/${timestamp}-${state.logo.name}`);
      }

      if (state.signature) {
        signatureUrl = await uploadFile(state.signature, `signatures/${timestamp}-${state.signature.name}`);
      }

      if (state.csvFile) {
        csvUrl = await uploadFile(state.csvFile, `csv/${timestamp}-${state.csvFile.name}`);
      }

      // Calculate final pricing
      const basePrice = state.earlyBirdActive ? state.selectedTier.earlyBirdPrice : state.selectedTier.regularPrice;
      const postageAdditionalCost = state.postageOption === 'first-class' ? 0.20 * state.selectedTier.quantity : 0;
      const finalPrice = basePrice + postageAdditionalCost;

      // Create order record
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          template_id: state.selectedTemplate,
          tier_name: state.selectedTier.name,
          card_quantity: state.selectedTier.quantity,
          regular_price: state.selectedTier.regularPrice,
          final_price: finalPrice,
          early_bird_discount: state.earlyBirdActive,
          mailing_window: state.mailingWindow,
          postage_option: state.postageOption,
          postage_cost: postageAdditionalCost,
          logo_url: logoUrl,
          signature_url: signatureUrl,
          csv_file_url: csvUrl,
          client_count: state.clientList.length,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert client records
      const clientRecords = state.clientList.map(client => ({
        order_id: order.id,
        first_name: client.firstName,
        last_name: client.lastName,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
      }));

      const { error: clientError } = await supabase
        .from('client_records')
        .insert(clientRecords);

      if (clientError) throw clientError;

      toast({
        title: "Order Submitted Successfully!",
        description: `Your order for ${state.clientList.length} holiday cards has been submitted.`,
      });

      // Show success message and redirect
      setTimeout(() => {
        resetWizard();
        navigate('/?success=true');
      }, 2000);

    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const postageAdditionalCost = state.postageOption === 'first-class' && state.selectedTier ? 0.20 * state.selectedTier.quantity : 0;
  const finalPrice = state.selectedTier 
    ? (state.earlyBirdActive ? state.selectedTier.earlyBirdPrice : state.selectedTier.regularPrice) + postageAdditionalCost
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Client List</h2>
        <p className="text-gray-600">Upload your client list to complete your order</p>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Drop your CSV file here, or click to browse
        </h3>
        <p className="text-gray-500 mb-4">
          Required columns: FirstName, LastName, Address, City, State, Zip
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <Button variant="outline" className="cursor-pointer">
            Choose File
          </Button>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* File Info & Preview */}
      {state.csvFile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>File: {state.csvFile.name} ({state.clientList.length} records)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preview.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Preview (first 5 records):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">First Name</th>
                        <th className="text-left p-2">Last Name</th>
                        <th className="text-left p-2">Address</th>
                        <th className="text-left p-2">City</th>
                        <th className="text-left p-2">State</th>
                        <th className="text-left p-2">Zip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((record, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{record.firstName}</td>
                          <td className="p-2">{record.lastName}</td>
                          <td className="p-2">{record.address}</td>
                          <td className="p-2">{record.city}</td>
                          <td className="p-2">{record.state}</td>
                          <td className="p-2">{record.zip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      {state.selectedTier && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Package:</span>
                <span className="font-medium">{state.selectedTier.name} ({state.selectedTier.quantity} cards)</span>
              </div>
              <div className="flex justify-between">
                <span>Base Price:</span>
                <span>${(state.earlyBirdActive ? state.selectedTier.earlyBirdPrice : state.selectedTier.regularPrice).toLocaleString()}</span>
              </div>
              {postageAdditionalCost > 0 && (
                <div className="flex justify-between">
                  <span>First-Class Postage:</span>
                  <span>+${postageAdditionalCost.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${finalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!state.csvFile || state.clientList.length === 0 || isSubmitting}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isSubmitting ? 'Submitting Order...' : `Submit Order - $${finalPrice.toLocaleString()}`}
        </Button>
      </div>
    </div>
  );
};

export default Step6UploadSubmit;
