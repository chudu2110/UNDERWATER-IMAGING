"""Custom local frontend; shares the original demo's inference function."""
import io
import json
import threading
import torch
import sys
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import gradio as gr
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
import uvicorn

from app import DEVICE, MODEL, ROOT, enhance, load_weights, DEFAULT_CKPT

web = FastAPI(title="Thalassa — underwater imaging")
web.mount("/assets", StaticFiles(directory=ROOT / "web"), name="assets")
web.mount("/samples", StaticFiles(directory=ROOT / "demo/samples"), name="samples")
web.mount("/previews", StaticFiles(directory=ROOT / "outputs"), name="previews")
inference_lock = threading.Lock()
active_weights = (str(DEFAULT_CKPT), Path(DEFAULT_CKPT).stat().st_mtime_ns if Path(DEFAULT_CKPT).exists() else 0)


def training_status():
    try:
        return json.loads((ROOT / "output/training_status.json").read_text(encoding="utf-8-sig"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"state": "not_started"}


def epoch100_checkpoint():
    for cand in (ROOT / "checkpoints/epoch_100.pth", ROOT / "checkpoints/last_model.pth"):
        if cand.is_file():
            return cand
    run = training_status().get("run_path")
    if not run:
        return None
    run_dir = ROOT / Path(str(run).replace("\\", "/"))
    for name in ("last_model.pth", "checkpoints/epoch_100.pth"):
        cp = (run_dir / name).resolve()
        if cp.is_file():
            return cp
    return None


def best_checkpoint():
    cand = ROOT / "checkpoints/best_model.pth"
    if cand.is_file():
        return cand
    run = training_status().get("run_path")
    if not run:
        return None
    run_dir = ROOT / Path(str(run).replace("\\", "/"))
    checkpoint = (run_dir / "best_model.pth").resolve()
    if checkpoint.is_file():
        return checkpoint
    return None


def trained_checkpoint():
    return epoch100_checkpoint() or best_checkpoint()


@web.get("/")
def home():
    return FileResponse(ROOT / "web/index.html")


@web.get("/api/status")
def status():
    return {
        "device": str(DEVICE),
        "model": "Trained · Epoch 100" if ("last_model" in active_weights[0] or "epoch_100" in active_weights[0]) else "UIEB pretrained",
        "training": training_status(),
        "trained_available": trained_checkpoint() is not None,
        "epoch100_available": epoch100_checkpoint() is not None,
        "best_available": best_checkpoint() is not None,
    }


@web.post("/api/enhance")
def process(image: UploadFile = File(...), max_side: int = Form(512), model: str = Form("trained")):
    global active_weights
    if max_side not in (256, 512, 768):
        raise HTTPException(400, "Invalid output size.")
    if model not in ("pretrained", "trained", "epoch100", "best"):
        raise HTTPException(400, "Invalid model selection.")
    if model == "pretrained":
        checkpoint = ROOT / "checkpoints/UIEB.pth"
    elif model in ("epoch100", "trained"):
        checkpoint = epoch100_checkpoint() or best_checkpoint()
    elif model == "best":
        checkpoint = best_checkpoint()
    else:
        checkpoint = trained_checkpoint()

    if checkpoint is None or not checkpoint.is_file():
        raise HTTPException(409, "No trained checkpoint is available yet. Wait for the first validation to finish.")
    data = image.file.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(413, "Choose an image smaller than 20 MB.")
    try:
        source = Image.open(io.BytesIO(data))
        if source.width * source.height > 40_000_000:
            raise HTTPException(400, "The image exceeds 40 megapixels.")
        with inference_lock:
            version = (str(checkpoint), checkpoint.stat().st_mtime_ns)
            if active_weights != version:
                state = load_weights(checkpoint, DEVICE)
                MODEL.load_state_dict(state)
                active_weights = version
            output, info = enhance(source, max_side)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "Could not read this image. Choose a JPG, PNG or WEBP file.")
    except gr.Error as error:
        raise HTTPException(400, str(error))
    except RuntimeError:
        raise HTTPException(503, "Could not process this image. Try a smaller output size.")
    buffer = io.BytesIO()
    output.save(buffer, format="PNG")
    return Response(buffer.getvalue(), media_type="image/png", headers={"X-Processing-Info": quote(info), "Content-Disposition": 'inline; filename="thalassa-result.png"'})


if __name__ == "__main__":
    uvicorn.run(web, host="127.0.0.1", port=7860)
