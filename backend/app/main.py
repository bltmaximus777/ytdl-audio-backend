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

@app.get("/api/debug_ytdl")
def debug_ytdl(url: str = Query("https://youtu.be/AmmFD2OIs_k"), use_cookies: bool = False, clients: str = "android_vr,visionos"):
    import io, os, tempfile, yt_dlp
    raw_cookies = os.getenv("YOUTUBE_COOKIES", "") if use_cookies else ""
    lines = raw_cookies.splitlines()
    has_tabs = any("\t" in l for l in lines)
    
    log_stream = io.StringIO()
    class Logger:
        def debug(self, msg): log_stream.write(f"[debug] {msg}\n")
        def info(self, msg): log_stream.write(f"[info] {msg}\n")
        def warning(self, msg): log_stream.write(f"[warn] {msg}\n")
        def error(self, msg): log_stream.write(f"[err] {msg}\n")
        
    ydl_opts = {
        'logger': Logger(),
        'remote_components': ['ejs:github'],
        'extractor_args': {
            'youtube': {
                'player_client': [c.strip() for c in clients.split(",") if c.strip()],
            }
        }
    }
    cookie_file = None
    if raw_cookies:
        cookie_file = os.path.join(tempfile.gettempdir(), "yt_cookies.txt")
        with open(cookie_file, "w", encoding="utf-8") as f:
            f.write(raw_cookies)
        ydl_opts['cookiefile'] = cookie_file

    err = None
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "success": True,
                "title": info.get("title"),
                "cookie_len": len(raw_cookies),
                "has_tabs": has_tabs,
                "lines_count": len(lines),
                "logs": log_stream.getvalue()
            }
    except Exception as e:
        err = str(e)
        return {
            "success": False,
            "error": err,
            "cookie_len": len(raw_cookies),
            "has_tabs": has_tabs,
            "lines_count": len(lines),
            "logs": log_stream.getvalue()
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
