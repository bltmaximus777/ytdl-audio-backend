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
            'source_address': '0.0.0.0',
            # Giả lập header trình duyệt để hạn chế bị YouTube chặn
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
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
