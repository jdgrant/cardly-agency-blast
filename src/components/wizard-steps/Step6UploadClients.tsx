import React, { useState, useRef } from 'react';
import { useWizard, ClientRecord } from '../WizardContext';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, FileText, X, AlertCircle, Download } from 'lucide-react';
import Papa from 'papaparse';

const Step6UploadClients = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClientRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): ClientRecord[] => {
    const normalize = (h: string) => h
      .toLowerCase()
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const { data } = Papa.parse<Record<string, string>>(csvText, {
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
        return h;
      },
      transform: (val) => (typeof val === 'string' ? val.trim() : val),
    });

    // Validate headers
    const firstRow = (data && data[0]) || {} as Record<string, string>;
    const required = ['address', 'city', 'state', 'zip'];
    const missing = required.filter((k) => !(k in firstRow));
    if (missing.length) {
      throw new Error('CSV must contain Address, City, State, and Zip columns');
    }

    const records: ClientRecord[] = [];
    for (const row of data as any[]) {
      if (!row) continue;

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

      if (!firstName && !lastName) continue;

      records.push({
        firstName,
        lastName,
        address: row.address || '',
        city: row.city || '',
        state: (row.state || '').toString().trim(),
        zip: (row.zip || '').toString().trim(),
      });
    }

    if (records.length === 0) {
      throw new Error('No valid records found in CSV');
    }

    return records;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const parsedRecords = parseCSV(text);
      
      updateState({ 
        clientList: parsedRecords,
        csvFile: file
      });
      
      setPreview(parsedRecords.slice(0, 5)); // Show first 5 records
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleNext = () => {
    nextStep();
  };

  const downloadSample = () => {
    const link = document.createElement('a');
    link.href = '/sample-client-list.csv';
    link.download = 'sample-client-list.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload Client List (Optional)</h2>
        <p className="text-lg text-gray-600">
          Upload a CSV file with your client information, or continue without a list for manual pricing.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Alert className="flex-1">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Optional:</strong> Upload a CSV with columns for: <strong>Full Name/Business Name, Address, City, State, Zip</strong>
          </AlertDescription>
        </Alert>
        
        <Button
          variant="outline"
          onClick={downloadSample}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          <span>Download Sample CSV</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {state.csvFile ? state.csvFile.name : 'Drop your CSV file here, or click to browse'}
        </p>
        <p className="text-sm text-gray-500">
          Supports CSV files up to 10MB
        </p>
        
        {state.csvFile && (
          <div className="mt-4 flex items-center justify-center space-x-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-600">
              {state.clientList.length} records uploaded
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                updateState({ clientList: [], csvFile: null });
                setPreview([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Preview (First 5 Records)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">City</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">State</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Zip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.firstName} {record.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.address}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.city}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.state}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.zip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.clientList.length > 5 && (
            <p className="text-sm text-gray-500 text-center">
              ...and {state.clientList.length - 5} more records
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          className="bg-green-600 hover:bg-green-700"
        >
          {state.clientList.length === 0 ? 'Continue Without List' : 'Continue to Package Selection'}
        </Button>
      </div>
    </div>
  );
};

export default Step6UploadClients;