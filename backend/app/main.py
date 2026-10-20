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
    import yt_dlp, shutil
    return {
        "yt_dlp_version": yt_dlp.version.__version__,
        "node_path": shutil.which("node") or shutil.which("nodejs")
    }

@app.get("/api/debug")
def debug_ytdl(url: str):
    import os, tempfile, yt_dlp
    from yt_dlp.extractor.youtube._video import INNERTUBE_CLIENTS
    
    logs = []
    class Logger:
        def debug(self, msg): logs.append(f"DEBUG: {msg}")
        def info(self, msg): logs.append(f"INFO: {msg}")
        def warning(self, msg): logs.append(f"WARN: {msg}")
        def error(self, msg): logs.append(f"ERR: {msg}")

    try:
        INNERTUBE_CLIENTS['visionos']['SUPPORTS_COOKIES'] = True
        INNERTUBE_CLIENTS['android_vr']['SUPPORTS_COOKIES'] = True
        INNERTUBE_CLIENTS['android']['SUPPORTS_COOKIES'] = True
    except Exception as e:
        logs.append(f"PATCH_ERR: {e}")

    raw_cookies = os.getenv("YOUTUBE_COOKIES")
    cookie_file = None
    if raw_cookies:
        if "\\n" in raw_cookies and "\n" not in raw_cookies:
            raw_cookies = raw_cookies.replace("\\n", "\n")
        cookie_file = os.path.join(tempfile.gettempdir(), "yt_cookies.txt")
        with open(cookie_file, "w", encoding="utf-8") as f:
            f.write(raw_cookies)
    elif os.path.exists("cookies.txt"):
        cookie_file = "cookies.txt"

    ydl_opts = {
        'logger': Logger(),
        'cookiefile': cookie_file,
        'extractor_args': {
            'youtube': {
                'player_client': ['visionos', 'android_vr', 'android'],
            }
        }
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {"status": "ok", "title": info.get("title"), "formats_count": len(info.get("formats", [])), "logs": logs}
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "logs": logs,
            "cookie_exists": bool(cookie_file),
            "cookie_size": os.path.getsize(cookie_file) if cookie_file and os.path.exists(cookie_file) else 0
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

@app.get("/api/download")
def proxy_download(url: str = Query(..., description="Stream URL"), filename: str = Query("media", description="Tên file khi lưu")):
    """
    Proxy stream từ CDN về client có đầy đủ CORS và Content-Length để theo dõi % tiến trình.
    """
    import urllib.request
    from fastapi.responses import StreamingResponse
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        remote_resp = urllib.request.urlopen(req, timeout=60)
        content_len = remote_resp.headers.get("Content-Length")
        content_type = remote_resp.headers.get("Content-Type", "application/octet-stream")

        def file_iterator():
            try:
                while True:
                    chunk = remote_resp.read(128 * 1024)
                    if not chunk:
                        break
                    yield chunk
            finally:
                remote_resp.close()

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Length, Content-Disposition"
        }
        if content_len:
            headers["Content-Length"] = content_len

        return StreamingResponse(file_iterator(), headers=headers)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi stream file: {str(e)}")
