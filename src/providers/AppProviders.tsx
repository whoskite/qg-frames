import React from 'react';
import { ModalProvider } from '../contexts/ModalContext';
import { UserDataProvider } from '../contexts/UserDataContext';
import { AudioProvider } from '../contexts/AudioContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AudioProvider>
      <UserDataProvider>
        <ModalProvider>
          {children}
        </ModalProvider>
      </UserDataProvider>
    </AudioProvider>
  );
} 