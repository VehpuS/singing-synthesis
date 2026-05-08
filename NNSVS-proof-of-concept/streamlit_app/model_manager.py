from __future__ import annotations

import contextlib
import os
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path

import joblib
import numpy as np
import torch
from omegaconf import DictConfig, ListConfig
from omegaconf.base import ContainerMetadata
from omegaconf import OmegaConf


AICHI_MODEL_NAME = "秋山大智 AI / A.I.CHI"
AICHI_MODEL_FILE_ID = "1X2akaTMp3mDuJ-ok_WYzs5kARBV76LTx"
AICHI_MODEL_URL = "https://drive.google.com/file/d/1X2akaTMp3mDuJ-ok_WYzs5kARBV76LTx/view"
APP_DIR = Path(__file__).resolve().parent
MODEL_ROOT = APP_DIR / "models"
AICHI_INSTALL_DIR = MODEL_ROOT / "english" / "aichi-ai"


def register_torch_safe_globals() -> None:
	add_safe_globals = getattr(torch.serialization, "add_safe_globals", None)
	if add_safe_globals is not None:
		add_safe_globals([ContainerMetadata, DictConfig, ListConfig])


register_torch_safe_globals()


@contextlib.contextmanager
def allow_legacy_checkpoint_loading():
	previous_value = os.environ.get("TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD")
	os.environ["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = "1"
	try:
		yield
	finally:
		if previous_value is None:
			os.environ.pop("TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD", None)
		else:
			os.environ["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = previous_value


def load_local_spsvs_engine(model_dir: str | Path):
	from nnsvs.svs import SPSVS

	with allow_legacy_checkpoint_loading():
		return SPSVS(str(model_dir))


def is_model_directory(path: Path) -> bool:
	return path.is_dir() and (path / "config.yaml").is_file() and any(path.glob("*.pth"))


def has_required_spsvs_config_fields(path: Path) -> bool:
	if not is_model_directory(path):
		return False

	config = OmegaConf.load(path / "config.yaml")
	try:
		return (
			bool(config.sample_rate)
			and bool(config.frame_period)
			and config.timelag.force_clip_input_features is not None
			and config.duration.force_clip_input_features is not None
			and config.acoustic.relative_f0 is not None
		)
	except Exception:
		return False


def find_model_directory(search_root: Path) -> Path:
	if is_model_directory(search_root):
		return search_root

	candidates = sorted(
		(path for path in search_root.rglob("*") if is_model_directory(path)),
		key=lambda path: (len(path.parts), str(path)),
	)
	if not candidates:
		raise FileNotFoundError(
			"No extracted NNSVS model directory was found. Expected config.yaml "
			"and one or more .pth files."
		)
	return candidates[0]


def is_enunu_model_directory(path: Path) -> bool:
	return path.is_dir() and (path / "enuconfig.yaml").is_file()


def find_enunu_model_directory(search_root: Path) -> Path:
	if is_enunu_model_directory(search_root):
		return search_root

	candidates = sorted(
		(path.parent for path in search_root.rglob("enuconfig.yaml")),
		key=lambda path: (len(path.parts), str(path)),
	)
	if not candidates:
		raise FileNotFoundError(
			"No extracted ENUNU model directory was found. Expected enuconfig.yaml."
		)
	return candidates[0]


def ensure_path_is_within(base_dir: Path, member_path: Path) -> None:
	base_dir = base_dir.resolve()
	member_path = member_path.resolve()
	if member_path != base_dir and base_dir not in member_path.parents:
		raise ValueError(f"Archive entry escapes extraction directory: {member_path}")


def extract_archive(archive_path: Path, destination_dir: Path) -> None:
	if archive_path.suffix.lower() == ".rar":
		extract_rar_archive(archive_path, destination_dir)
		return

	if zipfile.is_zipfile(archive_path):
		with zipfile.ZipFile(archive_path) as archive:
			for member_name in archive.namelist():
				ensure_path_is_within(destination_dir, destination_dir / member_name)
			archive.extractall(destination_dir)
		return

	if tarfile.is_tarfile(archive_path):
		with tarfile.open(archive_path) as archive:
			for member in archive.getmembers():
				ensure_path_is_within(destination_dir, destination_dir / member.name)
			archive.extractall(destination_dir)
		return

	raise ValueError(
		f"Unsupported model archive format for {archive_path.name}. Expected a zip or tar archive."
	)


def extract_rar_archive(archive_path: Path, destination_dir: Path) -> None:
	bsdtar_path = shutil.which("bsdtar")
	if bsdtar_path:
		result = subprocess.run(
			[bsdtar_path, "-xf", str(archive_path), "-C", str(destination_dir)],
			capture_output=True,
			text=True,
		)
		if result.returncode != 0:
			raise RuntimeError(
				"Failed to extract the English model RAR archive with bsdtar: "
				f"{result.stderr.strip() or result.stdout.strip()}"
			)
		return

	raise RuntimeError(
		"RAR extraction requires bsdtar in the current environment. Install a RAR-capable "
		"extractor such as bsdtar/libarchive or unar, then rerun `python3 install_models.py`."
	)


def normalize_enunu_model_directory(source_dir: Path, destination_dir: Path) -> Path:
	config = OmegaConf.load(source_dir / "enuconfig.yaml")
	if "force_clip_input_features" not in config.timelag:
		config.timelag.force_clip_input_features = False
	if "force_clip_input_features" not in config.duration:
		config.duration.force_clip_input_features = False
	if "relative_f0" not in config.acoustic:
		config.acoustic.relative_f0 = False

	model_dir = source_dir / Path(str(config.model_dir))
	stats_dir = source_dir / Path(str(config.stats_dir))
	question_path = source_dir / Path(str(config.question_path))

	if destination_dir.exists():
		shutil.rmtree(destination_dir)
	destination_dir.mkdir(parents=True, exist_ok=True)

	OmegaConf.save(config, destination_dir / "config.yaml")
	shutil.copy2(question_path, destination_dir / "qst.hed")

	for section_name in ("timelag", "duration", "acoustic"):
		section_config = getattr(config, section_name)
		section_model_dir = model_dir / section_name
		checkpoint_name = str(section_config.checkpoint)
		shutil.copy2(
			section_model_dir / "model.yaml",
			destination_dir / f"{section_name}_model.yaml",
		)
		shutil.copy2(
			section_model_dir / checkpoint_name,
			destination_dir / f"{section_name}_model.pth",
		)

		input_scaler = joblib.load(stats_dir / f"in_{section_name}_scaler.joblib")
		output_scaler = joblib.load(stats_dir / f"out_{section_name}_scaler.joblib")
		np.save(destination_dir / f"in_{section_name}_scaler_min.npy", input_scaler.min_)
		np.save(destination_dir / f"in_{section_name}_scaler_scale.npy", input_scaler.scale_)
		np.save(destination_dir / f"out_{section_name}_scaler_mean.npy", output_scaler.mean_)
		np.save(destination_dir / f"out_{section_name}_scaler_var.npy", output_scaler.var_)
		np.save(destination_dir / f"out_{section_name}_scaler_scale.npy", output_scaler.scale_)

	return destination_dir


def install_aichi_model(force: bool = False) -> Path:
	if has_required_spsvs_config_fields(AICHI_INSTALL_DIR) and not force:
		return AICHI_INSTALL_DIR

	try:
		import gdown
	except ImportError as error:
		raise RuntimeError(
			"gdown is required to install the English model. Run `python3 -m pip install -r requirements.txt` "
			"inside the nnsvs environment."
		) from error

	with tempfile.TemporaryDirectory() as temp_dir:
		temp_root = Path(temp_dir)
		archive_path = temp_root / "ENUNU_A.I.CHI_v1.1.1.rar"
		downloaded_path = gdown.download(
			id=AICHI_MODEL_FILE_ID,
			output=str(archive_path),
			quiet=True,
		)
		if not downloaded_path:
			raise RuntimeError("Failed to download the English model from Google Drive.")

		extract_dir = temp_root / "extracted"
		extract_dir.mkdir(parents=True, exist_ok=True)
		extract_archive(Path(downloaded_path), extract_dir)

		with contextlib.suppress(FileNotFoundError):
			model_dir = find_model_directory(extract_dir)
			AICHI_INSTALL_DIR.parent.mkdir(parents=True, exist_ok=True)
			if AICHI_INSTALL_DIR.exists():
				shutil.rmtree(AICHI_INSTALL_DIR)
			shutil.copytree(model_dir, AICHI_INSTALL_DIR)
			return AICHI_INSTALL_DIR

		enunu_dir = find_enunu_model_directory(extract_dir)
		normalize_enunu_model_directory(enunu_dir, AICHI_INSTALL_DIR)

	return AICHI_INSTALL_DIR