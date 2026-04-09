# Resource Calculator Research

Research notes for implementing the Max HP / Max Mana calculation engine in the `ResourceCalculator` Vue page.

---

## References

- [Liquipedia — Health](https://liquipedia.net/dota2/Health)
- [Liquipedia — Mana](https://liquipedia.net/dota2/Mana)
- [Liquipedia — Attributes](https://liquipedia.net/dota2/Attributes)
- [Liquipedia — Strength](https://liquipedia.net/dota2/Strength)
- [Liquipedia — Intelligence](https://liquipedia.net/dota2/Intelligence)
- [Liquipedia — Armor](https://liquipedia.net/dota2/Armor)
- [Liquipedia — Magic Resistance](https://liquipedia.net/dota2/Magic_Resistance)

---

## Core Formulas

### Attribute Calculation at Level N

```
total_strength     = attr_strength_base     + floor(attr_strength_gain     * (level - 1))
total_agility      = attr_agility_base      + floor(attr_agility_gain      * (level - 1))
total_intelligence = attr_intelligence_base + floor(attr_intelligence_gain * (level - 1))
```

Level range: 1–30. At level 1, no gain is added (gain × 0 = 0).

### Max HP

```
max_hp = 120 + (total_strength * 22)
```

- **120** is the universal base HP constant (applies to all heroes)
- **22** HP per point of strength

### Max Mana

```
max_mana = 75 + (total_intelligence * 12)
```

- **75** is the universal base mana constant (applies to all heroes)
- **12** mana per point of intelligence

### HP Regen (base, no items)

```
hp_regen = base_health_regen + (total_strength * 0.1)
```

- `base_health_regen` is the flat regen from the `heroes` DB table
- **0.1** HP/sec per point of strength
- (10 strength = 1 HP/sec from attributes)

### Mana Regen (base, no items)

```
mana_regen = base_mana_regen + (total_intelligence * 0.05)
```

- `base_mana_regen` is the flat regen from the `heroes` DB table
- **0.05** mana/sec per point of intelligence
- (20 intelligence = 1 mana/sec from attributes)

---

## Database Fields

All fields come from the `heroes` table in the dotabase SQLite DB.

| Field | Type | Notes |
|-------|------|-------|
| `id` | INTEGER | Primary key |
| `localized_name` | VARCHAR | Display name (e.g. `"Anti-Mage"`) |
| `attr_primary` | VARCHAR | `"strength"`, `"agility"`, `"intelligence"`, or `"all"` (universal) |
| `attr_strength_base` | INTEGER | Starting strength value |
| `attr_strength_gain` | FLOAT | Strength gained per level |
| `attr_agility_base` | INTEGER | Starting agility value |
| `attr_agility_gain` | FLOAT | Agility gained per level |
| `attr_intelligence_base` | INTEGER | Starting intelligence value |
| `attr_intelligence_gain` | FLOAT | Intelligence gained per level |
| `base_health_regen` | FLOAT | Flat HP regen (independent of strength) |
| `base_mana_regen` | FLOAT | Flat mana regen (independent of intelligence) |

### Sample Query

```sql
SELECT
  localized_name, attr_primary,
  attr_strength_base, attr_strength_gain,
  attr_agility_base, attr_agility_gain,
  attr_intelligence_base, attr_intelligence_gain,
  base_health_regen, base_mana_regen
FROM heroes
WHERE localized_name = 'Anti-Mage';
```

### Example: Anti-Mage at Level 10

```
total_strength = 21 + floor(1.6 * 9) = 21 + 14 = 35
max_hp         = 120 + (35 * 22)     = 120 + 770 = 890
hp_regen       = 1.0 + (35 * 0.1)   = 1.0 + 3.5 = 4.5

total_intelligence = 12 + floor(1.8 * 9) = 12 + 16 = 28
max_mana           = 75 + (28 * 12)      = 75 + 336 = 411
mana_regen         = 0.0 + (28 * 0.05)  = 1.4
```

---

## Edge Cases / Known Anomalies

### base_mana_regen is Non-Zero for Many Heroes

33 heroes have a non-zero `base_mana_regen` value. Examples:

| Hero | base_mana_regen |
|------|-----------------|
| Techies | 1.0 |
| Void Spirit | 0.6 |
| Puck | 0.5 |
| Tidehunter | 0.5 |
| Enigma | 0.5 |

Always include `base_mana_regen` in the mana regen calculation — do not assume it's 0.

### Huskar (Zero Base Mana)

Huskar's `json_data` contains `"StatusMana": "0"`, meaning his mana pool behaves differently (his abilities cost HP, not mana). If needed, check `json_extract(json_data, '$.StatusMana')` to detect this. For now, the standard formula likely still gives a small mana pool from intelligence, and this edge case may not matter for the calculator.

### Ogre Magi (Custom StatusMana = 120)

Ogre Magi has `"StatusMana": "120"` and `"StatusHealthRegen": "1.5"` in `json_data`. The `base_health_regen` field in the heroes table already reflects 1.5, so that's handled. The StatusMana = 120 may represent a non-standard base mana pool for him specifically. Check if the standard formula (75 + int * 12) matches in-game values for him.

### Universal Heroes (`attr_primary = 'all'`)

Universal heroes get +0.45 attack damage per point of any attribute (instead of +1 from their primary). This affects attack damage only — HP and mana still use the same formulas (strength → HP, intelligence → mana). No special handling needed for HP/mana calculation.

---

## Armor

Source: [Liquipedia — Armor](https://liquipedia.net/dota2/Armor)

### Total Armor

```
total_armor = base_armor + (total_agility × 0.167) + Σ(item bonus_armor)
```

- `base_armor` comes from the `heroes` table (`base_armor` column)
- **0.167 (1/6) armor per agility point**
- Items contribute via `bonus_armor` key in `ability_special`

### Physical Damage Reduction

```
phys_resist = (0.06 × total_armor) / (1 + 0.06 × |total_armor|)
```

- Handles negative armor correctly (increases damage taken)
- At 10 armor: ~37.5% reduction
- At 20 armor: ~54.5% reduction

### Effective HP vs Physical

```
ehp_physical = max_hp / (1 - phys_resist)
```

---

## Magic Resistance

Source: [Liquipedia — Magic Resistance](https://liquipedia.net/dota2/Magic_Resistance)

### Base Magic Resistance

```
base_magic_resist = 0.25 + (total_intelligence × 0.001)
```

- All heroes have **25% innate magic resistance** (stored as integer `25` in `heroes.magic_resistance`)
- **+0.1% per intelligence point** (1% per 10 int)

### Item Magic Resistance Stacking

Item sources stack **multiplicatively**:

```
magic_damage_taken = (1 - base_magic_resist) × Π(1 - item_mr_i)
total_magic_resist = 1 - magic_damage_taken
```

**Example:** Base 25% + int bonus 3% + Cloak 18% + Pipe 20%:
```
damage_taken = (1 - 0.28) × (1 - 0.18) × (1 - 0.20)
             = 0.72 × 0.82 × 0.80 = 0.4723
total_resist = 1 - 0.4723 = 52.77%
```

### Item `ability_special` Keys for Magic Resistance

| Key | Used by | Format |
|-----|---------|--------|
| `tooltip_resist` | Cloak | `"18%"` |
| `magic_resistance` | Pipe of Insight | `"20%"` |
| `bonus_magical_armor` | Glimmer Cape | `"20%"` (with header) |

Note: Cloak also has `bonus_magical_armor: "18"` (no header, no `%`) — this is skipped in favor of `tooltip_resist`.

### Effective HP vs Magic

```
ehp_magic = max_hp / magic_damage_taken
```

### Database Fields (Heroes)

| Field | Type | Notes |
|-------|------|-------|
| `base_armor` | INTEGER | Hero's innate base armor (before agility contribution) |
| `magic_resistance` | INTEGER | Stored as `25` meaning 25% — same for all heroes currently |

---

## Item Support (NOT IMPLEMENTED YET)

> ⚠️ **DO NOT IMPLEMENT** — Planned only. Items add significant complexity and are out of scope for the first pass.

### Overview

Items grant bonuses that affect HP and mana via several mechanics:
1. **Flat attribute bonuses** → which then scale HP/mana via the standard multipliers
2. **Flat HP/mana bonuses** → direct additions to the pool
3. **Flat HP/mana regen bonuses** → direct additions to regen
4. **Percentage HP/mana bonuses** → multiplicative increases to the pool

### Item Data Location

Items are in the `items` table. The `ability_special` column is a JSON array like:

```json
[
  { "key": "bonus_strength", "value": "5" },
  { "key": "bonus_health", "value": "50" }
]
```

### Relevant `ability_special` Keys

| Key | Effect |
|-----|--------|
| `bonus_strength` | +N strength → +N*22 max HP, +N*0.1 HP regen |
| `bonus_agility` | +N agility (no HP/mana effect) |
| `bonus_intellect` | +N intelligence → +N*12 max mana, +N*0.05 mana regen |
| `bonus_all_stats` | +N to all three attributes |
| `bonus_health` | +N flat HP |
| `bonus_mana` | +N flat mana |
| `bonus_health_regen` | +N flat HP regen |
| `bonus_mana_regen` | +N flat mana regen |
| `health_regen` | +N flat HP regen (alternate key used by some items, e.g. Pipe) |
| `bonus_max_mana_percentage` | +N% max mana (e.g. Null Talisman: 3%) |
| `hp_regen` | +N% of max HP per second (e.g. Heart of Tarrasque: 1%) |

### Complications / Open Questions

- **Key naming is inconsistent** — `bonus_intellect` vs `bonus_intelligence`, `health_regen` vs `bonus_health_regen`. You'll need to enumerate all variants across all items.
- **Percentage values are stored as strings** — e.g. `"3%"` for bonus_max_mana_percentage. Need to strip `%` and parse.
- **Order of operations** — When applying % bonuses, you need to know if they multiply just the base pool, or the pool after flat bonuses. Likely: flat bonuses first, then % multipliers.
- **Item slots** — In theory up to 6 inventory + 3 backpack (backpack items don't apply stats). The calculator UI would need to model which slot an item is in.
- **Neutral items** — Neutral item tier items have `neutral_tier` set. These go in a 7th dedicated slot and do apply their bonuses.
- **Item stacking** — Some passive bonuses are flagged non-stacking in the game engine but not in the DB data. Most stat bonuses do stack.
- **Ability Special values with multiple levels** — Some item values are space-separated (e.g. `"100 125 150"` for upgradeable items). The relevant level depends on whether the item has been upgraded (e.g. via Aghanim's).
- **Items with active abilities** — Items like Bloodstone have stats but also actives. The calculator only cares about passive stat contributions.

### Recommended Implementation Approach (When You Get There)

1. Build an `abilitySpecialToStatMap` mapping known keys → stat contributions
2. For each item in inventory, parse `ability_special` and sum contributions
3. Compute total stat bonuses and feed into the HP/mana formulas
4. Apply % bonuses last, after all flat bonuses are summed
5. Start with common items and expand coverage as edge cases are found
6. Consider building a test suite that cross-checks against known in-game values

---

## Implementation Checklist (Phase 1: Hero + Level Only)

- [ ] Hero selector (dropdown with search, show hero portrait/name)
- [ ] Level selector (1–30)
- [ ] Fetch hero data from API: `GET /api/sql?q=SELECT ... FROM heroes WHERE id = ?`
- [ ] Compute `total_strength`, `total_intelligence` at given level
- [ ] Compute and display: **Max HP**, **Max Mana**, **HP Regen**, **Mana Regen**
- [ ] Handle `base_mana_regen` correctly (non-zero for 33 heroes)
- [ ] Display hero's primary attribute for context
