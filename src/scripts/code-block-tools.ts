const COPY_FEEDBACK_DURATION = 1600;

async function copyText(text: string) {
	if (navigator.clipboard?.writeText) {
		const copiedWithClipboard = await navigator.clipboard
			.writeText(text)
			.then(() => true)
			.catch(() => false);

		if (copiedWithClipboard) {
			return;
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.select();

	const copied = document.execCommand("copy");
	textarea.remove();

	if (!copied) {
		throw new Error("Copy command failed");
	}
}

function getButton(event: MouseEvent, selector: string) {
	const target = event.target;
	return target instanceof Element
		? target.closest<HTMLButtonElement>(selector)
		: null;
}

document.addEventListener("click", async (event) => {
	const copyButton = getButton(event, "[data-copy-code]");

	if (copyButton) {
		const shell = copyButton.closest(".code-block-shell");
		const code = shell?.querySelector("code");
		const label = copyButton.querySelector<HTMLElement>("[data-copy-label]");
		const status = copyButton.querySelector<HTMLElement>("[data-copy-status]");

		if (!code || !label || !status) {
			return;
		}

		let feedback = "Copied";

		try {
			await copyText(code.textContent ?? "");
		} catch {
			feedback = "Copy failed";
		}

		label.textContent = feedback;
		status.textContent = feedback;

		window.setTimeout(() => {
			label.textContent = "Copy";
			status.textContent = "";
		}, COPY_FEEDBACK_DURATION);

		return;
	}

	const toggleButton = getButton(event, "[data-toggle-code]");

	if (!toggleButton) {
		return;
	}

	const shell = toggleButton.closest(".code-block-shell");
	const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
	const lineLabel = toggleButton.dataset.lineLabel ?? "code";

	toggleButton.setAttribute("aria-expanded", String(!isExpanded));
	toggleButton.textContent = isExpanded
		? `Show all ${lineLabel}`
		: "Collapse code";
	shell?.classList.toggle("is-collapsed", isExpanded);
});
