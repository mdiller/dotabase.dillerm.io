# Dark Carnival — Data Sources

> **Status: Not yet implemented.** This doc covers the data available in the VPK; no `DarkCarnival.vue` page or generator script exists yet.

Documentation for a future `DarkCarnival.vue` page and its data pipeline.

---

## Overview

Dark Carnival is a standalone visual novel event (similar in structure to Crownfall, not Quartero's Curios). The story follows **Hoodwink** and **Tresdin** waking up as prisoners aboard the Ringmaster's circus train, then working with **Slark** to escape. A secondary thread shows events from **Ringmaster's** perspective.

The event also has gameplay systems: an overworld map, oracle puzzle, lockpicking mini-game, Slark jailbreak mini-game, tarot cards, and automaton hero encounters.

---

## Source Files in the VPK

All data originates from Dota 2's extracted VPK files at `F:/dota_vpk/`.

### Dialogue text
**`resource/localization/novels/darkcarnival_english.txt`**

659 lines total, 633 dialogue lines. VDF key-value format (same as Crownfall / Quartero's Curios novels).

Key prefix: `DOTA_VisualNovel_darkcarnival_`

**Two distinct parts:**

| Part | Prefix | Description |
|------|--------|-------------|
| `act1_part1` | `DOTA_VisualNovel_darkcarnival_act1_part1_` | Main story — Hoodwink, Tresdin, Slark |
| `ringmaster_part1` | `DOTA_VisualNovel_darkcarnival_ringmaster_part1_` | Ringmaster's monologues |

**act1_part1 sections** (from the `Dialogue_<section>_` key prefix):
- `main-1` through `main-19` — prison car escape sequence
- `smelter-01` through `smelter-14` — smelter encounter
- `smelter-hidden-01` through `smelter-hidden-09` — hidden smelter branch
- `oracle-02` through `oracle-08` — Automaton Oracle encounter / Tinker arc
- `fortune` — fortune-telling scene

**ringmaster_part1 sections:**
- `intro-1` — Ringmaster's opening showman monologue
- `prison-1` — Ringmaster addressing the captured heroes
- `smelter-escape`, `smelter-before` — Ringmaster at the smelter
- `blimp-before` — Ringmaster at the blimp

**Actors defined in the file:**

| Key suffix | Display name |
|-----------|--------------|
| `Hoodwink` | Hoodwink |
| `Tresdin` | Tresdin |
| `Slark`, `Slark2` | Slark |
| `FishWitch` | Fish Witch |
| `Bex` | Bex |
| `Bogg` | Bogg |
| `AutoAxe` | Automaton Axe |
| `AutoBristleback` | Automaton Bristleback |
| `AutoMorphling` | Automaton Morphling |
| `RingmasterDoll` | Ringmaster Doll |
| `Tinker`, `OlderTinker`, `OldestTinker` | Tinker (three ages) |
| `Cogliacci` | Cogliacci |
| `Clown` | Clown |
| `Kobold` | Cogsnout |
| `AutoOracle` | The Oracle |
| `Toilet` | Toilet |
| `Portal` | Portal |
| `Ringmaster` | Ringmaster |

---

## Event Assets

Event UI images are at `/panorama/images/events/dark_carnival/`. Key directories:

| Directory | Contents |
|-----------|----------|
| `logos/` | Dark Carnival logo, emblem, CN variants |
| `splash/` | Splash art |
| `intro/` | Three intro stills (`intro1_still_png.png` – `intro3_still_png.png`) |
| `dashboard/` | Dashboard UI elements |
| `overworld/` | Overworld map, hero icons, node images, reward panels |
| `oracle/` | Oracle puzzle UI |
| `lockpicking/` | Lockpicking mini-game assets (Slark arm/head) |
| `slark_jailbreak/` | Slark jailbreak mini-game assets |
| `tarots/` | Tarot card images |
| `tokens/` | Token images |
| `badges/` | Progress badge images (gold, silver, red) |
| `minigames/` | Mini-game menu backgrounds |
| `store/` | Event store UI |

---

## Character Portraits

Portraits live at `/panorama/images/events/dark_carnival/visual_novel/portraits/<character>/`.

| Character | Folder | Portrait files |
|-----------|--------|----------------|
| Hoodwink | `hoodwink/` | `hoodwink_default_idle_png.png`, `_angry_`, `_angry_pout_`, `_confused_`, `_eyesclosed_`, `_ponder_`, `_closeup_asleep_`, `_closeup_drowsy_`, `_closeup_thinking_` |
| Tresdin | `tresdin/` | `tresdin_default_idle_png.png`, `_idle_eyesclosed_`, `_powerup_`, `_shocked_`, closeups: `_annoyed_`, `_annoyed_lookright_`, `_huh_`, `_smug_`, `_stern_`, `_stern_lookright_` |
| Slark | `slark/` | `slark_default_angry_`, `_default_sly_`, `_nervoussmile_`, `_shocked_`, `_close_blush_`, `_close_slimy_`, `_close_squint_`, wall variants (`_wall_default_`, `_wall_nosmile_`, `_wall_rolleyes_`, `_wall_smug_`, `_wall_undamaged_`) |
| Ringmaster | `ringmaster/` | `ringmaster_idle_png.png`, `ringmaster_portrait_png.png`, `ringmasterdoll_idle_png.png` |
| Tinker | `tinker/` | `tinker_idle_`, `_excited_`, `_happytears_`, `_sad_`, `_shocked_`, `_smug_`, `_wipetear_`, `tinker_older_png.png`, `tinker_older_sad_png.png`, `tinker_oldest_png.png` |
| Cogliacci | `cogliacci/` | `cogliacci_idle_`, `_angry_`, `_angrytalk_`, `_dubious_`, `_dubious_smile_`, `_eyebrowsup_`, `_eyebrowsup_frown_`, `_snarl_lidded_`, `_talk_`, `_talk_eyesclosed_` |
| Fish Witch | `witch_fish/` | `witch_fish_idle_png.png`, `witch_fish_squint_png.png` |
| Bex (+ Bog) | `bex_bog/` | `bex_idle_`, `_annoyed_`, `_exasperated_`, `_eyeroll_`, `_frown_eyesclosed_`, `_grin_`, `_holdingbogdoll_`, `_idle_eyesclosed_`, `_nosmile_`, `_pointright_`, `_pout_`, `_proud_`, `_sneakywhisper_`, `_thinking_`, `_welp_`, `bex_doll_awaken_`, `bex_doll_happy_` |
| Clown | `clown/` | `clown_png.png`, `clown_happy_png.png`, `clown_steins_png.png` |
| Automaton Axe | `automaton_axe/` | `automaton_axe_default_`, `_eyebrowsup_`, `_jawopen_` |
| Automaton Bristleback | `automaton_bristleback/` | `idle_`, `_happy_`, `_eyesclosed_`, `_idle_mouthopen_`, `_surprised_`, `_powerpoint_`, `_powerpoint_smug_`, holdingsteins variants |
| Automaton Morphling | `automaton_morphling/` | `idle_`, `_mouth_open_` |
| Automaton Oracle | `automaton_oracle/` | `idle_`, `_idle_eyesclosed_`, `_dormant_`, `_lookright_`, holdingdevice variants |
| Automaton Kobold | `automaton_kobold/` | `automaton_kobold_idle_png.png` |

---

## Key Structure

```
DOTA_VisualNovel_darkcarnival_{part}_Actor_{name}        → actor display name
DOTA_VisualNovel_darkcarnival_{part}_Heading_{id}        → section heading
DOTA_VisualNovel_darkcarnival_{part}_Dialogue_{section}_{Speaker}_{index}  → dialogue line
```

Where `{part}` is `act1_part1` or `ringmaster_part1`.

Unlike Quartero's Curios, there is no `__title` (item reveal) or `__popup` (stage direction) message type — only character dialogue. Section headings use placeholder strings in the English file (`"Act 1 Part Ia Heading"`) and are not displayed to players.

---

## Comparison to Other Novel Events

| Event | File | Structure | Notes |
|-------|------|-----------|-------|
| Crownfall | `novels_english.txt` | `act1`–`act4`, branching | Dragonus + Shen story |
| Dark Carnival | `darkcarnival_english.txt` | `act1_part1` + `ringmaster_part1` | Hoodwink + Tresdin escape story |
| Quartero's Curios | `seasonal_english.txt` | Per-season item sets | Item reveal cards, spoken by Quartero cast |
| Monster Hunter | `monsterhunter_english.txt` | Placeholder only | Not implemented |
