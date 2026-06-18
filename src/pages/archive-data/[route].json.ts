import type { APIRoute } from 'astro';
import { filterPostsByMajorRoute, getPublishedPosts, type MajorRoute, sortPostsByDateDesc } from '../../utils/posts';

const VALID_ROUTES: MajorRoute[] = ['all', 'articles', 'books', 'shows-and-movies'];

export async function getStaticPaths() {
  return VALID_ROUTES.map((route) => ({ params: { route } }));
}

export const GET: APIRoute = async ({ params }) => {
  const route = (params.route ?? 'all') as MajorRoute;
  if (!VALID_ROUTES.includes(route)) {
    return new Response(JSON.stringify([]), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const base = import.meta.env.BASE_URL;
  const allPosts = sortPostsByDateDesc(await getPublishedPosts());
  const posts = filterPostsByMajorRoute(allPosts, route);
  const payload = posts.map((post) => ({
    title: post.data.listTitle ?? post.data.title,
    href: `${base}posts/${post.id}/`,
    listDate: post.data.listDate,
    wordCount: post.data.wordCount,
    excerpt: post.data.excerpt,
    tags: post.data.tags,
    thumbnail: post.data.thumbnail ?? '',
  }));

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
