function getStoredTheme() {
	let storedTheme: string | null = null;

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

function syncThemeControls() {
	const isDark = document.documentElement.classList.contains("dark");
	const label = isDark ? "Switch to light theme" : "Switch to dark theme";
	const toggle =
		document.querySelector<HTMLButtonElement>("#themeToggle");

	if (toggle) {
		toggle.setAttribute("aria-pressed", String(isDark));
		toggle.setAttribute("aria-label", label);
		toggle.setAttribute("title", label);
	}

	const themeColor = document.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);

	if (themeColor) {
		themeColor.content = isDark ? "#111111" : "#fcfaf8";
	}
}

function applyPagePreferences() {
	document.documentElement.classList.add("js");
	document.documentElement.classList.toggle("dark", getStoredTheme() === "dark");
	syncThemeControls();
}

function setThemeTransitionOrigin() {
	const toggle = document.querySelector<HTMLElement>("#themeToggle");

	if (!toggle) {
		return;
	}

	const rect = toggle.getBoundingClientRect();
	document.documentElement.style.setProperty(
		"--theme-x",
		`${rect.left + rect.width / 2}px`,
	);
	document.documentElement.style.setProperty(
		"--theme-y",
		`${rect.top + rect.height / 2}px`,
	);
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

		syncThemeControls();
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

	setThemeTransitionOrigin();
	element.dataset.themeTransition = "active";
	const transition = document.startViewTransition(applyTheme);

	transition.finished.finally(() => {
		delete element.dataset.themeTransition;
		syncThemeControls();
	});
}

document.addEventListener("click", (event) => {
	const target = event.target;

	if (target instanceof Element && target.closest("#themeToggle")) {
		toggleTheme();
	}
});

document.addEventListener("astro:after-swap", applyPagePreferences);

applyPagePreferences();
