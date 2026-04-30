import astroWorker from "@astrojs/cloudflare/entrypoints/server";
import { createStorage as createR2Storage } from "@emdash-cms/cloudflare/storage/r2";
import { handleContentCreate, handleContentGet } from "emdash";
import { getDb } from "emdash/runtime";

import { syncSeobotPostsIfDue } from "./lib/seobot-sync.js";

export async function runScheduledSeobotSync(): Promise<void> {
	const db = await getDb();
	const storage = createR2Storage({ binding: "MEDIA" });
	const result = await syncSeobotPostsIfDue({
		db,
		storage,
		handleContentCreate: (collection, body) => handleContentCreate(db, collection, body),
		handleContentGet: (collection, id, locale) => handleContentGet(db, collection, id, locale),
	});

	if (result.result?.error) {
		throw new Error(result.result.error);
	}
}

const worker = {
	fetch: astroWorker.fetch,
	scheduled(_controller: ScheduledController, _env: Env, context: ExecutionContext) {
		context.waitUntil(
			runScheduledSeobotSync().catch((error) => {
				console.error("Scheduled SEObot sync failed", error);
				throw error;
			}),
		);
	},
};

export default worker;
