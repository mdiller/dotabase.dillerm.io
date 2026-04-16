const { workerData, parentPort } = require("worker_threads");
const shell = require("shelljs");
const fs = require("fs");
const better_sqlite = require("better-sqlite3");
const path = require("path");

shell.config.silent = true;

const { DOTABASE_PATH, BASE_PATH, DOTABASE_DIRNAME, FORCE_UPDATE } = workerData;

function log(msg) {
	parentPort.postMessage({ type: "log", message: msg });
}

try {
	log("checking dotabase...");

	if (!fs.existsSync(DOTABASE_PATH)) {
		log("cloning dotabase repository (first run)...");
		shell.cd(BASE_PATH);
		shell.exec(`git clone https://github.com/mdiller/dotabase.git ${DOTABASE_DIRNAME}`);
	}

	shell.cd(DOTABASE_PATH);

	const old_hash = shell.exec("git rev-parse --short HEAD").stdout.trim();
	log("pulling latest changes...");
	shell.exec("git pull");
	const new_hash = shell.exec("git rev-parse --short HEAD").stdout.trim();

	const sql_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db.sql");
	const db_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db");
	const db_path_tmp = db_path + ".tmp";

	const needs_rebuild = new_hash !== old_hash || !fs.existsSync(db_path) || FORCE_UPDATE;

	if (needs_rebuild) {
		log(`rebuilding database from version ${new_hash}...`);
		if (fs.existsSync(db_path_tmp)) {
			fs.unlinkSync(db_path_tmp);
		}
		const sql_text = fs.readFileSync(sql_path, "utf8");
		const temp_db = better_sqlite(db_path_tmp, { fileMustExist: false });
		temp_db.exec(sql_text);
		temp_db.close();
		if (fs.existsSync(db_path)) {
			fs.unlinkSync(db_path);
		}
		fs.renameSync(db_path_tmp, db_path);
		log("database rebuild complete");
	}
	else {
		log("database is up to date");
	}

	parentPort.postMessage({ type: "done", version: new_hash, rebuilt: needs_rebuild });
}
catch (err) {
	parentPort.postMessage({ type: "error", error: err.message });
}
