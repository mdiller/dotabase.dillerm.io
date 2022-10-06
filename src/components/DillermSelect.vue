<template>
	<div 
		@click="startEdit"
		@focus="startEdit"
		class="dillerm dillerm-control dillerm-select">
		<input
			ref="input"
			type="text"
			:placeholder="(focused || !selected_option) ? placeholder : ''"
			v-model="input"
			@focus.prevent="startEdit"
			@blur="endEdit"
			@keyup.esc="endEdit"
			:class="{ focused: focused, searchable: searchable }"
			:inputmode="searchable ? 'text' : 'none'">
		<span
			class="select-search-current"
			v-if="selected_option && (!searchable || !focused)">
			<img
				class="option-icon"
				v-if="selected_option.icon || selected_option.icon_style"
				:src="selected_option.icon || TRANSPARENT_IMAGE"
				:style="selected_option.icon_style">
			<span :class="{ noicon: !(selected_option.icon || selected_option.icon_style) }">
				{{selected_option.label || placeholder}}
			</span>
		</span>
		<div v-if="focused" @mousedown.prevent>
			<div class="select-search-status" v-if="actual_options.length == 0" @mousedown.prevent>
				{{status}}
			</div>
			<div 
				v-for="(option, index) in actual_options"
				:class="{ 'select-search-option': true, hover: (index == hovered_option_index), noicon: !(option.icon || option.icon_style), 'is-selected': option == selected_option }"
				@click.stop="selectOption(option)"
				@mousedown.prevent>
				<img
					class="option-icon"
					v-if="option.icon || option.icon_style"
					:src="option.icon || TRANSPARENT_IMAGE"
					:style="option.icon_style">
				{{option.label}}
			</div>
		</div>
		<svg 
			v-if="!focused && selected_option && nullable" 
			@click.stop="selectOption(null)" 
			class="select-search-clear"
			viewBox="0 0 24 24">
			<path d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29-4.3 4.29a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l4.29-4.3 4.29 4.3a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42z" />
		</svg>
		<svg
			:class="{'select-search-down': true, expanded: focused }"
			@mousedown.prevent.stop="toggleEdit"
			@focus.stop
			@click.stop
			viewBox="0 0 24 24">
			<path d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15 1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16z" />
		</svg>
	</div>
</template>

<script>

export default {
	name: "dillerm-select",
	props: {
		value: {
			required: true,
			validator(value) {
				return value == null || typeof(value) == "object" || typeof(value) == "string";
			}
		},
		options: {
			// type: Function, // callback(newoptions, optional newstatus), or just a list of options
			required: true
		},
		placeholder: {
			type: String,
			default: ""
		},
		nullable: {
			type: Boolean,
			default: false
		},
		emitvalue: {
			type: Boolean,
			default: false
		},
		searchable: {
			type: Boolean,
			default: true
		},
		debounce_delay: {
			type: Number,
			default: 250
		}
	},
	data() {
		return {
			selected_option: null,
			input: "",
			focused: false,
			hovered_option_index: -1,
			actual_options: [],
			status: "",
			TRANSPARENT_IMAGE: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAD0lEQVR42mNkwAIYh7IgAAVVAAuInjI5AAAAAElFTkSuQmCC"
		}
	},
	computed: {
		options_func() {			
			if (this.options instanceof Function) {
				return this.options;
			}
			else {
				var newoptions = this.options;
				if (newoptions.length > 0) {
					if (typeof newoptions[0] == "string") {
						newoptions = newoptions.map(opt => { return { label: opt, value: opt } });
					}
				}
				return (input, callback) => {
					if (input) {
						var pattern = new RegExp(DillermWebUtils.utils.escapeRegex(input), "i");
						callback(newoptions.filter(opt => pattern.test(opt.label)))
					}
					else {
						callback(newoptions);
					}
				};
			}
		}
	},
	watch: {
		input() {
			this.status = "Searching...";
			this.debouncedRecreateOptions();
		},
		value() {
			this.syncValueDown();
		},
		selected_option() {			
			if (this.emitvalue && this.selected_option) {
				this.$emit('update:value', this.selected_option.value);
			}
			else {
				this.$emit('update:value', this.selected_option);
			}
		}
	},
	methods: {
		syncValueDown() {			
			if (this.value != this.selected_option) {
				if (this.emitvalue) {					
					this.selected_option = this.actual_options.find(opt => opt.value == this.value);					
				}
				else {
					this.selected_option = this.value;
				}
			}
		},
		toggleEdit() {
			if (this.focused) {
				this.endEdit();
			}
			else {
				this.startEdit();
			}
		},
		startEdit() {
			this.focused = true;
			this.$refs.input.focus();
		},
		endEdit() {
			this.focused = false;
			this.input = "";
			this.$refs.input.blur();
			this.hovered_option_index = -1;
		},
		recreateOptions() {			
			var self = this;
			this.hovered_option_index = -1;
			this.options_func(this.input, (newoptions, newstatus) => {
				if (newstatus != undefined) {
					self.status = newstatus;
				}
				else if (newoptions.length == 0) {
					self.status = "None Found";
				}
				self.actual_options = newoptions;
			});
		},
		selectOption(option) {
			if (option !== undefined) {
				this.selected_option = option;
				this.endEdit();
			}
		},
		keyHandler(event) {
			var index_before = this.hovered_option_index;
			if (event.key == "ArrowDown") {
				if (this.hovered_option_index < this.actual_options.length - 1) {
					this.hovered_option_index++;
				}
			}
			else if (event.key == "ArrowUp") {
				if (this.hovered_option_index > 0) {
					this.hovered_option_index--;
				}
			}
			else if (event.key == "Enter") {
				if (this.hovered_option_index != -1 && this.actual_options.length > 0) {
					this.selectOption(this.actual_options[this.hovered_option_index]);
				}
				else {
					this.selectOption(this.actual_options[0]);
				}
			}
			if (index_before != this.hovered_option_index && index_before != -1 && this.focused) {
				this.$el.querySelectorAll(":scope .select-search-option")[this.hovered_option_index].scrollIntoView({block: "nearest", inline: "nearest"});
			}
		}
	},
	mounted() {
		this.$el.addEventListener("keydown", this.keyHandler);
	},
	created() {		
		this.debouncedRecreateOptions = DillermWebUtils.utils.debounce(this.recreateOptions, this.debounce_delay);
		this.recreateOptions();
		this.syncValueDown();
	}
};
</script>

<style lang="scss">

</style>