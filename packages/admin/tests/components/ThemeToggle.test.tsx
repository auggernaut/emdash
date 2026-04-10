import * as React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "vitest-browser-react";

import { ThemeProvider } from "../../src/components/ThemeProvider";
import { ThemeToggle } from "../../src/components/ThemeToggle";

function TestThemeToggle({ defaultTheme }: { defaultTheme?: "system" | "light" | "dark" }) {
	return (
		<ThemeProvider defaultTheme={defaultTheme}>
			<ThemeToggle />
		</ThemeProvider>
	);
}

describe("ThemeToggle", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
		document.documentElement.removeAttribute("data-mode");
	});

	it("renders with light theme by default", async () => {
		const screen = await render(<TestThemeToggle />);
		const button = screen.getByRole("button");
		await expect.element(button).toBeInTheDocument();
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Light"));
	});

	it("treats a stored system preference as light by default", async () => {
		localStorage.setItem("emdash-theme", "system");
		window.matchMedia = ((query: string) =>
			({
				matches: query === "(prefers-color-scheme: dark)",
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => false,
			}) as MediaQueryList) as typeof window.matchMedia;

		const screen = await render(<TestThemeToggle />);
		const button = screen.getByRole("button");
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Light"));
		expect(document.documentElement.getAttribute("data-mode")).toBe("light");
	});

	it("cycles from light to dark on click", async () => {
		const screen = await render(<TestThemeToggle />);
		const button = screen.getByRole("button");
		await button.click();
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Dark"));
	});

	it("cycles through light -> dark -> system -> light", async () => {
		const screen = await render(<TestThemeToggle />);
		const button = screen.getByRole("button");

		// Start: light
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Light"));

		// Click 1: dark
		await button.click();
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Dark"));

		// Click 2: system
		await button.click();
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("System"));

		// Click 3: back to light
		await button.click();
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Light"));
	});

	it("persists theme to localStorage", async () => {
		const screen = await render(<TestThemeToggle />);
		const button = screen.getByRole("button");
		await button.click(); // light -> dark
		expect(localStorage.getItem("emdash-theme")).toBe("dark");
	});

	it("starts with light theme when defaultTheme is light", async () => {
		const screen = await render(<TestThemeToggle defaultTheme="light" />);
		const button = screen.getByRole("button");
		await expect.element(button).toHaveAttribute("title", expect.stringContaining("Light"));
	});
});
