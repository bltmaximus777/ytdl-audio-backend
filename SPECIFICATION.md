# YOUTUBE AUDIO EXTRACTOR & STREAMER - PROJECT SPECIFICATION

> **Phiên bản:** 1.0.0  
> **Phương pháp phát triển:** Spec-Driven Development (Spec-Kit / Superpower Workflow)  
> **Trạng thái:** Active Development  

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1.1. Mục tiêu
Xây dựng một hệ thống phần mềm web cho phép người dùng trích xuất và tải stream âm thanh chất lượng cao (M4A / MP3 / Opus) từ video YouTube với các tiêu chí tối thượng:
1. **100% Miễn phí (Zero Cost):** Không mất chi phí duy trì máy chủ hay dịch vụ bên ngoài.
2. **Online 24/7 (High Availability):** Máy chủ hoạt động liên tục, không bị gián đoạn hay đóng băng (cold-start) kéo dài.
3. **Hiệu năng cao & Tiết kiệm tài nguyên:** Thay vì tải toàn bộ file về server rồi nén/convert làm nghẽn CPU và RAM, hệ thống sử dụng cơ chế **Direct Stream URL Extraction** (bóc tách link stream gốc từ CDN YouTube) và chuyển tiếp trực tiếp về client.
4. **Không phụ thuộc thẻ tín dụng:** Toàn bộ hạ tầng có thể triển khai tự động chỉ với tài khoản cá nhân thông qua API.

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình kiến trúc phân tán nhẹ (Decoupled Micro-Services):

```
+-------------------------------------------------------------+
|                 CLIENT BROWSER (User Interface)             |
+-------------------------------------------------------------+
                              |
                     HTTPS    |  1. Request Audio Info / Stream
                              v
+-------------------------------------------------------------+
|               FRONTEND (Cloudflare Pages)                   |
| - Giao diện người dùng hiện đại, responsive                 |
| - Trình phát Audio Player tích hợp                          |
| - Miễn phí 100%, Global CDN, Băng thông không giới hạn      |
+-------------------------------------------------------------+
                              |
                     REST API |  2. Extract Audio Stream URL
                              v
+-------------------------------------------------------------+
|               BACKEND API (Render.com Web Service)          |
| - Runtime: Python 3.12 + FastAPI + Uvicorn                  |
| - Engine: yt-dlp (Bóc tách metadata & Direct Stream URL)    |
| - Keep-Alive: UptimeRobot ping định kỳ 10 phút/lần          |
+-------------------------------------------------------------+
                              |
               Optional Cache |  3. Lưu trữ audio phổ biến (nếu cần)
                              v
+-------------------------------------------------------------+
|               STORAGE / CDN (Cloudflare R2 Object Storage)  |
| - Lưu trữ cache metadata hoặc file audio đã xử lý           |
| - S3-compatible, Zero egress fee                            |
+-------------------------------------------------------------+
```

---

## 3. STACK CÔNG NGHỆ (TECH STACK)

| Thành phần | Công nghệ / Dịch vụ | Vai trò | Chi phí |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | Python 3.12, FastAPI, Uvicorn | Xây dựng REST API tốc độ cao, hỗ trợ CORS & Async | Free Tier |
| **Extraction Engine** | `yt-dlp` | Thư viện bóc tách dữ liệu video/audio YouTube | Mã nguồn mở |
| **Backend Host** | Render.com (Web Service) | Hosting backend, tự động CI/CD từ GitHub | Free Tier (0đ) |
| **Frontend Host** | Cloudflare Pages | Host Single Page Application (HTML5 / TailwindCSS / JS) | Free Tier (0đ) |
| **Object Storage** | Cloudflare R2 | Lưu trữ cache file/metadata nếu cần mở rộng | Free Tier (10GB) |
| **Keep-Alive Monitor** | UptimeRobot | Ping HTTP định kỳ giữ backend luôn thức | Free Tier (0đ) |
| **Version Control** | GitHub | Quản lý mã nguồn và kích hoạt Render Webhook | Miễn phí |

---

## 4. ĐẶC TẢ API (API SPECIFICATION)

### 4.1. Health Check
* **Endpoint:** `GET /`
* **Mục đích:** Kiểm tra trạng thái máy chủ và dùng cho UptimeRobot ping giữ online.
* **Response (200 OK):**
```json
{
  "status": "online",
  "version": "1.0.0",
  "service": "yt-audio-extractor"
}
```

### 4.2. Trích xuất thông tin & Stream Audio
* **Endpoint:** `GET /api/audio`
* **Query Parameters:**
  * `url` (string, required): Đường link video YouTube (hỗ trợ định dạng `watch?v=`, `youtu.be/`, Shorts).
* **Response Thành công (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "uploader": "Rick Astley",
    "duration": 213,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "audio_stream_url": "https://rr---sn-....googlevideo.com/videoplayback?...",
    "format": "m4a",
    "filesize_approx": 3540120
  }
}
```
* **Response Lỗi (400 / 500):**
```json
{
  "success": false,
  "error": "Video unavailable or bot detection encountered",
  "detail": "..."
}
```

---

## 5. CẤU TRÚC DỰ ÁN (PROJECT DIRECTORY STRUCTURE)

```
Project7/
│
├── .github/                      # Cấu hình GitHub Actions / Workflows (nếu có)
│
├── backend/                      # Backend Service (Deploy lên Render)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI application entrypoint
│   │   ├── core/
│   │   │   ├── config.py         # Cấu hình môi trường & CORS
│   │   │   └── security.py       # Rate limiting & token verification
│   │   └── services/
│   │       ├── ytdl_service.py   # Wrapper xử lý yt-dlp & bóc tách stream
│   │       └── r2_service.py     # Service kết nối Cloudflare R2 (S3 Client)
│   ├── requirements.txt          # Danh sách dependencies (FastAPI, uvicorn, yt-dlp, boto3)
│   ├── Procfile                  # Cấu hình start command cho Render
│   └── render.yaml               # Render Blueprint (Infrastructure-as-Code)
│
├── frontend/                     # Web UI (Deploy lên Cloudflare Pages)
│   ├── index.html                # Single Page Application
│   ├── css/
│   │   └── style.css             # Giao diện hiện đại, Dark/Light mode
│   └── js/
│       └── app.js                # Xử lý gọi API, phát audio & tải xuống
│
├── scripts/                      # Bộ script tự động hoá Devops
│   ├── setup_github.py           # Tự động tạo repo và đẩy code lên GitHub qua API
│   ├── setup_render.py           # Tự động tạo và deploy Web Service trên Render qua API
│   └── verify_services.py        # Kiểm tra trạng thái hoạt động của toàn bộ hạ tầng
│
├── .env.example                  # File mẫu biến môi trường (an toàn, không chứa secret)
├── .env                          # Biến môi trường thực tế (Bị .gitignore bỏ qua)
├── .gitignore                    # Loại trừ file nhạy cảm và build caches
├── SPECIFICATION.md              # File đặc tả này (Single Source of Truth)
└── AGENT.md                      # Nguyên tắc hoạt động & Quy chuẩn cho AI Agent
```

---

## 6. LỘ TRÌNH TRIỂN KHAI (IMPLEMENTATION ROADMAP)

* **Giai đoạn 1 (Foundation):** Tạo cấu trúc chuẩn, file đặc tả `SPECIFICATION.md`, nguyên tắc `AGENT.md`, cấu hình bảo mật `.env` & `.gitignore`.
* **Giai đoạn 2 (Backend Core):** Xây dựng module `FastAPI` + `yt-dlp` tối ưu xử lý stream URL, không ngốn RAM.
* **Giai đoạn 3 (Cloud Automation):** Sử dụng token GitHub & Render API để khởi tạo repository và tự động kích hoạt deployment trên Render.
* **Giai đoạn 4 (Frontend & Cloudflare):** Dựng giao diện Web hiện đại, responsive, kết nối API backend và sẵn sàng cho Cloudflare Pages.
* **Giai đoạn 5 (Storage & Monitoring):** Cấu hình UptimeRobot keep-alive và tích hợp Cloudflare R2 cache.
