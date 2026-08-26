# DAACS Ceramic Recorder

A guided web application for recording historical ceramic sherds using the DAACS (Digital Archaeological Archive of Comparative Slavery) cataloging standard. Designed for fieldwork and lab analysis in Southern Ontario, with assemblages primarily dating from the **late 19th to mid 20th century**.

## What It Does

The app walks catalogers through each DAACS ceramic recording field in a step-by-step wizard:

1. **Identify** — Enter Artifact ID and Count, then select Material and Ware type. Selecting a ware auto-fills default surface types and shows an identification tip card (date range, paste/glaze characteristics, decoration notes)
2. **Form** — Manufacturing Technique, Vessel Category, Form, Completeness. Selecting a manufacturing technique shows DAACS-based diagnostic evidence and reference guidance.
3. **Surfaces & Colour** — Exterior/Interior surface type and colour, paste colour. Colour pickers automatically show the correct colour chart: *Refined Surface Colors* (Individual Glossy swatches) for white-bodied wares (porcelain, whiteware, bone china, etc.) or *DAACS MCRS* swatches for non-white-bodied wares
4. **Condition** — Evidence of Burning, Post-Manufacturing Modification, Wear
5. **Decoration** — Toggle decorated/undecorated; add multiple decoration rows with Technique, Colour, Stylistic Element (all 544 DAACS elements, searchable), Motif, Genre, and Pattern Name
6. **Base Mark** — Type, colour, reference (optional)
7. **Measurements** — Thickness, Max Size, Weight, Rim/Base dimensions (optional)
8. **Review & Save** — Summary card before committing to the session log

Completed records accumulate in a **session log** at the bottom of the page. The full session can be exported as a **CSV** file at any time.

## Sources

### Primary Source

**DAACS — Digital Archaeological Archive of Comparative Slavery**  
[daacs.org](https://www.daacs.org/)

All field names, authority terms, colour systems, and recording protocols are drawn directly from:
- [DAACS Ceramics Cataloging Manual (October 2018)](https://www.daacs.org/about-the-database/daacs-cataloging-manual/)
- [DAACS Ceramic Table — authority terms for all fields](https://www.daacs.org/about-the-database/database-structure/ceramic-table/)
- [DAACS Color Data](https://www.daacs.org/about-the-database/daacs-color-data/)

### Identification Support

**Maryland Archaeological Conservation Laboratory — Diagnostic Artifacts in Maryland**  
[apps.jefpat.maryland.gov/diagnostic](https://apps.jefpat.maryland.gov/diagnostic/HistoricCeramics/HistoricCeramics.aspx)

Ware identification tips (defining attributes, date ranges, paste and glaze descriptions) are drawn from this reference for the following wares: Whiteware, Ironstone/White Granite, Bone China, Creamware, Pearlware, Chinese Hard-Paste Porcelain, Soft-Paste Porcelain, American Stoneware, White Salt Glaze, Delftware, and others.

**Saint Mary's University — Archaeology Lab Ceramics Database**  
[smu.ca/anthropology/lab-ceramics-database.html](https://www.smu.ca/anthropology/lab-ceramics-database.html)

Provides supplementary reference context for ceramic types commonly found on 18th–19th century archaeological sites in Atlantic Canada and the Northeast.

## Technical Notes

- Static site — no server required. Hosted on GitHub Pages.
- Munsell → sRGB conversion uses [munsell.js](https://github.com/privet-kitty/munsell.js) (MPL-2.0) via [esm.sh](https://esm.sh)
- All session data lives in the browser only; nothing is transmitted
- CSV export format matches DAACS field naming conventions

## Scope

Ware types and identification tips are prioritized for assemblages from **Southern Ontario, late 1800s – mid 1900s**:
most commonly Whiteware, Ironstone/White Granite, Bone China, and American Stoneware.
All 64 DAACS ware types are available in the full dropdown.
