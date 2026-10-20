import os
import sys
import subprocess
import json
import urllib.request
import urllib.error

# Thiết lập UTF-8 cho Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

def load_env(env_path=".env"):
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip()
    return env_vars

def main():
    print("=== BẮT ĐẦU QUY TRÌNH TỰ ĐỘNG HOÁ TRIỂN KHAI ===")
    env = load_env()
    
    gh_user = env.get("GITHUB_USERNAME")
    gh_token = env.get("GITHUB_TOKEN")
    render_key = env.get("RENDER_API_KEY")

    if not gh_token or not render_key:
        print("[!] LỖI: Thiếu GITHUB_TOKEN hoặc RENDER_API_KEY trong file .env")
        sys.exit(1)

    repo_name = "ytdl-audio-backend"

    # 1. Kiểm tra tài khoản GitHub
    print(f"\n[1/4] Kiểm tra GitHub User '{gh_user}'...")
    req = urllib.request.Request(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {gh_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Automation-Script"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            user_data = json.loads(resp.read().decode())
            print(f" -> Xác thực GitHub thành công: {user_data.get('login')} ({user_data.get('name')})")
    except Exception as e:
        print(f"[!] Lỗi xác thực GitHub: {e}")
        sys.exit(1)

    # 2. Tạo repository trên GitHub (nếu chưa có)
    print(f"\n[2/4] Kiểm tra / Tạo repository '{repo_name}' trên GitHub...")
    repo_url = f"https://api.github.com/user/repos"
    payload = json.dumps({
        "name": repo_name,
        "description": "YouTube Audio Stream Extractor API (FastAPI + yt-dlp)",
        "private": False
    }).encode("utf-8")

    req_repo = urllib.request.Request(
        repo_url,
        data=payload,
        headers={
            "Authorization": f"Bearer {gh_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Automation-Script"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_repo) as resp:
            print(" -> Đã tạo mới repository thành công!")
    except urllib.error.HTTPError as e:
        if e.code == 422:
            print(" -> Repository đã tồn tại trên GitHub, tiếp tục quy trình push code.")
        else:
            print(f"[!] Lỗi khi tạo repo: {e}")
            sys.exit(1)

    # 3. Git commit & push
    print(f"\n[3/4] Đồng bộ mã nguồn lên GitHub...")
    subprocess.run(["git", "init"], check=True)
    subprocess.run(["git", "config", "user.name", gh_user], check=True)
    subprocess.run(["git", "config", "user.email", env.get("GITHUB_EMAIL", "dev@example.com")], check=True)
    subprocess.run(["git", "add", "."], check=True)
    
    # Kiểm tra xem file .env thực sự có bị add nhầm không
    staged_files = subprocess.check_output(["git", "diff", "--cached", "--name-only"]).decode().splitlines()
    if ".env" in staged_files:
        print("[!] CẢNH BÁO: Phát hiện .env trong git stage! Huỷ bỏ ngay lập tức.")
        subprocess.run(["git", "reset", ".env"])
        sys.exit(1)

    subprocess.run(["git", "commit", "-m", "feat: initial commit with backend core and specs"], check=False)
    subprocess.run(["git", "branch", "-M", "main"], check=True)

    remote_url = f"https://{gh_user}:{gh_token}@github.com/{gh_user}/{repo_name}.git"
    
    # Xoá origin cũ nếu có
    subprocess.run(["git", "remote", "remove", "origin"], stderr=subprocess.DEVNULL)
    subprocess.run(["git", "remote", "add", "origin", remote_url], check=True)
    
    print(" -> Đang đẩy code lên branch 'main'...")
    subprocess.run(["git", "push", "-u", "origin", "main", "--force"], check=True)
    print(" -> Push code lên GitHub thành công!")

    # 4. Tạo Render Web Service
    print(f"\n[4/4] Khởi tạo Web Service trên Render.com...")
    # Lấy ownerId của tài khoản Render
    req_owners = urllib.request.Request(
        "https://api.render.com/v1/owners",
        headers={
            "Authorization": f"Bearer {render_key}",
            "Accept": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req_owners) as resp:
            owners_data = json.loads(resp.read().decode())
            if not owners_data:
                print("[!] Không tìm thấy owner trên Render.")
                sys.exit(1)
            owner_id = owners_data[0]["owner"]["id"]
            print(f" -> Lấy được Render Owner ID: {owner_id}")
    except Exception as e:
        print(f"[!] Lỗi khi lấy Render Owner ID: {e}")
        sys.exit(1)

    # Tạo service trên Render
    service_payload = {
        "type": "web_service",
        "name": repo_name,
        "ownerId": owner_id,
        "repo": f"https://github.com/{gh_user}/{repo_name}",
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "env": "python",
            "plan": "free",
            "region": "singapore",
            "rootDir": "backend",
            "buildCommand": "pip install -r requirements.txt",
            "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
        }
    }

    req_service = urllib.request.Request(
        "https://api.render.com/v1/services",
        data=json.dumps(service_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {render_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req_service) as resp:
            svc_res = json.loads(resp.read().decode())
            svc_url = svc_res.get("service", {}).get("serviceDetails", {}).get("url")
            print(f"\n=======================================================")
            print(f"🎉 TỰ ĐỘNG HOÁ THÀNH CÔNG RỰC RỠ!")
            print(f" -> Service Name : {svc_res.get('service', {}).get('name')}")
            print(f" -> Render URL   : {svc_url}")
            print(f" -> GitHub Repo  : https://github.com/{gh_user}/{repo_name}")
            print(f"=======================================================")
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"[!] Render API Response ({e.code}): {err_msg}")
        # Nếu service đã tồn tại, lấy danh sách services để hiển thị URL
        if "already exists" in err_msg or e.code == 409:
            print(" -> Service đã tồn tại trên Render. Đang lấy thông tin URL...")
            req_list = urllib.request.Request(
                "https://api.render.com/v1/services?name=" + repo_name,
                headers={"Authorization": f"Bearer {render_key}", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req_list) as resp:
                services = json.loads(resp.read().decode())
                if services:
                    url = services[0].get("service", {}).get("serviceDetails", {}).get("url")
                    print(f" -> URL hiện tại của service: {url}")

if __name__ == "__main__":
    main()
