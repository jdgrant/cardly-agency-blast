import React, { useState, useRef } from 'react';
import { useWizard, ClientRecord } from '../WizardContext';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, FileText, X, AlertCircle, Download } from 'lucide-react';

const Step6UploadClients = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClientRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): ClientRecord[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Look for various header variations
    const findHeader = (possibleNames: string[]) => {
      return headers.findIndex(h => 
        possibleNames.some(name => h.includes(name.toLowerCase()))
      );
    };

    const fullNameIndex = findHeader(['full name', 'fullname', 'full_name', 'name']);
    const businessNameIndex = findHeader(['business name', 'business_name', 'businessname', 'business', 'company', 'company_name']);
    const lastNameIndex = findHeader(['lastname', 'last_name', 'last name', 'lname']);
    const addressIndex = findHeader(['address', 'street', 'address1', 'street_address']);
    const cityIndex = findHeader(['city']);
    const stateIndex = findHeader(['state', 'province']);
    const zipIndex = findHeader(['zip', 'zipcode', 'postal', 'postal_code']);

    // Check for required fields
    if (addressIndex === -1 || cityIndex === -1 || stateIndex === -1 || zipIndex === -1) {
      throw new Error('CSV must contain Address, City, State, and Zip columns');
    }

    if (fullNameIndex === -1 && businessNameIndex === -1 && lastNameIndex === -1) {
      throw new Error('CSV must contain either Full Name/Business Name column or Last Name column');
    }

    const records: ClientRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < headers.length) continue; // Skip incomplete rows

      let firstName = '';
      let lastName = '';
      
      if (businessNameIndex !== -1 && values[businessNameIndex]) {
        // If business name exists, use it as first name
        firstName = values[businessNameIndex];
        lastName = '';
      } else if (fullNameIndex !== -1 && values[fullNameIndex]) {
        // If full name exists, use it as first name
        firstName = values[fullNameIndex];
        lastName = lastNameIndex !== -1 ? values[lastNameIndex] || '' : '';
      } else {
        // Use last name only
        firstName = '';
        lastName = lastNameIndex !== -1 ? values[lastNameIndex] || '' : '';
      }

      if (!firstName && !lastName) continue; // Skip rows without names

      records.push({
        firstName,
        lastName,
        address: values[addressIndex] || '',
        city: values[cityIndex] || '',
        state: values[stateIndex] || '',
        zip: values[zipIndex] || ''
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