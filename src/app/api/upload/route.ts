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

      // Upload the image as a data URL
      await uploadString(storageRef, image, 'data_url');

      // Get the download URL using Firebase's getDownloadURL
      const url = await getDownloadURL(storageRef);

      console.log('Upload successful, URL:', url);
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