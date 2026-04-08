// CalculationEngine - computes hero HP/MP based on hero stats and level
// TODO: Add item bonus calculations when item selection is implemented
// TODO: Verify hero table column names against dotabase schema if stats seem wrong

async function doSqlQuery(query) {
	const response = await fetch(`/api/sql?q=${encodeURI(query)}`);
	if (response.ok) {
		return await response.json();
	}
	return null;
}

// Dota 2 HP/MP formulas:
//   HP = base_health + (base_str + str_gain * (level-1)) * 20
//   MP = base_mana  + (base_int + int_gain * (level-1)) * 12
export async function calculateResources(heroId, level = 1) {
	try {
		const data = await doSqlQuery(
			`SELECT base_str, str_gain, base_int, int_gain, base_health, base_mana FROM heroes WHERE id = ${heroId}`
		);

		if (!data || !data.length) {
			return { hp_max: 1400, mp_max: 900 };
		}

		const h = data[0];
		const str   = (h.base_str  || 0) + (h.str_gain  || 0) * (level - 1);
		const intel = (h.base_int  || 0) + (h.int_gain  || 0) * (level - 1);

		return {
			hp_max: (h.base_health || 200) + Math.round(str   * 20),
			mp_max: (h.base_mana   ||  75) + Math.round(intel * 12)
		};
	} catch (e) {
		console.error('CalculationEngine error:', e);
		return { hp_max: 1400, mp_max: 900 };
	}
}
