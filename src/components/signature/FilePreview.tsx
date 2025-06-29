
import React from 'react';

interface FilePreviewProps {
  file: File;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, className = "" }) => {
  const fileUrl = URL.createObjectURL(file);
  
  // Clean up the URL when component unmounts
  React.useEffect(() => {
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  if (file.type === 'application/pdf') {
    return (
      <div className={`border rounded-lg p-4 bg-gray-50 ${className}`}>
        <embed
          src={fileUrl}
          type="application/pdf"
          width="100%"
          height="200px"
          className="rounded"
        />
      </div>
    );
  } else {
    return (
      <div className={`border rounded-lg p-4 bg-gray-50 ${className}`}>
        <img 
          src={fileUrl}
          alt="Uploaded signature file"
          className="max-w-full h-auto max-h-48 mx-auto rounded"
        />
      </div>
    );
  }
};

export default FilePreview;
