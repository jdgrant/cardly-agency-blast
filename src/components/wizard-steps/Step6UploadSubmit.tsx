
import React, { useState, useCallback } from 'react';
import { useWizard, ClientRecord } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, Info } from 'lucide-react';

const Step6UploadSubmit = () => {
  const { state, updateState, prevStep, nextStep } = useWizard();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClientRecord[]>([]);

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

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your List</h2>
        <p className="text-gray-600">Upload your client list to personalize your holiday cards</p>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700">
          <strong>Optional:</strong> You can upload your client list now or skip this step and upload it later. 
          Your final pricing will be calculated based on the actual number of contacts.
        </AlertDescription>
      </Alert>

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

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={nextStep}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step6UploadSubmit;
