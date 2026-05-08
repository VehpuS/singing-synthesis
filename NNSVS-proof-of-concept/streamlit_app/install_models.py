import argparse

from model_manager import AICHI_MODEL_NAME, install_aichi_model


def main() -> None:
	parser = argparse.ArgumentParser(
		description="Download and install local models used by the Streamlit NNSVS app."
	)
	parser.add_argument(
		"--force",
		action="store_true",
		help="Reinstall the English A.I.CHI model even if it is already present.",
	)
	args = parser.parse_args()

	install_path = install_aichi_model(force=args.force)
	print(f"Installed {AICHI_MODEL_NAME} to {install_path}")


if __name__ == "__main__":
	main()