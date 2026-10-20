# YouTube Audio Streamer & Extractor (API & Web)

High-performance, zero-cost, serverless YouTube audio stream extractor built with FastAPI and yt-dlp.

## 🚀 Features
- **Direct Stream Extraction:** No heavyweight transcoding on server; extracts Google CDN stream URL directly.
- **100% Free & 24/7 Online:** Ready for deployment on Render.com with UptimeRobot keep-alive.
- **FastAPI Powered:** Instant response, CORS enabled, OpenAPI/Swagger docs built-in.
- **Frontend Ready:** Easily connects with Cloudflare Pages.

## 📖 API Documentation
- `GET /`: Health check endpoint (for uptime monitoring).
- `GET /api/audio?url=<YOUTUBE_URL>`: Extracts audio metadata & direct stream URL.
