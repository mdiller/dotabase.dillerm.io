<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<div class="query-box">
				<div class="query-box-header">
					<dillerm-select 
						v-model:value="selected_query"
						:options="PREDEFINED_QUERIES"
						:searchable="false" />
					<div :class="{ 'dillerm-button': true, 'toggled': show_sql }" @click="show_sql = !show_sql">
						<i class="fa fa-feather"></i>
					</div>
				</div>
				<div :class="{ 'query-box-contents': true, 'hidden': !show_sql }">
					<SqlInput v-model:value="sql_query" />
				</div>
				<div class="query-args" v-if="query_args.length > 0">
					<div v-for="query_arg in query_args">
						<dillerm-select 
							v-if="query_arg.type == 'select'"
							v-model:value="query_arg.value"
							:emitvalue="true"
							:options="query_arg.options"
							:searchable="query_arg.searchable == 'true'"
							:nullable="query_arg.nullable == 'true'"
							:placeholder="`Select a ${query_arg.key}...`" />
						<dillerm-text 
							v-if="query_arg.type == 'text'"
							v-model:value="query_arg.value"
							:clearable="query_arg.clearable == 'true'"
							:placeholder="`Search...`"
							:debounce_delay="500"
							@typing="setPending" />
						<dillerm-color
							v-if="query_arg.type == 'color'"
							v-model:value="query_arg._value"
							@hue="hue => query_arg.value = hue"
							:emithue="true" />
						<order-selector
							v-if="query_arg.type == 'order'"
							v-model:value="query_arg.value"
							:options="query_arg.options"
							:enable_random="query_arg.enable_random == 'true'" />
					</div>
				</div>
				<StatusBar
					:status="status"
					:text="status_text" />
			</div>
		</div>
		<div class="table-holder">
			<ResultTable v-model:value="result_data" />
		</div>
	</div>
</template>

<script>
import SqlInput from "./components/SqlInput.vue";
import ResultTable from "./components/ResultTable.vue";
import StatusBar from "./components/StatusBar.vue";
import OrderSelector from "./components/OrderSelector.vue";

import DillermSelect from "@dillerm/webutils/src/components/controls/DillermSelect.vue";
import DillermText from "@dillerm/webutils/src/components/controls/DillermText.vue";
import DillermColor from "@dillerm/webutils/src/components/controls/DillermColor.vue";
import { escapeRegex } from "@dillerm/webutils/src/utils.js";

function parseQueriesFile(text) {
	var query_pattern = /\n?--- ([^\n]+)\n([\s\S]+?)(?=\n---|$)/g;
	return [...text.matchAll(query_pattern)].map(match => {
		return {
			label: match[1].trim(),
			query: match[2].trim()
		};
	});
}

// parse queries
import ARG_QUERIES_TEXT from "/assets/arg_queries.sql?raw"
import QUERIES_TEXT from "/assets/queries.sql?raw"
const ARG_QUERIES = parseQueriesFile(ARG_QUERIES_TEXT);
const PREDEFINED_QUERIES = parseQueriesFile(QUERIES_TEXT);
PREDEFINED_QUERIES.push({ label: "(Custom)", query: null });

const ARG_DEF_PATTERN = /-- \{arg ([^\}\s]+)\s+([^\}\s]+)(?:\s+([^\}]+))?\}/g;
const ARG_REPL_PATTERN = /\{([^\s\}]+?)\}/g;
const ARG_IF_PATTERN = /\{if ([^\s\}]+?)\}([\s\S]+?)\{endif\}\r?\n?/g;
async function loadArgQuery(arg_query) {
	var response = await doSqlQuery(arg_query.query);
	if (response.status == 200) {
		arg_query.options = response.data;
	}
	else {
		console.error(`Errored on loading arg query '${arg_query.label}'`);
	}
}
// current_args = [{ label, type, value, options }]

async function doSqlQuery(query) {
	query = encodeURI(query);
	var response = await fetch(`/api/sql?q=${query}`);

	if (response.ok) {
		return {
			status: response.status,
			data: await response.json()
		}
	}
	else {
		return {
			status: response.status,
			error: await response.text()
		};
	}
}

export default {
	components: {
		SqlInput,
		ResultTable,
		StatusBar,
		DillermSelect,
		DillermText,
		DillermColor,
		OrderSelector
	},
	data() {
		return {
			query_args: [],
			selected_query: null,
			sql_query: "",
			result_data: [],
			status: "success",
			status_text: "",
			show_sql: false
		}
	},
	methods: {
		setPending() {
			this.status = "pending";
			this.status_text = "";
		},
		async sendQuery() {
			var query = this.sql_query;

			if (this.query_args) {
				query = query.replace(ARG_DEF_PATTERN, "");
				query = query.replace(ARG_IF_PATTERN, (match_str, group1, group2) => {
					var query_arg = this.query_args.find(arg => arg.key == group1);
					return (query_arg && query_arg.value) ? group2 : "";
				});
				query = query.replace(ARG_REPL_PATTERN, (match_str, group1) => {
					var query_arg = this.query_args.find(arg => arg.key == group1);
					return query_arg ? query_arg.value : match_str;
				});
				query = query.trim();
			}

			console.log("querying: " + query);
			
			this.setPending();
			var timeStart = window.performance.now();
			var response = await doSqlQuery(query);
			var timeEnd = window.performance.now();
			var timePretty = `${Math.round(timeEnd - timeStart)}`;
			if (response.status == 200) {
				this.result_data = response.data;
				var plus = this.query_limit == this.result_data.length ? "+" : "";
				this.status_text = `${this.result_data.length}${plus} results in ${timePretty} ms`;
				this.status = "success";
			}
			else {
				this.status = "error";
				this.status_text = response.error;
			}
		},
		buildQueryArgs() {
			var new_source = [...this.sql_query.matchAll(ARG_DEF_PATTERN)].map(match => match[0]).join(",");
			var old_source = this.query_args.map(arg => arg.source_text).join(",");

			if (new_source == old_source) {
				return false; // sources didn't change, so no need to rebuild
			}

			this.query_args = [...this.sql_query.matchAll(ARG_DEF_PATTERN)].map(match => {
				var key = match[1]
				var type = match[2];
				var arg = {
					key: key,
					type: type,
					value: null,
					source_text: match[0]
				}
				if (match[3]) {
					var props = match[3].split(" ");
					for (var prop of props) {
						if (!prop.includes(":")) {
							console.warn(`invalid arg prop '${prop}' on '${key}', ignoring.`);
							continue;
						}
						var split = prop.split(":");
						arg[split[0]] = split[1];
					}
				}

				var simple_types = [ "color" ];

				if (type == "select") {
					if (!arg.query) {
						console.warn(`select arg '${key}' missing a defined query`);
						return null;
					}
					var arg_query = ARG_QUERIES.find(a => a.label == arg.query);
					if (!arg_query || !arg_query.options) {
						console.warn(`couldn't find arg query named '${arg.query}'`);
						return null;
					}
					arg.options = (input, callback) => {
						if (input) {
							var pattern = new RegExp(escapeRegex(input), "i");
							var options = Array.from(arg_query.options.filter(opt => pattern.test(opt.label)));
							if (arg_query.options.length > 0 && arg_query.options.some(opt => opt.aliases)) {
								options = options.concat(arg_query.options.filter(opt => {
									return opt.aliases && !pattern.test(opt.label) && opt.aliases.split("|").some(alias => pattern.test(alias));
								}));
							}
							callback(options);
						}
						else {
							callback(arg_query.options);
						}
					};
					if (arg.value === "null") {
						arg.value = null;
					}
					else {
						arg.options("", options => {
							arg.value = options[0].value;
						})
					}
				}
				else if (type == "text") {
					if (!arg.value) {
						arg.value = "";
					}
				}
				else if (type == "order") {
					arg.value = "";
				}
				else if (!simple_types.includes(type)) {
					console.error(`invalid type for arg '${key}'`);
					return null;
				}
				return arg;
			}).filter(arg => arg);
			return true;
		}
	},
	computed: {
		query_limit() {
			var match = /.*LIMIT (\d+).*/.exec(this.sql_query);
			return match ? parseInt(match[1]) : -1;
		}
	},
	watch: {
		async sql_query() {
			if (this.selected_query.query && this.selected_query.query != this.sql_query) {
				this.selected_query = this.PREDEFINED_QUERIES[this.PREDEFINED_QUERIES.length - 1];
			}
			this.buildQueryArgs();
			if (this.selected_query.query) {
				this.buildQueryArgs();
				await this.sendQuery();
			}
			else {
				this.debouncedSendQuery();
			}
		},
		selected_query() {
			if (this.selected_query && this.selected_query.query) {
				this.sql_query = this.selected_query.query;
			}
		},
		query_args: {
			async handler(old_val, new_val) {
				var new_source = new_val.map(arg => arg.source_text).join(",");
				var old_source = old_val.map(arg => arg.source_text).join(",");

				if (old_source == new_source) {
					// if the sources haven't changed, that means the user changed a value, so send the query
					await this.sendQuery();
				}
			}, deep: true
		}
	},
	async created() {
		this.PREDEFINED_QUERIES = PREDEFINED_QUERIES;

		// load arg queries
		await Promise.all(ARG_QUERIES.map(arg_query => loadArgQuery(arg_query)));

		// setup debounced send query
		this._debouncedSendQuery = DillermWebUtils.utils.debounceAsync(this.sendQuery, 1000);
		this.debouncedSendQuery = () => {
			this.setPending();
			this._debouncedSendQuery();
		}
		this.selected_query = this.PREDEFINED_QUERIES[0];
	}
};
</script>

<style lang="scss">

.main-app {
	font-size: 14px;
	max-height: calc(100vh - var(--navbar-height));
	min-height: calc(100vh - var(--navbar-height));
	overflow-x: auto;
}

.table-holder {
	margin: auto;
	padding: 15px;

	table {
		margin: auto;
	}
}

.query-box {
	border-radius: 5px;
	background-color: var(--background-color2);

	.query-box-header {
		padding: 10px;

		display: flex;

		:first-child {
			flex: 1;
			margin-right: 5px;
		}
	}

	.query-box-contents {
		padding: 0px 15px 15px 15px;

		&.hidden {
			display: none;
		}
	}
}

.query-args {
	padding: 15px 100px;

	> div {
		margin-bottom: 5px;
	}
}

@media only screen and (max-width: 650px) {
	.query-args {
		padding: 15px 20px;
	}
}

.dillerm-button i {
	color: var(--input-highlight-color);
	font-size: 20px;
}

</style>