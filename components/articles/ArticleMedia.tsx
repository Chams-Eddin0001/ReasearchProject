'use client';

import { FileVideo, FileText, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ArticleMediaProps {
  mediaType: 'video' | 'pdf' | null;
  mediaUrl: string | null;
}

export function ArticleMedia({ mediaType, mediaUrl }: ArticleMediaProps) {
  if (!mediaType || !mediaUrl) {
    return null;
  }

  const handleDownload = () => {
    window.open(mediaUrl, '_blank');
  };

  return (
    <Card className="p-6 my-6">
      {mediaType === 'video' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <FileVideo className="h-5 w-5" />
            <span>Attached Video</span>
          </div>
          <video
            controls
            className="w-full rounded-lg bg-black"
            preload="metadata"
          >
            <source src={mediaUrl} type="video/mp4" />
            <source src={mediaUrl} type="video/webm" />
            <source src={mediaUrl} type="video/ogg" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {mediaType === 'pdf' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600 font-semibold">
              <FileText className="h-5 w-5" />
              <span>Attached PDF Document</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Open PDF
            </Button>
          </div>
          <iframe
            src={mediaUrl}
            className="w-full h-[600px] border border-gray-300 rounded-lg"
            title="PDF Document"
          />
        </div>
      )}
    </Card>
  );
}
