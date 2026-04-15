// CalculationEngine — computes hero stats as self-describing StatGroups
// Each StatGroup carries its label, final value, display color, and the
// breakdown components that produced it.  The same object drives both the
// calculation and the UI so the two can never drift out of sync.
//
// StatGroup shape:
//   { key: string, label: string, value: number, color: string,
//     components: Array<{ label: string, value: number }> }

export const STAT_COLORS = {
	hp:   '#adf762',
	mana: '#4f78fa',
	str:  '#d9413c',
	agi:  '#40c77d',
	int:  '#5694f2',
};

async function doSqlQuery(query) {
	const response = await fetch(`/api/sql?q=${encodeURI(query)}`);
	if (response.ok) return response.json();
	return null;
}

// Build a StatGroup, computing value as the sum of component values.
function statGroup(key, label, color, components) {
	return {
		key,
		label,
		color,
		value: components.reduce((s, c) => s + c.value, 0),
		components,
	};
}

// Parse ability_special JSON for each item row individually.
// Returns an array of per-item bonus objects.
// magicResist is a fraction (e.g. 0.18 for 18%). Amp values likewise.
function parseItemBonuses(itemRows) {
	return itemRows.map(row => {
		const bonus = {
			name: row.localized_name,
			str: 0, agi: 0, int: 0,
			flatHp: 0, flatMana: 0,
			hpRegen: 0, manaRegen: 0,
			hpRegenAmp: 0, manaRegenAmp: 0,
			armor: 0, magicResist: 0,
		};
		let specs;
		try { specs = JSON.parse(row.ability_special); } catch { return bonus; }
		if (!Array.isArray(specs)) return bonus;

		for (const spec of specs) {
			// Skip placeholder entries (no header means display-only / disabled)
			if (!spec.header) continue;
			const v = parseFloat(spec.value);
			if (!v) continue;

			switch (spec.key) {
				case 'bonus_strength':        bonus.str          += v; break;
				case 'bonus_agility':         bonus.agi          += v; break;
				case 'bonus_intellect':       bonus.int          += v; break;
				case 'bonus_all_stats':       bonus.str += v; bonus.agi += v; bonus.int += v; break;
				case 'bonus_health':          bonus.flatHp       += v; break;
				case 'bonus_mana':            bonus.flatMana     += v; break;
				case 'bonus_health_regen':
				case 'health_regen':          bonus.hpRegen      += v; break;
				case 'bonus_mana_regen':      bonus.manaRegen    += v; break;
				case 'hp_regen_amp':          bonus.hpRegenAmp   += v / 100; break;
				case 'mana_regen_multiplier': bonus.manaRegenAmp += v / 100; break;
				case 'bonus_armor':           bonus.armor        += v; break;
				// Magic resist: stored as "18%" or "20%" — strip % and convert to fraction
				case 'tooltip_resist':
				case 'magic_resistance':
				case 'bonus_magical_armor':   bonus.magicResist  += v / 100; break;
			}
		}
		return bonus;
	});
}

// Build breakdown components for a per-item stat, one entry per contributing item.
function itemComponents(itemBonuses, accessor) {
	return itemBonuses
		.filter(i => accessor(i))
		.map(i => ({ label: i.name, value: accessor(i) }));
}

// Build breakdown components for item stat cascading into a multiplied value.
// e.g. Crown giving +4 str shows as "Crown (4 Str × 22)" with value 88.
function itemCascadeComponents(itemBonuses, accessor, mult, abbrev) {
	return itemBonuses
		.filter(i => accessor(i))
		.map(i => ({ label: `${i.name} (${accessor(i)} ${abbrev} × ${mult})`, value: accessor(i) * mult }));
}

// Levels where the game auto-forces an attribute bonus pick (all regular abilities maxed)
const FORCED_ATTR_BONUS_LEVELS = [15, 16, 17, 19, 20, 21, 22];

function getForcedAttrBonusCount(level) {
	return FORCED_ATTR_BONUS_LEVELS.filter(l => l <= level).length;
}

// Dota 2 formulas (source: docs/ResourceCalculatorResearch.md):
//   total_str  = attr_strength_base     + floor(attr_strength_gain     * (level - 1))
//   total_int  = attr_intelligence_base + floor(attr_intelligence_gain * (level - 1))
//   hp_max     = 120 + total_str * 22 [+ item str * 22] [+ flat item hp]
//   mp_max     = 75  + total_int * 12 [+ item int * 12] [+ flat item mana]
//   hp_regen   = (base_health_regen + total_str * 0.1 [+ item str * 0.1] [+ flat item hp_regen]) * (1 + Σ hp_regen_amp)
//   mana_regen = (base_mana_regen + total_int * 0.05 [+ item int * 0.05] [+ flat item mana_regen]) * (1 + Σ mana_regen_multiplier)
export async function calculateResources(heroId, level = 1, items = []) {
	const fallback = buildFallbackStats();

	if (!heroId) return fallback;

	try {
		// Fetch hero base stats and item ability_special in parallel
		const itemIds = items.map(i => i.value).filter(Boolean);
		const [heroData, itemData] = await Promise.all([
			doSqlQuery(
				`SELECT attr_strength_base, attr_strength_gain,
				        attr_agility_base, attr_agility_gain,
				        attr_intelligence_base, attr_intelligence_gain,
				        base_health_regen, base_mana_regen,
				        base_armor, magic_resistance
				 FROM heroes WHERE id = ${heroId}`
			),
			itemIds.length
				? doSqlQuery(
					`SELECT id, localized_name, ability_special
					 FROM items WHERE id IN (${itemIds.join(',')})`
				)
				: Promise.resolve([]),
		]);

		if (!heroData || !heroData.length) return fallback;

		const h = heroData[0];
		const strBase    = h.attr_strength_base     || 0;
		const strGain    = h.attr_strength_gain      || 0;
		const agiBase    = h.attr_agility_base       || 0;
		const agiGain    = h.attr_agility_gain       || 0;
		const intBase    = h.attr_intelligence_base  || 0;
		const intGain    = h.attr_intelligence_gain  || 0;
		const baseHpR    = h.base_health_regen       || 0;
		const baseMpR    = h.base_mana_regen         || 0;
		const baseArmor  = h.base_armor              || 0;
		// heroes.magic_resistance is stored as integer 25 (meaning 25%)
		const heroBaseMR = (h.magic_resistance || 25) / 100;

		const lvls        = level - 1;
		const attrBonus   = getForcedAttrBonusCount(level) * 2;
		const heroStr     = strBase + Math.floor(strGain * lvls) + attrBonus;
		const heroAgi     = agiBase + Math.floor(agiGain * lvls) + attrBonus;
		const heroInt     = intBase + Math.floor(intGain * lvls) + attrBonus;

		const itemBonuses = parseItemBonuses(itemData || []);

		const totalStr = heroStr + itemBonuses.reduce((s, i) => s + i.str, 0);
		const totalAgi = heroAgi + itemBonuses.reduce((s, i) => s + i.agi, 0);
		const totalInt = heroInt + itemBonuses.reduce((s, i) => s + i.int, 0);

		// --- Hoist shared intermediate values used across multiple stats and itemContributions ---
		const hpMaxVal    = 120 + totalStr * 22 + itemBonuses.reduce((s, i) => s + i.flatHp,   0);
		const totalArmor  = baseArmor + totalAgi * (1/6) + itemBonuses.reduce((s, i) => s + i.armor, 0);
		const physResist  = (0.06 * totalArmor) / (1 + 0.06 * Math.abs(totalArmor));
		const ehpPhysVal  = hpMaxVal / (1 - physResist);
		const intMR       = totalInt * 0.001;
		const totalBaseMR = heroBaseMR + intMR;
		const itemMRMult  = itemBonuses.reduce((mult, i) => mult * (1 - i.magicResist), 1);
		const magicDmgTaken = (1 - totalBaseMR) * itemMRMult;
		const totalMR     = 1 - magicDmgTaken;
		const ehpMagicVal = magicDmgTaken > 0 ? hpMaxVal / magicDmgTaken : 0;

		const levelBonusComponents = (base, gain, lvls) => {
			const bonus = Math.floor(gain * lvls);
			const forcedCount = getForcedAttrBonusCount(level);
			return [
				{ label: 'Base',                                      value: base },
				...(lvls > 0 ? [{ label: `Level ${lvls} × ${gain}`, value: bonus }] : []),
				...(forcedCount > 0 ? [{ label: `Attribute Bonus (${forcedCount} × +2)`, value: forcedCount * 2 }] : []),
			];
		};

		// --- Per-item EHP contributions (indexed by item id) ---
		const itemContributions = {};
		(itemData || []).forEach((row, idx) => {
			const item   = itemBonuses[idx];
			const hp_c   = item.str * 22 + item.flatHp;
			const mp_c   = item.int * 12 + item.flatMana;
			const hp_w   = hpMaxVal - hp_c;

			// EHP Phys without this item
			const armor_w  = totalArmor - item.armor - item.agi * (1/6);
			const pr_w     = (0.06 * armor_w) / (1 + 0.06 * Math.abs(armor_w));
			const ehpPhys_w = hp_w / (1 - pr_w);

			// EHP Magic without this item (remove multiplicative factor)
			const mrMult_w   = item.magicResist > 0 ? itemMRMult / (1 - item.magicResist) : itemMRMult;
			const mdt_w      = (1 - totalBaseMR) * mrMult_w;
			const ehpMagic_w = mdt_w > 0 ? hp_w / mdt_w : 0;

			itemContributions[row.id] = {
				hp_max:    hp_c,
				mp_max:    mp_c,
				ehp_phys:  ehpPhysVal  - ehpPhys_w,
				ehp_magic: ehpMagicVal - ehpMagic_w,
			};
		});

		const stats = [
			statGroup('strength', 'Strength', STAT_COLORS.str, [
				...levelBonusComponents(strBase, strGain, lvls),
				...itemComponents(itemBonuses, i => i.str),
			]),
			statGroup('agility', 'Agility', STAT_COLORS.agi, [
				...levelBonusComponents(agiBase, agiGain, lvls),
				...itemComponents(itemBonuses, i => i.agi),
			]),
			statGroup('intelligence', 'Intelligence', STAT_COLORS.int, [
				...levelBonusComponents(intBase, intGain, lvls),
				...itemComponents(itemBonuses, i => i.int),
			]),
			statGroup('hp_max', 'Max Health', STAT_COLORS.hp, [
				{ label: 'Base Health',              value: 120 },
				{ label: `${heroStr} Strength × 22`, value: heroStr * 22 },
				...itemCascadeComponents(itemBonuses, i => i.str, 22, 'Str'),
				...itemComponents(itemBonuses, i => i.flatHp),
			]),
			statGroup('mp_max', 'Max Mana', STAT_COLORS.mana, [
				{ label: 'Base Mana',                      value: 75 },
				{ label: `${heroInt} Intelligence × 12`,   value: heroInt * 12 },
				...itemCascadeComponents(itemBonuses, i => i.int, 12, 'Int'),
				...itemComponents(itemBonuses, i => i.flatMana),
			]),
			(() => {
				const flatComponents = [
					...(baseHpR ? [{ label: 'Base Regen',         value: baseHpR }] : []),
					{ label: `${heroStr} Strength × 0.1`, value: heroStr * 0.1 },
					...itemCascadeComponents(itemBonuses, i => i.str, 0.1, 'Str'),
					...itemComponents(itemBonuses, i => i.hpRegen),
				];
				const flatTotal = flatComponents.reduce((s, c) => s + c.value, 0);
				const ampComponents = itemBonuses
					.filter(i => i.hpRegenAmp)
					.map(i => ({ label: `${i.name} (+${Math.round(i.hpRegenAmp * 100)}%)`, value: flatTotal * i.hpRegenAmp }));
				return statGroup('hp_regen', 'Health Regen', STAT_COLORS.hp, [...flatComponents, ...ampComponents]);
			})(),
			(() => {
				const flatComponents = [
					...(baseMpR ? [{ label: 'Base Regen',             value: baseMpR }] : []),
					{ label: `${heroInt} Intelligence × 0.05`, value: heroInt * 0.05 },
					...itemCascadeComponents(itemBonuses, i => i.int, 0.05, 'Int'),
					...itemComponents(itemBonuses, i => i.manaRegen),
				];
				const flatTotal = flatComponents.reduce((s, c) => s + c.value, 0);
				const ampComponents = itemBonuses
					.filter(i => i.manaRegenAmp)
					.map(i => ({ label: `${i.name} (+${Math.round(i.manaRegenAmp * 100)}%)`, value: flatTotal * i.manaRegenAmp }));
				return statGroup('mana_regen', 'Mana Regen', STAT_COLORS.mana, [...flatComponents, ...ampComponents]);
			})(),

			// --- Armor, resists, and effective HP ---
			// Source: https://liquipedia.net/dota2/Armor
			// Source: https://liquipedia.net/dota2/Magic_Resistance

			(() => {
				const heroAgiArmor  = heroAgi * (1/6);
				const itemAgiArmor  = itemBonuses.filter(i => i.agi).map(i => ({
					label: `${i.name} (${i.agi} Agi × 0.167)`,
					value: i.agi * (1/6),
				}));
				const itemFlatArmor = itemBonuses.filter(i => i.armor).map(i => ({
					label: i.name,
					value: i.armor,
				}));
				return statGroup('armor', 'Armor', STAT_COLORS.str, [
					...(baseArmor ? [{ label: 'Base Armor', value: baseArmor }] : []),
					{ label: `${heroAgi} Agility × 0.167`, value: heroAgiArmor },
					...itemAgiArmor,
					...itemFlatArmor,
				]);
			})(),

			{
				...statGroup('phys_resist', 'Phys Resist', STAT_COLORS.str, [
					{ label: `From ${parseFloat(totalArmor.toFixed(1))} armor`, value: physResist },
				]),
				format: 'percent',
			},

			statGroup('ehp_phys', 'EHP Physical', STAT_COLORS.str, [
				{ label: 'Max Health',  value: hpMaxVal },
				{ label: 'Armor bonus', value: ehpPhysVal - hpMaxVal },
			]),

			{
				...statGroup('magic_resist', 'Magic Resist', STAT_COLORS.int, [
					{ label: `Hero base (${Math.round(heroBaseMR * 100)}%)`, value: heroBaseMR },
					{ label: `${totalInt} Intelligence × 0.1%`, value: intMR },
					...itemBonuses.filter(i => i.magicResist).map(i => ({
						label: i.name,
						value: i.magicResist,
					})),
				]),
				value: totalMR,  // override sum with correct multiplicative result
				format: 'percent',
			},

			statGroup('ehp_magic', 'EHP Magical', STAT_COLORS.int, [
				{ label: 'Max Health',        value: hpMaxVal },
				{ label: 'Magic resist bonus', value: ehpMagicVal - hpMaxVal },
			]),
		];

		return { stats, itemContributions };
	} catch (e) {
		console.error('CalculationEngine error:', e);
		return buildFallbackStats();
	}
}

function buildFallbackStats() {
	const pct = { format: 'percent' };
	return {
		stats: [
			{ key: 'strength',      label: 'Strength',        color: STAT_COLORS.str,  value: 0, components: [] },
			{ key: 'agility',       label: 'Agility',         color: STAT_COLORS.agi,  value: 0, components: [] },
			{ key: 'intelligence',  label: 'Intelligence',    color: STAT_COLORS.int,  value: 0, components: [] },
			{ key: 'hp_max',        label: 'Max HP',          color: STAT_COLORS.hp,   value: 0, components: [] },
			{ key: 'mp_max',        label: 'Max Mana',        color: STAT_COLORS.mana, value: 0, components: [] },
			{ key: 'hp_regen',      label: 'HP Regen',        color: STAT_COLORS.hp,   value: 0, components: [] },
			{ key: 'mana_regen',    label: 'Mana Regen',      color: STAT_COLORS.mana, value: 0, components: [] },
			{ key: 'armor',         label: 'Armor',           color: STAT_COLORS.str,  value: 0, components: [] },
			{ key: 'phys_resist',   label: 'Phys Resist',     color: STAT_COLORS.str,  value: 0, components: [], ...pct },
			{ key: 'ehp_phys',      label: 'EHP Physical',   color: STAT_COLORS.str,  value: 0, components: [] },
			{ key: 'magic_resist',  label: 'Magic Resist',    color: STAT_COLORS.int,  value: 0, components: [], ...pct },
			{ key: 'ehp_magic',     label: 'EHP Magical',    color: STAT_COLORS.int,  value: 0, components: [] },
		],
		itemContributions: {},
	};
}

// Convenience helper — extract a named value from a stats array
export function getStat(stats, key) {
	return stats.find(s => s.key === key)?.value ?? 0;
}
