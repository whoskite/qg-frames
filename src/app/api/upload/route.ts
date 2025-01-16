import { NextResponse } from 'next/server';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '../../../lib/firebase';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      console.error('No image provided in request');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    try {
      // Initialize Firebase
      const firebaseApp = await initializeFirebase();
      if (!firebaseApp || !firebaseApp.app) {
        throw new Error('Failed to initialize Firebase');
      }
      
      const storage = getStorage(firebaseApp.app);
      
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `quotes/${timestamp}.png`;
      
      // Create a reference to the file location
      const storageRef = ref(storage, filename);
      
      // Upload the base64 string
      await uploadString(storageRef, image, 'data_url');
      
      // Get the download URL
      const url = await getDownloadURL(storageRef);
      
      return NextResponse.json({ url });
    } catch (uploadError: unknown) {
      console.error('Firebase upload error:', uploadError);
      return NextResponse.json(
        { 
          error: 'Upload failed',
          message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          type: typeof uploadError === 'object' && uploadError !== null ? uploadError.constructor.name : 'Unknown'
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { 
        error: 'Request processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error === 'object' && error !== null ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
} 