#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPORT_DIR="$ROOT_DIR/.wrangler/tmp"
EXPORT_FILE="$EXPORT_DIR/remote-dev.sql"
LOCAL_D1_DIR="$ROOT_DIR/.wrangler/state/v3/d1"
WRANGLER_BIN="$ROOT_DIR/node_modules/.bin/wrangler"
TABLE_QUERY="select name from sqlite_master where type='table' and name not like 'sqlite_%' and name != '_cf_KV' and name not like '_emdash_fts_%' and (sql is null or upper(sql) not like 'CREATE VIRTUAL TABLE%') order by name;"

if [[ -f "$ROOT_DIR/.env" ]]; then
	set -a
	# shellcheck disable=SC1091
	source "$ROOT_DIR/.env"
	set +a
fi

mkdir -p "$EXPORT_DIR"
rm -f "$EXPORT_FILE"

cd "$ROOT_DIR"

echo "Exporting remote D1 to $EXPORT_FILE"
TABLES_JSON="$("$WRANGLER_BIN" d1 execute ttrpg-games --env dev --remote --command "$TABLE_QUERY" --json)"
TABLES=()
while IFS= read -r table; do
	TABLES+=("$table")
done < <(
	printf '%s' "$TABLES_JSON" | node -e '
		const fs = require("node:fs");
		const input = fs.readFileSync(0, "utf8");
		const data = JSON.parse(input);
		for (const row of data[0]?.results ?? []) {
			if (row.name) console.log(row.name);
		}
	'
)

if [[ "${#TABLES[@]}" -eq 0 ]]; then
	echo "No exportable tables found."
	exit 1
fi

TABLE_ARGS=()
for table in "${TABLES[@]}"; do
	TABLE_ARGS+=(--table "$table")
done

"$WRANGLER_BIN" d1 export ttrpg-games --env dev --remote --output "$EXPORT_FILE" "${TABLE_ARGS[@]}"

echo "Resetting local D1 state in $LOCAL_D1_DIR"
rm -rf "$LOCAL_D1_DIR"
mkdir -p "$LOCAL_D1_DIR"

echo "Preparing local D1 file"
"$WRANGLER_BIN" d1 execute ttrpg-games --env dev --local --command "select 1;" >/dev/null

LOCAL_DB_FILE="$(
	find "$LOCAL_D1_DIR" -maxdepth 2 -type f -name '*.sqlite' ! -name 'metadata.sqlite' | head -n 1
)"

if [[ -z "$LOCAL_DB_FILE" ]]; then
	echo "Could not locate local D1 database file."
	exit 1
fi

echo "Importing remote snapshot into $LOCAL_DB_FILE"
sqlite3 "$LOCAL_DB_FILE" < "$EXPORT_FILE"

echo "Local D1 sync complete."
