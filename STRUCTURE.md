# 📁 Structure du Projet

## ⚠️ Important : Structure Next.js App Router

Pour que Next.js 14 App Router fonctionne correctement, les fichiers doivent être dans `app/` à la **racine du projet**, pas dans `pages/app/`.

### Structure actuelle (à corriger)

```
pages/
├── app/          ← Doit être déplacé à la racine
├── components/
└── lib/
```

### Structure correcte pour App Router

```
app/              ← À la racine
├── layout.tsx
├── page.tsx
├── globals.css
├── student/
│   ├── layout.tsx
│   ├── courses/
│   ├── ranking/
│   ├── profile/
│   └── badges/
└── admin/
    ├── layout.tsx
    ├── kpi/
    ├── courses/
    └── badges/

pages/            ← Pour les composants et libs
├── components/
└── lib/
```

## 🔧 Correction rapide

Pour corriger la structure, déplacez le contenu de `pages/app/` vers `app/` à la racine :

```bash
# Sur Linux/Mac
mv pages/app app

# Sur Windows PowerShell
Move-Item -Path pages/app -Destination app
```

Puis mettez à jour `tsconfig.json` :

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./app/*"],
      "@/components/*": ["./pages/components/*"],
      "@/lib/*": ["./pages/lib/*"]
    }
  }
}
```

Et `tailwind.config.js` :

```js
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './pages/components/**/*.{js,ts,jsx,tsx,mdx}',
],
```

## 📝 Alternative : Utiliser Pages Router

Si vous préférez garder `pages/`, vous pouvez utiliser Pages Router au lieu d'App Router. Dans ce cas :

1. Renommez `pages/app/` en `pages/`
2. Utilisez `_app.tsx` et `_document.tsx` au lieu de `layout.tsx`
3. Les routes seront dans `pages/` directement

Mais l'App Router est recommandé pour Next.js 14.

