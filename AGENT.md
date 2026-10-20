# NGUYÊN TẮC HOẠT ĐỘNG VÀ QUY CHUẨN LẬP TRÌNH (AGENT.md)

> **Dành cho:** Tất cả các AI Agent tham gia phát triển, bảo trì và mở rộng dự án này.  
> **Phương pháp cốt lõi:** Spec-Driven Development (Spec-Kit) & Superpower Workflow.

---

## 1. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

### 📌 Nguyên tắc 1: Spec-First (Đọc đặc tả trước khi hành động)
* **Bắt buộc:** Trước khi thực hiện bất kỳ thay đổi nào về mã nguồn, Agent **PHẢI** đọc qua file đặc tả [SPECIFICATION.md](file:///c:/Users/Admin/Desktop/Work/Project7/SPECIFICATION.md) để nắm rõ:
  1. Mục tiêu toàn cục của dự án.
  2. Kiến trúc và công nghệ được lựa chọn.
  3. Cấu trúc thư mục chuẩn.
* Mọi tính năng mới hoặc thay đổi kiến trúc đều phải được cập nhật vào `SPECIFICATION.md` trước hoặc đồng thời với việc viết code. Không tự ý thêm bớt các thư viện hay kiến trúc ngoài phạm vi đặc tả.

### 📌 Nguyên tắc 2: Giữ sạch Context (1 Hội thoại = 1 Tính năng)
* **Không làm loãng Context:** Mỗi phiên làm việc (conversation) chỉ tập trung giải quyết **duy nhất 1 chức năng hoặc 1 nhiệm vụ độc lập** (ví dụ: Session 1 - Setup hạ tầng, Session 2 - Xây dựng Backend API, Session 3 - Dựng Frontend UI).
* Khi một tính năng đã hoàn thành và được kiểm thử thành công, tổng kết ngắn gọn và khuyến khích mở conversation mới nếu chuyển sang mảng tính năng khác để tối ưu token và giữ trí nhớ ngắn hạn của AI sắc bén nhất.

### 📌 Nguyên tắc 3: Điều hướng Codebase & Tìm kiếm thông minh
* **Không đoán mò cấu trúc:** Sử dụng công cụ đọc thư mục và cấu trúc file có sẵn để nắm rõ sơ đồ mã nguồn thay vì tìm kiếm mù quáng.
* Khi tìm kiếm logic, ưu tiên định vị đúng module dựa theo cấu trúc đã quy định trong `SPECIFICATION.md` (ví dụ: logic yt-dlp nằm trong `backend/app/services/ytdl_service.py`).

### 📌 Nguyên tắc 4: Bảo mật tuyệt đối (Zero Leak Secrets)
* **Không bao giờ commit Token/Secret:** Các API Key (GitHub PAT, Render API Key, Cloudflare Tokens) **CHỈ ĐƯỢC PHÉP** lưu trữ trong file `.env` nội bộ tại máy tính của lập trình viên.
* File `.gitignore` phải luôn có mặt và chặn `.env`, `*.log`, `__pycache__`, `venv/`.
* Mọi file đẩy lên GitHub chỉ được chứa `.env.example` với các giá trị placeholder rỗng.

### 📌 Nguyên tắc 5: Kiểm thử và Xác minh trước khi kết thúc (Verify & Stop)
* Sau khi viết hoặc sửa code, Agent luôn phải chạy lệnh kiểm thử (test syntax, import, gọi thử API) để đảm bảo không có lỗi cú pháp hoặc crash ngầm.
* Chỉ báo cáo "Hoàn thành" khi đã có bằng chứng (kết quả chạy lệnh, status 200 OK từ API).

---

## 2. QUY TRÌNH PHÁT TRIỂN SPEC-KIT / SUPERPOWER

Mỗi tác vụ phát triển tuân theo chu trình 5 bước nghiêm ngặt:

```
[1. Đọc Spec] ➔ [2. Lập Plan ngắn] ➔ [3. Thực thi tối giản] ➔ [4. Kiểm thử/Xác minh] ➔ [5. Ghi nhận vào Spec]
```

1. **Đọc Spec:** Xác định yêu cầu thuộc phần nào trong [SPECIFICATION.md](file:///c:/Users/Admin/Desktop/Work/Project7/SPECIFICATION.md).
2. **Lập Plan:** Đưa ra 2-3 bước triển khai cụ thể, ngắn gọn.
3. **Thực thi:** Viết code sạch (clean code), chú thích rõ ràng, ưu tiên giải pháp tối giản (KISS/YAGNI), không over-engineering.
4. **Kiểm thử:** Dùng terminal/script để chạy thử trực tiếp.
5. **Ghi nhận:** Cập nhật trạng thái hoàn thành vào tài liệu dự án.

---

## 3. CHECKLIST CHO MỌI AGENT KHI BẮT ĐẦU PHIÊN MỚI
- [ ] Đã đọc `SPECIFICATION.md` chưa?
- [ ] Task hiện tại có bị chồng chéo với tính năng khác không?
- [ ] Đã kiểm tra `.gitignore` chưa trước khi push code lên Git?
- [ ] Kết quả kiểm thử đã xanh (Pass) chưa?
