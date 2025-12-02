'use client';

import { useState } from 'react';

interface QuestionEditorProps {
  question: any;
  onSave: (question: any) => void;
  onCancel: () => void;
}

export default function QuestionEditor({ question, onSave, onCancel }: QuestionEditorProps) {
  const [formData, setFormData] = useState({
    question: question?.question || '',
    type: question?.type || 'multiple_choice',
    options: question?.options || '',
    correctAnswer: question?.correctAnswer || '',
    order: question?.order || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on type
    if (formData.type === 'multiple_choice') {
      try {
        const options = JSON.parse(formData.options);
        if (options.length < 2) {
          alert('Veuillez fournir au moins 2 options');
          return;
        }
        const correctIndex = parseInt(formData.correctAnswer);
        if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
          alert('Veuillez sélectionner une réponse correcte valide');
          return;
        }
      } catch (e) {
        alert('Format JSON invalide pour les options');
        return;
      }
    } else if (formData.type === 'memory_pair' || formData.type === 'match_pair') {
      if (!formData.question || !formData.correctAnswer) {
        alert('Veuillez remplir tous les champs pour les paires');
        return;
      }
    }

    onSave({
      ...question,
      ...formData,
    });
  };

  // For multiple choice, show options editor
  const renderMultipleChoiceEditor = () => {
    let options: string[] = [];
    try {
      if (formData.options) {
        options = JSON.parse(formData.options);
      }
    } catch (e) {
      options = [];
    }

    const addOption = () => {
      options.push('');
      setFormData({ ...formData, options: JSON.stringify(options) });
    };

    const updateOption = (index: number, value: string) => {
      options[index] = value;
      setFormData({ ...formData, options: JSON.stringify(options) });
    };

    const removeOption = (index: number) => {
      options.splice(index, 1);
      setFormData({ ...formData, options: JSON.stringify(options) });
    };

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options (format JSON array)
        </label>
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            + Ajouter option
          </button>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Réponse correcte (index, 0 = première option)
          </label>
          <input
            type="number"
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
            min="0"
            max={options.length - 1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    );
  };

  // For memory/match pairs
  const renderPairEditor = () => {
    let pair: string[] = [];
    try {
      if (formData.options) {
        pair = JSON.parse(formData.options);
      }
    } catch (e) {
      pair = ['', ''];
    }

    const updatePair = (index: number, value: string) => {
      pair[index] = value;
      setFormData({ ...formData, options: JSON.stringify(pair) });
    };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.type === 'memory_pair' ? 'Terme' : 'Élément gauche'}
          </label>
          <input
            type="text"
            value={pair[0] || ''}
            onChange={(e) => updatePair(0, e.target.value)}
            placeholder="Terme/Élément"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.type === 'memory_pair' ? 'Définition' : 'Élément droit'}
          </label>
          <input
            type="text"
            value={pair[1] || ''}
            onChange={(e) => updatePair(1, e.target.value)}
            placeholder="Définition/Correspondance"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Réponse correcte
          </label>
          <input
            type="text"
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
            placeholder={formData.type === 'memory_pair' ? 'Définition' : 'Correspondance'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type de question
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any, options: '', correctAnswer: '' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="multiple_choice">Quiz (Choix multiples)</option>
          <option value="memory_pair">Memory (Paire de cartes)</option>
          <option value="match_pair">Match (Relier)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question / Terme
        </label>
        <input
          type="text"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          required
          placeholder={formData.type === 'multiple_choice' ? 'Question' : 'Terme ou élément'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {formData.type === 'multiple_choice' && renderMultipleChoiceEditor()}
      {(formData.type === 'memory_pair' || formData.type === 'match_pair') && renderPairEditor()}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ordre
        </label>
        <input
          type="number"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {question?.id ? 'Modifier' : 'Créer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

