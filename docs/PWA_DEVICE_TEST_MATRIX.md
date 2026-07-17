# BOPA PWA device test matrix

Record the actual device, operating system, browser version, tester, date, and result for every row.

| Platform | Test | Expected result |
|---|---|---|
| Windows Chrome | Install from browser | BOPA installs with its own app window and icon |
| Windows Edge | Install from browser | BOPA installs with its own app window and icon |
| macOS Chrome | Install from browser | BOPA installs and launches in standalone mode |
| Android Chrome | Install app | BOPA appears on the Home Screen and launches standalone |
| iPhone Safari | Add to Home Screen | BOPA appears on the Home Screen and opens as a web app |
| iPad Safari | Add to Home Screen | BOPA appears on the Home Screen and opens as a web app |
| Desktop | First online refresh | Workspace data is stored for offline use |
| Android | First online refresh | Workspace data is stored for offline use |
| iPhone | First online refresh | Workspace data is stored for offline use |
| Desktop | Offline launch | Branded offline workspace opens |
| Android | Offline launch | Branded offline workspace opens |
| iPhone | Offline launch | Branded offline workspace opens |
| Desktop | Offline maintenance create | Change is saved locally and shows as waiting |
| Android | Offline maintenance create | Change is saved locally and shows as waiting |
| iPhone | Offline maintenance create | Change is saved locally and shows as waiting |
| All | Reconnect | Waiting changes sync automatically |
| All | Duplicate submission | One local action creates one server record |
| All | Conflict | BOPA requests review instead of overwriting |
| All | Sign out | Device-local BOPA data is cleared |
| All | Account switch | Previous account data is not visible |
| All | Revoked workspace access | Local workspace is cleared after reconnect |
| All | Storage management | Usage and cleanup controls work |
| All | Update with empty queue | New worker applies after user chooses Update |
| All | Update with waiting changes | Reload is blocked until syncing completes |

## Result record

Use one line per device:

```text
Date:
Tester:
Device:
Operating system:
Browser and version:
Installed:
Standalone launch:
Offline read:
Offline write:
Reconnect sync:
Conflict review:
Account isolation:
Update flow:
Result:
Notes:
```
