# Workspace Agent Rules

- This workspace uses an automatic capture system configured in `.agents/hooks.json` and executed via `scripts/capture_turn.py`.
- At the end of each turn or response, the agent capture script ensures all raw prompt and final response turns are preserved verbatim in `.agent-logs/` matching the required format `YYYY-MM-DD_HH-MM-SS_<session-id>.md`.
- Never add `.agent-logs/` to `.gitignore`.
- If hooks are not invoked by the environment at any lifecycle boundary, `scripts/capture_turn.py` must run to sync `.agent-logs/` from the session transcript.
