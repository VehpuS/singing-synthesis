import pytest


def _wants_integration(mark_expression: str) -> bool:
	mark_expression = (mark_expression or "").strip()
	if not mark_expression:
		return False
	if "not integration" in mark_expression:
		return False
	return "integration" in mark_expression


def pytest_collection_modifyitems(config, items):
	if _wants_integration(config.option.markexpr):
		return

	skip_integration = pytest.mark.skip(
		reason="Integration test. Run with `pytest -m integration` to include it."
	)
	for item in items:
		if item.get_closest_marker("integration"):
			item.add_marker(skip_integration)