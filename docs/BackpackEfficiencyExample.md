# Backpack Efficiency — Example

## Setup

- Hero: Techies, Level 6
- Inventory: Lotus Orb + Arcane Boots
- Starting state: **465 / 930 mana** (exactly 50%)

---

## Without the Backpack Trick

1. Use Arcane Boots (restores 150 mana flat)
2. Result: **615 / 930 mana**

**Net gain: 150 mana**

---

## With the Backpack Trick

| Step | Action | Mana |
|------|--------|------|
| 0 | Starting state | 465 / 930 |
| 1 | Move Lotus Orb to backpack | 340 / 680 *(still 50%)* |
| 2 | Use Arcane Boots (restores 150 mana) | 490 / 680 |
| 3 | Move Lotus Orb back to inventory | 670 / 930 |

**Net gain: 205 mana**

---

## Why This Works

Dota adjusts current HP/mana proportionally when max HP/mana changes. Removing Lotus Orb from inventory lowers your max mana (930 → 680), and your current mana scales down to maintain the same percentage (465 → 340). When you use Arcane Boots, you restore 150 mana on top of that lower base. Re-equipping Lotus Orb then scales your current mana back up proportionally (490/680 ≈ 72.06% → 670/930).

The result: you effectively converted 150 mana of flat restoration into 205 mana — **55 extra mana**, or **~36% more** than you would have gained without the trick.

---

## General Formula

```
Backpack gain = regen × (max_with_items / max_without_backpacked_items)
Extra gain    = Backpack gain − regen
Efficiency %  = (Backpack gain / regen − 1) × 100
```

In this example: `150 × (930 / 680) = 205.15`, extra = `55`, efficiency = `+36.8%`
