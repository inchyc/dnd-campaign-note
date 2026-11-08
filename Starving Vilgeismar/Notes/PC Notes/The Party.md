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

<!-- QueryToSerialize: TABLE WITHOUT ID file.link AS "Character", role AS "Role", race AS "Race", status AS "Status", owner AS "Player" FROM "TTRPG/D&D/Starving Vilgeismar/Notes" WHERE role != null AND !contains(list( "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vex-Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Character Ideas.md" ), file.path) SORT file.name ASC -->
<!-- SerializedQuery: TABLE WITHOUT ID file.link AS "Character", role AS "Role", race AS "Race", status AS "Status", owner AS "Player" FROM "TTRPG/D&D/Starving Vilgeismar/Notes" WHERE role != null AND !contains(list( "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vex-Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Character Ideas.md" ), file.path) SORT file.name ASC -->

| Character                                                          | Role                     | Race                        | Status            | Player   |
| ------------------------------------------------------------------ | ------------------------ | --------------------------- | ----------------- | -------- |
| [[Aewren]] | Cleric                   | Human                       | Alive             | Victoria |
| [[Colm]]     | Swashbuckler Rouge       | Bugbear                     | Alive / With Ruik | Johno    |
| [[Erevan]] | Warlock                  | Half-Elf                    | Alive             | Damon    |
| [[Ruik]]     | Echo Knight              | Human                       | Alive / With Colm | Jake     |
| [[Vex]]       | Paladin / Silent Witness | Changeling (Hidden) / Human | Alive             | Chris    |
| [[Vola]]     | Barbarian                | Half-Orc                    | Alive             | Jess     |

<!-- SerializedQuery END -->

🛡️ Combat & Status Overview
<!-- QueryToSerialize: TABLE primary_stat AS "Main Stat", status AS "Condition" FROM "TTRPG/D&D/Starving Vilgeismar/Notes" WHERE role != null AND !contains(list( "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vex-Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Character Ideas.md" ), file.path) -->
<!-- SerializedQuery: TABLE primary_stat AS "Main Stat", status AS "Condition" FROM "TTRPG/D&D/Starving Vilgeismar/Notes" WHERE role != null AND !contains(list( "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vex-Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Character Ideas.md" ), file.path) -->

| File                                                               | Main Stat                       | Condition         |
| ------------------------------------------------------------------ | ------------------------------- | ----------------- |
| [[Aewren]] | Avoiding healing / Death rights | Alive             |
| [[Colm]]     | Damage from a Distance          | Alive / With Ruik |
| [[Vex]]       | DPS / Face                      | Alive             |
| [[Vola]]     | Damage output / strength        | Alive             |
| [[Ruik]]     | Locking down enemies            | Alive / With Colm |
| [[Erevan]] | Attacking from range / Charisma | Alive             |

<!-- SerializedQuery END -->


🕵️ Narrative Hooks & Secrets
<!-- QueryToSerialize: TABLE motivations AS "Motivations", suspicions AS "Known Suspicions" FROM "TTRPG/D&D/Starving Vilgeismar/Notes" WHERE role != null AND !contains(list( "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vex-Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Character Ideas.md" ), file.path) -->
<!-- SerializedQuery: TABLE motivations AS "Motivations", suspicions AS "Known Suspicions" FROM "TTRPG/D&D/Starving Vilgeismar/Notes" WHERE role != null AND !contains(list( "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Vex-Vesper.md", "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes/Character Ideas.md" ), file.path) -->

| File                                                               | Motivations | Known Suspicions |
| ------------------------------------------------------------------ | ----------- | ---------------- |
| [[Aewren]] | \-          | \-               |
| [[Colm]]     | \-          | \-               |
| [[Vex]]       | \-          | \-               |
| [[Vola]]     | \-          | \-               |
| [[Ruik]]     | \-          | \-               |
| [[Erevan]] | \-          | \-               |

<!-- SerializedQuery END -->


📝 Recent Interactions


<!-- QueryToSerialize: LIST FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Session Notes" SORT created DESC LIMIT 3 -->
<!-- SerializedQuery: LIST FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Session Notes" SORT created DESC LIMIT 3 -->
- [[Session Notes Codex - Player]]
- [[Session Notes]]
- [[Session Notes 2026-04-29]]

<!-- SerializedQuery END -->


