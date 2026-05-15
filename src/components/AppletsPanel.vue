<template>
	<div class="applets-panel">
		<div class="applets-header">
			<dillerm-select
				v-model:value="selectedApplet"
				:options="appletOptions"
				:nullable="true"
				:emitvalue="true"
				placeholder="No applet selected"
				class="applet-select" />
		</div>

		<div v-if="selectedApplet" class="applets-body">
			<template v-if="selectedApplet === 'tankiness'">
				<tankiness-applet
					:inventory="inventory"
					:stats="stats"
					@add-item="$emit('add-item', $event)" />
			</template>

			<template v-if="selectedApplet === 'backpack_efficiency'">

				<!-- Regen source row -->
				<div class="applet-row">
					<dillerm-select
						v-model:value="selectedRegenItem"
						:options="regenItemOptions"
						:emitvalue="true"
						:clearable="false"
						placeholder="Select regen source..."
						class="regen-select" />
					<dillerm-numerical
						v-model:value="multiplier"
						:min="1"
						:max="20"
						:integer="true"
						class="multiplier-input"
						title="Uses" />
				</div>

				<!-- Custom inputs -->
				<template v-if="selectedRegenItem === 'custom'">
					<div class="applet-row custom-row">
						<span class="custom-label hp-label">HP</span>
						<dillerm-numerical v-model:value="customHp" :min="0" class="custom-amount-input hp-input" />
					</div>
					<div class="applet-row custom-row">
						<span class="custom-label mp-label">Mana</span>
						<dillerm-numerical v-model:value="customMp" :min="0" class="custom-amount-input mp-input" />
					</div>
				</template>

				<!-- No eligible items -->
				<p v-if="backpackItems.length === 0" class="summary">
					None of the items in your inventory can be backpacked to increase the regen efficiency of {{ regenDef?.label ?? 'this item' }}.
				</p>

				<template v-else>
					<!-- Items to backpack -->
					<div class="backpack-section">
						<div class="section-label">Items to Backpack</div>
						<div class="backpack-items">
							<div
								v-for="(item, i) in backpackItems"
								:key="i"
								class="backpack-item"
								:class="{ disabled: disabledBackpackSet.has(i) }"
								@click="toggleBackpackItem(i)">
								<img :src="item.icon" :alt="item.label" class="backpack-icon" />
								<span class="backpack-name">{{ item.label }}</span>
							</div>
						</div>
					</div>

					<!-- ── Efficiency table with inline bars ── -->
					<div class="eff-opt">
						<table class="compare-table">
							<thead>
								<tr>
									<th></th>
									<th>Normal</th>
									<th>Backpack</th>
									<th>Bonus</th>
								</tr>
							</thead>
							<tbody>
								<template v-if="eff.hasHp && eff.extraHp > 0.5">
									<tr>
										<td class="res hp" rowspan="2">Health</td>
										<td>{{ fmt(eff.regenHp) }}</td>
										<td class="col-hp">{{ fmt(eff.backpackHp) }}</td>
										<td class="col-hp">+{{ fmt(eff.extraHp) }}</td>
									</tr>
									<tr class="bar-row-tr">
										<td colspan="2" class="bar-td">
											<div class="bar-track">
												<div class="seg-base hp"  :style="{ flex: eff.regenHp || 1 }"></div>
												<div class="seg-bonus hp" :style="{ flex: Math.max(eff.extraHp, 0) }"></div>
											</div>
										</td>
										<td class="col-hp pct-td">+{{ fmtPct(eff.hpPct) }}</td>
									</tr>
								</template>
								<template v-if="eff.hasMp && eff.extraMp > 0.5">
									<tr>
										<td class="res mp" rowspan="2">Mana</td>
										<td>{{ fmt(eff.regenMp) }}</td>
										<td class="col-mp">{{ fmt(eff.backpackMp) }}</td>
										<td class="col-mp">+{{ fmt(eff.extraMp) }}</td>
									</tr>
									<tr class="bar-row-tr">
										<td colspan="2" class="bar-td">
											<div class="bar-track">
												<div class="seg-base mp"  :style="{ flex: eff.regenMp || 1 }"></div>
												<div class="seg-bonus mp" :style="{ flex: Math.max(eff.extraMp, 0) }"></div>
											</div>
										</td>
										<td class="col-mp pct-td">+{{ fmtPct(eff.mpPct) }}</td>
									</tr>
								</template>
							</tbody>
						</table>
					</div>

					<!-- Summary sentence -->
					<p v-if="eff.hasHp || eff.hasMp" class="summary">
						Backpacking these items while using {{ regenDef?.label ?? 'this item' }} will grant you an additional
						<template v-if="eff.hasHp && eff.extraHp > 0.5">{{ fmt(eff.extraHp) }} health</template>
						<template v-if="eff.hasHp && eff.extraHp > 0.5 && eff.hasMp && eff.extraMp > 0.5"> and </template>
						<template v-if="eff.hasMp && eff.extraMp > 0.5">{{ fmt(eff.extraMp) }} mana</template>
						<template v-if="!(eff.hasHp && eff.extraHp > 0.5) && !(eff.hasMp && eff.extraMp > 0.5)">nothing</template>.
					</p>
				</template>

			</template>
		</div>
	</div>
</template>

<script>
import { mdiBagPersonal, mdiChartBar } from '@mdi/js';
import DillermSelect    from "@dillerm/webutils/src/components/controls/DillermSelect.vue";
import DillermNumerical from "@dillerm/webutils/src/components/controls/DillermNumerical.vue";
import TankinessApplet  from "./TankinessApplet.vue";

function mdiSvgUrl(path) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}" fill="#cdd6e0"/></svg>`;
	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Each entry with a dbName is fetched live from dotabase on mount.
// parseRegen(specs) extracts hp/mp from ability_special using the correct keys:
//   Bottle:         health_restore (flat total) + mana_restore (flat total)
//   Healing Salve:  health_regen/s × buff_duration = total HP healed; no mana
//   Enchanted Mango:replenish_amount = flat mana; no HP (hp_regen is a passive stat)
//   Arcane Boots:   replenish_amount = flat mana; no HP
//   Magic Stick/Wand: restore_per_charge for both HP and mana (multiplier = charge count)
//   Holy Locket:    health_restore_per_charge + mana_restore_per_charge, both amplified
//                   by heal_increase_passive (10% passive healing bonus always active)
const REGEN_ITEMS = [
	{
		label: 'Bottle',          value: 'bottle',
		icon: '/vpk/panorama/images/items/bottle_png.png',
		dbName: 'Bottle',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			return { hp: g('health_restore'), mp: g('mana_restore') };
		},
	},
	{
		label: 'Healing Salve',   value: 'healing_salve',
		icon: '/vpk/panorama/images/items/flask_png.png',
		dbName: 'Healing Salve',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			return { hp: g('health_regen') * g('buff_duration'), mp: 0 };
		},
	},
	{
		label: 'Enchanted Mango', value: 'enchanted_mango',
		icon: '/vpk/panorama/images/items/enchanted_mango_png.png',
		dbName: 'Enchanted Mango',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			return { hp: 0, mp: g('replenish_amount') };
		},
	},
	{
		label: 'Arcane Boots',    value: 'arcane_boots',
		icon: '/vpk/panorama/images/items/arcane_boots_png.png',
		dbName: 'Arcane Boots',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			return { hp: 0, mp: g('replenish_amount') };
		},
	},
	{
		label: 'Magic Stick',     value: 'magic_stick',
		icon: '/vpk/panorama/images/items/magic_stick_png.png',
		dbName: 'Magic Stick',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			return { hp: g('restore_per_charge'), mp: g('restore_per_charge') };
		},
	},
	{
		label: 'Magic Wand',      value: 'magic_wand',
		icon: '/vpk/panorama/images/items/magic_wand_png.png',
		dbName: 'Magic Wand',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			return { hp: g('restore_per_charge'), mp: g('restore_per_charge') };
		},
	},
	{
		label: 'Holy Locket',     value: 'holy_locket',
		icon: '/vpk/panorama/images/items/holy_locket_png.png',
		dbName: 'Holy Locket',
		parseRegen(specs) {
			const g = k => parseFloat(specs.find(s => s.key === k)?.value) || 0;
			const passiveAmp = 1 + g('heal_increase_passive') / 100;
			return { hp: g('health_restore_per_charge') * passiveAmp, mp: g('mana_restore_per_charge') * passiveAmp };
		},
	},
	{
		label: 'Custom',          value: 'custom',
		icon: null,
		dbName: null,
	},
];

// Parse passive HP/MP-relevant bonuses from an item's ability_special JSON.
// Only specs with a `header` field are passive always-active stats (matching
// the calculation engine's filter); headless specs are active or display-only.
function parseHpMpBonuses(abilitySpecialJson) {
	const b = { str: 0, int: 0, flatHp: 0, flatMana: 0 };
	let specs;
	try { specs = JSON.parse(abilitySpecialJson); } catch { return b; }
	if (!Array.isArray(specs)) return b;
	for (const s of specs) {
		if (!s.header) continue;
		const v = parseFloat(s.value);
		if (!v) continue;
		switch (s.key) {
			case 'bonus_strength':  b.str     += v; break;
			case 'bonus_intellect': b.int     += v; break;
			case 'bonus_all_stats': b.str += v; b.int += v; break;
			case 'bonus_health':    b.flatHp  += v; break;
			case 'bonus_mana':      b.flatMana += v; break;
		}
	}
	return b;
}

export default {
	components: { DillermSelect, DillermNumerical, TankinessApplet },

	emits: ['add-item'],

	props: {
		inventory: { type: Array, default: () => [] },
		stats:     { type: Array, default: () => [] },
	},

	data() {
		return {
			selectedApplet: 'tankiness',
			urlReady: false,
			appletOptions: [
				{
					label: 'Backpack Efficiency',
					value: 'backpack_efficiency',
					icon: mdiSvgUrl(mdiBagPersonal),
					icon_style: 'padding: 4px',
				},
				{
					label: 'Item Recommender',
					value: 'tankiness',
					icon: mdiSvgUrl(mdiChartBar),
					icon_style: 'padding: 4px',
				},
			],

			selectedRegenItem: 'bottle',
			multiplier: 1,
			customHp: 0,
			customMp: 0,

			// Cached passive HP/MP bonuses per item id
			itemBonuses: {},

			// Indices into backpackItems that the user has toggled off
			disabledBackpackSet: new Set(),

			// Regen amounts fetched live from dotabase: { [itemValue]: { hp, mp } }
			regenAmounts: {},
		};
	},

	computed: {
		regenItemOptions() {
			return REGEN_ITEMS.map(item => ({
				label: item.label,
				value: item.value,
				icon: item.icon ?? undefined,
				icon_style: item.icon ? 'width: auto' : undefined,
			}));
		},

		hpMaxFull() { return this.stats.find(s => s.key === 'hp_max')?.value ?? 0; },
		mpMaxFull() { return this.stats.find(s => s.key === 'mp_max')?.value ?? 0; },

		regenDef() { return REGEN_ITEMS.find(r => r.value === this.selectedRegenItem) ?? null; },

		baseRegenHp() {
			if (this.selectedRegenItem === 'custom') return this.customHp * this.multiplier;
			return (this.regenAmounts[this.selectedRegenItem]?.hp ?? 0) * this.multiplier;
		},
		baseRegenMp() {
			if (this.selectedRegenItem === 'custom') return this.customMp * this.multiplier;
			return (this.regenAmounts[this.selectedRegenItem]?.mp ?? 0) * this.multiplier;
		},

		// All items that could be backpacked (ignoring user toggles)
		backpackItems() {
			const activeItems = (this.inventory || []).filter(Boolean);
			const def = this.regenDef;
			const regenHp = this.baseRegenHp;
			const regenMp = this.baseRegenMp;

			let regenSlot = -1;
			if (def && this.selectedRegenItem !== 'custom') {
				regenSlot = activeItems.findIndex(item => item.label === def.label);
			}

			return activeItems.filter((item, idx) => {
				if (idx === regenSlot) return false;
				const b = this.itemBonuses[item.value];
				if (!b) return false;
				const affectsHp = b.str > 0 || b.flatHp > 0;
				const affectsMp = b.int > 0 || b.flatMana > 0;
				if (regenHp > 0 && regenMp > 0) return affectsHp || affectsMp;
				if (regenHp > 0) return affectsHp;
				if (regenMp > 0) return affectsMp;
				return false;
			});
		},

		// Subset actually used in the calculation (user-enabled only)
		activeBackpackItems() {
			return this.backpackItems.filter((_, i) => !this.disabledBackpackSet.has(i));
		},

		eff() {
			const regenHp = this.baseRegenHp;
			const regenMp = this.baseRegenMp;
			const hpFull  = this.hpMaxFull;
			const mpFull  = this.mpMaxFull;

			const hpContrib = this.activeBackpackItems.reduce((s, item) => {
				const b = this.itemBonuses[item.value];
				return s + (b ? b.str * 22 + b.flatHp : 0);
			}, 0);
			const mpContrib = this.activeBackpackItems.reduce((s, item) => {
				const b = this.itemBonuses[item.value];
				return s + (b ? b.int * 12 + b.flatMana : 0);
			}, 0);

			const hpReduced = Math.max(hpFull - hpContrib, 1);
			const mpReduced = Math.max(mpFull - mpContrib, 1);

			const backpackHp = (regenHp > 0 && hpFull > 0) ? regenHp * (hpFull / hpReduced) : regenHp;
			const backpackMp = (regenMp > 0 && mpFull > 0) ? regenMp * (mpFull / mpReduced) : regenMp;
			const extraHp    = backpackHp - regenHp;
			const extraMp    = backpackMp - regenMp;
			const hpPct      = regenHp > 0 ? (extraHp / regenHp) * 100 : 0;
			const mpPct      = regenMp > 0 ? (extraMp / regenMp) * 100 : 0;

			return { regenHp, regenMp, backpackHp, backpackMp, extraHp, extraMp, hpPct, mpPct,
				hasHp: regenHp > 0, hasMp: regenMp > 0 };
		},
	},

	methods: {
		fmt(n)    { return Math.round(n); },
		fmtPct(n) { return n.toFixed(1) + '%'; },

		syncUrl() {
			if (!this.urlReady) return;
			const params = new URLSearchParams(window.location.search);
			if (this.selectedApplet && this.selectedApplet !== 'tankiness') {
				params.set('applet', this.selectedApplet);
			} else {
				params.delete('applet');
			}
			const qs     = params.toString();
			const newUrl = window.location.pathname + (qs ? '?' + qs : '');
			if (window.location.pathname + window.location.search !== newUrl) {
				history.replaceState(null, '', newUrl);
			}
		},

		toggleBackpackItem(idx) {
			const s = new Set(this.disabledBackpackSet);
			if (s.has(idx)) s.delete(idx);
			else s.add(idx);
			this.disabledBackpackSet = s;
		},
	},

	created() {
		const params = new URLSearchParams(window.location.search);
		if (params.has('applet')) {
			const v = params.get('applet');
			if (this.appletOptions.some(o => o.value === v)) this.selectedApplet = v;
		}
		this.urlReady = true;
	},

	async mounted() {
		const itemsToFetch = REGEN_ITEMS.filter(i => i.dbName);
		const names = itemsToFetch.map(i => `'${i.dbName}'`).join(',');
		const res = await fetch(`/api/sql?q=${encodeURI(
			`SELECT localized_name, ability_special FROM items WHERE localized_name IN (${names})`
		)}`);
		if (!res.ok) return;
		const rows = await res.json();
		const amounts = {};
		for (const item of itemsToFetch) {
			const row = rows.find(r => r.localized_name === item.dbName);
			if (!row) continue;
			let specs;
			try { specs = JSON.parse(row.ability_special); } catch { continue; }
			amounts[item.value] = item.parseRegen(specs);
		}
		this.regenAmounts = amounts;
	},

	watch: {
		selectedApplet() {
			this.syncUrl();
		},

		selectedRegenItem() {
			this.disabledBackpackSet = new Set();
		},

		inventory: {
			deep: true,
			immediate: true,
			async handler(inv) {
				const items = (inv || []).filter(Boolean);
				const idsToFetch = items
					.map(i => i.value)
					.filter(id => id && !(id in this.itemBonuses));
				if (!idsToFetch.length) return;

				const res = await fetch(`/api/sql?q=${encodeURI(
					`SELECT id, ability_special FROM items WHERE id IN (${idsToFetch.join(',')})`
				)}`);
				if (!res.ok) return;

				const rows = await res.json();
				const updated = { ...this.itemBonuses };
				for (const row of rows) {
					updated[row.id] = parseHpMpBonuses(row.ability_special);
				}
				this.itemBonuses = updated;
			},
		},
	},
};
</script>

<style lang="scss" scoped>
.applets-panel {
	display: flex;
	flex-direction: column;
	min-width: 310px;
	background: var(--background-color2);
	border-radius: 5px;
	font-size: 13px;
	overflow: visible;
}

.applets-header {
	display: flex;
	align-items: center;
	background: var(--background-color3, #111);
	border-radius: 5px;
	flex-shrink: 0;
	position: relative;
	z-index: 10;
	.applet-select { flex: 1; }
}

.applets-body {
	display: flex;
	flex-direction: column;
	padding: 14px 16px;
	gap: 8px;
}

// ── Input rows ──────────────────────────────────────────────────

.applet-row {
	display: flex;
	align-items: center;
	gap: 8px;

	.regen-select {
		flex: 1;

		:deep(.select-search-current) {
			display: flex;
			align-items: center;
			padding-right: calc(var(--input-icon-button-size) + var(--input-icon-button-side-padding) * 2);
		}
		:deep(.select-search-current span) {
			position: static;
			padding: 0;
			flex: 1;
			min-width: 0;
		}
		:deep(.select-search-current .option-icon) { margin-right: 6px; }
		:deep(.select-search-option  .option-icon) { margin-right: 1px; }
	}

	.multiplier-input { flex: 0 0 64px; }
}

.custom-row {
	.custom-label {
		width: 36px;
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 600;
		text-align: right;
		&.hp-label { color: #adf762; }
		&.mp-label { color: #4f78fa; }
	}
	.custom-amount-input {
		flex: 1;
		&.hp-input { --input-color: #adf762; }
		&.mp-input { --input-color: #4f78fa; }
	}
}

// ── Backpack items list ──────────────────────────────────────────

.backpack-section {
	margin-top: 2px;
}

.section-label {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-color-secondary, #666);
	margin-bottom: 5px;
}

.backpack-items {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.backpack-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	cursor: pointer;
	user-select: none;
	opacity: 1;
	transition: opacity 0.15s;

	&:hover { opacity: 0.75; }

	&.disabled {
		opacity: 0.4;
		.backpack-name { text-decoration: line-through; }
	}
}

.backpack-icon {
	height: 22px;
	width: auto;
}

// ── Output ───────────────────────────────────────────────────────

.eff-opt {
	margin-top: 2px;
}

// ── Comparison table ─────────────────────────────────────────────

.compare-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
	font-variant-numeric: tabular-nums;

	th {
		color: #555;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0 6px 4px 0;
		text-align: right;
		&:first-child { text-align: left; padding-left: 0; }
	}

	td {
		padding: 2px 6px 2px 0;
		text-align: right;
		&:first-child { text-align: left; padding-left: 0; }
	}

	.res {
		font-weight: 700;
		font-size: 11px;
		vertical-align: middle;
		&.hp { color: #adf762; }
		&.mp { color: #4f78fa; }
	}
	.col-hp { color: #adf762; }
	.col-mp { color: #4f78fa; }
}

// ── Segmented bar (inside table) ─────────────────────────────────

.bar-row-tr {
	.bar-td { padding: 0 6px 6px 0; }
	.pct-td { font-weight: 700; font-size: 11px; }
}

.bar-track {
	height: 6px;
	border-radius: 3px;
	display: flex;
	overflow: hidden;
	background: var(--background-color4, #0a0a0a);

	.seg-base, .seg-bonus { min-width: 0; transition: flex 0.2s; }

	.seg-base.hp  { background: rgba(#adf762, 0.35); }
	.seg-base.mp  { background: rgba(#4f78fa, 0.35); }
	.seg-bonus.hp { background: #adf762; }
	.seg-bonus.mp { background: #4f78fa; }
}

// ── Summary sentence ─────────────────────────────────────────────

.summary {
	font-size: 11px;
	color: var(--text-color-secondary, #777);
	line-height: 1.5;
	margin: 0;
}
</style>
