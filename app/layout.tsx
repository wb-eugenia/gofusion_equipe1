import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gamification App - Apprenez en vous amusant',
  description: 'Transformez votre apprentissage en jeu avec notre plateforme de gamification. Gagnez des 🍌 bananes, débloquez des badges et montez dans le classement !',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

