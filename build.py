"""Build script for gpt-image-2 Studio.

Run from the project root:
    python build.py
"""
import PyInstaller.__main__

PyInstaller.__main__.run([
    "gpt_image2_qt.spec",
    "--name=gpt-image-2-studio",
    "--distpath=dist",
    "--workpath=build",
    "--clean",
    "--noconfirm",
])
