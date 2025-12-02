'use client';

import { useEffect, useState } from 'react';

interface MonkeyProfessorProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  skinId?: string;
  className?: string;
}

async function getActiveSkin() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/shop/purchases`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
      },
    });
    if (!response.ok) return null;
    const purchases = await response.json();
    
    // Find active skin
    const activeSkin = (purchases as any[]).find((p: any) => p.item?.type === 'skin' && p.item?.isActive);
    return activeSkin?.item?.icon || null;
  } catch (e) {
    return null;
  }
}

export default function MonkeyProfessor({ 
  size = 'medium', 
  animated = false,
  skinId,
  className = '' 
}: MonkeyProfessorProps) {
  const [skinIcon, setSkinIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (skinId) {
      // If skinId is provided, use it directly
      setSkinIcon(skinId);
      setLoading(false);
    } else {
      // Otherwise, fetch active skin
      getActiveSkin().then(icon => {
        setSkinIcon(icon);
        setLoading(false);
      });
    }
  }, [skinId]);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const defaultMonkey = '/singes/gemini_generated_image_9dl7059dl7059dl7-removebg-preview_480.png';

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <span className="text-2xl">🐵</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} ${animated ? 'animate-bounce' : ''}`} style={{ animationDuration: '3s' }}>
      <img
        src={skinIcon || defaultMonkey}
        alt="Singe professeur"
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to default if skin image fails to load
          (e.target as HTMLImageElement).src = defaultMonkey;
        }}
      />
    </div>
  );
}

