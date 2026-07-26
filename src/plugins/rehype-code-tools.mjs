const DEFAULT_COLLAPSE_AFTER = 24;

function getTextContent(node) {
	if (node.type === "text") {
		return node.value;
	}

	if (!Array.isArray(node.children)) {
		return "";
	}

	return node.children.map(getTextContent).join("");
}

function text(value) {
	return { type: "text", value };
}

function element(tagName, properties = {}, children = []) {
	return {
		type: "element",
		tagName,
		properties,
		children,
	};
}

export function rehypeCodeTools(options = {}) {
	const collapseAfter = options.collapseAfter ?? DEFAULT_COLLAPSE_AFTER;

	return function transformCodeBlocks(tree) {
		let blockIndex = 0;

		function transformChildren(parent) {
			if (!Array.isArray(parent.children)) {
				return;
			}

			for (let index = 0; index < parent.children.length; index += 1) {
				const node = parent.children[index];
				const code =
					node.type === "element" &&
					node.tagName === "pre" &&
					node.children?.find(
						(child) => child.type === "element" && child.tagName === "code",
					);

				if (!code) {
					transformChildren(node);
					continue;
				}

				blockIndex += 1;

				const source = getTextContent(code).replace(/\n$/, "");
				const lineCount = source ? source.split("\n").length : 0;
				const lineLabel = `${lineCount} ${lineCount === 1 ? "line" : "lines"}`;
				const blockId = `code-block-${blockIndex}`;
				const isCollapsible = lineCount > collapseAfter;
				const shellClasses = ["code-block-shell"];

				if (isCollapsible) {
					shellClasses.push("is-collapsible", "is-collapsed");
				}

				const toolbar = element("div", { className: ["code-block-toolbar"] }, [
					element("span", { className: ["code-line-count"] }, [text(lineLabel)]),
					element(
						"button",
						{
							type: "button",
							className: ["code-copy-button"],
							"data-copy-code": "",
							"aria-label": `Copy code block ${blockIndex}`,
						},
						[
							element("span", { "aria-hidden": "true", "data-copy-label": "" }, [
								text("Copy"),
							]),
							element(
								"span",
								{
									className: ["sr-only"],
									"data-copy-status": "",
									"aria-live": "polite",
								},
								[],
							),
						],
					),
				]);

				const viewport = element(
					"div",
					{
						id: blockId,
						className: ["code-block-viewport"],
					},
					[node],
				);

				const shellChildren = [toolbar, viewport];

				if (isCollapsible) {
					shellChildren.push(
						element(
							"button",
							{
								type: "button",
								className: ["code-toggle-button"],
								"data-toggle-code": "",
								"aria-expanded": "false",
								"aria-controls": blockId,
								"data-line-label": lineLabel,
							},
							[text(`Show all ${lineLabel}`)],
						),
					);
				}

				parent.children[index] = element(
					"div",
					{ className: shellClasses },
					shellChildren,
				);
			}
		}

		transformChildren(tree);
	};
}
