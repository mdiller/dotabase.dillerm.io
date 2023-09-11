const express = require("express");
const better_sqlite = require("better-sqlite3");
const serveIndex = require("serve-index");
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");
const cors = require("cors");

shell.config.silent = true;

var VPK_DIR = process.env.VPK_DIR || path.join(__dirname, "components");
var LISTEN_PORT = process.env.PORT || 3000;

console.log("Serving to: ", LISTEN_PORT);

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

// syncs the dotabase repository and sets up the sql database connection
function syncDotabase() {
	console.log("] syncing dotabase");
	if (!fs.existsSync(DOTABASE_PATH)) {
		shell.cd(BASE_PATH);
		shell.exec(`git clone https://github.com/mdiller/dotabase.git ${DOTABASE_DIRNAME}`);
	}
	shell.cd(DOTABASE_PATH);

	// get git hash
	var version_result = shell.exec("git rev-parse --short HEAD");
	DOTABASE_VERSION = version_result.stdout.trim();

	shell.exec(`git pull`);

	// prep paths
	var sql_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db.sql");
	var db_path = path.join(DOTABASE_PATH, "dotabase", "dotabase.db");

	// get new git hash
	version_result = shell.exec("git rev-parse --short HEAD");
	var new_version = version_result.stdout.trim();
	if (new_version != DOTABASE_VERSION || !fs.existsSync(db_path)) {
		// rebuild
		DOTABASE_VERSION = new_version;
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
	}

	DOTABASE_DB = better_sqlite(db_path, options);
	DOTA_VERSION = DOTABASE_DB.prepare("select number from patches order by timestamp desc limit 1").all()[0].number;
	console.log("] database synced!");

	// Fill Icon Routes
	icon_redirects.forEach(redirect => {
		if (redirect.query) {
			let data = {};
			let query_result = DOTABASE_DB.prepare(redirect.query).all();
			query_result.forEach(kv => {
				data[kv.key.toString()] = kv.value;
			});
			redirect.data = data;
		}
	})
}

syncDotabase();

const app = express();
app.listen(LISTEN_PORT);
 
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

// The version of dotabase
app.use("/api/version", cors(), (req, res) => {
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
app.use("/api/dotaversion", cors(), (req, res) => {
	res.status(200).send(DOTA_VERSION);
});

// SQL query interface
app.use("/api/(:?sql(:?ite)?)", cors(), (req, res) => {
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
	else if (!(Object.keys(route.data).includes(icon_id))) {
		res.status(404).send(`Error: Couldn't find an icon by that ID`);
	}
	else {
		var baseUrl = req.originalUrl.split("/api/icon/")[0];
		res.status(302).redirect(`${baseUrl}/vpk${route.data[icon_id]}`);
	}
});

// Serve built client files
app.use("/", express.static(path.join(__dirname, "..", "build")));