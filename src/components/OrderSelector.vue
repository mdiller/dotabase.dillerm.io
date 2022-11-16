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
			<i class="fa fa-arrow-down"></i>
		</span>
	</div>
</template>

<script>
	
import DillermSelect from "@dillerm/webutils/src/components/controls/DillermSelect.vue";

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
		DillermSelect
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

		display: flex;
		align-items: center;
		justify-content: center;

		cursor: pointer;

		i {
			opacity: 0.75;
			transition: transform 0.25s;
			color: var(--input-color);
			font-size: 24px;
		}

		&.toggled i {
			transform: rotate(-180deg);
		}

		&.random {
			i {
				transition: transform 0.5s;
				transform: rotate(90deg);
			}
			&.toggled i {
				transform: rotate(450deg);
			}
		}
	}
}

</style>