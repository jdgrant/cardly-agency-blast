
import React from 'react';

interface FilePreviewProps {
  file: File;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, className = "" }) => {
  const [fileUrl, setFileUrl] = React.useState<string>('');
  
  React.useEffect(() => {
    // Handle converted files from PDF conversion or regular files
    if (file.name.includes('.svg') || file.type === 'image/svg+xml' || 
        (file.name.includes('.png') && file.size < 1000000 && file.type === 'image/png')) {
      // Try to read as text first (for SVG content in PNG files from PDF conversion)
      file.text().then(content => {
        if (content.includes('<svg') || content.includes('<?xml')) {
          // It's SVG content, encode as base64
          const base64Svg = btoa(content);
          setFileUrl(`data:image/svg+xml;base64,${base64Svg}`);
        } else {
          // It's actual binary image data
          setFileUrl(URL.createObjectURL(file));
        }
      }).catch(() => {
        // Fallback to object URL for binary files
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
