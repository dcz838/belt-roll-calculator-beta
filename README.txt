Belt Roll Calculator
Web Edition 2.2 Beta
Build 2026.07.24.03.03 - Security

Default Administrator:
User: Raymond
PIN: 0921

Security build updates:
- Configurable administrator authentication timeout: every time, 1, 5, 10, 15, 30 minutes, or custom 1-480 minutes
- Global lock/countdown indicator placed to the left of the language selector
- Click the countdown to lock immediately
- Sensitive operations reuse a valid administrator session until the timer expires
- Add/delete users, reveal/change PIN, History edit/undo, sensitive Settings, and backup import/export require administrator verification
- Optional device unlock beta using Face ID, Touch ID, fingerprint, Windows Hello, or device PIN through WebAuthn when supported
- Device unlock always retains the administrator PIN as fallback
- PIN reveal automatically hides after five seconds
- Enter confirms modal actions; Escape cancels/closes modal dialogs
- Security changes are recorded in History
- Authentication is cleared on logout or browser session end

Notes:
- WebAuthn device unlock requires HTTPS and compatible browser/device support.
- Existing inventory and users stored by earlier builds are retained.

Deploy:
Upload the contents of this folder to the GitHub Pages repository root.
