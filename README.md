# Athlys — fichiers de distribution

Ce dépôt public héberge les fichiers binaires de distribution actuellement proposés par la vitrine Athlys. Le code source de l'application reste dans le dépôt privé `Athlys2`.

## Canaux stables

Athlys Mobile (Android) est l’application de suivi individuel et d’usage terrain. Athlys Desktop (Windows) est l’espace de pilotage bureau destiné notamment aux entraîneurs. Les deux clients partagent le backend Athlys, mais proposent des interfaces et des parcours différents.

- **Android** — [APK Athlys](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-android-latest/Athlys-Android.apk) — build debug de test, non signée avec une clé de production.
- **Windows x64** — [Installateur](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-windows-latest/Athlys-1.2.0-x64.exe) · [Version portable](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-windows-latest/Athlys-Portable-1.2.0-x64.exe).
- **macOS** — [Apple Silicon](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-macos-latest/Athlys-1.0.0-arm64.dmg) · [Intel](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-macos-latest/Athlys-1.0.0-x64.dmg). Builds non signées et non notariées.
- **iOS** — [Archive de développement](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-ios-simulator-latest/athlys-ios-development.zip). Archive Xcode/simulateur, pas une IPA installable.

## Version stable 1.2.0 — 4 novembre 2026

Le client Windows 1.2.0 embarque désormais l'interface Athlys Desktop et son serveur local. Après une première connexion, l'interface et les données déjà chargées restent consultables hors ligne ; les créations prises en charge sont mises en attente puis synchronisées au retour du réseau. Le client Android 1.2.0 intègre le même cache et la file de synchronisation côté application.

| Fichier | SHA-256 |
|---|---|
| Android — `Athlys-Android.apk` | `c7b3d4e245aae57f4b3cc7c42c442accffa4b627cdbbe6419dc3d44019712923` |
| Windows — `Athlys-1.2.0-x64.exe` | `4819f978e8e7b62c2067fe29d5f5eb0e7ff63f4fd67ede78fecd565986e85bc4` |
| Windows — `Athlys-Portable-1.2.0-x64.exe` | `61e70220a6cb2f8225b6d9ff18147dfc4017e450bca1f3a25c369ee1384ccdb9` |

L'APK Android reste une build debug non signée pour production ; les exécutables Windows restent non signés. La signature et la notarisation ne font pas partie de cette livraison.

## Migration

Les assets ont été copiés depuis les quatre releases publiques référencées par la vitrine au 3 novembre 2026. Les empreintes SHA-256 des six fichiers ont été vérifiées après transfert. Le workflow `.github/workflows/import-published-downloads.yml` conserve la procédure reproductible de cette importation ponctuelle ; il est déclenchable manuellement et ne republie pas automatiquement les anciennes versions.

La vitrine doit désormais pointer vers ces URLs sous `Lijw936/Athlys-downloads`. Les anciennes releases sont conservées comme sauvegarde jusqu'à validation finale.
