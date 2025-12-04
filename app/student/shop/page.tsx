'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

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
  const { showSuccess, showError, ToastComponent } = useToast();

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
      showError(error.message || '❌ Erreur lors du chargement de la boutique');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: any) => {
    try {
      await purchaseItem(item.id);
      showSuccess(`✅ ${item.name} acheté ! Skin ajouté à ton inventaire`);
      await loadData();
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de l\'achat');
    }
  };

  const handleActivateSkin = async (skinId: string) => {
    try {
      await activateSkin(skinId);
      showSuccess('✨ Skin activé avec succès !');
      await loadData();
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de l\'activation du skin');
    }
  };

  const filteredItems = items.filter(item => item.type === 'skin');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <img src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" alt="Mascotte" className="w-24 h-24 mx-auto" />
          </div>
          <p className="text-xl font-bold text-text">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastComponent />
      <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-text mb-2">Boutique</h1>
        <div className="flex items-center gap-4">
          <p className="text-textMuted">Votre solde:</p>
          <span className="text-2xl font-black text-secondary">🍌 {user?.xp || 0} bananes</span>
        </div>
      </div>


      {/* Items Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12 text-textMuted">
            Aucun item disponible dans cette catégorie
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
              <div className="text-center mb-4">
                {item.icon ? (
                  <img src={item.icon} alt={item.name} className="w-24 h-24 mx-auto object-contain" />
                ) : (
                  <div className="w-24 h-24 mx-auto bg-inactive/20 rounded-2xl flex items-center justify-center text-4xl">
                  </div>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-text mb-2">{item.name}</h3>
              <p className="text-textMuted mb-4 text-sm">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-secondary font-bold text-lg">🍌 {item.price} bananes</span>
                {item.purchased ? (
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 bg-success/10 text-success rounded-xl text-sm font-bold">
                      Acheté
                    </span>
                    {item.type === 'skin' && (
                      <button
                        onClick={() => handleActivateSkin(item.id)}
                        className="px-3 py-1.5 bg-primary text-white rounded-xl hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 text-sm font-bold min-h-[36px]"
                        style={{ boxShadow: '0 2px 0 0 rgba(157, 95, 47, 1)' }}
                      >
                        Activer
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={user?.xp < item.price}
                    className={`px-4 py-2 rounded-2xl transition-all duration-200 text-sm font-bold min-h-[44px] ${
                      user?.xp >= item.price
                        ? 'bg-primary text-white hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0'
                        : 'bg-inactive text-textMuted cursor-not-allowed opacity-50'
                    }`}
                    style={user?.xp >= item.price ? { boxShadow: '0 4px 0 0 rgba(157, 95, 47, 1)', borderBottom: '4px solid rgba(157, 95, 47, 1)' } : {}}
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
    </>
  );
}

