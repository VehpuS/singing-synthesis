# How to Run the NNSVS Streamlit App

This app lets you synthesize singing voice audio from MusicXML files using the supported NNSVS inference flow and a simple web UI.

For broader NNSVS background and a minimal smoke test outside the Streamlit app, see [NNSVS-proof-of-concept/docs/nnsvs-overview-and-setup.md](NNSVS-proof-of-concept/docs/nnsvs-overview-and-setup.md).

## Prerequisites

- You must have the `nnsvs` conda environment activated (see the main NNSVS setup instructions).
- All dependencies must be installed from [NNSVS-proof-of-concept/streamlit_app/requirements.txt](NNSVS-proof-of-concept/streamlit_app/requirements.txt) inside the `streamlit_app` folder.

## Step-by-step Instructions

1. **Activate the nnsvs environment:**

   ```bash
   conda activate nnsvs
   ```

2. **Install requirements (if not already done):**

   ```bash
   cd NNSVS-proof-of-concept/streamlit_app
   python3 -m pip install -r requirements.txt
   # Or, for extra safety:
   $(which pip3) install -r requirements.txt
   ```

   - Always activate your conda environment first. Using `python3 -m pip` or `$(which pip3)` ensures you install into the active environment.

3. **Install the default English model (recommended once per machine):**

   ```bash
   cd NNSVS-proof-of-concept/streamlit_app
   python3 install_models.py
   ```

   - This downloads the public `秋山大智 AI / A.I.CHI` ENUNU archive from Google Drive, converts it into an `nnsvs.svs.SPSVS(...)`-compatible local model directory, and installs it into `NNSVS-proof-of-concept/streamlit_app/models/english/aichi-ai`.
   - You can also install it from inside the app with the **Install English model** button.

4. **Run the Streamlit app:**

   ```bash
   streamlit run app.py
   ```

5. **Open the app in your browser:**
   - Streamlit will print a local URL (usually http://localhost:8501). Open this in your browser.

6. **Use the app:**
   - Upload a MusicXML file.
   - The default selection is the English `秋山大智 AI / A.I.CHI` model.
   - Use **Japanese built-in models** if you want the packaged `yoko` models from `nnsvs`.
   - Use **Custom local model directory** if you want to point at another extracted model.
   - Click "Synthesize Vocals" to generate and play/download the output WAV.

## Notes

- Always use `python3 -m pip` or `$(which pip3)` inside the `nnsvs` environment for compatibility.
- `nnsvs 0.1.1` is not compatible with NumPy 2 for synthesis. Keep `numpy<2` in this environment.
- The current pip release of `nnsvs` does not expose `NNSVS.from_pretrained(...)`. This app uses the supported `nnsvs.pretrained.create_svs_engine(...)` and `nnsvs.svs.SPSVS(...)` APIs instead.
- `h5py` is required at runtime by `nnsvs`, even though it may not be pulled in automatically by every install path. It is included in the app requirements.
- `gdown` is included in the app requirements so the app and `install_models.py` can download the English A.I.CHI model from Google Drive.
- `scikit-learn` is installed explicitly because the English A.I.CHI ENUNU package ships scaler files in `joblib` format that are converted during installation.
- If you add new dependencies, update `requirements.txt` and re-run the install command.
- Built-in pretrained model IDs come from `nnsvs.pretrained.get_available_model_ids()`. In the current environment, the packaged Japanese options are `r9y9/20220322_yoko_timelag_mdn_duration_mdn_acoustic_resf0conv` and `r9y9/yoko_latest`.
- The packaged pretrained models are Japanese-oriented. MusicXML files with English lyrics can emit `Lyric in unknown language` warnings from `pysinsy` and may produce weak results, which is why the English A.I.CHI model is the default app selection.

## Current Status

- The English `秋山大智 AI / A.I.CHI` installer path is now working: the app can download the ENUNU archive, normalize it into an `SPSVS(...)`-compatible directory, load the model, and synthesize non-empty audio.
- The current A.I.CHI integration coverage only proves runtime success, not musical correctness.
- For the uploaded English MusicXML file currently under test, the generated audio is still incorrect: it produces sound, but it does not yet correspond to the intended notes or lyrics. Treat this as a known open issue to be fixed separately.

## Troubleshooting

- If `streamlit` is not found after install, check your environment:
  - Run `which pip3`, `which python3`, and `which streamlit` — all should point to your conda environment (e.g., .../envs/nnsvs/bin/).
  - If not, reinstall with `$(which pip3) install --force-reinstall streamlit` after activating your environment.
  - Avoid using system or Homebrew pip3 outside the conda environment.
- If you see `ModuleNotFoundError: No module named 'nnsvs'`, the package was installed outside the active conda environment. Re-run the requirements install after `conda activate nnsvs`.
- If you see `ModuleNotFoundError: No module named 'h5py'`, reinstall the app requirements. The app depends on `h5py` at runtime through `nnsvs`.
- If the English model install fails, re-run `python3 install_models.py --force` from `NNSVS-proof-of-concept/streamlit_app` after activating the `nnsvs` environment.
- On macOS, the installer uses the system `bsdtar` to extract the `.rar` archive. If you are on another machine without a RAR-capable extractor, install one and rerun the installer.
- If you see `ImportError: cannot import name 'NNSVS' from 'nnsvs.svs'`, you are running code written against an unsupported API. Use the current app code in [NNSVS-proof-of-concept/streamlit_app/app.py](NNSVS-proof-of-concept/streamlit_app/app.py), which uses `create_svs_engine` and `SPSVS`.
- If you see `TypeError: only 0-dimensional arrays can be converted to Python scalars` during `engine.svs(labels)`, your environment is using NumPy 2. Fix it with `python3 -m pip install "numpy<2"` and rerun the app.
- If the English model generates audio that does not match the notes or lyrics in your MusicXML, that is currently a known model/frontend correctness issue, not an installation failure. The current repo state only validates that the English model can run end to end.

## Optional Integration Test

- To run the end-to-end A.I.CHI validation as a pytest test instead of an ad-hoc script, use:

  ```bash
  cd /Users/vehpus/git/singing-synthesis
  /Users/vehpus/miniforge3/envs/nnsvs/bin/python -m pytest -m integration NNSVS-proof-of-concept/tests/test_aichi_integration.py
  ```

- This test is marked as `integration`, so plain `pytest` runs skip it by default unless you explicitly select integration tests with `-m integration`.
- The test downloads or reuses the installed A.I.CHI model, builds labels from `nnsvs.util.example_xml_file("get_over")`, and verifies that `SPSVS(...)` can synthesize non-empty audio end to end.
- The integration test does not currently verify that the generated English singing matches the intended notes or lyrics for arbitrary MusicXML inputs.

---

For troubleshooting or advanced usage, see the main NNSVS documentation or ask for help.
