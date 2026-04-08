// CalculationEngine — computes hero HP/MP/regen based on hero stats and level
// Formulas from: docs/ResourceCalculatorResearch.md
// TODO: Add item bonus calculations when item selection is implemented

async function doSqlQuery(query) {
	const response = await fetch(`/api/sql?q=${encodeURI(query)}`);
	if (response.ok) {
		return await response.json();
	}
	return null;
}

// Dota 2 formulas:
//   total_str  = attr_strength_base     + floor(attr_strength_gain     * (level - 1))
//   total_int  = attr_intelligence_base + floor(attr_intelligence_gain * (level - 1))
//   hp_max     = 120 + (total_str * 22)
//   mp_max     = 75  + (total_int * 12)
//   hp_regen   = base_health_regen + (total_str * 0.1)
//   mana_regen = base_mana_regen   + (total_int * 0.05)
export async function calculateResources(heroId, level = 1) {
	try {
		const data = await doSqlQuery(
			`SELECT attr_strength_base, attr_strength_gain, attr_intelligence_base, attr_intelligence_gain, base_health_regen, base_mana_regen FROM heroes WHERE id = ${heroId}`
		);

		if (!data || !data.length) {
			return { hp_max: 1400, mp_max: 900, hp_regen: 0, mana_regen: 0 };
		}

		const h = data[0];
		const total_str  = (h.attr_strength_base     || 0) + Math.floor((h.attr_strength_gain     || 0) * (level - 1));
		const total_int  = (h.attr_intelligence_base || 0) + Math.floor((h.attr_intelligence_gain || 0) * (level - 1));

		return {
			hp_max:     120 + (total_str * 22),
			mp_max:      75 + (total_int * 12),
			hp_regen:   (h.base_health_regen || 0) + total_str * 0.1,
			mana_regen: (h.base_mana_regen   || 0) + total_int * 0.05
		};
	} catch (e) {
		console.error('CalculationEngine error:', e);
		return { hp_max: 1400, mp_max: 900, hp_regen: 0, mana_regen: 0 };
	}
}
