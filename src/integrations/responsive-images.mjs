import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTHS = [480, 960, 1440];
const SIZES = "(min-width: 48rem) 640px, calc(100vw - 2.5rem)";
const MIN_WIDTH = 800;

async function fileExists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function collectHtmlFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			if (entry.name !== "_astro") {
				files.push(...(await collectHtmlFiles(path)));
			}
			continue;
		}

		if (entry.name.endsWith(".html")) {
			files.push(path);
		}
	}

	return files;
}

async function getSrcset(root, publicPath, cache) {
	if (cache.has(publicPath)) {
		return cache.get(publicPath);
	}

	const absolutePath = join(root, publicPath);

	if (!(await fileExists(absolutePath))) {
		cache.set(publicPath, null);
		return null;
	}

	const metadata = await sharp(absolutePath).metadata();
	const width = metadata.width ?? 0;

	if (!width || width < MIN_WIDTH) {
		cache.set(publicPath, null);
		return null;
	}

	const base = basename(publicPath, extname(publicPath));
	const entries = [];

	for (const targetWidth of WIDTHS) {
		if (targetWidth >= width) {
			continue;
		}

		const variantPath = join(root, "_astro", `${base}-${targetWidth}.webp`);

		if (!(await fileExists(variantPath))) {
			await sharp(absolutePath)
				.resize({ width: targetWidth, withoutEnlargement: true })
				.webp({ quality: 72 })
				.toFile(variantPath);
		}

		entries.push(`/_astro/${base}-${targetWidth}.webp ${targetWidth}w`);
	}

	if (entries.length === 0) {
		cache.set(publicPath, null);
		return null;
	}

	entries.push(`${publicPath} ${width}w`);
	cache.set(publicPath, entries.join(", "));

	return cache.get(publicPath);
}

export default function responsiveImages() {
	return {
		name: "responsive-images",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const htmlFiles = await collectHtmlFiles(root);
				const cache = new Map();
				let updated = 0;

				for (const htmlFile of htmlFiles) {
					let html = await readFile(htmlFile, "utf8");
					let changed = false;
					const images = html.match(/<img\b[^>]*>/g) ?? [];

					for (const tag of images) {
						if (tag.includes("srcset")) {
							continue;
						}

						const src = tag.match(/\bsrc="(\/_astro\/[^"]+\.webp)"/)?.[1];

						if (!src) {
							continue;
						}

						const srcset = await getSrcset(root, src, cache);

						if (!srcset) {
							continue;
						}

						const replacement = tag.replace(
							/\s*\/?>$/,
							` srcset="${srcset}" sizes="${SIZES}">`,
						);
						html = html.replace(tag, replacement);
						changed = true;
						updated += 1;
					}

					if (changed) {
						await writeFile(htmlFile, html);
					}
				}

				logger.info(
					`added srcset to ${updated} image${updated === 1 ? "" : "s"}`,
				);
			},
		},
	};
}
