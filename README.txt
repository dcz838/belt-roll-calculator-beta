Canonical package/folder name: BeltRollCalculator_WebEdition_2_1_Beta_InstallButton
Visible app version: Web Edition 2.1 Beta
Update: Install App button is always visible. If browser supports PWA prompt, it installs directly. Otherwise it opens About and highlights install instructions.

Canonical package/folder name: BeltRollCalculator_WebEdition_2_1_Beta
Visible app version: Web Edition 2.1 Beta

Canonical package/folder name: BeltRollCalculator_WebEdition_2_1

Belt Roll Calculator Web Edition 2.1

Updates:
- Added Install App button for browsers that support PWA install prompt
- Improved PWA manifest: id, scope, display_override, categories, maskable icon entry
- Updated service worker cache to 2.1
- Install instructions remain in About page
- No install instructions on home page
- App-style UI, three languages, translated Length labels

Deploy:
Upload all files/folders to GitHub Pages root:
index.html
manifest.webmanifest
service-worker.js
css/
js/
assets/

Note:
After upload, wait for GitHub Pages deployment and refresh the browser.
Chrome may cache the old service worker briefly.

Author: Raymond Lei
Copyright © 2026 Raymond Lei
All Rights Reserved.
