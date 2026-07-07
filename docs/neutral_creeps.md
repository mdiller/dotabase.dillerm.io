# Neutral Creeps Page

**Status: UNIMPLEMENTED**

## Concept

A page for browsing neutral creep camps — showing each creep's stats, abilities, and ability details pulled from the dotabase.

## Data Availability in Dotabase

Neutral creep abilities are stored in the `abilities` table with `hero_id = NULL`. There are **39 confirmed neutral creep abilities** with full descriptions, stats, damage types, behaviors, mana costs, cooldowns, and `ability_special` JSON.

### Confirmed Abilities by Camp

| Internal Name | Display Name | Behavior | Description Summary |
|---|---|---|---|
| `alpha_wolf_command_aura` | Packleader's Aura | passive | +20% bonus damage aura, 1200 radius |
| `alpha_wolf_critical_strike` | Critical Strike | passive | 20% chance, 200/225/250/300% crit damage |
| `giant_wolf_critical_strike` | Critical Strike | passive | 20% chance, 200% crit damage |
| `giant_wolf_intimidate` | Intimidate | no_target | 60% damage reduction in 300-500 radius, 4s duration |
| `kobold_tunneler_prospecting` | Prospecting Aura | passive | +20/25/30/40 GPM aura, 1200 radius |
| `kobold_taskmaster_speed_aura` | Speed Aura | passive | +12-16% move speed aura, 1200 radius |
| `kobold_disarm` | Steal Weapon | passive | Every 3rd attack disarms for 3-5s |
| `hill_troll_rally` | Rally | passive | +2 bonus damage aura (stackable), 1200 radius |
| `berserker_troll_break` | Break | passive | Applies break on attack for 3s, cooldown 10/9/8/6 |
| `forest_troll_high_priest_heal` | Heal | unit_target (autocast) | Heals 100 HP, mana 60, cd 10/9/8/6 |
| `forest_troll_high_priest_mana_aura` | Mana Aura | passive | +1.75 mana regen aura, 1200 radius |
| `forest_troll_high_priest_heal_amp_aura` | Heal Amplification Aura | passive | +15% heal amp aura, 1200 radius |
| `dark_troll_warlord_ensnare` | Ensnare | unit_target | Root 1.75s, mana 75, cd 15 |
| `dark_troll_warlord_raise_dead` | Raise Dead | no_target | Summons 3 skeletons (35s duration), mana 50, cd 20 |
| `harpy_storm_chain_lightning` | Chain Lightning | unit_target | 120/170/220/270 damage, jumps 4 targets, cd 4 |
| `harpy_scout_take_off` | Take Off | no_target (toggle) | Flying movement, -50 to -10% move speed, drains 4% mana/s |
| `satyr_trickster_purge` | Purge | unit_target | Dispel + 5s slow, mana 120-100, cd 3 |
| `satyr_soulstealer_mana_burn` | Mana Burn | unit_target | Burns 20-35 + 1-2.5x INT mana, deals equal damage |
| `satyr_hellcaller_shockwave` | Shockwave | unit_target/point | Traveling shockwave, mana 100, cd 8 |
| `satyr_hellcaller_unholy_aura` | Unholy Aura | passive | +3/5/7/11 HP regen aura, 1200 radius |
| `centaur_khan_war_stomp` | War Stomp | no_target | 1.6s hero stun / 3s creep stun, 250 radius, mana 50, cd 12 |
| `centaur_khan_endurance_aura` | Swiftness Aura | passive | +15/18/21/27 attack speed aura, 1200 radius |
| `centaur_rawhide` | Rawhide | passive/hidden | Gains +25 max HP every 120s permanently |
| `ghost_frost_attack` | Frost Attack | passive | On-hit: -25 to -37% move/attack slow, 1.5s |
| `ogre_bruiser_ogre_smash` | Ogre Smash! | point | 200-400 + 8% current HP damage, 2.4s stun, cd 12 |
| `ogre_magi_frost_armor` | Ice Armor | unit_target | +4-8 armor (45s), attacker slowed 22-30%, cd 5 |
| `mud_golem_hurl_boulder` | Hurl Boulder | unit_target | 75 hero / 150 creep damage, 0.5s stun, cd 30 |
| `mud_golem_rock_destroy` | Shard Split | passive | On death: splits into 2-3 Shard Golems |
| `mudgolem_cloak_aura` | Cloak Aura | passive | +10-16% magic resist heroes / +20-32% creeps, 1200 radius |
| `granite_golem_hp_aura` | Granite Aura | passive | +16-19% max HP aura, 1200 radius |
| `ancient_rock_golem_weakening_aura` | Weakening Aura | passive | -3/4/5/6 armor aura, 1200 radius |
| `frostbitten_golem_time_warp_aura` | Time Warp Aura | passive | +8-11% cooldown reduction aura, 1200 radius |
| `warlock_golem_flaming_fists` | Flaming Fists | passive | +40/50/60 pure damage splash on attack, 300 radius |
| `warlock_golem_permanent_immolation` | Permanent Immolation | passive | 30/45/60 magic damage/s to nearby enemies, 300 radius |
| `black_dragon_fireball` | Fireball | point/aoe | 85 dps in 300 radius for 8-12s, mana 200, cd 15 |
| `black_dragon_splash_attack` | Splash Attack | passive | 100% damage splash in 250 range |
| `black_dragon_dragonhide_aura` | Dragonhide Aura | passive | +3 armor aura (stackable), 1200 radius |

### Other Non-Hero Abilities (also in table)
- `neutral_spell_immunity` — Spell Immunity (generic neutral tag)
- `neutral_upgrade` — empty (probably internal flag)
- Various greevil, dragonspawn, and event-related abilities also present

## Possible Page Approaches

1. **Camp browser** — show each camp with its creeps and their abilities listed below
2. **Ability list** — flat list of all neutral creep abilities with filtering by type (aura, active, passive)
3. **Integrated into existing Query page** — just add a predefined SQL query for neutral abilities

## Query to Get Neutral Creep Abilities

```sql
SELECT name, localized_name, description, behavior, damage_type, mana_cost, cooldown, ability_special
FROM abilities
WHERE hero_id IS NULL
  AND name NOT LIKE 'special_bonus%'
  AND description != ''
ORDER BY name;
```

Note: There's no explicit "neutral creep" flag — filtering by `hero_id IS NULL` + excluding `special_bonus` names gets close. Some non-neutral abilities (warlock summons, greevils) are also included.

## Open Questions

- Is there a separate table or JSON field linking creep units to their abilities?
- Are creep HP/gold/XP stats stored anywhere in the DB, or only in Liquipedia/wiki?
- Should camp tier grouping be hardcoded or is it derivable from ability names/data?
