"""Local image enhancement demo using the official UIEB checkpoint."""
import time
import os
import sys
from pathlib import Path

import gradio as gr
import numpy as np
from PIL import Image, ImageOps
import torch
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.runtime'))
from model import myModel
DEVICE = torch.device(os.environ.get("DEMO_DEVICE", "cuda" if torch.cuda.is_available() else "cpu"))


def load_weights(path, device=None):
    try:
        state = torch.load(path, map_location=device or "cpu", weights_only=True)
    except Exception:
        state = torch.load(path, map_location=device or "cpu", weights_only=False)
    if isinstance(state, dict) and "model" in state:
        state = state["model"]
    return state


DEFAULT_CKPT = os.environ.get("DEMO_CHECKPOINT")
if not DEFAULT_CKPT:
    epoch100_cand = ROOT / "output/demo/ALL/notebook_20261016_205330/last_model.pth"
    if epoch100_cand.is_file():
        DEFAULT_CKPT = str(epoch100_cand)
    else:
        DEFAULT_CKPT = str(ROOT / "checkpoints/UIEB.pth")

MODEL = myModel(in_channels=3, feature_channels=32, use_white_balance=True)
MODEL.load_state_dict(load_weights(DEFAULT_CKPT, DEVICE))
MODEL.to(DEVICE).eval()


@torch.inference_mode()
def enhance(image, max_side=512):
    if image is None:
        raise gr.Error("Upload an image or choose a sample.")
    image = ImageOps.exif_transpose(image).convert("RGB")
    # shortcut: cap resolution for the 4 GB GPU; use tiling for full-resolution processing.
    image.thumbnail((int(max_side), int(max_side)), Image.Resampling.LANCZOS)
    width, height = image.size
    if min(width, height) < 16:
        raise gr.Error("Image width and height must be at least 16 pixels.")
    tensor = torch.from_numpy(np.array(image).astype(np.float32) / 255).permute(2, 0, 1).unsqueeze(0).to(DEVICE)
    tensor = F.pad(tensor, (0, (-width) % 4, 0, (-height) % 4), mode="replicate")
    if DEVICE.type == "cuda":
        torch.cuda.synchronize()
    start = time.perf_counter()
    prediction = MODEL(tensor).clamp(0, 1)
    result = prediction[0, :, :height, :width].permute(1, 2, 0).cpu().numpy()
    output = Image.fromarray((result * 255).round().astype(np.uint8))
    elapsed = time.perf_counter() - start
    return output, f"{DEVICE} · {width} × {height} px · {elapsed:.2f} s"


def build_demo():
    with gr.Blocks(title="Underwater Image Enhancement") as demo:
        gr.Markdown("# Underwater Image Enhancement\nUpload an image or select a sample, then click **Enhance image**.")
        with gr.Row():
            source = gr.Image(type="pil", label="Original image", height=420)
            result = gr.Image(type="pil", label="Enhanced image", height=420, interactive=False, format="png")
        size = gr.Radio([256, 512, 768], value=512, label="Longest edge (pixels, aspect ratio preserved)")
        button = gr.Button("Enhance image", variant="primary")
        status = gr.Textbox(label="Processing details", interactive=False)
        gr.Examples(examples=[[str(p)] for p in sorted((ROOT / "demo/samples").glob("*.png"))], inputs=source)
        button.click(enhance, [source, size], [result, status], api_name="enhance", concurrency_limit=1)
        gr.Markdown("Local processing · Conda environment `demo`.")
    return demo


if __name__ == "__main__":
    build_demo().queue(max_size=8).launch(server_name="127.0.0.1", server_port=7860, share=False)
