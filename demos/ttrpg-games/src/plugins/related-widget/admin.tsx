interface FieldWidgetProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label: string;
	id: string;
	required?: boolean;
	minimal?: boolean;
	collection?: string;
	fieldName?: string;
	entry?: { id: string; slug: string | null; data?: Record<string, unknown> } | null;
}

interface RelatedGame {
	title: string;
	slug: string;
	image_url?: string;
	description?: string;
}

function normalizeRelatedGames(value: unknown): RelatedGame[] {
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

	if (!Array.isArray(parsed)) return [];

	return parsed
		.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
		.map((item) => ({
			title: typeof item.title === "string" ? item.title : "",
			slug: typeof item.slug === "string" ? item.slug : "",
			image_url: typeof item.image_url === "string" ? item.image_url : "",
			description: typeof item.description === "string" ? item.description : "",
		}));
}

function RelatedGamesEditor({ value, onChange, label, id, required, minimal }: FieldWidgetProps) {
	const items = normalizeRelatedGames(value);

	const updateItems = (next: RelatedGame[]) => {
		onChange(next);
	};

	const updateItem = (index: number, patch: Partial<RelatedGame>) => {
		updateItems(
			items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
		);
	};

	const removeItem = (index: number) => {
		updateItems(items.filter((_, itemIndex) => itemIndex !== index));
	};

	const addItem = () => {
		updateItems([
			...items,
			{
				title: "",
				slug: "",
				image_url: "",
				description: "",
			},
		]);
	};

	return (
		<div data-testid="related-games-widget" className="grid gap-3">
			{!minimal && (
				<label htmlFor={id} className="text-sm font-medium leading-none">
					{label}
					{required && <span className="ml-0.5 text-destructive">*</span>}
				</label>
			)}

			<div className="rounded-xl border border-dashed border-kumo-line bg-kumo-base p-3 text-sm text-kumo-subtle">
				Edit the related game cards shown on the item detail page. Description accepts HTML.
			</div>

			{items.length === 0 ? (
				<div className="rounded-xl border border-kumo-line bg-kumo-base p-4 text-sm text-kumo-subtle">
					No related games added yet.
				</div>
			) : (
				items.map((item, index) => (
					<div
						key={`${item.slug || "related"}-${index}`}
						className="grid gap-3 rounded-2xl border border-kumo-line bg-kumo-base p-4"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="text-sm font-medium">Related game {index + 1}</div>
							<button
								type="button"
								onClick={() => removeItem(index)}
								className="rounded-md border border-kumo-line px-2 py-1 text-xs text-kumo-subtle transition-colors hover:bg-kumo-tint"
							>
								Remove
							</button>
						</div>

						<div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
							<div className="overflow-hidden rounded-xl border border-kumo-line bg-kumo-base lg:sticky lg:top-4">
								{item.image_url ? (
									<img
										src={item.image_url}
										alt={item.title || `Related game ${index + 1}`}
										className="max-h-[300px] w-full object-contain"
									/>
								) : (
									<div className="flex min-h-[180px] items-center justify-center p-4 text-center text-sm text-kumo-subtle">
										Image preview will appear here.
									</div>
								)}
							</div>

							<div className="grid gap-3">
								<div className="grid gap-3 md:grid-cols-2">
									<div className="grid gap-1.5">
										<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
											Title
										</label>
										<input
											type="text"
											value={item.title}
											onChange={(event) => updateItem(index, { title: event.target.value })}
											className="h-10 rounded-md border border-kumo-line bg-kumo-base px-3 text-sm"
										/>
									</div>
									<div className="grid gap-1.5">
										<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
											Slug
										</label>
										<input
											type="text"
											value={item.slug}
											onChange={(event) => updateItem(index, { slug: event.target.value })}
											className="h-10 rounded-md border border-kumo-line bg-kumo-base px-3 text-sm"
										/>
									</div>
								</div>

								<div className="grid gap-1.5">
									<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
										Image URL
									</label>
									<input
										type="url"
										value={item.image_url ?? ""}
										onChange={(event) => updateItem(index, { image_url: event.target.value })}
										className="h-10 rounded-md border border-kumo-line bg-kumo-base px-3 text-sm"
									/>
								</div>

								<div className="grid gap-1.5">
									<label className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
										Description HTML
									</label>
									<textarea
										value={item.description ?? ""}
										onChange={(event) => updateItem(index, { description: event.target.value })}
										rows={6}
										className="min-h-28 rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm"
									/>
								</div>
							</div>
						</div>
					</div>
				))
			)}

			<div>
				<button
					type="button"
					onClick={addItem}
					className="rounded-md border border-kumo-line px-3 py-2 text-sm font-medium transition-colors hover:bg-kumo-tint"
				>
					Add related game
				</button>
			</div>
		</div>
	);
}

export const fields = {
	editor: RelatedGamesEditor,
};
