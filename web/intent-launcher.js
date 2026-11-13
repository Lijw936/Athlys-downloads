import { registerPlugin } from '@capacitor/core';

// Capacitor 7 exposes custom native plugins through registerPlugin(),
// not reliably through the legacy Capacitor.Plugins global.
window.AthlysIntentLauncher = registerPlugin('IntentLauncher');
