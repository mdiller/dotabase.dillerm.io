const express = require("express");
const better_sqlite = require("better-sqlite3");
const serveIndex = require("serve-index");
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");
const cors = require("cors");
const { Worker } = require("worker_threads");

shell.config.silent = true;

var VPK_DIR = process.env.VPK_DIR || path.join(__dirname, "components");
var LISTEN_PORT = process.env.PORT || 3000;
var FORCE_UPDATE = process.env.FORCE_UPDATE === "true";

console.log("] serving on port:", LISTEN_PORT);
if (FORCE_UPDATE) console.log("] FORCE_UPDATE is enabled — will always rebuild database");

var BASE_PATH = path.join(__dirname, "..");
var DOTABASE_DIRNAME = "_dotabase";
var DOTABASE_PATH = path.join(BASE_PATH, DOTABASE_DIRNAME);
// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md

const options = {
	readonly: true,
	timeout: 2000
};

var DOTABASE_DB = null;

const dbState = {
	status: "initializing", // "initializing" | "updating" | "ready" | "error"
	dotaVersion: null,
	dotabaseVersion: null,
	error: null
};

const icon_redirects = [
	{
		type: "item",
		query: "SELECT id as key, icon as value FROM items"
	},
	{
		type: "ability",
		query: "SELECT id as key, icon as value FROM abilities"
	},
	{
		type: "emoticon",
		query: "SELECT id as key, url as value FROM emoticons"
	},
	{
		type: "hero_icon",
		query: "SELECT id as key, icon as value FROM heroes"
	},
	{
		type: "hero_image",
		query: "SELECT id as key, image as value FROM heroes"
	},
	{
		type: "hero_portrait",
		query: "SELECT id as key, portrait as value FROM heroes"
	}
];

function openAndCacheDb() {
	var db_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db");
	if (DOTABASE_DB) {
		DOTABASE_DB.close();
	}
	DOTABASE_DB = better_sqlite(db_path, options);
	dbState.dotaVersion = DOTABASE_DB.prepare("select number from patches order by timestamp desc limit 1").all()[0].number;

	icon_redirects.forEach(redirect => {
		if (redirect.query) {
			let data = {};
			DOTABASE_DB.prepare(redirect.query).all().forEach(kv => {
				data[kv.key.toString()] = kv.value;
			});
			redirect.data = data;
		}
	});
	console.log("] icon redirects built");
}

function startSync() {
	var isUpdate = DOTABASE_DB !== null;
	dbState.status = isUpdate ? "updating" : "initializing";
	dbState.error = null;
	console.log(`] ${isUpdate ? "updating" : "initializing"} dotabase...`);

	const worker = new Worker(path.join(__dirname, "dotabase-worker.js"), {
		workerData: {
			DOTABASE_PATH,
			BASE_PATH,
			DOTABASE_DIRNAME,
			FORCE_UPDATE
		}
	});

	worker.on("message", (msg) => {
		if (msg.type === "log") {
			console.log("]   " + msg.message);
		}
		else if (msg.type === "done") {
			try {
				dbState.dotabaseVersion = msg.version;
				openAndCacheDb();
				dbState.status = "ready";
				console.log(`] database ready | dotabase: ${dbState.dotabaseVersion} | dota: ${dbState.dotaVersion}`);
			}
			catch (err) {
				dbState.status = "error";
				dbState.error = err.message;
				console.error("] error opening database:", err.message);
			}
		}
		else if (msg.type === "error") {
			dbState.status = "error";
			dbState.error = msg.error;
			console.error("] sync error:", msg.error);
		}
	});

	worker.on("error", (err) => {
		dbState.status = "error";
		dbState.error = err.message;
		console.error("] worker error:", err.message);
	});
}

const app = express();
app.listen(LISTEN_PORT);
console.log("] listening on port", LISTEN_PORT);

setImmediate(startSync);

// Favicon
app.use("/favicon.ico", express.static(path.join(__dirname, "assets", "favicon.ico")));

// Serving vpk stuff
fs.copyFileSync(path.join(__dirname, "vpk_browser.html"), path.join(VPK_DIR, "index.html"))
app.use("/(:?dota-)?vpk/", express.static(path.join(VPK_DIR)));

// Gets the files in the vpk's directory
app.use("/api/vpkfiles/:filename(*)", (req, res) => {
	var filename = req.params.filename;
	var dir = path.join(VPK_DIR, filename);
	if (dir.includes("..")) {
		res.json([]);
		return;
	}
	fs.readdir(dir, (err, files) => {
		res.json(files);
	});
});

// Database sync status
app.use("/api/dbstatus", cors(), (req, res) => {
	res.json(dbState);
});

// The version of dotabase
app.use("/api/version", cors(), (req, res) => {
	res.status(200).send(dbState.dotabaseVersion);
});

// The version of dota
app.use("/api/dotaversion", cors(), (req, res) => {
	res.status(200).send(dbState.dotaVersion);
});

// Trigger a dotabase sync
app.use("/githook", (req, res) => {
	if (dbState.status === "updating" || dbState.status === "initializing") {
		res.status(409).send("Sync already in progress");
		return;
	}
	startSync();
	res.status(200).send("Sync started");
});

// SQL query interface
app.use("/api/(:?sql(:?ite)?)", cors(), (req, res) => {
	if (!DOTABASE_DB) {
		res.status(503).json({ error: "Database is not ready", status: dbState.status });
		return;
	}

	var query = req.query.q || req.query.query || req.body;

	if (query) {
		try {
			var result = DOTABASE_DB.prepare(query).all();
			res.json(result);
		}
		catch (error) {
			res.status(400).send(`Error: ${error.message}`);
		}
	}
	else {
		res.status(400).send("Put an SQL query in a url arg named 'q' or 'query', or give it in the request body");
	}
});

// Icons by ID routing
app.use("/api/icon/:icon_type/:icon_id", (req, res) => {
	var icon_type = req.params.icon_type;
	var icon_id = req.params.icon_id;

	var route = icon_redirects.find(r => r.type == icon_type);
	if (route == undefined) {
		res.status(404).send(`Error: Don't recognize that icon type`);
	}
	else if (!route.data || !(Object.keys(route.data).includes(icon_id))) {
		res.status(404).send(`Error: Couldn't find an icon by that ID`);
	}
	else {
		var baseUrl = req.originalUrl.split("/api/icon/")[0];
		res.status(302).redirect(`${baseUrl}/vpk${route.data[icon_id]}`);
	}
});

// Serve built client files
app.use("/", express.static(path.join(__dirname, "..", "build")));

// SPA fallback: serve index.html for any unmatched path
app.use((req, res) => {
	res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});
