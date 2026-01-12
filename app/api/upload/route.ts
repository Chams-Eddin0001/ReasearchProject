import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string; // 'image', 'video', 'pdf'
    const entityType = formData.get('entityType') as string; // 'profile', 'article', 'group_post'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes: Record<string, string[]> = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      pdf: ['application/pdf'],
    };

    if (!allowedTypes[fileType]?.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Expected ${fileType}` },
        { status: 400 }
      );
    }

    // Validate file size (10MB for images, 50MB for videos, 20MB for PDFs)
    const maxSizes: Record<string, number> = {
      image: 10 * 1024 * 1024,
      video: 50 * 1024 * 1024,
      pdf: 20 * 1024 * 1024,
    };

    if (file.size > maxSizes[fileType]) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizes[fileType] / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${timestamp}-${randomString}.${fileExtension}`;
    const bucketName = 'media-files'; // Make sure this bucket exists in Supabase

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Save metadata to database
    const { data: mediaFile, error: dbError } = await supabaseAdmin
      .from('media_files')
      .insert({
        file_name: file.name,
        file_path: fileName,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        bucket_name: bucketName,
        entity_type: entityType,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to delete the uploaded file if database insert fails
      await supabaseAdmin.storage.from(bucketName).remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to save file metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: publicUrl,
      file: mediaFile,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
