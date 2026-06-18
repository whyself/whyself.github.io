import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export interface SearchItem {
  title: string;
  href: string;
  tags?: string[];
  excerpt?: string;
}

export type MajorRoute = 'all' | 'articles' | 'books' | 'shows-and-movies';

export async function getPublishedPosts(): Promise<PostEntry[]> {
  return getCollection('posts', ({ data }) => !data.draft);
}

export function sortPostsByDateDesc(posts: PostEntry[]): PostEntry[] {
  return [...posts].sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

export function buildSearchItems(posts: PostEntry[], base: string): SearchItem[] {
  return sortPostsByDateDesc(posts).map((entry) => ({
    title: entry.data.listTitle ?? entry.data.title,
    href: `${base}posts/${entry.id}/`,
    tags: entry.data.tags ?? [],
    excerpt: entry.data.excerpt ?? '',
  }));
}

export function filterPostsByMajorRoute(posts: PostEntry[], route: MajorRoute): PostEntry[] {
  if (route === 'all') return posts;

  const majorCategoryByRoute = {
    articles: 'Articles',
    books: 'Books',
    'shows-and-movies': 'Shows and Movies',
  } as const;

  return posts.filter((post) => post.data.majorCategory === majorCategoryByRoute[route]);
}
