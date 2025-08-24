import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    
    // Check for required columns
    const requiredColumns = ['address', 'city', 'state', 'zip'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    // Check for name columns (must have at least one)
    const hasFirstName = headers.includes('firstname') || headers.includes('first name');
    const hasLastName = headers.includes('lastname') || headers.includes('last name');
    const hasFullName = headers.includes('full name/business name') || headers.includes('full name');
    
    if (!hasFirstName && !hasLastName && !hasFullName) {
      throw new Error('CSV must contain either "FirstName" and "LastName" columns, or a "Full Name/Business Name" column');
    }
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const records: ClientRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/["']/g, ''));
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });

      // Handle name parsing
      let firstName = '';
      let lastName = '';
      
      if (hasFirstName && hasLastName) {
        firstName = record['firstname'] || record['first name'] || '';
        lastName = record['lastname'] || record['last name'] || '';
      } else if (hasFullName) {
        const fullName = record['full name/business name'] || record['full name'] || '';
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = '';
        } else {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
      }

      records.push({
        first_name: firstName,
        last_name: lastName,
        address: record.address || '',
        city: record.city || '',
        state: record.state || '',
        zip: record.zip || ''
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

      const { error: insertError } = await supabase.rpc('insert_client_records', {
        order_id: orderId,
        client_data: clientData
      });

      if (insertError) {
        throw new Error(`Failed to save client records: ${insertError.message}`);
      }

      // Update order with CSV file URL and client count
      if (hashedOrderId) {
        // Customer management - use secure functions
        const { error: updateFileError } = await supabase
          .rpc('update_order_file_for_customer', {
            short_id: hashedOrderId,
            file_type: 'csv',
            file_url: urlData.publicUrl
          });

        if (updateFileError) {
          throw new Error(`Failed to update order: ${updateFileError.message}`);
        }

        const { error: updateCountError } = await supabase
          .rpc('update_order_client_count_for_customer', {
            short_id: hashedOrderId,
            new_client_count: allRecords.length
          });

        if (updateCountError) {
          throw new Error(`Failed to update client count: ${updateCountError.message}`);
        }
      } else {
      // Update the order with the CSV file URL and client count and mark as uploaded
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          csv_file_url: urlData.publicUrl,
          client_count: allRecords.length,
          mailing_list_uploaded: true
        })
        .eq('id', orderId);

        if (updateError) {
          throw new Error(`Failed to update order: ${updateError.message}`);
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