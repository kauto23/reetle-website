var g=["facebookexternalhit","Facebot","Twitterbot","LinkedInBot","Slackbot","WhatsApp","Discordbot","TelegramBot","Googlebot","bingbot","Applebot"],u="https://reetle-api-production-507485624349.us-central1.run.app/api";function p(t){let a=t.toLowerCase();return g.some(e=>a.includes(e.toLowerCase()))}function h(t){return t.image_links&&t.image_links.length>0?t.image_links[0]:t.image_link?t.image_link:t.image_url?t.image_url:null}function d(t,a){let e=o(t.headline_familiar),r=o(`Read "${t.headline_familiar}" on Reetle \u2014 learn languages through reading real articles.`),n=h(t),i=o(t.topic);return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${e} \u2014 Reetle</title>
  <meta name="description" content="${r}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${e}" />
  <meta property="og:description" content="${r}" />
  <meta property="og:url" content="${o(a)}" />
  <meta property="og:site_name" content="Reetle" />
  ${n?`<meta property="og:image" content="${o(n)}" />`:""}
  <meta property="article:section" content="${i}" />

  <meta name="twitter:card" content="${n?"summary_large_image":"summary"}" />
  <meta name="twitter:title" content="${e}" />
  <meta name="twitter:description" content="${r}" />
  ${n?`<meta name="twitter:image" content="${o(n)}" />`:""}

  <meta name="robots" content="noindex" />
</head>
<body></body>
</html>`}function o(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}async function f(t,a){let e=new Request("https://og-cache.reetle.co/article-summaries"),r=await a.match(e);if(r){let l=(await r.json()).articles.find(m=>String(m.article_id)===t);if(l)return l}let n=await fetch(`${u}/articles/guest/article-summaries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({max_articles:500})});if(!n.ok)return null;let i=await n.json(),s=new Response(JSON.stringify(i),{headers:{"Cache-Control":"public, max-age=600"}});return await a.put(e,s),i.articles.find(c=>String(c.article_id)===t)||null}var y={async fetch(t){let a=new URL(t.url),e=t.headers.get("User-Agent")||"";if(!p(e))return fetch(t);let r=a.searchParams.get("article");if(!r)return fetch(t);try{let n=caches.default,i=await f(r,n);if(!i)return fetch(t);let s=d(i,a.toString());return new Response(s,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=3600"}})}catch{return fetch(t)}}};export{y as default};
