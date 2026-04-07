import * as React from "react";

interface WidgetEntry {
	id: string;
	slug: string | null;
	data?: Record<string, unknown>;
}

interface FieldWidgetProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label: string;
	id: string;
	required?: boolean;
	minimal?: boolean;
	collection?: string;
	fieldName?: string;
	entry?: WidgetEntry | null;
}

interface CategoryGameNote {
	game_slug: string;
	fit_blurb?: string;
	featured?: boolean;
	featured_reason?: string;
	sort_order?: number | null;
}

interface CategoryFaq {
	question: string;
	answer: string;
}

interface RelatedCategoryLink {
	slug: string;
	reason?: string;
}

interface CategoryGameSummary {
	id: string;
	slug: string;
	title: string;
	image_url?: string | null;
	blurb?: string | null;
	rank?: number | null;
}

interface CategoryOption {
	id: string;
	slug: string;
	title: string;
	type?: string | null;
}

function parseJsonValue<T>(value: unknown): T[] {
	const parsed =
		typeof value === "string"
			? (() => {
					try {
						return JSON.parse(value) as unknown;
					} catch {
						return [];
					}
				})()
			: value;

	return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function normalizeGameNotes(value: unknown): CategoryGameNote[] {
	return parseJsonValue<Record<string, unknown>>(value)
		.filter((item) => item && typeof item === "object")
		.map((item) => ({
			game_slug: typeof item.game_slug === "string" ? item.game_slug : "",
			fit_blurb: typeof item.fit_blurb === "string" ? item.fit_blurb : "",
			featured: Boolean(item.featured),
			featured_reason: typeof item.featured_reason === "string" ? item.featured_reason : "",
			sort_order:
				typeof item.sort_order === "number"
					? item.sort_order
					: typeof item.sort_order === "string" && item.sort_order.trim()
						? Number(item.sort_order)
						: null,
		}))
		.filter((item) => item.game_slug);
}

function normalizeFaqs(value: unknown): CategoryFaq[] {
	return parseJsonValue<Record<string, unknown>>(value)
		.filter((item) => item && typeof item === "object")
		.map((item) => ({
			question: typeof item.question === "string" ? item.question : "",
			answer: typeof item.answer === "string" ? item.answer : "",
		}));
}

function normalizeRelatedCategories(value: unknown): RelatedCategoryLink[] {
	return parseJsonValue<Record<string, unknown>>(value)
		.filter((item) => item && typeof item === "object")
		.map((item) => ({
			slug: typeof item.slug === "string" ? item.slug : "",
			reason: typeof item.reason === "string" ? item.reason : "",
		}))
		.filter((item) => item.slug);
}

function sanitizeGameNotes(notes: CategoryGameNote[]): CategoryGameNote[] {
	return notes
		.map((note) => ({
			game_slug: note.game_slug.trim(),
			fit_blurb: note.fit_blurb?.trim() || "",
			featured: Boolean(note.featured),
			featured_reason: note.featured_reason?.trim() || "",
			sort_order:
				typeof note.sort_order === "number" && Number.isFinite(note.sort_order)
					? note.sort_order
					: null,
		}))
		.filter(
			(note) =>
				note.game_slug &&
				(note.fit_blurb || note.featured || note.featured_reason || note.sort_order !== null),
		)
		.sort((left, right) => {
			const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER;
			const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER;
			if (leftOrder !== rightOrder) return leftOrder - rightOrder;
			return left.game_slug.localeCompare(right.game_slug);
		});
}

function sanitizeFaqs(items: CategoryFaq[]): CategoryFaq[] {
	return items
		.map((item) => ({
			question: item.question.trim(),
			answer: item.answer.trim(),
		}))
		.filter((item) => item.question || item.answer);
}

function sanitizeRelatedCategories(items: RelatedCategoryLink[]): RelatedCategoryLink[] {
	return items
		.map((item) => ({
			slug: item.slug.trim(),
			reason: item.reason?.trim() || "",
		}))
		.filter((item) => item.slug);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
	const response = await fetch(url, {
		signal,
		headers: { "X-EmDash-Request": "1" },
	});
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	const body = (await response.json()) as { data?: T } | T;
	if (body && typeof body === "object" && "data" in body) {
		return body.data as T;
	}

	return body as T;
}

function CategoryGameNotesEditor({
	value,
	onChange,
	label,
	id,
	required,
	minimal,
	entry,
}: FieldWidgetProps) {
	const notes = React.useMemo(() => normalizeGameNotes(value), [value]);
	const categorySlug = entry?.slug ?? "";
	const [games, setGames] = React.useState<CategoryGameSummary[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string>("");

	React.useEffect(() => {
		if (!categorySlug) {
			setGames([]);
			return;
		}

		const controller = new AbortController();
		setLoading(true);
		setError("");

		fetchJson<{ items: CategoryGameSummary[] }>(
			`/api/category-games/${encodeURIComponent(categorySlug)}.json`,
			controller.signal,
		)
			.then((result) => setGames(result.items))
			.catch((reason: unknown) => {
				if (controller.signal.aborted) return;
				setError(reason instanceof Error ? reason.message : "Failed to load category games.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [categorySlug]);

	const notesBySlug = React.useMemo(
		() => new Map(notes.map((note) => [note.game_slug, note])),
		[notes],
	);

	const updateNotes = React.useCallback(
		(next: CategoryGameNote[]) => {
			onChange(sanitizeGameNotes(next));
		},
		[onChange],
	);

	const updateNote = React.useCallback(
		(gameSlug: string, patch: Partial<CategoryGameNote>) => {
			const existing = notesBySlug.get(gameSlug) ?? { game_slug: gameSlug };
			const next = notes.filter((note) => note.game_slug !== gameSlug);
			updateNotes([...next, { ...existing, ...patch }]);
		},
		[notes, notesBySlug, updateNotes],
	);

	const clearNote = React.useCallback(
		(gameSlug: string) => {
			updateNotes(notes.filter((note) => note.game_slug !== gameSlug));
		},
		[notes, updateNotes],
	);

	return (
		<div data-testid="category-game-notes-widget" className="grid gap-3">
			{!minimal && (
				<label htmlFor={id} className="text-sm font-medium leading-none">
					{label}
					{required && <span className="ml-0.5 text-destructive">*</span>}
				</label>
			)}

			<div className="rounded-xl border border-dashed border-kumo-border p-3 text-sm text-kumo-subtle">
				Write the category-specific card copy shown on this archive page. Describe each game through
				the lens of this category, and use featured picks to populate the Top Picks section.
			</div>

			{!categorySlug ? (
				<div className="rounded-xl border border-kumo-border bg-kumo-surface p-4 text-sm text-kumo-subtle">
					Save this category page with a slug first, then reload to edit category-specific game
					notes.
				</div>
			) : loading ? (
				<div className="rounded-xl border border-kumo-border bg-kumo-surface p-4 text-sm text-kumo-subtle">
					Loading assigned games...
				</div>
			) : error ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					{error}
				</div>
			) : games.length === 0 ? (
				<div className="rounded-xl border border-kumo-border bg-kumo-surface p-4 text-sm text-kumo-subtle">
					No games are currently assigned to this category.
				</div>
			) : (
				games.map((game, index) => {
					const note = notesBySlug.get(game.slug);
					return (
						<div
							key={game.slug}
							className="grid gap-4 rounded-2xl border border-kumo-border bg-kumo-surface p-4 lg:grid-cols-[180px_minmax(0,1fr)]"
						>
							<div className="overflow-hidden rounded-xl border border-kumo-border bg-white">
								{game.image_url ? (
									<img
										src={game.image_url}
										alt={game.title}
										className="max-h-[300px] w-full object-contain"
									/>
								) : (
									<div className="flex min-h-[180px] items-center justify-center p-4 text-center text-sm text-kumo-subtle">
										No cover image available.
									</div>
								)}
							</div>

							<div className="grid gap-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<div className="text-sm font-medium">{game.title}</div>
										<div className="text-xs uppercase tracking-wide text-kumo-subtle">
											{game.rank ? `Rank #${game.rank}` : `Game ${index + 1}`}
										</div>
									</div>
									<button
										type="button"
										onClick={() => clearNote(game.slug)}
										className="rounded-md border border-kumo-border px-2 py-1 text-xs text-kumo-subtle transition-colors hover:bg-kumo-hover"
									>
										Clear custom copy
									</button>
								</div>

								{game.blurb && (
									<div className="rounded-xl border border-dashed border-kumo-border px-3 py-2 text-sm text-kumo-subtle">
										<strong className="block text-kumo-default">Default blurb</strong>
										<span>{game.blurb}</span>
									</div>
								)}

								<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
									<div className="grid gap-1.5">
										<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
											Category-specific blurb
										</label>
										<textarea
											value={note?.fit_blurb ?? ""}
											onChange={(event) => updateNote(game.slug, { fit_blurb: event.target.value })}
											rows={4}
											className="min-h-24 rounded-md border border-kumo-border bg-transparent px-3 py-2 text-sm"
										/>
									</div>

									<div className="grid gap-3">
										<label className="flex items-center gap-2 rounded-md border border-kumo-border px-3 py-2 text-sm">
											<input
												type="checkbox"
												checked={Boolean(note?.featured)}
												onChange={(event) =>
													updateNote(game.slug, { featured: event.target.checked })
												}
											/>
											<span>Featured pick</span>
										</label>

										<div className="grid gap-1.5">
											<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
												Top pick order
											</label>
											<input
												type="number"
												value={note?.sort_order ?? ""}
												onChange={(event) =>
													updateNote(game.slug, {
														sort_order: event.target.value ? Number(event.target.value) : null,
													})
												}
												className="h-10 rounded-md border border-kumo-border bg-transparent px-3 text-sm"
											/>
										</div>
									</div>
								</div>

								<div className="grid gap-1.5">
									<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
										Top pick reason
									</label>
									<textarea
										value={note?.featured_reason ?? ""}
										onChange={(event) =>
											updateNote(game.slug, { featured_reason: event.target.value })
										}
										rows={2}
										className="min-h-20 rounded-md border border-kumo-border bg-transparent px-3 py-2 text-sm"
									/>
								</div>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
}

function CategoryFaqEditor({ value, onChange, label, id, required, minimal }: FieldWidgetProps) {
	const items = React.useMemo(() => normalizeFaqs(value), [value]);

	const updateItems = (next: CategoryFaq[]) => onChange(sanitizeFaqs(next));
	const updateItem = (index: number, patch: Partial<CategoryFaq>) => {
		updateItems(
			items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
		);
	};

	return (
		<div data-testid="category-faq-widget" className="grid gap-3">
			{!minimal && (
				<label htmlFor={id} className="text-sm font-medium leading-none">
					{label}
					{required && <span className="ml-0.5 text-destructive">*</span>}
				</label>
			)}

			<div className="rounded-xl border border-dashed border-kumo-border p-3 text-sm text-kumo-subtle">
				Add the specific questions searchers actually ask on this category page.
			</div>

			{items.length === 0 ? (
				<div className="rounded-xl border border-kumo-border bg-kumo-surface p-4 text-sm text-kumo-subtle">
					No FAQs added yet.
				</div>
			) : (
				items.map((item, index) => (
					<div
						key={`faq-${index}`}
						className="grid gap-3 rounded-2xl border border-kumo-border bg-kumo-surface p-4"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="text-sm font-medium">FAQ {index + 1}</div>
							<button
								type="button"
								onClick={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}
								className="rounded-md border border-kumo-border px-2 py-1 text-xs text-kumo-subtle transition-colors hover:bg-kumo-hover"
							>
								Remove
							</button>
						</div>

						<div className="grid gap-1.5">
							<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
								Question
							</label>
							<input
								type="text"
								value={item.question}
								onChange={(event) => updateItem(index, { question: event.target.value })}
								className="h-10 rounded-md border border-kumo-border bg-transparent px-3 text-sm"
							/>
						</div>

						<div className="grid gap-1.5">
							<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
								Answer
							</label>
							<textarea
								value={item.answer}
								onChange={(event) => updateItem(index, { answer: event.target.value })}
								rows={4}
								className="min-h-24 rounded-md border border-kumo-border bg-transparent px-3 py-2 text-sm"
							/>
						</div>
					</div>
				))
			)}

			<div>
				<button
					type="button"
					onClick={() => updateItems([...items, { question: "", answer: "" }])}
					className="rounded-md border border-kumo-border px-3 py-2 text-sm font-medium transition-colors hover:bg-kumo-hover"
				>
					Add FAQ
				</button>
			</div>
		</div>
	);
}

function RelatedCategoriesEditor({
	value,
	onChange,
	label,
	id,
	required,
	minimal,
	entry,
}: FieldWidgetProps) {
	const items = React.useMemo(() => normalizeRelatedCategories(value), [value]);
	const [categories, setCategories] = React.useState<CategoryOption[]>([]);

	React.useEffect(() => {
		const controller = new AbortController();
		fetchJson<{ items: Array<{ id: string; slug: string | null; data: Record<string, unknown> }> }>(
			"/_emdash/api/content/category_pages?limit=300",
			controller.signal,
		)
			.then((result) =>
				setCategories(
					result.items
						.filter((item) => item.slug)
						.map((item) => ({
							id: item.id,
							slug: item.slug ?? "",
							title:
								typeof item.data.title === "string" && item.data.title
									? item.data.title
									: (item.slug ?? ""),
							type: typeof item.data.type === "string" ? item.data.type : "",
						}))
						.sort((left, right) => left.title.localeCompare(right.title)),
				),
			)
			.catch(() => setCategories([]));
		return () => controller.abort();
	}, []);

	const currentSlug = entry?.slug ?? "";
	const options = categories.filter((category) => category.slug !== currentSlug);
	const updateItems = (next: RelatedCategoryLink[]) => onChange(sanitizeRelatedCategories(next));
	const updateItem = (index: number, patch: Partial<RelatedCategoryLink>) => {
		updateItems(
			items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
		);
	};

	return (
		<div data-testid="related-categories-widget" className="grid gap-3">
			{!minimal && (
				<label htmlFor={id} className="text-sm font-medium leading-none">
					{label}
					{required && <span className="ml-0.5 text-destructive">*</span>}
				</label>
			)}

			<div className="rounded-xl border border-dashed border-kumo-border p-3 text-sm text-kumo-subtle">
				Add nearby categories that users should browse next from this page.
			</div>

			{items.length === 0 ? (
				<div className="rounded-xl border border-kumo-border bg-kumo-surface p-4 text-sm text-kumo-subtle">
					No related categories added yet.
				</div>
			) : (
				items.map((item, index) => (
					<div
						key={`${item.slug}-${index}`}
						className="grid gap-3 rounded-2xl border border-kumo-border bg-kumo-surface p-4"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="text-sm font-medium">Related category {index + 1}</div>
							<button
								type="button"
								onClick={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}
								className="rounded-md border border-kumo-border px-2 py-1 text-xs text-kumo-subtle transition-colors hover:bg-kumo-hover"
							>
								Remove
							</button>
						</div>

						<div className="grid gap-1.5">
							<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
								Category
							</label>
							<select
								value={item.slug}
								onChange={(event) => updateItem(index, { slug: event.target.value })}
								className="h-10 rounded-md border border-kumo-border bg-transparent px-3 text-sm"
							>
								<option value="">Select a category</option>
								{options.map((option) => (
									<option key={option.id} value={option.slug}>
										{option.title}
										{option.type ? ` (${option.type})` : ""}
									</option>
								))}
							</select>
						</div>

						<div className="grid gap-1.5">
							<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
								Why click this category next?
							</label>
							<textarea
								value={item.reason ?? ""}
								onChange={(event) => updateItem(index, { reason: event.target.value })}
								rows={3}
								className="min-h-20 rounded-md border border-kumo-border bg-transparent px-3 py-2 text-sm"
							/>
						</div>
					</div>
				))
			)}

			<div>
				<button
					type="button"
					onClick={() => updateItems([...items, { slug: "", reason: "" }])}
					className="rounded-md border border-kumo-border px-3 py-2 text-sm font-medium transition-colors hover:bg-kumo-hover"
				>
					Add related category
				</button>
			</div>
		</div>
	);
}

export const fields = {
	gameNotes: CategoryGameNotesEditor,
	faqEditor: CategoryFaqEditor,
	relatedCategories: RelatedCategoriesEditor,
};
