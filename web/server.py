"""Custom local frontend; shares the original demo's inference function."""
import io
import json
import threading
import torch
from pathlib import Path
from urllib.parse import quote

import gradio as gr
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
import uvicorn

from app import DEVICE, MODEL, ROOT, enhance

web = FastAPI(title="Thalassa — underwater imaging")
web.mount("/assets", StaticFiles(directory=ROOT / "web"), name="assets")
web.mount("/samples", StaticFiles(directory=ROOT / "demo/samples"), name="samples")
web.mount("/previews", StaticFiles(directory=ROOT / "outputs"), name="previews")
inference_lock = threading.Lock()
active_weights = (str(ROOT / "checkpoints/UIEB.pth"), 0)


def training_status():
    try:
        return json.loads((ROOT / "output/training_status.json").read_text(encoding="utf-8-sig"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"state": "not_started"}


def trained_checkpoint():
    run = training_status().get("run_path")
    if not run:
        return None
    checkpoint = (ROOT / run / "best_model.pth").resolve()
    if checkpoint.is_relative_to((ROOT / "output").resolve()) and checkpoint.is_file():
        return checkpoint
    return None


@web.get("/")
def home():
    return FileResponse(ROOT / "web/index.html")


@web.get("/api/status")
def status():
    return {"device": str(DEVICE), "model": "UIEB pretrained", "training": training_status(), "trained_available": trained_checkpoint() is not None}


@web.post("/api/enhance")
def process(image: UploadFile = File(...), max_side: int = Form(512), model: str = Form("pretrained")):
    global active_weights
    if max_side not in (256, 512, 768):
        raise HTTPException(400, "Invalid output size.")
    if model not in ("pretrained", "trained"):
        raise HTTPException(400, "Invalid model selection.")
    checkpoint = ROOT / "checkpoints/UIEB.pth" if model == "pretrained" else trained_checkpoint()
    if checkpoint is None:
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
                MODEL.load_state_dict(torch.load(checkpoint, map_location=DEVICE, weights_only=True))
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
