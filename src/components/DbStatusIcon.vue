<template>
	<div class="db-status-icon" :title="tooltip">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
			<path :d="mdiDatabase" :fill="iconColor" />
		</svg>
	</div>
</template>

<script>
import { mdiDatabase } from "@mdi/js";

const STATUS_COLORS = {
	initializing: "#f9a825",
	updating: "#f9a825",
	ready: "#cdd6e0",
	error: "#f44336"
};

export default {
	data() {
		return {
			mdiDatabase,
			status: "initializing",
			dotaVersion: null,
			dotabaseVersion: null,
			error: null,
			pollInterval: null
		};
	},
	computed: {
		iconColor() {
			return STATUS_COLORS[this.status] ?? "#8b949e";
		},
		tooltip() {
			if (this.status === "ready") {
				return `Dota ${this.dotaVersion} (dotabase ${this.dotabaseVersion})`;
			}
			if (this.status === "error") {
				return `DB Error: ${this.error}`;
			}
			if (this.status === "updating") {
				return "Updating database...";
			}
			return "Initializing database...";
		}
	},
	mounted() {
		this.fetchStatus();
		this.pollInterval = setInterval(this.fetchStatus, 5000);
	},
	beforeUnmount() {
		clearInterval(this.pollInterval);
	},
	methods: {
		async fetchStatus() {
			try {
				const res = await fetch("/api/dbstatus");
				const data = await res.json();
				this.status = data.status;
				this.dotaVersion = data.dotaVersion;
				this.dotabaseVersion = data.dotabaseVersion;
				this.error = data.error;
			}
			catch {
				// server unreachable, keep last known state
			}
		}
	}
};
</script>

<style lang="scss" scoped>
.db-status-icon {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: default;
	flex-shrink: 0;

	svg {
		width: 20px;
		height: 20px;
	}
}
</style>
