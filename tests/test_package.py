import importlib.util
import json
import zipfile
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location("extension_package", Path(__file__).parents[1] / "scripts/package-extension.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


def build_fixture(tmp_path):
    folder = tmp_path / "extension"
    folder.mkdir()
    for name in packager.FILES:
        (folder / name).write_text("fixture", encoding="utf-8")
    (folder / "manifest.json").write_text(json.dumps({"version": "0.3.0", "key": "public-test-key"}), encoding="utf-8")
    (folder / "release-info.json").write_text(json.dumps({"version": "0.3.0"}), encoding="utf-8")
    return folder


def test_package_includes_license_guide_and_checksum(tmp_path):
    folder = build_fixture(tmp_path)
    output = packager.package(folder, tmp_path / "preview.zip")
    with zipfile.ZipFile(output) as archive:
        assert set(archive.namelist()) == {"inbox-rescue-extension/" + name for name in packager.FILES}
        assert archive.testzip() is None
    assert (tmp_path / "preview.zip.sha256").read_text().endswith("  preview.zip\n")


def test_package_refuses_unexpected_private_files(tmp_path):
    folder = build_fixture(tmp_path)
    (folder / "token.json").write_text("synthetic-token", encoding="utf-8")
    with pytest.raises(ValueError, match="unexpected"):
        packager.package(folder, tmp_path / "preview.zip")
    assert not (tmp_path / "preview.zip").exists()
