'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileImage, FileVideo, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  type: 'image' | 'video' | 'pdf';
  entityType?: 'profile' | 'article' | 'group_post';
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  className?: string;
}

export function FileUpload({
  type,
  entityType = 'article',
  onUploadComplete,
  currentUrl,
  className = '',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    switch (type) {
      case 'image':
        return 'image/jpeg,image/png,image/gif,image/webp';
      case 'video':
        return 'video/mp4,video/webm,video/ogg';
      case 'pdf':
        return 'application/pdf';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'image':
        return <FileImage className="h-8 w-8" />;
      case 'video':
        return <FileVideo className="h-8 w-8" />;
      case 'pdf':
        return <FileText className="h-8 w-8" />;
    }
  };

  const getMaxSizeText = () => {
    switch (type) {
      case 'image':
        return '10MB';
      case 'video':
        return '50MB';
      case 'pdf':
        return '20MB';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview for images
    if (type === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('entityType', entityType);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      toast.success('File uploaded successfully!');
      onUploadComplete(data.url);
      
      if (type === 'image') {
        setPreview(data.url);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      setPreview(null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearFile = () => {
    setPreview(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <Input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedTypes()}
        onChange={handleFileSelect}
        className="hidden"
        id={`file-upload-${type}`}
      />

      {preview && type === 'image' ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-64 object-cover rounded-lg"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            {getIcon()}
            <div>
              <p className="text-sm font-medium">
                Click to upload {type === 'image' ? 'an image' : type === 'video' ? 'a video' : 'a PDF'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max file size: {getMaxSizeText()}
              </p>
            </div>
            {preview && type !== 'image' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span>File uploaded</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-2 text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
