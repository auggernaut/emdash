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
	const backupPath = path.join(backupsDir, `data-${nowStamp()}-pre-g-m-import.db`);
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
		slug: "gamma-world",
		title: "Gamma World",
		publisher_or_creator: "TSR / Wizards of the Coast",
		website_url:
			"https://www.drivethrurpg.com/en/product/249987/gamma-world-rpg-1e?affiliate_id=1659151",
		image_url: "https://www.drivethrurpg.com/en/product/249987/gamma-world-rpg-1e",
		reviews_url:
			"https://www.drivethrurpg.com/en/product/249987/gamma-world-rpg-1e?affiliate_id=1659151",
		blurb:
			"Gamma World is a classic science-fantasy RPG of mutant survivors, ancient tech, and gonzo post-apocalyptic exploration in a world where weirdness is the baseline.",
		review_summary:
			"Gamma World is remembered fondly for wild imagination, mutant chaos, and a setting that encourages discovery over realism. The main reservation in retrospective discussion is that the rules and edition support vary sharply, so the line's energy is often praised more consistently than any single rules chassis.",
		body_html:
			"<p>Gamma World matters because it treats the post-apocalypse as a playground for possibility rather than as a stripped-down realism exercise. Radiation, broken technology, strange societies, and impossible creatures are not merely hazards. They are the point. The game works best when the table wants ruins, relics, and mutant oddity to create curiosity as often as fear.</p><h2>Theme and setting</h2><p>The setting is one of Gamma World's biggest strengths. This is not a grim survival wasteland where scarcity is the only engine. It is a future Earth layered with forgotten science, bizarre evolution, and the wreckage of civilizations nobody fully understands anymore. That gives the game a tone that can swing between danger, wonder, and absurdity without feeling incoherent.</p><h2>How play feels</h2><p>At the table, Gamma World tends to reward groups who like discovery, improvisation, and a willingness to treat the setting as unstable. Characters often survive by adapting to the unexpected rather than by executing polished tactical plans. The best sessions feel exploratory and volatile, with strange artifacts and stranger lifeforms constantly changing what the group thinks the world is.</p><h2>What makes it distinct</h2><p>What keeps Gamma World relevant is that its weirdness is systemic. Mutations, relic tech, and ruined futures are not garnish on top of a conventional adventure game. They are how the game makes every region, faction, and expedition feel unpredictable. That puts it in a very different emotional space from more sober post-apocalyptic RPGs.</p><h2>Where it can lose people</h2><p>Groups that want rigorous setting logic, tonal consistency, or modern mechanical polish may find Gamma World rough in precisely the places longtime fans find charming. It is a game that benefits from embracing the swinginess and not demanding too much neatness from it.</p><h2>Bottom line</h2><p>Gamma World deserves a directory slot because it remains one of tabletop gaming's clearest expressions of gonzo science-fantasy adventure after the end of the world. If the table wants mutant strangeness instead of dour collapse, it still has a strong identity.</p>",
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
			{ text: "Groups who want mutant chaos and strange technology" },
			{ text: "Tables that enjoy exploratory science-fantasy" },
			{ text: "Players who like post-apocalypse with wonder as well as danger" },
		],
		avoid_if: [
			{ text: "You want tightly balanced modern crunch" },
			{ text: "You dislike gonzo tone" },
			{ text: "You want a sober, low-weirdness wasteland" },
		],
		why_it_fits:
			"Gamma World belongs in the directory because it offers a weird, exploratory, unmistakably science-fantasy take on post-apocalyptic play that still stands apart from grimmer survivor games.",
		taxonomies: {
			genre: ["post-apocalyptic", "science-fiction"],
			mechanic: ["exploration-driven", "campaign"],
		},
		fit_blurbs: {
			"post-apocalyptic":
				"Fits post-apocalyptic play when the table wants ruins and collapse filtered through mutant weirdness instead of straight scarcity realism.",
			"science-fiction":
				"Belongs in science fiction because lost technology, altered humanity, and impossible relics define the setting's logic.",
			"exploration-driven":
				"A natural exploration-driven pick because the core pleasure is moving through dangerous unknowns and discovering what the world became.",
			campaign:
				"Works best as a campaign game when you want expeditions, factions, and weird discoveries to accumulate over time.",
		},
		related: [
			{
				slug: "electric-bastionland",
				description:
					"Gamma World and Electric Bastionland both turn strange leftovers and dangerous exploration into adventure fuel, but Gamma World is mutant post-apocalypse while Bastionland is weirder, sparser, and more urban-surreal.",
			},
			{
				slug: "mutant-crawl-classics",
				description:
					"Gamma World and Mutant Crawl Classics both enjoy radioactive oddity and relic-scavenging, but Gamma World is the broader science-fantasy ancestor while MCC leans harder into funnel-era DCC chaos.",
			},
			{
				slug: "mutantyearzero",
				description:
					"Gamma World and Mutant: Year Zero both start from life after collapse, but Gamma World is louder and stranger while Mutant: Year Zero is harsher, more survival-minded, and more focused on scarcity and community.",
			},
		],
	},
	{
		slug: "ghost-lines",
		title: "Ghost Lines",
		publisher_or_creator: "John Harper",
		website_url: "https://johnharper.itch.io/ghost-lines?ac=YUqaLN4pVvG",
		image_url: "https://johnharper.itch.io/ghost-lines?ac=YUqaLN4pVvG",
		reviews_url: "https://johnharper.itch.io/ghost-lines?ac=YUqaLN4pVvG",
		blurb:
			"Ghost Lines is a lean haunted-industrial RPG about train crews, lightning barriers, and dangerous work on the spectral frontier.",
		review_summary:
			"Ghost Lines is generally admired as a small, elegant game with a strong haunted-railroad premise and clear atmospheric identity. The most common limitation noted by players is that it is intentionally slight, so it shines brightest as a focused short-form experience rather than a broad all-purpose campaign chassis.",
		body_html:
			"<p>Ghost Lines succeeds by being narrow on purpose. It knows exactly what kind of labor, danger, and atmosphere it wants on the table: crews running ghost-haunted rail lines through industrial darkness with just enough rules to keep pressure high and motion clean. That specificity is why the game remains memorable despite its size.</p><h2>Theme and setting</h2><p>The industrial haunted-frontier setup does most of the heavy lifting. Trains, barriers, storms, and specters create a world where work itself feels dangerous and a little sacred. The setting's strongest quality is that it feels like a place already under stress. Travel is not neutral. It is the thing that keeps people alive and the thing that can get them killed.</p><h2>How play feels</h2><p>At the table, Ghost Lines is fast, focused, and mission-shaped. Crews take jobs, push through danger, and deal with the practical and supernatural consequences of that work. The game is strongest when the group wants tense scenes, strong atmosphere, and just enough structure to make the hazards matter without drowning the session in procedure.</p><h2>What makes it distinct</h2><p>What makes Ghost Lines stand out is how much setting it gets from so little machinery. It can suggest labor politics, occult infrastructure, and frontier dread with a remarkably light footprint. That efficiency is part of its appeal, especially for groups that want mood without a major onboarding burden.</p><h2>Where it may not land</h2><p>Groups looking for character-build depth, large campaign support, or a lot of tactical texture may find Ghost Lines too lean. It is a specialist game. That is a strength, but only if the table actually wants the thing it specializes in.</p><h2>Bottom line</h2><p>Ghost Lines earns its place by delivering haunted industrial adventure with real focus and almost no wasted motion. If the table wants dangerous jobs on a spectral rail network, it gets there fast and stays there.</p>",
		min_players: 3,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 120,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 0,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 2,
		roleplay_focus: 3,
		tactical_depth: 1,
		campaign_depth: 2,
		price_model: "free",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want haunted mission play" },
			{ text: "Tables that like atmospheric industrial fantasy" },
			{ text: "One-shots with strong premise and low rules drag" },
		],
		avoid_if: [
			{ text: "You want big character-build depth" },
			{ text: "You want a long open campaign chassis" },
			{ text: "You dislike light systems" },
		],
		why_it_fits:
			"Ghost Lines is a strong low-prep recommendation for tables that want haunted work, industrial atmosphere, and a complete mission framework without a lot of system weight.",
		taxonomies: {
			genre: ["gothic", "steampunk", "supernatural"],
			mechanic: ["narrative-driven", "rules-lite", "streamlined", "team-based"],
			decision_tag: ["beginner-friendly", "low-prep", "one-shot-friendly", "free"],
		},
		fit_blurbs: {
			gothic:
				"Fits gothic play through industrial dread, haunted travel, and a world where infrastructure and the supernatural are tangled together.",
			steampunk:
				"Belongs in steampunk because trains, machinery, and dangerous engineered systems are part of the game's actual play texture, not just window dressing.",
			supernatural:
				"A strong supernatural pick because ghosts and occult hazards are central to the work the characters do.",
			"narrative-driven":
				"Works as narrative-driven play because the rules stay light and let premise, danger, and crew decisions carry the session.",
			"rules-lite":
				"Fits rules-lite play because it gets to haunted jobs quickly without much mechanical overhead.",
			streamlined:
				"Belongs in streamlined because it delivers a very specific mission loop with very little wasted procedure.",
			"team-based":
				"Works best as team-based play because the whole premise is built around a crew doing dangerous work together.",
			"beginner-friendly":
				"A good beginner-friendly haunted game because the premise is easy to explain and the rules do not take long to teach.",
			"low-prep":
				"Fits low-prep play because the job structure and haunted-rail premise do most of the setup work for you.",
			"one-shot-friendly":
				"Excellent for one-shots because a single dangerous run can give the table a full arc in one session.",
			free: "Belongs in free because the game is easy to access without asking the table to buy into a big line first.",
		},
		related: [
			{
				slug: "bladesinthedark",
				description:
					"Ghost Lines and Blades in the Dark both care about dangerous crews in haunted industrial worlds, but Ghost Lines is far leaner while Blades is a fuller long-campaign engine.",
			},
			{
				slug: "ladyblackbird",
				description:
					"Ghost Lines and Lady Blackbird both launch fast with strong travel-based atmosphere, but Lady Blackbird is more pulp-romantic while Ghost Lines is more workmanlike and haunted.",
			},
			{
				slug: "those-dark-places",
				description:
					"Ghost Lines and Those Dark Places both use hazardous labor as the engine of play, but Ghost Lines is occult industrial fantasy while Those Dark Places is corporate sci-fi horror.",
			},
		],
	},
	{
		slug: "goblin-quest",
		title: "Goblin Quest",
		publisher_or_creator: "Rowan, Rook and Decard",
		website_url: "https://rowanrookanddecard.com/product/goblin-quest/",
		image_url: "https://rowanrookanddecard.com/product/goblin-quest/",
		reviews_url: "https://rowanrookanddecard.com/product/goblin-quest/",
		blurb:
			"Goblin Quest is a comedic disaster RPG where players burn through bands of tiny goblins pursuing grand plans they are almost guaranteed to ruin.",
		review_summary:
			"Goblin Quest is routinely praised for one-shot comedy, instant table buy-in, and how effectively it turns failure into the game's main fuel. The main caveat is obvious and usually welcomed: if the group wants serious tone or long-term character investment, the whole premise is pointing in the wrong direction.",
		body_html:
			"<p>Goblin Quest works because it does not pretend goblins are failed versions of normal protagonists. They are the engine. The game understands that the fun is in ambition colliding with incompetence, and it builds everything around that collision. The result is a comedy game that feels deliberate rather than disposable.</p><h2>Theme and setting</h2><p>The setting is flexible, but the point is always the same: goblins are small, underprepared, and loudly convinced they can solve a problem nobody sensible would trust them with. That framing makes the tone immediate. It is fantasy, but fantasy tuned for fiasco, slapstick loss, and escalation through bad decisions.</p><h2>How play feels</h2><p>At the table, Goblin Quest is fast, noisy, and wonderfully self-destructive. Players are not protecting a single precious character. They are watching goblin plans collapse and replacing the fallen with the next idiot in line. That changes the emotional rhythm in a useful way: the game invites risk because loss is not a punishment so much as the mechanism that keeps the joke alive.</p><h2>What makes it distinct</h2><p>Many comedy RPGs rely on tone alone. Goblin Quest gets a lot of mileage from structure. Disposable goblin chains, simple objectives, and a built-in expectation of failure all reinforce the same experience. It is funny because the system keeps steering play back toward overreach and collapse.</p><h2>Where it may not fit</h2><p>This is a poor match for groups who want sincere fantasy drama, tactical continuity, or a lot of campaign payoff. Goblin Quest is at its best when everyone accepts that the disaster is the feature, not the thing to be overcome.</p><h2>Bottom line</h2><p>Goblin Quest earns a place in the directory because it is one of the clearest one-shot comedy RPGs available. If the table wants absurd plans, frequent goblin death, and shared delight in spectacular failure, it delivers exactly that.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 0,
		gm_role_label: null,
		session_length_minutes_min: 90,
		session_length_minutes_max: 180,
		prep_level: "none",
		one_shot_friendly: 1,
		campaign_friendly: 0,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 1,
		new_gm_friendly: 5,
		combat_focus: 1,
		roleplay_focus: 4,
		tactical_depth: 1,
		campaign_depth: 1,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "One-shots built around comedy and collapse" },
			{ text: "Tables that want instant buy-in and light rules" },
			{ text: "Players who enjoy disposable character chains" },
		],
		avoid_if: [
			{ text: "You want serious fantasy drama" },
			{ text: "You want long-term campaign continuity" },
			{ text: "You dislike comedy driven by failure" },
		],
		why_it_fits:
			"Goblin Quest is one of the cleanest picks for groups who want a complete comedy RPG night with almost no setup and zero pressure to preserve dignity.",
		taxonomies: {
			genre: ["comedy", "fantasy"],
			mechanic: ["gm-less", "narrative-driven", "streamlined"],
			decision_tag: ["beginner-friendly", "collaborative", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			comedy:
				"Belongs in comedy because the entire system is tuned to turn goblin overconfidence into escalating disaster.",
			fantasy:
				"Fits fantasy, but specifically the slapstick end of it, where goblin schemes matter more than heroic destiny.",
			"gm-less":
				"Works as GM-less play because the game's structure does enough heavy lifting to keep a single-night disaster moving.",
			"narrative-driven":
				"Fits narrative-driven play because the joy comes from shared escalation and scene framing rather than tactical problem-solving.",
			streamlined:
				"Excellent for streamlined play because the game teaches itself quickly and wastes no time getting to the collapse.",
			"beginner-friendly":
				"A strong beginner-friendly party game because the premise is obvious, the rules are light, and failure is part of the fun.",
			collaborative:
				"Belongs in collaborative play because everyone is building the same disaster together rather than protecting private plans.",
			"low-prep":
				"Fits low-prep play because the table can launch into goblin nonsense with almost no setup burden.",
			"one-shot-friendly":
				"Nearly ideal for one-shots because the whole design is built around a single short arc of plans going wrong.",
		},
		related: [
			{
				slug: "crash-pandas",
				description:
					"Goblin Quest and Crash Pandas both thrive on disposable chaos and bad ideas, but Goblin Quest is fantasy failure while Crash Pandas is heist-comedy raccoon nonsense.",
			},
			{
				slug: "fiasco",
				description:
					"Goblin Quest and Fiasco both build toward disaster, but Fiasco is darker and more human while Goblin Quest is broader, sillier, and gleefully disposable.",
			},
			{
				slug: "honey-heist",
				description:
					"Goblin Quest and Honey Heist both deliver fast comedy one-shots, but Honey Heist is cleaner and more premise-joke driven while Goblin Quest gets mileage from repeated small failures.",
			},
		],
	},
	{
		slug: "golden-heroes",
		title: "Golden Heroes",
		publisher_or_creator: "Games Workshop",
		website_url: "https://rpggeek.com/rpgitem/48088/golden-heroes",
		image_url: "https://rpggeek.com/rpgitem/48088/golden-heroes",
		reviews_url: "https://rpggeek.com/rpgitem/48088/golden-heroes",
		blurb:
			"Golden Heroes is a classic British superhero RPG remembered for comic-book energy, colorful powers, and an earnest pre-modern take on supers campaign play.",
		review_summary:
			"Golden Heroes is mostly discussed today as a cult classic: admired for energy, imagination, and its place in superhero RPG history, but also recognized as a dated design that asks players to meet older assumptions halfway. The affection is real, but so is the sense that it belongs to an earlier era of the hobby.",
		body_html:
			"<p>Golden Heroes is valuable less because it feels contemporary and more because it captures a particular era of superhero roleplaying with real conviction. It wants bright powers, comic-book momentum, and characters who feel like they belong on a page rather than inside a grim pseudo-realistic sim. That makes it historically interesting and still playable for the right kind of group.</p><h2>Theme and setting</h2><p>The game's superheroics come out of a time when the genre could still be relatively earnest without being naive. Golden Heroes is less interested in moral rot or prestige-drama deconstruction than in powers, villains, and the problem of how extraordinary people collide with public danger. That gives it a cleaner emotional frame than many later supers designs.</p><h2>How play feels</h2><p>At the table, Golden Heroes tends to feel more comic-book than engineering-project. The game supports colorful capabilities and dramatic action, but it does not chase the same level of build precision as later heavyweight supers systems. That can make it feel brisker and more immediately readable, even when its age shows.</p><h2>What makes it distinct</h2><p>What keeps Golden Heroes worth remembering is that it occupies a middle space between complete simplicity and modern character-construction obsession. It lets superheroics feel broad and expressive without demanding endless tuning. That makes it a useful point of comparison inside the supers lineage.</p><h2>Where it can lose players</h2><p>The obvious drawback is age. Presentation, availability, and mechanical expectations are not aligned with modern onboarding standards. Groups that want a currently supported line or a dense build engine will usually find stronger practical options elsewhere.</p><h2>Bottom line</h2><p>Golden Heroes deserves a place in the directory because it remains a meaningful superhero RPG artifact with a distinct point of view about comic-book play. It is not the default recommendation for everyone, but it is more than a historical footnote.</p>",
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
		tactical_depth: 2,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 0,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Players interested in classic supers history" },
			{ text: "Groups who want bright comic-book tone" },
			{ text: "Tables that do not need modern build density" },
		],
		avoid_if: [
			{ text: "You want an actively supported current line" },
			{ text: "You want deep modern optimization tools" },
			{ text: "You dislike older RPG assumptions" },
		],
		why_it_fits:
			"Golden Heroes is worth keeping in the directory because it shows a distinct, earlier approach to superhero roleplaying that still has personality today.",
		taxonomies: {
			genre: ["superheroes"],
			mechanic: ["campaign", "character-customization", "team-based"],
		},
		fit_blurbs: {
			superheroes:
				"Belongs in superheroes because it is explicitly built around colorful powers, villains, and comic-book scale action.",
			campaign:
				"Works better as a campaign game than a novelty one-shot because its appeal comes from ongoing comic-book identity and episodic supers play.",
			"character-customization":
				"Fits character customization without going as far into engineering-heavy supers design as later games.",
			"team-based":
				"A natural team-based supers game because comic-book ensemble play is part of the expected rhythm.",
		},
		related: [
			{
				slug: "champions",
				description:
					"Golden Heroes and Champions are both classic supers RPGs, but Champions is a much denser construction engine while Golden Heroes aims for more direct comic-book readability.",
			},
			{
				slug: "marvel-super-heroes",
				description:
					"Golden Heroes and Marvel Super Heroes both come from an earlier era of superhero roleplaying, but Marvel is more overtly licensed and archetypal while Golden Heroes has its own British cult identity.",
			},
			{
				slug: "mutants-masterminds",
				description:
					"Golden Heroes and Mutants & Masterminds both support caped campaign play, but M&M is the more modern build-heavy option while Golden Heroes is looser and more historically situated.",
			},
		],
	},
	{
		slug: "ihunt",
		title: "iHunt",
		publisher_or_creator: "Evil Hat Productions",
		website_url: "https://machineage.itch.io/ihunt-the-rpg?ac=YUqaLN4pVvG",
		image_url: "https://evilhat.com/product/ihunt/",
		reviews_url:
			"https://www.drivethrurpg.com/en/product/298255/ihunt-the-rpg?affiliate_id=1659151",
		blurb:
			"iHunt is a modern urban fantasy RPG about gig-economy monster hunting, rent pressure, and surviving a world that is happy to monetize your danger.",
		review_summary:
			"iHunt is usually praised for voice, political sharpness, and the way it fuses monster hunting with debt, precarity, and app-mediated labor. The common split is tonal: groups who want urban fantasy without real-world economic anger may find its focus too pointed to treat as generic supernatural adventure.",
		body_html:
			"<p>iHunt stands out because it knows monster hunting is not enough on its own. Plenty of games can give you claws, guns, and occult threats. iHunt makes the more interesting move of asking who gets forced into that work, who profits from it, and what kind of person signs up to kill horrors because the rent still has to get paid. That angle gives the game its bite.</p><h2>Theme and setting</h2><p>The setting is contemporary enough to feel uncomfortably near. Apps, debt, precarity, and social performance are part of the world rather than modern dressing layered over a traditional supernatural frame. Monsters matter, but so do landlords, gigs, and the constant pressure to survive in public. That makes the game's urban fantasy feel materially grounded.</p><h2>How play feels</h2><p>At the table, iHunt works best when players are interested in both the hunt and the life around it. Sessions are not just about tracking down threats. They are also about compromise, burnout, mutual aid, and what the work is doing to the people who keep taking it. The action can absolutely be loud, but the social pressure is where the game gets its identity.</p><h2>What makes it distinct</h2><p>What makes iHunt memorable is not simply topicality. It is the way topicality shapes the entire proposition. This is not a neutral monster-hunting sandbox. It has an opinion about labor, money, and modern exploitation, and that opinion is what keeps the supernatural from feeling generic.</p><h2>Where it may not fit</h2><p>Groups that want apolitical monster punching or urban fantasy with very little real-world friction may find iHunt too intentional. It is not trying to disappear into comfort play. The game gets stronger when the table wants its anger as part of the package.</p><h2>Bottom line</h2><p>iHunt belongs in the directory because it offers one of the sharper modern urban fantasy premises around. If the table wants monster hunting with rent, class pressure, and app-era cynicism fully baked in, it has a real reason to exist.</p>",
		min_players: 2,
		max_players: 5,
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
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 2,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "high",
		best_for: [
			{ text: "Groups that want pointed modern urban fantasy" },
			{ text: "Players interested in class pressure and monster hunting" },
			{ text: "Campaigns where social life matters as much as the hunt" },
		],
		avoid_if: [
			{ text: "You want apolitical supernatural action" },
			{ text: "You want fantasy distance from the modern world" },
			{ text: "You dislike real-world precarity as play material" },
		],
		why_it_fits:
			"iHunt is a clear recommendation for tables that want urban fantasy to say something about work, money, and survival instead of only serving as monster-fighting backdrop.",
		taxonomies: {
			genre: ["modern", "supernatural", "urban-fantasy"],
			theme: ["mature", "political"],
			mechanic: ["investigation", "narrative-driven", "team-based"],
		},
		fit_blurbs: {
			modern:
				"Belongs in modern because the game's premise depends on apps, debt, and recognizably contemporary forms of work and survival.",
			supernatural:
				"Fits supernatural play because monsters are part of everyday economic reality rather than hidden folklore off to the side.",
			"urban-fantasy":
				"A strong urban fantasy pick because the city, the gig economy, and the occult all operate inside the same lived social space.",
			mature:
				"Belongs in mature because it treats labor, exploitation, and compromise as central play material rather than background mood.",
			political:
				"Fits political play because the game has an explicit point of view about class pressure, money, and who absorbs risk.",
			investigation:
				"Works for investigation because tracking and understanding threats is part of the job structure that drives play.",
			"narrative-driven":
				"Belongs in narrative-driven play because character pressures and social context matter as much as the actual fight scenes.",
			"team-based":
				"A good team-based urban fantasy game because hunters survive through shared work, not lone-wolf posture.",
		},
		related: [
			{
				slug: "city-of-mist",
				description:
					"iHunt and City of Mist both use modern supernatural cities to create pressure, but City of Mist is more noir-mythic while iHunt is more materially grounded and politically angry.",
			},
			{
				slug: "urbanshadows",
				description:
					"iHunt and Urban Shadows both care about urban supernatural power, but Urban Shadows is more factional and intrigue-driven while iHunt keeps gig labor and monster work in the foreground.",
			},
			{
				slug: "blade-runner",
				description:
					"iHunt and Blade Runner both use compromised modernity to pressure characters, but Blade Runner is future-noir investigation while iHunt is present-day monster hunting under economic strain.",
			},
		],
	},
	{
		slug: "legacy-life-among-the-ruins",
		title: "Legacy: Life Among the Ruins",
		publisher_or_creator: "UFO Press",
		website_url: "https://ufopress.co.uk/product/legacy-life-among-the-ruins-2nd-edition/",
		image_url: "https://ufopress.co.uk/product/legacy-life-among-the-ruins-2nd-edition/",
		reviews_url: "https://ufopress.co.uk/product/legacy-life-among-the-ruins-2nd-edition/",
		blurb:
			"Legacy: Life Among the Ruins is a post-apocalyptic generational RPG about communities, bloodlines, and the long consequences of what survivors build after collapse.",
		review_summary:
			"Legacy is usually praised for generational scope, family-level play, and how effectively it turns community decisions into campaign history. The common friction point is that it asks players to care about institutions and time jumps as much as individual scenes, which is not every table's preferred scale.",
		body_html:
			"<p>Legacy matters because it treats the future after collapse as something people have to build, inherit, and eventually hand off. That changes the whole shape of play. The game is not mainly about surviving today's crisis. It is about what today's compromises become a generation later, and what kind of world a family or faction leaves behind.</p><h2>Theme and setting</h2><p>The post-apocalyptic setting is important, but Legacy's real subject is continuity. Ruins matter because somebody has to live among them long enough to turn them into history. The game cares about settlements, factions, obligations, and the way scarcity or ambition reshapes communities over time. That gives it a scale few apocalypse games even try for.</p><h2>How play feels</h2><p>At the table, Legacy feels wider and more strategic than many character-first RPGs. Individual characters still matter, but they matter inside family lines and social structures that outlast them. Sessions often gain force from seeing how one generation's choices become the next generation's problems, advantages, and myths. That can be deeply satisfying for tables that like historical consequence.</p><h2>What makes it distinct</h2><p>Its strongest quality is that it turns institutions into primary play material. Many games treat communities as background. Legacy gives them enough weight that they become just as important as personal drama. That makes it unusually good at stories about succession, inheritance, and long-term rebuilding.</p><h2>Where it may not fit</h2><p>Groups that want to inhabit one protagonist for a long time, or who prefer all stakes to stay immediate and scene-level, may find the generational frame distancing. Legacy asks the table to value time jumps and communal outcomes, not just moment-to-moment identity.</p><h2>Bottom line</h2><p>Legacy belongs in the directory because it remains one of the clearest answers to the question of what happens after survival. If the table wants post-apocalyptic play with history, families, and institutions at the center, it offers something genuinely distinct.</p>",
		min_players: 3,
		max_players: 5,
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
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 2,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups interested in generational campaigns" },
			{ text: "Players who like community and faction play" },
			{ text: "Post-apocalyptic tables that want rebuilding, not only survival" },
		],
		avoid_if: [
			{ text: "You want one fixed protagonist all campaign" },
			{ text: "You dislike time jumps" },
			{ text: "You want apocalypse play to stay small-scale and immediate" },
		],
		why_it_fits:
			"Legacy is one of the best directory picks for tables that want a post-apocalyptic campaign to track bloodlines, communities, and the long shadow of reconstruction.",
		taxonomies: {
			genre: ["post-apocalyptic"],
			mechanic: ["campaign", "collaborative-worldbuilding", "narrative-driven", "team-based"],
			system: ["powered-by-the-apocalypse-pbta"],
			decision_tag: ["collaborative"],
		},
		fit_blurbs: {
			"post-apocalyptic":
				"Belongs in post-apocalyptic play because it is interested in what survivors build among ruins, not just how they scrape through the next day.",
			campaign:
				"A top campaign choice because the whole structure depends on long horizons, generational change, and accumulated consequence.",
			"collaborative-worldbuilding":
				"Fits collaborative worldbuilding because families, communities, and the shape of the setting emerge through shared authorship over time.",
			"narrative-driven":
				"Belongs in narrative-driven play because social consequence and historical change matter more than tactical encounter engineering.",
			"team-based":
				"Works as team-based play because characters and families are always operating inside larger group structures.",
			"powered-by-the-apocalypse-pbta":
				"A strong PbtA-adjacent recommendation because it uses move-driven play to support consequence and pressure while scaling upward into community history.",
			collaborative:
				"Belongs in collaborative play because the table is jointly responsible for how generations, factions, and the world evolve.",
		},
		related: [
			{
				slug: "dream-askew",
				description:
					"Legacy and Dream Askew both care about community under pressure, but Dream Askew stays intimate and scene-level while Legacy zooms out to families and generations.",
			},
			{
				slug: "apocalypseworld",
				description:
					"Legacy and Apocalypse World both descend from post-collapse narrative play, but Apocalypse World is immediate and personal while Legacy is broader, slower, and institution-focused.",
			},
			{
				slug: "fellowship",
				description:
					"Legacy and Fellowship both care about shared purpose, but Fellowship is an ensemble quest game while Legacy is more about inheritance, factions, and long-term rebuilding.",
			},
		],
	},
	{
		slug: "legend-of-the-five-rings",
		title: "Legend of the Five Rings",
		publisher_or_creator: "Edge Studio / Fantasy Flight Games",
		website_url: "https://www.edge-studio.net/games/legend-of-the-five-rings/",
		image_url: "https://www.edge-studio.net/games/legend-of-the-five-rings/",
		reviews_url: "https://www.edge-studio.net/games/legend-of-the-five-rings/",
		blurb:
			"Legend of the Five Rings is a samurai fantasy RPG of duty, honor, courtly pressure, and violence in a mythic version of Rokugan.",
		review_summary:
			"Legend of the Five Rings is consistently praised for strong setting identity, social tension, and the way etiquette and duty shape play as much as combat. The usual split comes from buy-in: groups who do not want the constraints of honor, hierarchy, and custom dice often bounce where committed tables find the real appeal.",
		body_html:
			"<p>Legend of the Five Rings works because it understands samurai fantasy is not just about sword technique or clan colors. It is about obligation. Characters are constantly negotiating what they owe, what they want, and what they can afford to be seen doing. That pressure is what gives the game its identity and what keeps Rokugan from feeling like generic fantasy with lacquered armor.</p><h2>Theme and setting</h2><p>Rokugan is one of the game's biggest assets because the setting is not shy about values, ceremony, and hierarchy. Clan politics, social rules, spiritual danger, and warfare all exist together inside a world where public behavior matters. That makes almost every scene a potential social test, not just every duel. The result is a setting where etiquette has real weight.</p><h2>How play feels</h2><p>At the table, Legend of the Five Rings tends to alternate between conversation, courtly tension, travel, ritual, and bursts of decisive violence. The game is strongest when the group enjoys consequences that begin before the swords come out. A bad answer in court can matter as much as a bad strike in a duel. That gives the whole campaign a sense of constant pressure.</p><h2>What makes it distinct</h2><p>What keeps L5R distinctive is how fully it commits to social form. Many fantasy games say status matters. This one builds it into the emotional economy of play. Shame, loyalty, appearance, and inner conflict are not secondary flavor; they are part of the engine that drives scenes forward.</p><h2>Where it may not fit</h2><p>Tables that want unconstrained adventuring, low-friction character freedom, or fantasy without rigid social codes may find the whole setup too restrictive. Legend of the Five Rings gets better when players treat those constraints as dramatic material instead of obstacles to ignore.</p><h2>Bottom line</h2><p>Legend of the Five Rings deserves a directory slot because it remains one of the strongest fantasy RPGs for groups who want politics, ritual, and inner conflict to matter as much as combat. If the table wants duty with the swordplay, it still has unusual power.</p>",
		min_players: 3,
		max_players: 5,
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
		roleplay_focus: 5,
		tactical_depth: 3,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "medium",
		best_for: [
			{ text: "Groups that want samurai drama and court pressure" },
			{ text: "Players interested in duty, honor, and political conflict" },
			{ text: "Campaigns where etiquette matters as much as swordplay" },
		],
		avoid_if: [
			{ text: "You want socially unconstrained fantasy adventuring" },
			{ text: "You dislike formal hierarchy as play material" },
			{ text: "You do not want custom-dice style friction" },
		],
		why_it_fits:
			"Legend of the Five Rings belongs in the directory because it offers one of the clearest fantasy RPG experiences where politics, ritual, and personal duty are inseparable from adventure.",
		taxonomies: {
			genre: ["fantasy", "historical", "mythology", "non-western"],
			theme: ["political", "social-intrigue"],
			mechanic: ["campaign", "narrative-driven", "skill-based"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			fantasy:
				"Belongs in fantasy, but one where culture, status, and ritual matter at least as much as monsters and swords.",
			historical:
				"Fits historical play through its deliberate use of courtly form, martial codes, and a strongly period-inflected social order.",
			mythology:
				"Belongs in mythology and folklore because spirits, ancestors, and cosmological order are built directly into the setting's assumptions.",
			"non-western":
				"A clear non-western fantasy recommendation because the game's setting and social structure are not built on default Eurofantasy assumptions.",
			political:
				"Fits political play because clan interests, duty, and power relations are always shaping what characters can safely do.",
			"social-intrigue":
				"Belongs in social intrigue because courts, reputation, and public conduct can decide outcomes before combat starts.",
			campaign:
				"Works best as a campaign game because the tensions of loyalty, status, and clan conflict deepen over sustained play.",
			"narrative-driven":
				"Belongs in narrative-driven play because character obligation and emotional conflict do as much work as the action system.",
			"skill-based":
				"Fits skill-based fantasy because who a samurai is trained to be matters strongly in both court and conflict.",
			"rules-medium":
				"Sits in rules-medium because it carries meaningful mechanical structure without becoming a pure optimization game.",
		},
		related: [
			{
				slug: "mouse-guard",
				description:
					"Legend of the Five Rings and Mouse Guard both care about duty and service, but L5R is more courtly, hierarchical, and politically sharp while Mouse Guard is warmer and mission-framed.",
			},
			{
				slug: "ars-magica",
				description:
					"Legend of the Five Rings and Ars Magica both build fantasy around institutions and social position, but Ars Magica is about scholarship and covenants while L5R is about honor, status, and clan obligation.",
			},
			{
				slug: "mage-the-awakening",
				description:
					"Legend of the Five Rings and Mage: The Awakening both give power a social and philosophical cost, but Mage is modern and occult while L5R is formal, feudal, and clan-bound.",
			},
		],
	},
	{
		slug: "lumen",
		title: "LUMEN",
		publisher_or_creator: "Gila RPGs",
		website_url: "https://gilarpgs.itch.io/lumen?ac=YUqaLN4pVvG",
		image_url: "https://gilarpgs.itch.io/lumen?ac=YUqaLN4pVvG",
		reviews_url: "https://gilarpgs.itch.io/lumen?ac=YUqaLN4pVvG",
		blurb:
			"LUMEN is a fast power-fantasy action RPG chassis built for flashy abilities, aggressive momentum, and missions that resolve with minimal downtime.",
		review_summary:
			"LUMEN is generally appreciated for speed, clarity, and the way it delivers high-powered action without much drag. The main caution is that it is intentionally narrow: people who want richer setting texture or slower campaign accumulation often treat it as a great chassis rather than a complete all-purpose game.",
		body_html:
			"<p>LUMEN is useful because it knows not every action-heavy RPG needs a giant progression tower or a lot of simulation weight behind it. Its real promise is speed: get a crew on the table, give them exciting powers, point them at a mission, and let the game stay in motion. That makes it attractive for tables that want momentum more than system archaeology.</p><h2>What kind of game it is</h2><p>LUMEN is best understood as a focused action chassis. It wants power fantasy, clear roles, and encounters that move quickly. The experience is less about discovering subtle social consequences and more about cutting directly to ability use, energy, and mission completion. That makes the game feel intentionally game-forward in a productive way.</p><h2>How play feels</h2><p>At the table, LUMEN is usually brisk and kinetic. Characters are competent, scenes resolve with purpose, and the system wants players to use their tools aggressively rather than hoard them. The result is a game that can deliver satisfying bursts of action without asking the table to spend an hour building toward the first real fight.</p><h2>What makes it distinct</h2><p>What keeps LUMEN distinctive is that it treats velocity as a design principle. Many rules-light games become vague when they simplify. LUMEN instead stays pointed: powers should feel fun, turns should keep moving, and the whole experience should preserve the pleasure of pushing forward.</p><h2>Where it may not fit</h2><p>Groups that want deep campaign consequence, a strongly authored default setting, or a lot of non-combat procedural support may find LUMEN too specialized. It is best judged as an action delivery system, not as a universal roleplaying answer.</p><h2>Bottom line</h2><p>LUMEN belongs in the directory because it offers a very efficient answer to the question of how little system you need to support satisfying high-powered action. If the table wants pace, abilities, and mission energy, it does the job cleanly.</p>",
		min_players: 2,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "GM",
		session_length_minutes_min: 90,
		session_length_minutes_max: 180,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 0,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 2,
		new_gm_friendly: 4,
		combat_focus: 5,
		roleplay_focus: 2,
		tactical_depth: 3,
		campaign_depth: 2,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 0,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want fast power-fantasy combat" },
			{ text: "Tables that prefer momentum over heavy rules scaffolding" },
			{ text: "Short mission-based play with flashy abilities" },
		],
		avoid_if: [
			{ text: "You want slow-burn campaign depth" },
			{ text: "You want a richly fixed default setting" },
			{ text: "You want social play to dominate the session" },
		],
		why_it_fits:
			"LUMEN is a clean recommendation for tables that want mission-driven action, high competence, and a system that stays light without becoming shapeless.",
		taxonomies: {
			genre: ["science-fiction"],
			theme: ["cinematic"],
			mechanic: ["rules-lite", "streamlined", "tactical-combat", "team-based"],
			decision_tag: ["beginner-friendly", "low-prep", "one-shot-friendly"],
		},
		fit_blurbs: {
			"science-fiction":
				"Belongs in science fiction because its power-fantasy missions are usually framed through gear, tech, and future-facing action logic.",
			cinematic:
				"Fits cinematic play because the system is built to keep energy high and abilities visible rather than simulate every edge case.",
			"rules-lite":
				"A strong rules-lite action game because it gets to the fun fast without dissolving into vagueness.",
			streamlined:
				"Belongs in streamlined because the entire design is tuned around velocity and low drag.",
			"tactical-combat":
				"Fits tactical combat at a lighter scale because positioning and abilities matter, but the game refuses to bog down in heavy procedure.",
			"team-based":
				"Works as team-based action because the mission frame assumes a group using distinct roles together.",
			"beginner-friendly":
				"A good beginner-friendly action game because it teaches fast and gets players to their abilities quickly.",
			"low-prep":
				"Fits low-prep play because mission structure and power fantasy do most of the table-facing work immediately.",
			"one-shot-friendly":
				"Strong for one-shots because a full action arc can resolve cleanly in a single mission night.",
		},
		related: [
			{
				slug: "arc-doom-tabletop-rpg",
				description:
					"LUMEN and ARC both want fast, ability-forward action, but LUMEN is more chassis-like and power-fantasy driven while ARC leans harder into doom pressure and escalation.",
			},
			{
				slug: "stoneburner",
				description:
					"LUMEN and Stoneburner both support compact mission play, but Stoneburner is more dwarven sci-fi flavor and stress pressure while LUMEN is cleaner, broader action design.",
			},
			{
				slug: "death-in-space",
				description:
					"LUMEN and Death in Space both operate in science-fiction territory, but Death in Space is grimier and survival-minded while LUMEN is more overtly about competence and momentum.",
			},
		],
	},
	{
		slug: "mage-the-awakening",
		title: "Mage: The Awakening",
		publisher_or_creator: "Onyx Path / White Wolf",
		website_url:
			"https://www.drivethrurpg.com/en/product/181754/mage-the-awakening-second-edition?affiliate_id=1659151",
		image_url: "https://www.drivethrurpg.com/en/product/181754/mage-the-awakening-second-edition",
		reviews_url:
			"https://www.drivethrurpg.com/en/product/181754/mage-the-awakening-second-edition?affiliate_id=1659151",
		blurb:
			"Mage: The Awakening is a modern occult RPG about willworkers, hidden orders, and dangerous magic that reshapes reality through knowledge and obsession.",
		review_summary:
			"Mage: The Awakening is widely respected for magical scope, occult depth, and a setting that lets philosophy, conspiracy, and supernatural danger feed one another. The common warning is that the same breadth that makes it powerful also makes it demanding, especially for groups that do not want to negotiate flexible magic and dense setting assumptions.",
		body_html:
			"<p>Mage: The Awakening is one of the stronger modern occult RPGs because it understands magic should change how a player thinks, not just what powers appear on a character sheet. The game is at its best when the table treats knowledge, symbolism, and metaphysical structure as active play material instead of as lore wallpaper around a monster-of-the-week loop.</p><h2>Theme and setting</h2><p>The modern setting matters because Awakening wants secret knowledge to live beneath ordinary life rather than apart from it. Orders, hidden wars, mystical paradigms, and compromised institutions all coexist with the everyday world. That creates a useful friction: characters are enlightened in one sense and trapped in another. The city, the occult, and the political order all press on the same people.</p><h2>How play feels</h2><p>At the table, Mage is often a game of investigation, debate, paranoia, and carefully chosen acts of power. Magic can solve problems, but it also creates new ones: ideological conflict, magical backlash, and attention from forces the characters may not fully understand. The best sessions usually balance mystery and ambition rather than choosing only one.</p><h2>What makes it distinct</h2><p>The standout feature is the scope of its magic. Awakening gives players a lot of expressive room, and that freedom can make the world feel intellectually alive in a way narrower spell lists cannot. The game works because it ties that power to schools, orders, doctrines, and the cost of trying to understand too much.</p><h2>Where it may not fit</h2><p>Groups that want tight power boundaries, low-lore onboarding, or a magic system that resolves quickly and cleanly every time may find Mage exhausting. It is a game that rewards engagement, but it absolutely expects it in return.</p><h2>Bottom line</h2><p>Mage: The Awakening earns its directory space because it offers one of the richer modern magic campaigns available. If the table wants occult politics, expressive spellwork, and reality-bending power with real conceptual weight, it still stands out.</p>",
		min_players: 2,
		max_players: 5,
		gm_required: 1,
		gm_role_label: "Storyteller",
		session_length_minutes_min: 180,
		session_length_minutes_max: 240,
		prep_level: "high",
		one_shot_friendly: 0,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 0,
		complexity_score: 5,
		new_gm_friendly: 1,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 2,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "high",
		best_for: [
			{ text: "Groups that want rich occult modern fantasy" },
			{ text: "Players who enjoy flexible, idea-heavy magic" },
			{ text: "Campaigns about secret orders, philosophy, and dangerous knowledge" },
		],
		avoid_if: [
			{ text: "You want low-lore onboarding" },
			{ text: "You want tightly bounded spell lists only" },
			{ text: "You want your supernatural game to stay light and breezy" },
		],
		why_it_fits:
			"Mage: The Awakening is one of the clearest recommendations for tables that want urban occult play with ambitious magic and a lot of conceptual room.",
		taxonomies: {
			genre: ["horror", "modern", "supernatural", "urban-fantasy"],
			theme: ["mature", "political", "psychological"],
			mechanic: ["campaign", "character-customization", "investigation", "narrative-driven"],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			horror:
				"Belongs in horror because knowledge, power, and reality manipulation all come with existential pressure and the risk of terrible consequences.",
			modern:
				"Fits modern play because hidden magical orders and supernatural politics operate beneath recognizably contemporary life.",
			supernatural:
				"A clear supernatural recommendation because the entire premise turns on mages navigating forces beyond ordinary reality.",
			"urban-fantasy":
				"Belongs in urban fantasy because cities, secret societies, and magical subcultures all matter directly to play.",
			mature:
				"Fits mature play because the game leans hard on obsession, power, ideology, and the consequences of knowing too much.",
			political:
				"Belongs in political play because occult institutions, factional interests, and hidden power constantly shape decisions.",
			psychological:
				"Fits psychological play because awakening to power changes how characters see reality, control, and themselves.",
			campaign:
				"Works best as a campaign game because magical ambition, investigation, and faction pressure deepen over time.",
			"character-customization":
				"Belongs in character customization because magical focus, order identity, and style of practice strongly differentiate mages.",
			investigation:
				"A strong investigation game because mysteries, occult causes, and hidden structures drive a lot of session energy.",
			"narrative-driven":
				"Fits narrative-driven play because ideas, consequences, and character ambition matter as much as simple tactical outcomes.",
			"rules-medium":
				"Sits in rules-medium, edging upward, because it asks for real rules and lore engagement without being a pure tactical engine.",
		},
		related: [
			{
				slug: "ars-magica",
				description:
					"Mage: The Awakening and Ars Magica both care deeply about what magic means, but Ars Magica is scholarly medieval fantasy while Awakening is urban occult modernity.",
			},
			{
				slug: "city-of-mist",
				description:
					"Mage: The Awakening and City of Mist both explore hidden power in modern cities, but City of Mist is noir-mythic and lighter while Mage is denser, broader, and more occult-philosophical.",
			},
			{
				slug: "legend-of-the-five-rings",
				description:
					"Mage: The Awakening and Legend of the Five Rings both tie power to social order and inner conflict, but Mage is modern occult politics while L5R is feudal samurai drama.",
			},
		],
	},
	{
		slug: "marvel-heroic-roleplaying",
		title: "Marvel Heroic Roleplaying",
		publisher_or_creator: "Margaret Weis Productions",
		website_url: "https://rpggeek.com/rpgitem/126955/marvel-heroic-roleplaying-basic-game",
		image_url: "https://rpggeek.com/rpgitem/126955/marvel-heroic-roleplaying-basic-game",
		reviews_url: "https://rpggeek.com/rpgitem/126955/marvel-heroic-roleplaying-basic-game",
		blurb:
			"Marvel Heroic Roleplaying is a fast ensemble superhero RPG built to feel like a big crossover comic event rather than a slow character-build exercise.",
		review_summary:
			"Marvel Heroic Roleplaying is widely remembered with affection for capturing team-book energy, fast scene framing, and the feel of comic arcs in motion. The persistent downside is practical rather than conceptual: it is out of print, and players who want durable long-line support often end up looking elsewhere despite the system's strong reputation.",
		body_html:
			"<p>Marvel Heroic Roleplaying works because it aims at comic-book momentum instead of superhero engineering. It does not ask the table to spend most of its time tuning exact build math. It wants scenes, team-ups, escalating complications, and the sense that each issue of the campaign is part of a larger event. That focus gives it a lot of energy even years after the line ended.</p><h2>Theme and setting</h2><p>The Marvel setting obviously matters, but what really matters is that the game understands how ensemble superhero fiction breathes. Public crises, interpersonal friction, dramatic team compositions, and fast-moving arc structure all feel central. The system is tuned to the social and narrative rhythm of a crossover title, not just the presence of licensed characters.</p><h2>How play feels</h2><p>At the table, Marvel Heroic is usually quick, expressive, and scene-driven. Characters feel distinct without needing giant construction procedures, and the game makes it easy to cut between action, drama, and escalating stakes. That gives the whole session a sense of movement many crunchier supers games deliberately trade away.</p><h2>What makes it distinct</h2><p>Its biggest advantage is ensemble handling. Many superhero RPGs can do powers. Fewer are this good at making a group of iconic personalities feel like a comic issue in motion. The system likes complications, momentum swings, and spotlight shifts, which is exactly why so many people still talk about it fondly.</p><h2>Where it may not fit</h2><p>Players who love detailed build mini-games or want an actively supported supers line may find Marvel Heroic frustrating, either because of what it does not care about or because of its availability. It is a brilliant fit for a certain play style, not the permanent default for every superhero table.</p><h2>Bottom line</h2><p>Marvel Heroic Roleplaying deserves a place in the directory because it remains one of the strongest licensed superhero RPGs for tables that want pace, personality, and crossover-book energy. It is still a useful recommendation if the table cares more about comic rhythm than build density.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "Watcher",
		session_length_minutes_min: 150,
		session_length_minutes_max: 240,
		prep_level: "low",
		one_shot_friendly: 1,
		campaign_friendly: 1,
		solo_friendly: 0,
		beginner_friendly: 1,
		complexity_score: 3,
		new_gm_friendly: 4,
		combat_focus: 3,
		roleplay_focus: 4,
		tactical_depth: 2,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 0,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want ensemble comic-book pacing" },
			{ text: "Players who care about team dynamics and spotlight shifts" },
			{ text: "Supers tables that value rhythm over build complexity" },
		],
		avoid_if: [
			{ text: "You want an actively supported current line" },
			{ text: "You want dense character-construction play" },
			{ text: "You want supers combat to feel highly tactical" },
		],
		why_it_fits:
			"Marvel Heroic remains a standout recommendation for tables that want licensed superhero play to feel like a fast-moving event comic instead of a point-build project.",
		taxonomies: {
			genre: ["superheroes"],
			theme: ["cinematic"],
			mechanic: ["character-customization", "narrative-driven", "streamlined", "team-based"],
			decision_tag: ["beginner-friendly", "licensed", "one-shot-friendly"],
		},
		fit_blurbs: {
			superheroes:
				"Belongs in superheroes because everything about the game is built around ensemble capes, powers, and escalating public stakes.",
			cinematic:
				"A strong cinematic supers game because the system is tuned for issue-style momentum and dramatic scene turns.",
			"character-customization":
				"Fits character differentiation without demanding the heavy engineering work of more build-dense superhero systems.",
			"narrative-driven":
				"Belongs in narrative-driven play because complications, relationships, and scene energy matter as much as raw stats.",
			streamlined:
				"Works as streamlined supers because it gets characters into action fast without a lot of overhead.",
			"team-based":
				"A great team-based superhero game because crossover-book dynamics are part of its strongest design instincts.",
			"beginner-friendly":
				"Beginner-friendly for supers tables that want to feel like comics quickly instead of learning a giant construction engine first.",
			licensed:
				"Belongs in licensed play because much of its power comes from how directly it embraces Marvel's ensemble comic rhythm.",
			"one-shot-friendly":
				"Strong for one-shots because a full event-book arc can come together in a single fast-moving session.",
		},
		related: [
			{
				slug: "mutants-masterminds",
				description:
					"Marvel Heroic Roleplaying and Mutants & Masterminds both support superhero teams, but M&M is more build-driven while Marvel Heroic is faster and more comic-issue shaped.",
			},
			{
				slug: "champions",
				description:
					"Marvel Heroic and Champions both do supers, but Champions treats powers as construction problems while Marvel Heroic treats them as engines for scene energy and crossover drama.",
			},
			{
				slug: "marvel-super-heroes",
				description:
					"Marvel Heroic and Marvel Super Heroes both aim at licensed Marvel action, but Heroic is far more modern and event-comic driven while MSH is simpler and more archetypal.",
			},
		],
	},
	{
		slug: "marvel-super-heroes",
		title: "Marvel Super Heroes",
		publisher_or_creator: "TSR",
		website_url: "https://rpggeek.com/rpgitem/45812/marvel-super-heroes",
		image_url: "https://rpggeek.com/rpgitem/45812/marvel-super-heroes",
		reviews_url: "https://rpggeek.com/rpgitem/45812/marvel-super-heroes",
		blurb:
			"Marvel Super Heroes is the classic FASERIP superhero RPG, built for colorful powers, recognizable comics action, and a fast-moving older-school take on caped adventure.",
		review_summary:
			"Marvel Super Heroes is still widely remembered as one of the friendlier classic supers games, especially for how quickly it got powers and comic-book action onto the table. The usual caveat is historical age: its charm is tied to simplicity and period identity, which means players expecting modern support or deep customization often move on after the nostalgia glow.",
		body_html:
			"<p>Marvel Super Heroes remains relevant because it proves superhero roleplaying does not have to begin with a massive engineering exercise. The FASERIP framework is part of why the game is still remembered so warmly: it gives the table a clear, expressive way to think about powers and outcomes without getting lost in build complexity. That makes it one of the more approachable classic supers designs.</p><h2>Theme and setting</h2><p>The Marvel license matters, but the larger win is tone. The game wants action that feels readable, archetypal, and comic-book direct. Heroes should feel larger than life without the system becoming a full design workshop. That keeps the setting's energy out in front instead of burying it under too much preparation.</p><h2>How play feels</h2><p>At the table, Marvel Super Heroes is generally brisk. Characters can get into trouble quickly, powers feel broad and legible, and resolution has an old-school clarity that still works for pickup sessions. It is less granular than later superhero games, but that is also why it can move so smoothly.</p><h2>What makes it distinct</h2><p>Its most distinctive quality is accessibility. Marvel Super Heroes has enough identity to feel like a superhero game, but not so much complexity that new players disappear into optimization. That balance is a big reason it remains beloved in retrospective discussion.</p><h2>Where it may not fit</h2><p>If the table wants modern customization depth, long-term line support, or a lot of tactical nuance, MSH will feel light. It is best appreciated as a fast, classic superhero engine rather than as the last word in the genre.</p><h2>Bottom line</h2><p>Marvel Super Heroes belongs in the directory because it is still one of the easiest ways to understand why superhero RPGs became a category at all. For groups who want quick, colorful capes play with minimal friction, it still holds up surprisingly well.</p>",
		min_players: 3,
		max_players: 6,
		gm_required: 1,
		gm_role_label: "Judge",
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
		tactical_depth: 2,
		campaign_depth: 3,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 0,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want classic comic-book energy" },
			{ text: "Players who prefer fast supers onboarding" },
			{ text: "Tables interested in older superhero RPG history" },
		],
		avoid_if: [
			{ text: "You want dense modern customization" },
			{ text: "You want deep tactical combat" },
			{ text: "You need an actively supported current line" },
		],
		why_it_fits:
			"Marvel Super Heroes remains a great directory recommendation for tables that want older-school superhero play with a light touch and very little startup friction.",
		taxonomies: {
			genre: ["superheroes"],
			theme: ["cinematic"],
			mechanic: ["streamlined", "team-based"],
			decision_tag: ["beginner-friendly", "licensed", "one-shot-friendly"],
		},
		fit_blurbs: {
			superheroes:
				"Belongs in superheroes because it is a straight classic capes game built for powers, villains, and readable comic-book action.",
			cinematic:
				"Fits cinematic play because it prizes legibility and flow over a lot of engineering detail.",
			streamlined:
				"A good streamlined supers game because it gets powers and outcomes onto the table without much delay.",
			"team-based":
				"Works as team-based play because ensemble hero action is part of the expected Marvel rhythm.",
			"beginner-friendly":
				"Belongs in beginner-friendly because it is still one of the simpler ways to get a superhero table moving quickly.",
			licensed:
				"Fits licensed play because the Marvel identity is part of the game's immediate appeal and recognizability.",
			"one-shot-friendly":
				"Strong for one-shots because the system can launch a full comic-book incident without a long character-build phase.",
		},
		related: [
			{
				slug: "golden-heroes",
				description:
					"Marvel Super Heroes and Golden Heroes are both classic supers games, but Marvel is more license-driven and iconic while Golden Heroes has a more distinct British cult feel.",
			},
			{
				slug: "champions",
				description:
					"Marvel Super Heroes and Champions both come from an older era of supers play, but Champions is much more construction-heavy while MSH values speed and accessibility.",
			},
			{
				slug: "marvel-heroic-roleplaying",
				description:
					"Marvel Super Heroes and Marvel Heroic both capture Marvel action, but MSH is older, lighter, and more archetypal while Heroic is faster and more ensemble-comic in its scene framing.",
			},
		],
	},
	{
		slug: "mouse-guard",
		title: "Mouse Guard",
		publisher_or_creator: "Archaia / Burning Wheel",
		website_url: "https://www.mouseguard.net/book/role-playing-game/",
		image_url: "https://www.mouseguard.net/book/role-playing-game/",
		reviews_url: "https://www.mouseguard.net/book/role-playing-game/",
		blurb:
			"Mouse Guard is a mission-structured fantasy RPG of duty, weather, travel, and small heroes protecting a dangerous world much larger than themselves.",
		review_summary:
			"Mouse Guard is consistently praised for mission clarity, strong adaptation of the comics, and how well it turns service and hardship into play. The usual reservation is that the game is intentionally bounded: people wanting a generic open fantasy sandbox sometimes find its guard-duty structure more constraining than inviting.",
		body_html:
			"<p>Mouse Guard works because it takes scale seriously. The protagonists are small, the world is physically hostile, and duty matters enough to keep every mission grounded in service rather than self-expression alone. That gives the game a rare mix of warmth and pressure. It is gentle in presentation and often stern in play.</p><h2>Theme and setting</h2><p>The setting matters because it turns weather, distance, and ordinary travel into meaningful threats. The mice are not just cute reskins of human adventurers. Their size changes the stakes of roads, seasons, predators, and shelter. Combined with the Guard's ethic of service, that gives the game a world where responsibility and vulnerability are constantly visible.</p><h2>How play feels</h2><p>At the table, Mouse Guard is often structured, earnest, and quietly intense. Missions give the group direction, but the real interest is in how characters handle hardship, duty, and the tension between personal desire and collective responsibility. Even small setbacks can matter, because the world does not need to become apocalyptic to feel dangerous.</p><h2>What makes it distinct</h2><p>What separates Mouse Guard from many other fantasy games is that fragility is not weakness. The game is built around service, resilience, and taking on jobs because somebody has to. That makes it ideal for stories where competence is defined less by domination than by persistence and care.</p><h2>Where it may not fit</h2><p>Groups that want broad sandbox freedom, flashy power growth, or fantasy where violence solves most problems may find Mouse Guard too focused on duty and procedure. It gets stronger when the table values mission structure instead of chafing against it.</p><h2>Bottom line</h2><p>Mouse Guard belongs in the directory because it remains one of the best mission-based fantasy RPGs for groups who want responsibility, hardship, and quiet heroism at the center of play. It is a very specific fantasy, and that is why it works.</p>",
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
		beginner_friendly: 1,
		complexity_score: 3,
		new_gm_friendly: 3,
		combat_focus: 2,
		roleplay_focus: 4,
		tactical_depth: 2,
		campaign_depth: 4,
		price_model: "paid",
		quickstart_available: 0,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 0,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want mission-based fantasy duty" },
			{ text: "Players who enjoy travel, weather, and responsibility as stakes" },
			{ text: "Tables that like small heroes and large worlds" },
		],
		avoid_if: [
			{ text: "You want a broad open fantasy sandbox" },
			{ text: "You want power escalation to dominate play" },
			{ text: "You dislike structure and mission framing" },
		],
		why_it_fits:
			"Mouse Guard is one of the clearest recommendations for tables that want fantasy built around responsibility, scale, and the hard work of keeping communities connected.",
		taxonomies: {
			genre: ["fantasy"],
			mechanic: ["campaign", "narrative-driven", "resource-management", "survival", "team-based"],
			decision_tag: ["beginner-friendly", "licensed"],
		},
		fit_blurbs: {
			fantasy:
				"Belongs in fantasy, but one focused on duty, scale, and mission hardship rather than broad heroic power.",
			campaign:
				"Works best as a campaign game because missions, seasons, and service deepen meaningfully over repeated play.",
			"narrative-driven":
				"Fits narrative-driven fantasy because character duty, belief, and consequences matter as much as procedural challenge.",
			"resource-management":
				"Belongs in resource-management because supplies, weather, and endurance have real weight in the life of the Guard.",
			survival:
				"Fits survival play because travel, predators, and the natural world are real threats at mouse scale.",
			"team-based":
				"A natural team-based fantasy game because patrols, shared duty, and mutual reliance are central to the premise.",
			"beginner-friendly":
				"Beginner-friendly for tables that like clear mission framing and a strong sense of what the characters are for.",
			licensed:
				"Belongs in licensed play because much of its strength comes from how faithfully it translates the Mouse Guard world and ethos.",
		},
		related: [
			{
				slug: "fellowship",
				description:
					"Mouse Guard and Fellowship both care about group purpose, but Fellowship is more quest-heroic while Mouse Guard is more service-driven and mission-structured.",
			},
			{
				slug: "rootrpg",
				description:
					"Mouse Guard and Root both use small-animal fantasy to talk about larger social structures, but Root is more political and roguish while Mouse Guard is more dutiful and patrol-oriented.",
			},
			{
				slug: "legend-of-the-five-rings",
				description:
					"Mouse Guard and Legend of the Five Rings both make duty central, but Mouse Guard expresses it through service and hardship while L5R channels it through hierarchy, honor, and courtly tension.",
			},
		],
	},
	{
		slug: "mutants-masterminds",
		title: "Mutants & Masterminds",
		publisher_or_creator: "Green Ronin Publishing",
		website_url: "https://greenroninstore.com/collections/mutants-masterminds",
		image_url: "https://greenroninstore.com/collections/mutants-masterminds",
		reviews_url: "https://greenroninstore.com/collections/mutants-masterminds",
		blurb:
			"Mutants & Masterminds is a modern superhero RPG built around flexible power construction, broad genre coverage, and campaign-ready capes play.",
		review_summary:
			"Mutants & Masterminds is generally respected for breadth, power-building flexibility, and how well it supports many flavors of superhero campaign. The common warning is that the same flexibility creates workload: character creation, GM prep, and balance all ask more from the table than lighter supers games do.",
		body_html:
			"<p>Mutants & Masterminds earns its place because it is one of the clearest modern answers to the question of how much freedom a superhero game should give players. Its answer is: a lot, as long as the table is willing to do the work. The game is not trying to hide that tradeoff. It assumes many groups will gladly pay complexity for range.</p><h2>What kind of supers game it is</h2><p>M&M is best understood as a broad superhero toolkit with a stronger default engine than a generic universal system. It can do street heroes, cosmic absurdity, school drama, four-color teams, and more. The real appeal is that powers can be built to match concept instead of being trapped inside narrow archetypes.</p><h2>How play feels</h2><p>At the table, the system tends to feel capable and expansive. Characters can be sharply differentiated, and campaigns can support a lot of different comic-book assumptions. The cost is front-loaded and ongoing labor. Character creation matters. Adjudication matters. GM confidence matters. The game rewards that effort, but it does not pretend it is free.</p><h2>What makes it distinct</h2><p>Its clearest strength is that it remains one of the best-supported middle grounds between total supers simplicity and the very heaviest construction systems. Mutants & Masterminds gives players enough expressive room to realize unusual concepts while still feeling like a coherent superhero game instead of a blank math exercise.</p><h2>Where it may not fit</h2><p>Groups that want instant onboarding, low-prep one-shots, or a superhero game that is mostly about emotional narrative flow may find M&M too engineering-minded. It shines most when the table wants long-form supers play and does not mind earning that flexibility.</p><h2>Bottom line</h2><p>Mutants & Masterminds belongs in the directory because it remains one of the most practical long-form superhero recommendations for groups who want breadth, build freedom, and campaign support in one place. It asks for work, but it gives a lot back.</p>",
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
		complexity_score: 5,
		new_gm_friendly: 2,
		combat_focus: 4,
		roleplay_focus: 3,
		tactical_depth: 4,
		campaign_depth: 5,
		price_model: "paid",
		quickstart_available: 1,
		pdf_available: 1,
		physical_book_available: 1,
		vtt_ready: 1,
		content_intensity: "low",
		best_for: [
			{ text: "Groups that want flexible superhero character builds" },
			{ text: "Campaigns spanning many comic-book tones and scales" },
			{ text: "Players willing to invest in build depth for payoff" },
		],
		avoid_if: [
			{ text: "You want low-prep supers one-shots" },
			{ text: "You dislike front-loaded character creation" },
			{ text: "You want your supers game to stay mostly narrative and light" },
		],
		why_it_fits:
			"Mutants & Masterminds is one of the strongest directory picks for tables that want long-form superhero play with modern flexibility and serious power-building room.",
		taxonomies: {
			genre: ["superheroes"],
			mechanic: [
				"campaign",
				"character-customization",
				"skill-based",
				"tactical",
				"tactical-combat",
				"team-based",
			],
			decision_tag: ["rules-medium"],
		},
		fit_blurbs: {
			superheroes:
				"Belongs in superheroes because the game is explicitly built to support a wide range of comic-book power levels and styles.",
			campaign:
				"Works best as a campaign game because the build flexibility pays off most over sustained long-form supers play.",
			"character-customization":
				"A top character-customization pick because unusual power concepts are one of the main reasons to choose it.",
			"skill-based":
				"Fits skill-based play because character competence outside raw powers still matters in how heroes differentiate themselves.",
			tactical:
				"Belongs in tactical play because choices around powers, defenses, and encounter structure matter in a way lighter supers games often avoid.",
			"tactical-combat":
				"A strong tactical-combat supers game because action scenes have more mechanical shape than purely narrative alternatives.",
			"team-based":
				"Works naturally as team-based superhero play because ensemble dynamics and complementary powers are part of the system's strengths.",
			"rules-medium":
				"Sits on the heavier edge of rules-medium because it carries serious build and adjudication weight without becoming a full simulation monster.",
		},
		related: [
			{
				slug: "champions",
				description:
					"Mutants & Masterminds and Champions both offer serious superhero build freedom, but Champions is denser and older while M&M is more practical for many modern campaign tables.",
			},
			{
				slug: "marvel-heroic-roleplaying",
				description:
					"Mutants & Masterminds and Marvel Heroic both support superhero ensembles, but M&M is build-forward and campaign-ready while Heroic is faster and more issue-shaped.",
			},
			{
				slug: "golden-heroes",
				description:
					"Mutants & Masterminds and Golden Heroes both support supers campaign play, but M&M is far more modern and flexible while Golden Heroes feels lighter and more historically situated.",
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
		created_at: createdAt,
		updated_at: createdAt,
		published_at: createdAt,
	};

	const columns = Object.keys(fields).join(", ");
	const values = Object.values(fields).map(sqlString).join(", ");
	statements.push(
		`INSERT INTO ec_games (${columns}) VALUES (${values}) ON CONFLICT(slug, locale) DO UPDATE SET status = excluded.status, title = excluded.title, at_a_glance = excluded.at_a_glance, website_url = excluded.website_url, image_url = CASE WHEN ec_games.image_url LIKE 'https://res.cloudinary.com/%' THEN ec_games.image_url ELSE excluded.image_url END, reviews_url = excluded.reviews_url, review_summary = excluded.review_summary, blurb = excluded.blurb, body_html = excluded.body_html, publisher_or_creator = excluded.publisher_or_creator, min_players = excluded.min_players, max_players = excluded.max_players, gm_required = excluded.gm_required, gm_role_label = excluded.gm_role_label, session_length_minutes_min = excluded.session_length_minutes_min, session_length_minutes_max = excluded.session_length_minutes_max, prep_level = excluded.prep_level, one_shot_friendly = excluded.one_shot_friendly, campaign_friendly = excluded.campaign_friendly, solo_friendly = excluded.solo_friendly, beginner_friendly = excluded.beginner_friendly, complexity_score = excluded.complexity_score, new_gm_friendly = excluded.new_gm_friendly, combat_focus = excluded.combat_focus, roleplay_focus = excluded.roleplay_focus, tactical_depth = excluded.tactical_depth, campaign_depth = excluded.campaign_depth, price_model = excluded.price_model, quickstart_available = excluded.quickstart_available, pdf_available = excluded.pdf_available, physical_book_available = excluded.physical_book_available, vtt_ready = excluded.vtt_ready, content_intensity = excluded.content_intensity, best_for = excluded.best_for, avoid_if = excluded.avoid_if, why_it_fits = excluded.why_it_fits, related = excluded.related, updated_at = excluded.updated_at, published_at = excluded.published_at;`,
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
const missingCategoryPages = {
	free: {
		title: "Free",
		description:
			"Standalone tabletop RPGs you can start without buying a core book first, whether the full game is free or the best entry point costs nothing.",
		seoTitle: "Free TTRPGs",
		seoDescription:
			"Browse free tabletop RPGs that cost nothing to start and still offer a complete play experience.",
	},
	"rules-medium": {
		title: "Rules-Medium",
		description:
			"Standalone tabletop RPGs with enough structure to feel substantial at the table without tipping into the heaviest end of the hobby.",
		seoTitle: "Rules-Medium TTRPGs",
		seoDescription:
			"Find tabletop RPGs with moderate rules weight: more structure than rules-lite games, less overhead than the crunchiest systems.",
	},
};

for (const [slug, config] of Object.entries(missingCategoryPages)) {
	if (categoryPages.has(slug)) continue;
	const id = makeId();
	const timestamp = isoDateWithOffset(batch.length + statements.length);
	categoryPages.set(slug, { id, slug, game_notes: "[]" });
	statements.push(
		`INSERT INTO ec_category_pages (id, slug, status, locale, title, type, description, body_html, game_notes, faqs, related_categories, source_taxonomy, source_term_slug, created_at, updated_at, published_at) VALUES (${sqlString(id)}, ${sqlString(slug)}, 'published', 'en', ${sqlString(config.title)}, 'category', ${sqlString(config.description)}, ${sqlString(`<p>${config.description}</p>`)}, '[]', '[]', '[]', 'decision_tag', ${sqlString(slug)}, ${sqlString(timestamp)}, ${sqlString(timestamp)}, ${sqlString(timestamp)});`,
	);
	statements.push(
		`INSERT INTO _emdash_seo (collection, content_id, seo_title, seo_description, created_at, updated_at) VALUES ('category_pages', ${sqlString(id)}, ${sqlString(config.seoTitle)}, ${sqlString(config.seoDescription)}, ${sqlString(timestamp)}, ${sqlString(timestamp)});`,
	);
}

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
		},
		null,
		2,
	),
);
