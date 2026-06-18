import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { sortPostsByDateDesc } from '../utils/posts';

export const GET: APIRoute = async ({ site }) => {
  const PAGE_SIZE = 10;
  const basePath = import.meta.env.BASE_URL || '/';
  const siteOrigin = site?.toString() ?? 'http://127.0.0.1:4321';
  const urlFor = (path: string) => new URL(path, siteOrigin).toString();
  const nowIso = new Date().toISOString();

  const staticEntries = [
    { loc: urlFor(basePath), lastmod: nowIso },
    { loc: urlFor(`${basePath}about/`), lastmod: nowIso },
    { loc: urlFor(`${basePath}bio/`), lastmod: nowIso },
    { loc: urlFor(`${basePath}articles/`), lastmod: nowIso },
    { loc: urlFor(`${basePath}books/`), lastmod: nowIso },
    { loc: urlFor(`${basePath}shows-and-movies/`), lastmod: nowIso },
    { loc: urlFor(`${basePath}rss.xml`), lastmod: nowIso },
  ];

  const posts = sortPostsByDateDesc(await getCollection('posts', ({ data }) => !data.draft));
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const postEntries = posts.map((post) => ({
    loc: urlFor(`${basePath}posts/${post.id}/`),
    lastmod: post.data.publishDate.toISOString(),
  }));

  const pageEntries = totalPages > 1
    ? Array.from({ length: totalPages - 1 }, (_, idx) => ({
        loc: urlFor(`${basePath}page/${idx + 2}/`),
        lastmod: posts[0]?.data.publishDate.toISOString() ?? nowIso,
      }))
    : [];

  const categoryConfigs = [
    { slug: 'articles', category: 'Articles' as const },
    { slug: 'books', category: 'Books' as const },
    { slug: 'shows-and-movies', category: 'Shows and Movies' as const },
  ];

  const categoryEntries = categoryConfigs.flatMap((config) => {
    const categoryPosts = posts.filter((post) => post.data.majorCategory === config.category);
    const categoryTotalPages = Math.max(1, Math.ceil(categoryPosts.length / PAGE_SIZE));
    const entries = [];
    if (categoryTotalPages > 1) {
      for (let i = 2; i <= categoryTotalPages; i += 1) {
        entries.push({
          loc: urlFor(`${basePath}${config.slug}/page/${i}/`),
          lastmod: categoryPosts[0]?.data.publishDate.toISOString() ?? nowIso,
        });
      }
    }
    return entries;
  });

  const allEntries = [...staticEntries, ...pageEntries, ...categoryEntries, ...postEntries];
  const urlset = allEntries
    .map(
      (entry) => `<url>
  <loc>${entry.loc}</loc>
  <lastmod>${entry.lastmod}</lastmod>
</url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
