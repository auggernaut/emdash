type PostRouteDataLike = {
	is_tool?: boolean | number | null;
};

type PostRouteEntryLike = {
	id: string;
	data?: PostRouteDataLike | null;
};

export function isToolPost(
	value: PostRouteEntryLike | PostRouteDataLike | null | undefined,
): boolean {
	if (!value || typeof value !== "object") return false;
	if ("data" in value) {
		return value.data?.is_tool === true || value.data?.is_tool === 1;
	}
	if ("is_tool" in value) {
		return value.is_tool === true || value.is_tool === 1;
	}
	return false;
}

export function getPostPath(slugOrPost: string | PostRouteEntryLike, isTool = false): string {
	if (typeof slugOrPost === "string") {
		return isTool
			? `/tools/${encodeURIComponent(slugOrPost)}`
			: `/blog/${encodeURIComponent(slugOrPost)}`;
	}

	return getPostPath(slugOrPost.id, isToolPost(slugOrPost));
}

export function getPostIndexPath(
	postOrIsTool: PostRouteEntryLike | PostRouteDataLike | boolean,
): string {
	if (typeof postOrIsTool === "boolean") {
		return postOrIsTool ? "/tools" : "/blog";
	}

	return isToolPost(postOrIsTool) ? "/tools" : "/blog";
}
