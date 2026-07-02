# Quartero's Curios — Data Sources

Documentation for the `QuarterosCurios.vue` page and its data pipeline.

---

## Overview

The page displays the in-game visual novel dialogue from the **Quartero's Curios** seasonal event (4 seasons: Fall 2025, Winter 2025, Spring 2026, Summer 2026). Each season has 4 item sets, each containing a sequence of item reveal cards and character dialogue.

---

## Source Files in the VPK

All data originates from Dota 2's extracted VPK files at `F:/dota_vpk/`.

### Dialogue text
**`resource/localization/novels/seasonal_english.txt`**

This is the primary source — a 968-line VDF (Valve Data Format) key-value file containing all visual novel dialogue for every season. Encoding: UTF-8 (no BOM).

Key naming convention:
```
DOTA_VisualNovel_seasonal_{season}_Dialogue_{rest}
```

Where `{season}` is one of `fall_2025`, `winter_2025`, `spring_2026`, `summer_2026`, and `{rest}` encodes the set, item slot, message type, and index:

| Season | Key pattern | Example |
|--------|-------------|---------|
| Fall 2025 | `itemset-NN-slot(__title\|_Speaker)_N` | `itemset-01-ward__title_0` |
| Winter 2025+ | `q0N_setNN_itmNN(__title\|__popup\|_Speaker)_N` | `q02_set01_itm01_Quartero_0` |

Message types are determined by the suffix:
- `__title_N` → **ITEM** (item reveal, two leading underscores)
- `__popup_N` → **POPUP** (stage direction/sound effect, two leading underscores)
- `_SpeakerName_N` → **DIALOGUE** (one leading underscore)

The file also contains generic Quartero one-liners (`generic-N`) and actor/heading metadata keys that are ignored by the generator.

The file also contains `antique-01` keys in Winter 2025 and Spring 2026 — these are Quartero's monologue shown before the antique item pull. They are included as an extra set tab labeled "Antique Intro".

**Critical parsing note:** File order = display order. Keys must be processed line-by-line to preserve the correct narrative sequence. Alphabetical sorting produces wrong slot ordering (e.g. Fall 2025 uses slot names like `ward`, `head`, `belt` which don't sort into story order).

### UI strings
**`resource/localization/quartero_english.txt`**

Contains season titles, reward descriptions, XP tooltip text, and bundle/set names. Used for reference only — not consumed by the page directly.

---

## Set Images

Set card images are served from the VPK at:
```
/panorama/images/econ/sets/v2/{set_name}_small_png.png
```

Confirmed present in VPK:
- `papa_wanga_small_png.png`
- `maledictions_of_morrigan_small_png.png`
- `drakons_deed_small_png.png`
- `drakons_ire_small_png.png`
- `nether_beetle_small_png.png`
- `molten_monarch_small_png.png`
- `ember_enforcer_small_png.png`
- `gilded_tyrant_small_png.png`
- `the_blue_lotus_small_png.png`
- `stormfather_small_png.png`
- `the_red_berserker_small_png.png`

**Not found in VPK** (fallback to hero icon or blank):
- Worldsend (Spring 2026 set 4)
- All Summer 2026 sets (Golden Orbweaver, Amber Apis, Venomous Vestments, Poisonous Prelate) — likely unreleased at time of VPK extraction

Hero icon fallback path: `/panorama/images/heroes/npc_dota_hero_{name}_png.png`

---

## Character Portraits

Portrait images are served from the VPK at:
```
/panorama/images/events/seasonal/visual_novel/portraits/
```

| Character | Path (relative to above) | Notes |
|-----------|--------------------------|-------|
| Quartero | `quartero/quartero_portrait_idle_png.png` | Present all seasons |
| Quintessa | `quartero_spring_2026/quintessa/quin_idle_01_png.png` | Spring 2026+ |
| Blake Sextus | `quartero_spring_2026/sextus/idle_png.png` | Spring 2026+ |
| Galdron | — | No portrait in VPK; uses text-initial circle fallback |
| Quartero & Quintessa | — | No combined portrait; uses text-initial circle fallback |

---

## Generator Script

**`_temp/generate_quarteros.js`** — run with `node _temp/generate_quarteros.js` to regenerate `src/assets/quarteros_curios.json` from the VPK source file.

What it does:
1. Reads `F:/dota_vpk/resource/localization/novels/seasonal_english.txt` as UTF-8
2. Parses each line with a VDF regex: `^\s+"(KEY)"\s+"(VALUE)"\s*$`
3. Matches keys against the `DOTA_VisualNovel_seasonal_` prefix for all four seasons
4. Groups messages into seasons → sets, preserving file order
5. Strips timing annotations (`^-2.0` etc.) from text values
6. Normalizes `QuarteroAndQuintessa` → `"Quartero & Quintessa"`
7. Merges in hardcoded `SET_META` (set label, `set_image` path, `hero_icon` path)
8. Writes the result to `src/assets/quarteros_curios.json`

---

## Output JSON Structure

**`src/assets/quarteros_curios.json`**

```json
{
  "seasons": [
    {
      "id": "fall_2025",
      "label": "Fall 2025",
      "sets": [
        {
          "id": "set01",
          "label": "Witch Doctor — Papa Wanga",
          "set_image": "/panorama/images/econ/sets/v2/papa_wanga_small_png.png",
          "hero_icon": "/panorama/images/heroes/npc_dota_hero_witch_doctor_png.png",
          "messages": [
            { "type": "ITEM", "text": "Papa Wanga's Poppet" },
            { "type": "DIALOGUE", "speaker": "Quartero", "text": "Ah, a hero!" },
            { "type": "POPUP", "text": "CREAK!" }
          ]
        }
      ]
    }
  ]
}
```

Message counts per season (approximate):
- Fall 2025: ~180 messages across 4 sets
- Winter 2025: ~200 messages across 4 sets + antique intro
- Spring 2026: ~250 messages across 4 sets + antique intro
- Summer 2026: ~260 messages across 4 sets
