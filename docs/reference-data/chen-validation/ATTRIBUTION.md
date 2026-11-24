# Chen2020 LG M50 experimental validation data

Creators: Chang-Hui Chen, Ferran Brosa Planella, Kieran O'Regan, Dominika Gastol, W. Dhammika Widanage, Emma Kendrick.

Original dataset: https://doi.org/10.5281/zenodo.4032561
Original publisher metadata: https://zenodo.org/api/records/4032561
Related article: https://doi.org/10.1149/1945-7111/ab9050
License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ . License confirmed from original publisher metadata `metadata.license.id=cc-by-4.0`, not inferred from mirror software licensing. No creator endorsement is implied.

Three raw CSV files are unchanged. Acquisition uses the GitHub mirror and commit in manifest.json; their byte sizes and MD5 match the original publisher's metadata. Local SHA256 and Git blob hashes lock replay. MD5 is corroboration of byte identity, not a modern authenticity guarantee. The mirror's MATLAB/software license does not govern these original CC-BY data and no mirror software is included.

Explicit fetch / offline verify:

```sh
.venv/bin/python scripts/acquire_chen_validation.py --fetch
.venv/bin/python scripts/acquire_chen_validation.py
```

**Acquisition integrity only.** The three approximately 48-hour experimental records contain CC/CV charging, discharge and relaxation plus cell surface/chamber temperatures. They have not been passed through the short-horizon `battery_protocol` model. No model error, fitted parameter, field calibration, temperature agreement, safety or life claim follows from storing and parsing these files. A future independent benchmark must preserve full history, validate manufacturer sign conventions, account for initial state and CC/CV transitions, separate parameter-fitting cells from held-out cells, and report mismatch rather than tune a threshold to pass.

CSV has 13 metadata lines followed by a header. Original current values are magnitudes and mode `C`/`D` carries direction; never ingest as signed PyBaMM current without explicit mode conversion. `R`, `O` and `SBr` also occur and are not interchangeable active current steps. Some timestamps duplicate at mode boundaries; parsing must preserve order and transitions rather than silently deduplicate.
