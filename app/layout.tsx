import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ 
  subsets: ['latin'], 
  variable: '--font-nunito',
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'MONKI - Apprenez en vous amusant',
  description: 'Transformez votre apprentissage en jeu avec notre plateforme MONKI. Gagnez des 🍌 bananes, débloquez des badges et montez dans le classement !',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${nunito.variable} font-nunito antialiased`}>{children}</body>
    </html>
  );
}

