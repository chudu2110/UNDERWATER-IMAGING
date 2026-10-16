# Project workspace conventions

- Keep disposable development logs, screenshots, QA reports and smoke-test artifacts under `logs/dev/`. This directory must be safe to delete without breaking the demo or real training.
- Write active server stdout/stderr to `logs/runtime/`; write real training stdout/stderr to `logs/training/`. Do not create `.log` files at the project root.
- For taste-skill browser inspection, pass `--out logs/dev/design-qa/inspect`. `check_web.mjs` writes screenshots under `logs/dev/design-qa/qa`.
- Keep real datasets in `UnderWaterDataset/`, source downloads in `downloads/`, and real model runs/checkpoints/validation records in `output/demo/`. These are not disposable development logs.
- `outputs/` remains an empty compatibility mount. Prepared gallery results live in web/examples/ and are generated from the pretrained UIEB checkpoint; do not present them as results of the current training run.
- See `DRIVE_FILES.md` for the three Drive download locations. They are one dataset ZIP and two checkpoint files, not three Drive folders.
- Use the Conda environment `demo` for Python commands.
- Canonical non-web source lives in visible .ipynb files mirroring the module tree. Generated import bridges live in .runtime/; web Python lives in web/. Edit notebook code cells.
- TRAIN_ALL.ipynb is the native fresh-training workflow; PROJECT.ipynb is the source index and conversion verification.
- The user runs notebooks directly in VS Code with Conda demo. Do not start JupyterLab or background training without a new request. Preserve notebook outputs; never rebuild a running notebook.
- Keep operating instructions in instruction.md. Notebook markdown should contain concise technical descriptions, methodology and results, not editing/run instructions or conversion boilerplate. Preserve this style in notebook generators.
- Keep notebook titles, section headings and module names in English. Use existing identifiers such as test and test_file_writes; do not translate module names. Explanatory prose may remain Vietnamese.
- Use requirements.txt as the only Python dependency manifest. Do not add separate demo/train/notebook requirements or environment freeze files. Keep the full project file map and operating instructions in instruction.md.
- Web UI text is English. Preserve the WebGL ocean. Place the prepared gallery and method notes before Your Upload. Gallery is read-only (compare/view/zoom), with no model selector or inference submit. Upload has its own model, inference and result state.
