# WashroomAQ Frontend

React + Vite dashboard for live washroom sensor monitoring and calibration controls.

## Local development

1. Install dependencies.
2. Create `.env` from `.env.example`.
3. Start dev server.

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment variables

Use these Vite variables:

- `VITE_API_URL`: backend HTTP base URL (used by Axios)
- `VITE_SOCKET_URL`: backend Socket.IO URL (defaults to `VITE_API_URL` if omitted)

Example:

```dotenv
VITE_API_URL=https://your-backend-domain.com
VITE_SOCKET_URL=https://your-backend-domain.com
```

## Deploy on Vercel

Project already includes `vercel.json` configured for:

- Vite framework build
- SPA fallback rewrites to `index.html`

In Vercel dashboard:

1. Import this `Frontend` project from GitHub.
2. Build settings:
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
3. Add environment variables:
- `VITE_API_URL`
- `VITE_SOCKET_URL`
4. Deploy.

## Important backend note

Your backend must be publicly reachable over HTTPS for browser requests and Socket.IO from Vercel.
