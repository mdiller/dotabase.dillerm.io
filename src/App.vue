<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<h1>Dotabase</h1>
			<div class="query-box">
				<div class="query-box-header">
					<dillerm-select 
						v-model:value="selected_query"
						:options="this.PREDEFINED_QUERIES"
						:searchable="false" />
				</div>
				<div class="query-box-contents">
					<SqlInput v-model:value="sql_query" />
				</div>
				<div class="query-args" v-if="query_args.length > 0">
					<div v-for="query_arg in query_args">
						<dillerm-select 
							v-if="query_arg.type == 'query'"
							v-model:value="query_arg.value"
							:options="query_arg.options"
							:searchable="false" />
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
import DillermSelect from "./components/DillermSelect.vue";

function parseQueriesFile(text) {
	var query_pattern = /\n?-- ([^\n]+)\n([\s\S]+?)(?=\n--|$)/g;
	return [...text.matchAll(query_pattern)].map(match => {
		return {
			label: match[1].trim(),
			query: match[2].trim()
		};
	});
}

// parse queries
import ARG_QUERIES_TEXT from "/arg_queries.sql?raw"
import QUERIES_TEXT from "/queries.sql?raw"
const ARG_QUERIES = parseQueriesFile(ARG_QUERIES_TEXT);
const PREDEFINED_QUERIES = parseQueriesFile(QUERIES_TEXT);
PREDEFINED_QUERIES.push({ label: "(Custom)", query: null });

const ARG_PATTERN = /\{([^\s]+) (query:[^\s]+)\}/g;
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
		DillermSelect
	},
	data() {
		return {
			query_args: [],
			selected_query: null,
			sql_query: "",
			result_data: [],
			status: "success",
			status_text: ""
		}
	},
	methods: {
		async sendQuery() {
			var query = this.sql_query;

			if (this.query_args) {
				query = query.replace(ARG_PATTERN, (match_str, group1) => {
					var query_arg = this.query_args.find(arg => arg.label == group1);
					return query_arg ? query_arg.value.value : match_str;
				});
			}

			this.status = "pending";
			this.status_text = "";
			var timeStart = window.performance.now();
			var response = await doSqlQuery(query);
			var timeEnd = window.performance.now();
			var timePretty = `${timeEnd - timeStart}`;
			if (response.status == 200) {
				this.result_data = response.data;
				this.status_text = `${this.result_data.length} results in ${timePretty} ms`;
				this.status = "success";
			}
			else {
				this.status = "error";
				this.status_text = response.error;
			}
		},
		buildQueryArgs() {
			// TODO: fix this so it only rebuilds and sets the variable if theres actually a change
			// TODO: give some protection to this so we don't call it every time we do a minor change
			this.query_args = [...this.sql_query.matchAll(ARG_PATTERN)].map(match => {
				var label = match[1]
				var type = match[2];
				var value = null;
				var options = undefined;
				if (type.includes(":")) {
					var split = type.split(":");
					type = split[0];
					if (type == "query") {
						var arg_query_name = split[1];
						var arg_query = ARG_QUERIES.find(a => a.label == arg_query_name);
						if (!arg_query || !arg_query.options) {
							console.error(`couldn't find arg query named '${arg_query_name}'`);
							return null;
						}
						options = arg_query.options;
						value = options[0];
					}
					else {
						console.error(`error parsing query arg '${label}'`);
						return null;
					}
				}
				return {
					label: label,
					type: type,
					options: options,
					value: value
				};
			}).filter(arg => arg);
		}
	},
	watch: {
		async sql_query() {
			if (this.selected_query.query && this.selected_query.query != this.sql_query) {
				this.selected_query = this.PREDEFINED_QUERIES[this.PREDEFINED_QUERIES.length - 1];
			}
			if (this.selected_query.query) {
				this.buildQueryArgs();
				await this.sendQuery();
			}
			else {
				// TODO: call buildQueryArgs here once we have a way to make it cache/be more efficient
				this.debouncedSendQuery();
			}
		},
		selected_query() {
			if (this.selected_query && this.selected_query.query) {
				this.sql_query = this.selected_query.query;
			}
		},
		query_args: {
			async handler(oldVal, newVal) {
				// TODO: this will still end up calling query too many times. fix to only call when the signature hasnt changed (gotta store signature on query_args somehow)
				if (oldVal.length == newVal.length) {
					await this.sendQuery();
				}
			}, deep: true
		}
	},
	async created() {
		this.PREDEFINED_QUERIES = PREDEFINED_QUERIES;

		// load arg queries
		// console.time("arg_query_loading");
		await Promise.all(ARG_QUERIES.map(arg_query => loadArgQuery(arg_query)));
		// console.timeEnd("arg_query_loading");

		// setup debounced send query
		this._debouncedSendQuery = DillermWebUtils.utils.debounceAsync(this.sendQuery, 1000);
		this.debouncedSendQuery = () => {
			this.status = "pending";
			this.status_text = "";
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
	}

	.query-box-contents {
		padding: 0px 15px 15px 15px;
	}
}

.query-args {
	padding: 15px 100px;
}

</style>