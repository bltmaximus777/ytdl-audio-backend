import sys
import subprocess
import threading
import time
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.services.ytdl_service import YTDLService

app = FastAPI(
    title="YouTube Audio Extractor API",
    description="High-performance, zero-cost API for streaming & downloading YouTube audio",
    version="1.0.0"
)

# Kích hoạt CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def auto_update_ytdlp_loop():
    """Tự động cập nhật yt-dlp khi khởi động và định kỳ mỗi 12 tiếng."""
    while True:
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-U", "--no-cache-dir", "yt-dlp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        time.sleep(12 * 3600)

@app.on_event("startup")
def startup_event():
    # Chạy auto-update ở background thread
    t = threading.Thread(target=auto_update_ytdlp_loop, daemon=True)
    t.start()

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "yt-audio-extractor",
        "version": "1.0.0"
    }

@app.get("/api/update")
def trigger_update():
    """Endpoint chủ động cập nhật yt-dlp ngay lập tức."""
    res = subprocess.run([sys.executable, "-m", "pip", "install", "-U", "--no-cache-dir", "yt-dlp"], capture_output=True, text=True)
    import yt_dlp
    import importlib
    importlib.reload(yt_dlp)
    return {"updated": res.returncode == 0, "yt_dlp_version": yt_dlp.version.__version__}

@app.get("/api/version")
def check_version():
    import yt_dlp
    return {
        "yt_dlp_version": yt_dlp.version.__version__
    }

@app.get("/api/audio")
def get_audio(url: str = Query(..., description="URL video YouTube")):
    """
    Trích xuất metadata và direct audio stream URL từ link YouTube.
    """
    if not url or ("youtube.com" not in url and "youtu.be" not in url):
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp đường dẫn video YouTube hợp lệ.")

    try:
        data = YTDLService.get_audio_stream(url)
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi khi xử lý video: {str(e)}"
        )
