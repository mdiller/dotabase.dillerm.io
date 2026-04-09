<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<div class="resource-center">
				<!-- Controls panel -->
				<div class="controls-panel">
				<div class="calc-box">
					<div class="calc-controls">
						<!-- Hero select -->
						<div class="control-row">
							<label>Hero</label>
							<dillerm-select
								v-model:value="selectedHeroId"
								:options="heroOptions"
								:searchable="true"
								:emitvalue="true"
								:clearable="false"
								placeholder="Select a hero..." />
						</div>

						<!-- Level slider + number -->
						<div class="control-row">
							<label>Level</label>
							<dillerm-slider
								v-model:value="level"
								:min="1"
								:max="30"
								style="--input-color: #b28a49" />
							<dillerm-numerical
								class="level-number-input"
								v-model:value="level"
								:min="1"
								:max="30"
								:integer="true" />
						</div>

						<!-- HP current slider -->
						<div class="control-row">
							<label>Health</label>
							<div class="hp-slider-wrap">
								<dillerm-slider
									v-model:value="config.hp_current"
									:min="0"
									:max="config.hp_max" />
								<span class="regen-overlay">+{{ fmtRegen(hpRegen) }}</span>
							</div>
						</div>

						<!-- MP current slider -->
						<div class="control-row">
							<label>Mana</label>
							<div class="mp-slider-wrap">
								<dillerm-slider
									v-model:value="config.mp_current"
									:min="0"
									:max="config.mp_max" />
								<span class="regen-overlay">+{{ fmtRegen(mpRegen) }}</span>
							</div>
						</div>

						<!-- Inventory -->
						<div class="inventory-section">
							<table class="inventory-table">
								<tbody>
									<tr v-for="row in 2" :key="row">
										<td
											v-for="col in 3"
											:key="col"
											class="inventory-slot"
											:class="{ 'has-item': inventory[(row-1)*3+(col-1)] !== null, 'active': itemPickerSlot === (row-1)*3+(col-1) }"
											:ref="el => slotRefs[(row-1)*3+(col-1)] = el"
											@click="openItemPicker((row-1)*3+(col-1))">
											<img
												v-if="inventory[(row-1)*3+(col-1)]"
												:src="inventory[(row-1)*3+(col-1)].icon"
												:alt="inventory[(row-1)*3+(col-1)].label"
												class="item-icon" />
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<!-- Stats panel: absolutely positioned to the right of the controls panel -->
				<BreakdownPanel class="stats-panel" :stats="stats" />
				</div><!-- end controls-panel -->

				<!-- Item picker popup -->
				<div v-if="itemPickerSlot !== null" class="item-picker-overlay" @click.self="closeItemPicker" @keydown.tab.prevent="onTabInPicker" @keydown.esc="closeItemPicker" @keydown="onPickerArrow" @keydown.backspace="onPickerBackspace">
					<div class="item-picker-popup" :style="itemPickerStyle">
						<dillerm-select
							:value="inventory[itemPickerSlot]"
							:options="itemOptions"
							:searchable="true"
							:nullable="true"
							:emitvalue="false"
							placeholder="Select an item..."
							@update:value="onItemSelected"
							ref="itemPickerSelectRef" />
					</div>
				</div>

				<!-- 2x scaled nameplate -->
				<DotaNameplate :config="config" :level="level" :scaled="true" />

				<!-- 1x nameplate -->
				<DotaNameplate :config="config" :level="level" :scaled="false" />
			</div>
		</div>
	</div>
</template>

<script>
import DillermSelect    from "@dillerm/webutils/src/components/controls/DillermSelect.vue";
import DillermSlider    from "@dillerm/webutils/src/components/controls/DillermSlider.vue";
import DillermNumerical from "@dillerm/webutils/src/components/controls/DillermNumerical.vue";
import DotaNameplate    from "../components/DotaNameplate.vue";
import BreakdownPanel   from "../components/BreakdownPanel.vue";
import { calculateResources, getStat } from "../utils/calculationEngine.js";


const STORAGE_KEY = 'resourceCalc_heroId';
const DEFAULT_HERO_ID = 105;
const INVENTORY_SIZE = 6;

export default {
	components: { DillermSelect, DillermSlider, DillermNumerical, DotaNameplate, BreakdownPanel },

	data() {
		return {
			heroOptions:       [],
			itemOptions:       [],
			selectedHeroId:    null,
			level:             6,
			stats:             [],
			inventory:         Array(INVENTORY_SIZE).fill(null),
			itemPickerSlot:    null,
			itemPickerStyle:   {},
			itemPickerReady:   false,
			slotRefs:          [],
			config: {
				hero_id:    null,
				hp_current: 0,
				hp_max:     0,
				mp_current: 0,
				mp_max:     0,
			}
		};
	},

	computed: {
		hpRegen() { return getStat(this.stats, 'hp_regen'); },
		mpRegen() { return getStat(this.stats, 'mana_regen'); },
	},

	methods: {
		fmtRegen(v) {
			if (v === 0) return '0';
			return parseFloat(v.toFixed(1)).toString();
		},

		async runCalculation() {
			const prev_hp_pct = this.config.hp_max > 0 ? this.config.hp_current / this.config.hp_max : 1;
			const prev_mp_pct = this.config.mp_max > 0 ? this.config.mp_current / this.config.mp_max : 1;

			this.stats = await calculateResources(this.selectedHeroId, this.level, this.inventory.filter(Boolean));

			const hp_max = getStat(this.stats, 'hp_max');
			const mp_max = getStat(this.stats, 'mp_max');

			this.config.hero_id    = this.selectedHeroId;
			this.config.hp_max     = hp_max;
			this.config.mp_max     = mp_max;
			this.config.hp_current = Math.round(prev_hp_pct * hp_max);
			this.config.mp_current = Math.round(prev_mp_pct * mp_max);
		},

		openItemPicker(slotIndex) {
			const el = this.slotRefs[slotIndex];
			if (el) {
				const rect = el.getBoundingClientRect();
				this.itemPickerStyle = {
					position: 'fixed',
					top:  `${rect.bottom + 4}px`,
					left: `${rect.left}px`,
					zIndex: 1000,
					width: '270px',
				};
			}
			this.itemPickerReady = false;
			this.itemPickerSlot = slotIndex;
			this.$nextTick(() => {
				const sel = this.$refs.itemPickerSelectRef;
				if (sel) {
					// Suppress password manager autofill
					if (sel.$refs?.input) {
						sel.$refs.input.setAttribute('autocomplete', 'off');
					}
					if (typeof sel.startEdit === 'function') sel.startEdit();
				}
				this.itemPickerReady = true;
			});
		},

		closeItemPicker() {
			this.itemPickerSlot = null;
			this.itemPickerReady = false;
		},

		onItemSelected(item) {
			if (this.itemPickerSlot === null || !this.itemPickerReady) return;
			this.inventory[this.itemPickerSlot] = item ?? null;
			const next = this.itemPickerSlot + 1;
			const shouldAdvance = next < INVENTORY_SIZE && this.inventory[next] === null;
			this.closeItemPicker();
			this.runCalculation();
			if (shouldAdvance) {
				this.$nextTick(() => this.openItemPicker(next));
			}
		},

		onPickerArrow(e) {
			if (!e.ctrlKey) return;
			const COLS = 3, ROWS = 2;
			const slot = this.itemPickerSlot;
			const row = Math.floor(slot / COLS);
			const col = slot % COLS;
			let target = null;
			if (e.key === 'ArrowLeft'  && col > 0)        target = slot - 1;
			if (e.key === 'ArrowRight' && col < COLS - 1) target = slot + 1;
			if (e.key === 'ArrowUp'    && row > 0)        target = slot - COLS;
			if (e.key === 'ArrowDown'  && row < ROWS - 1) target = slot + COLS;
			if (target === null) return;
			e.preventDefault();
			this.closeItemPicker();
			this.$nextTick(() => this.openItemPicker(target));
		},

		onPickerBackspace() {
			const input = this.$refs.itemPickerSelectRef?.$refs?.input;
			if (input && input.value.length > 0) return;
			if (this.itemPickerSlot === null) return;
			this.inventory[this.itemPickerSlot] = null;
			this.closeItemPicker();
			this.runCalculation();
		},

		onTabInPicker() {
			const next = (this.itemPickerSlot + 1) % INVENTORY_SIZE;
			this.closeItemPicker();
			this.$nextTick(() => this.openItemPicker(next));
		},
	},

	watch: {
		selectedHeroId(id) {
			if (id == null) {
				this.selectedHeroId = DEFAULT_HERO_ID;
				return;
			}
			localStorage.setItem(STORAGE_KEY, id);
			this.runCalculation();
		},
		level() { this.runCalculation(); }
	},

	async created() {
		const [heroRes, itemRes] = await Promise.all([
			fetch(`/api/sql?q=${encodeURI(
				"SELECT localized_name as label, id as value, '/vpk' || icon as icon, 'width: 32px; height: 32px; margin: 4px' as icon_style FROM heroes ORDER BY localized_name"
			)}`),
			fetch(`/api/sql?q=${encodeURI(
				"SELECT localized_name as label, id as value, '/vpk' || icon as icon FROM items WHERE localized_name != '' ORDER BY localized_name"
			)}`),
		]);

		if (heroRes.ok) this.heroOptions = await heroRes.json();
		if (itemRes.ok) this.itemOptions = await itemRes.json();

		// Wait for DillermSelect to process the new options into actual_options
		await this.$nextTick();

		// Set after options load so DillermSelect can find the matching option
		const savedId = localStorage.getItem(STORAGE_KEY);
		this.selectedHeroId = savedId ? Number(savedId) : DEFAULT_HERO_ID;
		// Watcher fires and calls runCalculation()
	}
};
</script>

<style lang="scss">
.resource-center {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
}

.controls-panel {
	position: relative;
	width: 100%;
}

.stats-panel {
	position: absolute;
	left: calc(100% + 8px);
	top: 0;
}

@media (max-width: 900px) {
	.stats-panel {
		position: static;
		width: 100%;
		margin-top: 8px;
	}
}

.calc-box {
	border-radius: 5px;
	background-color: var(--background-color2);
	padding: 10px;
	width: 100%;
}

.calc-controls {
	padding: 10px 20px;

	.control-row {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 8px;

		label {
			width: 60px;
			flex-shrink: 0;
			color: var(--text-color-secondary, #aaa);
			font-size: 13px;
			text-align: right;
		}

		> *:not(label) {
			flex: 1;
		}
	}
}

.level-number-input {
	flex: 0 0 80px !important;
}

/* HP slider: green fill */
.hp-slider-wrap {
	flex: 1;
	position: relative;
	--input-color: #adf762;

	.regen-overlay {
		color: mix(white, #adf762, 82%);
		text-shadow: 0 0 6px rgba(#adf762, 0.7), 0 0 12px rgba(#adf762, 0.35);
	}
}

/* MP slider: blue fill */
.mp-slider-wrap {
	flex: 1;
	position: relative;
	--input-color: #4f78fa;

	.regen-overlay {
		color: mix(white, #4f78fa, 82%);
		text-shadow: 0 0 6px rgba(#4f78fa, 0.7), 0 0 12px rgba(#4f78fa, 0.35);
	}
}

.regen-overlay {
	position: absolute;
	left: 58px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 11px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	pointer-events: none;
	white-space: nowrap;
	line-height: 1;
}


/* Inventory */
.inventory-section {
	margin-top: 12px;
	padding-top: 10px;
	border-top: 1px solid var(--border-color, #333);
}

.inventory-table {
	margin: 0 auto;
	border-collapse: separate;
	border-spacing: 6px;
	background: var(--background-color4);
	border-radius: var(--input-border-radius);
	overflow: hidden;
}

.inventory-slot {
	width: 88px;
	height: 64px;
	background-color: var(--input-background);
	cursor: pointer;
	padding: 0;
	overflow: hidden;
	position: relative;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.98);
		pointer-events: none;
		opacity: 0.5;
		transition: opacity 0.15s;
	}

	&:hover::after,
	&.active::after {
		opacity: 1;
	}

	.item-icon {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		pointer-events: none;
	}
}

/* Item picker popup */
.item-picker-overlay {
	position: fixed;
	inset: 0;
	z-index: 999;
}

.item-picker-popup {
	background: var(--background-color2, #1e1e1e);
	border: 1px solid var(--border-color, #444);
	border-radius: 6px;
	padding: 6px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

</style>
