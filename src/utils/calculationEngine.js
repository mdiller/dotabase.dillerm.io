// CalculationEngine — computes hero stats as self-describing StatGroups
// Each StatGroup carries its label, final value, display color, and the
// breakdown components that produced it.  The same object drives both the
// calculation and the UI so the two can never drift out of sync.
//
// StatGroup shape:
//   { key: string, label: string, value: number, color: string,
//     components: Array<{ label: string, value: number }> }
//
// TODO: Add item bonus calculations when item selection is implemented

export const STAT_COLORS = {
	hp:   '#adf762',
	mana: '#4f78fa',
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

// Dota 2 formulas (source: docs/ResourceCalculatorResearch.md):
//   total_str  = attr_strength_base     + floor(attr_strength_gain     * (level - 1))
//   total_int  = attr_intelligence_base + floor(attr_intelligence_gain * (level - 1))
//   hp_max     = 120 + total_str  * 22
//   mp_max     = 75  + total_int  * 12
//   hp_regen   = base_health_regen + total_str  * 0.1
//   mana_regen = base_mana_regen   + total_int  * 0.05
export async function calculateResources(heroId, level = 1) {
	const fallback = buildFallbackStats();

	if (!heroId) return fallback;

	try {
		const data = await doSqlQuery(
			`SELECT attr_strength_base, attr_strength_gain,
			        attr_intelligence_base, attr_intelligence_gain,
			        base_health_regen, base_mana_regen
			 FROM heroes WHERE id = ${heroId}`
		);

		if (!data || !data.length) return fallback;

		const h = data[0];
		const strBase  = h.attr_strength_base     || 0;
		const strGain  = h.attr_strength_gain      || 0;
		const intBase  = h.attr_intelligence_base  || 0;
		const intGain  = h.attr_intelligence_gain  || 0;
		const baseHpR  = h.base_health_regen       || 0;
		const baseMpR  = h.base_mana_regen         || 0;

		const totalStr = strBase + Math.floor(strGain * (level - 1));
		const totalInt = intBase + Math.floor(intGain * (level - 1));

		return [
			statGroup('hp_max', 'Max HP', STAT_COLORS.hp, [
				{ label: 'Base HP',                         value: 120 },
				{ label: `${totalStr} Strength × 22`,       value: totalStr * 22 },
			]),
			statGroup('mp_max', 'Max Mana', STAT_COLORS.mana, [
				{ label: 'Base Mana',                       value: 75 },
				{ label: `${totalInt} Intelligence × 12`,   value: totalInt * 12 },
			]),
			statGroup('hp_regen', 'HP Regen', STAT_COLORS.hp, [
				...(baseHpR  ? [{ label: 'Base Regen',              value: baseHpR }] : []),
				{ label: `${totalStr} Strength × 0.1`,      value: totalStr * 0.1 },
			]),
			statGroup('mana_regen', 'Mana Regen', STAT_COLORS.mana, [
				...(baseMpR  ? [{ label: 'Base Regen',              value: baseMpR }] : []),
				{ label: `${totalInt} Intelligence × 0.05`, value: totalInt * 0.05 },
			]),
		];
	} catch (e) {
		console.error('CalculationEngine error:', e);
		return fallback;
	}
}

function buildFallbackStats() {
	return [
		{ key: 'hp_max',     label: 'Max HP',     color: STAT_COLORS.hp,   value: 0, components: [] },
		{ key: 'mp_max',     label: 'Max Mana',   color: STAT_COLORS.mana, value: 0, components: [] },
		{ key: 'hp_regen',   label: 'HP Regen',   color: STAT_COLORS.hp,   value: 0, components: [] },
		{ key: 'mana_regen', label: 'Mana Regen', color: STAT_COLORS.mana, value: 0, components: [] },
	];
}

// Convenience helper — extract a named value from a stats array
export function getStat(stats, key) {
	return stats.find(s => s.key === key)?.value ?? 0;
}
