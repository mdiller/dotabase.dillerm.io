<template>
	<div class="tankiness-applet">

		<!-- Stat selector -->
		<div class="stat-picker" :class="{ open: statPickerOpen }" ref="statPicker">
			<button class="stat-picker-btn" @click="statPickerOpen = !statPickerOpen">
				<span class="stat-picker-label" :style="{ color: selectedStatColor }">{{ selectedStatLabel }}</span>
				<span class="stat-picker-chevron"></span>
			</button>
			<div class="stat-picker-list">
				<div
					v-for="s in TANKINESS_STATS_DEF"
					:key="s.key"
					class="stat-option"
					:class="{ selected: selectedStat === s.key }"
					:style="{ color: s.color }"
					@click="pickStat(s.key)">
					{{ s.label }}
				</div>
			</div>
		</div>

		<!-- Inventory cost + exclude checkbox -->
		<div class="tank-meta-row">
			<label class="tank-exclude-label">
				<input type="checkbox" v-model="excludeInventory" class="tank-checkbox" />
				<span>Exclude inventory items</span>
			</label>
			<div class="tank-cost">
				<img src="/vpk/panorama/images/hud/icon_gold_psd.png" class="gold-icon" alt="gold" />
				<span class="gold-amount">{{ inventoryCost }}</span>
			</div>
		</div>

		<label class="tank-exclude-label">
			<input type="checkbox" v-model="perCost" class="tank-checkbox" />
			<span>Per 100 gold</span>
		</label>

		<!-- Items table -->
		<div class="tank-table-wrap" v-if="rankedItems.length > 0">
			<p class="tank-blurb">{{ tableBlurb }}</p>
			<table class="tank-table">
				<tbody>
					<tr
						v-for="item in displayedItems"
						:key="item.id"
						class="tank-item-row"
						:class="{ hovered: hoveredItemId === item.id }"
						@click="addToInventory(item)"
						@mouseenter="hoveredItemId = item.id"
						@mouseleave="hoveredItemId = null">
						<td class="col-bonus" :style="{ color: selectedStatColor }">{{ fmtBonus(item.displayValue) }}&nbsp;</td>
						<td class="col-bar">
							<div class="bar-outer">
								<div class="bar-fill" :style="{ width: item.barPct + '%', background: selectedStatColor }"></div>
							</div>
						</td>
						<td class="col-icon">
							<img :src="item.icon" :alt="item.name" class="item-img" />
						</td>
						<td class="col-name" :title="item.name.length > 15 ? item.name : undefined">{{ item.name.length > 15 ? item.name.slice(0, 15) + '…' : item.name }}</td>
					</tr>
					<tr v-if="totalRemaining > 0" class="load-more-row" @click="loadMore">
						<td colspan="4">Load {{ nextBatch }}/{{ totalRemaining }} More...</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div v-else-if="allItems.length > 0" class="tank-empty">No items contribute to this stat.</div>
		<div v-else class="tank-empty">Loading items...</div>

	</div>
</template>

<script>
const DEFAULT_STAT = 'phys_resist';
const PAGE_SIZE = 20;

const TANKINESS_STATS = [
	{ key: 'hp_max',        label: 'Health',        color: '#adf762' },
	{ key: 'ehp_magic',     label: 'EHP Magical',   color: '#7dd8c8' },
	{ key: 'ehp_phys',      label: 'EHP Physical',  color: '#d47a6a' },
	{ key: 'strength',      label: 'Strength',      color: '#d9413c' },
	{ key: 'agility',       label: 'Agility',       color: '#40c77d' },
	{ key: 'intelligence',  label: 'Intelligence',  color: '#5694f2' },
	{ key: 'mp_max',        label: 'Max Mana',      color: '#4f78fa' },
	{ key: 'hp_regen',      label: 'HP Regen',      color: '#adf762' },
	{ key: 'mana_regen',    label: 'Mana Regen',    color: '#4f78fa' },
	{ key: 'armor',         label: 'Armor',         color: '#b0a070' },
	{ key: 'phys_resist',   label: 'Phys Resist',   color: '#d47a6a' },
	{ key: 'magic_resist',  label: 'Magic Resist',  color: '#7dd8c8' },
];

function parseAbilitySpecial(json) {
	const b = { str: 0, agi: 0, int: 0, flatHp: 0, flatMana: 0, hpRegen: 0, manaRegen: 0, hpRegenAmp: 0, manaRegenAmp: 0, armor: 0, magicResist: 0 };
	let specs;
	try { specs = JSON.parse(json); } catch { return b; }
	if (!Array.isArray(specs)) return b;
	for (const s of specs) {
		if (!s.header) continue;
		const v = parseFloat(s.value);
		if (!v) continue;
		switch (s.key) {
			case 'bonus_strength':        b.str           += v; break;
			case 'bonus_agility':         b.agi           += v; break;
			case 'bonus_intellect':       b.int           += v; break;
			case 'bonus_all_stats':       b.str += v; b.agi += v; b.int += v; break;
			case 'bonus_health':          b.flatHp        += v; break;
			case 'bonus_mana':            b.flatMana      += v; break;
			case 'bonus_health_regen':
			case 'health_regen':          b.hpRegen       += v; break;
			case 'bonus_mana_regen':      b.manaRegen     += v; break;
			case 'hp_regen_amp':          b.hpRegenAmp    += v / 100; break;
			case 'mana_regen_multiplier': b.manaRegenAmp  += v / 100; break;
			case 'bonus_armor':           b.armor         += v; break;
			case 'tooltip_resist':
			case 'magic_resistance':
			case 'bonus_magical_armor':   b.magicResist   += v / 100; break;
		}
	}
	return b;
}

function computeBonus(b, statKey, sm) {
	switch (statKey) {
		case 'hp_max':        return b.str * 22 + b.flatHp;
		case 'mp_max':        return b.int * 12 + b.flatMana;
		case 'strength':      return b.str;
		case 'agility':       return b.agi;
		case 'intelligence':  return b.int;
		case 'hp_regen':      return b.str * 0.1 + b.hpRegen;
		case 'mana_regen':    return b.int * 0.05 + b.manaRegen;
		case 'armor':         return b.agi / 6 + b.armor;
		case 'phys_resist': {
			const newA  = (sm.armor || 0) + b.agi / 6 + b.armor;
			const newPR = (0.06 * newA) / (1 + 0.06 * Math.abs(newA));
			return newPR - (sm.phys_resist || 0);
		}
		case 'magic_resist': {
			const mdt = 1 - (sm.magic_resist || 0);
			return (1 - mdt * (1 - b.magicResist)) - (sm.magic_resist || 0);
		}
		case 'ehp_phys': {
			const hp    = (sm.hp_max || 0) + b.str * 22 + b.flatHp;
			const newA  = (sm.armor || 0) + b.agi / 6 + b.armor;
			const newPR = (0.06 * newA) / (1 + 0.06 * Math.abs(newA));
			return hp / (1 - newPR) - (sm.ehp_phys || 0);
		}
		case 'ehp_magic': {
			const hp       = (sm.hp_max || 0) + b.str * 22 + b.flatHp;
			const mdt      = 1 - (sm.magic_resist || 0);
			const newMdt   = mdt * (1 - b.magicResist);
			return newMdt > 0 ? hp / newMdt - (sm.ehp_magic || 0) : 0;
		}
		default: return 0;
	}
}

export default {
	emits: ['add-item'],

	props: {
		inventory: { type: Array, default: () => [] },
		stats:     { type: Array, default: () => [] },
	},

	data() {
		return {
			TANKINESS_STATS_DEF: TANKINESS_STATS,
			selectedStat:     DEFAULT_STAT,
			statPickerOpen:   false,
			excludeInventory: false,
			perCost:          false,
			displayCount:     PAGE_SIZE,
			hoveredItemId:    null,
			allItems:         [],
			rankedItems:      [],
			urlReady:         false,
		};
	},

	computed: {
		selectedStatColor() {
			return TANKINESS_STATS.find(s => s.key === this.selectedStat)?.color || '#aaa';
		},

		selectedStatLabel() {
			return TANKINESS_STATS.find(s => s.key === this.selectedStat)?.label || '';
		},

		tableBlurb() {
			const label = this.selectedStatLabel;
			if (this.perCost) return `${label} gained per 100 gold spent.`;
			return `Flat ${label} bonus added to your current stats.`;
		},

		inventoryItemIds() {
			return new Set((this.inventory || []).filter(Boolean).map(i => i.value));
		},

		inventoryCost() {
			const costMap = Object.fromEntries(this.allItems.map(i => [i.id, i.cost]));
			return (this.inventory || [])
				.filter(Boolean)
				.reduce((sum, item) => sum + (costMap[item.value] || 0), 0);
		},

		displayedItems() {
			return this.rankedItems.slice(0, this.displayCount);
		},

		totalRemaining() {
			return Math.max(0, this.rankedItems.length - this.displayCount);
		},

		nextBatch() {
			return Math.min(PAGE_SIZE, this.totalRemaining);
		},
	},

	methods: {
		pickStat(key) {
			this.selectedStat = key;
			this.statPickerOpen = false;
		},

		onClickOutside(e) {
			if (this.$refs.statPicker && !this.$refs.statPicker.contains(e.target)) {
				this.statPickerOpen = false;
			}
		},

		loadMore() {
			this.displayCount += PAGE_SIZE;
		},

		fmtBonus(val) {
			if (this.perCost) {
				return '+' + parseFloat(val.toFixed(2));
			}
			if (['phys_resist', 'magic_resist'].includes(this.selectedStat)) {
				return '+' + (val * 100).toFixed(1) + '%';
			}
			if (['hp_regen', 'mana_regen', 'armor'].includes(this.selectedStat)) {
				return '+' + parseFloat(val.toFixed(1));
			}
			return '+' + Math.round(val);
		},

		addToInventory(item) {
			const slotIndex = (this.inventory || []).indexOf(null);
			if (slotIndex === -1) return;
			this.$emit('add-item', {
				slotIndex,
				item: { value: item.id, label: item.name, icon: item.icon, icon_style: 'width: auto' },
			});
		},

		recalculate() {
			const t0 = performance.now();
			const sm = Object.fromEntries((this.stats || []).map(s => [s.key, s.value]));
			const excludeIds = this.excludeInventory ? this.inventoryItemIds : new Set();

			let items = this.allItems
				.filter(item => !excludeIds.has(item.id))
				.map(item => {
					const bonus = computeBonus(item.bonusObj, this.selectedStat, sm);
					const displayValue = (this.perCost && item.cost > 0) ? (bonus / item.cost) * 100 : bonus;
					return { ...item, bonus, displayValue };
				})
				.filter(item => item.bonus > 0.001);

			items.sort((a, b) => b.displayValue - a.displayValue || a.cost - b.cost);

			const maxDisplay = items[0]?.displayValue || 1;
			for (const item of items) item.barPct = (item.displayValue / maxDisplay) * 100;

			this.rankedItems  = items;
			this.displayCount = PAGE_SIZE;
			console.log(`[Tankiness] recalculate(${this.selectedStat}): ${(performance.now() - t0).toFixed(2)}ms — ${items.length} items`);
		},

		syncUrl() {
			if (!this.urlReady) return;
			const params = new URLSearchParams(window.location.search);
			if (this.selectedStat !== DEFAULT_STAT) {
				params.set('tankiness_stat', this.selectedStat);
			} else {
				params.delete('tankiness_stat');
			}
			const qs     = params.toString();
			const newUrl = window.location.pathname + (qs ? '?' + qs : '');
			if (window.location.pathname + window.location.search !== newUrl) {
				history.replaceState(null, '', newUrl);
			}
		},
	},

	watch: {
		stats:            { deep: true, handler() { if (this.allItems.length) this.recalculate(); } },
		selectedStat()    { this.recalculate(); this.syncUrl(); },
		excludeInventory(){ this.recalculate(); },
		perCost()         { this.recalculate(); },
		inventory:        { deep: true, handler() { if (this.excludeInventory) this.recalculate(); } },
	},

	mounted() {
		document.addEventListener('click', this.onClickOutside);
	},

	beforeUnmount() {
		document.removeEventListener('click', this.onClickOutside);
	},

	async created() {
		const t0 = performance.now();

		const params = new URLSearchParams(window.location.search);
		if (params.has('tankiness_stat')) {
			const s = params.get('tankiness_stat');
			if (TANKINESS_STATS.find(t => t.key === s)) this.selectedStat = s;
		}

		const res = await fetch(`/api/sql?q=${encodeURI(
			"SELECT id, localized_name as name, '/vpk' || icon as icon, cost, ability_special FROM items WHERE localized_name != '' AND neutral_tier IS NULL AND is_neutral_enhancement = 0 AND (json_data NOT LIKE '%ItemPurchasable%' OR json_data IS NULL) ORDER BY localized_name"
		)}`);

		if (res.ok) {
			const rows = await res.json();
			this.allItems = rows.map(row => ({
				id:       row.id,
				name:     row.name,
				icon:     row.icon,
				cost:     row.cost || 0,
				bonusObj: parseAbilitySpecial(row.ability_special),
			}));
		}

		console.log(`[Tankiness] init: ${(performance.now() - t0).toFixed(2)}ms — ${this.allItems.length} items loaded`);

		this.urlReady = true;
		this.recalculate();
	},
};
</script>

<style lang="scss" scoped>
.tankiness-applet {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.stat-picker {
	position: relative;
	width: 100%;
}

.stat-picker-btn {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--input-background, #1a1a1a);
	border: 1px solid var(--input-border-color, #333);
	border-radius: var(--input-border-radius, 4px);
	padding: 0 10px;
	height: var(--input-height, 32px);
	cursor: pointer;
	gap: 8px;

	&:hover { border-color: var(--input-border-color-hover, #555); }
}

.stat-picker-label {
	font-weight: 700;
	font-size: 13px;
}

.stat-picker-chevron {
	width: 0;
	height: 0;
	border-left: 4px solid transparent;
	border-right: 4px solid transparent;
	border-top: 5px solid rgba(255,255,255,0.4);
	flex-shrink: 0;
	transition: transform 0.15s;

	.stat-picker.open & { transform: rotate(180deg); }
}

.stat-picker-list {
	display: none;
	position: absolute;
	top: calc(100% + 3px);
	left: 0;
	right: 0;
	background: var(--input-background, #1a1a1a);
	border: 1px solid var(--input-border-color, #333);
	border-radius: var(--input-border-radius, 4px);
	z-index: 100;
	overflow: hidden;
	box-shadow: 0 4px 16px rgba(0,0,0,0.5);

	.stat-picker.open & { display: block; }
}

.stat-option {
	padding: 5px 10px;
	font-weight: 700;
	font-size: 13px;
	cursor: pointer;

	&:hover    { background: rgba(255,255,255,0.07); }
	&.selected { background: rgba(255,255,255,0.1); }
}

.tank-meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.tank-exclude-label {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	color: var(--text-color-secondary, #888);
	cursor: pointer;
	user-select: none;

	.tank-checkbox { cursor: pointer; }
}

.tank-cost {
	display: flex;
	align-items: center;
	gap: 4px;

	.gold-icon    { height: 16px; width: auto; }
	.gold-amount  {
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #e8c840;
	}
}

.tank-table-wrap {
	overflow: hidden;
	border-radius: 3px;
}

.tank-blurb {
	font-size: 11px;
	color: var(--text-color-secondary, #666);
	margin: 0 0 5px 0;
}

.tank-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
	font-variant-numeric: tabular-nums;
}

.tank-item-row {
	cursor: pointer;

	&.hovered td { background: rgba(255, 255, 255, 0.06); }

	td {
		padding: 0;
		vertical-align: middle;
		line-height: 1;
		height: 22px;
	}
}

.col-bonus {
	width: 52px;
	text-align: right;
	padding-right: 12px;
	font-weight: 400;
	white-space: nowrap;
	border-right: 1px solid var(--background-color4, #0a0a0a);
}

.col-bar {
	width: 54px;
	padding: 0;
}

.bar-outer {
	width: 54px;
	height: 22px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	overflow: hidden;
	background: var(--background-color4, #0a0a0a);
}

.bar-fill {
	height: 22px;
	min-width: 2px;
	opacity: 0.35;
}

.col-icon {
	width: 36px;
	padding: 0 2px;

	.item-img {
		height: 22px;
		width: auto;
		display: block;
	}
}

.col-name {
	padding-left: 4px;
	padding-right: 4px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 120px;
	color: var(--text-color, #cdd6e0);
}

.load-more-row {
	cursor: pointer;

	td {
		padding: 5px 6px;
		text-align: center;
		font-size: 11px;
		color: #555;
	}

	&:hover td { color: #888; }
}

.tank-empty {
	font-size: 12px;
	color: var(--text-color-secondary, #666);
	text-align: center;
	padding: 12px 0;
}
</style>
