import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const rootDir = "/Users/home/Dev/git/emdash";
const databasePath = path.join(rootDir, "sites/ttrpg-games/data.db");
const backupsDir = path.join(rootDir, "sites/ttrpg-games/backups");
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
	const backupPath = path.join(backupsDir, `data-${nowStamp()}-pre-n-s-import.db`);
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
		slug: "neurocity",
		title: "Neurocity",
		publisher_or_creator: "Stinger Shop Publishing",
		website_url: "https://nicolet0815.itch.io/neurocity",
		image_url: "https://nicolet0815.itch.io/neurocity",
		reviews_url: "https://nicolet0815.itch.io/neurocity",
		blurb:
			"Neurocity is a cyberpunk RPG about debt, coercive systems, and surviving a near-future city that treats human life as another consumable resource.",
		review_summary:
			"Neurocity is usually praised for mood, social sharpness, and the way it frames cyberpunk through precarity instead of pure chrome fetish. The common split is that it is more interested in class pressure and personal compromise than in tactical gear play, which narrows the audience in a useful way.",
		body_html:
			"<p>Neurocity works because it remembers cyberpunk is not only a style package. Neon, implants, and corporate branding are part of the surface, but the game's real subject is pressure. It cares about what it feels like to live in a city where exploitation has become infrastructure and survival depends on how much of yourself you are willing to sell, fake, or fragment.</p><h2>Theme and setting</h2><p>The setting leans into urban claustrophobia, economic coercion, and tech-mediated identity. This is not a glossy future where gadgets automatically create wonder. The appeal comes from the friction between people trying to maintain agency and systems built to absorb it. That gives the cyberpunk premise weight instead of leaving it as costume.</p><h2>How play feels</h2><p>At the table, Neurocity plays best when the group wants jobs, relationships, and personal compromise to matter as much as action scenes. The strongest sessions are not only about infiltration or violence. They are about what the work costs, which alliances are survivable, and how far characters are willing to bend before they stop recognizing themselves.</p><h2>What makes it distinct</h2><p>Its strongest quality is tone control. Neurocity does not read like generic anti-corporate wallpaper. It feels more intimate and more suffocating than a lot of broader cyberpunk engines. That makes it a good choice for tables who want the genre to stay socially grounded instead of drifting into gear catalog play.</p><h2>Where it may not fit</h2><p>Groups who mainly want crunchy firefights, cyberware optimization, or a giant open sandbox may find Neurocity too focused on atmosphere and pressure. Its best material comes from how it narrows the frame, not how much tactical surface it offers.</p><h2>Bottom line</h2><p>Neurocity belongs in the directory because it delivers cyberpunk with emotional and political density instead of just visual shorthand. If the table wants near-future play where systems of control stay visible at all times, it has a real point of view.</p>",
		min_players: 2,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 150,
		session_length_minutes_max: 240,
		prep_level: "medium",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 3,
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 2,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want cyberpunk with social bite" },
			{ text: "Tables interested in debt, coercion, and compromised work" },
			{ text: "Players who like urban pressure more than gear fetishism" },
		],
		avoid_if: [
			{ text: "You want combat crunch to drive the whole game" },
			{ text: "You want cyberpunk mostly as visual style" },
			{ text: "You prefer apolitical future noir" },
		],
		why_it_fits:
			"Neurocity is a strong cyberpunk pick for tables that want pressure, exploitation, and city-scale survival to matter as much as the tech on the page.",
		taxonomies: {
			genre: ["cyberpunk", "dystopian", "science-fiction"],
			theme: ["political"],
			mechanic: ["narrative-driven", "team-based"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			cyberpunk:
				"Belongs in cyberpunk because debt, pressure, and corporate extraction shape play as much as any implants or interface tech.",
			dystopian:
				"Fits dystopian play because the setting is built around systems that normalize exploitation rather than around isolated bad actors.",
			"science-fiction":
				"A science-fiction fit because technology and urban infrastructure materially reshape identity, labor, and power.",
			political:
				"Works as political play because the game keeps class pressure and structural coercion visible instead of backgrounded.",
			"narrative-driven":
				"Belongs in narrative-driven play because relationships, consequences, and compromise do more work than tactical optimization.",
			"team-based":
				"Fits team-based play because jobs and survival pressure gain force when a crew has to absorb risk together.",
			"rules-medium":
				"Sits well in rules-medium because it gives enough structure to sustain pressure without turning into a heavy combat engine.",
		},
		related: [
			{
				slug: "cyberpunk",
				description:
					"Neurocity and Cyberpunk 2020 both care about life under extractive future systems, but Neurocity is more intimate and socially pressurized while Cyberpunk 2020 leans harder into gear, combat, and classic genre scale.",
			},
			{
				slug: "blade-runner",
				description:
					"Neurocity and Blade Runner both use future urban pressure to shape character choices, but Blade Runner is more investigative and melancholic while Neurocity is broader about labor, survival, and systemic coercion.",
			},
			{
				slug: "otherscape",
				description:
					"Neurocity and Otherscape both mix tech anxiety with identity stress, but Neurocity stays more grounded and class-driven while Otherscape pushes further into mythic and supernatural overlap.",
			},
		],
	},
	{
		slug: "numenera",
		title: "Numenera",
		publisher_or_creator: "Monte Cook Games",
		website_url: "https://www.montecookgames.com/store/product/numenera-discovery-and-destiny/",
		image_url: "https://www.montecookgames.com/store/product/numenera-discovery-and-destiny/",
		reviews_url: "https://www.montecookgames.com/store/product/numenera-discovery-and-destiny/",
		blurb:
			"Numenera is a science-fantasy RPG of discovery, strange civilizations, and impossible technologies so old and powerful they read as magic.",
		review_summary:
			"Numenera is commonly praised for wonder, exploration, and one of the strongest science-fantasy settings in modern tabletop play. The recurring reservation is that its rules are lighter and more abstract than some groups expect from a setting this dense, so the setting consistently lands harder than the system for some players.",
		body_html:
			"<p>Numenera stands out because it treats wonder as a core play material instead of a garnish. The Ninth World is not simply a fantasy world with a science-fiction excuse behind it. It is a place where the debris of incomprehensibly advanced civilizations has become landscape, religion, danger, and opportunity all at once. That makes discovery feel like the game's true verb.</p><h2>Theme and setting</h2><p>The setting does most of the heavy lifting. Vast timescales, impossible artifacts, weird ecologies, and civilizations living among technological leftovers give Numenera a scale most fantasy worlds cannot match. The result is a world where every ruin can feel mythic even when it is technically a machine, and every settlement can feel provisional in the shadow of older powers.</p><h2>How play feels</h2><p>At the table, Numenera is strongest when the group wants movement, curiosity, and a high tolerance for the unknown. It rewards players who enjoy asking what something is, what it used to be, and what happens if they touch it anyway. Combat exists, but the emotional center of the game is usually discovery rather than conquest.</p><h2>What makes it distinct</h2><p>Its clearest strength is tonal identity. Plenty of games combine fantasy and science fiction, but Numenera gives that blend a calmer, older, more archaeological feeling. It is less interested in pulp gadget excitement than in the feeling of living in the sediment of impossible histories.</p><h2>Where it may not fit</h2><p>Groups who want simulationist detail, highly tactical combat, or a rules engine that matches the setting's complexity step for step may find Numenera lighter than expected. The setting is denser than the chassis, and that trade works better for some tables than others.</p><h2>Bottom line</h2><p>Numenera belongs in the directory because it remains one of the clearest choices for tables that want science-fantasy exploration anchored in awe, mystery, and deep time rather than straightforward heroic fantasy escalation.</p>",
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
		combat_focus: 2,
		roleplay_focus: 3,
		tactical_depth: 2,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want wonder and exploration" },
			{ text: "Tables drawn to science-fantasy rather than pure fantasy" },
			{ text: "Campaigns built around ruins, mysteries, and old tech" },
		],
		avoid_if: [
			{ text: "You want crunchy tactical combat" },
			{ text: "You dislike abstract resource mechanics" },
			{ text: "You want your setting density matched by heavy system detail" },
		],
		why_it_fits:
			"Numenera is one of the strongest exploration-first directory picks for tables that want wonder, weird technology, and a setting that feels genuinely ancient.",
		taxonomies: {
			genre: ["science-fiction", "post-apocalyptic"],
			mechanic: ["campaign", "character-customization", "exploration-driven"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			"science-fiction":
				"Belongs in science fiction because ancient technology and impossible machines shape the setting more than conventional fantasy logic does.",
			"post-apocalyptic":
				"Fits post-apocalyptic play when the table wants collapse and inheritance filtered through awe, archaeology, and deep time rather than raw survival grit.",
			campaign:
				"Works best as a campaign game because the Ninth World rewards long-term discovery and accumulating context.",
			"character-customization":
				"Fits character-customization because types, descriptors, and foci combine into distinct roles without becoming a build-labyrinth.",
			"exploration-driven":
				"A natural exploration-driven pick because discovery is the emotional center of play.",
			"rules-medium":
				"Sits comfortably in rules-medium because it offers clear structure without burying the game under tactical procedure.",
		},
		related: [
			{
				slug: "gamma-world",
				description:
					"Numenera and Gamma World both thrive on strange futures and impossible leftovers, but Numenera is more contemplative and archaeological while Gamma World is louder, swingier, and more mutant-chaos driven.",
			},
			{
				slug: "traveller",
				description:
					"Numenera and Traveller both care about discovery in larger worlds, but Traveller is more grounded and procedural while Numenera is mythic, opaque, and openly science-fantasy.",
			},
			{
				slug: "pathfinder",
				description:
					"Numenera and Pathfinder 2e can both sustain long campaigns, but Pathfinder 2e is more tactical and codified while Numenera puts more weight on wonder, mystery, and the unknown.",
			},
		],
	},
	{
		slug: "otherscape",
		title: "Otherscape",
		publisher_or_creator: "Son of Oak Game Studio",
		website_url: "https://sonofoak.com/collections/otherscape",
		image_url: "https://sonofoak.com/collections/otherscape",
		reviews_url: "https://sonofoak.com/collections/otherscape",
		blurb:
			"Otherscape is a mythic cyberpunk RPG about identity, community, and power colliding in a future where folklore and technology occupy the same streets.",
		review_summary:
			"Otherscape is generally praised for style, thematic ambition, and how effectively it uses tags and narrative pressure to make mythic cyberpunk feel personal. The common hesitation is that its approach asks players to buy into a specific story-forward rhythm rather than expect a neutral cyberpunk toolkit.",
		body_html:
			"<p>Otherscape earns attention by refusing to choose between tech anxiety and mythic language. It assumes a future where systems, symbols, ghosts, code, and social performance all overlap, then builds play around what that does to people trying to keep hold of themselves. That gives it a sharper identity than cyberpunk games that only add folklore as seasoning.</p><h2>Theme and setting</h2><p>The setting is urban, wired, pressured, and spiritually contaminated in interesting ways. It is not just that magic exists beside technology. It is that both become ways institutions and identities get rewritten. That lets Otherscape treat cyberpunk as a genre about story, memory, and meaning as much as about surveillance or commerce.</p><h2>How play feels</h2><p>At the table, Otherscape feels like dramatic escalation driven by tags, consequences, and character identity. Scenes gain force when players lean into what their powers, affiliations, and symbolic baggage actually mean rather than treating abilities as disconnected moves. It is strongest when the group wants fiction-first momentum and emotionally loaded choices.</p><h2>What makes it distinct</h2><p>Its most distinctive quality is how well it carries genre fusion without flattening either side. The cyberpunk is not generic. The mythic layer is not a bolt-on occult palette. They work because the game treats both as living systems of power and interpretation.</p><h2>Where it may not fit</h2><p>Groups who want a gear-heavy cyberpunk game, or who prefer rules to stay more concrete and spatial, may find Otherscape too tag-driven and too invested in symbolic framing. It is not trying to be a neutral action chassis.</p><h2>Bottom line</h2><p>Otherscape belongs in the directory because it offers one of the clearest modern answers to the question of what cyberpunk becomes when identity, folklore, and future pressure are all equally real.</p>",
		min_players: 2,
		max_players: 5,
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
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 1,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups who want mythic cyberpunk rather than hard-tech cyberpunk" },
			{ text: "Tables that like tags, escalation, and fiction-first play" },
			{ text: "Players interested in identity and community pressure" },
		],
		avoid_if: [
			{ text: "You want cyberware crunch and firefight detail" },
			{ text: "You dislike symbolic or tag-driven play" },
			{ text: "You want a neutral sandbox instead of a strong point of view" },
		],
		why_it_fits:
			"Otherscape is a strong fit for tables that want cyberpunk to stay stylish, personal, and mythically charged without losing the genre's pressure and social stakes.",
		taxonomies: {
			genre: ["cyberpunk", "science-fiction", "urban-fantasy"],
			mechanic: ["narrative-driven", "team-based"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			cyberpunk:
				"Belongs in cyberpunk because systems of control, identity pressure, and future-city stress are central to every part of the game.",
			"science-fiction":
				"Fits science fiction because the future setting and technological mediation still shape the world even when myth bleeds through it.",
			"urban-fantasy":
				"A strong urban-fantasy fit because folklore, symbols, and supernatural logic live inside a recognizably contemporary city frame.",
			"narrative-driven":
				"Works as narrative-driven play because the game expects tags, consequences, and fiction-first choices to carry momentum.",
			"team-based":
				"Fits team-based play because crews and overlapping pressures make the setting sharper than isolated protagonist play would.",
			"rules-medium":
				"Sits in rules-medium because it has real procedure and structure without turning into a gear-heavy tactical system.",
		},
		related: [
			{
				slug: "city-of-mist",
				description:
					"Otherscape and City of Mist both fuse modern life with mythic identity, but Otherscape is more cybernetic and futurist while City of Mist is noirer and more contemporary.",
			},
			{
				slug: "cyberpunk",
				description:
					"Otherscape and Cyberpunk 2020 both care about living under high-pressure future systems, but Otherscape is more symbolic and story-driven while Cyberpunk 2020 is more concrete, gear-forward, and street-sim oriented.",
			},
			{
				slug: "ihunt",
				description:
					"Otherscape and iHunt both use modern pressure and identity stress to shape supernatural play, but Otherscape is mythic cyberpunk while iHunt is present-day monster hunting under gig-economy strain.",
			},
		],
	},
	{
		slug: "outgunned",
		title: "Outgunned",
		publisher_or_creator: "Two Little Mice",
		website_url: "https://twolittlemice.net/outgunned/",
		image_url: "https://twolittlemice.net/outgunned/",
		reviews_url: "https://twolittlemice.net/outgunned/",
		blurb:
			"Outgunned is a cinematic action RPG built to emulate stylish gunfights, wild stunts, and escalating set pieces in the mode of modern action movies.",
		review_summary:
			"Outgunned is usually praised for actually feeling fast and cinematic at the table instead of only claiming that tone in marketing copy. The common limit is that it is purpose-built for one mode of play, so groups wanting broad genre coverage or slower dramatic simulation may find it too specialized.",
		body_html:
			"<p>Outgunned succeeds because it treats action cinema as structure, not flavor text. Plenty of games promise fast-paced play, but Outgunned is built around the rhythms of stylish set pieces, improbable escapes, and competence under pressure. It wants the table to feel the acceleration of an action sequence rather than just narrate around a traditional chassis.</p><h2>Theme and setting</h2><p>The game is deliberately broad about the exact franchise skin, but narrow about tone. This is action-forward play about momentum, swagger, and escalating trouble. Whether the table leans toward spy thriller, revenge movie, or heist-adjacent action, the point is not realism. The point is to make escalation legible and satisfying.</p><h2>How play feels</h2><p>At the table, Outgunned is quick, punchy, and scene-driven. Characters push through danger with style, and the system is strongest when the group wants forward motion more than forensic detail. The best sessions feel like a string of memorable beats rather than a long negotiation with procedure.</p><h2>What makes it distinct</h2><p>Its clearest distinction is confidence of purpose. Outgunned is not trying to be a universal engine that can maybe also do action. It is an action-emulation game that knows exactly what kind of pacing and payoff it is chasing. That focus makes it easier to recommend than broader systems that leave cinematic play entirely up to GM technique.</p><h2>Where it may not fit</h2><p>Groups who want tactical realism, granular equipment play, or long periods of low-intensity downtime may find Outgunned too committed to velocity. It gains power by narrowing the kind of scene it wants to reward.</p><h2>Bottom line</h2><p>Outgunned belongs in the directory because it delivers one of the clearest modern answers to the question of how to run action-movie play without burying that promise under generic system overhead.</p>",
		min_players: 2,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "Director",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 4,
		roleplay_focus: 2,
		tactical_depth: 1,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want action-movie pacing" },
			{ text: "One-shots and mini-campaigns full of stunts and chases" },
			{ text: "Tables that want stylish momentum over tactical realism" },
		],
		avoid_if: [
			{ text: "You want simulationist firefights" },
			{ text: "You want slow-burn slice-of-life scenes to dominate play" },
			{ text: "You dislike games with a tightly focused genre target" },
		],
		why_it_fits:
			"Outgunned is an easy recommendation for tables that want the table itself to move like an action movie instead of relying on genre talk to do all the work.",
		taxonomies: {
			genre: ["modern"],
			theme: ["cinematic"],
			mechanic: ["rules-lite", "streamlined", "team-based"],
			decision_tag: ["beginner-friendly", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			modern:
				"Fits modern play because the game's baseline assumptions come from contemporary action-movie worlds rather than fantasy or deep future settings.",
			cinematic:
				"Belongs in cinematic play because action-scene rhythm is the whole point of the system.",
			"rules-lite":
				"Works as rules-lite action because it keeps procedure focused on pace and payoff instead of tactical detail.",
			streamlined:
				"A strong streamlined pick because it gets from premise to set piece with very little drag.",
			"team-based":
				"Fits team-based play because ensemble action sequences and complementary roles are where the game feels best.",
			"beginner-friendly":
				"A beginner-friendly action game because the pitch is obvious and the system teaches quickly.",
			"low-prep":
				"Works well as low-prep action because scenes, chases, and complications are easier to stage than heavily simulated operations.",
			"one-shot-friendly":
				"A natural one-shot choice because action-movie arcs land cleanly in short play.",
		},
		related: [
			{
				slug: "blade-runner",
				description:
					"Outgunned and Blade Runner both benefit from strong scene framing and stylish tension, but Blade Runner is slower and investigative while Outgunned is built for velocity and spectacle.",
			},
			{
				slug: "cyberpunk",
				description:
					"Outgunned and Cyberpunk 2020 can both support gunfire and kinetic danger, but Cyberpunk 2020 is grittier and more equipment-driven while Outgunned is cleaner, faster, and openly cinematic.",
			},
			{
				slug: "slugblaster",
				description:
					"Outgunned and Slugblaster both care about motion and momentum, but Outgunned emulates adult action movies while Slugblaster is teen rebellion, dimension-skating, and emotional crash energy.",
			},
		],
	},
	{
		slug: "pathfinder",
		title: "Pathfinder 2e",
		publisher_or_creator: "Paizo",
		website_url: "https://paizo.com/pathfinder",
		image_url: "https://paizo.com/pathfinder",
		reviews_url: "https://paizo.com/pathfinder",
		blurb:
			"Pathfinder 2e is a tactical fantasy RPG built around class identity, rigorous encounter structure, and one of the strongest character-building ecosystems in the hobby.",
		review_summary:
			"Pathfinder 2e is widely praised for encounter balance, class design, and the sheer amount of meaningful choice in both character building and combat. The recurring caveat is obvious: it asks for commitment, and groups wanting breezier fantasy play may find its structure and rules load more work than they actually want.",
		body_html:
			"<p>Pathfinder 2e matters because it takes structured fantasy play seriously. It is not trying to smooth everything into generic accessibility. The game is built for tables that want their class choices, feat decisions, encounter tactics, and campaign progression to carry real mechanical consequences over time. That clarity of purpose is why it has such a stable audience.</p><h2>Theme and setting</h2><p>The default fantasy frame is broad enough to support many styles, but the emotional center of the game is not setting novelty. It is mastery through structure. The world gives you a place to adventure, but the system's strongest identity comes from how deliberately it turns fantasy roles into tools, options, and responsibilities at the table.</p><h2>How play feels</h2><p>At the table, Pathfinder 2e feels tactical, legible, and rewarding for groups who enjoy thinking about action economy and party interplay. Characters are distinct in play, not only in fiction, and combat asks enough of everyone that success feels earned. Outside combat, progression and customization keep the game feeling like a long-form project.</p><h2>What makes it distinct</h2><p>Its clearest strength is discipline. Pathfinder 2e is one of the few major fantasy games where the structure itself is a selling point. It does not merely allow build depth and tactical play. It actively supports them in a way that many adjacent fantasy systems either avoid or only half-maintain.</p><h2>Where it may not fit</h2><p>Groups who want casual fantasy pacing, ultra-light prep, or improvisational rulings to do most of the work may bounce off Pathfinder 2e's appetite for system attention. It rewards investment, but it does expect it.</p><h2>Bottom line</h2><p>Pathfinder 2e belongs in the directory because it remains one of the strongest choices for tables that want fantasy adventure with real tactical shape, meaningful progression, and enough class definition to make long campaigns feel deliberate.</p>",
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
		combat_focus: 4,
		roleplay_focus: 2,
		tactical_depth: 5,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 1,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want deep character building" },
			{ text: "Tables that enjoy tactical fantasy combat" },
			{ text: "Long campaigns with deliberate progression" },
		],
		avoid_if: [
			{ text: "You want light fantasy onboarding" },
			{ text: "You dislike feat-heavy build decisions" },
			{ text: "You want rulings-first over rules-forward play" },
		],
		why_it_fits:
			"Pathfinder 2e is one of the best directory picks for tables that want fantasy adventure with tactical discipline, strong class identity, and long-term build depth.",
		taxonomies: {
			genre: ["fantasy", "high-fantasy"],
			system: ["d20-system"],
			mechanic: [
				"campaign",
				"character-customization",
				"class-based",
				"tactical-combat",
				"team-based",
			],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			fantasy:
				"Belongs in fantasy because its whole structure is built around long-form heroic adventure, class roles, and dangerous worlds to master.",
			"high-fantasy":
				"A strong high-fantasy pick because power growth, magic, and large-scale heroic capability are part of the game's core promise.",
			"d20-system":
				"Fits the d20 system bucket because it is one of the clearest modern heirs to class-and-level fantasy built around d20 resolution.",
			campaign:
				"Works best as a campaign game because progression, feats, and party development pay off over time.",
			"character-customization":
				"One of the better character-customization picks in the directory because build decisions stay meaningful across many levels.",
			"class-based":
				"Belongs in class-based play because class identity is central to how the game structures roles and advancement.",
			"tactical-combat":
				"A top tactical-combat fantasy choice because encounter play is one of the game's main reasons to exist.",
			"team-based":
				"Fits team-based play because party coordination and role interplay matter constantly in actual play.",
			"rules-medium":
				"Sits at the heavy edge of rules-medium because it has real system appetite without becoming pure simulationist excess.",
		},
		related: [
			{
				slug: "shadowdark",
				description:
					"Pathfinder 2e and ShadowDark both support fantasy adventuring, but Pathfinder 2e is more tactical and build-heavy while ShadowDark is leaner, riskier, and much easier to run on short prep.",
			},
			{
				slug: "dragonbane",
				description:
					"Pathfinder 2e and Dragonbane can both sustain traditional fantasy campaigns, but Pathfinder 2e is denser and more progression-driven while Dragonbane is lighter and more immediately playable.",
			},
			{
				slug: "five-torches-deep",
				description:
					"Pathfinder 2e and Five Torches Deep both speak to players coming from class-and-level fantasy, but Pathfinder 2e is broader and more codified while Five Torches Deep strips things down for leaner dungeon pressure.",
			},
		],
	},
	{
		slug: "pirate-borg",
		title: "Pirate Borg",
		publisher_or_creator: "Limithron",
		website_url: "https://www.limithron.com/pirateborg",
		image_url: "https://www.limithron.com/pirateborg",
		reviews_url: "https://www.limithron.com/pirateborg",
		blurb:
			"Pirate Borg is a dark fantasy pirate RPG about cursed seas, undead threats, and fast, filthy adventure on a doomed black ocean.",
		review_summary:
			"Pirate Borg is usually praised for art direction, usability, and how well it translates Mork Borg energy into a coherent pirate-horror play space. The main warning is tonal: if a table does not want loud presentation, cursed grime, and a very specific vibe, the game can feel more style-forward than inviting.",
		body_html:
			"<p>Pirate Borg works because it understands that pirate fantasy needs dirt, danger, and appetite. It is not trying to give you a neutral naval toolkit. It wants cursed weather, desperate crews, rotting ports, occult threats, and the feeling that the sea itself is actively against you. That focus makes the book feel playable instead of merely decorative.</p><h2>Theme and setting</h2><p>The black-powder pirate frame is already strong, but the game gets its edge from how much horror it lets into the water. This is not a shiny swashbuckler romp. The world is hungry, diseased, and weird, and that gives every island, dock, and voyage a more sinister charge than straightforward adventure piracy usually gets.</p><h2>How play feels</h2><p>At the table, Pirate Borg is fast, hostile, and opportunistic. The strongest sessions feel like bad ideas pursued with conviction: raids, escapes, curses, bargains, mutiny, and survival against the kind of threat that should probably have been left alone. It rewards groups who enjoy improvisation under pressure more than careful procedural mastery.</p><h2>What makes it distinct</h2><p>Its strength is adaptation with purpose. Pirate Borg does not just put pirate nouns on an existing chassis. It turns pirate horror into the actual play texture. The sea, the violence, and the occult all feel like they belong to the same rotten world.</p><h2>Where it may not fit</h2><p>Groups who want polished heroic swashbuckling, low-lethality comfort, or fantasy piracy without horror grime may find Pirate Borg too committed to filth and fatalism. It is better at menace than at clean adventure fantasy.</p><h2>Bottom line</h2><p>Pirate Borg belongs in the directory because it is one of the clearest ways to get cursed pirate adventure on the table fast without sacrificing tone, danger, or personality.</p>",
		min_players: 2,
		max_players: 5,
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
		combat_focus: 3,
		roleplay_focus: 2,
		tactical_depth: 1,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want pirate horror fast" },
			{ text: "Tables happy with grime, curses, and sharp tone" },
			{ text: "Players who like dangerous low-overhead adventure" },
		],
		avoid_if: [
			{ text: "You want upbeat heroic swashbuckling" },
			{ text: "You dislike highly stylized presentation" },
			{ text: "You want dense tactical naval rules" },
		],
		why_it_fits:
			"Pirate Borg is an easy pick for tables that want pirate adventure with cursed horror energy and very little delay between setup and danger.",
		taxonomies: {
			genre: ["dark-fantasy", "horror"],
			system: ["old-school-renaissance-osr"],
			mechanic: ["exploration-driven", "rules-lite", "survival"],
			decision_tag: ["beginner-friendly", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			"dark-fantasy":
				"Belongs in dark fantasy because the game's pirate world is rotten, occult, and openly hostile rather than adventurous in a clean heroic sense.",
			horror:
				"A horror fit because curses, dread, and monstrous sea threats are part of the game's default pressure.",
			"old-school-renaissance-osr":
				"Fits OSR play because danger, speed, and player improvisation matter more than character-ability safety nets.",
			"exploration-driven":
				"Works as exploration-driven play because islands, ports, and the sea itself are built as sources of danger and discovery.",
			"rules-lite":
				"A rules-lite fit because it gets pirate horror moving quickly without heavy procedure.",
			survival:
				"Belongs in survival play because bad conditions, poor odds, and resource pressure are part of the atmosphere and the play loop.",
			"beginner-friendly":
				"A beginner-friendly dark fantasy pick because the premise is easy to explain and the rules load is light.",
			"low-prep":
				"Works well as low-prep pirate adventure because tone and danger do a lot of the setup work for you.",
			"one-shot-friendly":
				"A natural one-shot candidate because cursed raids and doomed voyages land cleanly in short sessions.",
		},
		related: [
			{
				slug: "morkborg",
				description:
					"Pirate Borg and Mork Borg share the same appetite for doom, grime, and velocity, but Pirate Borg gives that energy a much more specific naval and pirate-horror frame.",
			},
			{
				slug: "cairn",
				description:
					"Pirate Borg and Cairn both reward fast rulings and dangerous improvisation, but Cairn is calmer and more stripped down while Pirate Borg is louder, nastier, and much more stylistically aggressive.",
			},
			{
				slug: "shadowdark",
				description:
					"Pirate Borg and ShadowDark both get dangerous fantasy moving quickly, but ShadowDark is cleaner and broader while Pirate Borg is narrower, wetter, and much more committed to cursed pirate filth.",
			},
		],
	},
	{
		slug: "roll-for-shoes",
		title: "Roll for Shoes",
		publisher_or_creator: "Ben Wray",
		website_url: "https://rollforshoes.com/",
		image_url: "https://rollforshoes.com/",
		reviews_url: "https://rollforshoes.com/",
		blurb:
			"Roll for Shoes is a microscopic free RPG where characters start with almost nothing and develop absurdly specific skills entirely through what happens at the table.",
		review_summary:
			"Roll for Shoes is admired for elegance, comedy potential, and how much game it gets from almost no rules at all. The usual caution is straightforward: if a table wants mechanical depth, consistency, or long-term tactical planning, this is intentionally the wrong tool.",
		body_html:
			"<p>Roll for Shoes matters because it proves a game can be tiny without feeling empty. Its six rules are not a gimmick so much as a disciplined answer to a particular question: how little structure do you need before improvisation starts generating play on its own? The answer here is very little, provided the table is willing to meet the game halfway.</p><h2>Theme and setting</h2><p>The game has almost no prescribed setting, and that is part of the design rather than a missing feature. Roll for Shoes is about emergence. The genre, tone, and specific competence of the characters are discovered through play as new skills appear. That makes it unusually good at turning a throwaway premise into a coherent little story.</p><h2>How play feels</h2><p>At the table, Roll for Shoes is fast, funny, and highly reactive. Characters become defined by the weird specificity of what they have accidentally become good at. Sessions gain energy from watching tiny decisions snowball into bizarre expertise trees. The game is best when the group is happy to let nonsense become canon.</p><h2>What makes it distinct</h2><p>Its strongest quality is permissive emergence. Many microgames are light because they cut away play options. Roll for Shoes is light because it invites players to invent the rest through action. That difference is why it remains more replayable than a lot of novelty-sized RPGs.</p><h2>Where it may not fit</h2><p>Groups who want dependable balance, strong GM support for campaign structure, or a rules engine that can absorb serious tactical load will hit its limits quickly. Roll for Shoes is a sharp tool, not a universal one.</p><h2>Bottom line</h2><p>Roll for Shoes belongs in the directory because it is still one of the cleanest demonstrations of how much fun a table can have with almost no system at all, provided the group values invention over control.</p>",
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
		roleplay_focus: 3,
		tactical_depth: 0,
		campaign_depth: 1,
		price_model: "free",
		quickstart_available: 1,
		pdf_available: 0,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Zero-prep and low-commitment sessions" },
			{ text: "Groups that enjoy comedy and improvisation" },
			{ text: "Players curious about extreme minimalism" },
		],
		avoid_if: [
			{ text: "You want tactical combat or build depth" },
			{ text: "You want campaign support from the system" },
			{ text: "You dislike highly emergent tone" },
		],
		why_it_fits:
			"Roll for Shoes is one of the clearest low-prep directory recommendations because it can go from premise to play almost instantly without pretending to be more than it is.",
		taxonomies: {
			mechanic: ["rules-lite", "streamlined"],
			decision_tag: ["beginner-friendly", "free", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			"rules-lite":
				"Belongs in rules-lite because the whole game is built around six tiny rules and the consequences they generate.",
			streamlined:
				"A strong streamlined pick because there is almost no overhead between an idea and a playable session.",
			"beginner-friendly":
				"Exceptionally beginner-friendly because explanation takes minutes and the rules do not fight new players.",
			free: "Fits free games because the complete game is available openly and asks for almost no barrier to entry.",
			"low-prep":
				"One of the clearest low-prep entries in the directory because prep can genuinely be close to zero.",
			"one-shot-friendly":
				"A natural one-shot game because its best form is often a single burst of weird emergent play.",
		},
		related: [
			{
				slug: "goblin-quest",
				description:
					"Roll for Shoes and Goblin Quest both turn failure and absurdity into fuel, but Roll for Shoes is more open-ended and emergent while Goblin Quest is more scenario-shaped and specifically comic.",
			},
			{
				slug: "lasers-and-feelings",
				description:
					"Roll for Shoes and Lasers & Feelings both prove how much a tiny RPG can do, but Lasers & Feelings is cleaner and more genre-bounded while Roll for Shoes is wilder and more improvisational.",
			},
			{
				slug: "ghost-lines",
				description:
					"Roll for Shoes and Ghost Lines are both low-overhead, but Ghost Lines is narrow and atmospheric while Roll for Shoes is deliberately generic and happily chaotic.",
			},
		],
	},
	{
		slug: "sagas-of-the-icelanders",
		title: "Sagas of the Icelanders",
		publisher_or_creator: "Gregor Vuga",
		website_url: "https://gregor-vuga.itch.io/sagas-of-the-icelanders",
		image_url: "https://gregor-vuga.itch.io/sagas-of-the-icelanders",
		reviews_url: "https://gregor-vuga.itch.io/sagas-of-the-icelanders",
		blurb:
			"Sagas of the Icelanders is a historical PbtA game about honor, household pressure, gendered roles, and social survival in medieval Iceland.",
		review_summary:
			"Sagas of the Icelanders is widely respected for thematic clarity and for making domestic, social, and honor-bound conflict feel central rather than secondary. The usual warning is that it asks the table to engage directly with gendered expectations and social constraint, which is exactly the point but not automatically right for every group.",
		body_html:
			"<p>Sagas of the Icelanders stands out because it is willing to treat social structure as the engine of play rather than as background. Medieval Iceland here is not a costume for generic adventuring. It is a world of households, honor, obligation, law, gendered pressure, and survival inside a narrow band of acceptable action. That makes the game unusually specific and unusually effective.</p><h2>Theme and setting</h2><p>The historical frame gives the game its force. Community is small enough that reputation matters, and material hardship is real enough that status, marriage, household labor, and violence all carry visible consequence. The game's strongest quality is that it understands saga conflict is social before it becomes physical.</p><h2>How play feels</h2><p>At the table, Sagas of the Icelanders works best when players want tension born from duty, pride, and conflicting obligations. The drama is often intimate: who speaks for the household, who bears risk, who is heard, who is silenced, and what a person can do when custom narrows every good option. That gives the game a distinctive kind of intensity.</p><h2>What makes it distinct</h2><p>Its clearest distinction is seriousness of focus. Many historical games drift toward generic adventure with a different coat of paint. Sagas of the Icelanders uses history as structure. That is why it remains memorable and also why it asks more of the table than a looser setting game would.</p><h2>Where it may not fit</h2><p>Groups who want escapist heroics, light-touch history, or conflict mostly resolved through tactical combat may find it too socially concentrated. The game gets its strength from restrictions and expectations, not from bypassing them.</p><h2>Bottom line</h2><p>Sagas of the Icelanders belongs in the directory because it offers one of the clearest examples of historical roleplaying where household, law, honor, and gendered pressure are the real drama rather than peripheral detail.</p>",
		min_players: 3,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "MC",
		session_length_minutes_min: 150,
		session_length_minutes_max: 210,
		prep_level: "low",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 3,
		new_gm_friendly: 3,
		combat_focus: 1,
		roleplay_focus: 5,
		tactical_depth: 0,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "high",
		best_for: [
			{ text: "Groups interested in social pressure and honor conflict" },
			{ text: "Tables that want historical texture to matter" },
			{ text: "Players comfortable with character conflict and constrained roles" },
		],
		avoid_if: [
			{ text: "You want combat-driven Viking action" },
			{ text: "You want history only as loose aesthetic" },
			{ text: "You do not want to engage with gendered social expectations in play" },
		],
		why_it_fits:
			"Sagas of the Icelanders is one of the clearest historical-social picks in the directory because it makes household pressure, law, and honor the center of actual play.",
		taxonomies: {
			genre: ["historical", "mythology", "romance"],
			system: ["powered-by-the-apocalypse-pbta"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			historical:
				"Belongs in historical play because the social order and material realities of medieval Iceland are the engine of the game.",
			mythology:
				"Fits mythology because saga culture and belief live close enough to the world to shape behavior and meaning even when human conflict stays central.",
			romance:
				"Works in romance because marriage, desire, and relational obligation are part of the pressure network, not incidental side content.",
			"powered-by-the-apocalypse-pbta":
				"A strong PbtA fit because moves and playbooks are built to create social and emotional pressure rather than tactical simulation.",
			"rules-medium":
				"Sits in rules-medium because the structure matters a lot, even if the system is not numerically heavy.",
		},
		related: [
			{
				slug: "legend-of-the-five-rings",
				description:
					"Sagas of the Icelanders and Legend of the Five Rings both care about honor, obligation, and social constraint, but Sagas is more domestic and historical while L5R is more formal, martial, and fantastical.",
			},
			{
				slug: "wanderhome",
				description:
					"Sagas of the Icelanders and Wanderhome both value community and interpersonal consequence, but Sagas is harsher and conflict-driven while Wanderhome is gentler and more restorative.",
			},
			{
				slug: "the-one-ring",
				description:
					"Sagas of the Icelanders and The One Ring both care about culture shaping action, but The One Ring is mythic adventure while Sagas keeps the drama local, social, and domestic.",
			},
		],
	},
	{
		slug: "blood-borg",
		title: "Blood Borg",
		publisher_or_creator: "World Champ Game Co.",
		website_url: "https://worldchampgameco.itch.io/bloodborg",
		image_url: "https://worldchampgameco.itch.io/bloodborg",
		reviews_url: "https://worldchampgameco.itch.io/bloodborg",
		blurb:
			"Blood Borg is a punk vampire RPG about hunger, mess, and surviving with style in a world that wants the monster and the subculture at the same time.",
		review_summary:
			"Blood Borg tends to get attention for voice, aesthetic commitment, and the way it turns punk-vampire play into something louder and scrappier than polished gothic tragedy. The clear dividing line is tone: if a group wants elegance or restraint, Blood Borg is probably trying too hard in exactly the way its audience wants.",
		body_html:
			"<p>Blood Borg succeeds by understanding that vampire play does not have to be aristocratic to be intense. It pushes the fantasy toward punk mess, appetite, and self-destruction instead of polished immortality. That gives the game a different emotional frequency from more courtly or self-serious vampire RPGs.</p><h2>Theme and setting</h2><p>The strongest part of the game is the collision between subculture and monstrosity. Style matters, but not in the luxury sense. It matters as identity performance, community marker, and survival language. The vampire element stays hungry and ugly enough that the game never becomes pure aesthetic cosplay.</p><h2>How play feels</h2><p>At the table, Blood Borg works best when players want velocity, dirt, and emotional self-sabotage. It is not mainly about respectable undead politics. It is about desire, bodily risk, terrible decisions, and the unstable line between performance and need. The game gets stronger the less the table tries to clean it up.</p><h2>What makes it distinct</h2><p>Its distinction is cultural texture. A lot of vampire games are about power, hierarchy, and secrecy. Blood Borg is more interested in hunger inside scenes of noise, scene-making, style, and collapse. That makes it feel rawer and more immediate than the grander tradition of vampire intrigue.</p><h2>Where it may not fit</h2><p>Groups who want polished political maneuvering, restrained gothic tone, or a more sober supernatural structure may find Blood Borg too loud and too interested in self-inflicted chaos. Its appeal depends on embracing the mess.</p><h2>Bottom line</h2><p>Blood Borg belongs in the directory because it offers a distinct answer to vampire play: punk, ugly, urgent, and more interested in appetite and style pressure than in old-world prestige.</p>",
		min_players: 2,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 2,
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 1,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "high",
		best_for: [
			{ text: "Groups that want punk vampire energy rather than aristocratic intrigue" },
			{ text: "Tables comfortable with hunger, mess, and emotional volatility" },
			{ text: "Players who want style and monstrosity to collide" },
		],
		avoid_if: [
			{ text: "You want elegant gothic restraint" },
			{ text: "You want procedural tactical combat" },
			{ text: "You dislike loud, abrasive presentation" },
		],
		why_it_fits:
			"Blood Borg is a strong horror directory pick for tables that want vampire play to feel punk, ugly, and urgent instead of aristocratic and mannered.",
		taxonomies: {
			genre: ["horror", "urban-fantasy"],
			theme: ["mature"],
			mechanic: ["rules-lite"],
			decision_tag: ["one-shot-friendly"],
		},
		fit_blurbs: {
			horror:
				"Belongs in horror because hunger, bodily need, and bad self-preserving choices are central to the play experience.",
			"urban-fantasy":
				"Fits urban fantasy because subculture, nightlife, and modern social pressure are part of the vampire premise rather than a backdrop.",
			mature:
				"A mature fit because appetite, self-destruction, and emotional volatility are built into the game's actual tone.",
			"rules-lite":
				"Works as rules-lite horror because the game wants tone and bad decisions moving quickly.",
			"one-shot-friendly":
				"A natural one-shot game when the table wants one loud, ugly, memorable vampire disaster.",
		},
		related: [
			{
				slug: "thousand-year-old-vampire",
				description:
					"Blood Borg and Thousand Year Old Vampire both care about what monstrosity does to identity, but Blood Borg is loud, social, and immediate while TYOV is solitary, reflective, and slow-burning.",
			},
			{
				slug: "ihunt",
				description:
					"Blood Borg and iHunt both ground supernatural trouble in contemporary pressure and scene culture, but Blood Borg is about being the mess while iHunt is about getting paid to survive it.",
			},
			{
				slug: "morkborg",
				description:
					"Blood Borg and Mörk Borg share an appetite for grime and aggressive presentation, but Blood Borg turns that energy toward urban vampire punk instead of apocalyptic dark fantasy.",
			},
		],
	},
	{
		slug: "slugblaster",
		title: "Slugblaster: Kickflip Over a Quantum Centipede",
		publisher_or_creator: "Mythworks",
		website_url: "https://slugblaster.com/",
		image_url: "https://slugblaster.com/",
		reviews_url: "https://slugblaster.com/",
		blurb:
			"Slugblaster is a kinetic sci-fi RPG about teenage crews, dimension-hopping hoverboards, and trying to look incredible while reality keeps getting stranger.",
		review_summary:
			"Slugblaster is usually praised for momentum, youth-culture specificity, and how naturally it turns style and feelings into actual play. The main caveat is that it wants buy-in to teenage energy and stunt-forward play; groups looking for detached hard sci-fi or generic adventure will miss the point.",
		body_html:
			"<p>Slugblaster works because it captures the exact feeling of doing something reckless mostly because it will look amazing if it works. The dimensional travel and sci-fi weirdness matter, but the real engine is youth culture: status, scene identity, risk, embarrassment, and the thrill of pulling off something impossible in front of the right people.</p><h2>Theme and setting</h2><p>The game's multiverse is colorful, dangerous, and built to reward motion. Different dimensions are not only places to explore. They are places to style on, get lost in, and fail spectacularly inside. That makes the setting feel less like a neutral science-fiction space and more like a pressure chamber for teenage energy.</p><h2>How play feels</h2><p>At the table, Slugblaster is fast, expressive, and emotionally loud in the best way. It rewards players who want to push scenes forward with swagger, bad judgment, and heart. The strongest sessions balance stunt momentum with the social fallout of being young, visible, and not nearly as in control as the crew wants to seem.</p><h2>What makes it distinct</h2><p>Its clearest strength is that style is not superficial. Reputation, vibes, friendship, and momentum are all part of the game's actual play logic. That lets Slugblaster do youth-focused adventure without flattening the characters into either comedy bits or angst machines.</p><h2>Where it may not fit</h2><p>Groups who want disciplined mission play, low-emotion sci-fi, or adults behaving professionally under pressure may find Slugblaster too adolescent by design. It gains force by committing to that energy, not by sanding it down.</p><h2>Bottom line</h2><p>Slugblaster belongs in the directory because it offers one of the clearest modern examples of kinetic youth-culture RPG design where movement, mood, and friendship all matter as much as the stunt itself.</p>",
		min_players: 3,
		max_players: 5,
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
		roleplay_focus: 4,
		tactical_depth: 1,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want youth-culture sci-fi with momentum" },
			{ text: "Tables that like style, feelings, and risky stunts together" },
			{ text: "Players who want a fast and expressive crew game" },
		],
		avoid_if: [
			{ text: "You want hard sci-fi seriousness" },
			{ text: "You want tactical firefights to dominate play" },
			{ text: "You do not want teenage energy at the center of the game" },
		],
		why_it_fits:
			"Slugblaster is a strong science-fiction pick for tables that want motion, style, and youth-culture stakes to matter as much as the weird dimensions themselves.",
		taxonomies: {
			genre: ["science-fiction"],
			theme: ["cinematic"],
			mechanic: ["narrative-driven", "streamlined", "team-based"],
			decision_tag: ["beginner-friendly", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			"science-fiction":
				"Belongs in science fiction because dimensional travel and unstable worlds are core play material, even if the tone stays youthful and stylish.",
			cinematic:
				"Fits cinematic play because motion, spectacle, and scene energy are part of how the game wants to feel.",
			"narrative-driven":
				"A strong narrative-driven pick because reputation, relationships, and consequence matter as much as any stunt outcome.",
			streamlined:
				"Works as streamlined play because it gets to crew momentum and dimensional trouble quickly.",
			"team-based":
				"Fits team-based play because the whole premise is a crew trying to survive and impress together.",
			"beginner-friendly":
				"A beginner-friendly recommendation because the energy is easy to pitch and the rules do not drag.",
			"low-prep":
				"Works well as low-prep science fiction because the crew dynamic and dimensional setup create momentum fast.",
			"one-shot-friendly":
				"A natural one-shot game when the table wants one big, stylish disaster and the fallout around it.",
		},
		related: [
			{
				slug: "outgunned",
				description:
					"Slugblaster and Outgunned both care about motion and scene payoff, but Slugblaster is youth-culture sci-fi with emotional crash energy while Outgunned is cleaner action-movie competence.",
			},
			{
				slug: "mothership",
				description:
					"Slugblaster and Mothership both send characters into dangerous weird spaces, but Mothership is claustrophobic survival horror while Slugblaster is momentum, style, and teenage recklessness.",
			},
			{
				slug: "wanderhome",
				description:
					"Slugblaster and Wanderhome both take feelings seriously, but Slugblaster is loud, kinetic, and risk-seeking while Wanderhome is gentle, reflective, and intentionally low-conflict.",
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
		`INSERT INTO ec_games (${columns}) VALUES (${values}) ON CONFLICT(slug, locale) DO UPDATE SET status = excluded.status, title = excluded.title, at_a_glance = excluded.at_a_glance, website_url = excluded.website_url, image_url = CASE WHEN ec_games.image_url LIKE 'https://res.cloudinary.com/%' THEN ec_games.image_url ELSE excluded.image_url END, reviews_url = excluded.reviews_url, review_summary = excluded.review_summary, blurb = excluded.blurb, body_html = excluded.body_html, publisher_or_creator = excluded.publisher_or_creator, min_players = excluded.min_players, max_players = excluded.max_players, gm_required = excluded.gm_required, gm_role_label = excluded.gm_role_label, session_length_minutes_min = excluded.session_length_minutes_min, session_length_minutes_max = excluded.session_length_minutes_max, prep_level = excluded.prep_level, one_shot_friendly = excluded.one_shot_friendly, campaign_friendly = excluded.campaign_friendly, solo_friendly = excluded.solo_friendly, beginner_friendly = excluded.beginner_friendly, complexity_score = excluded.complexity_score, new_gm_friendly = excluded.new_gm_friendly, combat_focus = excluded.combat_focus, roleplay_focus = excluded.roleplay_focus, tactical_depth = excluded.tactical_depth, campaign_depth = excluded.campaign_depth, price_model = excluded.price_model, quickstart_available = excluded.quickstart_available, pdf_available = excluded.pdf_available, physical_book_available = excluded.physical_book_available, vtt_ready = excluded.vtt_ready, content_intensity = excluded.content_intensity, best_for = excluded.best_for, avoid_if = excluded.avoid_if, why_it_fits = excluded.why_it_fits, related = excluded.related, publisher_or_creator = excluded.publisher_or_creator, updated_at = excluded.updated_at, published_at = excluded.published_at, deleted_at = NULL;`,
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
			skipped: ["prismatic-wasteland", "sewer-knights", "scumbag-punk-vampire -> blood-borg"],
		},
		null,
		2,
	),
);
