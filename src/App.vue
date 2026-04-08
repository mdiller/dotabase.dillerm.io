<template>
	<div class="page-nav-selector">
		<dillerm-select
			v-model:value="current_page"
			:options="PAGES"
			:searchable="false" />
	</div>
	<component :is="current_page?.component" />
</template>

<script>
import DillermSelect from "@dillerm/webutils/src/components/controls/DillermSelect.vue";
import { PAGES } from "./pages/index.js";

export default {
	components: {
		DillermSelect
	},
	data() {
		return {
			current_page: null,
			PAGES
		}
	},
	created() {
		const hash = window.location.hash.replace(/^#\/?/, '');
		this.current_page = PAGES.find(p => p.value === hash) ?? PAGES[0];
		window.addEventListener('popstate', this.onPopState);
	},
	beforeUnmount() {
		window.removeEventListener('popstate', this.onPopState);
	},
	watch: {
		current_page(page) {
			const hash = `#${page.value}`;
			if (window.location.hash !== hash) {
				history.pushState(null, '', hash);
			}
		}
	},
	methods: {
		onPopState() {
			const hash = window.location.hash.replace(/^#\/?/, '');
			this.current_page = PAGES.find(p => p.value === hash) ?? PAGES[0];
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

</style>
