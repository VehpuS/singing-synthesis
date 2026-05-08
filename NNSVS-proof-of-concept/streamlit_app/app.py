import io
import tempfile
from pathlib import Path

import numpy as np
import pysinsy
import soundfile as sf
import streamlit as st
from nnmnkwii.io import hts
from nnsvs.pretrained import create_svs_engine, get_available_model_ids

from model_manager import (
	AICHI_INSTALL_DIR,
	AICHI_MODEL_NAME,
	AICHI_MODEL_URL,
	install_aichi_model,
	is_model_directory,
	load_local_spsvs_engine,
)


def require_supported_numpy():
	major_version = int(np.__version__.split(".", 1)[0])
	if major_version >= 2:
		st.error(
			"This app currently requires numpy<2 with nnsvs 0.1.1. "
			"Run `python3 -m pip install \"numpy<2\"` inside the nnsvs environment."
		)
		st.stop()


@st.cache_resource(show_spinner=False)
def load_engine(model_source, model_value):
	if model_source == "pretrained":
		return create_svs_engine(model_value)
	return load_local_spsvs_engine(model_value)


def build_labels(musicxml_bytes):
	with tempfile.NamedTemporaryFile(delete=False, suffix=".musicxml") as temp_file:
		temp_file.write(musicxml_bytes)
		temp_path = Path(temp_file.name)

	try:
		contexts = pysinsy.extract_fullcontext(str(temp_path))
		return hts.HTSLabelFile.create_from_contexts(contexts)
	finally:
		temp_path.unlink(missing_ok=True)


st.title("NNSVS Singing Voice Synthesizer")
require_supported_numpy()
st.write(
	"Upload a MusicXML file and synthesize vocals with the supported NNSVS "
	"pretrained-engine workflow."
)
st.info(
	"The default English model uses a local A.I.CHI install. The packaged NNSVS "
	"models remain available separately and are Japanese-oriented."
)

model_family = st.radio(
	"Model family",
	(
		"English model (recommended)",
		"Japanese built-in models",
		"Custom local model directory",
	),
	horizontal=False,
)

if model_family == "English model (recommended)":
	model_source = "local"
	model_value = str(AICHI_INSTALL_DIR)
	english_installed = is_model_directory(AICHI_INSTALL_DIR)
	st.subheader(AICHI_MODEL_NAME)
	st.caption(
		"English model downloaded from Google Drive and loaded from a local SPSVS directory."
	)
	st.caption(f"Source: {AICHI_MODEL_URL}")
	st.text_input(
		"Installed English model path",
		value=model_value,
		disabled=True,
	)
	if english_installed:
		st.success("English model is installed and ready.")
	else:
		st.warning(
			"The English model is not installed yet. Install it once before synthesizing."
		)

	install_label = "Reinstall English model" if english_installed else "Install English model"
	if st.button(install_label):
		with st.spinner(f"Downloading and installing {AICHI_MODEL_NAME}..."):
			try:
				installed_path = install_aichi_model(force=english_installed)
				load_engine.clear()
				st.success(f"Installed {AICHI_MODEL_NAME} to {installed_path}")
			except Exception as error:
				st.exception(error)
elif model_family == "Japanese built-in models":
	available_model_ids = sorted(get_available_model_ids())
	model_source = "pretrained"
	model_value = st.selectbox("Japanese pretrained model", available_model_ids)
	st.caption(
		"These built-in NNSVS models download into the local NNSVS cache on first use."
	)
	st.warning(
		"These packaged models are Japanese-oriented. English lyrics often trigger "
		"'Lyric in unknown language' warnings in pysinsy and may synthesize poorly."
	)
else:
	model_source = "local"
	model_value = st.text_input(
		"Local model directory",
		value="",
		placeholder="/absolute/path/to/nnsvs-model",
	).strip()
	st.caption(
		"Point this to an extracted NNSVS model directory containing config.yaml "
		"and the trained .pth files."
	)

musicxml_file = st.file_uploader("Upload MusicXML file", type=["xml", "musicxml"])

if musicxml_file is not None:
	st.success(f"Uploaded: {musicxml_file.name}")

if st.button("Synthesize Vocals", type="primary", disabled=musicxml_file is None):
	if musicxml_file is None:
		st.error("Upload a MusicXML file first.")
	elif model_source == "local" and not model_value:
		st.error("Enter a local model directory before synthesizing.")
	elif model_source == "local" and not is_model_directory(Path(model_value)):
		st.error(
			"The selected local model is not installed or is missing required files. "
			"Install the English model or point the app to a directory containing config.yaml "
			"and the trained .pth files."
		)
	else:
		with st.spinner("Loading the model and synthesizing audio..."):
			try:
				labels = build_labels(musicxml_file.getvalue())
				engine = load_engine(model_source, model_value)
				wav, sample_rate = engine.svs(labels)

				audio_buffer = io.BytesIO()
				sf.write(audio_buffer, wav.astype(np.int16), sample_rate, format="WAV")
				audio_bytes = audio_buffer.getvalue()

				st.audio(audio_bytes, format="audio/wav")
				st.download_button(
					"Download WAV",
					data=audio_bytes,
					file_name=f"{Path(musicxml_file.name).stem}.wav",
					mime="audio/wav",
				)
				st.success("Synthesis complete.")
			except Exception as error:
				st.exception(error)