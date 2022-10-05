<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<h1>Dotabase</h1>
			<div class="query-box">
				<SqlInput v-model:value="sql_query" />
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
		"DillermSelect": DillermWebUtils.components.DillermSelect
	},
	data() {
		return {
			selected_query: "thing1",
			query_options: [ "thing1", "thing2" ],
			sql_query: "select id, icon, image, localized_name as Name, attr_primary as Attribute from heroes",
			result_data: [],
			status: "success",
			status_text: ""
		}
	},
	methods: {
		async sendQuery() {
			var response = await doSqlQuery(this.sql_query);
			if (response.status == 200) {
				this.result_data = response.data;
				this.status = "success";
			}
			else {
				this.status = "error";
				this.status_text = response.error;
			}
		}
	},
	watch: {
		sql_query() {
			this.debouncedSendQuery();
		}
	},
	created() {
		this._debouncedSendQuery = DillermWebUtils.utils.debounceAsync(this.sendQuery, 500);
		this.debouncedSendQuery = () => {
			this.status = "pending";
			this.status_text = "";
			this._debouncedSendQuery();
		}
		this.debouncedSendQuery();
		// await sendQuery();
	}
};
</script>

<style lang="scss">

.main-app {
	font-size: 14px;
	max-height: calc(100vh - var(--navbar-height));
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
}

</style>