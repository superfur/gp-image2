"""
gpt-image-2 图像生成与编辑工具
基于 QCode.cc API，OpenAI 兼容接口

使用说明:
  1. 设置环境变量 QCODE_API_KEY=cr_你的密钥
  2. pip install openai pillow

  python gpt_image2.py generate "A cyberpunk Tokyo street at night"
  python gpt_image2.py edit cat.png --prompt "put a tiny crown on the cat"
  python gpt_image2.py fuse scene.png product.png --prompt "Place the product naturally"
"""

import os
import sys
import base64
import argparse
from pathlib import Path
from openai import OpenAI

# ============================================================
# 配置
# ============================================================

# 推荐国内直连（无 CDN 100s 限制），不受 524 影响
DEFAULT_BASE_URL = "https://api.qcode.cc/qcode-img/v1"

# 各区域入口（经全球 CDN，可能触发 524 错误）：
#   asia.qcode.cc  - 香港/东南亚
#   eu.qcode.cc    - 欧洲
#   us.qcode.cc    - 北美
# 经 CDN 时：low < 35s 安全，medium 偶发 524，high 频繁 524

API_KEY = os.environ.get("QCODE_API_KEY")
if not API_KEY:
    print("错误：请设置环境变量 QCODE_API_KEY=cr_你的密钥")
    sys.exit(1)

# ============================================================
# 客户端
# ============================================================

client = OpenAI(
    base_url=DEFAULT_BASE_URL,
    api_key=API_KEY,
    timeout=180.0,  # 必须 >= 180s，gpt-image-2 推理时间 20-150s
)

# ============================================================
# 文生图
# ============================================================

def generate(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "medium",
    n: int = 1,
    output_path: str = None,
) -> list[str]:
    """
    调用 /v1/images/generations 文生图

    参数:
        prompt:   图像描述（中英均可）
        size:     1024x1024 / 1024x1536 / 1536x1024
        quality:  low / medium / high（越高越慢，越贵）
                   low:  ~20-35s，$0.08/张（触发最低计费）
                   medium: ~50-90s，$0.08/张
                   high: ~70-120s，按表计费
        n:        生成数量 1-4
        output_path: 保存路径（支持 {i} 替换序号）

    返回:
        保存的文件路径列表
    """
    print(f"[文生图] prompt={prompt[:50]}... size={size} quality={quality} n={n}")

    result = client.images.generate(
        model="gpt-image-2",
        prompt=prompt,
        size=size,
        quality=quality,
        n=n,
    )

    saved = []
    for i, data in enumerate(result.data):
        img_bytes = base64.b64decode(data.b64_json)

        if output_path:
            path = output_path.replace("{i}", str(i)) if "{i}" in output_path else output_path
        else:
            path = f"output_{i}.png"

        with open(path, "wb") as f:
            f.write(img_bytes)
        saved.append(path)
        print(f"  已保存: {path}")

    return saved

# ============================================================
# 图像编辑（单图 + mask）
# ============================================================

def edit(
    image_path: str,
    prompt: str,
    mask_path: str = None,
    size: str = "auto",
    quality: str = "auto",
    n: int = 1,
    input_fidelity: str = "low",
    background: str = "auto",
    output_format: str = "png",
    output_path: str = None,
) -> list[str]:
    """
    调用 /v1/images/edits 图像编辑

    参数:
        image_path:      源图路径（PNG/JPEG/WebP，单文件 <= 25MB）
        prompt:          编辑指令
        mask_path:       PNG alpha 蒙版路径（可选；透明区域=重绘区域）
        size:            auto / 1024x1024 / 1024x1536 / 1536x1024
        quality:         auto / low / medium / high
        n:               生成数量 1-4
        input_fidelity:  low / high；high 保留原图人物/文字/品牌细节
        background:      auto / opaque / transparent
        output_format:   png / jpeg / webp
        output_path:     保存路径

    返回:
        保存的文件路径列表
    """
    print(f"[图像编辑] image={image_path} mask={mask_path}")
    print(f"  prompt={prompt}")
    print(f"  size={size} quality={quality} input_fidelity={input_fidelity}")

    extra_body = {
        "background": background,
        "output_format": output_format,
        "input_fidelity": input_fidelity,
    }

    mask_file = None
    if mask_path:
        mask_file = open(mask_path, "rb")

    result = client.images.edit(
        image=img_file,
        mask=mask_file,
        model="gpt-image-2",
        prompt=prompt,
        size=size,
        quality=quality,
        n=n,
        extra_body=extra_body,
    )

    img_file.close()
    if mask_file:
        mask_file.close()

    saved = []
    for i, d in enumerate(result.data):
        img_bytes = base64.b64decode(d.b64_json)
        path = output_path.replace("{i}", str(i)) if output_path and "{i}" in output_path else (output_path or f"edited_{i}.png")
        with open(path, "wb") as f:
            f.write(img_bytes)
        saved.append(path)
        print(f"  已保存: {path}")

    return saved

# ============================================================
# 多图融合（2-8 张）
# ============================================================

def fuse(
    image_paths: list[str],
    prompt: str,
    size: str = "auto",
    quality: str = "auto",
    n: int = 1,
    input_fidelity: str = "high",
    output_path: str = None,
) -> list[str]:
    """
    多图融合（2-8 张）

    参数:
        image_paths:     源图路径列表（按顺序理解角色）
        prompt:          融合指令（明确每张图的角色）
        size:            auto / 1024x1024 / 1024x1536 / 1536x1024
        quality:         auto / low / medium / high
        n:               生成数量 1-4
        input_fidelity:  high 保留原图细节
        output_path:     保存路径

    返回:
        保存的文件路径列表
    """
    print(f"[多图融合] {len(image_paths)} 张图: {image_paths}")
    print(f"  prompt={prompt}")

    extra_body = {
        "input_fidelity": input_fidelity,
    }

    image_files = [open(p, "rb") for p in image_paths]

    result = client.images.edit(
        model="gpt-image-2",
        image=image_files,
        prompt=prompt,
        size=size,
        quality=quality,
        n=n,
        extra_body=extra_body,
    )

    for f in image_files:
        f.close()

    saved = []
    for i, d in enumerate(result.data):
        img_bytes = base64.b64decode(d.b64_json)
        path = output_path.replace("{i}", str(i)) if output_path and "{i}" in output_path else (output_path or f"fused_{i}.png")
        with open(path, "wb") as f:
            f.write(img_bytes)
        saved.append(path)
        print(f"  已保存: {path}")

    return saved

# ============================================================
# CLI 入口
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="gpt-image-2 图像生成与编辑")
    sub = parser.add_subparsers(dest="cmd", required=True)

    # 文生图
    p_gen = sub.add_parser("generate", help="文生图 /v1/images/generations")
    p_gen.add_argument("prompt", help="图像描述")
    p_gen.add_argument("--size", default="1024x1024",
                       choices=["1024x1024","1024x1536","1536x1024"], help="图片尺寸")
    p_gen.add_argument("--quality", default="medium",
                       choices=["low","medium","high"], help="质量（越高越慢）")
    p_gen.add_argument("-n", type=int, default=1, help="生成数量")
    p_gen.add_argument("-o", "--output", default=None, help="输出路径")

    # 图像编辑
    p_edit = sub.add_parser("edit", help="图像编辑 /v1/images/edits（单图）")
    p_edit.add_argument("image", help="源图路径")
    p_edit.add_argument("--prompt", required=True, help="编辑指令")
    p_edit.add_argument("--mask", default=None, help="mask 蒙版路径（PNG alpha）")
    p_edit.add_argument("--size", default="auto", help="尺寸")
    p_edit.add_argument("--quality", default="auto", help="质量")
    p_edit.add_argument("-n", type=int, default=1, help="生成数量")
    p_edit.add_argument("--fidelity", default="low",
                        choices=["low","high"], dest="input_fidelity",
                        help="high 保留原图细节")
    p_edit.add_argument("--background", default="auto",
                        choices=["auto","opaque","transparent"], help="背景模式")
    p_edit.add_argument("--format", default="png",
                        choices=["png","jpeg","webp"], dest="output_format",
                        help="输出格式")
    p_edit.add_argument("-o", "--output", default=None, help="输出路径")

    # 多图融合
    p_fuse = sub.add_parser("fuse", help="多图融合（2-8 张）")
    p_fuse.add_argument("images", nargs="+", help="源图路径列表")
    p_fuse.add_argument("--prompt", required=True, help="融合指令")
    p_fuse.add_argument("--size", default="auto", help="尺寸")
    p_fuse.add_argument("--quality", default="auto", help="质量")
    p_fuse.add_argument("-n", type=int, default=1, help="生成数量")
    p_fuse.add_argument("--fidelity", default="high", dest="input_fidelity",
                        choices=["low","high"], help="high 保留原图细节")
    p_fuse.add_argument("-o", "--output", default=None, help="输出路径")

    args = parser.parse_args()

    try:
        if args.cmd == "generate":
            generate(args.prompt, args.size, args.quality, args.n, args.output)
        elif args.cmd == "edit":
            edit(args.image, args.prompt, args.mask, args.size, args.quality,
                 args.n, args.input_fidelity, args.background, args.output_format,
                 args.output)
        elif args.cmd == "fuse":
            if len(args.images) < 2 or len(args.images) > 8:
                print("错误：多图融合需要 2-8 张图片")
                sys.exit(1)
            fuse(args.images, args.prompt, args.size, args.quality,
                 args.n, args.input_fidelity, args.output)
    except Exception as e:
        print(f"\n错误: {e}")
        # 常见错误提示
        err_str = str(e)
        if "524" in err_str:
            print("提示：CDN 100s 超时，建议换用直连入口 https://api.qcode.cc/qcode-img/v1")
        elif "rate_limit" in err_str.lower() or "429" in err_str:
            print("提示：超出限额（每日 100 张或并发 2），请稍后重试或申请提升配额")
        elif "401" in err_str:
            print("提示：API Key 无效或已过期，请检查 QCODE_API_KEY")
        sys.exit(1)

if __name__ == "__main__":
    main()
