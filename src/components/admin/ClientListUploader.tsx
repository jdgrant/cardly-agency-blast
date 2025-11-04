import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface ClientRecord {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface ClientListUploaderProps {
  orderId: string;
  onUploadComplete: () => void;
  hashedOrderId?: string; // Optional for customer management
}

export const ClientListUploader: React.FC<ClientListUploaderProps> = ({
  orderId,
  onUploadComplete,
  hashedOrderId
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ClientRecord[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (csvText: string): ClientRecord[] => {
    // Robust CSV parsing using headers to avoid positional errors
    const normalize = (h: string) => h
      .toLowerCase()
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const h = normalize(header);
        if (['first name', 'firstname', 'first_name'].includes(h)) return 'first_name';
        if (['last name', 'lastname', 'last_name'].includes(h)) return 'last_name';
        if (['full name/business name', 'full name', 'fullname', 'name', 'company', 'business name'].includes(h)) return 'full_name';
        if (['address', 'address1', 'street', 'street address'].includes(h)) return 'address';
        if (['city'].includes(h)) return 'city';
        if (['state', 'province'].includes(h)) return 'state';
        if (['zip', 'zipcode', 'postal', 'postal code', 'postal_code'].includes(h)) return 'zip';
        return h; // keep other columns (like service_type) but ignore them later
      },
      transform: (val) => (typeof val === 'string' ? val.trim() : val)
    });

    if (errors && errors.length) {
      // Keep it generic in UI; details are in console
      console.warn('CSV parse errors:', errors);
    }

    // Validate presence of required columns in the parsed header set
    const firstRow = (data && data[0]) || {} as Record<string, string>;
    const required = ['address', 'city', 'state', 'zip'];
    const missing = required.filter((k) => !(k in firstRow));
    if (missing.length) {
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }

    const records: ClientRecord[] = [];
    for (const row of data as any[]) {
      if (!row) continue;
      // Derive names
      let firstName = row.first_name || '';
      let lastName = row.last_name || '';
      if ((!firstName && !lastName) && row.full_name) {
        const full = String(row.full_name).trim();
        if (full) {
          const parts = full.split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ');
        }
      }

      records.push({
        first_name: firstName,
        last_name: lastName,
        address: row.address || '',
        city: row.city || '',
        state: (row.state || '').toString().trim(),
        zip: (row.zip || '').toString().trim()
      });
    }

    return records;
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setPreview([]);
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const parsedRecords = parseCSV(text);
      setPreview(parsedRecords.slice(0, 5));
      setUploadedFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  };

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
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedFile || preview.length === 0) {
      setError('Please upload a valid CSV file first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload the CSV file to storage
      const fileName = `orders/${orderId}/client-list-${Date.now()}.csv`;
      const { error: uploadError, data } = await supabase.storage
        .from('holiday-cards')
        .upload(fileName, uploadedFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('holiday-cards')
        .getPublicUrl(fileName);

      // Parse the full CSV and insert client records
      const text = await uploadedFile.text();
      const allRecords = parseCSV(text);

      // Insert client records into the database
      const clientData = allRecords.map(record => ({
        first_name: record.first_name,
        last_name: record.last_name,
        address: record.address,
        city: record.city,
        state: record.state,
        zip: record.zip
      }));

      console.log('Replacing client list with', clientData.length, 'records');
      
      // Use edge function to replace client list (handles deletion + insertion with service role)
      const { data: replaceData, error: replaceError } = await supabase.functions.invoke('replace-client-list', {
        body: {
          orderId,
          clientRecords: clientData,
          csvFileUrl: urlData.publicUrl,
          adminSessionId: sessionStorage.getItem('adminSessionId')
        }
      });

      if (replaceError) {
        console.error('Replace error:', replaceError);
        throw new Error(`Failed to replace client list: ${replaceError.message}`);
      }

      if (!replaceData || !replaceData.success) {
        throw new Error(replaceData?.error || 'Failed to replace client list');
      }

      console.log('Successfully replaced client list');

      // For customer management, also update via RPC
      if (hashedOrderId) {
        const { error: updateCountError } = await supabase
          .rpc('update_order_client_count_for_customer', {
            short_id: hashedOrderId,
            new_client_count: allRecords.length
          });

        if (updateCountError) {
          console.error('Count update error:', updateCountError);
          // Don't fail - the edge function already updated the count
        }
      }

      toast({
        title: "Client list uploaded successfully",
        description: `${allRecords.length} client records have been processed.`
      });

      onUploadComplete();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Upload Client List</h3>
        <p className="text-gray-600 mb-4">
          Drag and drop your CSV file here, or click to browse
        </p>
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Choose File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium">Preview (first 5 records)</span>
            </div>
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
                      <td className="p-2">{record.first_name}</td>
                      <td className="p-2">{record.last_name}</td>
                      <td className="p-2">{record.address}</td>
                      <td className="p-2">{record.city}</td>
                      <td className="p-2">{record.state}</td>
                      <td className="p-2">{record.zip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={handleSubmit}
          disabled={!uploadedFile || preview.length === 0 || uploading}
          className="min-w-[120px]"
        >
          {uploading ? 'Uploading...' : 'Upload Client List'}
        </Button>
      </div>
    </div>
  );
};