const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function visit(node, callback) {
	callback(node);

	if (!Array.isArray(node.children)) {
		return;
	}

	for (const child of node.children) {
		visit(child, callback);
	}
}

export function rehypeNormalizeHeadings() {
	return function normalizeHeadings(tree) {
		const levels = [];

		visit(tree, (node) => {
			if (node.type === "element" && HEADING_TAGS.has(node.tagName)) {
				levels.push(Number(node.tagName.slice(1)));
			}
		});

		if (levels.length === 0) {
			return;
		}

		const uniqueLevels = [...new Set(levels)].sort((a, b) => a - b);
		const levelMap = new Map(
			uniqueLevels.map((level, index) => [
				level,
				Math.min(6, 2 + index),
			]),
		);

		visit(tree, (node) => {
			if (!node.type || node.type !== "element") {
				return;
			}

			if (!HEADING_TAGS.has(node.tagName)) {
				return;
			}

			const level = Number(node.tagName.slice(1));
			node.tagName = `h${levelMap.get(level)}`;
		});
	};
}
