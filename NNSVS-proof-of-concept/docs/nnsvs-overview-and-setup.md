# NNSVS Overview and Setup

This document summarizes why NNSVS was chosen for this repo, how to run a minimal local smoke test, and where the repo-specific app docs live.

## Why NNSVS in This Repo

- NNSVS is easier to automate from Python than GUI-first tools such as OpenUtau.
- It fits the current repo pipeline: MusicXML can be converted to HTS labels through `pysinsy`, then synthesized through `nnsvs`.
- It runs locally on Apple Silicon without needing a separate desktop app workflow.
- The repo now includes both a direct Python smoke-test path and a Streamlit app workflow on top of the same inference stack.

## Quick Local Smoke Test

1. Install Miniforge for Apple Silicon from <https://github.com/conda-forge/miniforge/releases/latest>.
2. Create and activate a clean environment:

   ```bash
   conda create -n nnsvs python=3.11 -y
   conda activate nnsvs
   ```

3. Install the minimal runtime packages needed for inference and MusicXML label generation:

   ```bash
   python3 -m pip install "numpy<2" nnsvs h5py soundfile pysinsy nnmnkwii torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu
   ```

4. Test with a small self-contained script:

   ```python
   import numpy as np
   import pysinsy
   import soundfile as sf
   from nnmnkwii.io import hts
   from nnsvs.pretrained import create_svs_engine
   from nnsvs.util import example_xml_file

   contexts = pysinsy.extract_fullcontext(example_xml_file("get_over"))
   labels = hts.HTSLabelFile.create_from_contexts(contexts)

   engine = create_svs_engine("r9y9/yoko_latest")
   wav, sr = engine.svs(labels)
   sf.write("output.wav", wav.astype(np.int16), sr)
   print("Done! Check output.wav")
   ```

5. Run it with `python3 test_synth.py`.

## Repo-Specific Docs

- For the Streamlit app, the English A.I.CHI installer, and the integration test flow, see [streamlit_app-running.md](streamlit_app-running.md).

## Current Repo Status

- The repo includes a Streamlit app that installs the English `秋山大智 AI / A.I.CHI` model by downloading an ENUNU archive and normalizing it into an `nnsvs.svs.SPSVS(...)`-compatible local model directory.
- The packaged pretrained flow that ships with `nnsvs` is still Japanese-oriented. If your MusicXML contains English lyrics, `pysinsy` may emit `Lyric in unknown language` warnings and results may degrade unless you switch to a compatible model and frontend.
- The A.I.CHI installer and integration test now prove that the English model can run end to end in this repo.
- The currently tested uploaded English MusicXML input still produces incorrect audio that does not match the intended notes or lyrics. That correctness issue remains open and should be handled separately from installation/runtime work.

## Troubleshooting

- If a package appears missing after installation, run `which pip3` and `which python3` and confirm they both point into the `nnsvs` conda environment.
- If `h5py` is missing, reinstall it explicitly. `nnsvs` imports it at runtime.
- If you see `ImportError: cannot import name 'NNSVS' from 'nnsvs.svs'`, use `nnsvs.pretrained.create_svs_engine(...)` or `nnsvs.svs.SPSVS(...)` instead.
- If synthesis fails with `TypeError: only 0-dimensional arrays can be converted to Python scalars`, install `numpy<2`.

## Deployment Direction

- Local batch processing can reuse the same label-generation and engine-loading path as the Streamlit app.
- If you want a hosted frontend later, the same Python pipeline can be wrapped in Gradio or a similar small web layer.