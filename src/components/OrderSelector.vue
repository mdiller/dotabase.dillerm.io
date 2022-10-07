<template>
	<div class="order-selector">
		<span>
			Sort By
		</span>
		<dillerm-select 
			v-model:value="selected_sort_order"
			:options="actual_options"
			:emitvalue="true"
			:searchable="false" />
		<span
			:class="{ toggled: is_desc, random: selected_sort_order == 'RANDOM()' }"
			@click="is_desc = !is_desc">
			<ArrowDown />
		</span>
	</div>
</template>

<script>
import ArrowDown from "../assets/arrow_down.svg?component";
	
// these will come from the library
import DillermSelect from "./DillermSelect.vue";

export default {
	props: {
		value: {
			type: String,
			required: false
		},
		options: {
			type: String,
			required: true
		},
		enable_random: {
			type: Boolean,
			required: true
		}
	},
	components: {
		DillermSelect,
		ArrowDown
	},
	data() {
		return {
			selected_sort_order: null,
			is_desc: false
		};
	},
	computed: {
		actual_options() {
			var opts = this.options.split(",").map(opt => {
				var split = opt.split("=");
				return {
					label: split[0],
					value: split[1]
				}
			});
			if (this.enable_random) {
				opts.push({
					label: "Random",
					value: "RANDOM()"
				})
			}
			return opts;
		}
	},
	watch: {
		actual_options: {
			handler() {
				this.selected_sort_order = this.actual_options[0].value;
			}, immediate: true
		},
		selected_sort_order: {
			handler() {
				this.emitValue();
			}, immediate: true
		},
		is_desc() {
			this.emitValue();
		}
	},
	methods: {
		emitValue() {
			var value = `ORDER BY ${this.selected_sort_order}`;
			if (this.is_desc) {
				value = value += " DESC";
			}
			this.$emit('update:value', value);
		}
	}
};
</script>

<style lang="scss">

.order-selector {
	display: flex;

	border: var(--input-border);
	border-radius: var(--input-border-radius);
	background-color: var(--input-background);

	> * {
		display: inline-block;
		white-space: nowrap;
	}

	> :first-child {
		padding: 0px 10px;
		line-height: var(--input-height);
		background-color: var(--background-color4)
	}

	> .dillerm-select {
		min-width: 100px;

		input {
			border: none;
			border-radius: 0px;
		}
	}

	> :last-child {
		width: var(--input-height);
		height: var(--input-height);
		background-color: var(--background-color4);

		cursor: pointer;

		svg {
			opacity: 0.75;
			transform: scale(0.8);
			transition: transform 0.25s;

			path {
				fill: var(--input-color);
			}
		}

		&.toggled svg {
			transform: scale(0.8) rotate(-180deg);
		}

		&.random {
			svg {
				transition: transform 0.5s;
				transform: scale(0.8) rotate(90deg);
			}
			&.toggled svg {
				transform: scale(0.8) rotate(450deg);
			}
		}
	}
}

</style>