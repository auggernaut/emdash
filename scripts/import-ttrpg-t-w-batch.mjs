import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const rootDir = "/Users/home/Dev/git/emdash";
const databasePath = path.join(rootDir, "demos/ttrpg-games/data.db");
const backupsDir = path.join(rootDir, "demos/ttrpg-games/backups");
const cloudinaryPrefix = "https://res.cloudinary.com/";
const pad2 = (value) => String(value).padStart(2, "0");

function nowStamp() {
	const date = new Date();
	return [
		date.getFullYear(),
		pad2(date.getMonth() + 1),
		pad2(date.getDate()),
		"-",
		pad2(date.getHours()),
		pad2(date.getMinutes()),
		pad2(date.getSeconds()),
	].join("");
}

function sqlString(value) {
	if (value == null) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
}

function runSql(sql) {
	return execFileSync("sqlite3", [databasePath], {
		encoding: "utf8",
		input: sql,
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function runJson(sql) {
	const output = execFileSync("sqlite3", ["-json", databasePath, sql], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
	return output ? JSON.parse(output) : [];
}

function backupDatabase() {
	fs.mkdirSync(backupsDir, { recursive: true });
	const backupPath = path.join(backupsDir, `data-${nowStamp()}-pre-t-w-import.db`);
	fs.copyFileSync(databasePath, backupPath);
	for (const suffix of ["-wal", "-shm"]) {
		const sidecar = `${databasePath}${suffix}`;
		if (fs.existsSync(sidecar)) {
			fs.copyFileSync(sidecar, `${backupPath}${suffix}`);
		}
	}
	return backupPath;
}

function makeId() {
	return crypto.randomUUID().replaceAll("-", "");
}

function isoDateWithOffset(index) {
	const base = new Date();
	base.setSeconds(base.getSeconds() + index);
	return base.toISOString().replace("T", " ").slice(0, 19);
}

function humanizeToken(value) {
	return String(value)
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function deriveAtAGlance(entry) {
	const parts = [];
	const primaryGenre = entry.taxonomies.genre?.[0];
	if (primaryGenre) parts.push(humanizeToken(primaryGenre));

	const playerRange =
		typeof entry.min_players === "number" && typeof entry.max_players === "number"
			? `${entry.min_players}-${entry.max_players} players`
			: typeof entry.min_players === "number"
				? `${entry.min_players}+ players`
				: typeof entry.max_players === "number"
					? `Up to ${entry.max_players} players`
					: null;
	if (playerRange) parts.push(playerRange);

	if (entry.gm_required) {
		parts.push(entry.gm_role_label ? `Needs ${entry.gm_role_label}` : "Needs GM");
	}

	if (typeof entry.complexity_score === "number") {
		parts.push(`${entry.complexity_score}/5 complexity`);
	}

	if (entry.one_shot_friendly && entry.campaign_friendly) {
		parts.push("One-shots or campaigns");
	} else if (entry.one_shot_friendly) {
		parts.push("One-shot friendly");
	} else if (entry.campaign_friendly) {
		parts.push("Campaign friendly");
	}

	if (entry.prep_level) {
		parts.push(`${humanizeToken(entry.prep_level)} prep`);
	}

	return parts.slice(0, 5).join(" • ");
}

const batch = [
	{
		slug: "tales-of-argosa",
		title: "Tales of Argosa",
		publisher_or_creator: "Pickpocket Press",
		website_url: "https://lowfantasygaming.com/",
		image_url: "https://lowfantasygaming.com/",
		reviews_url: "https://lowfantasygaming.com/",
		blurb:
			"Tales of Argosa is a low-fantasy adventure RPG built for dangerous exploration, rough-edged heroism, and sandbox play with old-school pressure and modern usability.",
		review_summary:
			"Tales of Argosa is generally praised for capturing grim, low-fantasy adventure without becoming unusably archaic. The most common reservation is that it sits in a crowded old-school space, so tables already committed to another OSR fantasy engine may not see enough reason to switch.",
		body_html:
			"<p>Tales of Argosa works because it treats low fantasy as an actual play texture rather than a marketing adjective. The game is interested in risk, scarcity, dirty problem-solving, and the feeling that even capable adventurers are still very mortal. That gives it a different emotional weight from heroic fantasy games built around steady escalation and safety.</p><h2>Theme and setting</h2><p>Argosa is built for trouble rather than purity. The world feels older, poorer, and more unstable than default high fantasy, which makes ruin-delving, faction pressure, wilderness movement, and local power struggles carry more weight. The strongest part of the setting is not lore density but mood and utility.</p><h2>How play feels</h2><p>At the table, Tales of Argosa is at its best when the group wants open-ended fantasy problem-solving. Exploration matters, hazards matter, and the game rewards player caution and opportunism more than cinematic assumption. It is strong for tables that want fantasy to feel adventurous without becoming clean or cushioned.</p><h2>What makes it distinct</h2><p>Its clearest distinction is balance of old-school pressure and readability. It wants meaningful danger, but it does not confuse friction with clarity. That makes it easier to recommend than some rougher retro-inspired games that ask the table to tolerate a lot of needless drag in exchange for tone.</p><h2>Where it may not fit</h2><p>Groups who want tactical-fantasy depth on the Pathfinder side, or story-first dramatic framing on the PbtA side, may find it too committed to exploration-driven sandbox assumptions. Its strongest feature is that it knows exactly what kind of fantasy table it serves.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "medium",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 3,
		new_gm_friendly: 3,
		combat_focus: 3,
		roleplay_focus: 2,
		tactical_depth: 2,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Tables that want dangerous low-fantasy adventuring" },
			{ text: "Groups who like sandbox exploration and hard choices" },
			{ text: "Players who prefer grit over polished heroism" },
		],
		avoid_if: [
			{ text: "You want high-powered heroic fantasy" },
			{ text: "You want deeply tactical combat as the main draw" },
			{ text: "You dislike open-ended exploration pressure" },
		],
		why_it_fits:
			"Tales of Argosa fits the directory because it offers low-fantasy sandbox adventure with real pressure, clear old-school priorities, and enough modern usability to stay approachable.",
		taxonomies: {
			genre: ["fantasy", "sword-and-sorcery"],
			system: ["old-school-renaissance-osr"],
			mechanic: ["exploration-driven", "low-magic", "sandbox", "survival"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			fantasy:
				"Belongs in fantasy because its whole structure is built around dangerous adventuring in a grim, human-scaled world.",
			"low-magic":
				"A low-magic fit because the world feels harsher, rarer, and less casually enchanted than mainstream high fantasy games.",
			"sword-and-sorcery":
				"Works as sword-and-sorcery because survival, opportunism, and rough-edged personal danger matter more than polished epic destiny.",
			"old-school-renaissance-osr":
				"Fits OSR play because player judgment, exploration pressure, and risk management do more work than character safety nets.",
			"exploration-driven":
				"Belongs in exploration-driven play because place, travel, and danger are core to the experience rather than optional scenery.",
			sandbox:
				"A strong sandbox choice because the game supports open-ended movement through threats, ruins, and factions.",
			survival:
				"Fits survival play because scarcity and danger shape the tone even when the game is not strictly about post-apocalyptic resource loops.",
			"rules-medium":
				"Sits in rules-medium because it gives enough chassis to support sustained fantasy campaigning without becoming a crunch wall.",
		},
		related: [
			{
				slug: "shadowdark",
				description:
					"Tales of Argosa and ShadowDark both want dangerous fantasy exploration, but ShadowDark is leaner and more immediate while Tales of Argosa is broader and more sandbox-rooted.",
			},
			{
				slug: "dragonbane",
				description:
					"Tales of Argosa and Dragonbane both support perilous fantasy campaigns, but Dragonbane is cleaner and more approachable while Tales of Argosa feels harsher and more low-fantasy.",
			},
			{
				slug: "five-torches-deep",
				description:
					"Tales of Argosa and Five Torches Deep both appeal to players who want danger back in fantasy adventuring, but Five Torches Deep is more overtly 5e-adjacent while Tales of Argosa stands on its own low-fantasy footing.",
			},
		],
	},
	{
		slug: "the-morrow-project",
		title: "The Morrow Project",
		publisher_or_creator: "Tritac Games",
		website_url: "https://tritacgames.com/",
		image_url: "https://tritacgames.com/",
		reviews_url: "https://tritacgames.com/",
		blurb:
			"The Morrow Project is a post-apocalyptic RPG about teams waking into a broken future with missions, military structure, and the burden of rebuilding after collapse.",
		review_summary:
			"The Morrow Project is remembered for commitment to logistics, realism, and a strong campaign premise built around long-term recovery. The usual split is whether that same seriousness feels immersive or dated, since the game's strengths and rough edges both come from how hard it leans into procedural detail.",
		body_html:
			"<p>The Morrow Project remains interesting because it is not mainly a wasteland scavenger game. Its premise is institutional: carefully prepared teams emerge from suspended animation into a devastated future with plans, supplies, training, and a mission that the world may no longer be interested in honoring. That setup gives the game a different kind of post-apocalyptic tension than lone-survivor fiction.</p><h2>Theme and setting</h2><p>The strongest part of the setting is the gap between preparation and reality. Players are not improvising from nothing. They are trying to apply old assumptions, military doctrine, and stored capability to a world that has drifted far away from the plans made for it. That makes the setting feel less purely desperate and more morally and strategically complicated.</p><h2>How play feels</h2><p>At the table, The Morrow Project rewards groups who enjoy procedure, planning, and long-term consequence. Vehicles, supplies, travel, recovery, and chain-of-command questions matter. The game is strongest when the group wants to treat rebuilding and field operations as real tasks rather than abstract background.</p><h2>What makes it distinct</h2><p>Its clearest strength is seriousness of premise. Plenty of post-apocalyptic games focus on atmosphere or gonzo mutation. The Morrow Project focuses on mission continuity, institutional memory, and the practical question of what reconstruction actually costs.</p><h2>Where it may not fit</h2><p>Groups who want loose narrative pacing, rules-light play, or a more stylish and symbolic apocalypse may find it too procedural. The game gets its identity from taking the logistics and structure seriously.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "high",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 4,
		new_gm_friendly: 1,
		combat_focus: 3,
		roleplay_focus: 2,
		tactical_depth: 4,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want serious post-apocalyptic campaigns" },
			{ text: "Tables interested in logistics and mission structure" },
			{ text: "Players who like military and reconstruction themes" },
		],
		avoid_if: [
			{ text: "You want fast low-prep apocalypse play" },
			{ text: "You dislike procedural survival detail" },
			{ text: "You want gonzo weirdness over institutional tension" },
		],
		why_it_fits:
			"The Morrow Project belongs here because it offers a distinct kind of post-apocalyptic campaign play built around mission structure, logistics, and reconstruction rather than simple scavenger survival.",
		taxonomies: {
			genre: ["military", "post-apocalyptic", "science-fiction"],
			mechanic: ["campaign", "resource-management", "survival", "tactical-combat", "team-based"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			"post-apocalyptic":
				"Belongs in post-apocalyptic play because the whole game is about waking into collapse and trying to act meaningfully inside it.",
			"science-fiction":
				"Fits science fiction because cryogenic preparation, institutional planning, and techno-military assumptions shape the premise.",
			military:
				"A military fit because mission structure, equipment, and chain-of-command logic all matter to the play experience.",
			campaign:
				"Works best as a campaign game because the premise pays off through long-term recovery, travel, and evolving missions.",
			"resource-management":
				"Belongs in resource-management play because logistics and supply are real pressures rather than cosmetic details.",
			survival:
				"Fits survival because staying operational in a shattered world is a constant practical challenge.",
			"tactical-combat":
				"A tactical-combat fit because planning and operational choices matter more than purely dramatic resolution.",
			"team-based":
				"Works as team-based play because the core premise assumes coordinated units, not isolated drifters.",
			"rules-medium":
				"Sits on the heavier edge of rules-medium because it expects more planning and procedure than lighter post-apocalyptic alternatives.",
		},
		related: [
			{
				slug: "gamma-world",
				description:
					"The Morrow Project and Gamma World both explore life after collapse, but Gamma World is strange and open-ended while The Morrow Project is disciplined, mission-based, and far more procedural.",
			},
			{
				slug: "mutantyearzero",
				description:
					"The Morrow Project and Mutant: Year Zero both care about rebuilding in ruined worlds, but Mutant: Year Zero is more community-centric and story-forward while The Morrow Project is more operational and logistical.",
			},
			{
				slug: "traveller",
				description:
					"The Morrow Project and Traveller both reward planning, gear awareness, and procedural play, but Traveller is broader and exploratory while The Morrow Project is much more focused on collapse and reconstruction.",
			},
		],
	},
	{
		slug: "the-witcher-trpg",
		title: "The Witcher TRPG",
		publisher_or_creator: "R. Talsorian Games",
		website_url: "https://talsorianstore.com/products/the-witcher-trpg",
		image_url: "https://talsorianstore.com/products/the-witcher-trpg",
		reviews_url: "https://talsorianstore.com/products/the-witcher-trpg",
		blurb:
			"The Witcher TRPG is a dark fantasy game of monsters, suspicion, hard choices, and deadly combat in a world where survival rarely feels clean or heroic.",
		review_summary:
			"The Witcher TRPG is usually praised for setting fidelity, lethal tone, and how well it captures the world's mix of monster hunting and human ugliness. The main friction point is complexity and swinginess: some groups love the danger, while others find the system rougher than the setting deserves.",
		body_html:
			"<p>The Witcher TRPG matters because it understands that the setting is not mainly about stylish monster killing. It is about living in a world where monsters, prejudice, politics, poverty, and survival all push against each other. The game is strongest when the table wants the setting's uglier tensions to be as important as the sword work.</p><h2>Theme and setting</h2><p>The Continent is grim without becoming empty. Violence, social suspicion, and professional monster hunting all matter, but so do class, race, authority, and compromise. That gives the game more moral friction than a lot of fantasy RPGs built around cleaner heroic assumptions.</p><h2>How play feels</h2><p>At the table, the game feels dangerous and specific. Fights can go bad quickly, preparation matters, and the profession system gives characters a strong place in the setting. Sessions get their best texture when the group treats contracts, politics, and survival as interconnected rather than separate tracks.</p><h2>What makes it distinct</h2><p>Its clearest distinction is tone fidelity. The game does not flatten The Witcher into generic dark fantasy. It preserves the sense that the world is full of ugly tradeoffs and that being competent is not the same thing as being safe.</p><h2>Where it may not fit</h2><p>Groups who want breezier fantasy pacing or who dislike lethal and sometimes messy combat procedure may find it more work than they want. The game asks the table to tolerate sharp edges in exchange for tone.</p>",
		min_players: 2,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "medium",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 4,
		new_gm_friendly: 2,
		combat_focus: 4,
		roleplay_focus: 3,
		tactical_depth: 4,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want grim licensed fantasy" },
			{ text: "Tables comfortable with lethal combat and preparation" },
			{ text: "Players who want the setting's politics and prejudice to matter" },
		],
		avoid_if: [
			{ text: "You want light and breezy fantasy action" },
			{ text: "You dislike crunchy or swingy combat" },
			{ text: "You want a generic monster-hunting toolkit rather than The Witcher specifically" },
		],
		why_it_fits:
			"The Witcher TRPG fits the directory because it delivers licensed dark fantasy with strong setting identity, dangerous combat, and the moral grime that makes the property distinct.",
		taxonomies: {
			genre: ["dark-fantasy", "fantasy"],
			mechanic: ["campaign", "tactical-combat", "team-based"],
			decision_tag: ["licensed", "rules-medium"],
		},
		fit_blurbs: {
			"dark-fantasy":
				"Belongs in dark fantasy because violence, compromise, and social ugliness are part of the world's baseline logic.",
			fantasy:
				"A clear fantasy fit because monster hunting, magic, and dangerous travel are central to the whole experience.",
			campaign:
				"Works best as a campaign game because contracts, politics, and character roles gain weight over sustained play.",
			"tactical-combat":
				"Belongs in tactical combat because preparation and positional danger matter more than in looser narrative fantasy games.",
			"team-based":
				"Fits team-based play because mixed professions and overlapping expertise make the world sharper than lone-wolf play alone.",
			licensed:
				"A strong licensed pick because much of its value comes from how directly it leans into The Witcher's setting and tone.",
			"rules-medium":
				"Sits in rules-medium because it has real mechanical appetite without reaching full simulationist sprawl.",
		},
		related: [
			{
				slug: "the-one-ring",
				description:
					"The Witcher TRPG and The One Ring both care about setting-specific fantasy travel and danger, but The Witcher is grimmer and more lethal while The One Ring is steadier and more mythic.",
			},
			{
				slug: "warhammer-fantasy-roleplay",
				description:
					"The Witcher TRPG and Warhammer Fantasy Roleplay both favor grim fantasy over polished heroics, but The Witcher is more monster-contract and license-driven while WFRP is broader and more socially grubby.",
			},
			{
				slug: "dragonbane",
				description:
					"The Witcher TRPG and Dragonbane can both support dangerous fantasy campaigns, but Dragonbane is cleaner and more approachable while The Witcher is more lethal, political, and specifically licensed.",
			},
		],
	},
	{
		slug: "thirsty-sword-lesbians",
		title: "Thirsty Sword Lesbians",
		publisher_or_creator: "Evil Hat Productions",
		website_url: "https://evilhat.com/product/thirsty-sword-lesbians/",
		image_url: "https://evilhat.com/product/thirsty-sword-lesbians/",
		reviews_url: "https://evilhat.com/product/thirsty-sword-lesbians/",
		blurb:
			"Thirsty Sword Lesbians is a romantic adventure RPG about messy feelings, dramatic conflict, and queer swashbuckling where emotional stakes matter as much as the sword fight.",
		review_summary:
			"Thirsty Sword Lesbians is widely praised for tone, inclusivity, and how deliberately it ties emotional vulnerability to action-adventure play. The main split is simple: groups who want feelings and attraction to be foregrounded love it, while tables wanting romance only as optional subtext often bounce off its clarity of purpose.",
		body_html:
			"<p>Thirsty Sword Lesbians works because it refuses to treat romance, desire, and emotional mess as secondary garnish on top of adventure. The game is built around the idea that fights, flirtation, shame, trust, and longing all belong in the same scene. That gives it a much stronger identity than games that try to support romance without actually centering it.</p><h2>Theme and setting</h2><p>The system can support a wide range of adventure-fantasy or genre-mash settings, but the important thing is not lore specificity. It is tone. The game wants swashbuckling, vulnerability, melodrama, and found-connection all active at once. That makes it feel playful and emotionally candid rather than coy.</p><h2>How play feels</h2><p>At the table, the game is at its best when players want to push scenes toward emotional revelation instead of avoiding it. Conflicts are not only about beating opponents. They are about desire, embarrassment, trust, apology, and what intimacy costs. That lets even a flashy duel carry a different kind of consequence.</p><h2>What makes it distinct</h2><p>Its clearest strength is explicitness of agenda. Plenty of games can accidentally support queer romance. Thirsty Sword Lesbians is designed for it from the ground up, which makes it easier to recommend to groups who want that focus and easier to avoid for groups who do not.</p><h2>Where it may not fit</h2><p>Groups uncomfortable with overt emotional play or who want attraction and vulnerability to stay mostly offscreen will likely feel misaligned with the game very quickly. It is better to treat that as clarity than as a flaw.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 2,
		roleplay_focus: 5,
		tactical_depth: 0,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want romance and adventure together" },
			{ text: "Tables comfortable with emotional mess and queer play" },
			{ text: "Players who want swashbuckling with vulnerability" },
		],
		avoid_if: [
			{ text: "You want attraction and romance mostly offscreen" },
			{ text: "You want tactical combat to be the core draw" },
			{ text: "You dislike games with a strong emotional agenda" },
		],
		why_it_fits:
			"Thirsty Sword Lesbians fits the directory because it is one of the clearest modern games for romantic, queer, emotionally foregrounded adventure.",
		taxonomies: {
			genre: ["fantasy", "romance"],
			system: ["powered-by-the-apocalypse-pbta"],
			theme: ["feminist"],
			mechanic: ["narrative-driven", "team-based"],
			decision_tag: ["beginner-friendly", "collaborative", "one-shot-friendly"],
		},
		fit_blurbs: {
			fantasy:
				"Belongs in fantasy because swashbuckling adventure and heightened genre framing are part of its default energy.",
			romance:
				"A strong romance fit because attraction, longing, and emotional entanglement are core play material, not optional seasoning.",
			"powered-by-the-apocalypse-pbta":
				"Fits PbtA because moves are built to create emotional consequence and dramatic escalation instead of tactical procedure.",
			feminist:
				"Belongs in feminist play because identity, agency, desire, and power are handled with deliberate queer and feminist framing.",
			collaborative:
				"Works as collaborative play because the game's best scenes depend on players actively feeding each other's drama.",
			"narrative-driven":
				"A narrative-driven fit because relationships and scene-level emotional consequence do more work than numbers or positioning.",
			"team-based":
				"Fits team-based play because the group dynamic is part of what makes the drama land.",
			"beginner-friendly":
				"A beginner-friendly story game when the group wants clear emotional priorities and light onboarding.",
			"one-shot-friendly":
				"A natural one-shot game because big feelings and sharp relationship turns land well in short arcs.",
		},
		related: [
			{
				slug: "sagas-of-the-icelanders",
				description:
					"Thirsty Sword Lesbians and Sagas of the Icelanders both treat relationships as central play material, but TSL is brighter and more adventurous while Sagas is harsher, more historical, and more constrained.",
			},
			{
				slug: "for-the-queen",
				description:
					"Thirsty Sword Lesbians and For the Queen both care about emotional tension and attraction inside dramatic relationships, but TSL is a full adventure game while For the Queen is more concentrated and intimate.",
			},
			{
				slug: "wanderhome",
				description:
					"Thirsty Sword Lesbians and Wanderhome both foreground connection and tenderness, but TSL is louder, flirtier, and more conflict-forward while Wanderhome is gentler and more restorative.",
			},
		],
	},
	{
		slug: "timewatch-rpg",
		title: "TimeWatch RPG",
		publisher_or_creator: "Pelgrane Press",
		website_url: "https://pelgranepress.com/product/timewatch-rpg/",
		image_url: "https://pelgranepress.com/product/timewatch-rpg/",
		reviews_url: "https://pelgranepress.com/product/timewatch-rpg/",
		blurb:
			"TimeWatch RPG is a time-travel adventure game about protecting the timeline, handling paradoxes, and turning history into a playground for competent agents.",
		review_summary:
			"TimeWatch is typically praised for making time travel playable instead of campaign-breaking, and for turning paradoxes into fun problems rather than disasters. The main split is tonal: some groups want harder, more serious time-travel logic than the game is interested in enforcing.",
		body_html:
			"<p>TimeWatch stands out because it treats time travel as something you can actually run at the table without collapsing under paradox bookkeeping. It is less interested in punishing the group for touching the timeline than in giving them tools to make timeline instability entertaining, dangerous, and playable. That makes it one of the clearest examples of premise-specific design paying off.</p><h2>Theme and setting</h2><p>The setting is broad by necessity: history, alternate events, weird futures, and impossible causality all become usable adventure spaces. What matters most is not a single era but the idea that all eras can become active terrain. That gives the game a uniquely elastic campaign space.</p><h2>How play feels</h2><p>At the table, TimeWatch feels brisk, competent, and mission-oriented. Characters are capable enough that the fun comes from what the timeline is doing around them rather than from basic incompetence. The best sessions feel like a mix of heist, chase, and historical what-if.</p><h2>What makes it distinct</h2><p>Its clearest distinction is how it domesticates paradox. Many time-travel RPGs are easier to admire than to run. TimeWatch turns paradox into a playable resource and source of pressure, which is why it remains so recommendable.</p><h2>Where it may not fit</h2><p>Groups who want somber historical immersion or airtight theoretical causality may find its approach too playful. The game is trying to make time travel dynamic and practical, not solemnly impossible.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 150,
		session_length_minutes_max: 210,
		prep_level: "medium",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 3,
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 3,
		tactical_depth: 1,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want time travel without rules collapse" },
			{ text: "Tables that like competent-agent adventure" },
			{ text: "Campaigns built from historical what-ifs and paradoxes" },
		],
		avoid_if: [
			{ text: "You want hard-simulation paradox logic" },
			{ text: "You want a very serious historical tone throughout" },
			{ text: "You dislike mission-structured play" },
		],
		why_it_fits:
			"TimeWatch fits the directory because it is one of the clearest, most usable time-travel RPGs for tables that want paradoxes to be fun problems instead of unmanageable bookkeeping.",
		taxonomies: {
			genre: ["historical", "science-fiction"],
			theme: ["cinematic"],
			mechanic: ["campaign", "investigation", "team-based"],
			decision_tag: ["rules-medium", "one-shot-friendly"],
		},
		fit_blurbs: {
			historical:
				"Belongs in historical play because real eras and events are part of the playable terrain rather than decorative backdrop.",
			"science-fiction":
				"A science-fiction fit because time travel and causality manipulation are the engine of the whole game.",
			cinematic:
				"Works as cinematic play because the game emphasizes momentum and big timeline set pieces over simulation.",
			campaign:
				"Fits campaign play because timeline missions and recurring paradox consequences build well over time.",
			investigation:
				"Belongs in investigation because figuring out what changed and why is often the central problem of play.",
			"team-based":
				"Fits team-based play because temporal agents work best as coordinated specialists rather than solo drifters.",
			"rules-medium":
				"Sits in rules-medium because it has a real chassis but stays far more practical than the premise might suggest.",
			"one-shot-friendly":
				"A good one-shot candidate because a single historical breach can structure a full, satisfying session.",
		},
		related: [
			{
				slug: "cortex-prime",
				description:
					"TimeWatch and Cortex Prime can both support flashy premise-heavy adventure, but TimeWatch is much more focused and ready-made while Cortex Prime is a toolkit.",
			},
			{
				slug: "numenera",
				description:
					"TimeWatch and Numenera both thrive on weird temporal or historical scale, but Numenera is exploratory and mysterious while TimeWatch is mission-driven and explicitly about timeline repair.",
			},
			{
				slug: "the-morrow-project",
				description:
					"TimeWatch and The Morrow Project both engage with history and altered futures, but TimeWatch is playful and agentic while The Morrow Project is procedural, grounded, and reconstruction-focused.",
			},
		],
	},
	{
		slug: "tricube-tales",
		title: "Tricube Tales",
		publisher_or_creator: "Zadmar Games",
		website_url: "https://keeper.farirpgs.com/resources/zadmar-games/tricube-tales/",
		image_url: "https://keeper.farirpgs.com/resources/zadmar-games/tricube-tales/",
		reviews_url: "https://keeper.farirpgs.com/resources/zadmar-games/tricube-tales/",
		blurb:
			"Tricube Tales is a tiny generic RPG built for one-page play, fast setup, and flexible genre hacking with almost no mechanical overhead.",
		review_summary:
			"Tricube Tales is usually appreciated for flexibility, clarity, and just how much play it gets from a miniature chassis. The common limit is obvious: if a group wants genre simulation or sustained character-build depth, the game's deliberate smallness becomes a hard ceiling.",
		body_html:
			"<p>Tricube Tales matters because it proves a generic RPG can stay tiny without becoming useless. It is not trying to be a universal simulation engine. It is trying to give groups just enough structure to improvise a functional game in almost any genre with very little onboarding. That makes it more practical than many larger so-called universal systems.</p><h2>Theme and setting</h2><p>The game has no default world worth talking about because its point is portability. What matters is how quickly it can pivot into fantasy, action, sci-fi, mystery, or comedy without dragging a giant rules chassis behind it. That gives it real value as a pick-up tool.</p><h2>How play feels</h2><p>At the table, Tricube Tales is light, fast, and highly permissive. It rewards tables that want a compact framework and are willing to supply the rest through scenario premise and table energy. The best sessions feel like focused little genre bursts rather than long technical campaigns.</p><h2>What makes it distinct</h2><p>Its clearest strength is efficiency. Many generic games promise flexibility at the cost of pages and pages of framework. Tricube Tales offers flexibility through refusal to overbuild. That makes it easy to recommend for quick experiments and low-prep side sessions.</p><h2>Where it may not fit</h2><p>Groups who want robust advancement, tactical depth, or setting logic expressed through rules will likely hit its limits quickly. Tricube Tales is a compact tool, not an all-purpose replacement for heavier campaign engines.</p>",
		min_players: 2,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 60,
		session_length_minutes_max: 150,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 0,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 1,
		new_gm_friendly: 5,
		combat_focus: 1,
		roleplay_focus: 2,
		tactical_depth: 0,
		campaign_depth: 1,
		price_model: "free",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Fast genre experiments and side sessions" },
			{ text: "Groups that want a tiny universal chassis" },
			{ text: "Players who value speed over mechanical detail" },
		],
		avoid_if: [
			{ text: "You want deep tactical or campaign play" },
			{ text: "You want genre simulation to live in the rules" },
			{ text: "You dislike highly compact systems" },
		],
		why_it_fits:
			"Tricube Tales fits the directory because it offers an unusually practical tiny universal system for fast one-shots and low-prep genre play.",
		taxonomies: {
			mechanic: ["rules-lite", "streamlined", "universal"],
			decision_tag: ["beginner-friendly", "free", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			universal:
				"Belongs in universal play because the entire point of the game is light multi-genre portability.",
			"rules-lite":
				"A rules-lite fit because the system is tiny by design and does not pretend otherwise.",
			streamlined:
				"Works as streamlined play because setup and explanation are almost frictionless.",
			"beginner-friendly":
				"A beginner-friendly choice because it teaches quickly and asks little of new players mechanically.",
			free: "Fits free games because the system is widely available with almost no barrier to entry.",
			"low-prep":
				"One of the better low-prep picks because it can support a session from a premise and a few notes.",
			"one-shot-friendly":
				"A natural one-shot game because its strengths are speed, portability, and short-form flexibility.",
		},
		related: [
			{
				slug: "roll-for-shoes",
				description:
					"Tricube Tales and Roll for Shoes both thrive on minimalism, but Tricube Tales is more stable and genre-portable while Roll for Shoes is wilder and more emergent.",
			},
			{
				slug: "ghost-lines",
				description:
					"Tricube Tales and Ghost Lines are both compact, but Ghost Lines is narrow and atmospheric while Tricube Tales is generic and toolbox-oriented.",
			},
			{
				slug: "lasers-and-feelings",
				description:
					"Tricube Tales and Lasers & Feelings both prove tiny games can do real work, but Lasers & Feelings is tightly genre-bound while Tricube Tales is deliberately more open.",
			},
		],
	},
	{
		slug: "uprising",
		title: "Uprising: The Dystopian Universe RPG",
		publisher_or_creator: "Evil Hat Productions",
		website_url: "https://evilhat.com/product/uprising/",
		image_url: "https://evilhat.com/product/uprising/",
		reviews_url: "https://evilhat.com/product/uprising/",
		blurb:
			"Uprising is a dystopian RPG about rebellion, community pressure, and resisting systems built to keep people compliant and isolated.",
		review_summary:
			"Uprising is usually praised for political clarity, collaborative resistance play, and a strong social focus distinct from gear-heavy cyberpunk. The common reservation is that players seeking crunchy tactics or apolitical sandboxing may find its agenda too explicit and its mechanics too relationship-forward.",
		body_html:
			"<p>Uprising stands out because it treats resistance as something collective instead of purely individual. The game is not just about surviving a bad system or becoming stylish inside it. It is about how people organize, protect each other, fracture, and decide what they are willing to risk for something larger than themselves. That gives it a different charge from more individualist dystopian games.</p><h2>Theme and setting</h2><p>The setting is dystopian in the useful sense: institutions are suffocating, inequality is baked into everyday life, and politics are never abstract. The world exists to press on community bonds, solidarity, and fear rather than only to frame action scenes.</p><h2>How play feels</h2><p>At the table, Uprising feels social, urgent, and movement-oriented. The strongest sessions are built from small acts of resistance, difficult compromises, and the tension between what a person wants and what a community needs. That gives the game a strong sense of purpose when the table buys in.</p><h2>What makes it distinct</h2><p>Its clearest distinction is that rebellion is the premise, not a possible campaign direction. The game does not have to be bent toward solidarity and resistance. It is already built that way.</p><h2>Where it may not fit</h2><p>Groups who want tactical cyberpunk missions or who prefer politics to stay vague and optional may find Uprising too direct. It gains strength by making its values visible.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 1,
		roleplay_focus: 5,
		tactical_depth: 0,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups interested in collective resistance stories" },
			{ text: "Tables that want politics and community pressure foregrounded" },
			{ text: "Players who prefer narrative over tactical cyberpunk" },
		],
		avoid_if: [
			{ text: "You want crunchy mission tactics" },
			{ text: "You want politics mostly in the background" },
			{ text: "You prefer lone-wolf power fantasy over collective struggle" },
		],
		why_it_fits:
			"Uprising fits the directory because it offers dystopian resistance play with a clear communal and political focus instead of defaulting to style-first cyberpunk individualism.",
		taxonomies: {
			genre: ["cyberpunk", "dystopian"],
			theme: ["political"],
			mechanic: ["narrative-driven", "team-based"],
			decision_tag: ["beginner-friendly", "collaborative", "one-shot-friendly", "rules-medium"],
		},
		fit_blurbs: {
			cyberpunk:
				"Belongs in cyberpunk because systemic control, urban oppression, and resistance to exploitative structures drive the whole game.",
			dystopian:
				"A strong dystopian fit because oppression is infrastructural and visible in everyday life rather than only in plot events.",
			political:
				"Fits political play because collective action and structural critique are central to the game's proposition.",
			collaborative:
				"Belongs in collaborative play because the group is trying to hold together under pressure rather than only pursue personal arcs.",
			"narrative-driven":
				"A narrative-driven fit because social consequence and relationship pressure matter more than tactical detail.",
			"team-based":
				"Works as team-based play because resistance becomes meaningful through coordinated action and mutual dependence.",
			"beginner-friendly":
				"A beginner-friendly story game when the table wants clear political stakes and accessible mechanics.",
			"one-shot-friendly":
				"A solid one-shot candidate for groups who want a sharp burst of rebellion drama.",
			"rules-medium":
				"Sits in rules-medium because it has enough structure to sustain campaigns without becoming crunchy.",
		},
		related: [
			{
				slug: "neurocity",
				description:
					"Uprising and Neurocity both care about people under coercive future systems, but Uprising is more collective and openly resistance-focused while Neurocity is more intimate and compromise-driven.",
			},
			{
				slug: "otherscape",
				description:
					"Uprising and Otherscape both use future pressure to create identity conflict, but Uprising is more political and communal while Otherscape is more mythic and symbolic.",
			},
			{
				slug: "cyberpunk",
				description:
					"Uprising and Cyberpunk 2020 both live in oppressive futures, but Cyberpunk 2020 is more gear-forward and individualist while Uprising is far more concerned with solidarity and resistance.",
			},
		],
	},
	{
		slug: "uncharted-worlds",
		title: "Uncharted Worlds",
		publisher_or_creator: "Sean Gomes",
		website_url: "https://uncharted-worlds.com/",
		image_url: "https://uncharted-worlds.com/",
		reviews_url: "https://uncharted-worlds.com/",
		blurb:
			"Uncharted Worlds is a space-opera PbtA game about crews, ships, jobs, and the trouble that follows people from world to world.",
		review_summary:
			"Uncharted Worlds is generally liked for crew-scale space opera and the freedom it gives groups to create their own corners of the galaxy. The common criticism is that some subsystems feel thinner than the premise wants, so the table often has to carry more of the space-opera heft than the text alone provides.",
		body_html:
			"<p>Uncharted Worlds works because it understands that space opera is rarely about the ship alone. It is about crews, obligations, jobs, shifting loyalties, and the mix of hope and debt that follows people from one star system to another. That gives it a broader emotional range than science-fiction games focused mainly on hard procedure or combat.</p><h2>Theme and setting</h2><p>The game is intentionally open about its exact setting frame, which is a strength if the table wants to build its own galaxy rather than inherit a giant canon. The important part is the genre promise: travel, work, faction pressure, and the way distance and mobility create both freedom and instability.</p><h2>How play feels</h2><p>At the table, Uncharted Worlds is strongest when the crew feels like an ensemble rather than a pile of adjacent protagonists. Jobs, planets, ship life, and faction trouble all work better when relationships inside the crew matter. The game rewards groups who want social and economic pressure to travel with them.</p><h2>What makes it distinct</h2><p>Its clearest strength is scale. It is bigger than a station-crawl or horror ship game, but smaller and more intimate than giant empire play. That makes it a useful fit for groups who want space opera without needing a huge setting bible.</p><h2>Where it may not fit</h2><p>Groups who want dense ship procedures, hard-science rigor, or extremely sharp subsystem support may find it thinner than they hoped. The game delivers best when the table is happy to fill in some of the galaxy together.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 150,
		session_length_minutes_max: 210,
		prep_level: "low",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 1,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want crew-scale space opera" },
			{ text: "Tables that enjoy building a galaxy together" },
			{ text: "Players who want travel, jobs, and relationships in play" },
		],
		avoid_if: [
			{ text: "You want hard-science procedure" },
			{ text: "You want deeply tactical ship systems" },
			{ text: "You want a giant licensed setting already built out" },
		],
		why_it_fits:
			"Uncharted Worlds fits the directory because it offers flexible crew-scale space opera with relationship and job pressure at the center of play.",
		taxonomies: {
			genre: ["interstellar-travel", "science-fiction", "space-opera"],
			system: ["powered-by-the-apocalypse-pbta"],
			mechanic: ["campaign", "narrative-driven", "team-based"],
			decision_tag: ["beginner-friendly", "rules-medium"],
		},
		fit_blurbs: {
			"science-fiction":
				"Belongs in science fiction because travel, tech, and multi-world life define the game's basic assumptions.",
			"space-opera":
				"A strong space-opera fit because the game is built around crews, jobs, and trouble moving across a broad galaxy.",
			"powered-by-the-apocalypse-pbta":
				"Fits PbtA because the system relies on fiction-first momentum and role-driven pressure rather than crunchy subsystems.",
			campaign:
				"Works best as a campaign game because ship life and interstellar obligations gain force over time.",
			"interstellar-travel":
				"Belongs in interstellar travel because movement between worlds is a core part of the play loop.",
			"narrative-driven":
				"A narrative-driven fit because relationships and consequences do more work than tactical detail.",
			"team-based": "Fits team-based play because the crew dynamic is the real heart of the game.",
			"beginner-friendly":
				"A beginner-friendly space-opera option for groups who want PbtA-style momentum without hard-science overhead.",
			"rules-medium":
				"Sits in rules-medium because it has enough structure to sustain play while staying much lighter than procedural sci-fi games.",
		},
		related: [
			{
				slug: "traveller",
				description:
					"Uncharted Worlds and Traveller both care about crews moving through a larger galaxy, but Traveller is more procedural and grounded while Uncharted Worlds is more narrative and relationship-driven.",
			},
			{
				slug: "mothership",
				description:
					"Uncharted Worlds and Mothership both put people in dangerous space, but Mothership is claustrophobic horror while Uncharted Worlds is broader and more ensemble space opera.",
			},
			{
				slug: "otherscape",
				description:
					"Uncharted Worlds and Otherscape both support fiction-first science-fiction play, but Uncharted Worlds is crew-scale space opera while Otherscape is urban and mythically cyberpunk.",
			},
		],
	},
	{
		slug: "undying",
		title: "Undying",
		publisher_or_creator: "Magpie Games",
		website_url: "https://magpiegames.com/products/undying-softcoverpdf",
		image_url: "https://magpiegames.com/products/undying-softcoverpdf",
		reviews_url: "https://magpiegames.com/products/undying-softcoverpdf",
		blurb:
			"Undying is a diceless vampire RPG about hunger, status, and social predation where every concession and promise can become a weapon later.",
		review_summary:
			"Undying is usually praised for making vampire politics feel sharp, personal, and dangerous without leaning on heavy mechanics. The common warning is that its assertive social play can be demanding, especially for groups who want more procedural guardrails around conflict.",
		body_html:
			"<p>Undying stands out because it understands vampire play as a negotiation of appetite, status, and leverage rather than as a pile of supernatural powers. The game is not mainly about fighting monsters. It is about being one in a social ecosystem built from favors, threats, debts, and need. That makes it much sharper than many broader supernatural games.</p><h2>Theme and setting</h2><p>The setting frame is urban, predatory, and intimate. What matters most is not a giant canon but the idea that undead society runs on hierarchy, hunger, and unstable dependence. That gives the game a very direct line into social pressure and manipulation.</p><h2>How play feels</h2><p>At the table, Undying is tense and conversational in a very specific way. Scenes gain force from negotiation, implied threat, and the fact that everyone at the table knows the characters are dangerous even when they are speaking softly. It rewards players who enjoy pushing on each other's leverage.</p><h2>What makes it distinct</h2><p>Its clearest distinction is economy. The rules are light, but the social blade is sharp. It manages to make vampire politics feel dangerous without needing a lot of subsystem scaffolding.</p><h2>Where it may not fit</h2><p>Groups who want dense setting lore, explicit move lists for every conflict, or a gentler style of interpersonal play may find it too exposed. The game asks the players themselves to bring confidence to the table.</p>",
		min_players: 2,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "Facilitator",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 2,
		new_gm_friendly: 2,
		combat_focus: 1,
		roleplay_focus: 5,
		tactical_depth: 0,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "high",
		best_for: [
			{ text: "Groups that want vampire politics and hunger" },
			{ text: "Tables comfortable with assertive social conflict" },
			{ text: "Players who want menace without crunchy combat" },
		],
		avoid_if: [
			{ text: "You want tactical combat to matter" },
			{ text: "You want lots of procedural guardrails around social scenes" },
			{ text: "You dislike intense interpersonal pressure in play" },
		],
		why_it_fits:
			"Undying fits the directory because it delivers one of the sharper, lighter approaches to vampire politics, hunger, and predatory social maneuvering.",
		taxonomies: {
			genre: ["gothic", "horror", "urban-fantasy"],
			theme: ["mature", "social-intrigue"],
			mechanic: ["narrative-driven"],
			decision_tag: ["rules-medium", "one-shot-friendly"],
		},
		fit_blurbs: {
			gothic:
				"Belongs in gothic play because hunger, status, and predatory intimacy are central to the whole experience.",
			horror:
				"A horror fit because the game never lets the table forget these characters are dangerous and hungry.",
			"urban-fantasy":
				"Fits urban fantasy because the social ecosystem of the undead is built into a recognizably modern world.",
			mature:
				"A mature fit because power, desire, manipulation, and appetite are all explicit parts of the game's pressure.",
			"narrative-driven":
				"Belongs in narrative-driven play because the real action is in conversation, consequence, and leverage.",
			"social-intrigue":
				"A strong social-intrigue pick because debt, status, and manipulation are more important than direct force.",
			"rules-medium":
				"Sits in rules-medium because the social machinery is doing real work even if the game is not numerically dense.",
			"one-shot-friendly":
				"A good one-shot choice when the table wants one concentrated spiral of vampire politics and hunger.",
		},
		related: [
			{
				slug: "blood-borg",
				description:
					"Undying and Blood Borg both care about what hunger does to identity, but Undying is colder and more socially predatory while Blood Borg is louder and more punk-chaotic.",
			},
			{
				slug: "thousand-year-old-vampire",
				description:
					"Undying and Thousand Year Old Vampire both explore monstrous longevity and appetite, but Undying is social and confrontational while TYOV is introspective and solitary.",
			},
			{
				slug: "city-of-mist",
				description:
					"Undying and City of Mist both use urban tension and hidden powers, but Undying is specifically about vampire hierarchy and hunger while City of Mist is broader and more mythic-noir.",
			},
		],
	},
	{
		slug: "vaults-of-vaarn",
		title: "Vaults of Vaarn",
		publisher_or_creator: "Vaults of Vaarn",
		website_url: "https://vaultsofvaarn.com/2022/07/04/vaults-of-vaarn-deluxe-edition/",
		image_url: "https://vaultsofvaarn.com/2022/07/04/vaults-of-vaarn-deluxe-edition/",
		reviews_url: "https://vaultsofvaarn.com/2022/07/04/vaults-of-vaarn-deluxe-edition/",
		blurb:
			"Vaults of Vaarn is an NSR science-fantasy RPG of crystalline deserts, ancient vaults, and strange civilizations surviving in the shadow of forgotten technologies.",
		review_summary:
			"Vaults of Vaarn is usually praised for atmosphere, art direction, and how effectively it creates a weird desert science-fantasy identity. The main limitation people note is that its zine-born structure can feel more like a beautiful toolkit and setting collage than a single tightly unified campaign engine.",
		body_html:
			"<p>Vaults of Vaarn stands out because it makes weird science-fantasy feel spacious and tactile. The blue deserts, old vaults, wandering factions, and archaeological strangeness do not feel like random oddity. They feel like a place with its own weather, rhythm, and logic. That gives the game a stronger identity than many post-apocalyptic or science-fantasy blends.</p><h2>Theme and setting</h2><p>Vaarn is about ruins, distance, scarcity, and wonder. The world feels like a place people survive inside rather than a backdrop waiting to be looted. That makes the setting particularly strong for tables who want travel, exploration, and weird discoveries to matter more than planned plot beats.</p><h2>How play feels</h2><p>At the table, the game works best when players want to move through strange environments, meet unsettling factions, and solve problems with curiosity rather than brute force alone. The strongest sessions feel exploratory, dusty, and faintly hallucinatory.</p><h2>What makes it distinct</h2><p>Its clearest distinction is atmosphere. Many science-fantasy games are loud and maximalist. Vaults of Vaarn is weirder in a quieter, more desolate way. That gives it a memorable texture.</p><h2>Where it may not fit</h2><p>Groups who want a single polished all-in-one rulebook or heavy tactical depth may find its zine-toolkit DNA too loose. The game is strongest when the table treats that looseness as room rather than as a gap.</p>",
		min_players: 2,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 2,
		roleplay_focus: 2,
		tactical_depth: 1,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want quiet science-fantasy weirdness" },
			{ text: "Tables interested in desert exploration and ruins" },
			{ text: "Players who like NSR openness with strong atmosphere" },
		],
		avoid_if: [
			{ text: "You want a single highly codified campaign engine" },
			{ text: "You want tactical combat to dominate" },
			{ text: "You dislike sparse or exploratory worldbuilding" },
		],
		why_it_fits:
			"Vaults of Vaarn fits the directory because it offers a distinctive NSR science-fantasy world where exploration, atmosphere, and weird archaeology carry the game.",
		taxonomies: {
			genre: ["post-apocalyptic", "science-fiction"],
			system: ["new-school-revolution"],
			mechanic: ["exploration-driven", "rules-lite", "sandbox"],
			decision_tag: ["beginner-friendly", "one-shot-friendly"],
		},
		fit_blurbs: {
			"post-apocalyptic":
				"Belongs in post-apocalyptic play because the world is built from the remains of older civilizations and their buried technologies.",
			"science-fiction":
				"A science-fiction fit because ancient devices, altered ecologies, and weird remnants shape the world more than conventional fantasy logic.",
			"new-school-revolution":
				"Fits NSR because it values atmosphere, openness, and lightweight procedure over dense mechanical codification.",
			"exploration-driven":
				"Belongs in exploration-driven play because travel, discovery, and environmental mystery are the whole point.",
			"rules-lite":
				"A rules-lite fit because it supports play with very little mechanical overhead.",
			sandbox:
				"Works as a sandbox because the world is designed to be roamed rather than solved in a fixed sequence.",
			"beginner-friendly":
				"A beginner-friendly weird-fantasy pick for groups comfortable with open-ended discovery and light rules.",
			"one-shot-friendly":
				"A strong one-shot option when the table wants a compact expedition into a strange desert world.",
		},
		related: [
			{
				slug: "electric-bastionland",
				description:
					"Vaults of Vaarn and Electric Bastionland both use weird remnants to drive discovery, but Vaarn is more desolate and archaeological while Bastionland is more urban and surreal.",
			},
			{
				slug: "numenera",
				description:
					"Vaults of Vaarn and Numenera both care about ancient technology and strange worlds, but Numenera is broader and grander while Vaarn is leaner, stranger, and more desert-bleached.",
			},
			{
				slug: "troika",
				description:
					"Vaults of Vaarn and Troika! both like weirdness, but Troika! is louder and more chaotic while Vaarn is quieter, lonelier, and more ruin-focused.",
			},
		],
	},
	{
		slug: "villains-and-vigilantes",
		title: "Villains and Vigilantes",
		publisher_or_creator: "Fantasy Games Unlimited",
		website_url: "https://www.fantasygamesunlimited.net/",
		image_url: "https://www.fantasygamesunlimited.net/",
		reviews_url: "https://www.fantasygamesunlimited.net/",
		blurb:
			"Villains and Vigilantes is a classic superhero RPG built around comic-book action, pulpy powers, and old-school campaign play from the hobby's early supers era.",
		review_summary:
			"Villains and Vigilantes is usually respected for historical importance, pulpy charm, and a strong sense of early comic-book adventure. The common reservation is that it feels dated by modern standards, especially for players used to cleaner character-building and more polished superhero procedures.",
		body_html:
			"<p>Villains and Vigilantes matters because it comes from a moment when superhero roleplaying still felt like an experiment. The game does not try to be the last word in balance or contemporary design. Its appeal is that it captures a lively, direct comic-book energy that many later systems either refine away or bury under denser machinery.</p><h2>Theme and setting</h2><p>The strongest part of V&amp;V is not setting canon but genre posture. It wants capes, villains, sudden powers, strange science, and a world where superhero logic is expected rather than exceptional. That gives it a bright, pulpy energy that still carries some appeal.</p><h2>How play feels</h2><p>At the table, the game feels more raw than modern supers systems. That can be a bug or a feature depending on the group. For players who enjoy old-school looseness and comic-book swing, it can feel charmingly direct. For players wanting highly tuned powers engineering, it can feel unstable.</p><h2>What makes it distinct</h2><p>Its clearest distinction is historical texture. V&amp;V is valuable not only because it is early, but because it still feels like an alternate path for superhero play rather than just a prototype for later games.</p><h2>Where it may not fit</h2><p>Groups who want the flexibility of Mutants &amp; Masterminds or the speed of Marvel Heroic will likely find it dated in practice. Its strengths are personality and history more than modern smoothness.</p>",
		min_players: 2,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 150,
		session_length_minutes_max: 210,
		prep_level: "medium",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 3,
		new_gm_friendly: 2,
		combat_focus: 3,
		roleplay_focus: 2,
		tactical_depth: 2,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups interested in classic superhero RPG history" },
			{ text: "Tables that enjoy pulpy comic-book energy" },
			{ text: "Players comfortable with older design roughness" },
		],
		avoid_if: [
			{ text: "You want the smoothest modern supers rules" },
			{ text: "You want deep contemporary power-build design" },
			{ text: "You dislike old-school RPG texture" },
		],
		why_it_fits:
			"Villains and Vigilantes fits the directory because it remains one of the foundational superhero RPGs and still offers a distinct early-comics style of play.",
		taxonomies: {
			genre: ["superheroes"],
			mechanic: ["campaign", "skill-based", "tactical", "team-based"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			superheroes:
				"Belongs in superheroes because the whole game is built around classic comic-book action and villain confrontation.",
			campaign:
				"Works best as a campaign game because old-school supers identities and rivalries gain weight over time.",
			"skill-based":
				"Fits skill-based play because competence is not only about powers; capabilities outside those powers still shape play.",
			tactical:
				"Belongs in tactical play more than purely narrative supers games because fights and capability differences have real structure.",
			"team-based":
				"Fits team-based play because ensemble hero groups are central to the superhero mode it emulates.",
			"rules-medium":
				"Sits in rules-medium because it expects more procedure than story-forward supers games without reaching modern crunch extremes.",
		},
		related: [
			{
				slug: "champions",
				description:
					"Villains and Vigilantes and Champions both come from the older superhero tradition, but V&V is pulpier and looser while Champions is denser and much more build-driven.",
			},
			{
				slug: "mutants-masterminds",
				description:
					"Villains and Vigilantes and Mutants & Masterminds both support long-form supers play, but M&M is far more modern and flexible while V&V carries more early-hobby texture and swing.",
			},
			{
				slug: "marvel-heroic-roleplaying",
				description:
					"Villains and Vigilantes and Marvel Heroic both do comic-book action, but Marvel Heroic is faster and more story-forward while V&V feels older, rougher, and more traditional.",
			},
		],
	},
	{
		slug: "warhammer-40k-rogue-trader",
		title: "Warhammer 40,000 Roleplay: Rogue Trader",
		publisher_or_creator: "Fantasy Flight Games",
		website_url: "https://en.wikipedia.org/wiki/Rogue_Trader_(role-playing_game)",
		image_url: "https://en.wikipedia.org/wiki/Rogue_Trader_(role-playing_game)",
		reviews_url: "https://en.wikipedia.org/wiki/Rogue_Trader_(role-playing_game)",
		blurb:
			"Rogue Trader is a Warhammer 40k RPG about command, voidships, profit, imperial politics, and carrying the authority to make things worse on a galactic scale.",
		review_summary:
			"Rogue Trader is usually praised for scope, starship command, and how well it captures the arrogant grandeur of 40k at the edge of imperial authority. The common warning is mechanical bulk: the game is ambitious, flavorful, and often clunky in exactly the way older licensed systems tend to be.",
		body_html:
			"<p>Rogue Trader matters because it offers a very different 40k fantasy from the line's more ground-level military or horror-focused games. Here the table is not mainly trying to survive with no leverage. The characters have authority, resources, and a ship big enough to drag an entire campaign behind it. That changes the scale of every decision.</p><h2>Theme and setting</h2><p>The setting frame is one of power mixed with rot. Imperial authority, exploration, commerce, zealotry, and void travel all sit together in the classic 40k way: grand, corrupt, brutal, and full of ruin disguised as ambition. The game works best when that scale feels both intoxicating and dangerous.</p><h2>How play feels</h2><p>At the table, Rogue Trader is broad and campaign-heavy. Ships, crews, warrants, profit, and planetary or faction problems all matter. It rewards groups who want politics, logistics, and war to coexist in the same campaign instead of staying in separate lanes.</p><h2>What makes it distinct</h2><p>Its clearest distinction is permission. Few RPGs let the table operate with this much status and reach while still embedding them in a hostile setting. That makes it feel less like a small-band survival game and more like dangerous empire-scale adventuring.</p><h2>Where it may not fit</h2><p>Groups who want lighter rules or a more intimate scale may find it too bulky and too wide-angle. The game's ambition is part of its appeal and part of its friction.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "high",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 4,
		new_gm_friendly: 1,
		combat_focus: 3,
		roleplay_focus: 3,
		tactical_depth: 4,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "high",
		best_for: [
			{ text: "Groups that want large-scale 40k campaigning" },
			{ text: "Tables interested in ships, authority, and void travel" },
			{ text: "Players comfortable with older crunchy licensed systems" },
		],
		avoid_if: [
			{ text: "You want light and fast sci-fi play" },
			{ text: "You want a small personal-scale campaign" },
			{ text: "You dislike bulky licensed systems" },
		],
		why_it_fits:
			"Rogue Trader fits the directory because it offers one of the broadest and most distinctive campaign scopes in licensed science-fiction roleplaying.",
		taxonomies: {
			genre: ["interstellar-travel", "military", "science-fiction", "space-opera"],
			mechanic: ["campaign", "tactical-combat", "team-based"],
			decision_tag: ["licensed", "rules-medium"],
		},
		fit_blurbs: {
			"science-fiction":
				"Belongs in science fiction because void travel, imperial technology, and interstellar power shape the whole game.",
			"space-opera":
				"A strong space-opera fit because ships, dynasties, authority, and big-scale decisions are the point.",
			military:
				"Fits military play because command structure, arms, and organized violence are inseparable from the setting.",
			campaign:
				"Works best as a campaign game because ships, profit, and long-range power all pay off over time.",
			"interstellar-travel":
				"Belongs in interstellar travel because movement across the void is a central campaign activity rather than background color.",
			"tactical-combat":
				"A tactical-combat fit because conflict is mechanically substantial even when the campaign operates at larger scales.",
			"team-based":
				"Fits team-based play because command-level campaigns still depend on a functioning bridge and command crew.",
			licensed:
				"Belongs in licensed play because much of its value comes from how specifically it delivers Warhammer 40k's scale and tone.",
			"rules-medium":
				"Sits on the heavier edge of rules-medium because it asks more of the table than lighter science-fiction adventure games.",
		},
		related: [
			{
				slug: "traveller",
				description:
					"Rogue Trader and Traveller both support ship-based campaigns across a larger galaxy, but Traveller is more grounded and procedural while Rogue Trader is grander, crueler, and much more licensed.",
			},
			{
				slug: "mothership",
				description:
					"Rogue Trader and Mothership both know space is dangerous, but Mothership is intimate horror while Rogue Trader is command-scale ambition and imperial excess.",
			},
			{
				slug: "warhammer-fantasy-roleplay",
				description:
					"Rogue Trader and Warhammer Fantasy Roleplay share grim social texture and licensed identity, but Rogue Trader operates at voidship scale while WFRP is much more local and grubby.",
			},
		],
	},
	{
		slug: "warhammer-fantasy-roleplay",
		title: "Warhammer Fantasy Roleplay",
		publisher_or_creator: "Cubicle 7",
		website_url: "https://cubicle7games.com/en_EU/our-games/warhammer-fantasy-roleplay",
		image_url: "https://cubicle7games.com/en_EU/our-games/warhammer-fantasy-roleplay",
		reviews_url: "https://cubicle7games.com/en_EU/our-games/warhammer-fantasy-roleplay",
		blurb:
			"Warhammer Fantasy Roleplay is a grim fantasy RPG of careers, corruption, bad odds, and surviving a world where mud, bureaucracy, and horror all feel equally dangerous.",
		review_summary:
			"Warhammer Fantasy Roleplay is widely praised for setting texture, career-based characters, and how effectively it makes fantasy feel grubby and unstable. The common caution is that its systems can be fiddly, and the game is far better for groups who want the grime than for those who only want generic fantasy adventure.",
		body_html:
			"<p>Warhammer Fantasy Roleplay remains distinctive because it refuses to clean fantasy up. This is not a game about polished heroes stepping onto a shining stage. It is about rat catchers, soldiers, clerks, priests, charlatans, and other ordinary or compromised people trying to survive in a world where corruption, hunger, and chaos feel frighteningly normal. That gives it a grounded texture few fantasy RPGs really match.</p><h2>Theme and setting</h2><p>The Empire is one of the hobby's strongest fantasy settings because it is not only dangerous. It is administratively, socially, and spiritually unstable. Cities rot, careers trap people, cults spread quietly, and the supernatural often arrives through systems that already were not healthy. That is what makes the setting work.</p><h2>How play feels</h2><p>At the table, WFRP is strongest when the group is happy for careers, social station, and bad luck to matter as much as battlefield success. Progression feels meaningful precisely because it starts from ordinary or compromised places. Survival is not guaranteed, and the world does not care much about the party's dignity.</p><h2>What makes it distinct</h2><p>Its clearest distinction is social grime. Many dark fantasy games are dark because they are apocalyptic or extreme. WFRP is dark because its everyday institutions already feel precarious and rotten.</p><h2>Where it may not fit</h2><p>Groups who want clean heroic fantasy arcs or light rules may find it too grubby and too procedural. The game gains power from details other fantasy RPGs are usually happy to skip.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "medium",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 4,
		new_gm_friendly: 2,
		combat_focus: 3,
		roleplay_focus: 3,
		tactical_depth: 3,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 1,
		content_intensity: "high",
		best_for: [
			{ text: "Groups that want grim fantasy with social texture" },
			{ text: "Tables interested in careers and long-form corruption" },
			{ text: "Players who like fantasy to feel dirty and unstable" },
		],
		avoid_if: [
			{ text: "You want clean heroic advancement" },
			{ text: "You dislike fiddly rules or older-school texture" },
			{ text: "You want your dark fantasy mostly as aesthetics" },
		],
		why_it_fits:
			"Warhammer Fantasy Roleplay fits the directory because it remains one of the clearest grim fantasy campaign games built around social grime, career identity, and corruption.",
		taxonomies: {
			genre: ["dark-fantasy", "fantasy"],
			mechanic: ["campaign", "low-magic", "skill-based", "tactical", "team-based"],
			decision_tag: ["licensed", "rules-medium"],
		},
		fit_blurbs: {
			"dark-fantasy":
				"Belongs in dark fantasy because the world is corrupt, unstable, and dangerous in ways that go far beyond mere aesthetics.",
			fantasy:
				"A clear fantasy fit because careers, monsters, travel, and magic all live inside a richly developed fantasy world.",
			"low-magic":
				"Fits low-magic because magic feels dangerous, specialized, and socially alarming rather than casually abundant.",
			campaign:
				"Works best as a campaign game because careers, corruption, and social mobility all develop over time.",
			"skill-based":
				"Belongs in skill-based play because everyday competence and professional background matter a great deal.",
			tactical:
				"Fits tactical play because danger and procedure matter more than in lighter fantasy story games.",
			"team-based":
				"Works as team-based play because the setting and career mix reward groups of flawed people relying on each other.",
			licensed:
				"A strong licensed fit because much of the game's value comes from its deep connection to Warhammer's setting and tone.",
			"rules-medium":
				"Sits in rules-medium because it has significant procedure without crossing fully into the heaviest tactical territory.",
		},
		related: [
			{
				slug: "the-witcher-trpg",
				description:
					"Warhammer Fantasy Roleplay and The Witcher TRPG both favor grim fantasy over polished heroics, but WFRP is broader and more socially filthy while The Witcher is more license-specific and monster-contract focused.",
			},
			{
				slug: "shadowdark",
				description:
					"Warhammer Fantasy Roleplay and ShadowDark both make fantasy dangerous, but ShadowDark is leaner and more dungeon-forward while WFRP is more social, career-driven, and setting-heavy.",
			},
			{
				slug: "vaesen",
				description:
					"Warhammer Fantasy Roleplay and Vaesen both treat the world as more unsettling than heroic fantasy does, but Vaesen is more focused on investigation and folklore while WFRP is broader and more socially grubby.",
			},
		],
	},
	{
		slug: "worlds-in-peril",
		title: "Worlds in Peril",
		publisher_or_creator: "Samjoko Publishing",
		website_url: "https://samjokopublishing.com/products/worlds-in-peril-rpg",
		image_url: "https://samjokopublishing.com/products/worlds-in-peril-rpg",
		reviews_url: "https://samjokopublishing.com/products/worlds-in-peril-rpg",
		blurb:
			"Worlds in Peril is a superhero PbtA game about custom powers, dramatic fallout, and trying to balance comic-book action with the lives behind the masks.",
		review_summary:
			"Worlds in Peril is often praised for the freedom of its power design and for aiming at broad comic-book stories rather than a single franchise mode. The common criticism is that some of its moves and procedures feel rougher than the concept deserves, so tables often love the ambition more consistently than the execution.",
		body_html:
			"<p>Worlds in Peril matters because it tries to solve a real superhero design problem: how do you let players feel broadly and creatively super without writing a specific rule for every possible power? Its answer is looser and more narrative than point-build superhero systems, which makes it attractive to some tables and frustrating to others.</p><h2>Theme and setting</h2><p>The game is not built around one fixed universe. Its focus is comic-book superhero drama in the broad sense: identities, relationships, fallout, collateral pressure, and the question of what heroism costs when people still have lives attached to it. That gives it more flexibility than franchise-tied games.</p><h2>How play feels</h2><p>At the table, Worlds in Peril is strongest when players want to define what their powers mean in fiction and let scenes escalate from there. The game rewards groups who are willing to negotiate fiction actively rather than waiting for a detailed tactical subsystem to do that work for them.</p><h2>What makes it distinct</h2><p>Its clearest distinction is openness. Where Mutants &amp; Masterminds offers power engineering and Marvel Heroic offers issue-shaped pacing, Worlds in Peril tries to make custom comic-book capability legible inside a more narrative chassis.</p><h2>Where it may not fit</h2><p>Groups who want sharper rules text, tighter move design, or very consistent tactical definition may find it frustrating. It delivers best when the table is willing to help the game meet its own ambition.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 150,
		session_length_minutes_max: 210,
		prep_level: "low",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 1,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want narrative superhero campaigns" },
			{ text: "Tables interested in broadly custom powers" },
			{ text: "Players who like comic drama alongside action" },
		],
		avoid_if: [
			{ text: "You want heavy tactical supers rules" },
			{ text: "You want the cleanest PbtA execution possible" },
			{ text: "You want a specific licensed comic universe" },
		],
		why_it_fits:
			"Worlds in Peril fits the directory because it offers a narrative-first superhero option for tables that want broad custom powers and comic-book drama without a giant build engine.",
		taxonomies: {
			genre: ["superheroes"],
			system: ["powered-by-the-apocalypse-pbta"],
			mechanic: ["campaign", "narrative-driven", "team-based"],
			decision_tag: ["beginner-friendly", "rules-medium"],
		},
		fit_blurbs: {
			superheroes:
				"Belongs in superheroes because the whole game is about people with comic-book-scale abilities and responsibilities.",
			"powered-by-the-apocalypse-pbta":
				"Fits PbtA because power use and dramatic consequence are handled through fiction-first moves rather than simulationist rules.",
			campaign:
				"Works best as a campaign game because hero identities and relationship fallout gain force over time.",
			"narrative-driven":
				"A narrative-driven fit because fiction and consequence matter more than detailed tactical procedure.",
			"team-based":
				"Fits team-based play because comic-book ensemble dynamics are a major part of the game's appeal.",
			"beginner-friendly":
				"A relatively beginner-friendly supers option for groups who want story-forward play rather than power-build engineering.",
			"rules-medium":
				"Sits in rules-medium because it has real structure while staying lighter than tactical supers systems.",
		},
		related: [
			{
				slug: "mutants-masterminds",
				description:
					"Worlds in Peril and Mutants & Masterminds both support original superhero campaigns, but Worlds in Peril is more narrative and flexible while M&M is more engineered and tactical.",
			},
			{
				slug: "marvel-heroic-roleplaying",
				description:
					"Worlds in Peril and Marvel Heroic both want dynamic comic-book scenes, but Marvel Heroic is tighter and more issue-shaped while Worlds in Peril is more open-ended and custom-power focused.",
			},
			{
				slug: "villains-and-vigilantes",
				description:
					"Worlds in Peril and Villains and Vigilantes both support original superhero identities, but Worlds in Peril is story-forward and modern while V&V is older, pulpier, and more traditional.",
			},
		],
	},
];

const backupPath = backupDatabase();
const existingBySlug = new Map(
	runJson(
		`SELECT id, slug, image_url FROM ec_games WHERE slug IN (${batch
			.map((entry) => sqlString(entry.slug))
			.join(", ")});`,
	).map((row) => [row.slug, row]),
);
const batchBySlug = new Map(batch.map((entry) => [entry.slug, entry]));

const taxonomyRows = runJson("SELECT id, name, slug FROM taxonomies;");
const taxonomyByKey = new Map(taxonomyRows.map((row) => [`${row.name}:${row.slug}`, row.id]));

const relatedSlugs = new Set();
for (const entry of batch) {
	for (const item of entry.related) relatedSlugs.add(item.slug);
}

const relatedRows = runJson(
	`SELECT slug, title, image_url FROM ec_games WHERE slug IN (${Array.from(relatedSlugs, sqlString).join(", ")});`,
);
const relatedBySlug = new Map(relatedRows.map((row) => [row.slug, row]));
for (const [slug, entry] of batchBySlug) {
	if (relatedBySlug.has(slug)) continue;
	const existing = existingBySlug.get(slug);
	relatedBySlug.set(slug, {
		slug,
		title: entry.title,
		image_url:
			existing?.image_url && existing.image_url.startsWith(cloudinaryPrefix)
				? existing.image_url
				: entry.image_url,
	});
}

const statements = ["BEGIN IMMEDIATE;"];

for (const [index, entry] of batch.entries()) {
	const existing = existingBySlug.get(entry.slug);
	const id = existing?.id || makeId();
	const createdAt = isoDateWithOffset(index);
	const imageUrl =
		existing?.image_url && existing.image_url.startsWith(cloudinaryPrefix)
			? existing.image_url
			: entry.image_url;
	const related = entry.related
		.map((item) => {
			const relatedGame = relatedBySlug.get(item.slug);
			if (!relatedGame) {
				throw new Error(`Missing related game slug: ${item.slug} for ${entry.slug}`);
			}
			return {
				title: relatedGame.title,
				slug: relatedGame.slug,
				image_url: relatedGame.image_url,
				description: item.description,
			};
		})
		.slice(0, 3);

	const fields = {
		id,
		slug: entry.slug,
		status: "published",
		locale: "en",
		title: entry.title,
		at_a_glance: deriveAtAGlance(entry),
		website_url: entry.website_url,
		image_url: imageUrl,
		reviews_url: entry.reviews_url,
		review_summary: entry.review_summary,
		blurb: entry.blurb,
		body_html: entry.body_html,
		publisher_or_creator: entry.publisher_or_creator,
		min_players: entry.min_players,
		max_players: entry.max_players,
		gm_required: entry.gm_required,
		gm_role_label: entry.gm_role_label,
		session_length_minutes_min: entry.session_length_minutes_min,
		session_length_minutes_max: entry.session_length_minutes_max,
		prep_level: entry.prep_level,
		one_shot_friendly: entry.one_shot_friendly,
		campaign_friendly: entry.campaign_friendly,
		solo_friendly: entry.solo_friendly,
		beginner_friendly: entry.beginner_friendly,
		complexity_score: entry.complexity_score,
		new_gm_friendly: entry.new_gm_friendly,
		combat_focus: entry.combat_focus,
		roleplay_focus: entry.roleplay_focus,
		tactical_depth: entry.tactical_depth,
		campaign_depth: entry.campaign_depth,
		price_model: entry.price_model,
		quickstart_available: entry.quickstart_available,
		pdf_available: entry.pdf_available,
		physical_book_available: entry.physical_book_available,
		vtt_ready: entry.vtt_ready,
		content_intensity: entry.content_intensity,
		best_for: JSON.stringify(entry.best_for),
		avoid_if: JSON.stringify(entry.avoid_if),
		why_it_fits: entry.why_it_fits,
		related: JSON.stringify(related),
		created_at: existing ? undefined : createdAt,
		updated_at: createdAt,
		published_at: createdAt,
	};

	const normalizedFields = Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined),
	);
	const columns = Object.keys(normalizedFields).join(", ");
	const values = Object.values(normalizedFields).map(sqlString).join(", ");
	statements.push(
		`INSERT INTO ec_games (${columns}) VALUES (${values}) ON CONFLICT(slug, locale) DO UPDATE SET status = excluded.status, title = excluded.title, at_a_glance = excluded.at_a_glance, website_url = excluded.website_url, image_url = CASE WHEN ec_games.image_url LIKE 'https://res.cloudinary.com/%' THEN ec_games.image_url ELSE excluded.image_url END, reviews_url = excluded.reviews_url, review_summary = excluded.review_summary, blurb = excluded.blurb, body_html = excluded.body_html, publisher_or_creator = excluded.publisher_or_creator, min_players = excluded.min_players, max_players = excluded.max_players, gm_required = excluded.gm_required, gm_role_label = excluded.gm_role_label, session_length_minutes_min = excluded.session_length_minutes_min, session_length_minutes_max = excluded.session_length_minutes_max, prep_level = excluded.prep_level, one_shot_friendly = excluded.one_shot_friendly, campaign_friendly = excluded.campaign_friendly, solo_friendly = excluded.solo_friendly, beginner_friendly = excluded.beginner_friendly, complexity_score = excluded.complexity_score, new_gm_friendly = excluded.new_gm_friendly, combat_focus = excluded.combat_focus, roleplay_focus = excluded.roleplay_focus, tactical_depth = excluded.tactical_depth, campaign_depth = excluded.campaign_depth, price_model = excluded.price_model, quickstart_available = excluded.quickstart_available, pdf_available = excluded.pdf_available, physical_book_available = excluded.physical_book_available, vtt_ready = excluded.vtt_ready, content_intensity = excluded.content_intensity, best_for = excluded.best_for, avoid_if = excluded.avoid_if, why_it_fits = excluded.why_it_fits, related = excluded.related, updated_at = excluded.updated_at, published_at = excluded.published_at, deleted_at = NULL;`,
	);
	statements.push(
		`DELETE FROM content_taxonomies WHERE collection = 'games' AND entry_id = ${sqlString(id)};`,
	);
	for (const [taxonomyName, slugs] of Object.entries(entry.taxonomies)) {
		for (const slug of slugs) {
			const taxonomyId = taxonomyByKey.get(`${taxonomyName}:${slug}`);
			if (!taxonomyId) {
				throw new Error(`Missing taxonomy ${taxonomyName}:${slug}`);
			}
			statements.push(
				`INSERT OR IGNORE INTO content_taxonomies (collection, entry_id, taxonomy_id) VALUES ('games', ${sqlString(id)}, ${sqlString(taxonomyId)});`,
			);
		}
	}
}

const categoryPages = new Map(
	runJson("SELECT id, slug, game_notes FROM ec_category_pages;").map((row) => [row.slug, row]),
);

for (const entry of batch) {
	for (const [categorySlug, fitBlurb] of Object.entries(entry.fit_blurbs)) {
		const category = categoryPages.get(categorySlug);
		if (!category) {
			throw new Error(`Missing category page for ${categorySlug}`);
		}
		const existingNotes = category.game_notes ? JSON.parse(category.game_notes) : [];
		const byGame = new Map(existingNotes.map((note) => [note.game_slug, note]));
		byGame.set(entry.slug, {
			game_slug: entry.slug,
			fit_blurb: fitBlurb,
			featured: false,
			featured_reason: "",
			sort_order: null,
		});
		category.game_notes = JSON.stringify(
			[...byGame.values()].toSorted((a, b) => a.game_slug.localeCompare(b.game_slug)),
		);
	}
}

for (const category of categoryPages.values()) {
	if (!category.game_notes) continue;
	statements.push(
		`UPDATE ec_category_pages SET game_notes = ${sqlString(category.game_notes)} WHERE id = ${sqlString(category.id)};`,
	);
}

statements.push("COMMIT;");
runSql(statements.join("\n"));

console.log(
	JSON.stringify(
		{
			backupPath,
			games: batch.map((entry) => entry.slug),
			insertedOrUpdated: batch.length,
			skipped: ["tsukuyumi-the-divine-hunter", "wyld-witches"],
		},
		null,
		2,
	),
);
