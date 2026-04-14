type SeobotPostMetadataLike = {
	isTool?: boolean | null;
	toolId?: string | null;
};

export type SeobotPostMetadata = {
	is_tool: boolean;
	tool_id: string | null;
};

export function getSeobotPostMetadata(article: SeobotPostMetadataLike): SeobotPostMetadata {
	return {
		is_tool: article.isTool === true,
		tool_id:
			article.isTool === true && typeof article.toolId === "string" && article.toolId.length > 0
				? article.toolId
				: null,
	};
}
