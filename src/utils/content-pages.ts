import { getCollection, render } from 'astro:content';
import { buildSearchItems, getPublishedPosts, type SearchItem } from './posts';

type ContentPageSlug = 'about' | 'bio';

interface ContentPageConfig {
  slug: ContentPageSlug;
  seoTitle: string;
  fallbackDescription: string;
}

interface BuildContentPageOptions {
  base: string;
  siteOrigin: string;
  config: ContentPageConfig;
}

export async function buildContentPageData({ base, siteOrigin, config }: BuildContentPageOptions): Promise<{
  Content: Awaited<ReturnType<typeof render>>['Content'];
  searchItems: SearchItem[];
  subtitle?: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
}> {
  const posts = await getPublishedPosts();
  const searchItems = buildSearchItems(posts, base);
  const pageEntry = (await getCollection('pages', ({ data }) => !data.draft)).find((entry) => entry.id === config.slug);
  if (!pageEntry) throw new Error(`Missing content file: src/content/pages/${config.slug}.md`);
  const { Content } = await render(pageEntry);

  return {
    Content,
    searchItems,
    subtitle: pageEntry.data.subtitle,
    seoTitle: config.seoTitle,
    seoDescription: pageEntry.data.subtitle ?? config.fallbackDescription,
    canonicalUrl: new URL(`${base}${config.slug}/`, siteOrigin).toString(),
    ogImageUrl: new URL(`${base}images/profile-avatar.jpg`, siteOrigin).toString(),
  };
}
