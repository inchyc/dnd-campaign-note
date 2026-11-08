---
campaign: The Starving Miracle
current_date: 2026-04-29
party_status: At the Granary
siege_day: 120 (approx)
miracle_day: 10
banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23"
created: 2026-05-03T19:08
updated: 2026-10-07T18:23
cssclasses: cards
banner_y: 0.5
obsidianUIMode: preview
---

# 🏰 THE VILGEISMAR COMMAND CENTER

> [!multi-column] Quick Look
>
>> [!abstract] 📍 **Current Intel**
>> **Location:** [[The Granary Vault]] / [[TTRPG/D&D/Starving Vilgeismar/Notes/Locations/The Well of First Water|The Well of First Water]] 
>> **Next Move:** Reunite with party at [[Ruik's Pub]] to discuss developments and next course of action. Need to Eat and Rest
>
>> [!danger] 🩸 **Vital Signs**
>> **Famine Level:** Extreme
>> **Veil Status:** Iridescent / Stable

---

>> [!multi-column] 📍 **QUICK NAV**
>> `BUTTON[open-session-btn]`
>> 
>> `BUTTON[open-npc-btn]`
>> 
>> `BUTTON[open-factions-btn]`
>> 
>> `BUTTON[open-investigations-btn]`
>> 
>> `BUTTON[open-locations-btn]`
>> 
>> `BUTTON[open-theology-btn]`
>> 
>> `BUTTON[open-lore-btn]`
>> 
>> `BUTTON[open-party-btn]`
>> 
>> `BUTTON[open-gear-btn]`
>> 
>> `BUTTON[open-todo-btn]`


## 🕒 CURRENT OBJECTIVES

> [!todo]- 📂 ACTIVE INVESTIGATIONS
> ```dataview
> TABLE priority AS "Priority", summary AS "Objective"
> FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Investigations"
> WHERE type = "Investigation" AND status != "Completed"
> SORT priority DESC
> ```


--- 

# ✅ Archive of Solved Mysteries

> [!success] **Resolved Intelligence**
> A record of completed investigations and their final outcomes. Use these to track established facts and closed leads.

## 📁 Resolution Gallery
```dataview
TABLE WITHOUT ID
    file.link AS "Investigation",
    summary AS "Outcome",
    lead AS "Primary Lead"
FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Investigations"
WHERE type = "Investigation" AND status = "Completed"
SORT file.mday DESC
```


---

## 🧩 THE MIRACLE TRACKER (Oddities & Lore)


> [!info] **The Twelve Faces & Hymns**
> * **The Veil:** Causes nosebleeds, dizziness, and intense emotion.
> * **The Hymns:** [[Lore - Hymn of Birth]] (Manifestation) vs [[Lore - Hymn of Death]] (Disintegration).
> * **The Faces:** [[Mother of Mercy]], [[The Lady of Ash]], [[The Hidden Face]].


> [!warning]- 🌑 THE SECRET VAULT (Restricted Data)
> * 🕵️ [[Secret - The Traitor Among Us]]
> * 🐝 [[Secret - Bee Pact]] (The Dead & The Honey)
> * 👁️ [[Secret - The Omen]] (The Weeping Lady Vision)


![[Theory Vault#🕵️ Unanswered Questions (The "To-Investigate" List)]]
---

## ⚠️ ENVIRONMENTAL STRAIN (Log of Oddities)

| Type              | Observations                                                                     |
| :---------------- | :------------------------------------------------------------------------------- |
| **Sensory**       | Sweet/metallic water, Thickening air, Smell of boiled leather. |
| **Psychological** | Vivid dreams, Unnatural calm in Beggar's Court, Fasting Sisters.                 |
| **Visual**        | Veil shifts from pearl to opaline, Thickest at the Gatehouse.                    |

See: [[Lore - Log of Oddities]] for more details
---

## 📝 RECENT SESSIONS

```dataview
LIST FROM "TTRPG/D&D/Starving Vilgeismar/Notes/Session Notes"
SORT updated DESC
LIMIT 5
```

# Chris's To do List

- [ ] Draw a town/city that Vex/Vesper has been to
- [ ] Come up with 3 lies about Demons that Vex convinced Cedric (Travis) of.
- [ ] Investigate Mask from Nob Nob
- [ ] Investigate Garron's Eye
- [ ] Investigate Garron's Cleavers
- [ ] Cleanse Colm from Possession or kill him

```meta-bind-embed
[[Button Library]]
```