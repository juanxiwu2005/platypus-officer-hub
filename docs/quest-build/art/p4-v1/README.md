# P4 art style kit

The owner accepted the six P3 frames. Preserve their original fictional six-adult cast, wardrobe, warm sunset/teal palette, rounded vector-like 2.5D illustration and Pip badge silhouette. P3 references and the cast/style notes remain in ../../storyboards/p3-v1/.

Runtime assets live in src/quest/assets (repository root):

| Asset | Role | Provenance |
| --- | --- | --- |
| club-hq.png | Crew welcome and successful plan | Unchanged approved P3 frame 01; CSS crops baked HUD/controls |
| countdown-clean.png | Empty board behind live timeline controls | Built-in image generation edit using approved P3 frame 02 |
| consequence-clean.png | Scripted cancelled-room outcome | Built-in image generation edit using approved P3 frame 03 |
| pip-guide.png | Reusable transparent hint guide | Built-in image generation edit using approved P3 frame 01 |

Exact edit prompts are in prompts/. SHA-256 values are in manifest.json. Selected original generated PNG bytes were copied, not programmatically retouched. CSS positions/crops the illustrations; no generated label acts as a control. All buttons, task names, hints, captions and source quotations are real DOM. Keep mobile faces visible above the board; keep the board horizontally scrollable within the viewport.

Use the existing design/motion tokens. Sound starts off, captions remain visible, and reduced motion removes the outcome animation and drag settling. No new timing tokens, dependency or true 3D asset was introduced. Future art must use the same accepted references and be reviewed before adoption.
