const NOTIFICATION_SUBJECT_PREFIX = "New game submission";
const NOTIFICATION_SOURCE = "ttrpg-game-submissions";
const CRLF_RE = /[\r\n]/g;

interface NotificationEmailMessage {
	to: string;
	subject: string;
	text: string;
	html?: string;
}

export interface GameSubmissionNotificationData {
	title: string;
	description: string;
	submitterName: string;
	submitterEmail: string;
	adminEditUrl: string;
	websiteUrl?: string | null;
	imageUrl?: string | null;
	publisherOrCreator?: string | null;
	submissionNotes?: string | null;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function getGameSubmissionNotificationRecipient(): string | null {
	const recipient =
		import.meta.env.EMDASH_GAME_SUBMISSION_NOTIFICATION_EMAIL ||
		import.meta.env.GAME_SUBMISSION_NOTIFICATION_EMAIL ||
		"";

	const trimmed = recipient.trim();
	return trimmed ? trimmed : null;
}

export function getGameSubmissionNotificationSource(): string {
	return NOTIFICATION_SOURCE;
}

export function buildGameSubmissionNotificationEmail(
	to: string,
	data: GameSubmissionNotificationData,
): NotificationEmailMessage {
	const subject = `${NOTIFICATION_SUBJECT_PREFIX}: ${data.title}`.replace(CRLF_RE, " ");

	const text = [
		`A visitor submitted "${data.title}".`,
		"",
		`Submitter: ${data.submitterName} <${data.submitterEmail}>`,
		data.publisherOrCreator ? `Publisher or creator: ${data.publisherOrCreator}` : null,
		data.websiteUrl ? `Website: ${data.websiteUrl}` : null,
		data.imageUrl ? `Image: ${data.imageUrl}` : null,
		"",
		"Description:",
		data.description,
		data.submissionNotes ? "" : null,
		data.submissionNotes ? "Submission notes:" : null,
		data.submissionNotes || null,
		"",
		`Open in admin: ${data.adminEditUrl}`,
	]
		.filter((value): value is string => Boolean(value))
		.join("\n");

	const html = [
		`<p>A visitor submitted <strong>${escapeHtml(data.title)}</strong>.</p>`,
		`<p><strong>Submitter:</strong> ${escapeHtml(data.submitterName)} &lt;${escapeHtml(data.submitterEmail)}&gt;</p>`,
		data.publisherOrCreator
			? `<p><strong>Publisher or creator:</strong> ${escapeHtml(data.publisherOrCreator)}</p>`
			: null,
		data.websiteUrl
			? `<p><strong>Website:</strong> <a href="${escapeHtml(data.websiteUrl)}">${escapeHtml(data.websiteUrl)}</a></p>`
			: null,
		data.imageUrl
			? `<p><strong>Image:</strong> <a href="${escapeHtml(data.imageUrl)}">${escapeHtml(data.imageUrl)}</a></p>`
			: null,
		`<h2 style="font-size:16px;margin:24px 0 12px">Description</h2>`,
		`<p>${escapeHtml(data.description).replaceAll("\n", "<br>")}</p>`,
		data.submissionNotes
			? `<h2 style="font-size:16px;margin:24px 0 12px">Submission notes</h2>`
			: null,
		data.submissionNotes
			? `<p>${escapeHtml(data.submissionNotes).replaceAll("\n", "<br>")}</p>`
			: null,
		`<p style="margin-top:24px"><a href="${escapeHtml(data.adminEditUrl)}">Open in admin</a></p>`,
	]
		.filter((value): value is string => Boolean(value))
		.join("\n");

	return { to, subject, text, html };
}
