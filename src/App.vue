<template>
	<div class="page-nav-selector">
		<dillerm-select
			v-model:value="current_page"
			:options="PAGES"
			:searchable="false" />
	</div>
	<div class="db-status-anchor">
		<db-status-icon />
	</div>
	<component :is="current_page?.component" />
</template>

<script>
import DillermSelect from "@dillerm/webutils/src/components/controls/DillermSelect.vue";
import DbStatusIcon from "./components/DbStatusIcon.vue";
import { PAGES } from "./pages/index.js";

export default {
	components: {
		DillermSelect,
		DbStatusIcon
	},
	data() {
		return {
			current_page: null,
			PAGES
		}
	},
	created() {
		const seg = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
		this.current_page = PAGES.find(p => p.path === seg) ?? PAGES[0];
		window.addEventListener('popstate', this.onPopState);
	},
	beforeUnmount() {
		window.removeEventListener('popstate', this.onPopState);
	},
	watch: {
		current_page(page) {
			const pagePath = '/' + page.path;
			const cur = window.location.pathname;
			if (cur !== pagePath && !cur.startsWith(pagePath + '/')) {
				history.pushState(null, '', pagePath);
			}
		}
	},
	methods: {
		onPopState() {
			const seg = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
			this.current_page = PAGES.find(p => p.path === seg) ?? PAGES[0];
		}
	}
};
</script>

<style lang="scss">

.page-nav-selector {
	position: fixed;
	right: 64px;
	top: 0;
	height: var(--navbar-height);
	width: 253px;
	display: flex;
	align-items: center;
	z-index: 1002;

	.dillerm-select {
		width: 100%;
	}
}

.db-status-anchor {
	position: fixed;
	left: 50%;
	top: 0;
	height: var(--navbar-height);
	transform: translateX(calc(-100% - 60px));
	display: flex;
	align-items: center;
	z-index: 1002;
	pointer-events: auto;
}

</style>
