---
type: Index
category: Factions
tags:
  - politics
  - power-struggle
  - organization
cssclasses: cards
created: 2026-05-03T19:49
updated: 2026-05-04T18:05
leader:
alignment:
influence:
---

# 👥 Political & Social Factions

> [!abstract] **Power Dynamics**
> The city is divided not just by tiers, but by loyalties. As resources vanish, the friction between these groups defines the survival of Vilgeismar.

---

## 🏛️ Active Factions

```dataview
TABLE WITHOUT ID
    file.link AS "Faction",
    category AS "Type",
    influence AS "Influence",
    tags AS "Focus"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes"
WHERE type = "Faction"
SORT influence DESC
```
```