<script setup>
</script>

<template>
	<prism-editor class="my-editor" v-model="value" :highlight="highlighter"></prism-editor>
</template>

<script>
import { PrismEditor } from "vue-prism-editor";

import { highlight, languages } from "prismjs/components/prism-core";
import "../utils/prism_sql_custom.js";

export default {
	components: {
		PrismEditor
	},
	props: {
		value: {
			type: String,
			required: true
		}
	},
	watch: {
		value() {
			this.$emit('update:value', this.value);
		}
	},
	methods: {
		highlighter(code) {
			return highlight(code, languages.sql); // languages.<insert language> to return html with markup
		},
	},
};
</script>

<style>
.my-editor {
	background: var(--background-color3);
	color: var(--input-color);

	font-family: var(--input-numerical-font-family);
	font-size: 14px;
	line-height: 1.5;
	padding: 10px;
	
	border-radius: 5px;
}

/* optional class for removing the outline */
.prism-editor__textarea:focus {
	outline: none;
}
</style>