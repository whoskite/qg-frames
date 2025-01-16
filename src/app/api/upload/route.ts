import { NextResponse } from 'next/server';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
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
      // Initialize Firebase
      const firebaseApp = await initializeFirebase();
      
      // Validate Firebase initialization
      if (!firebaseApp) {
        console.error('Firebase initialization returned null');
        return NextResponse.json({ 
          error: 'Firebase initialization failed',
          details: 'Firebase app is null'
        }, { status: 500 });
      }

      if (!firebaseApp.app) {
        console.error('Firebase app is undefined');
        return NextResponse.json({ 
          error: 'Firebase initialization failed',
          details: 'Firebase app is undefined'
        }, { status: 500 });
      }

      // Get and validate storage
      console.log('Getting Firebase Storage instance...');
      const storage = getStorage(firebaseApp.app);
      if (!storage) {
        console.error('Failed to get Firebase Storage instance');
        return NextResponse.json({ 
          error: 'Storage initialization failed',
          details: 'Could not get Firebase Storage instance'
        }, { status: 500 });
      }
      
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `quotes/${timestamp}.png`;
      console.log('Generated filename:', filename);
      
      try {
        // Create a reference to the file location
        const storageRef = ref(storage, filename);
        console.log('Created storage reference:', {
          fullPath: storageRef.fullPath,
          name: storageRef.name
        });
        
        // Upload the base64 string
        console.log('Starting file upload...', {
          imageLength: image.length,
          storageRefPath: storageRef.fullPath
        });

        await uploadString(storageRef, image, 'data_url');
        console.log('File uploaded successfully');
        
        // Get the download URL
        console.log('Getting download URL...');
        const url = await getDownloadURL(storageRef);
        console.log('Got download URL:', url);
        
        return NextResponse.json({ url });
      } catch (storageError: unknown) {
        console.error('Storage operation error:', storageError);
        if (storageError instanceof Error) {
          console.error('Storage error details:', {
            message: storageError.message,
            name: storageError.name,
            stack: storageError.stack
          });
        }
        return NextResponse.json({ 
          error: 'Storage operation failed',
          details: storageError instanceof Error ? storageError.message : 'Unknown storage error'
        }, { status: 500 });
      }
    } catch (uploadError: unknown) {
      console.error('Firebase upload error:', uploadError);
      if (uploadError instanceof Error) {
        console.error('Error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
          name: uploadError.name,
          cause: uploadError.cause
        });
      }
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
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
    }
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