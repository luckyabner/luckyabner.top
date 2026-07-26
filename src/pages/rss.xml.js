import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { getPreferredBlogPost, groupBlogPosts } from '../lib/blog';
const parser = new MarkdownIt();

export async function GET(context) {
	const posts = groupBlogPosts(await getCollection('blog'))
		.map((group) => {
			const post = getPreferredBlogPost(group);
			return post ? { post, slug: group.slug } : null;
		})
		.filter((item) => item !== null)
		.sort((a, b) => b.post.data.date.valueOf() - a.post.data.date.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map(({ post, slug }) => ({
			title: post.data.title,
			link: `/blog/${slug}/`,
			content: sanitizeHtml(parser.render(post.body ?? ''), {
				allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
			}),
			pubDate: post.data.date,
		})),
	});
}
