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
            # Sử dụng client Android / iOS để vượt qua cơ chế chặn bot web của YouTube
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'ios'],
                }
            },
            'http_headers': {
                'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US) gzip',
            }
        }

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
