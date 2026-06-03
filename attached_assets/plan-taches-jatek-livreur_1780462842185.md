# Plan des tâches — Jatek Livreur

---

## Tâche #1 — Bouton "En ligne" fiable + nouvelle UI

### Pourquoi

Le toggle Switch actuel a deux problèmes critiques :

1. **Silencieux** — si le profil driver n'est pas encore chargé (`driverId` est null), l'appui ne fait rien, sans aucun message d'erreur. L'utilisateur croit que ça marche, mais rien ne se passe côté serveur.
2. **UI ambiguë** — un Switch horizontal est difficile à lire : est-ce que je suis en ligne ou hors ligne ? Est-ce que j'appuie pour activer ou désactiver ?

### Résultat attendu

- Un grand bouton plein-largeur sur l'écran d'accueil :
  - **Vert** avec texte "Passer en ligne" quand le livreur est hors ligne
  - **Rouge/gris** avec texte "Passer hors ligne" quand le livreur est en ligne
- Un spinner visible pendant le changement d'état (plus de doute sur "ça charge ou pas ?")
- Si le driver n'est pas chargé au moment du tap → le bouton recharge automatiquement le profil driver via `/api/drivers/me`, puis exécute le changement de statut
- Si tout échoue → une alerte explicite s'affiche : "Impossible de charger votre profil. Reconnectez-vous."
- Plus jamais de silence : l'utilisateur sait toujours ce qui se passe
- Le build Expo fonctionne sans erreur (conflit de port 8081 avec le mockup-sandbox corrigé)

### Hors scope

- Changement du design général de l'app
- Notifications push pour les nouvelles courses
- Géolocalisation en arrière-plan

### Étapes

1. **Nouveau composant `GoOnlineButton`** — Créer `components/GoOnlineButton.tsx` : grand bouton plein-largeur, vert "Passer en ligne" / rouge "Passer hors ligne", spinner pendant `toggling`. Supprimer l'ancien `OnlineToggle.tsx`.

2. **Logique `setOnline` robuste** — Dans `LocationTrackingContext.tsx`, supprimer le `if (!driverId) return` silencieux. Le remplacer par : appel `refreshDriver()` si driverId est null, attente du résultat, puis exécution de l'action. Si toujours null → `Alert` explicite.

3. **Mise à jour de l'écran d'accueil** — Dans `app/(tabs)/index.tsx`, remplacer `<OnlineToggle>` par `<GoOnlineButton>`.

4. **Correction du build Expo** — Dans `scripts/build.js`, la fonction `checkMetroHealth()` vérifie uniquement `response.ok` sur le port 8081 — ce qui est toujours vrai car le mockup-sandbox répond `200`. Corriger en vérifiant que la réponse contient bien le format Metro (ex: JSON avec `status`), pas du HTML Vite.

5. **Rebuild et redéploiement** — Lancer le build Expo après correction et publier la nouvelle UI en production.

### Fichiers concernés

- `artifacts/livreur/components/OnlineToggle.tsx` (à remplacer)
- `artifacts/livreur/contexts/LocationTrackingContext.tsx` lignes 147-179
- `artifacts/livreur/contexts/AuthContext.tsx` lignes 126-134
- `artifacts/livreur/app/(tabs)/index.tsx` lignes 107-114
- `artifacts/livreur/scripts/build.js`

---

## Tâche #2 — Trajet optimisé Google Directions sur l'écran commande

### Pourquoi

L'écran de commande active (`app/order/[id].tsx`) affiche uniquement la position du livreur sur une carte vide. Il n'y a pas d'itinéraire tracé, pas de marqueur pour le restaurant, pas de marqueur pour l'adresse de livraison, pas d'ETA, pas de distance restante.

Le livreur doit ouvrir Google Maps manuellement pour naviguer, ce qui est une friction inutile.

**Contrainte technique importante** : la base de données ne stocke pas les coordonnées GPS du restaurant ni de l'adresse de livraison — uniquement du texte. Il faut géocoder ces adresses via l'API Google Geocoding avant de pouvoir tracer l'itinéraire, avec mise en cache en mémoire pendant la session.

### Prérequis

Une clé Google Maps API avec ces 4 services activés :
- Maps SDK for Android
- Maps SDK for iOS
- Directions API
- Geocoding API

### Résultat attendu

Sur l'écran d'une commande active (statut `picked_up` ou `en_route`) :

- Une **polyline bleue** trace l'itinéraire routier réel (pas une ligne droite) : livreur → restaurant → client
- Un **marker vert** (icône fourchette) sur le restaurant
- Un **marker rouge** (icône maison) sur l'adresse de livraison
- Le marker du livreur se **déplace en temps réel**
- Un bandeau en haut de la carte affiche : `3,2 km · 8 min`
- Un bouton **"Recalculer"** permet de forcer un nouveau calcul de trajet
- La carte se **recentre automatiquement** sur le livreur quand il avance (mode Follow)
- Le trajet se **rafraîchit automatiquement** toutes les 10 secondes si le livreur a bougé de plus de 50 mètres
- Sur web ou si la clé API est absente : **fallback propre** sans plantage (carte statique + bouton Naviguer existant)
- Aucune régression sur les fonctionnalités existantes (OTP, confirmation livraison, etc.)

### Hors scope

- Navigation turn-by-turn vocale
- Historique des trajets en base de données
- Calcul d'ETA côté serveur
- Modifications du schéma de base de données

### Étapes

1. **Configurer la clé Google Maps** — Ajouter `GOOGLE_MAPS_API_KEY` comme secret Replit, l'intégrer dans `app.json` sous `expo.extra.googleMapsApiKey` et dans le plugin `react-native-maps`.

2. **Installer `@mapbox/polyline`** — Seule dépendance ajoutée, pour décoder les polylines encodées retournées par l'API Directions. Pas de package `react-native-maps-directions` (trop lourd).

3. **Créer un hook `useDirections`** — Nouveau fichier `hooks/useDirections.ts` qui :
   - Géocode les adresses restaurant et livraison via Google Geocoding API (une seule fois par session, résultat mis en cache dans une `Map` JS)
   - Appelle Google Directions API : origin = driver, waypoints = restaurant, destination = client
   - Retourne `{ polyline, distanceText, durationText, loading, refresh }`
   - Se rafraîchit automatiquement si le driver bouge de plus de 50m

4. **Enrichir l'écran `app/order/[id].tsx`** — Ajouter sur la carte :
   - `<Polyline>` bleue via `react-native-maps`
   - Markers restaurant (vert) et client (rouge) avec labels
   - Bandeau ETA/distance flottant en haut de la carte
   - Bouton "Recalculer"
   - Mode Follow (recentrage auto sur le livreur)
   - Tout conditionnel `Platform.OS !== "web"` pour ne pas casser le web

5. **Ajuster la carte** — Passer de 260px à 320px de hauteur pour plus de visibilité sur l'itinéraire.

### Fichiers concernés

- `artifacts/livreur/app/order/[id].tsx`
- `artifacts/livreur/app.json`
- `artifacts/livreur/package.json`
- `artifacts/livreur/hooks/useDirections.ts` (à créer)
