import { NextResponse } from 'next/server';
import { getStorage, ref, uploadString, getDownloadURL, StorageError } from 'firebase/storage';
import { initializeFirebase } from '../../../lib/firebase';

export async function POST(request: Request) {
  try {
    console.log('Starting upload process...');
    const { image } = await request.json();
    
    if (!image) {
      console.error('No image provided in request');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    try {
      console.log('Initializing Firebase...');
      const firebaseApp = await initializeFirebase();
      
      if (!firebaseApp?.app) {
        console.error('Firebase initialization failed');
        return NextResponse.json({ error: 'Firebase initialization failed' }, { status: 500 });
      }

      const storage = getStorage(firebaseApp.app);
      const timestamp = Date.now();
      const imagePath = `quotes/${timestamp}.png`;
      const storageRef = ref(storage, imagePath);

      // Add metadata for proper caching and public access
      const metadata = {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
        customMetadata: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, HEAD',
          'access-control-expose-headers': 'Content-Length, Content-Type, ETag',
          'access-control-max-age': '3600'
        }
      };

      // Upload the image with metadata
      await uploadString(storageRef, image, 'data_url', metadata);

      // Get the download URL and verify it's accessible
      const url = await getDownloadURL(storageRef);
      console.log('Generated Firebase URL:', url);

      // Return the URL immediately without additional verification
      return NextResponse.json({ url });

    } catch (error) {
      console.error('Firebase operation failed:', error);
      if (error instanceof StorageError) {
        return NextResponse.json({ 
          error: 'Storage operation failed',
          code: error.code,
          message: error.message
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 