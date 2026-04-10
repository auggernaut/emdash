import { spawn } from "node:child_process";

const repoRoot = new URL("../", import.meta.url);

const preflightCommands = [
	{
		label: "admin-build",
		args: ["--filter", "@emdash-cms/admin", "build"],
	},
	{
		label: "core-build",
		args: ["--filter", "emdash", "build"],
	},
];

const watchCommands = [
	{
		label: "admin",
		args: ["--filter", "@emdash-cms/admin", "dev"],
	},
	{
		label: "core",
		args: ["--filter", "emdash", "dev"],
	},
	{
		label: "ttrpg",
		args: ["--filter", "@emdash-cms/demo-ttrpg-games", "dev"],
	},
];

function prefixStream(stream, label, target) {
	let buffer = "";

	stream.setEncoding("utf8");
	stream.on("data", (chunk) => {
		buffer += chunk;
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			target.write(`[${label}] ${line}\n`);
		}
	});

	stream.on("end", () => {
		if (buffer) {
			target.write(`[${label}] ${buffer}\n`);
		}
	});
}

function runCommand(label, args, exitOnFailure = true) {
	const child = spawn("pnpm", args, {
		cwd: repoRoot,
		stdio: ["inherit", "pipe", "pipe"],
	});

	prefixStream(child.stdout, label, process.stdout);
	prefixStream(child.stderr, label, process.stderr);

	if (exitOnFailure) {
		child.on("exit", (code, signal) => {
			if (signal) {
				process.stderr.write(`[${label}] exited from signal ${signal}\n`);
				process.exit(1);
			}
			if (code && code !== 0) {
				process.exit(code);
			}
		});
	}

	return child;
}

async function runPreflight() {
	for (const command of preflightCommands) {
		await new Promise((resolve, reject) => {
			const child = runCommand(command.label, command.args, false);
			child.on("exit", (code, signal) => {
				if (signal) {
					reject(new Error(`${command.label} exited from signal ${signal}`));
					return;
				}
				if (code && code !== 0) {
					reject(new Error(`${command.label} failed with exit code ${code}`));
					return;
				}
				resolve();
			});
		});
	}
}

const children = [];

function shutdown(signal) {
	for (const child of children) {
		if (!child.killed) {
			child.kill(signal);
		}
	}
}

process.on("SIGINT", () => {
	shutdown("SIGINT");
	process.exit(0);
});

process.on("SIGTERM", () => {
	shutdown("SIGTERM");
	process.exit(0);
});

try {
	await runPreflight();

	for (const command of watchCommands) {
		const child = runCommand(command.label, command.args, false);
		child.on("exit", (code, signal) => {
			if (signal === "SIGINT" || signal === "SIGTERM") return;
			shutdown("SIGTERM");
			if (signal) {
				process.stderr.write(`[${command.label}] exited from signal ${signal}\n`);
				process.exit(1);
				return;
			}
			process.exit(code ?? 0);
		});
		children.push(child);
	}
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
}
