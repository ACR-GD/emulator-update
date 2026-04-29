# Emulator Update Ticker

Outil de surveillance des mises a jour d'emulateurs open-source sur GitHub (stable et nightly), avec notifications desktop, Discord et dashboard web.

## Installation

```bash
npm install
cp .env.example .env
cp repos.example.json repos.json
```

Remplis ensuite `.env`:

- `GITHUB_TOKEN`: token personnel GitHub (recommande pour eviter les limites API).
- `DISCORD_WEBHOOK_URL`: optionnel, pour recevoir les alertes sur Discord.

Edite `repos.json` pour la liste des emulateurs a surveiller.

## Lancement

En developpement:

```bash
npm run dev
```

Puis ouvre:

```bash
http://localhost:3030
```

En build production:

```bash
npm run build
npm start
```

## Fonctionnement

- Le worker interroge l'API GitHub toutes les `pollIntervalMinutes`.
- `stable`: releases non `prerelease`.
- `nightly`: releases `prerelease`.
- Les releases deja vues sont stockees dans `data/releases.db`.
- Le dashboard affiche la derniere stable/nightly par projet et un fil recent.

## Notes

- Si un projet ne publie pas de nightly via les releases GitHub, il faut ajouter un fallback via tags/commits.
- Sur macOS, les notifications desktop ouvrent la page de la release.
