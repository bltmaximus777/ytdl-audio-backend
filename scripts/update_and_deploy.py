import os
import sys
import json
import urllib.request
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

def main():
    render_key = "rnd_VSmYrRKAfUS08wWbP3YML3PhfsSR"
    service_id = "srv-dbbnvkbncjis739c5l8g"

    # Cập nhật startCommand chính xác với $PORT
    patch_payload = {
        "rootDir": "backend",
        "serviceDetails": {
            "envSpecificDetails": {
                "buildCommand": "pip install -r requirements.txt",
                "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
            }
        }
    }

    print("[1] Cập nhật cấu hình Render Web Service...")
    req_patch = urllib.request.Request(
        f"https://api.render.com/v1/services/{service_id}",
        data=json.dumps(patch_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {render_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="PATCH"
    )
    with urllib.request.urlopen(req_patch) as resp:
        res = json.loads(resp.read().decode())
        start_cmd = res.get("serviceDetails", {}).get("envSpecificDetails", {}).get("startCommand")
        root_dir = res.get("rootDir")
        print(f" -> Cập nhật thành công! rootDir='{root_dir}', startCommand='{start_cmd}'")

    print("[2] Kích hoạt Deploy mới...")
    req_deploy = urllib.request.Request(
        f"https://api.render.com/v1/services/{service_id}/deploys",
        data=json.dumps({"clearCache": "clear"}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {render_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req_deploy) as resp:
        dep_data = json.loads(resp.read().decode())
        dep_id = dep_data.get("id")
        print(f" -> Đã kích hoạt Deploy mới: {dep_id}")

if __name__ == "__main__":
    main()
