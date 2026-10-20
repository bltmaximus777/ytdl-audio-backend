import os
import shutil
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
        node_path = shutil.which('node') or shutil.which('nodejs')
        js_runtimes = {'deno': {}, 'quickjs': {}}
        if node_path:
            js_runtimes['node'] = {'path': node_path}
        else:
            js_runtimes['node'] = {}

        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            # Bật giải mã JS challenge để vượt qua "The page needs to be reloaded"
            'remote_components': ['ejs:github'],
            'js_runtimes': js_runtimes,
        }

        # Nạp cookies từ biến môi trường YOUTUBE_COOKIES hoặc file cookies.txt nếu có
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

        info = None
        errors = []
        # Lượt 1: Thử trích xuất với cookie nếu có
        if cookie_file:
            try:
                opts_cookie = {**ydl_opts, 'cookiefile': cookie_file}
                with yt_dlp.YoutubeDL(opts_cookie) as ydl:
                    info = ydl.extract_info(video_url, download=False)
            except Exception as e:
                errors.append(f"Attempt 1 (cookies): {str(e)}")
                info = None

        # Lượt 2: Fallback sang client android_vr & visionos không dùng cookie (vượt triệt để bot check)
        if not info:
            try:
                opts_fallback = {
                    **ydl_opts,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['android_vr', 'visionos'],
                        }
                    }
                }
                with yt_dlp.YoutubeDL(opts_fallback) as ydl:
                    info = ydl.extract_info(video_url, download=False)
            except Exception as e:
                errors.append(f"Attempt 2 (no cookies): {str(e)}")
                info = None

        if not info:
            raise ValueError(f"Không thể bóc tách: {' | '.join(errors)}")

        formats = info.get('formats', [])

        def is_valid_stream(f):
            url = f.get('url') or ''
            proto = f.get('protocol') or ''
            return bool(url) and not proto.startswith('m3u8') and 'manifest.googlevideo.com' not in url

        # 1. Danh sách Video từ 4K, 2K, 1080p, 720p, 480p, 360p
        valid_videos = [f for f in formats if is_valid_stream(f) and f.get('vcodec') != 'none']
        valid_videos.sort(key=lambda x: (x.get('height') or 0, x.get('filesize') or x.get('filesize_approx') or 0), reverse=True)

        videos = []
        seen_video_keys = set()
        for f in valid_videos:
            h = f.get('height')
            if not h:
                continue
            ext = f.get('ext', 'mp4')
            fps = f.get('fps')
            key = (h, ext)
            if key in seen_video_keys:
                continue
            seen_video_keys.add(key)

            fs = f.get('filesize') or f.get('filesize_approx')
            label = f"{h}p"
            if h >= 2160:
                label = f"4K ({h}p)"
            elif h >= 1440:
                label = f"2K ({h}p)"
            elif h >= 1080:
                label = f"1080p Full HD"
            elif h >= 720:
                label = f"720p HD"

            if fps and fps > 30:
                label += f" {fps}fps"

            videos.append({
                "height": h,
                "resolution": f"{h}p",
                "label": label,
                "format": ext,
                "url": f.get('url'),
                "has_audio": f.get('acodec') != 'none',
                "filesize": fs,
                "filesize_mb": f"{round(fs / (1024 * 1024), 1)} MB" if fs else None
            })

        # 2. Danh sách Audio
        valid_audios = [f for f in formats if is_valid_stream(f) and f.get('acodec') != 'none' and f.get('vcodec') == 'none']
        valid_audios.sort(key=lambda x: x.get('abr') or 0, reverse=True)

        audios = []
        seen_audio_keys = set()
        for f in valid_audios:
            ext = f.get('ext', 'm4a')
            abr = int(f.get('abr') or 128)
            key = (ext, abr)
            if key in seen_audio_keys:
                continue
            seen_audio_keys.add(key)

            fs = f.get('filesize') or f.get('filesize_approx')
            audios.append({
                "format": ext,
                "quality": f"{abr} kbps",
                "label": f"{ext.upper()} • {abr} kbps",
                "url": f.get('url'),
                "filesize": fs,
                "filesize_mb": f"{round(fs / (1024 * 1024), 1)} MB" if fs else None
            })

        # Format mặc định tốt nhất cho audio player
        best_audio = audios[0] if audios else None
        best_video = next((v for v in videos if v.get('has_audio')), videos[0] if videos else None)

        return {
            "id": info.get("id"),
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "videos": videos,
            "audios": audios,
            "audio": best_audio or {"url": info.get("url"), "format": "m4a", "quality": "128 kbps"},
            "video": best_video,
            "audio_stream_url": best_audio.get("url") if best_audio else info.get("url"),
            "format": best_audio.get("format", "m4a") if best_audio else "m4a"
        }
