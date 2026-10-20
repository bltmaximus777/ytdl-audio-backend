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
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            # Bật giải mã JS challenge để vượt qua "The page needs to be reloaded"
            'remote_components': ['ejs:github'],
            'js_runtimes': {'node': {}, 'deno': {}, 'quickjs': {}},
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
        else:
            # Nếu chưa có cookie mới fallback sang client visionos/android_vr
            ydl_opts['extractor_args'] = {
                'youtube': {
                    'player_client': ['android_vr', 'visionos', 'mediaconnect'],
                }
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if not info:
                raise ValueError("Không thể lấy thông tin từ đường dẫn video này.")

            formats = info.get('formats', [])

            # 1. Audio stream tốt nhất
            audios = [f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
            best_audio = max(audios, key=lambda x: x.get('abr') or 0) if audios else None
            audio_url = best_audio.get('url') if best_audio else info.get('url')

            # 2. Video stream tốt nhất (có sẵn cả hình + tiếng, thường là MP4 720p/360p)
            prog_videos = [f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') != 'none']
            best_video = max(prog_videos, key=lambda x: x.get('height') or 0) if prog_videos else None

            if not audio_url and not best_video:
                raise ValueError("Không tìm thấy đường link stream trực tiếp.")

            return {
                "id": info.get("id"),
                "title": info.get("title"),
                "uploader": info.get("uploader"),
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "audio": {
                    "url": audio_url,
                    "format": best_audio.get("ext", "m4a") if best_audio else "m4a",
                    "filesize": best_audio.get("filesize") or best_audio.get("filesize_approx") if best_audio else None,
                    "quality": f"{int(best_audio.get('abr') or 128)} kbps" if best_audio else "128 kbps"
                },
                "video": {
                    "url": best_video.get("url") if best_video else None,
                    "format": best_video.get("ext", "mp4") if best_video else "mp4",
                    "resolution": f"{best_video.get('height')}p" if best_video and best_video.get('height') else "720p",
                    "filesize": best_video.get("filesize") or best_video.get("filesize_approx") if best_video else None
                } if best_video else None,
                # Backward compatibility cho audio player hiện tại
                "audio_stream_url": audio_url,
                "format": best_audio.get("ext", "m4a") if best_audio else "m4a"
            }
