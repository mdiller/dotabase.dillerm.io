<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
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
		</div>

		<!-- 2x scaled nameplate -->
		<DotaNameplate :config="config" :level="level" :scaled="true" />

		<!-- 1x nameplate -->
		<DotaNameplate :config="config" :level="level" :scaled="false" />
	</div>
</template>

<script>
import DillermSelect    from "@dillerm/webutils/src/components/controls/DillermSelect.vue";
import DillermSlider    from "@dillerm/webutils/src/components/controls/DillermSlider.vue";
import DillermNumerical from "@dillerm/webutils/src/components/controls/DillermNumerical.vue";
import DotaNameplate    from "../components/DotaNameplate.vue";
import { calculateResources } from "../utils/calculationEngine.js";

export default {
	components: { DillermSelect, DillermSlider, DillermNumerical, DotaNameplate },

	data() {
		return {
			heroOptions:    [],
			selectedHeroId: null,
			level: 1,
			config: {
				hero_id:    null,
				hp_current: 1100,
				hp_max:     1400,
				mp_current: 900,
				mp_max:     900,
				hp_regen:   0,
				mana_regen: 0
			}
		};
	},

	methods: {
		async runCalculation() {
			const prev_hp_pct = this.config.hp_max > 0 ? this.config.hp_current / this.config.hp_max : 1;
			const prev_mp_pct = this.config.mp_max > 0 ? this.config.mp_current / this.config.mp_max : 1;

			const { hp_max, mp_max, hp_regen, mana_regen } = await calculateResources(this.selectedHeroId, this.level);

			this.config.hero_id    = this.selectedHeroId;
			this.config.hp_max     = hp_max;
			this.config.mp_max     = mp_max;
			this.config.hp_current = Math.round(prev_hp_pct * hp_max);
			this.config.mp_current = Math.round(prev_mp_pct * mp_max);
			this.config.hp_regen   = hp_regen;
			this.config.mana_regen = mana_regen;
		}
	},

	watch: {
		selectedHeroId() { this.runCalculation(); },
		level()          { this.runCalculation(); }
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

		// Set default AFTER options load so DillermSelect can find and display the match
		this.selectedHeroId = 105;
		await this.runCalculation();
	}
};
</script>

<style lang="scss">
.calc-box {
	border-radius: 5px;
	background-color: var(--background-color2);
	padding: 10px;
}

.calc-controls {
	padding: 10px 100px;

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

@media only screen and (max-width: 650px) {
	.calc-controls {
		padding: 10px 20px;
	}
}
</style>
