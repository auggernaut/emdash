import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const directoryCsvPath = path.join(rootDir, "ttrpg-directory.csv");
const categoriesCsvPath = path.join(rootDir, "ttrpg-categories.csv");
const outputPath = path.join(rootDir, "demos/ttrpg-games/seed/seed.json");

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
	return /^true$/i.test(value ?? "");
}

function parseInteger(value) {
	const trimmed = (value ?? "").trim();
	if (!trimmed) return null;
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value) {
	return String(value ?? "")
		.normalize("NFKD")
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

function htmlFromText(value) {
	const text = clean(value);
	if (!text) return null;
	if (text.includes("<") && text.includes(">")) return text;
	return `<p>${text}</p>`;
}

const directoryRows = rowsToObjects(parseCsv(fs.readFileSync(directoryCsvPath, "utf8")));
const categoryRows = rowsToObjects(parseCsv(fs.readFileSync(categoriesCsvPath, "utf8")));

const categoryByTitle = new Map();

const categoryPageEntries = categoryRows
	.filter((row) => clean(row.title) && clean(row.page))
	.map((row) => {
		const title = clean(row.title);
		const slug = clean(row.page) || slugify(title);
		categoryByTitle.set(title.toLowerCase(), { slug, title });

		return {
			id: slug,
			slug,
			status: "published",
			data: {
				title,
				type: clean(row.type) || "Category",
				description: clean(row.text) || "",
				body_html: htmlFromText(row.fullText || row.text) || "",
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
			const mapped = categoryByTitle.get(label.toLowerCase());
			const slug = mapped?.slug || slugify(label);
			if (!taxonomyTerms.has(slug)) {
				taxonomyTerms.set(slug, {
					slug,
					label: mapped?.title || label,
				});
			}
			return slug;
		});
}

const gameEntries = directoryRows
	.filter((row) => clean(row.title) && clean(row.page) && !parseBool(row.Hide))
	.map((row) => {
		const slug = ensureUniqueSlug(clean(row.page) || slugify(row.title));
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

		return {
			id: slug,
			slug,
			status: "published",
			data: {
				title: clean(row.title),
				website_url: clean(row.url),
				image_url: clean(row.imgUrl),
				reviews_url: clean(row.reviewsUrl),
				review_summary: clean(row.reviewSummary) || "",
				blurb: clean(row.text) || "",
				body_html: htmlFromText(row.fullText) || "",
				notes: clean(row.notes),
				rank: parseInteger(row.Rank),
				is_free: parseBool(row.isFree),
				is_top_rated: parseBool(row.isTopRated),
				verified: parseBool(row.verified),
				paid: parseBool(row.Paid),
				related,
			},
			taxonomies: {
				category: categoryTermsForValue(row.Category),
			},
		};
	});

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
		tagline: "Find tabletop RPGs by genre, style, and mechanics",
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
				{ slug: "reviews_url", label: "Reviews URL", type: "string" },
				{ slug: "review_summary", label: "Review Summary", type: "text", searchable: true },
				{ slug: "blurb", label: "Blurb", type: "text", searchable: true },
				{ slug: "body_html", label: "Body HTML", type: "text", searchable: true },
				{ slug: "notes", label: "Notes", type: "text" },
				{ slug: "rank", label: "Rank", type: "integer" },
				{ slug: "is_free", label: "Free", type: "boolean" },
				{ slug: "is_top_rated", label: "Top Rated", type: "boolean" },
				{ slug: "verified", label: "Verified", type: "boolean" },
				{ slug: "paid", label: "Paid", type: "boolean" },
				{ slug: "related", label: "Related Games", type: "json" },
			],
		},
		{
			slug: "category_pages",
			label: "Category Pages",
			labelSingular: "Category Page",
			supports: ["drafts", "revisions", "search"],
			fields: [
				{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
				{ slug: "type", label: "Type", type: "string", searchable: true },
				{ slug: "description", label: "Description", type: "text", searchable: true },
				{ slug: "body_html", label: "Body HTML", type: "text", searchable: true },
			],
		},
	],
	taxonomies: [
		{
			name: "category",
			label: "Categories",
			labelSingular: "Category",
			hierarchical: false,
			collections: ["games"],
			terms: [...taxonomyTerms.values()].sort((left, right) =>
				left.label.localeCompare(right.label),
			),
		},
	],
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
	`Generated ${gameEntries.length} games, ${categoryPageEntries.length} category pages, and ${taxonomyTerms.size} terms.`,
);
