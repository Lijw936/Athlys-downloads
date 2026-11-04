# Athlys — fichiers de distribution

Ce dépôt public héberge les fichiers binaires de distribution actuellement proposés par la vitrine Athlys. Le code source de l'application reste dans le dépôt privé `Athlys2`.

## Canaux stables

Athlys Mobile (Android) est l’application de suivi individuel et d’usage terrain. Athlys Desktop (Windows) est l’espace de pilotage bureau destiné notamment aux entraîneurs. Les deux clients partagent le backend Athlys, mais proposent des interfaces et des parcours différents.

- **Android** — [APK Athlys](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-android-latest/Athlys-Android.apk) — build debug de test, non signée avec une clé de production.
- **Windows x64** — [Installateur](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-windows-latest/Athlys-1.1.0-x64.exe) · [Version portable](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-windows-latest/Athlys-Portable-1.1.0-x64.exe).
- **macOS** — [Apple Silicon](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-macos-latest/Athlys-1.0.0-arm64.dmg) · [Intel](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-macos-latest/Athlys-1.0.0-x64.dmg). Builds non signées et non notariées.
- **iOS** — [Archive de développement](https://github.com/Lijw936/Athlys-downloads/releases/download/athlys-ios-simulator-latest/athlys-ios-development.zip). Archive Xcode/simulateur, pas une IPA installable.

## Migration

Les assets ont été copiés depuis les quatre releases publiques référencées par la vitrine au 3 novembre 2026. Les empreintes SHA-256 des six fichiers ont été vérifiées après transfert. Le workflow `.github/workflows/import-published-downloads.yml` conserve la procédure reproductible de cette importation ponctuelle ; il est déclenchable manuellement et ne republie pas automatiquement les anciennes versions.

La vitrine doit désormais pointer vers ces URLs sous `Lijw936/Athlys-downloads`. Les anciennes releases sont conservées comme sauvegarde jusqu'à validation finale.
