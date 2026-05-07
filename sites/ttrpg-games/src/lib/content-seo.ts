import type { ContentSeo } from "emdash";
import { getDb } from "emdash/runtime";

const SEO_DEFAULTS: ContentSeo = {
	title: null,
	description: null,
	image: null,
	canonical: null,
	noIndex: false,
};

export async function getContentSeo(
	collection: string,
	contentId: string,
): Promise<ContentSeo | null> {
	const db = await getDb();
	const row = await db
		.selectFrom("_emdash_seo")
		.select(["seo_title", "seo_description", "seo_image", "seo_canonical", "seo_no_index"])
		.where("collection", "=", collection)
		.where("content_id", "=", contentId)
		.executeTakeFirst();

	if (!row) return null;

	return {
		...SEO_DEFAULTS,
		title: row.seo_title ?? null,
		description: row.seo_description ?? null,
		image: row.seo_image ?? null,
		canonical: row.seo_canonical ?? null,
		noIndex: row.seo_no_index === 1,
	};
}
