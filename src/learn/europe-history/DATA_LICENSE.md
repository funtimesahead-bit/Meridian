# Data sources for borders.json

`borders.json` is built by `scripts/build-europe-history.mjs` from:

- **historical-basemaps** by André Ourednik, GPL-3.0,
  https://github.com/aourednik/historical-basemaps. Used for the key-year
  maps from 1492 to 1880. Names, overlords and some gaps were corrected, and
  rough outlines were added for Royal Hungary and Transylvania (1600, 1650).
- **CShapes 2.0**, Schvitz, Girardin, Rüegger, Weidmann, Cederman and
  Gleditsch (2022), "Mapping the International System, 1886–2019: The
  CShapes 2.0 Dataset", Journal of Conflict Resolution 66(1). Distributed
  under the GPL (version 2 or later) in the R package `cshapes`. Used for
  1886 onwards.

Both are simplified and limited to shapes that reach the area around Europe. As a derived work, `borders.json`
is covered by the GPL.
