---
type: Index
category: NPCs
tags: [codex, people, vilgeismar]
cssclasses: cards
created: 2026-05-03T19:15
updated: 2026-05-03T19:57
---

# 👥 The Vilgeismar Codex

> [!abstract] **Directory**
> This index tracks the key figures of the siege, their loyalties, and their current status within the city.

## 🎭 Major Factions & Leaders
```dataview
TABLE 
    faction AS "Faction", 
    location AS "Location",
    status AS "Status",
    disposition AS "Disposition"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes/NPCs"
WHERE faction != null
SORT file.name ASC
```
