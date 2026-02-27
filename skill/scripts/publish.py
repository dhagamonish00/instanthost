import os
import sys
import json
import requests
import argparse
import mimetypes
from concurrent.futures import ThreadPoolExecutor

# InstantHost Publish Script (Python)
# Version: 1.0.0

def main():
    parser = argparse.ArgumentParser(description="InstantHost Publish Script")
    parser.add_argument("target", help="File or directory to publish")
    parser.add_argument("--slug", help="Update existing publish")
    parser.add_argument("--claim-token", help="Override claim token")
    parser.add_argument("--title", help="Viewer title")
    parser.add_argument("--description", help="Viewer description")
    parser.add_argument("--ttl", type=int, help="Custom TTL (authenticated only)")
    parser.add_argument("--base-url", default="https://yourdomain.com", help="API base URL")
    parser.add_argument("--api-key", help="API key override")
    
    args = parser.parse_args()

    # Step 1: Resolve API Key
    api_key = args.api_key
    if not api_key:
        api_key = os.environ.get("INSTANTHOST_API_KEY")
    if not api_key:
        creds_path = os.path.expanduser("~/.instanthost/credentials")
        if os.path.exists(creds_path):
            with open(creds_path, "r") as f:
                api_key = f.read().strip()

    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Step 3: Build files array
    files_to_publish = []
    target_abs = os.path.abspath(args.target)
    
    if os.path.isdir(target_abs):
        for root, _, filenames in os.walk(target_abs):
            for filename in filenames:
                file_path = os.path.join(root, filename)
                rel_path = os.path.relpath(file_path, target_abs).replace(os.sep, '/')
                size = os.path.getsize(file_path)
                content_type, _ = mimetypes.guess_type(file_path)
                if not content_type:
                    content_type = "application/octet-stream"
                files_to_publish.append({
                    "path": rel_path,
                    "size": size,
                    "contentType": content_type,
                    "absolute_path": file_path
                })
    else:
        filename = os.path.basename(target_abs)
        size = os.path.getsize(target_abs)
        content_type, _ = mimetypes.guess_type(target_abs)
        if not content_type:
            content_type = "application/octet-stream"
        files_to_publish.append({
            "path": filename,
            "size": size,
            "contentType": content_type,
            "absolute_path": target_abs
        })

    # Step 4: Call API
    payload = {
        "files": [{"path": f["path"], "size": f["size"], "contentType": f["contentType"]} for f in files_to_publish],
        "ttlSeconds": args.ttl,
        "claimToken": args.claim_token,
        "viewer": {
            "title": args.title,
            "description": args.description
        }
    }

    if args.slug:
        api_url = f"{args.base_url}/api/v1/publish/{args.slug}"
        method = "PUT"
    else:
        api_url = f"{args.base_url}/api/v1/publish"
        method = "POST"

    response = requests.request(method, api_url, json=payload, headers=headers)
    resp_data = response.json()

    if "error" in resp_data:
        print(f"Error: {resp_data['error']}", file=sys.stderr)
        sys.exit(1)

    slug = resp_data["slug"]
    site_url = resp_data["siteUrl"]
    finalize_url = resp_data["finalizeUrl"]
    version_id = resp_data["versionId"]
    uploads = resp_data["uploads"]
    is_anonymous = resp_data.get("anonymous", False)
    claim_token_resp = resp_data.get("claimToken")
    claim_url_resp = resp_data.get("claimUrl")
    expires_at = resp_data.get("expiresAt")

    # Step 6: Parallel Uploads
    def upload_file(upload_info):
        file_meta = next(f for f in files_to_publish if f["path"] == upload_info["path"])
        with open(file_meta["absolute_path"], "rb") as f:
            upload_headers = {"Content-Type": upload_info["headers"]["Content-Type"]}
            requests.request(upload_info["method"], upload_info["url"], data=f, headers=upload_headers)

    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(upload_file, uploads)

    # Step 7: Finalize
    finalize_response = requests.post(finalize_url, json={"versionId": version_id}, headers=headers)
    
    # Step 8: Write results to stderr
    print(f"publish_result.site_url={site_url}", file=sys.stderr)
    if is_anonymous:
        print("publish_result.auth_mode=anonymous", file=sys.stderr)
        print(f"publish_result.claim_url={claim_url_resp}", file=sys.stderr)
    else:
        print("publish_result.auth_mode=authenticated", file=sys.stderr)

    # Step 9: Save state
    state_dir = ".instanthost"
    os.makedirs(state_dir, exist_ok=True)
    state_file = os.path.join(state_dir, "state.json")
    
    state = {"publishes": {}}
    if os.path.exists(state_file):
        try:
            with open(state_file, "r") as f:
                state = json.load(f)
        except:
            pass
            
    state["publishes"][slug] = {
        "siteUrl": site_url,
        "claimToken": claim_token_resp,
        "claimUrl": claim_url_resp,
        "expiresAt": expires_at
    }
    
    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)

    # Step 10: Print siteUrl to stdout
    print(site_url)

if __name__ == "__main__":
    main()
