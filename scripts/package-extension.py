"""Package only a configured extension build, with a checksum for GitHub Releases."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

FILES = {
    "background.js", "demo.mjs", "auth.mjs", "gmail.mjs", "panel.html", "panel.css",
    "panel.js", "options.html", "options.js", "manifest.json", "oauth-config.mjs",
    "README.md", "release-info.json", "LICENSE", "INSTALL.md",
}


def package(folder, destination):
    folder = Path(folder).resolve()
    destination = Path(destination).resolve()
    if folder == destination or folder in destination.parents:
        raise ValueError("The ZIP must be outside the extension folder")
    if {p.name for p in folder.iterdir()} != FILES:
        raise ValueError("Build contains missing or unexpected files; refusing to package")
    if any((folder / name).is_symlink() or not (folder / name).is_file() for name in FILES):
        raise ValueError("Package inputs must be ordinary files")
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    info = json.loads((folder / "release-info.json").read_text(encoding="utf-8"))
    if not manifest.get("key") or manifest["version"] != info["version"]:
        raise ValueError("Configured build identity/version is missing or inconsistent")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(FILES):
            archive.write(folder / name, "inbox-rescue-extension/" + name)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError("ZIP integrity check failed")
    checksum = hashlib.sha256(destination.read_bytes()).hexdigest()
    Path(str(destination) + ".sha256").write_text(f"{checksum}  {destination.name}\n", encoding="utf-8")
    return destination


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/package-extension.py BUILD_FOLDER OUTPUT.zip")
    print(package(sys.argv[1], sys.argv[2]))
