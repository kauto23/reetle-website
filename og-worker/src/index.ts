/**
 * Cloudflare Worker: OG tags for crawlers on ?article=…
 * Uses only GET /api/articles/{id}/og — no other API calls.
 * Deploy: npm run deploy (see README.md)
 *
 * Keep ROBOTS_TXT in sync with ../public/robots.txt
 */
const ROBOTS_TXT = `# https://www.robotstxt.org/robotstxt.html

User-agent: *
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: Facebot
Allow: /

# Optional: if you add a sitemap later
# Sitemap: https://reetle.co/sitemap.xml
`;

const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'WhatsApp',
  'Discordbot',
  'TelegramBot',
  'Googlebot',
  'bingbot',
  'Applebot',
];

const API_BASE = 'https://reetle-api-production-507485624349.us-central1.run.app/api';

/** Success body from GET /api/articles/{id}/og */
interface OgMetadata {
  title: string;
  image_url: string;
}

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

function ogImageUrl(meta: OgMetadata): string | null {
  const u = meta.image_url?.trim();
  return u || null;
}

function buildOgHtml(meta: OgMetadata, pageUrl: string): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(`Read "${meta.title}" on Reetle — learn languages through reading real articles.`);
  const image = ogImageUrl(meta);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} — Reetle</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:site_name" content="Reetle" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}

  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}

  <meta name="robots" content="noindex" />
</head>
<body></body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Only numeric article IDs (path segment safe). */
function isValidArticleId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * GET /api/articles/{id}/og — sole API dependency for OG HTML.
 * Caches per-article JSON briefly to reduce origin load and rate limits (60/min per IP at API).
 */
async function fetchOgMetadata(articleId: string, cache: Cache): Promise<OgMetadata | null> {
  if (!isValidArticleId(articleId)) return null;

  const cacheKey = new Request(`https://og-cache.reetle.co/metadata/${articleId}`);

  const cached = await cache.match(cacheKey);
  if (cached && cached.ok) {
    try {
      const data = (await cached.json()) as OgMetadata;
      if (data && typeof data.title === 'string') return data;
    } catch {
      /* ignore bad cache entry */
    }
  }

  const response = await fetch(`${API_BASE}/articles/${articleId}/og`, { method: 'GET' });

  if (response.status === 404) return null;
  if (response.status === 429) {
    console.log('[og-worker] OG API rate limited', { articleId });
    return null;
  }
  if (!response.ok) return null;

  let data: OgMetadata;
  try {
    data = (await response.json()) as OgMetadata;
  } catch {
    return null;
  }
  if (!data || typeof data.title !== 'string') return null;

  const normalized: OgMetadata = {
    title: data.title,
    image_url: typeof data.image_url === 'string' ? data.image_url : '',
  };

  const cacheResponse = new Response(JSON.stringify(normalized), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
  await cache.put(cacheKey, cacheResponse);

  return normalized;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    if (pathname === '/robots.txt') {
      return new Response(ROBOTS_TXT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const userAgent = request.headers.get('User-Agent') || '';

    if (!isBot(userAgent)) {
      return fetch(request);
    }

    const articleId = url.searchParams.get('article');

    if (!articleId) {
      return fetch(request);
    }

    try {
      const cache = caches.default;
      const meta = await fetchOgMetadata(articleId, cache);

      if (!meta) {
        return fetch(request);
      }

      const canonicalUrl = url.toString();
      const image = ogImageUrl(meta);
      console.log('[og-worker] serving OG response', {
        articleId,
        'og:title': meta.title,
        'og:description': `Read "${meta.title}" on Reetle — learn languages through reading real articles.`,
        'og:image': image,
        'og:url': canonicalUrl,
        'og:type': 'article',
      });

      const html = buildOgHtml(meta, canonicalUrl);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      return fetch(request);
    }
  },
};
