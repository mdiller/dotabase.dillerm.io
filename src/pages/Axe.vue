<template>
	<div class="dillerm main-app">
		<div class="dillerm dillerm-content">
			<div class="axe-center">

				<!-- Title -->
				<div class="culling-title">
					<img
						class="culling-icon"
						:src="'/vpk/panorama/images/spellicons/axe_culling_blade_png.png'"
						title="Play Culling Blade sound"
						@click="playSound"
					/>
					<span class="culling-title-text">Culling Blade</span>
					<audio ref="sound" :src="'/vpk/sounds/weapons/hero/axe/culling_blade_success.wav'" />
				</div>

				<!-- Nameplate entries -->
				<div class="nameplate-list">
					<div class="nameplate-entry" v-for="entry in entries" :key="entry.level">
						<div class="entry-label">
							<span class="entry-level">Level {{ entry.level }}</span>
							<span class="entry-desc">{{ entry.desc }}</span>
							<span class="entry-threshold">Execute: {{ entry.threshold }} HP</span>
							<span class="entry-bars">{{ (entry.threshold / 250).toFixed(1) }} bars</span>
						</div>
						<DotaNameplate :config="entry.config" :level="entry.level" :scaled="true" :is_ally="false" />
					</div>
				</div>

			</div>
		</div>
	</div>
</template>

<script>
import DotaNameplate from "../components/DotaNameplate.vue";
import { calculateResources, getStat } from "../utils/calculationEngine.js";

const TECHIES_ID = 105;

async function sql(query) {
	const res = await fetch(`/api/sql?q=${encodeURI(query)}`);
	if (res.ok) return res.json();
	return null;
}

async function fetchCullingBladeData() {
	const [abilityRows, talentRows] = await Promise.all([
		sql("SELECT ability_special FROM abilities WHERE name = 'axe_culling_blade'"),
		sql("SELECT ability_special FROM abilities WHERE name = 'special_bonus_unique_axe_5'"),
	]);

	// ability_special is a JSON string — parse damage values "275 375 475"
	const abilitySpecial = JSON.parse(abilityRows[0].ability_special);
	const damageEntry    = abilitySpecial.find(e => e.key === 'damage');
	const thresholds     = damageEntry.value.split(' ').map(Number);

	// talent ability_special — parse bonus_damage "150"
	const talentSpecial  = JSON.parse(talentRows[0].ability_special);
	const bonusEntry     = talentSpecial.find(e => e.key === 'bonus_damage');
	const talentBonus    = Number(bonusEntry.value);

	return { thresholds, talentBonus };
}

const LEVEL_CONFIGS = [
	{ level: 6,  cbLevel: 1, hasTalent: false, desc: 'Culling Blade Lv.1' },
	{ level: 12, cbLevel: 2, hasTalent: false, desc: 'Culling Blade Lv.2' },
	{ level: 18, cbLevel: 3, hasTalent: false, desc: 'Culling Blade Lv.3' },
	{ level: 30, cbLevel: 3, hasTalent: true,  desc: 'Culling Blade Lv.3 + Lv.25 Talent' },
];

export default {
	components: { DotaNameplate },

	data() {
		return {
			entries: [],
		};
	},

	methods: {
		playSound() {
			const audio = this.$refs.sound;
			audio.currentTime = 0;
			audio.play();
		},
	},

	async created() {
		const { thresholds, talentBonus } = await fetchCullingBladeData();

		this.entries = LEVEL_CONFIGS.map(cfg => ({
			level:     cfg.level,
			desc:      cfg.desc,
			threshold: thresholds[cfg.cbLevel - 1] + (cfg.hasTalent ? talentBonus : 0),
			config: {
				hero_id:    TECHIES_ID,
				hp_current: 0,
				hp_max:     0,
				mp_current: 0,
				mp_max:     0,
			},
		}));

		for (const entry of this.entries) {
			const { stats } = await calculateResources(TECHIES_ID, entry.level);
			entry.config.hp_max     = getStat(stats, 'hp_max');
			entry.config.mp_max     = getStat(stats, 'mp_max');
			entry.config.hp_current = entry.threshold;
			entry.config.mp_current = Math.round(getStat(stats, 'mp_max') * 0.5);
		}
	},
};
</script>

<style lang="scss">
.axe-center {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 24px;
}

/* ── Title ─────────────────────────────────────────── */
.culling-title {
	display: flex;
	align-items: center;
	gap: 16px;
}

.culling-icon {
	width:  64px;
	height: 64px;
	border: 2px solid #8b6914;
	border-radius: 6px;
	box-shadow: 0 0 8px rgba(200, 140, 20, 0.4);
	cursor: pointer;
	image-rendering: pixelated;
	transition: box-shadow 0.15s, border-color 0.15s;

	&:hover {
		border-color: #c8a020;
		box-shadow: 0 0 14px rgba(200, 160, 32, 0.65);
	}

	&:active {
		box-shadow: 0 0 6px rgba(200, 140, 20, 0.3);
	}
}

.culling-title-text {
	font-size: 28px;
	font-weight: bold;
	color: #dadada;
	letter-spacing: 0.03em;
}

/* ── Nameplate list ─────────────────────────────────── */
.nameplate-list {
	display: flex;
	flex-direction: column;
}

.nameplate-entry {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 40px;
}

.entry-label {
	display: flex;
	flex-direction: column;
	gap: 2px;
	width: 200px;
	flex-shrink: 0;
	text-align: right;
}

.entry-level {
	font-size: 14px;
	font-weight: bold;
	color: #dadada;
}

.entry-desc {
	font-size: 11px;
	color: #aaa;
}

.entry-threshold {
	font-size: 12px;
	color: #cc4444;
	font-weight: bold;
}

.entry-bars {
	font-size: 11px;
	color: #888;
}
</style>
