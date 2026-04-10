import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	FACET_TAXONOMIES,
	buildCategorySourceIndex,
	buildFacetAssignments,
	buildFacetTerms,
	classifyCategoryTerm,
	deriveGameFields,
	humanizeSlug,
	slugify,
} from "./ttrpg-schema-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const directoryCsvPath = path.join(rootDir, "ttrpg-directory.csv");
const categoriesCsvPath = path.join(rootDir, "ttrpg-categories.csv");
const outputPath = path.join(rootDir, "demos/ttrpg-games/seed/seed.json");
const TRUE_PATTERN = /^true$/i;
const GAME_PROFILE_OVERRIDES = {
	daggerheart: {
		at_a_glance:
			"Heroic fantasy RPG from Darrington Press. 2-5 players plus a GM. Mid-weight rules. Strong campaign support. Collaborative worldbuilding. Official quickstart, PDF, and Roll20/Demiplane support available.",
		min_players: 2,
		max_players: 5,
		gm_required: true,
		gm_role_label: "GM",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "medium",
		one_shot_friendly: false,
		campaign_friendly: true,
		solo_friendly: false,
		beginner_friendly: true,
		complexity_score: 3,
		setup_minutes: 20,
		character_creation_minutes: 30,
		new_gm_friendly: 3,
		improv_burden: "medium",
		structure_level: "balanced",
		combat_focus: 3,
		roleplay_focus: 4,
		tactical_depth: 3,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: true,
		pdf_available: true,
		physical_book_available: true,
		vtt_ready: true,
		content_intensity: "medium",
		best_for: [
			"Groups who want heroic fantasy with strong character arcs",
			"Campaign tables that like collaborative worldbuilding",
			"Players who want narrative play without giving up tactical texture",
		],
		avoid_if: [
			"You want ultra-light rules with almost no subsystem overhead",
			"You want highly rigid combat procedure and strict initiative structure",
			"You need a low-improv GM experience",
		],
		why_it_fits:
			"Daggerheart works best for groups who want emotionally legible fantasy adventure and a campaign engine that keeps characters central to the table's decisions. It is easier to approach than heavy crunchy fantasy games, but it still expects the GM and players to engage actively with the fiction and make judgment calls in play.",
	},
};

function parseCsv(source) {
	const rows = [];
	let row = [];
	let cell = "";
	let inQuotes = false;

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				cell += '"';
				index += 1;
				continue;
			}

			if (char === '"') {
				inQuotes = false;
				continue;
			}

			cell += char;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}

		if (char === ",") {
			row.push(cell);
			cell = "";
			continue;
		}

		if (char === "\n") {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
			continue;
		}

		if (char === "\r") {
			continue;
		}

		cell += char;
	}

	if (cell.length > 0 || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}

	return rows;
}

function rowsToObjects(rows) {
	const [headerRow, ...dataRows] = rows;
	const headers = headerRow.map((cell) => cell.trim());

	return dataRows
		.filter((row) => row.some((cell) => cell.trim() !== ""))
		.map((row) => {
			const record = {};
			headers.forEach((header, index) => {
				if (!header) return;
				record[header] = row[index] ?? "";
			});
			return record;
		});
}

function clean(value) {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function parseBool(value) {
	return TRUE_PATTERN.test(value ?? "");
}

function parseInteger(value) {
	const trimmed = (value ?? "").trim();
	if (!trimmed) return null;
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function htmlFromText(value) {
	const text = clean(value);
	if (!text) return null;
	if (text.includes("<") && text.includes(">")) return text;
	return `<p>${text}</p>`;
}

const directoryRows = rowsToObjects(parseCsv(fs.readFileSync(directoryCsvPath, "utf8")));
const categoryRows = rowsToObjects(parseCsv(fs.readFileSync(categoriesCsvPath, "utf8")));
const categorySourceBySlug = buildCategorySourceIndex(categoryRows);
const taxonomyMetaByName = new Map(FACET_TAXONOMIES.map((taxonomy) => [taxonomy.name, taxonomy]));

const categoryPageEntries = categoryRows
	.filter((row) => clean(row.title) && clean(row.page))
	.map((row) => {
		const title = clean(row.title);
		const slug = clean(row.page) || slugify(title);
		const source = classifyCategoryTerm({
			slug,
			label: title,
			type: clean(row.type) || "",
		});
		const sourceMeta = source ? taxonomyMetaByName.get(source.taxonomy) : null;

		return {
			id: slug,
			slug,
			status: "published",
			data: {
				title,
				type: sourceMeta?.labelSingular || clean(row.type) || "Category",
				description: clean(row.text) || "",
				body_html: htmlFromText(row.fullText || row.text) || "",
				source_taxonomy: source?.taxonomy || null,
				source_term_slug: source?.slug || null,
				game_notes: [],
				faqs: [],
				related_categories: [],
			},
		};
	});

const taxonomyTerms = new Map();

for (const entry of categoryPageEntries) {
	taxonomyTerms.set(entry.slug, { slug: entry.slug, label: entry.data.title });
}

const usedSlugs = new Set();

function ensureUniqueSlug(base) {
	let next = base || "entry";
	let counter = 2;
	while (usedSlugs.has(next)) {
		next = `${base}-${counter}`;
		counter += 1;
	}
	usedSlugs.add(next);
	return next;
}

function categoryTermsForValue(value) {
	return String(value ?? "")
		.split(";")
		.map((part) => clean(part))
		.filter(Boolean)
		.map((label) => {
			const derivedSlug = slugify(label);
			const source = categoryRows.find(
				(row) => clean(row.title)?.toLowerCase() === label.toLowerCase(),
			);
			const slug = clean(source?.page) || derivedSlug;
			if (!taxonomyTerms.has(slug)) {
				taxonomyTerms.set(slug, {
					slug,
					label: source?.title || label,
				});
			}
			return slug;
		});
}

const gameEntries = directoryRows
	.filter((row) => clean(row.title) && clean(row.page) && !parseBool(row.Hide))
	.map((row) => {
		const slug = ensureUniqueSlug(clean(row.page) || slugify(row.title));
		const categorySlugs = categoryTermsForValue(row.Category);
		const categoryLabelBySlug = new Map(
			categorySlugs.map((categorySlug) => [
				categorySlug,
				taxonomyTerms.get(categorySlug)?.label || humanizeSlug(categorySlug),
			]),
		);
		const facetAssignments = buildFacetAssignments(
			categorySlugs,
			categorySourceBySlug,
			categoryLabelBySlug,
		);
		const related = [1, 2, 3]
			.map((index) => {
				const title = clean(row[`related_item_${index}_title`]);
				const relatedSlug = clean(row[`related_item_${index}_page`]);
				if (!title || !relatedSlug) return null;
				return {
					title,
					slug: relatedSlug,
					image_url: clean(row[`related_item_${index}_imgUrl`]),
					description: clean(row[`related_item_${index}_fullText`]),
				};
			})
			.filter(Boolean);
		const bodyHtml = htmlFromText(row.fullText) || "";
		const derivedFields = deriveGameFields({
			categorySlugs,
			bodyHtml,
		});
		const profileOverrides = GAME_PROFILE_OVERRIDES[slug] || {};

		return {
			id: slug,
			slug,
			status: "published",
			data: {
				title: clean(row.title),
				website_url: clean(row.url),
				image_url: clean(row.imgUrl),
				publisher_or_creator: clean(row.publisherOrCreator),
				reviews_url: clean(row.reviewsUrl),
				review_summary: clean(row.reviewSummary) || "",
				blurb: clean(row.text) || "",
				body_html: bodyHtml,
				notes: clean(row.notes),
				submitted_by_visitor: parseBool(row.submittedByVisitor),
				submitter_name: clean(row.submitterName),
				submitter_email: clean(row.submitterEmail),
				submission_notes: clean(row.submissionNotes),
				rank: parseInteger(row.Rank),
				is_free: parseBool(row.isFree),
				is_top_rated: parseBool(row.isTopRated),
				verified: parseBool(row.verified),
				paid: parseBool(row.Paid),
				related,
				...derivedFields,
				...profileOverrides,
			},
			taxonomies: {
				...facetAssignments,
			},
		};
	});

const categoryTerms = [...taxonomyTerms.values()].toSorted((left, right) =>
	left.label.localeCompare(right.label),
);
const facetTermsByTaxonomy = buildFacetTerms(categoryTerms, categorySourceBySlug);
const seedTaxonomies = FACET_TAXONOMIES.map((taxonomy) => {
	const terms = facetTermsByTaxonomy.get(taxonomy.name);

	return {
		name: taxonomy.name,
		label: taxonomy.label,
		labelSingular: taxonomy.labelSingular,
		hierarchical: false,
		collections: ["games"],
		terms: terms ? [...terms.values()].toSorted((left, right) => left.label.localeCompare(right.label)) : [],
	};
}).filter((taxonomy) => taxonomy.terms.length > 0);

const seed = {
	$schema: "https://emdashcms.com/seed.schema.json",
	version: "1",
	meta: {
		name: "TTRPG Games Directory",
		description: "Directory site imported into EmDash from CSV source tabs",
		author: "Codex",
	},
	settings: {
		title: "TTRPG Games Directory",
		tagline: "Find tabletop RPGs by genre, system, style, and mechanics",
	},
	collections: [
		{
			slug: "games",
			label: "Games",
			labelSingular: "Game",
			supports: ["drafts", "revisions", "search", "seo"],
			fields: [
				{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
				{ slug: "website_url", label: "Website URL", type: "string" },
				{ slug: "image_url", label: "Image URL", type: "string" },
				{ slug: "publisher_or_creator", label: "Publisher or Creator", type: "string" },
				{ slug: "reviews_url", label: "Reviews URL", type: "string" },
				{ slug: "review_summary", label: "Review Summary", type: "text", searchable: true },
				{ slug: "blurb", label: "Blurb", type: "text", searchable: true },
				{ slug: "at_a_glance", label: "At-a-Glance", type: "text", searchable: true },
				{ slug: "body_html", label: "Body HTML", type: "text", searchable: true },
				{ slug: "notes", label: "Notes", type: "text" },
				{ slug: "submitted_by_visitor", label: "Submitted by Visitor", type: "boolean" },
				{ slug: "submitter_name", label: "Submitter Name", type: "string" },
				{ slug: "submitter_email", label: "Submitter Email", type: "string" },
				{ slug: "submission_notes", label: "Submission Notes", type: "text" },
				{ slug: "rank", label: "Rank", type: "integer" },
				{ slug: "is_free", label: "Free", type: "boolean" },
				{ slug: "is_top_rated", label: "Top Rated", type: "boolean" },
				{ slug: "verified", label: "Verified", type: "boolean" },
				{ slug: "paid", label: "Paid", type: "boolean" },
				{ slug: "min_players", label: "Minimum Players", type: "integer" },
				{ slug: "max_players", label: "Maximum Players", type: "integer" },
				{ slug: "gm_required", label: "GM Required", type: "boolean" },
				{ slug: "gm_role_label", label: "GM Role Label", type: "string" },
				{
					slug: "session_length_minutes_min",
					label: "Minimum Session Length (Minutes)",
					type: "integer",
				},
				{
					slug: "session_length_minutes_max",
					label: "Maximum Session Length (Minutes)",
					type: "integer",
				},
				{
					slug: "prep_level",
					label: "Prep Level",
					type: "select",
					validation: { options: ["none", "low", "medium", "high"] },
				},
				{ slug: "complexity_score", label: "Complexity Score", type: "integer" },
				{ slug: "setup_minutes", label: "Setup Minutes", type: "integer" },
				{
					slug: "character_creation_minutes",
					label: "Character Creation Minutes",
					type: "integer",
				},
				{ slug: "new_gm_friendly", label: "New GM Friendly Score", type: "integer" },
				{
					slug: "improv_burden",
					label: "Improv Burden",
					type: "select",
					validation: { options: ["none", "low", "medium", "high"] },
				},
				{
					slug: "structure_level",
					label: "Structure Level",
					type: "select",
					validation: { options: ["guided", "balanced", "open"] },
				},
				{ slug: "combat_focus", label: "Combat Focus", type: "integer" },
				{ slug: "roleplay_focus", label: "Roleplay Focus", type: "integer" },
				{ slug: "tactical_depth", label: "Tactical Depth", type: "integer" },
				{ slug: "campaign_depth", label: "Campaign Depth", type: "integer" },
				{
					slug: "price_model",
					label: "Price Model",
					type: "select",
					validation: { options: ["free", "paid", "pwyw"] },
				},
				{ slug: "quickstart_available", label: "Quickstart Available", type: "boolean" },
				{ slug: "pdf_available", label: "PDF Available", type: "boolean" },
				{ slug: "physical_book_available", label: "Physical Book Available", type: "boolean" },
				{ slug: "vtt_ready", label: "VTT Ready", type: "boolean" },
				{
					slug: "content_intensity",
					label: "Content Intensity",
					type: "select",
					validation: { options: ["low", "medium", "high"] },
				},
				{ slug: "one_shot_friendly", label: "One-Shot Friendly", type: "boolean" },
				{ slug: "campaign_friendly", label: "Campaign Friendly", type: "boolean" },
				{ slug: "solo_friendly", label: "Solo Friendly", type: "boolean" },
				{ slug: "beginner_friendly", label: "Beginner Friendly", type: "boolean" },
				{ slug: "best_for", label: "Best For", type: "json" },
				{ slug: "avoid_if", label: "Avoid If", type: "json" },
				{ slug: "why_it_fits", label: "Why It Fits", type: "text" },
				{
					slug: "related",
					label: "Related Games",
					type: "json",
					widget: "ttrpg-related:editor",
				},
			],
		},
		{
			slug: "category_pages",
			label: "Category Pages",
			labelSingular: "Category Page",
			supports: ["drafts", "revisions", "search", "seo"],
			fields: [
				{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
				{ slug: "type", label: "Type", type: "string", searchable: true },
				{ slug: "description", label: "Description", type: "text", searchable: true },
				{ slug: "body_html", label: "Body HTML", type: "text", searchable: true },
				{
					slug: "source_taxonomy",
					label: "Source Taxonomy",
					type: "select",
					validation: { options: FACET_TAXONOMIES.map((taxonomy) => taxonomy.name) },
				},
				{ slug: "source_term_slug", label: "Source Term Slug", type: "string" },
				{
					slug: "game_notes",
					label: "Game Notes",
					type: "json",
					widget: "category-page:gameNotes",
				},
				{ slug: "faqs", label: "FAQs", type: "json", widget: "category-page:faqEditor" },
				{
					slug: "related_categories",
					label: "Related Categories",
					type: "json",
					widget: "category-page:relatedCategories",
				},
			],
		},
	],
	taxonomies: seedTaxonomies,
	menus: [
		{
			name: "primary",
			label: "Primary Navigation",
			items: [
				{ type: "custom", label: "Home", url: "/" },
				{ type: "custom", label: "Categories", url: "/categories" },
			],
		},
	],
	widgetAreas: [],
	content: {
		games: gameEntries,
		category_pages: categoryPageEntries,
	},
};

fs.writeFileSync(outputPath, `${JSON.stringify(seed, null, "\t")}\n`);
console.log(
	`Generated ${gameEntries.length} games, ${categoryPageEntries.length} category pages, ${categoryTerms.length} routed term sources, and ${FACET_TAXONOMIES.length} additive facet taxonomies.`,
);
