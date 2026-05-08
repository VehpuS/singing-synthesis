---
title: "How to Run the NNSVS Streamlit App"
description: |
  Step-by-step workflow for running the NNSVS Streamlit app in a conda environment, ensuring all dependencies are installed and the app is accessible via browser.
scopes:
  - workspace
outcome: |
  A running Streamlit web app for neural singing voice synthesis, accessible locally, with all dependencies installed in the correct environment and the supported nnsvs inference API.
---

# NNSVS Streamlit App Run Skill

## Workflow Steps

1. **Activate the nnsvs conda environment**
   - `conda activate nnsvs`
2. **Navigate to the streamlit_app directory**
   - `cd NNSVS-proof-of-concept/streamlit_app`
3. **Install all requirements into the active environment**
   - `python3 -m pip install -r requirements.txt`
   - _Or, for extra safety: `$(which pip3) install -r requirements.txt`_
   - _Note: Always activate your conda environment first. Using `python3 -m pip` or `$(which pip3)` ensures you install into the active environment._
   - _The requirements include `h5py` because `nnsvs` imports it at runtime._
   - _Keep `numpy<2` in this environment. `nnsvs 0.1.1` fails during synthesis on NumPy 2._
4. **Install the default English model once**
   - `python3 install_models.py`
   - _This downloads the `秋山大智 AI / A.I.CHI` ENUNU package, converts it into an SPSVS-compatible local model, and installs it into `streamlit_app/models/english/aichi-ai`._
5. **Run the Streamlit app**
   - `streamlit run app.py`
6. **Open the app in your browser**
   - Use the local URL printed by Streamlit (usually http://localhost:8501)
7. **Use the app**
   - Upload a MusicXML file
   - The default selection is the English `秋山大智 AI / A.I.CHI` model
   - The Japanese packaged models are grouped separately under **Japanese built-in models**
   - You can still enter a custom local model directory if needed
   - Click "Synthesize Vocals" to generate and play/download the output WAV
8. **Optional integration validation**
   - `cd /Users/vehpus/git/singing-synthesis`
   - `/Users/vehpus/miniforge3/envs/nnsvs/bin/python -m pytest -m integration NNSVS-proof-of-concept/tests/test_aichi_integration.py`
   - _This validates that the English model installs and synthesizes non-empty audio end to end._

## Decision Points

- If you add new dependencies, update `requirements.txt` and re-run the install command.
- The packaged `nnsvs` API uses `nnsvs.pretrained.create_svs_engine(...)` or `nnsvs.svs.SPSVS(...)`, not `NNSVS.from_pretrained(...)`.
- The English A.I.CHI model is installed locally through `install_models.py` or the app's install button and loaded with `SPSVS(...)`.
- Built-in pretrained model IDs are limited to whatever `nnsvs.pretrained.get_available_model_ids()` returns in the installed version.
- Built-in pretrained models are Japanese-oriented. English lyrics often trigger `Lyric in unknown language` warnings from `pysinsy`.
- The current A.I.CHI integration test validates runtime success only. On the currently tested uploaded English MusicXML input, the generated audio is still not note/lyric-correct and needs a separate fix.
- For best results, use Apple Silicon (M1/M2/M3/M4) with Metal/MPS acceleration enabled by your PyTorch install.

## Completion Criteria

- The app launches without errors
- The UI is accessible in your browser
- You can upload a MusicXML file and synthesize audio

## Troubleshooting

- If `streamlit` is not found, run `which pip3`, `which python3`, and `which streamlit` and confirm they all point into the `nnsvs` conda environment.
- If `nnsvs` is not found, reinstall the requirements after `conda activate nnsvs`.
- If `h5py` is missing, reinstall the requirements file. The app needs it at runtime.
- If an import error mentions `NNSVS`, you are using an outdated example. The working implementation is in [NNSVS-proof-of-concept/streamlit_app/app.py](NNSVS-proof-of-concept/streamlit_app/app.py).
- If synthesis fails with `TypeError: only 0-dimensional arrays can be converted to Python scalars`, install `numpy<2` and rerun.
- If the English model produces sound but not the expected notes or lyrics for an uploaded MusicXML file, treat that as a known correctness issue rather than an install/runtime failure.

## Example Prompts

- "How do I run the NNSVS Streamlit app?"
- "What are the steps to launch the singing synthesis UI?"
- "How do I update dependencies and restart the app?"

## Related Customizations

- Skill for deploying the app to Hugging Face Spaces
- Skill for troubleshooting common Streamlit or nnsvs errors
- Skill for batch processing MusicXML files via CLI
