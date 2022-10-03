const express = require("express");
const serveIndex = require('serve-index');
const path = require("path");
const fs = require("fs");

var VPK_DIR = "F:\\dota_vpk";
var LISTEN_PORT = 3000;
// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md

const options = {
	readonly: true,
	timeout: 2000
};

const db = require("better-sqlite3")("dotabase.db", options);

var query = "select localized_name from heroes";
var query2 = "SELECT r.name, r.mp3, r.text, r.text_simple, r.criteria, r.pretty_criteria, v.icon as voice_icon FROM responses r JOIN voices v ON r.voice_id = v.id WHERE text != '' AND text_simple like '% slam %' AND voice_id == 7 ORDER BY LENGTH(text) LIMIT 50"
var result = db.prepare(query2).all();

console.log("result:");
console.dir(result);



const app = express();
app.listen(LISTEN_PORT); // port

var PORT = process.env.PORT || process.argv[2] || 8080;
var PUBLIC_HTML = path.resolve(__dirname, 'public');
 
// use serve index to nav public folder
app.use("/", serveIndex( path.resolve(PUBLIC_HTML), {
	icons: true,
	view: "tiles",
	template: path.resolve(__dirname, "template.html")
} ));
 
// use express static to serve public folder assets
app.use("/", express.static( path.join(PUBLIC_HTML) ));
 
// Favicon
app.use("/favicon.ico", express.static(path.join(__dirname, "assets", "favicon.ico")));


// app.get("/dota-vpk/*", (req, res) => {
// 	res.sendFile('public/index.html');
// });

// app.get("/sqlite", (req, res) => {
// 	res.sendFile('public/index.html');
// });

// app.use(express.json());
// app.post("/githook", asyncHandler(async (req, res) => {
// 	console.log(`> ${req.originalUrl}`);
// 	var project = req.body.repository.name;
// 	await updateProject(project);

// 	res.status(200);
// 	res.setHeader("Content-Type", "text/html");
// 	res.send("Done!");
// }));


// app.get("/dota-vpk/*", asyncHandler(async (req, res) => {
// 	// probably move this to be handled at top of script in future
// 	var html = fs.readFileSync(__dirname + "/index.html", "utf8");
// 	var pattern = /\/\/ PROJECTS_LIST_START\s+.*\s+\/\/ PROJECTS_LIST_END/m
// 	if (html.search(pattern)) {
// 		var projects = PROJECTS.map(project => {
// 			var proj_info = PROJECT_INFOS[project];
// 			return {
// 				name: project,
// 				link: proj_info.homepage || `https://tools.dillerm.io/${project}`,
// 				github_link: proj_info.html_url,
// 				description: proj_info.description,
// 				created_at: localizeDate(proj_info.created_at),
// 				updated_at: localizeDate(proj_info.updated_at),
// 				language: proj_info.language
// 			}
// 		});
// 		var project_info_text = JSON.stringify(projects);
// 		html = html.replace(pattern, `var projects = ${project_info_text}`)
// 	}


// 	res.status(200);
// 	res.setHeader("Content-Type", "text/html");
// 	res.send(html);
// }));


// // error handler
// app.use((err, req, res, next) => {
// 	console.error(`Error on req: ${req.originalUrl}`);
// 	console.error(err);
// 	res.status(500).send("<pre>Oops, something broke. Check the logs.</pre>");
// });

// could use express serve-index