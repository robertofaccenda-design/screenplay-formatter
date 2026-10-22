# Third-party notices

## CineCrew / FilmDSL

The FilmDSL field mapping in `src/continuity/continuity.js` and its example/documentation is adapted from the published schema of **Better Call CineCrew: Consistent Ultra-Long Narrative-to-Film Generation** (ECCV 2026).

- Upstream: https://github.com/Ironieser/CineCrew
- Original schema copyright: Copyright (c) 2026 Sixun Dong.
- Original license: Apache License, Version 2.0, included in `licenses/CineCrew-Apache-2.0.txt`.
- Relevant schema: `src/schemas/blueprint.py`, blob `313c3485a441a82a2255d0417de0bc5e90378426`.

Changes: JavaScript import validation and round-trip adapter; original DeepFrame UI, approved structured continuity checks, manual/visual observation comparison and report. The Python pipeline and original VisualJudge are not bundled or executed. No upstream dataset images, generated media, model weights or sample screenplay were copied. The sample scene is synthetic content created for this module.

This notice does not relicense the entire DeepFrame application or imply endorsement by the CineCrew authors.
