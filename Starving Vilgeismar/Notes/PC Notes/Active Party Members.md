---
type: Index
category: Party
tags:
  - party
  - companions
  - codex
cssclasses: cards
created: 2026-05-05T22:54
updated: 2026-05-05T23:31
motivations:
suspicions:
---

# 🫂 Party Codex: The Survivors

> [!abstract] **Current Roster**
> A live tracking of the individuals venturing through the siege of Vilgeismar. This index automatically pulls data from character files located in your notes folder.

---

## 🗃️ Active Party Members

```dataview
TABLE WITHOUT ID
    file.link AS "Character",
    role AS "Role",
    race AS "Race",
    status AS "Status",
    owner AS "Player"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes"
WHERE role != null
SORT file.name ASC
```

🛡️ Combat & Status Overview
```dataview
TABLE primary_stat AS "Main Stat", status AS "Condition"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes"
WHERE role != null
```


## **Disposition**

```dataview 
TABLE disposition AS "Attitude"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes"
WHERE role != null
```


🕵️ Narrative Hooks & Secrets
```dataview
TABLE 
    motivations AS "Motivations", 
    suspicions AS "Known Suspicions"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes"
WHERE role != null
```


📝 Recent Interactions


```dataview
LIST FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Session Notes"
SORT created DESC
LIMIT 3
```


