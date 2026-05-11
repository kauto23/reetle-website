# Reetle OG Worker (Cloudflare)

Serves Open Graph / Twitter meta tags to **known crawlers** when the URL has `?article=<id>`. Data comes **only** from `GET /api/articles/{id}/og` (public). Everyone else is proxied to your normal hosting (Firebase).

Also serves **`/robots.txt`** directly from the Worker so crawlers don’t depend on the origin for that file.

## Edit & deploy from this repo

```bash
cd og-worker
```

1. Log in (browser OAuth) **or** use an API token:

   ```bash
   export CLOUDFLARE_API_TOKEN=your_token_here
   ```

2. Deploy:

   ```bash
   npm install
   npm run deploy
   ```

If `wrangler` hits network errors on your machine, deploy the same code from **Cloudflare dashboard → Workers → reetle-og-worker → Edit code** (paste the bundled output or copy from `src/index.ts`).

## Keep robots in sync

The string `ROBOTS_TXT` in `src/index.ts` must match **`../public/robots.txt`** in the Next/Firebase project. Update both when you change robots rules.

## Test

```bash
curl -s -H "User-Agent: facebookexternalhit/1.1" "https://reetle.co/?article=16993" | head -25
curl -s "https://reetle.co/robots.txt" | head -20
```

Meta debugger: https://developers.facebook.com/tools/debug/
