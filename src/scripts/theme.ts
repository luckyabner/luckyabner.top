function getStoredTheme() {
	let storedTheme = null;

	try {
		storedTheme = localStorage.getItem("theme");
	} catch {
		// Fall back to the system preference when storage is unavailable.
	}

	if (storedTheme === "dark" || storedTheme === "light") {
		return storedTheme;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyPagePreferences() {
	document.documentElement.classList.add("js");
	document.documentElement.classList.toggle("dark", getStoredTheme() === "dark");
}

function toggleTheme() {
	const element = document.documentElement;
	const applyTheme = () => {
		element.classList.toggle("dark");

		try {
			localStorage.setItem(
				"theme",
				element.classList.contains("dark") ? "dark" : "light",
			);
		} catch {
			// The visual toggle still works when storage is unavailable.
		}
	};

	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	if (
		prefersReducedMotion ||
		typeof document.startViewTransition !== "function"
	) {
		applyTheme();
		return;
	}

	element.dataset.themeTransition = "active";
	const transition = document.startViewTransition(applyTheme);

	transition.finished.finally(() => {
		delete element.dataset.themeTransition;
	});
}

document.addEventListener("click", (event) => {
	const target = event.target;

	if (target instanceof Element && target.closest("#themeToggle")) {
		toggleTheme();
	}
});

document.addEventListener("astro:after-swap", applyPagePreferences);
