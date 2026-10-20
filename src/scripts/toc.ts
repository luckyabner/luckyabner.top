function slugifyHeading(value: string) {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, "-")
			.replace(/^-+|-+$/g, "") || "section"
	);
}

function buildTableOfContents() {
	const toc = document.querySelector<HTMLDetailsElement>("[data-toc]");
	const list = toc?.querySelector<HTMLOListElement>("[data-toc-list]");
	const prose = document.querySelector<HTMLElement>(".blog-prose");

	if (!toc || !list || !prose) {
		return;
	}

	const headings = [
		...prose.querySelectorAll<HTMLElement>("h2, h3"),
	].filter((heading) => heading.textContent?.trim());

	list.replaceChildren();

	if (headings.length < 3) {
		toc.hidden = true;
		return;
	}

	for (const heading of headings) {
		const id = heading.id || slugifyHeading(heading.textContent ?? "");

		if (!heading.id) {
			heading.id = id;
		}

		const item = document.createElement("li");
		item.className =
			heading.tagName === "H3" ? "post-toc-level-3" : "post-toc-level-2";

		const link = document.createElement("a");
		link.href = `#${id}`;
		link.textContent = heading.textContent;
		item.append(link);
		list.append(item);
	}

	toc.hidden = false;
}

buildTableOfContents();
document.addEventListener("astro:page-load", buildTableOfContents);
