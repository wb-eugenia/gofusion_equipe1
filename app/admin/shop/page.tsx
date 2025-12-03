'use client';

import { useEffect, useState } from 'react';
import { usePopup } from '@/hooks/usePopup';

async function getShopItems(): Promise<any[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/admin/shop/items`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load shop items');
  return response.json();
}

async function createShopItem(data: any) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/admin/shop/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to create shop item');
  }
  return response.json();
}

async function updateShopItem(id: string, data: any) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/admin/shop/items/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to update shop item');
  }
  return response.json();
}

async function deleteShopItem(id: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/admin/shop/items/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to delete shop item');
  }
  return response.json();
}

export default function AdminShopPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess, showConfirm, PopupComponent } = usePopup();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'skin' as 'skin' | 'powerup' | 'cosmetic',
    price: 10,
    data: '',
    icon: '',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getShopItems();
      setItems(data);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement des items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        price: formData.price,
      };
      
      if (formData.data) {
        submitData.data = formData.data;
      }
      if (formData.icon) {
        submitData.icon = formData.icon;
      }

      if (editingItem) {
        await updateShopItem(editingItem.id, submitData);
        showSuccess('Item modifié avec succès');
      } else {
        await createShopItem(submitData);
        showSuccess('Item créé avec succès');
      }
      await loadItems();
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        type: 'skin',
        price: 10,
        data: '',
        icon: '',
      });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      type: item.type,
      price: item.price,
      data: item.data || '',
      icon: item.icon || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer cet item ?',
      async () => {
        try {
          await deleteShopItem(itemId);
          await loadItems();
          showSuccess('Item supprimé avec succès');
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression',
      'Supprimer',
      'Annuler'
    );
  };

  if (loading) {
    return <div className="text-center py-12">Chargement des items...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🛒 Gestion de la Boutique</h1>
            <p className="text-gray-600">Gérez les items disponibles dans la boutique</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                name: '',
                description: '',
                type: 'skin',
                price: 10,
                data: '',
                icon: '',
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            + Nouvel Item
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.type === 'skin' ? 'bg-blue-100 text-blue-700' :
                      item.type === 'powerup' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'skin' ? 'Skin' : item.type === 'powerup' ? 'Power-up' : 'Cosmétique'}
                    </span>
                    <span className="text-yellow-600 font-semibold">🍌 {item.price} bananes</span>
                  </div>
                  {item.icon && (
                    <p className="text-xs text-gray-500">Icône: {item.icon}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun item dans la boutique. Créez-en un pour commencer !
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingItem ? 'Modifier l\'item' : 'Nouvel item'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'skin' | 'powerup' | 'cosmetic' })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="skin">Skin</option>
                    <option value="powerup">Power-up</option>
                    <option value="cosmetic">Cosmétique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (bananes)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icône (optionnel)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Ex: 🎨, /icons/skin1.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Données JSON (optionnel)</label>
                  <textarea
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    rows={2}
                    placeholder='{"color": "#FF0000", "effect": "glow"}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    {editingItem ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

