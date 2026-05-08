import importlib.util
from pathlib import Path

import pysinsy
import pytest
from nnmnkwii.io import hts
from nnsvs.util import example_xml_file


STREAMLIT_APP_DIR = Path(__file__).resolve().parents[1] / "streamlit_app"
MODEL_MANAGER_PATH = STREAMLIT_APP_DIR / "model_manager.py"
MODEL_MANAGER_SPEC = importlib.util.spec_from_file_location(
	"streamlit_app_model_manager", MODEL_MANAGER_PATH
)
assert MODEL_MANAGER_SPEC is not None and MODEL_MANAGER_SPEC.loader is not None
MODEL_MANAGER = importlib.util.module_from_spec(MODEL_MANAGER_SPEC)
MODEL_MANAGER_SPEC.loader.exec_module(MODEL_MANAGER)
install_aichi_model = MODEL_MANAGER.install_aichi_model
load_local_spsvs_engine = MODEL_MANAGER.load_local_spsvs_engine


pytestmark = pytest.mark.integration


def test_aichi_model_synthesizes_from_musicxml():
	model_dir = install_aichi_model()
	engine = load_local_spsvs_engine(model_dir)
	contexts = pysinsy.extract_fullcontext(example_xml_file("get_over"))
	labels = hts.HTSLabelFile.create_from_contexts(contexts)

	assert len(labels) > 0, "Failed to create labels from contexts"

	wav, sample_rate = engine.svs(labels)

	assert wav.ndim == 1, f"Expected mono output, got {wav.ndim} dimensions"
	assert len(wav) > 0, "Synthesized waveform is empty"
	assert sample_rate is not None, "Sample rate is not defined"