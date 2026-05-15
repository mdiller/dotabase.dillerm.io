// CalculationEngine — computes hero stats as self-describing StatGroups
// Each StatGroup carries its label, final value, display color, and the
// breakdown components that produced it.  The same object drives both the
// calculation and the UI so the two can never drift out of sync.
//
// StatGroup shape:
//   { key, label, value, color, components: Array<{label, value}>, format?, hidden? }

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

function statGroup(key, label, color, components) {
	return {
		key,
		label,
		color,
		value: components.reduce((s, c) => s + c.value, 0),
		components,
	};
}

// Parse ability_special JSON for each item row.
// Returns an array of per-item bonus objects covering all stats the engine uses.
//
// New fields vs. original:
//   shieldMagic      — barrier_block (Glimmer Cape, Pipe) absorbs magic dmg post-resist
//   shieldPhys       — absorb_amount (Pavise, Solar Crest) absorbs physical dmg post-armor
//   hpRegenPct       — hp_regen with "%" suffix (Heart: 1% of max HP, always on)
//   hpMissingRegen   — missing_health_regen (Heart: 1.5% of missing HP, dynamic)
//   magicResistAura  — magic_resistance_aura (Pipe aura benefits the carrier)
//   hpRegenAura      — aura_health_regen (Mekansm, Guardian Greaves, etc.)
//   manaRegenAura    — aura_mana_regen / mana_regen_aura (Guardian Greaves, Vladmir's)
//   armorAura        — armor_aura (Vladmir's aura benefits the carrier)
//
// Key aliases fixed vs. original:
//   bonus_str/bonus_agi/bonus_int  → str/agi/int
//   armor (no bonus_ prefix)       → armor  (Vladmir's, Buckler)
//   bonus_stats                    → all stats  (Helm items)
//   bonus_regen                    → hpRegen  (Helm items)
//   mana_regen                     → manaRegen  (Vladmir's)
//   hp_regen (flat, no %)          → hpRegen  (any item using this key)
export function parseItemBonuses(itemRows) {
	return itemRows.map(row => {
		const bonus = {
			name: row.localized_name,
			str: 0, agi: 0, int: 0,
			flatHp: 0, flatMana: 0,
			hpRegen: 0, manaRegen: 0,
			hpRegenAmp: 0, manaRegenAmp: 0,
			armor: 0, magicResist: 0,
			shieldMagic: 0,
			shieldPhys: 0,
			hpRegenPct: 0,
			hpMissingRegen: 0,
			magicResistAura: 0,
			hpRegenAura: 0,
			manaRegenAura: 0,
			armorAura: 0,
		};
		let specs;
		try { specs = JSON.parse(row.ability_special); } catch { return bonus; }
		if (!Array.isArray(specs)) return bonus;

		for (const spec of specs) {
			const v = parseFloat(spec.value);
			if (isNaN(v) || v === 0) continue;

			if (!spec.header) {
				// No-header specs are auras, barriers, and conditional effects
				switch (spec.key) {
					case 'magic_resistance_aura':                bonus.magicResistAura += v / 100; break;
					case 'aura_health_regen':                    bonus.hpRegenAura     += v;       break;
					case 'aura_mana_regen':
					case 'mana_regen_aura':                      bonus.manaRegenAura   += v;       break;
					case 'armor_aura':                           bonus.armorAura       += v;       break;
					case 'missing_health_regen':                 bonus.hpMissingRegen  += v;       break;
					case 'barrier_block':                        bonus.shieldMagic     += v;       break;
					case 'absorb_amount':                        bonus.shieldPhys      += v;       break;
				}
				continue;
			}

			switch (spec.key) {
				case 'bonus_strength':
				case 'bonus_str':             bonus.str          += v; break;
				case 'bonus_agility':
				case 'bonus_agi':             bonus.agi          += v; break;
				case 'bonus_intellect':
				case 'bonus_int':             bonus.int          += v; break;
				case 'bonus_all_stats':
				case 'bonus_stats':           bonus.str += v; bonus.agi += v; bonus.int += v; break;
				case 'bonus_health':          bonus.flatHp       += v; break;
				case 'bonus_mana':            bonus.flatMana     += v; break;
				case 'bonus_health_regen':
				case 'health_regen':
				case 'bonus_regen':           bonus.hpRegen      += v; break;
				case 'bonus_mana_regen':
				case 'mana_regen':            bonus.manaRegen    += v; break;
				case 'hp_regen_amp':          bonus.hpRegenAmp   += v / 100; break;
				case 'mana_regen_multiplier': bonus.manaRegenAmp += v / 100; break;
				case 'bonus_armor':
				case 'armor':                 bonus.armor        += v; break;
				case 'tooltip_resist':
				case 'magic_resistance':
				case 'bonus_magical_armor':   bonus.magicResist  += v / 100; break;
				// Heart of Tarrasque: "1%" → percentage of max HP regen
				case 'hp_regen':
					if (typeof spec.value === 'string' && spec.value.includes('%')) {
						bonus.hpRegenPct += v / 100;
					} else {
						bonus.hpRegen += v;
					}
					break;
			}
		}
		return bonus;
	});
}

// Convenience wrapper for single-item parsing (used by TankinessApplet)
export function parseItemSpecial(abilitySpecialJson, name = '') {
	return parseItemBonuses([{ ability_special: abilitySpecialJson, localized_name: name }])[0];
}

// Build breakdown components for a per-item stat, one entry per contributing item.
function itemComponents(itemBonuses, accessor) {
	return itemBonuses
		.filter(i => accessor(i))
		.map(i => ({ label: i.name, value: accessor(i) }));
}

// Build breakdown components for item stat cascading into a multiplied value.
function itemCascadeComponents(itemBonuses, accessor, mult, abbrev) {
	return itemBonuses
		.filter(i => accessor(i))
		.map(i => ({ label: `${i.name} (${accessor(i)} ${abbrev} × ${mult})`, value: accessor(i) * mult }));
}

const FORCED_ATTR_BONUS_LEVELS = [15, 16, 17, 19, 20, 21, 22];

function getForcedAttrBonusCount(level) {
	return FORCED_ATTR_BONUS_LEVELS.filter(l => l <= level).length;
}

// Dota 2 formulas:
//   hp_max     = 120 + totalStr*22 + flatHp items
//   mp_max     = 75  + totalInt*12 + flatMana items
//   hp_regen   = (base + str*0.1 + item flat + aura + heart%) * (1 + Σ amp) + heart missing%
//   ehp_phys   = (hp_max + physShield) / (1 - physResist)
//   ehp_magic  = (hp_max + magicShield) / magicDamageTaken
//
// hpCurrent is needed for Heart of Tarrasque's missing-HP regen component.
export async function calculateResources(heroId, level = 1, items = [], hpCurrent = 0) {
	const fallback = buildFallbackStats();
	if (!heroId) return fallback;

	try {
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
		const heroBaseMR = (h.magic_resistance || 25) / 100;

		const lvls      = level - 1;
		const attrBonus = getForcedAttrBonusCount(level) * 2;
		const heroStr   = strBase + Math.floor(strGain * lvls) + attrBonus;
		const heroAgi   = agiBase + Math.floor(agiGain * lvls) + attrBonus;
		const heroInt   = intBase + Math.floor(intGain * lvls) + attrBonus;

		const itemBonuses = parseItemBonuses(itemData || []);

		const totalStr = heroStr + itemBonuses.reduce((s, i) => s + i.str, 0);
		const totalAgi = heroAgi + itemBonuses.reduce((s, i) => s + i.agi, 0);
		const totalInt = heroInt + itemBonuses.reduce((s, i) => s + i.int, 0);

		// --- Aura aggregates (carrier benefits from own aura) ---
		const auraHpRegen   = itemBonuses.reduce((s, i) => s + i.hpRegenAura,   0);
		const auraManaRegen = itemBonuses.reduce((s, i) => s + i.manaRegenAura, 0);
		const auraArmor     = itemBonuses.reduce((s, i) => s + i.armorAura,     0);

		// --- Non-stacking Heart regen: only one item's passive activates ---
		// If multiple Hearts are held, the proc chance means the passive still only
		// triggers once. We take the first item that provides these fields.
		const heartBonus          = itemBonuses.find(i => i.hpRegenPct > 0 || i.hpMissingRegen > 0);
		const heartHpRegenPct     = heartBonus?.hpRegenPct     ?? 0;
		const heartHpMissingRegen = heartBonus?.hpMissingRegen ?? 0;

		// --- Shields ---
		const totalMagicShield = itemBonuses.reduce((s, i) => s + i.shieldMagic, 0);
		const totalPhysShield  = itemBonuses.reduce((s, i) => s + i.shieldPhys,  0);

		// --- Core derived values ---
		const hpMaxVal   = 120 + totalStr * 22 + itemBonuses.reduce((s, i) => s + i.flatHp, 0);
		const totalArmor = baseArmor
		                 + totalAgi * (1/6)
		                 + itemBonuses.reduce((s, i) => s + i.armor, 0)
		                 + auraArmor;
		const physResist = (0.06 * totalArmor) / (1 + 0.06 * Math.abs(totalArmor));

		// Physical EHP: shield absorbs post-armor damage, so it enters the numerator
		const ehpPhysVal = (hpMaxVal + totalPhysShield) / (1 - physResist);

		const intMR           = totalInt * 0.001;
		const totalBaseMR     = heroBaseMR + intMR;
		const itemMRMult      = itemBonuses.reduce((m, i) => m * (1 - i.magicResist),     1);
		// Pipe's aura MR also benefits the carrier multiplicatively
		const itemMRAuraMult  = itemBonuses.reduce((m, i) => m * (1 - i.magicResistAura), 1);
		const magicDmgTaken   = (1 - totalBaseMR) * itemMRMult * itemMRAuraMult;
		const totalMR         = 1 - magicDmgTaken;

		// Magic EHP: shield absorbs post-resist damage, so it enters the numerator
		const ehpMagicVal = magicDmgTaken > 0 ? (hpMaxVal + totalMagicShield) / magicDmgTaken : 0;

		// --- Heart of Tarrasque regen ---
		const missingHp    = Math.max(hpMaxVal - hpCurrent, 0);
		const heartHpRegen = heartHpRegenPct * hpMaxVal
		                   + (heartHpMissingRegen / 100) * missingHp;

		// --- Per-item EHP contributions (for the item hover bar) ---
		const itemContributions = {};
		(itemData || []).forEach((row, idx) => {
			const item = itemBonuses[idx];
			const hp_c = item.str * 22 + item.flatHp;
			const mp_c = item.int * 12 + item.flatMana;
			const hp_w = hpMaxVal - hp_c;

			// EHP Phys without this item
			const armor_w      = totalArmor - item.armor - item.agi * (1/6) - item.armorAura;
			const pr_w         = (0.06 * armor_w) / (1 + 0.06 * Math.abs(armor_w));
			const shieldPhys_w = totalPhysShield - item.shieldPhys;
			const ehpPhys_w    = (hp_w + shieldPhys_w) / (1 - pr_w);

			// EHP Magic without this item
			const mrMult_w     = item.magicResist     > 0 ? itemMRMult     / (1 - item.magicResist)     : itemMRMult;
			const mrAuraMult_w = item.magicResistAura > 0 ? itemMRAuraMult / (1 - item.magicResistAura) : itemMRAuraMult;
			const mdt_w        = (1 - totalBaseMR) * mrMult_w * mrAuraMult_w;
			const shieldMagic_w = totalMagicShield - item.shieldMagic;
			const ehpMagic_w   = mdt_w > 0 ? (hp_w + shieldMagic_w) / mdt_w : 0;

			itemContributions[row.id] = {
				hp_max:    hp_c,
				mp_max:    mp_c,
				ehp_phys:  ehpPhysVal  - ehpPhys_w,
				ehp_magic: ehpMagicVal - ehpMagic_w,
			};
		});

		const levelBonusComponents = (base, gain, lvls) => {
			const bonus       = Math.floor(gain * lvls);
			const forcedCount = getForcedAttrBonusCount(level);
			return [
				{ label: 'Base',                                      value: base },
				...(lvls > 0        ? [{ label: `Level ${lvls} × ${gain}`,         value: bonus         }] : []),
				...(forcedCount > 0 ? [{ label: `Attribute Bonus (${forcedCount} × +2)`, value: forcedCount * 2 }] : []),
			];
		};

		// EHP breakdown helpers — split total bonus into resist/armor/shield parts
		const ehpPhysShieldBonus  = totalPhysShield  > 0                ? totalPhysShield  / (1 - physResist) : 0;
		const ehpPhysArmorBonus   = ehpPhysVal - hpMaxVal - ehpPhysShieldBonus;
		const ehpMagicShieldBonus = totalMagicShield > 0 && magicDmgTaken > 0 ? totalMagicShield / magicDmgTaken : 0;
		const ehpMagicResistBonus = ehpMagicVal - hpMaxVal - ehpMagicShieldBonus;

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
				{ label: 'Base Mana',                    value: 75 },
				{ label: `${heroInt} Intelligence × 12`, value: heroInt * 12 },
				...itemCascadeComponents(itemBonuses, i => i.int, 12, 'Int'),
				...itemComponents(itemBonuses, i => i.flatMana),
			]),
			(() => {
				const flatComponents = [
					...(baseHpR ? [{ label: 'Base Regen',               value: baseHpR }] : []),
					{ label: `${heroStr} Strength × 0.1`,               value: heroStr * 0.1 },
					...itemCascadeComponents(itemBonuses, i => i.str, 0.1, 'Str'),
					...itemComponents(itemBonuses, i => i.hpRegen),
					...itemBonuses.filter(i => i.hpRegenAura > 0).map(i => ({
						label: `${i.name} (aura)`, value: i.hpRegenAura,
					})),
					...(heartBonus && heartHpRegenPct > 0 ? [{
						label: `${heartBonus.name} (${heartHpRegenPct * 100}% max HP)`,
						value: heartHpRegenPct * hpMaxVal,
					}] : []),
					...(heartBonus && heartHpMissingRegen > 0 ? [{
						label: `${heartBonus.name} (${heartHpMissingRegen}% missing HP)`,
						value: (heartHpMissingRegen / 100) * missingHp,
					}] : []),
				];
				const flatTotal     = flatComponents.reduce((s, c) => s + c.value, 0);
				const ampComponents = itemBonuses
					.filter(i => i.hpRegenAmp)
					.map(i => ({ label: `${i.name} (+${Math.round(i.hpRegenAmp * 100)}%)`, value: flatTotal * i.hpRegenAmp }));
				return statGroup('hp_regen', 'Health Regen', STAT_COLORS.hp, [...flatComponents, ...ampComponents]);
			})(),
			(() => {
				const flatComponents = [
					...(baseMpR ? [{ label: 'Base Regen',                value: baseMpR }] : []),
					{ label: `${heroInt} Intelligence × 0.05`,           value: heroInt * 0.05 },
					...itemCascadeComponents(itemBonuses, i => i.int, 0.05, 'Int'),
					...itemComponents(itemBonuses, i => i.manaRegen),
					...itemBonuses.filter(i => i.manaRegenAura > 0).map(i => ({
						label: `${i.name} (aura)`, value: i.manaRegenAura,
					})),
				];
				const flatTotal     = flatComponents.reduce((s, c) => s + c.value, 0);
				const ampComponents = itemBonuses
					.filter(i => i.manaRegenAmp)
					.map(i => ({ label: `${i.name} (+${Math.round(i.manaRegenAmp * 100)}%)`, value: flatTotal * i.manaRegenAmp }));
				return statGroup('mana_regen', 'Mana Regen', STAT_COLORS.mana, [...flatComponents, ...ampComponents]);
			})(),

			(() => {
				const heroAgiArmor     = heroAgi * (1/6);
				const itemAgiArmor     = itemBonuses.filter(i => i.agi).map(i => ({
					label: `${i.name} (${i.agi} Agi × 0.167)`, value: i.agi * (1/6),
				}));
				const itemFlatArmor    = itemBonuses.filter(i => i.armor).map(i => ({
					label: i.name, value: i.armor,
				}));
				const itemAuraArmor    = itemBonuses.filter(i => i.armorAura > 0).map(i => ({
					label: `${i.name} (aura)`, value: i.armorAura,
				}));
				return statGroup('armor', 'Armor', STAT_COLORS.str, [
					...(baseArmor ? [{ label: 'Base Armor', value: baseArmor }] : []),
					{ label: `${heroAgi} Agility × 0.167`, value: heroAgiArmor },
					...itemAgiArmor,
					...itemFlatArmor,
					...itemAuraArmor,
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
				{ label: 'Armor bonus', value: ehpPhysArmorBonus },
				...(ehpPhysShieldBonus > 0 ? [{ label: 'Physical shields', value: ehpPhysShieldBonus }] : []),
			]),

			{
				...statGroup('magic_resist', 'Magic Resist', STAT_COLORS.int, [
					{ label: `Hero base (${Math.round(heroBaseMR * 100)}%)`, value: heroBaseMR },
					{ label: `${totalInt} Intelligence × 0.1%`,              value: intMR },
					...itemBonuses.filter(i => i.magicResist).map(i => ({
						label: i.name, value: i.magicResist,
					})),
					...itemBonuses.filter(i => i.magicResistAura > 0).map(i => ({
						label: `${i.name} (aura)`, value: i.magicResistAura,
					})),
				]),
				value: totalMR,  // override sum — magic resist stacks multiplicatively
				format: 'percent',
			},

			statGroup('ehp_magic', 'EHP Magical', STAT_COLORS.int, [
				{ label: 'Max Health',        value: hpMaxVal },
				{ label: 'Magic resist bonus', value: ehpMagicResistBonus },
				...(ehpMagicShieldBonus > 0 ? [{ label: 'Magic shields', value: ehpMagicShieldBonus }] : []),
			]),

			// Hidden auxiliary values consumed by TankinessApplet for marginal calculations
			{ key: 'shield_magic', label: '', color: '', value: totalMagicShield, components: [], hidden: true },
			{ key: 'shield_phys',  label: '', color: '', value: totalPhysShield,  components: [], hidden: true },
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
			{ key: 'strength',     label: 'Strength',      color: STAT_COLORS.str,  value: 0, components: [] },
			{ key: 'agility',      label: 'Agility',       color: STAT_COLORS.agi,  value: 0, components: [] },
			{ key: 'intelligence', label: 'Intelligence',  color: STAT_COLORS.int,  value: 0, components: [] },
			{ key: 'hp_max',       label: 'Max HP',        color: STAT_COLORS.hp,   value: 0, components: [] },
			{ key: 'mp_max',       label: 'Max Mana',      color: STAT_COLORS.mana, value: 0, components: [] },
			{ key: 'hp_regen',     label: 'HP Regen',      color: STAT_COLORS.hp,   value: 0, components: [] },
			{ key: 'mana_regen',   label: 'Mana Regen',    color: STAT_COLORS.mana, value: 0, components: [] },
			{ key: 'armor',        label: 'Armor',         color: STAT_COLORS.str,  value: 0, components: [] },
			{ key: 'phys_resist',  label: 'Phys Resist',   color: STAT_COLORS.str,  value: 0, components: [], ...pct },
			{ key: 'ehp_phys',     label: 'EHP Physical',  color: STAT_COLORS.str,  value: 0, components: [] },
			{ key: 'magic_resist', label: 'Magic Resist',  color: STAT_COLORS.int,  value: 0, components: [], ...pct },
			{ key: 'ehp_magic',    label: 'EHP Magical',   color: STAT_COLORS.int,  value: 0, components: [] },
			{ key: 'shield_magic', label: '', color: '', value: 0, components: [], hidden: true },
			{ key: 'shield_phys',  label: '', color: '', value: 0, components: [], hidden: true },
		],
		itemContributions: {},
	};
}

export function getStat(stats, key) {
	return stats.find(s => s.key === key)?.value ?? 0;
}
