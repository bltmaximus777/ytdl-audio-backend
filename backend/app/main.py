from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.services.ytdl_service import YTDLService

app = FastAPI(
    title="YouTube Audio Extractor API",
    description="High-performance, zero-cost API for streaming & downloading YouTube audio",
    version="1.0.0"
)

# Kích hoạt CORS để Frontend từ Cloudflare Pages hoặc localhost gọi vào được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    """
    Endpoint kiểm tra trạng thái máy chủ và phục vụ UptimeRobot ping định kỳ.
    """
    return {
        "status": "online",
        "service": "yt-audio-extractor",
        "version": "1.0.0"
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
