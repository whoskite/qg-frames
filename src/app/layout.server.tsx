import { generateMetadata } from './metadata.server';

export { generateMetadata };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 