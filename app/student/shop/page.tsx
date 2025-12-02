'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';

async function getShopItems() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/shop/items`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load shop items');
  return response.json();
}

async function purchaseItem(itemId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/shop/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify({ itemId }),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to purchase item');
  }
  return response.json();
}

async function activateSkin(skinId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/shop/activate-skin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify({ skinId }),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to activate skin');
  }
  return response.json();
}

export default function ShopPage() {
  const [items, setItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'skin' | 'powerup' | 'cosmetic'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsData, userData] = await Promise.all([
        getShopItems(),
        getUser(),
      ]);
      setItems(itemsData as any[]);
      setUser(userData as any);
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: any) => {
    if (!confirm(`Acheter "${item.name}" pour ${item.price} 🍌 bananes ?`)) return;
    
    try {
      await purchaseItem(item.id);
      alert('Achat réussi !');
      await loadData();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleActivateSkin = async (skinId: string) => {
    try {
      await activateSkin(skinId);
      alert('Skin activé !');
      await loadData();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.type === filter);

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🛒 Boutique</h1>
        <div className="flex items-center gap-4">
          <p className="text-gray-600">Votre solde:</p>
          <span className="text-2xl font-bold text-yellow-600">🍌 {user?.xp || 0} bananes</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'all' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilter('skin')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'skin' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Skins
        </button>
        <button
          onClick={() => setFilter('powerup')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'powerup' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Power-ups
        </button>
        <button
          onClick={() => setFilter('cosmetic')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'cosmetic' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cosmétiques
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-600">
            Aucun item disponible dans cette catégorie
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-4">
                {item.icon ? (
                  <img src={item.icon} alt={item.name} className="w-24 h-24 mx-auto object-contain" />
                ) : (
                  <div className="w-24 h-24 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                    {item.type === 'skin' ? '🐵' : item.type === 'powerup' ? '⚡' : '✨'}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
              <p className="text-gray-600 mb-4 text-sm">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-600 font-bold text-lg">🍌 {item.price} bananes</span>
                {item.purchased ? (
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                      ✓ Acheté
                    </span>
                    {item.type === 'skin' && (
                      <button
                        onClick={() => handleActivateSkin(item.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                      >
                        Activer
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={user?.xp < item.price}
                    className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                      user?.xp >= item.price
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Acheter
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

