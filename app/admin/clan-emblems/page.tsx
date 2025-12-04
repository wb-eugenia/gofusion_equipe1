'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

const CLAN_EMBLEMS = [
  { id: 'francais', name: 'Français', file: 'clan-francais.png', description: 'Emblème du clan Français' },
  { id: 'maths', name: 'Mathématiques', file: 'clan-maths.png', description: 'Emblème du clan Mathématiques' },
  { id: 'sciences', name: 'Sciences', file: 'clan-sciences.png', description: 'Emblème du clan Sciences' },
  { id: 'histoire', name: 'Histoire', file: 'clan-histoire.png', description: 'Emblème du clan Histoire' },
  { id: 'geographie', name: 'Géographie', file: 'clan-geographie.png', description: 'Emblème du clan Géographie' },
];

export default function AdminClanEmblemsPage() {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [emblems, setEmblems] = useState(CLAN_EMBLEMS);
  const { showSuccess, showError, ToastComponent } = useToast();

  const handleFileUpload = async (emblemId: string, file: File) => {
    if (!file.type.startsWith('image/png')) {
      showError('Veuillez sélectionner un fichier PNG valide');
      return;
    }

    setUploadingId(emblemId);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('emblemId', emblemId);

      const response = await fetch('/api/admin/upload-clan-emblem', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const result = await response.json();
      showSuccess(`✅ Emblème "${CLAN_EMBLEMS.find(e => e.id === emblemId)?.name}" mis à jour avec succès !`);
      
      // Rafraîchir l'affichage
      setEmblems(emblems.map(e => e.id === emblemId ? { ...e, updated: true } : e));
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'upload de l\'emblème');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <>
      <ToastComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text mb-2">⚔️ Emblèmes des Clans</h1>
          <p className="text-textMuted">Gérez les icônes des emblèmes des clans (format PNG)</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {emblems.map((emblem) => (
            <div key={emblem.id} className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-24 h-24 mb-4 flex items-center justify-center bg-background rounded-lg border-2 border-border">
                  <img 
                    src={`/badges/${emblem.file}`} 
                    alt={emblem.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <h3 className="text-lg font-bold text-text mb-1">{emblem.name}</h3>
                <p className="text-sm text-textMuted">{emblem.description}</p>
                <p className="text-xs text-textMuted mt-2">Fichier: {emblem.file}</p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(emblem.id, file);
                    }
                  }}
                  disabled={uploadingId === emblem.id}
                  className="hidden"
                  id={`file-input-${emblem.id}`}
                />
                <label
                  htmlFor={`file-input-${emblem.id}`}
                  className={`
                    block w-full px-4 py-3 rounded-2xl text-center font-semibold cursor-pointer
                    transition-all duration-200 min-h-[44px] flex items-center justify-center
                    ${uploadingId === emblem.id
                      ? 'bg-primary/50 text-white cursor-not-allowed'
                      : 'bg-primary text-white hover:brightness-105 active:scale-[0.98]'
                    }
                  `}
                >
                  {uploadingId === emblem.id ? '⏳ Upload en cours...' : '📤 Changer l\'emblème'}
                </label>
              </div>

              <p className="text-xs text-textMuted mt-3 text-center">
                Recommandé: PNG avec fond transparent, minimum 200x200px
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-background rounded-2xl p-6 border-2 border-border">
          <h2 className="text-xl font-bold text-text mb-3">ℹ️ Instructions</h2>
          <ul className="space-y-2 text-sm text-text">
            <li>✓ Les fichiers doivent être au format PNG</li>
            <li>✓ Il est recommandé d'avoir un fond transparent</li>
            <li>✓ Taille minimum recommandée: 200x200 pixels</li>
            <li>✓ Les emblèmes s'affichent en 96x96 pixels (pour Français, Histoire, Géographie)</li>
            <li>✓ 80x80 pixels pour Mathématiques, 112x112 pour Sciences</li>
            <li>✓ Les changements s'appliquent immédiatement dans l'app</li>
          </ul>
        </div>
      </div>
    </>
  );
}
