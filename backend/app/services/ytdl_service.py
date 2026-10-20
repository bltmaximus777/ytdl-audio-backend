import os
import tempfile
import yt_dlp
from typing import Dict, Any

class YTDLService:
    @staticmethod
    def get_audio_stream(video_url: str) -> Dict[str, Any]:
        """
        Trích xuất metadata và direct audio stream URL từ YouTube.
        Không tải file về server, chỉ trích xuất link stream từ Google CDN.
        """
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android_vr', 'tv_embedded', 'visionos', 'mediaconnect'],
                }
            },
        }

        # Nạp cookies từ biến môi trường YOUTUBE_COOKIES hoặc file cookies.txt nếu có
        raw_cookies = os.getenv("YOUTUBE_COOKIES")
        if raw_cookies:
            cookie_file = os.path.join(tempfile.gettempdir(), "yt_cookies.txt")
            with open(cookie_file, "w", encoding="utf-8") as f:
                f.write(raw_cookies)
            ydl_opts['cookiefile'] = cookie_file
        elif os.path.exists("cookies.txt"):
            ydl_opts['cookiefile'] = "cookies.txt"

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if not info:
                raise ValueError("Không thể lấy thông tin từ đường dẫn video này.")

            # Ưu tiên lấy stream url
            audio_url = info.get('url')
            if not audio_url and 'formats' in info:
                # Nếu format mặc định không có url trực tiếp, duyệt danh sách format
                audio_formats = [f for f in info['formats'] if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
                if audio_formats:
                    # Lấy format audio chất lượng tốt nhất
                    best_audio = max(audio_formats, key=lambda x: x.get('abr') or 0)
                    audio_url = best_audio.get('url')

            if not audio_url:
                raise ValueError("Không tìm thấy đường link stream audio trực tiếp.")

            return {
                "id": info.get("id"),
                "title": info.get("title"),
                "uploader": info.get("uploader"),
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "audio_stream_url": audio_url,
                "format": info.get("ext", "m4a"),
                "filesize_approx": info.get("filesize_approx") or info.get("filesize")
            }
