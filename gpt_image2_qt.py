"""PySide6/Fluent desktop UI for gpt-image-2."""

from __future__ import annotations

import base64
import io
import json
import os
import sys
from pathlib import Path
from typing import Callable, Iterable

from openai import OpenAI
from PIL import Image
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QProgressBar,
    QScrollArea,
    QSizePolicy,
    QSplitter,
    QTabWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

try:
    from qfluentwidgets import (
        ComboBox as FluentComboBox,
        LineEdit as FluentLineEdit,
        PrimaryPushButton,
        PushButton as FluentPushButton,
        TextEdit as FluentTextEdit,
        Theme,
        setTheme,
        setThemeColor,
    )

    HAS_FLUENT = True
except Exception:
    FluentComboBox = QComboBox
    FluentLineEdit = QLineEdit
    FluentPushButton = QPushButton
    FluentTextEdit = QTextEdit
    PrimaryPushButton = QPushButton
    HAS_FLUENT = False


CONFIG_PATH = Path(sys.executable).parent / "config.json" if getattr(sys, 'frozen', False) else Path(__file__).parent / "config.json"
DEFAULT_BASE_URL = "https://api.qcode.cc/qcode-img/v1"
VERSION = "1.0.1"
MAX_FILE_SIZE = 25 * 1024 * 1024
IMAGE_FILTER = "Images (*.png *.jpg *.jpeg *.webp)"

APP_BG = "#F3F6FB"
SURFACE = "#FFFFFF"
SURFACE_ALT = "#F8FBFF"
BORDER = "#DCE6F4"
TEXT_PRIMARY = "#0F172A"
TEXT_SECONDARY = "#64748B"
ACCENT = "#2563EB"
ACCENT_HOVER = "#1D4ED8"
HEADER_BG = "#0F172A"
HEADER_CARD = "#111C33"
SUCCESS = "#16A34A"
ERROR = "#DC2626"


class Settings:
    def __init__(self):
        self.api_key = ""
        self.base_url = DEFAULT_BASE_URL
        self._load()

    def _load(self):
        if not CONFIG_PATH.exists():
            return
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            self.api_key = data.get("api_key", "")
            self.base_url = data.get("base_url", DEFAULT_BASE_URL)
        except Exception:
            pass

    def save(self, api_key: str, base_url: str = DEFAULT_BASE_URL):
        self.api_key = api_key
        self.base_url = base_url
        CONFIG_PATH.write_text(
            json.dumps({"api_key": api_key, "base_url": base_url}, indent=2),
            encoding="utf-8",
        )


class ImageTask(QThread):
    succeeded = Signal(object)
    failed = Signal(str)

    def __init__(self, work: Callable[[], object], parent=None):
        super().__init__(parent)
        self.work = work

    def run(self):
        try:
            self.succeeded.emit(self.work())
        except Exception as exc:
            self.failed.emit(str(exc))


class Card(QFrame):
    def __init__(self, name: str, parent=None):
        super().__init__(parent)
        self.setObjectName(name)


class DropArea(Card):
    files_changed = Signal(list)

    def __init__(self, max_files: int = 1, title: str = "上传图片", parent=None):
        super().__init__("DropArea", parent)
        self.max_files = max_files
        self.files: list[Path] = []
        self.setAcceptDrops(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(116)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(6)
        self.title_label = QLabel(title)
        self.title_label.setObjectName("DropTitle")
        self.hint_label = QLabel(self._empty_text())
        self.hint_label.setObjectName("DropHint")
        self.hint_label.setWordWrap(True)
        layout.addWidget(self.title_label)
        layout.addWidget(self.hint_label)
        layout.addStretch(1)

    def _empty_text(self):
        if self.max_files == 1:
            return "点击选择 PNG / JPEG / WebP，单张不超过 25MB"
        return f"点击选择，最多 {self.max_files} 张；支持 PNG / JPEG / WebP"

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._choose_files()
        super().mousePressEvent(event)

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setProperty("dragActive", True)
            self.style().unpolish(self)
            self.style().polish(self)
        else:
            event.ignore()

    def dragLeaveEvent(self, event):
        self.setProperty("dragActive", False)
        self.style().unpolish(self)
        self.style().polish(self)
        super().dragLeaveEvent(event)

    def dropEvent(self, event):
        self.setProperty("dragActive", False)
        self.style().unpolish(self)
        self.style().polish(self)
        paths = [url.toLocalFile() for url in event.mimeData().urls() if url.toLocalFile()]
        self._process_files(paths)
        event.acceptProposedAction()

    def _choose_files(self):
        paths, _ = QFileDialog.getOpenFileNames(self, "选择图片", "", IMAGE_FILTER)
        if paths:
            self._process_files(paths)

    def _process_files(self, paths: Iterable[str]):
        path_list = list(paths)
        accepted: list[Path] = []
        for raw_path in path_list[: self.max_files]:
            path = Path(raw_path)
            if not path.exists():
                continue
            if path.stat().st_size > MAX_FILE_SIZE:
                QMessageBox.warning(self, "文件过大", f"{path.name} 超过 25MB 限制。")
                continue
            accepted.append(path)
        if len(path_list) > self.max_files:
            QMessageBox.information(self, "数量限制", f"最多支持 {self.max_files} 个文件，已自动截断。")
        self.files = accepted
        self._refresh_text()
        self.files_changed.emit(self.files)

    def _refresh_text(self):
        if not self.files:
            self.hint_label.setText(self._empty_text())
            return
        names = [self._short_name(p.name) for p in self.files[:3]]
        if len(self.files) > 3:
            names.append(f"另有 {len(self.files) - 3} 张图片")
        self.hint_label.setText("\n".join(names) + "\n点击可重新选择")

    @staticmethod
    def _short_name(name: str, max_len: int = 28):
        if len(name) <= max_len:
            return name
        stem, suffix = os.path.splitext(name)
        return f"{stem[: max(8, max_len - len(suffix) - 4)]}...{suffix}"

    def clear(self):
        self.files = []
        self._refresh_text()
        self.files_changed.emit(self.files)


class ThumbnailGrid(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._pixmaps: list[QPixmap] = []
        self.layout = QGridLayout(self)
        self.layout.setContentsMargins(0, 10, 0, 0)
        self.layout.setHorizontalSpacing(8)
        self.layout.setVerticalSpacing(8)

    def set_files(self, files: list[Path], remove_callback: Callable[[int], None]):
        self._pixmaps = []
        clear_layout(self.layout)
        for idx, path in enumerate(files):
            card = Card("ThumbCard")
            card_layout = QVBoxLayout(card)
            card_layout.setContentsMargins(8, 8, 8, 8)
            pixmap = QPixmap(str(path)).scaled(76, 76, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            self._pixmaps.append(pixmap)
            image_label = QLabel()
            image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            image_label.setPixmap(pixmap)
            remove_btn = QPushButton("移除")
            remove_btn.setObjectName("DangerSmallButton")
            remove_btn.clicked.connect(lambda checked=False, i=idx: remove_callback(i))
            card_layout.addWidget(image_label)
            card_layout.addWidget(remove_btn)
            self.layout.addWidget(card, idx // 3, idx % 3)


class MultiImageUploader(QWidget):
    files_changed = Signal(list)

    def __init__(self, max_files: int = 8, parent=None):
        super().__init__(parent)
        self.max_files = max_files
        self.files: list[Path] = []
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        self.counter = QLabel(f"已选择 0/{max_files} 张图片")
        self.counter.setObjectName("MutedStrong")
        self.drop_area = DropArea(max_files=max_files, title="多图上传")
        self.drop_area.files_changed.connect(self._set_files)
        self.thumbnails = ThumbnailGrid()
        layout.addWidget(self.counter)
        layout.addWidget(self.drop_area)
        layout.addWidget(self.thumbnails)

    def _set_files(self, files: list[Path]):
        self.files = list(files)
        self.counter.setText(f"已选择 {len(self.files)}/{self.max_files} 张图片")
        self.drop_area.files = self.files
        self.drop_area._refresh_text()
        self.thumbnails.set_files(self.files, self._remove_file)
        self.files_changed.emit(self.files)

    def _remove_file(self, index: int):
        if 0 <= index < len(self.files):
            self.files.pop(index)
        self._set_files(self.files)


class ImagePreview(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.images: list[Image.Image] = []
        self._pixmaps: list[QPixmap] = []
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setObjectName("PreviewScroll")
        self.content = QWidget()
        self.grid = QGridLayout(self.content)
        self.grid.setContentsMargins(18, 18, 18, 18)
        self.grid.setHorizontalSpacing(14)
        self.grid.setVerticalSpacing(14)
        self.scroll.setWidget(self.content)
        root.addWidget(self.scroll)
        self.set_empty()

    def set_empty(self):
        self.images = []
        self._pixmaps = []
        clear_layout(self.grid)
        label = QLabel("生成结果会显示在这里\n完成后可预览并保存图片")
        label.setObjectName("PreviewPlaceholder")
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.grid.addWidget(label, 0, 0)

    def set_images(self, images: list[Image.Image]):
        self.images = images
        self._pixmaps = []
        clear_layout(self.grid)
        if not images:
            self.set_empty()
            return
        columns = 2 if len(images) > 1 else 1
        for idx, image in enumerate(images):
            card = Card("PreviewCard")
            layout = QVBoxLayout(card)
            layout.setContentsMargins(14, 14, 14, 14)
            pixmap = pil_to_pixmap(image).scaled(360, 360, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            self._pixmaps.append(pixmap)
            image_label = QLabel()
            image_label.setPixmap(pixmap)
            image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            image_label.setMinimumHeight(260)
            footer = QHBoxLayout()
            name = QLabel(f"Image {idx + 1}")
            name.setObjectName("MutedStrong")
            save_btn = QPushButton("保存")
            save_btn.setObjectName("SmallPrimaryButton")
            save_btn.clicked.connect(lambda checked=False, i=idx: self._save_image(i))
            footer.addWidget(name)
            footer.addStretch(1)
            footer.addWidget(save_btn)
            layout.addWidget(image_label)
            layout.addLayout(footer)
            self.grid.addWidget(card, idx // columns, idx % columns)
        for col in range(columns):
            self.grid.setColumnStretch(col, 1)

    def _save_image(self, index: int):
        path, _ = QFileDialog.getSaveFileName(self, "保存图片", "image.png", "PNG (*.png);;JPEG (*.jpg);;WebP (*.webp)")
        if path:
            self.images[index].save(path)
            QMessageBox.information(self, "保存成功", f"已保存至:\n{path}")


class BaseMode(QWidget):
    def __init__(self, settings: Settings, title: str, subtitle: str, parent=None):
        super().__init__(parent)
        self.settings = settings
        self.worker: ImageTask | None = None
        root = QGridLayout(self)
        root.setContentsMargins(0, 8, 0, 0)
        root.setHorizontalSpacing(0)

        self.left_panel = Card("SidePanel")
        self.left_panel.setMinimumWidth(500)
        self.left_layout = QVBoxLayout(self.left_panel)
        self.left_layout.setContentsMargins(20, 20, 20, 20)
        self.left_layout.setSpacing(16)
        left_scroll = QScrollArea()
        left_scroll.setObjectName("SideScroll")
        left_scroll.setWidgetResizable(True)
        left_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        left_scroll.setMinimumWidth(520)
        left_scroll.setWidget(self.left_panel)

        right = QWidget()
        right.setMinimumWidth(620)
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(14)
        hero = Card("HeroCard")
        hero_layout = QVBoxLayout(hero)
        hero_layout.setContentsMargins(22, 18, 22, 18)
        hero_title = QLabel(title)
        hero_title.setObjectName("HeroTitle")
        hero_subtitle = QLabel(subtitle)
        hero_subtitle.setObjectName("HeroSubtitle")
        hero_subtitle.setWordWrap(True)
        hero_layout.addWidget(hero_title)
        hero_layout.addWidget(hero_subtitle)
        self.preview = ImagePreview()
        self.revised_label = QLabel("")
        self.revised_label.setObjectName("RevisedPrompt")
        self.revised_label.setWordWrap(True)
        self.status_label = QLabel("就绪")
        self.status_label.setObjectName("StatusLabel")
        right_layout.addWidget(hero)
        right_layout.addWidget(self.preview, 1)
        right_layout.addWidget(self.revised_label)
        right_layout.addWidget(self.status_label)
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)
        splitter.addWidget(left_scroll)
        splitter.addWidget(right)
        splitter.setSizes([520, 780])
        root.addWidget(splitter, 0, 0)

    def section(self, title: str) -> tuple[Card, QVBoxLayout]:
        card = Card("SectionCard")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(16, 14, 16, 16)
        layout.setSpacing(10)
        label = QLabel(title)
        label.setObjectName("SectionTitle")
        layout.addWidget(label)
        self.left_layout.addWidget(card)
        return card, layout

    def param_group(self, title: str) -> tuple[Card, QGridLayout]:
        card, layout = self.section(title)
        grid = QGridLayout()
        grid.setHorizontalSpacing(12)
        grid.setVerticalSpacing(10)
        grid.setColumnStretch(1, 1)
        layout.addLayout(grid)
        return card, grid

    def add_param(self, grid: QGridLayout, row: int, label: str, widget: QWidget):
        label_widget = QLabel(label)
        label_widget.setObjectName("ParamLabel")
        grid.addWidget(label_widget, row, 0)
        grid.addWidget(widget, row, 1)

    def combo(self, values: list[str], current: str):
        combo = FluentComboBox()
        combo.addItems(values)
        combo.setCurrentText(current)
        combo.setMinimumHeight(36)
        combo.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        return combo

    def text_edit(self, height: int):
        edit = FluentTextEdit()
        edit.setMinimumHeight(height)
        return edit

    def primary_button(self, text: str):
        button = PrimaryPushButton(text)
        button.setMinimumHeight(42)
        return button

    def ensure_api_key(self):
        if self.settings.api_key:
            return True
        QMessageBox.warning(self, "提示", "请先在顶部输入并保存 API Key")
        return False

    def run_task(self, work: Callable[[], object], busy: str, idle: str):
        self.preview.set_empty()
        self.revised_label.setText("")
        self.set_status("处理中...", True)
        self.action_btn.setEnabled(False)
        self.action_btn.setText(busy)
        self.progress.setVisible(True)
        self.progress.setRange(0, 0)
        self.worker = ImageTask(work, self)
        self.worker.succeeded.connect(lambda result: self._finish_success(result, idle))
        self.worker.failed.connect(lambda err: self._finish_error(err, idle))
        self.worker.start()

    def _finish_success(self, result, idle: str):
        self.action_btn.setEnabled(True)
        self.action_btn.setText(idle)
        self.progress.setVisible(False)
        images, revised = result
        self.preview.set_images(images)
        if revised:
            self.revised_label.setText(f"模型优化后的 Prompt:\n{revised}")
        self.set_status(f"完成，共 {len(images)} 张图片", True)

    def _finish_error(self, error: str, idle: str):
        self.action_btn.setEnabled(True)
        self.action_btn.setText(idle)
        self.progress.setVisible(False)
        self.set_status(friendly_error(error), False)

    def set_status(self, message: str, ok: bool):
        self.status_label.setText(message)
        self.status_label.setProperty("state", "ok" if ok else "error")
        self.status_label.style().unpolish(self.status_label)
        self.status_label.style().polish(self.status_label)


class GeneratePage(BaseMode):
    def __init__(self, settings: Settings, parent=None):
        super().__init__(settings, "文生图", "输入提示词并生成高质量图片，结果会在右侧工作区呈现。", parent)
        _, prompt_layout = self.section("提示词")
        self.prompt = self.text_edit(126)
        prompt_layout.addWidget(self.prompt)
        _, grid = self.param_group("生成参数")
        self.size = self.combo(["1024x1024", "1024x1536", "1536x1024"], "1024x1024")
        self.quality = self.combo(["low", "medium", "high"], "medium")
        self.n = self.combo(["1", "2", "3", "4"], "1")
        for row, pair in enumerate([("尺寸", self.size), ("质量", self.quality), ("数量", self.n)]):
            self.add_param(grid, row, *pair)
        self.add_action("生成图片", self.generate)

    def add_action(self, text: str, slot: Callable[[], None]):
        self.left_layout.addStretch(1)
        self.action_btn = self.primary_button(text)
        self.action_btn.clicked.connect(slot)
        self.progress = QProgressBar()
        self.progress.setVisible(False)
        self.left_layout.addWidget(self.action_btn)
        self.left_layout.addWidget(self.progress)

    def generate(self):
        prompt = self.prompt.toPlainText().strip()
        if not prompt:
            QMessageBox.warning(self, "提示", "请输入图像描述（Prompt）")
            return
        if not self.ensure_api_key():
            return
        size, quality, n = self.size.currentText(), self.quality.currentText(), int(self.n.currentText())

        def work():
            client = OpenAI(base_url=self.settings.base_url, api_key=self.settings.api_key, timeout=180.0)
            result = client.images.generate(model="gpt-image-2", prompt=prompt, size=size, quality=quality, n=n)
            return decode_images(result)

        self.run_task(work, "生成中...", "生成图片")


class EditPage(BaseMode):
    def __init__(self, settings: Settings, parent=None):
        super().__init__(settings, "图像编辑", "上传源图和可选蒙版，再用自然语言描述要修改的内容。", parent)
        _, source_layout = self.section("源图（必填）")
        self.image_zone = DropArea(max_files=1, title="源图")
        source_layout.addWidget(self.image_zone)
        _, mask_layout = self.section("蒙版（可选）")
        self.mask_zone = DropArea(max_files=1, title="Mask 蒙版")
        mask_layout.addWidget(self.mask_zone)
        help_label = QLabel("PNG alpha 透明区域 = 需要重绘的区域")
        help_label.setObjectName("HelpText")
        mask_layout.addWidget(help_label)
        _, prompt_layout = self.section("编辑指令")
        self.prompt = self.text_edit(108)
        prompt_layout.addWidget(self.prompt)
        _, grid = self.param_group("输出参数")
        self.size = self.combo(["auto", "1024x1024", "1024x1536", "1536x1024"], "auto")
        self.quality = self.combo(["auto", "low", "medium", "high"], "auto")
        self.n = self.combo(["1", "2", "3", "4"], "1")
        self.fidelity = self.combo(["low", "high"], "low")
        self.background = self.combo(["auto", "opaque", "transparent"], "auto")
        self.output_format = self.combo(["png", "jpeg", "webp"], "png")
        widgets = [("尺寸", self.size), ("质量", self.quality), ("数量", self.n), ("保真度", self.fidelity), ("背景", self.background), ("格式", self.output_format)]
        for row, pair in enumerate(widgets):
            self.add_param(grid, row, *pair)
        self.add_action("编辑图片", self.edit)

    def add_action(self, text: str, slot: Callable[[], None]):
        self.left_layout.addStretch(1)
        self.action_btn = self.primary_button(text)
        self.action_btn.clicked.connect(slot)
        self.progress = QProgressBar()
        self.progress.setVisible(False)
        self.left_layout.addWidget(self.action_btn)
        self.left_layout.addWidget(self.progress)

    def edit(self):
        prompt = self.prompt.toPlainText().strip()
        if not prompt:
            QMessageBox.warning(self, "提示", "请输入编辑指令（Prompt）")
            return
        if not self.ensure_api_key():
            return
        if not self.image_zone.files:
            QMessageBox.warning(self, "提示", "请上传源图")
            return
        image_path = str(self.image_zone.files[0])
        mask_path = str(self.mask_zone.files[0]) if self.mask_zone.files else None
        extra = {"background": self.background.currentText(), "output_format": self.output_format.currentText(), "input_fidelity": self.fidelity.currentText()}
        size, quality, n = self.size.currentText(), self.quality.currentText(), int(self.n.currentText())

        def work():
            client = OpenAI(base_url=self.settings.base_url, api_key=self.settings.api_key, timeout=180.0)
            image_file = mask_file = None
            try:
                image_file = open(image_path, "rb")
                mask_file = open(mask_path, "rb") if mask_path else None
                result = client.images.edit(image=image_file, mask=mask_file, model="gpt-image-2", prompt=prompt, size=size, quality=quality, n=n, extra_body=extra)
            finally:
                if image_file:
                    image_file.close()
                if mask_file:
                    mask_file.close()
            return decode_images(result)

        self.run_task(work, "处理中...", "编辑图片")


class FusePage(BaseMode):
    def __init__(self, settings: Settings, parent=None):
        super().__init__(settings, "多图融合", "上传 2-8 张图片并说明每张图的角色，生成新的合成画面。", parent)
        _, source_layout = self.section("源图（2-8 张）")
        self.uploader = MultiImageUploader(max_files=8)
        source_layout.addWidget(self.uploader)
        help_label = QLabel("建议在 Prompt 中说明每张图的角色和保留重点。")
        help_label.setObjectName("HelpText")
        source_layout.addWidget(help_label)
        _, prompt_layout = self.section("融合指令")
        self.prompt = self.text_edit(112)
        prompt_layout.addWidget(self.prompt)
        _, grid = self.param_group("输出参数")
        self.size = self.combo(["auto", "1024x1024", "1024x1536", "1536x1024"], "auto")
        self.quality = self.combo(["auto", "low", "medium", "high"], "auto")
        self.n = self.combo(["1", "2", "3", "4"], "1")
        self.fidelity = self.combo(["low", "high"], "high")
        for row, pair in enumerate([("尺寸", self.size), ("质量", self.quality), ("数量", self.n), ("保真度", self.fidelity)]):
            self.add_param(grid, row, *pair)
        self.add_action("融合图片", self.fuse)

    def add_action(self, text: str, slot: Callable[[], None]):
        self.left_layout.addStretch(1)
        self.action_btn = self.primary_button(text)
        self.action_btn.clicked.connect(slot)
        self.progress = QProgressBar()
        self.progress.setVisible(False)
        self.left_layout.addWidget(self.action_btn)
        self.left_layout.addWidget(self.progress)

    def fuse(self):
        prompt = self.prompt.toPlainText().strip()
        if not prompt:
            QMessageBox.warning(self, "提示", "请输入融合指令（Prompt）")
            return
        if not self.ensure_api_key():
            return
        if len(self.uploader.files) < 2:
            QMessageBox.warning(self, "提示", "多图融合至少需要 2 张图片")
            return
        image_paths = [str(p) for p in self.uploader.files]
        size, quality, n = self.size.currentText(), self.quality.currentText(), int(self.n.currentText())
        extra = {"input_fidelity": self.fidelity.currentText()}

        def work():
            client = OpenAI(base_url=self.settings.base_url, api_key=self.settings.api_key, timeout=180.0)
            files = [open(path, "rb") for path in image_paths]
            try:
                result = client.images.edit(model="gpt-image-2", image=files, prompt=prompt, size=size, quality=quality, n=n, extra_body=extra)
            finally:
                for file in files:
                    file.close()
            return decode_images(result)

        self.run_task(work, "处理中...", "融合图片")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.settings = Settings()
        self.setWindowTitle("gpt-image-2 Studio")
        self.resize(1380, 900)
        self.setMinimumSize(1180, 760)
        if HAS_FLUENT:
            setTheme(Theme.LIGHT)
            setThemeColor(ACCENT)
        central = QWidget()
        central.setObjectName("Root")
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self._build_header())
        self.tabs = QTabWidget()
        self.tabs.setObjectName("MainTabs")
        self.tabs.addTab(GeneratePage(self.settings), "文生图")
        self.tabs.addTab(EditPage(self.settings), "图像编辑")
        self.tabs.addTab(FusePage(self.settings), "多图融合")
        layout.addWidget(self.tabs, 1)
        layout.addWidget(self._build_footer())

    def _build_header(self):
        header = QFrame()
        header.setObjectName("Header")
        header.setFixedHeight(116)
        layout = QHBoxLayout(header)
        layout.setContentsMargins(28, 20, 28, 20)
        title_box = QVBoxLayout()
        title = QLabel("gpt-image-2 Studio")
        title.setObjectName("AppTitle")
        subtitle = QLabel("生成、编辑、融合图片的一体化工作台")
        subtitle.setObjectName("AppSubtitle")
        title_box.addWidget(title)
        title_box.addWidget(subtitle)
        title_box.addStretch(1)
        key_card = QFrame()
        key_card.setObjectName("KeyCard")
        key_layout = QHBoxLayout(key_card)
        key_layout.setContentsMargins(16, 12, 16, 12)
        self.api_key_input = FluentLineEdit()
        self.api_key_input.setText(self.settings.api_key)
        self.api_key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_input.setPlaceholderText("sk-...")
        self.api_key_input.setMinimumWidth(310)
        show_key = QCheckBox("显示")
        show_key.setObjectName("HeaderCheck")
        show_key.toggled.connect(lambda checked: self.api_key_input.setEchoMode(QLineEdit.EchoMode.Normal if checked else QLineEdit.EchoMode.Password))
        save_btn = PrimaryPushButton("保存")
        save_btn.clicked.connect(self._save_settings)
        label = QLabel("API Key")
        label.setObjectName("HeaderLabel")
        key_layout.addWidget(label)
        key_layout.addWidget(self.api_key_input)
        key_layout.addWidget(show_key)
        key_layout.addWidget(save_btn)
        layout.addLayout(title_box, 1)
        layout.addWidget(key_card)
        return header

    def _build_footer(self):
        footer = QFrame()
        footer.setObjectName("Footer")
        footer.setFixedHeight(42)
        layout = QHBoxLayout(footer)
        layout.setContentsMargins(28, 0, 28, 0)
        endpoint = QLabel(f"Endpoint: {DEFAULT_BASE_URL}")
        endpoint.setObjectName("FooterText")
        version = QLabel(f"v{VERSION}")
        version.setObjectName("FooterText")
        layout.addWidget(endpoint)
        layout.addStretch(1)
        layout.addWidget(version)
        return footer

    def _save_settings(self):
        self.settings.save(self.api_key_input.text().strip())
        QMessageBox.information(self, "保存成功", "API Key 已保存到 config.json")


def decode_images(result) -> tuple[list[Image.Image], str]:
    images: list[Image.Image] = []
    revised = ""
    for data in result.data:
        image_bytes = base64.b64decode(data.b64_json)
        image = Image.open(io.BytesIO(image_bytes))
        images.append(image)
        if getattr(data, "revised_prompt", None):
            revised = data.revised_prompt
    return images, revised


def pil_to_pixmap(image: Image.Image) -> QPixmap:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    pixmap = QPixmap()
    pixmap.loadFromData(buffer.getvalue(), "PNG")
    return pixmap


def clear_layout(layout):
    while layout.count():
        item = layout.takeAt(0)
        if item.widget():
            item.widget().deleteLater()
        elif item.layout():
            clear_layout(item.layout())


def friendly_error(error: str):
    lower = error.lower()
    if "524" in error:
        return "CDN 100s 超时，建议换用直连入口或稍后重试"
    if "rate_limit" in lower or "429" in error:
        return "超出限额（每日 100 张或并发 2），请稍后重试"
    if "401" in error or "unauthorized" in lower:
        return "API Key 无效或已过期，请检查配置"
    if "connection" in lower or "timeout" in lower:
        return f"连接失败，请检查网络：{error}"
    return error


def apply_styles(app: QApplication):
    app.setStyleSheet(
        f"""
        QWidget#Root {{ background: {APP_BG}; color: {TEXT_PRIMARY}; font-family: 'Microsoft YaHei', 'Segoe UI'; }}
        QFrame#Header {{ background: {HEADER_BG}; }}
        QLabel#AppTitle {{ color: #F8FAFC; font-size: 28px; font-weight: 800; }}
        QLabel#AppSubtitle {{ color: #C7D2FE; font-size: 13px; }}
        QFrame#KeyCard {{ background: {HEADER_CARD}; border: 1px solid #263653; border-radius: 18px; }}
        QLabel#HeaderLabel, QCheckBox#HeaderCheck {{ color: #C7D2FE; font-weight: 700; }}
        QFrame#Footer {{ background: {APP_BG}; }}
        QLabel#FooterText {{ color: {TEXT_SECONDARY}; font-size: 11px; }}
        QTabWidget#MainTabs::pane {{ border: 0; padding: 18px 24px 0 24px; background: {APP_BG}; }}
        QTabBar::tab {{ background: {HEADER_CARD}; color: #E2E8F0; padding: 10px 26px; border-top-left-radius: 12px; border-top-right-radius: 12px; margin-right: 6px; font-weight: 700; }}
        QTabBar::tab:selected {{ background: {ACCENT}; color: white; }}
        QTabBar::tab:hover:!selected {{ background: #1B2947; }}
        QScrollArea#SideScroll, QScrollArea#PreviewScroll {{ border: 0; background: transparent; }}
        QScrollArea#SideScroll QWidget, QScrollArea#PreviewScroll QWidget {{ background: transparent; }}
        QSplitter::handle {{ background: transparent; width: 14px; }}
        QSplitter::handle:hover {{ background: #DDE8F8; border-radius: 6px; }}
        QFrame#SidePanel, QFrame#HeroCard, QFrame#SectionCard, QFrame#PreviewCard {{ background: {SURFACE}; border: 1px solid {BORDER}; border-radius: 20px; }}
        QFrame#SectionCard {{ border-radius: 16px; }}
        QFrame#DropArea {{ background: {SURFACE_ALT}; border: 1px dashed #BFD0EA; border-radius: 16px; }}
        QFrame#DropArea[dragActive="true"] {{ background: #E8F1FF; border: 1px solid {ACCENT}; }}
        QFrame#ThumbCard {{ background: {SURFACE_ALT}; border: 1px solid {BORDER}; border-radius: 14px; }}
        QLabel#HeroTitle {{ color: {TEXT_PRIMARY}; font-size: 22px; font-weight: 800; }}
        QLabel#HeroSubtitle, QLabel#HelpText, QLabel#DropHint, QLabel#RevisedPrompt {{ color: {TEXT_SECONDARY}; font-size: 12px; }}
        QLabel#SectionTitle, QLabel#DropTitle, QLabel#MutedStrong {{ color: {TEXT_PRIMARY}; font-size: 13px; font-weight: 800; }}
        QLabel#ParamLabel {{ color: {TEXT_SECONDARY}; font-size: 12px; font-weight: 700; }}
        QLabel#PreviewPlaceholder {{ color: {TEXT_SECONDARY}; font-size: 15px; font-weight: 700; }}
        QLabel#StatusLabel {{ color: {SUCCESS}; font-size: 12px; font-weight: 700; }}
        QLabel#StatusLabel[state="error"] {{ color: {ERROR}; }}
        QComboBox, QLineEdit, QTextEdit {{ background: white; border: 1px solid {BORDER}; border-radius: 10px; color: {TEXT_PRIMARY}; padding: 8px 10px; selection-background-color: {ACCENT}; }}
        QComboBox::drop-down {{ border: 0; width: 32px; background: #DBEAFE; border-top-right-radius: 10px; border-bottom-right-radius: 10px; }}
        QComboBox QAbstractItemView {{ background: white; border: 1px solid {BORDER}; selection-background-color: #E8F1FF; color: {TEXT_PRIMARY}; }}
        QPushButton {{ background: #EEF4FF; border: 0; border-radius: 10px; color: {ACCENT}; padding: 8px 14px; font-weight: 700; }}
        QPushButton:hover {{ background: #DBEAFE; }}
        QPushButton:disabled {{ color: #94A3B8; background: #E2E8F0; }}
        QPushButton#SmallPrimaryButton {{ background: {ACCENT}; color: white; min-width: 78px; }}
        QPushButton#SmallPrimaryButton:hover {{ background: {ACCENT_HOVER}; }}
        QPushButton#DangerSmallButton {{ background: #FEE2E2; color: #991B1B; padding: 5px 8px; }}
        QPushButton#DangerSmallButton:hover {{ background: #FECACA; }}
        QProgressBar {{ border: 0; border-radius: 5px; background: #DBEAFE; height: 8px; text-align: center; }}
        QProgressBar::chunk {{ border-radius: 5px; background: {ACCENT}; }}
        """
    )


def main():
    app = QApplication(sys.argv)
    apply_styles(app)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
