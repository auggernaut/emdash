export interface RelatedGame {
	title: string;
	slug: string;
	image_url?: string | null;
	description?: string | null;
}

export interface CategoryGameNote {
	game_slug: string;
	fit_blurb?: string | null;
	featured?: boolean | null;
	featured_reason?: string | null;
	sort_order?: number | null;
}

export interface CategoryFaq {
	question: string;
	answer: string;
}

export interface RelatedCategoryLink {
	slug: string;
	reason?: string | null;
}

export interface GameData {
	id: string;
	title: string;
	website_url?: string | null;
	image_url?: string | null;
	publisher_or_creator?: string | null;
	reviews_url?: string | null;
	review_summary?: string | null;
	blurb?: string | null;
	at_a_glance?: string | null;
	body_html?: string | null;
	notes?: string | null;
	submitted_by_visitor?: boolean | null;
	submitter_name?: string | null;
	submitter_email?: string | null;
	submission_notes?: string | null;
	rank?: number | null;
	is_free?: boolean | null;
	is_top_rated?: boolean | null;
	verified?: boolean | null;
	paid?: boolean | null;
	min_players?: number | null;
	max_players?: number | null;
	gm_required?: boolean | null;
	gm_role_label?: string | null;
	session_length_minutes_min?: number | null;
	session_length_minutes_max?: number | null;
	prep_level?: "none" | "low" | "medium" | "high" | null;
	complexity_score?: number | null;
	setup_minutes?: number | null;
	character_creation_minutes?: number | null;
	new_gm_friendly?: number | null;
	improv_burden?: "none" | "low" | "medium" | "high" | null;
	structure_level?: "guided" | "balanced" | "open" | null;
	combat_focus?: number | null;
	roleplay_focus?: number | null;
	tactical_depth?: number | null;
	campaign_depth?: number | null;
	price_model?: "free" | "paid" | "pwyw" | null;
	quickstart_available?: boolean | null;
	pdf_available?: boolean | null;
	physical_book_available?: boolean | null;
	vtt_ready?: boolean | null;
	content_intensity?: "low" | "medium" | "high" | null;
	one_shot_friendly?: boolean | null;
	campaign_friendly?: boolean | null;
	solo_friendly?: boolean | null;
	beginner_friendly?: boolean | null;
	best_for?: string[] | null;
	avoid_if?: string[] | null;
	why_it_fits?: string | null;
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
	source_taxonomy?: string | null;
	source_term_slug?: string | null;
	game_notes?: CategoryGameNote[] | null;
	faqs?: CategoryFaq[] | null;
	related_categories?: RelatedCategoryLink[] | null;
}

export interface CategoryPageEntry {
	id: string;
	data: CategoryPageData;
}

export interface Badge {
	label: string;
	tone?: "strong" | "success";
}
