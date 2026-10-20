import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_ROOT = fileURLToPath(
	new URL("../src/content/blog/", import.meta.url),
);

async function collectMarkdownFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectMarkdownFiles(path)));
		} else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
			files.push(path);
		}
	}

	return files;
}

function looksLikeFileName(value) {
	return (
		value.length === 0 ||
		/\.(png|jpe?g|webp|gif|avif)$/i.test(value) ||
		/^(image|screenshot|screen shot|img)\b/i.test(value)
	);
}

const files = await collectMarkdownFiles(CONTENT_ROOT);
const findings = [];

for (const file of files) {
	const lines = (await readFile(file, "utf8")).split("\n");
	let inCodeBlock = false;

	for (const [index, line] of lines.entries()) {
		if (/^\s*```/.test(line)) {
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			continue;
		}

		const images = line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);

		for (const image of images) {
			const alt = image[1].trim();

			if (!looksLikeFileName(alt)) {
				continue;
			}

			findings.push({
				file: relative(process.cwd(), file),
				line: index + 1,
				alt: alt || "(empty)",
			});
		}
	}
}

for (const finding of findings) {
	console.log(`${finding.file}:${finding.line} - ${finding.alt}`);
}

console.log(
	`\n${findings.length} image${findings.length === 1 ? "" : "s"} need descriptive alt text.`,
);

process.exitCode = findings.length > 0 ? 1 : 0;
