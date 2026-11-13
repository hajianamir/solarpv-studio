# Offline installation and updates

The first visit requires a working connection to the application origin. The
service worker must finish installing and precaching the complete build before
use offline; an install with a missing asset is rejected rather than marked
ready. After installation, the app shell and emitted application chunks are
cached for offline use, including previously unvisited lazy views. Mapping
tiles, live provider data, geocoding and server APIs are not guaranteed
available offline; analytical fallback is identified separately from live data.
Browser storage is subject to quota, eviction, private browsing and user-clearing.

A new worker installs into a separate content-versioned cache and **waits**
while old controlled tabs remain open. It does not force activation or reload,
and old workers use only their own cache so a new build cannot overwrite the
old shell. Save or export work in **every** tab before closing those tabs. Local
save is a single browser-storage snapshot, not a multi-project or cross-tab merge:
a later save in any tab replaces the previous one. Use JSON export to preserve
multiple drafts. To restore a local save after reopening, open Project Data
Management (JSON), choose **Restore last local save**, and confirm. It is not
automatically applied; restoration replaces the current tab's edits.

A rollback to an earlier deployed build also waits for current controlled tabs
to close, and is only available offline once that build has been installed and
precached. These guarantees assume the browser retains the worker and caches and
that all deployed assets for the build are reachable during installation. A
browser error/reset/reload can still lose unsaved in-memory edits; read and
confirm the warning before proceeding. Test deployed hosting and cache headers
separately; local synthetic update tests do not establish production behavior.
