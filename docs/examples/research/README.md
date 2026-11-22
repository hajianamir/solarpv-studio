# Research inputs, NOT a full operational dataset

`dtu-v3-t7-rendered-excerpt.csv` is a **7-row transcribed subset of tool-rendered
real measurements**, not synthetic, and not an original XLSX export/receipt.

Source: DTU, https://doi.org/10.11583/DTU.13580759.v3, CC BY 4.0.
Authors: Nicholas Riedel, Djaber Berrian, Daniel Alvarez Mira, Alexander Aguilar
Protti, Peter Behrensdorff Poulsen, Joris Libal, Jan Vedde.
Publication: https://doi.org/10.3390/app10238487.
Original file URL: https://ndownloader.figshare.com/files/34726600.
The web retrieval tool parsed the workbook into 717 chunks. Meteo values were
transcribed from chunk 36, T7 validation from chunk 350; flags and units from
chunks 1 and 85. No original bytes checksum was verified. No data filling.
Local CET fixed GMT+1 (workbook Site Data) end hours 11..17 on June 4, 2019
are explicitly converted to UTC 10..16. No daylight-saving inference or second
five-minute correction. Only T7 is instrumented for module BACK temperature.
Wind speed sensor installation height remains UNKNOWN (not hub height).

The fixed research plan was written before computing residuals. Four training
and three holdout observations from one day cannot establish independent-season
performance. Holdout values outside the train envelope explicitly block
acceptance; small-domain overfitting and sensor bias remain possible. The paper's
baseline coefficients 29.5/1.6 are recommended simulation settings, not true
measured coefficients at this installation. Research bounds are NOT engineering
approval. Do not reuse these coefficients for cell temperature, energy, another
site, or a 10 m wind basis. No operational calibration is approved by this input.

Synthetic uncertainty plans are generated only by tests, separately; no project
CVs or P90 values are inferred from this thermal excerpt.
