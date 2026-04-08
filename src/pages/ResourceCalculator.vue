<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<div class="resource-center">
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
								:max="30" />
							<dillerm-numerical
								class="level-number-input"
								v-model:value="level"
								:min="1"
								:max="30"
								:integer="true" />
						</div>

						<!-- HP current slider -->
						<div class="control-row">
							<label>HP</label>
							<div class="hp-slider-wrap">
								<dillerm-slider
									v-model:value="config.hp_current"
									:min="0"
									:max="config.hp_max" />
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
							</div>
						</div>
					</div>
				</div>

				<!-- 2x scaled nameplate -->
				<DotaNameplate :config="config" :level="level" :scaled="true" />

				<!-- 1x nameplate -->
				<DotaNameplate :config="config" :level="level" :scaled="false" />

				<!-- Calculation breakdown -->
				<BreakdownPanel :stats="stats" />
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

export default {
	components: { DillermSelect, DillermSlider, DillermNumerical, DotaNameplate, BreakdownPanel },

	data() {
		return {
			heroOptions:    [],
			selectedHeroId: null,
			level: 1,
			stats: [],
			config: {
				hero_id:    null,
				hp_current: 0,
				hp_max:     0,
				mp_current: 0,
				mp_max:     0,
			}
		};
	},

	methods: {
		async runCalculation() {
			const prev_hp_pct = this.config.hp_max > 0 ? this.config.hp_current / this.config.hp_max : 1;
			const prev_mp_pct = this.config.mp_max > 0 ? this.config.mp_current / this.config.mp_max : 1;

			this.stats = await calculateResources(this.selectedHeroId, this.level);

			const hp_max = getStat(this.stats, 'hp_max');
			const mp_max = getStat(this.stats, 'mp_max');

			this.config.hero_id    = this.selectedHeroId;
			this.config.hp_max     = hp_max;
			this.config.mp_max     = mp_max;
			this.config.hp_current = Math.round(prev_hp_pct * hp_max);
			this.config.mp_current = Math.round(prev_mp_pct * mp_max);
		}
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
		const res = await fetch(
			`/api/sql?q=${encodeURI(
				"SELECT localized_name as label, id as value, '/vpk' || icon as icon, 'width: 32px; height: 32px; margin: 4px' as icon_style FROM heroes ORDER BY localized_name"
			)}`
		);
		if (res.ok) {
			this.heroOptions = await res.json();
		}

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
		gap: 10px;
		margin-bottom: 8px;

		label {
			width: 60px;
			flex-shrink: 0;
			color: var(--text-color-secondary, #aaa);
			font-size: 13px;
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
	--input-color: #adf762;
}

/* MP slider: blue fill */
.mp-slider-wrap {
	flex: 1;
	--input-color: #4f78fa;
}

</style>
