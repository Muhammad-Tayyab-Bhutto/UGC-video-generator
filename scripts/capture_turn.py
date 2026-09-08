#!/usr/bin/env python3
import sys
import json
import os
import re
from datetime import datetime, timezone

def main():
    # Read hook context from stdin if available
    input_data = {}
    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw.strip():
                input_data = json.loads(raw)
    except Exception:
        pass

    conv_id = input_data.get("conversationId")
    transcript_path = input_data.get("transcriptPath")
    model_name = input_data.get("modelName") or "Gemini 3.8 Flash (Low)"

    # Fallback to scanning brain directory if not provided
    brain_dir = os.path.expanduser("~/.gemini/antigravity/brain")
    if not conv_id or not transcript_path or not os.path.exists(transcript_path):
        if os.path.exists(brain_dir):
            conv_dirs = [os.path.join(brain_dir, d) for d in os.listdir(brain_dir)]
            conv_dirs = [d for d in conv_dirs if os.path.isdir(d) and not d.endswith('.user_uploaded')]
            if conv_dirs:
                conv_dirs.sort(key=lambda d: os.path.getmtime(d), reverse=True)
                latest_conv = conv_dirs[0]
                if not conv_id:
                    conv_id = os.path.basename(latest_conv)
                candidate_path = os.path.join(latest_conv, ".system_generated", "logs", "transcript_full.jsonl")
                if os.path.exists(candidate_path):
                    transcript_path = candidate_path

    if not transcript_path or not os.path.exists(transcript_path):
        print(json.dumps({"injectSteps": []}))
        return

    steps = []
    with open(transcript_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                steps.append(json.loads(line))
            except Exception:
                continue

    exchanges = []
    curr_prompt = None
    curr_response = None

    for step in steps:
        stype = step.get("type")
        source = step.get("source")
        content = step.get("content")
        created_at = step.get("created_at")

        if stype == "USER_INPUT" and source == "USER_EXPLICIT":
            if curr_prompt is not None:
                exchanges.append({
                    "prompt": curr_prompt,
                    "response": curr_response
                })
                curr_response = None

            prompt_text = content or ""
            req_match = re.search(r'<USER_REQUEST>\n?(.*?)\n?</USER_REQUEST>', prompt_text, re.DOTALL)
            if req_match:
                prompt_clean = req_match.group(1)
            else:
                prompt_clean = prompt_text

            curr_prompt = {
                "timestamp": created_at,
                "content": prompt_clean
            }
        elif stype == "PLANNER_RESPONSE" and source == "MODEL":
            if content:
                curr_response = {
                    "timestamp": created_at,
                    "content": content
                }

    if curr_prompt is not None:
        exchanges.append({
            "prompt": curr_prompt,
            "response": curr_response
        })

    if not exchanges:
        print(json.dumps({"injectSteps": []}))
        return

    workspace_paths = input_data.get("workspacePaths", [])
    if workspace_paths:
        repo_root = workspace_paths[0]
    else:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    logs_dir = os.path.join(repo_root, ".agent-logs")
    os.makedirs(logs_dir, exist_ok=True)

    first_time_str = exchanges[0]["prompt"]["timestamp"]
    try:
        dt = datetime.fromisoformat(first_time_str.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.now(timezone.utc)

    file_prefix = dt.strftime("%Y-%m-%d_%H-%M-%S")
    log_file_name = f"{file_prefix}_{conv_id}.md"
    log_file_path = os.path.join(logs_dir, log_file_name)

    date_str = dt.strftime("%Y-%m-%d")
    author = "Muhammad-Tayyab-Bhutto"
    tool = "google-antigravity"
    project = "ugc-video-generator"
    total_exchanges = len(exchanges)
    first_prompt_time = exchanges[0]["prompt"]["timestamp"]
    last_prompt_time = exchanges[-1]["prompt"]["timestamp"]
    short_sess = conv_id[:8] if conv_id else "unknown"

    md = []
    md.append("---")
    md.append(f"session_id: {conv_id}")
    md.append(f"date: {date_str}")
    md.append(f"author: {author}")
    md.append(f"model: {model_name}")
    md.append(f"tool: {tool}")
    md.append(f"project: {project}")
    md.append(f"total_exchanges: {total_exchanges}")
    md.append(f"first_prompt_time: {first_prompt_time}")
    md.append(f"last_prompt_time: {last_prompt_time}")
    md.append("---")
    md.append("")
    md.append(f"# Session Log - {date_str}")
    md.append("")
    md.append(f"Session: `{short_sess}` | Project: `{project}` | Author: `{author}`")
    md.append("")
    md.append("---")

    for i, ex in enumerate(exchanges, 1):
        md.append("")
        md.append(f"[LOG_ENTRY type=PROMPT num={i} session={short_sess}]")
        md.append(f"timestamp: {ex['prompt']['timestamp']}")
        md.append(f"model: {model_name}")
        md.append("")
        md.append(ex["prompt"]["content"])
        md.append("")

        if ex.get("response"):
            md.append("")
            md.append(f"[LOG_ENTRY type=RESPONSE num={i} session={short_sess}]")
            md.append(f"timestamp: {ex['response']['timestamp']}")
            md.append(f"model: {model_name}")
            md.append("")
            md.append(ex["response"]["content"])
            md.append("")

    with open(log_file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md).strip() + "\n")

    print(json.dumps({"injectSteps": []}))

if __name__ == "__main__":
    main()
