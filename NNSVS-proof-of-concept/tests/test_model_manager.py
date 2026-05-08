import importlib.util
from pathlib import Path

import joblib
import numpy as np
from omegaconf import OmegaConf
from sklearn.preprocessing import MinMaxScaler, StandardScaler


STREAMLIT_APP_DIR = Path(__file__).resolve().parents[1] / "streamlit_app"
MODEL_MANAGER_PATH = STREAMLIT_APP_DIR / "model_manager.py"
MODEL_MANAGER_SPEC = importlib.util.spec_from_file_location(
	"streamlit_app_model_manager", MODEL_MANAGER_PATH
)
assert MODEL_MANAGER_SPEC is not None and MODEL_MANAGER_SPEC.loader is not None
MODEL_MANAGER = importlib.util.module_from_spec(MODEL_MANAGER_SPEC)
MODEL_MANAGER_SPEC.loader.exec_module(MODEL_MANAGER)
find_model_directory = MODEL_MANAGER.find_model_directory
is_model_directory = MODEL_MANAGER.is_model_directory
normalize_enunu_model_directory = MODEL_MANAGER.normalize_enunu_model_directory


def test_is_model_directory_requires_config_and_weights(tmp_path):
	model_dir = tmp_path / "model"
	model_dir.mkdir()
	(model_dir / "config.yaml").write_text("name: test\n")
	(model_dir / "checkpoint.pth").write_text("weights")

	assert is_model_directory(model_dir)


def test_find_model_directory_returns_nested_model_folder(tmp_path):
	nested_dir = tmp_path / "archive" / "release" / "model"
	nested_dir.mkdir(parents=True)
	(nested_dir / "config.yaml").write_text("name: test\n")
	(nested_dir / "acoustic.pth").write_text("weights")

	assert find_model_directory(tmp_path) == nested_dir


def test_normalize_enunu_model_directory_creates_spsvs_layout(tmp_path):
	source_dir = tmp_path / "ENUNU_A.I.CHI_v1.1.1"
	model_dir = source_dir / "exp" / "voice_model"
	stats_dir = source_dir / "dump" / "voice_stats" / "norm"
	question_dir = source_dir / "hed"
	question_dir.mkdir(parents=True)
	(question_dir / "intunist_en.hed").write_text("QS test\n")

	config = OmegaConf.create(
		{
			"sample_rate": 44100,
			"frame_period": 5,
			"log_f0_conditioning": True,
			"question_path": "hed/intunist_en.hed",
			"model_dir": "exp/voice_model",
			"stats_dir": "dump/voice_stats/norm",
			"timelag": {"checkpoint": "best_loss.pth", "allowed_range": [-150, 150]},
			"duration": {"checkpoint": "latest.pth"},
			"acoustic": {"checkpoint": "latest.pth"},
		}
	)
	OmegaConf.save(config, source_dir / "enuconfig.yaml")

	for section_name, checkpoint_name in {
		"timelag": "best_loss.pth",
		"duration": "latest.pth",
		"acoustic": "latest.pth",
	}.items():
		section_dir = model_dir / section_name
		section_dir.mkdir(parents=True, exist_ok=True)
		(section_dir / "model.yaml").write_text(f"name: {section_name}\n")
		(section_dir / checkpoint_name).write_bytes(b"weights")

	stats_dir.mkdir(parents=True, exist_ok=True)
	input_scaler = MinMaxScaler().fit(np.array([[0.0, 1.0], [2.0, 3.0]]))
	output_scaler = StandardScaler().fit(np.array([[0.0], [1.0], [2.0]]))
	assert input_scaler.min_ is not None
	assert output_scaler.scale_ is not None
	for section_name in ("timelag", "duration", "acoustic"):
		joblib.dump(input_scaler, stats_dir / f"in_{section_name}_scaler.joblib")
		joblib.dump(output_scaler, stats_dir / f"out_{section_name}_scaler.joblib")

	destination_dir = tmp_path / "normalized-model"
	normalize_enunu_model_directory(source_dir, destination_dir)

	assert (destination_dir / "config.yaml").is_file()
	assert (destination_dir / "qst.hed").is_file()
	assert (destination_dir / "timelag_model.yaml").is_file()
	assert (destination_dir / "timelag_model.pth").is_file()
	assert (destination_dir / "duration_model.yaml").is_file()
	assert (destination_dir / "duration_model.pth").is_file()
	assert (destination_dir / "acoustic_model.yaml").is_file()
	assert (destination_dir / "acoustic_model.pth").is_file()
	assert np.array_equal(
		np.load(destination_dir / "in_timelag_scaler_min.npy"),
		input_scaler.min_,
	)
	assert np.array_equal(
		np.load(destination_dir / "out_acoustic_scaler_scale.npy"),
		output_scaler.scale_,
	)

	normalized_config = OmegaConf.load(destination_dir / "config.yaml")
	assert normalized_config.timelag.force_clip_input_features is False
	assert normalized_config.duration.force_clip_input_features is False
	assert normalized_config.acoustic.relative_f0 is False