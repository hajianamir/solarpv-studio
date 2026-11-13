# Catalog persistence compatibility


The historical `equipmentCatalogData.saveCustomModule`, `saveCustomInverter`,
and `saveCustomBattery` helpers now return a **Promise** of `{ success, errors? }`.
Callers must await and check it. They delegate to the v4 catalog repository's
cross-tab Web Lock rather than writing ignored legacy v2 keys; an unavailable
lock or storage produces a failure. The corresponding full-catalog getters read
v4 first, then v3/v2 for unmigrated installations. A browser or third-party
writer that bypasses the shared lock/protocol is outside this guarantee.

Repository replacements of an existing ID require the previously read record as
the second `expected` argument; the repository compares it against fresh storage
while holding the lock and rejects stale or unqualified replacements. Supplying
`expected` is an update, not an insert: if its ID differs or the record has been
deleted, the operation fails instead of recreating it. An identical write without
an expectation is idempotent; with an expectation, the expectation is checked
first. Browser deletes likewise require the expected record and return `false`
for a conflict, missing lock/record or storage failure. Obtain a fresh snapshot
and show an error on `false`; `clearCustomEquipment` is an explicit whole-catalog
operation, not a conditional delete. Legacy save helpers do not replace a
different record under an existing ID. The application currently has no catalog
edit/delete UI; integrations must account for these API changes.
