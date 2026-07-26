import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;
export type BlogLanguage = "en" | "zh";

export interface BlogGroup {
  slug: string;
  en?: BlogEntry;
  zh?: BlogEntry;
}

function getEntryLocation(post: BlogEntry) {
  const parts = post.slug.split("/");
  const fileName = parts.at(-1);
  const isLocalized =
    parts.length > 1 && (fileName === "en" || fileName === "zh");

  if (isLocalized) {
    return {
      slug: parts.slice(0, -1).join("/"),
      language: fileName as BlogLanguage,
    };
  }

  return {
    slug: post.slug,
    language: "zh" as const,
  };
}

export function groupBlogPosts(posts: BlogEntry[]) {
  const groups = new Map<string, BlogGroup>();

  for (const post of posts) {
    const { slug, language } = getEntryLocation(post);
    const group = groups.get(slug) ?? { slug };
    group[language] = post;
    groups.set(slug, group);
  }

  return [...groups.values()];
}

export function getPreferredBlogPost(group: BlogGroup) {
  return group.en ?? group.zh;
}
