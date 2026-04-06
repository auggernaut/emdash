export interface RelatedGame {
	title: string;
	slug: string;
	image_url?: string | null;
	description?: string | null;
}

export interface GameData {
	id: string;
	title: string;
	website_url?: string | null;
	image_url?: string | null;
	reviews_url?: string | null;
	review_summary?: string | null;
	blurb?: string | null;
	at_a_glance?: string | null;
	body_html?: string | null;
	notes?: string | null;
	rank?: number | null;
	is_free?: boolean | null;
	is_top_rated?: boolean | null;
	verified?: boolean | null;
	paid?: boolean | null;
	related?: RelatedGame[] | null;
}

export interface GameEntry {
	id: string;
	data: GameData;
}

export interface CategoryPageData {
	id: string;
	title: string;
	type: string;
	description?: string | null;
	body_html?: string | null;
}

export interface CategoryPageEntry {
	id: string;
	data: CategoryPageData;
}

export interface Badge {
	label: string;
	tone?: "strong" | "success";
}
