<template>
	<div class="dillerm dillerm-control dillerm-text">
		<input
			v-model="val"
			type="text"
			:placeholder="placeholder">
		<svg 
			:class="{ 'text-clear-button': true, 'hidden': !clearable || val == '' }"
			@click="val = ''"
			viewBox="0 0 24 24">
			<path d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29-4.3 4.29a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l4.29-4.3 4.29 4.3a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42z" />
		</svg>
	</div>
</template>

<script>
export default {
	name: 'dillerm-text',
	props: {
		value: {
			type: String,
			required: true
		},
		placeholder: {
			type: String,
			default: ""
		},
		clearable: {
			type: Boolean,
			default: false
		},
		debounce_delay: {
			type: Number,
			default: 0
		}
	},
	data() {
		return {
			val: null
		}
	},
	computed: {
		debouncedEmit() {
			var emitFunc = () => this.$emit('update:value', this.val);
			emitFunc = this.debounce_delay == 0 ? emitFunc : DillermWebUtils.utils.debounce(emitFunc, this.debounce_delay);
			return () => {
				this.$emit('typing', this.val);
				emitFunc();
			};
		}
	},
	watch: {
		val() {
			this.debouncedEmit();
		},
		value: {
			handler() {
				this.val = this.value;
			}, immediate: true
		}
	}
}
</script>

<style lang="scss">

$button-icon-side-padding: 10px;
$button-icon-size: 20px;

.dillerm-text {
	position: relative;
	width: 100%;
	height: var(--input-height);

	&:hover input,
	& input:focus {
		background: var(--input-hover-color);
	}

	input {
		display: block;
		padding: var(--input-padding);
		width: 100%;
		min-height: var(--input-height);
		appearance: textfield;

		font-family: var(--input-font-family);
		font-size: var(--input-font-size);

		border: var(--input-border);
		border-radius: var(--input-border-radius);
		background: var(--input-background);
		color: var(--input-color);

		&:hover,
		&:focus {
			background: var(--input-hover-color);
		}
	}

	.text-clear-button {
		width: $button-icon-size;
		height: $button-icon-size;
		position: absolute;
		top: calc((#{var(--input-height)} - #{$button-icon-size}) / 2);
		right: 0;
		cursor: pointer;
		fill: var(--input-color);
		opacity: 0.75;
		transition: opacity var(--input-transition-time), fill var(--input-transition-time);

		right: $button-icon-side-padding;

		&:hover {
			fill: red;
			opacity: 1;
		}

		&.hidden {
			transition: opacity 0s;
			pointer-events: none;
			opacity: 0;
		}
	}
}

</style>