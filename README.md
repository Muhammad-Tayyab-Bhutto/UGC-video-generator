# UGC Video Generator

A production-ready web application that turns any product URL into a short UGC-style marketing video using structured AI scripting and programmatic Remotion video rendering.

## Core Features
- **Conversational Chat**: Interactive single-thread interface.
- **Automated Product Understanding**: Extracts metadata and OpenGraph visual assets.
- **Structured Creative Scripting**: Formulates hooks, body copy, CTA, and visual mood using Gemini AI.
- **Programmatic Video Composition**: Renders a vertical 9:16 (~7s, 30 FPS, 1080x1920) video via Remotion.
- **Serverless Production Rendering**: Remotion Lambda on AWS for high-speed parallel rendering without server timeouts.

## Tech Stack
- **Framework**: Next.js (App Router, TypeScript, Tailwind CSS)
- **Video Engine**: Remotion (`remotion`, `@remotion/player`, `@remotion/lambda`)
- **LLM**: Google Gemini API (`@google/genai`)
- **Production Rendering & Storage**: AWS Lambda & AWS S3

## Environment Setup
Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

### Required Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key
- `AWS_ACCESS_KEY_ID`: AWS IAM user access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS IAM user secret access key
- `REMOTION_AWS_REGION`: AWS region for Lambda (Default: `us-east-1`)
- `REMOTION_AWS_BUCKET`: AWS S3 bucket name for rendered media
