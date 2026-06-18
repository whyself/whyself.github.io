import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeStringify);

async function markdownToHtml(md: string): Promise<string> {
  const file = await processor.process(md);
  return String(file);
}

export const GET: APIRoute = async ({ site }) => {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());

  const baseUrl = (site?.toString() || 'https://blog.whyself.cn').replace(/\/$/, '');
  const feedUrl = `${baseUrl}/rss.xml`;
  const now = new Date().toUTCString();

  const itemsXml = await Promise.all(
    posts.map(async (post) => {
      const title = escapeXml(post.data.listTitle ?? post.data.title);
      const description = escapeXml(post.data.excerpt ?? '');
      const link = `${baseUrl}/posts/${post.id}/`;
      const pubDate = new Date(post.data.publishDate).toUTCString();
      const content = await markdownToHtml(post.body ?? '');

      return `<item>
  <title>${title}</title>
  <link>${link}</link>
  <guid>${link}</guid>
  <description>${description}</description>
  <content:encoded><![CDATA[${content}]]></content:encoded>
  <pubDate>${pubDate}</pubDate>
</item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>whyself blog</title>
  <link>${baseUrl}/</link>
  <description>Recent posts from whyself blog</description>
  <language>zh-CN</language>
  <lastBuildDate>${now}</lastBuildDate>
  <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />
${itemsXml.join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
};
