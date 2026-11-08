---
campaign: The Starving Miracle
current_date: 2026-04-29
party_status: At the Granery
location: Vilgeismar
siege_day: 120 (approx)
Season: Late Autumn
miracle_day: 10
created: 2026-04-29T08:32
updated: 2026-05-03T19:45
draft: true
---

# 🏰 THE VILGEISMAR COMMAND CENTER

> [!abstract] **Current Situation**
> Vilgeismar has been under siege for four months. Seven days ago, the "Miracle" (an iridescent veil) appeared, stopping the enemy but not the famine. You are currently resting at Ruik's Pub, preparing for private meetings with Captain Hale and High Lady Seraphine.

---
## Session Notes


> [!note]- 📓 SESSION HISTORY
>> ```dataview
> TABLE 
>     created AS "Session Date",
>     updated AS "Last Edit"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Session Notes"
> SORT updated DESC
> LIMIT 3
> ```


--- 


## 🕒 ACTIVE INVESTIGATIONS (Quest Log)


> [!question]- 📂 MYSTERY LEDGER (Active Quests)
> ```dataview
> TABLE 
>     priority AS "Priority", 
>     summary AS "Current Objective", 
>     lead AS "Current Lead"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Investigations"
> WHERE type = "Investigation" AND status != "Completed"
> SORT priority DESC
> ```


> [!success]- ✅ COMPLETED INVESTIGATIONS
> ```dataview
> TABLE 
>     summary AS "Final Outcome", 
>     lead AS "Primary Lead"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Investigations"
> WHERE type = "Investigation" AND status = "Completed"
> SORT file.mday DESC
> ```


---


## 👥 THE VILGEISMAR CODEX (NPCs)


> [!info]- 👥 THE VILGEISMAR CODEX (NPCs)
> ```dataview
> TABLE 
>     faction AS "Faction", 
>     location AS "Location",
>     status AS "Status",
>     disposition AS "Disposition",
>     notes AS "Notable Notes",
>     file.tasks.text AS "Follow-up Tasks"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/NPCs"
> WHERE faction != null
> SORT file.name ASC
> ```


--- 


## 📍 GEOGRAPHY OF VILGEISMAR (Locations)


> [!location]- 🗺️ GEOGRAPHY OF VILGEISMAR
> ```dataview
> TABLE 
>     safety_level AS "Safety", 
>     district AS "District", 
>     notes AS "Notable Notes"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Locations"
> WHERE district != null
> SORT file.name ASC
> ```


---


## 🎭📜 The Many Faced Lady (Index)


The patron deity of Vilgeismar is understood through multiple aspects, each representing a different facet of mortal existence and divine will. ### ⚖️ The Twelve Aspects The following list is automatically generated from your vault's lore notes: 

```dataview 
TABLE 
symbol AS "Symbol", 
tags AS "Domains" 
FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Lore" WHERE category = "The Many Faced Lady" SORT file.name ASC
```

---

## 🛡️ The Party (Allies)


> [!multi-column]- 🛡️ THE PARTY (Allies)
> ```dataview
> TABLE 
>     role AS "Role", 
>     status AS "Status",
>     primary_stat AS "Utility", 
>     current_goal AS "Current Goal",
>     file.tasks.text AS "Personal Quests"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/PC Notes"
> WHERE status != null
> SORT file.name ASC
> ```


---

## 🏛️ Political & Social Factions

| Faction                | Description                                              | Current Status                                                                                              |
| :--------------------- | :------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **The Cloister**       | Religious leadership responsible for doctrine.           | Assert that faith sustains the Miracle. Some Sisters have adopted voluntary fasting beyond physical limits. |
| **The Garrison**       | Weakened soldiers who defended the walls.                | Morale is uncertain. Many feel their sacrifice has been rendered irrelevant by divine intervention.         |
| **The Noble Houses**   | Families who traditionally governed civic affairs.       | Attempting to project stability. Resentment grows toward them as hunger worsens and privilege remains.      |
| **The Quiet Doubters** | Citizens, including criminals, who question the Miracle. | Their concerns are rarely voiced publicly for safety.                                                       |

---

## ⚔️ INVENTORY & GEAR

* **Potions:** 3x Healing Honey (Greater), 2x Speed Honey, 2x Mystery Honey.
* **Relics:** [[Mimic Ring]], [[Water Elemental Tea Pot]], [[Gloves]], [[Unspoiled Oats]].

--- 

## 🌑 THE SECRET VAULT

* **[[Secret - The Traitor Among Us]]:** Personal hook regarding a traitor among notable figures. *Private Note, it won't work if you click it. Sorry not sorry*
* **[[Secret - Bee Pact]]:** Evidence of the High Lady using the dead to feed bees.
* **[[Secret - The Omen]]:** Vision of High Lady weeping and being slain.


---

## 📜 THE MIRACLE & LORE

* **The Veil:** Shimmering dome; causes nosebleeds, dizziness, and intense emotion.
* **The Hymns:**
    * 🎵 **[[Hymn of Birth]]:** Sounded by the Grain Monster.
    * 🎵 **Hymn of Death:** Countered and disintegrated the Grain Monster.
* **The Twelve Faces:** [[Mother of Mercy]], [[The Lady of Ash]], [[The Hidden Face]], etc.

---

## ⚠️ POINTS OF STRAIN (Environmental Risks) 

> [!warning] **The Internal Collapse** 
> 
> > * **The Cathedral:** Congregants report unusually vivid dreams during constant hymnals. 
> > * **The Well of First Water:** Water tastes sweet/metallic; suppresses hunger sensations. 
> > * **Butcher's Row:** Orderly ration sites hide whispers of disappearances among the vulnerable. 
> > * **The Empty Granary:** Public suspicion of hoarding has led to three merchant executions this month.

> [!danger] **The Log of Oddities** 
> 
> * 🩸**Sensory Anomalies:** 
> * **The Weeping Wall Effect:** Citizens standing near the interior of the city walls report dizziness, intense emotional shifts, and nosebleeds.
> * **Altered Taste:** The water from the Well of First Water now tastes unusually sweet or metallic.
> * **The Sensation of Hunger:** Residents insist that drinking the well water or participating in communal hymnals temporarily reduces the physical sensation of hunger.
> * **The Smell of the City:** The air carries a "sour tang of boiled leather" and a "metallic and faintly sweet" scent that clings to clothing and breath.

> [!danger] **The Log of Oddities** 
> * 🧠 **Psychological & Spiritual Shifts**
> * **Vivid Dreaming:** Members of the clergy and those attending extended hymnals report experiencing unusually vivid dreams.
> * **Unnatural Endurance:** A minority of citizens and several Sisters of the Cloister have begun fasting for days beyond normal physical limits without collapsing.
> * **The Unfamiliar Hymn:** Congregants have noted that the final verse of the *Hymn of Twelve Faces* feels unfamiliar, despite no written record of the lyrics being changed.
> * **Unusual Calm:** Observers note an eerie, "unusual calm" among the weakest citizens in Beggar's Court—a slow reluctance of the underfed that borders on the instinctual.

> [!danger] **The Log of Oddities** 
> * 🌌 The Veil's Behaviour
> *  **Visual Distortion:** The barrier appears as a shimmering heat distortion in early light, becoming a pale, iridescent dome as the sun rises.
> * **Shifting Colours:** The surface shifts from pearl to dull silver or opaline when observed for too long; it does not flicker or waver.
> * **Localized Density:** The veil appears at its thickest directly above the Gatehouse, the site of the final assault before the Miracle.

---

# Thoughts, Ramblings and Theories


- Magic from Warlock:c 
	- Where does it come from?
	- Another face of the Lady?
	- Actual Demons/Devils?
	- Fey?
- It is an unknown entity - needs to be investigated.
--- 


# Notes to Add?

