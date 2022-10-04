const express = require("express");
const better_sqlite = require("better-sqlite3");
const serveIndex = require("serve-index");
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");

shell.config.silent = true;

var VPK_DIR = process.env.VPK_DIR || path.join(__dirname);
var LISTEN_PORT = process.env.PORT || 3000;

var BASE_PATH = path.join(__dirname, "..");
var DOTABASE_DIRNAME = "_dotabase";
var DOTABASE_PATH = path.join(BASE_PATH, DOTABASE_DIRNAME);
// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md

const options = {
	readonly: true,
	timeout: 2000
};

var DOTABASE_VERSION = null;
var DOTABASE_DB = null;
var DOTA_VERSION = null;

// syncs the dotabase repository and sets up the sql database connection
function syncDotabase() {
	console.log("] syncing dotabase");
	if (!fs.existsSync(DOTABASE_PATH)) {
		shell.cd(BASE_PATH);
		shell.exec(`git clone https://github.com/mdiller/dotabase.git ${DOTABASE_DIRNAME}`);
	}
	shell.cd(DOTABASE_PATH);
	shell.exec(`git pull`);

	// select number from patches order by timestamp desc limit 1
	// get git hash
	shell.cd(DOTABASE_PATH);
	const result = shell.exec("git rev-parse --short HEAD");
	var new_version = result.stdout.trim();
	if (new_version == DOTABASE_VERSION) {
		return; // no rebuild needed
	}

	// rebuild
	DOTABASE_VERSION = new_version;
	var sql_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db.sql");
	var db_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db");
	if (fs.existsSync(db_path)) {
		fs.unlinkSync(db_path);
	}
	console.log("] rebuilding dotabase");
	var sql_create_text = fs.readFileSync(sql_path, "utf8");
	var temp_db = better_sqlite(db_path, {
		fileMustExist: false
	});
	temp_db.exec(sql_create_text);
	temp_db.close();

	DOTABASE_DB = better_sqlite(db_path, options);
	DOTA_VERSION = DOTABASE_DB.prepare("select number from patches order by timestamp desc limit 1").all()[0].number;
	console.log("] done!");
}

syncDotabase();

const app = express();
app.listen(LISTEN_PORT);
 
// Favicon
app.use("/favicon.ico", express.static(path.join(__dirname, "assets", "favicon.ico")));
 
// Serving vpk stuff
app.use("/(:?dota-)?vpk/", express.static(path.join(VPK_DIR)));
app.use("/(:?dota-)?vpk/", serveIndex(path.resolve(VPK_DIR), {
	icons: true,
	view: "tiles",
	template: path.resolve(__dirname, "vpk_browser_template.html")
}));

// The version of dotabase
app.use("/api/version", (req, res) => {
	res.status(200).send(DOTABASE_VERSION);
});

// The version of dotabase
app.use("/githook", (req, res) => {
	try {
		syncDotabase();
	}
	catch (error) {
		res.status(400).send(`Error: ${error}`);
	}
	res.status(200).send(`Updated to ${DOTABASE_VERSION}: ${DOTA_VERSION}`);
});

// The version of dota
app.use("/api/dotaversion", (req, res) => {
	res.status(200).send(DOTA_VERSION);
});

// SQL query interface
app.use("/api/(:?sql(:?ite)?)", (req, res) => {
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
