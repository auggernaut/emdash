import { describe, expect, it } from "vitest";

import {
	buildGameSubmissionNotificationEmail,
	getGameSubmissionNotificationSource,
} from "./game-submission-notifications";

describe("game submission notifications", () => {
	it("builds a submission email with the key submission details", () => {
		const email = buildGameSubmissionNotificationEmail("augustin@example.com", {
			title: "Cairn",
			description: "A lightweight fantasy adventure game.",
			submitterName: "Jane Doe",
			submitterEmail: "jane@example.com",
			adminEditUrl: "https://ttrpg.games/_emdash/admin/content/games/01TEST",
			websiteUrl: "https://example.com/cairn",
			imageUrl: "https://example.com/cairn.webp",
			publisherOrCreator: "Yochai Gal",
			submissionNotes: "Worth featuring on the homepage.",
		});

		expect(email).toMatchObject({
			to: "augustin@example.com",
			subject: "New game submission: Cairn",
		});
		expect(email.text).toContain('A visitor submitted "Cairn".');
		expect(email.text).toContain("Submitter: Jane Doe <jane@example.com>");
		expect(email.text).toContain("Publisher or creator: Yochai Gal");
		expect(email.text).toContain("Website: https://example.com/cairn");
		expect(email.text).toContain("Image: https://example.com/cairn.webp");
		expect(email.text).toContain("Open in admin: https://ttrpg.games/_emdash/admin/content/games/01TEST");
		expect(email.html).toContain(">Open in admin<");
	});

	it("sanitizes line breaks in the email subject", () => {
		const email = buildGameSubmissionNotificationEmail("augustin@example.com", {
			title: "Bad\r\nTitle",
			description: "Description",
			submitterName: "Jane Doe",
			submitterEmail: "jane@example.com",
			adminEditUrl: "https://ttrpg.games/_emdash/admin/content/games/01TEST",
		});

		expect(email.subject).toBe("New game submission: Bad  Title");
	});

	it("uses the expected email pipeline source", () => {
		expect(getGameSubmissionNotificationSource()).toBe("ttrpg-game-submissions");
	});
});
