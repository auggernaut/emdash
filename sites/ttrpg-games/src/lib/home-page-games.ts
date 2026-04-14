import type { GameEntry } from "./types";

function timestampFor(value: Date | string | null | undefined): number {
	if (!value) return 0;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function recentTimestampFor(game: GameEntry): number {
	return Math.max(timestampFor(game.data.createdAt), timestampFor(game.data.publishedAt));
}

export function sortRecentlyAddedGames(games: GameEntry[]): GameEntry[] {
	return games.toSorted((left, right) => {
		const leftTime = recentTimestampFor(left);
		const rightTime = recentTimestampFor(right);
		if (leftTime !== rightTime) return rightTime - leftTime;
		return right.data.id.localeCompare(left.data.id);
	});
}

export function topRatedCardLabelFor(game: GameEntry): string {
	if (game.data.is_top_rated) return "Directory pick";
	return game.data.rank ? `Rank #${game.data.rank}` : "Directory pick";
}
