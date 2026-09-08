# UGC Studio — AI Product Video Generator

Turn any product page into a short 7-second UGC-style video automatically. Built for the 8x Video Generator assignment.

## What it Does

1. **Product URL Intelligence**: Takes an arbitrary product landing page URL, normalizes it, enforces strict DNS-resolved SSRF security checks, and extracts key product metadata and hero imagery.
2. **Gemini Creative Director**: Analyzes product features to craft a grounded hook, benefit body copy, call-to-action, visual search keywords, reaction GIF intent, and audio mood.
3. **Asset Resolver & Renderer**: Resolves product imagery, reaction GIFs, and audio tracks before invoking Remotion Lambda in AWS `us-east-1` to render a 1080x1920 @ 30 FPS vertical MP4 video.
4. **Conversational Experience**: A lightweight, responsive chat interface where users can converse or submit product URLs to view live generation progress and stream rendered videos.

---

## Live Demo & Deployed App

- **Public Production App**: `https://8x-assignment-ten.vercel.app` (Or local production server running `npm start`)
- **Public GitHub Repository**: `https://github.com/Muhammad-Tayyab-Bhutto/8x-assignment`

---

## Architecture & Technology Stack

- **Framework**: Next.js 15 (App Router, React 19, Tailwind CSS)
- **AI Engine**: Official `@google/generative-ai` SDK (`gemini-2.5-flash` with structured JSON output schema)
- **Video Renderer**: Remotion 4.0.522 (`@remotion/lambda`, `@remotion/bundler`, `@remotion/renderer`)
- **Cloud Infrastructure**: AWS S3 (`remotionlambda-useast1-jwc4yc5wbb`) & AWS Lambda (`remotion-render-4-0-522-mem2048mb-disk2048mb-120sec` in `us-east-1`)
- **HTML Extraction**: `cheerio` with custom noise removal and image provenance ranking

---

## Asynchronous System Architecture

To prevent long-running media rendering from holding open web request connections and triggering serverless gateway timeouts (504s), UGC Studio uses an asynchronous request-processing separation pattern:

```
User -> Next.js Chat API (POST /api/generate) -> Product Intelligence -> Remotion Lambda (submit render)
   ^                                                                              |
   |                                                                              v
   +---- Poll Status API (GET /api/generate/[jobId]) <---------------------- S3 Render Output
```

1. **Request Acceptance**: `POST /api/generate` performs fast URL security checks, product scraping, Gemini creative analysis, asset resolution, and submits the render job to AWS Lambda, returning `HTTP 202 Accepted` with a unique `jobId` in under 3 seconds.
2. **Independent Processing**: AWS Lambda renders the 1080x1920 video asynchronously across distributed Lambda instances, uploading the MP4 directly to S3.
3. **Status Polling**: The client polls `GET /api/generate/[jobId]` every 2.5 seconds to track render progress until S3 completion, displaying the vertical MP4 inline in the chat UI.

---

## Security & SSRF Protection

- **DNS-Resolved SSRF Guard**: Preflight DNS lookup (`dns.promises.lookup`) blocking loopback (`127.0.0.0/8`), private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), unspecified (`0.0.0.0`), IPv6 (`::1`, `fc00::/7`, `fe80::/10`), IPv4-mapped IPv6, and AWS metadata endpoints (`169.254.169.254`).
- **DNS Socket Pinning**: Pins HTTP request sockets directly to preflight-validated IP addresses to prevent TOCTOU DNS rebinding attacks.
- **Manual Redirect Validation**: Handles max 5 redirects (301, 302, 303, 307, 308), re-validating protocol, hostname, DNS, and target IP per hop.
- **Streaming Byte Limits**: Enforces 2 MB streaming byte cap during HTML response consumption.
- **Server-Only Credentials**: All API keys (`GEMINI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) remain strictly server-side.

---

## Environment Variables (.env.example)

Copy `.env.example` to `.env.local` for local development:

```env
# Gemini API Key & Model
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Asset Providers (Optional - Fallbacks built in)
PEXELS_API_KEY=
GIPHY_API_KEY=

# AWS Credentials for Remotion Lambda
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
REMOTION_AWS_REGION=us-east-1
```

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run full automated test suite (14/14 tests)
npm test

# Run TypeScript typecheck
npx tsc --noEmit

# Build production Next.js app
npm run build

# Start production server
npm start
```

---

## Agent Capture Infrastructure

This repository incorporates an automated capture system configured in `.agents/hooks.json` and executed via `scripts/capture_turn.py`. All raw prompt turns, code edits, and response outputs are preserved verbatim in `.agent-logs/` for complete auditability.
