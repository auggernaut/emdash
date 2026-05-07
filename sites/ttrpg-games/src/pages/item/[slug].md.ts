import type { APIRoute } from "astro";
import { getEmDashEntry, getEntryTerms } from "emdash";

import { buildGameAgentProfile } from "../../lib/game-profile.js";
import { compactMarkdown, listSection, section } from "../../lib/markdown-content.js";
import { createMarkdownResponse, htmlToMarkdown, markdownList } from "../../lib/markdown.js";
import { isGameEntry } from "../../lib/types.js";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
	const slug = params.slug;
	if (!slug) return createMarkdownResponse("# Game Not Found\n", { status: 404 });

	const { entry } = await getEmDashEntry("games", slug);
	if (!isGameEntry(entry)) return createMarkdownResponse("# Game Not Found\n", { status: 404 });
	const game = entry;

	const [genres, systems, mechanics, themes, decisionTags] = await Promise.all([
		getEntryTerms("games", game.data.id, "genre"),
		getEntryTerms("games", game.data.id, "system"),
		getEntryTerms("games", game.data.id, "mechanic"),
		getEntryTerms("games", game.data.id, "theme"),
		getEntryTerms("games", game.data.id, "decision_tag"),
	]);
	const profile = buildGameAgentProfile({
		slug,
		game,
		facets: { genres, systems, mechanics, themes, decisionTags },
		origin: url.origin,
	});
	const facts = [
		profile.constraints.playerRange ? `Players: ${profile.constraints.playerRange}` : null,
		profile.constraints.sessionRange ? `Session length: ${profile.constraints.sessionRange}` : null,
		profile.constraints.prepLevel ? `Prep: ${profile.constraints.prepLevel}` : null,
		profile.constraints.priceModel ? `Price: ${profile.constraints.priceModel}` : null,
	];
	const facets = [
		genres.length > 0 ? `Genres: ${genres.map((term) => term.label).join(", ")}` : null,
		systems.length > 0 ? `Systems: ${systems.map((term) => term.label).join(", ")}` : null,
		mechanics.length > 0 ? `Mechanics: ${mechanics.map((term) => term.label).join(", ")}` : null,
		themes.length > 0 ? `Themes: ${themes.map((term) => term.label).join(", ")}` : null,
		decisionTags.length > 0
			? `Decision tags: ${decisionTags.map((term) => term.label).join(", ")}`
			: null,
	];
	const scores = profile.scores.map((score) => `${score.label}: ${score.value}/5`);
	const links = [
		`Directory page: ${profile.url}`,
		`Agent JSON: ${profile.agentUrl}`,
		profile.links.websiteUrl ? `Publisher or official site: ${profile.links.websiteUrl}` : null,
		profile.links.reviewsUrl ? `Reviews or retailer page: ${profile.links.reviewsUrl}` : null,
	];

	return createMarkdownResponse(
		compactMarkdown([
			`# ${profile.title}`,
			profile.summary.blurb,
			section("At a Glance", profile.summary.atAGlance),
			section("Why It Fits", profile.summary.whyItFits),
			section("Fit Facts", markdownList(facts)),
			section("Facets", markdownList(facets)),
			section("Scores", markdownList(scores)),
			listSection("Best For", profile.recommendations.bestFor),
			listSection("Avoid If", profile.recommendations.avoidIf),
			section("Directory Notes", htmlToMarkdown(game.data.body_html)),
			section("Links", markdownList(links)),
		]),
	);
};
