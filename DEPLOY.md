# Toybox FPS Arena Deployment

This app needs a long-running Node server because multiplayer uses WebSocket at `/ws`.
Static-only hosts are not enough.

## Recommended: Render Web Service

1. Push this folder to a GitHub repository.
2. In Render, create a new Blueprint or Web Service from the repository.
3. Use `render.yaml` if creating a Blueprint.
4. Use these commands if creating manually:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/health`
5. Keep the service on a paid always-on plan for the most stable URL.

The resulting Render HTTPS URL is the URL to share.

After deployment, verify the live game:

```bash
npm run verify:public -- https://your-render-url.onrender.com
```

You can also run the GitHub Actions workflow `Verify Toybox FPS Arena` manually and pass the deployed URL as `public_url`.

## Railway

Railway can use `railway.json`.

1. Push this folder to GitHub.
2. Create a Railway project from the repository.
3. Railway should detect `railway.json`.
4. Confirm:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/health`

## Fly.io

Fly.io can use `fly.toml` and the included `Dockerfile`.
Before deploying, change `app = "toybox-fps-arena"` in `fly.toml` if that app name is unavailable.
Keep `auto_stop_machines = false` and `min_machines_running = 1` for multiplayer reliability.

## Heroku-Compatible Hosts

Hosts that support a `Procfile` can run:

```text
web: npm start
```

## Docker-Compatible Hosts

The included `Dockerfile` can run on hosts that support persistent web services and WebSocket traffic.
Set the platform port from `PORT`; the server already reads `process.env.PORT`.

## Limits

No URL can be guaranteed to never be blocked or banned by every network.
Use a normal HTTPS host, follow the host terms, and use a custom domain if you need the best long-term reliability.
