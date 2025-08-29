
import React from 'react';

interface FilePreviewProps {
  file: File;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, className = "" }) => {
  const [fileUrl, setFileUrl] = React.useState<string>('');
  
  React.useEffect(() => {
    // Handle converted SVG files or regular files
    if (file.name.includes('.svg') || file.type === 'image/svg+xml') {
      // For SVG files created from PDF conversion, read as text and create data URL
      file.text().then(svgText => {
        const base64Svg = btoa(svgText);
        setFileUrl(`data:image/svg+xml;base64,${base64Svg}`);
      }).catch(() => {
        // Fallback to object URL
        setFileUrl(URL.createObjectURL(file));
      });
    } else {
      setFileUrl(URL.createObjectURL(file));
    }
    
    // Clean up the URL when component unmounts
    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [file]);

  if (!fileUrl) {
    return (
      <div className={`border rounded-lg p-4 bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

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
