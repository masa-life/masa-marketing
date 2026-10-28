#!/usr/bin/env python3
"""Rebuild assets/press/masa-press-kit.zip.

The site has no build step, so the zip is committed and served as-is from
masa.life/press. Run this after changing a screenshot, the fact file, or a
logo, then commit the zip with the change.

The logo files are copied in byte for byte. Nothing here recolors them.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "press" / "masa-press-kit.zip"

# Fixed timestamp so a rebuild is stable when the bytes have not changed.
DATE = (2026, 10, 28, 0, 0, 0)

FILES = [
    (ROOT / "assets" / "masa-icon.png", "logos/masa-icon.png"),
    (ROOT / "assets" / "masa-icon-favicon.png", "logos/masa-icon-favicon.png"),
    (ROOT / "assets" / "press" / "press-today-ttc-maya.png", "screenshots/press-today-ttc-maya.png"),
    (ROOT / "assets" / "press" / "press-today-32w-maya.png", "screenshots/press-today-32w-maya.png"),
    (ROOT / "assets" / "press" / "tool-hospital-bag-mobile.png", "screenshots/tool-hospital-bag-mobile.png"),
    (ROOT / "assets" / "press" / "masa-about-and-bio.md", "masa-about-and-bio.md"),
]


def main() -> None:
    missing = [str(src) for src, _ in FILES if not src.is_file()]
    if missing:
        raise SystemExit("make-press-kit: missing\n  " + "\n  ".join(missing))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for src, name in FILES:
            info = zipfile.ZipInfo(filename=name, date_time=DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            # 0o644, the usual external attribute shift for zip.
            info.external_attr = 0o644 << 16
            archive.writestr(info, src.read_bytes())

    with zipfile.ZipFile(OUT) as archive:
        names = archive.namelist()
    print(f"make-press-kit: {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)")
    for name in names:
        print(f"  {name}")


if __name__ == "__main__":
    main()
