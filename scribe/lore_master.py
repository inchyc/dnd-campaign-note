"""
AI Lore-Master & Obsidian Vault Scribe
Automated session note ingestion, entity extraction, and template-based note staging.
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, Any, List
import requests
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

VAULT_DIR = Path(__file__).resolve().parent.parent / "Starving Vilgeismar"
TEMPLATES_DIR = VAULT_DIR / "Templates"
NOTES_DIR = VAULT_DIR / "Notes"
REVIEW_DIR = VAULT_DIR / "_Review"


def get_gemini_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key:
        print("\n[!] Error: No GEMINI_API_KEY or GOOGLE_API_KEY found.")
        print("Please create a .env file in the project root with:")
        print("GEMINI_API_KEY=your_key_here\n")
        sys.exit(1)
    return key


def read_file_safe(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1", errors="replace")


def clean_entity_title(title: str) -> str:
    """Removes common prefixes like 'NPC - ', 'Lore - ', 'Item - ', 'Faction - '."""
    for prefix in ["NPC - ", "Lore - ", "Item - ", "Faction - ", "Secret - "]:
        if title.startswith(prefix):
            return title[len(prefix):]
    return title


def extract_note_summary(content: str) -> str:
    """Extracts first few lines of bio/traits for disambiguation."""
    lines = content.splitlines()
    summary_lines = []
    in_frontmatter = False
    frontmatter_count = 0

    for line in lines:
        stripped = line.strip()
        if stripped == "---":
            frontmatter_count += 1
            in_frontmatter = (frontmatter_count < 2)
            continue
        if in_frontmatter:
            continue
        if not stripped:
            continue
        # Grab quotes, abstracts, and bullet points
        if stripped.startswith(">") or stripped.startswith("*") or stripped.startswith("-"):
            clean = re.sub(r"^[>\*\-\s]+", "", stripped)
            if clean and len(clean) > 5:
                summary_lines.append(clean)
                if len(summary_lines) >= 3:
                    break

    return "; ".join(summary_lines)


def collect_vault_index() -> List[Dict[str, Any]]:
    """Recursively collects existing entities across all subfolders under Notes/ and staged drafts in _Review/."""
    entities = []
    
    if NOTES_DIR.exists():
        for f in NOTES_DIR.rglob("*.md"):
            parts = f.parts
            if "Session Notes" in parts or ".test_folder" in parts or f.name.startswith("."):
                continue

            rel_path = f.relative_to(NOTES_DIR).as_posix()
            raw_name = f.stem
            clean_name = clean_entity_title(raw_name)
            content = read_file_safe(f)
            summary = extract_note_summary(content)

            aliases = [raw_name, clean_name]
            if " AKA " in raw_name:
                aliases.extend([p.strip() for p in raw_name.split(" AKA ")])

            entities.append({
                "path": rel_path,
                "filename": f.name,
                "title": clean_name,
                "aliases": list(set(aliases)),
                "summary": summary
            })

    # Also include newly drafted entities in _Review so batch runs don't duplicate them
    if REVIEW_DIR.exists():
        for f in REVIEW_DIR.rglob("New/**/*.md"):
            raw_name = f.stem
            clean_name = clean_entity_title(raw_name)
            content = read_file_safe(f)
            summary = extract_note_summary(content)
            entities.append({
                "path": f"staged:{f.name}",
                "filename": f.name,
                "title": clean_name,
                "aliases": [raw_name, clean_name],
                "summary": f"[STAGED IN DRAFTS] {summary}"
            })

    return entities


def collect_templates() -> Dict[str, str]:
    """Collects markdown templates."""
    templates = {}
    if TEMPLATES_DIR.exists():
        for f in TEMPLATES_DIR.glob("*.md"):
            templates[f.stem] = read_file_safe(f)
    return templates


def parse_session(session_filename: str):
    """Processes a session note file with Gemini and stages proposed updates."""
    api_key = get_gemini_api_key()
    session_path = NOTES_DIR / "Session Notes" / session_filename
    if not session_path.exists():
        candidates = list((NOTES_DIR / "Session Notes").glob(f"*{session_filename}*.md"))
        if candidates:
            session_path = candidates[0]
        else:
            print(f"[!] Session note '{session_filename}' not found in {NOTES_DIR / 'Session Notes'}")
            return

    print(f"[*] Reading session: {session_path.name}")
    session_text = read_file_safe(session_path)
    vault_index = collect_vault_index()
    templates = collect_templates()
    changes_todo = read_file_safe(VAULT_DIR / "Changes to be Made.md")

    system_instruction = (
        "You are the master lore scribe for a dark fantasy D&D campaign named 'The Starving Miracle' set in the city of Vilgeismar. "
        "Your task is to analyze raw, rapid-fire session notes taken by the player Chris, cross-reference them against existing "
        "known entities, and extract structured notes strictly adhering to the campaign's Obsidian vault templates.\n\n"
        "CRITICAL RULES FOR ENTITY RESOLUTION & ACCURACY:\n"
        "1. DO NOT duplicate existing entities! Always check the 'KNOWN VAULT ENTITIES' list thoroughly (including subfolders, aliases, and clean titles).\n"
        "   - Example: 'The Many Faced Lady' already exists at 'Lore/Church/Lore - The Many Faced Lady.md'. Do NOT create a new note for her; create an update in 'updated_entities' pointing to that exact path!\n"
        "   - Example: 'Demire AKA The Traveller' is known to turn into a black cat and change size ('Cat Demi-God', 'Big Cat'). Therefore, any mentions of the 'Black Cat' or 'Big Cat' are Demire, NOT a new NPC!\n"
        "2. RESPECT THE QUICKREF MAPPINGS:\n"
        "   - Cat Demi-God / Big Cat / Black Cat = Demire\n"
        "   - Monkey Captain = Glutenboss\n"
        "   - Treasure Finder = Nub Nub / The Collector / Hounds\n"
        "   - Boat = The Eternal Wake (Demire's Boat)\n"
        "   - Player Characters: Travis = Cedric, Johno = Colm, Jess = Vola, Damon = Everan, Vik = Aewren, Jake = Ruik, Chris = Vex/Vesper.\n"
        "3. PRODUCING NEW ENTITIES:\n"
        "   - Only create a new entity when it is genuinely a new NPC, item, or lore concept not already represented in the vault.\n"
        "   - Match the exact YAML frontmatter and section format from the corresponding template.\n"
        "4. PRODUCING UPDATES:\n"
        "   - When an existing NPC dies or undergoes major status changes (e.g. Old Marta Kell being killed in Beggar's Court), specify their status update (e.g. 'Deceased').\n"
        "   - Provide exact, contextual text to append to the appropriate section of the existing note.\n"
        "5. Return ONLY valid, well-formed JSON matching the specified schema."
    )

    prompt = f"""
### KNOWN VAULT ENTITIES (Check every one to prevent duplicates!):
{json.dumps(vault_index, indent=2)}

### VAULT TEMPLATES:
- NPC Template:
{templates.get('NPC Template', '')}

- Item & Loot Template:
{templates.get('Item & Loot Template', '')}

- Lore Template:
{templates.get('Lore Template', '')}

- Investigation Template:
{templates.get('Investigation Template', '')}

- Location Template:
{templates.get('Location Template', '')}

### CURRENT 'CHANGES TO BE MADE' CHECKLIST:
{changes_todo}

### RAW SESSION NOTES TO PROCESS ({session_path.name}):
{session_text}

### INSTRUCTIONS:
Analyze the session notes and output a single JSON object with:
{{
  "session_summary": "1-3 paragraph summary of narrative events, key revelations, and developments",
  "new_entities": [
    {{
      "filename": "Exact file name, e.g. Lucas.md or Item - Cloudy Glass Eye.md",
      "folder": "Target subfolder relative to Notes, e.g. 'NPCs', 'Lore', 'Locations', 'Inventory & Gear', 'Investigations'",
      "entity_type": "NPC | Item | Lore | Location | Investigation",
      "markdown_content": "Full markdown note strictly following the corresponding template including YAML frontmatter, headers, wikilinks, and callouts."
    }}
  ],
  "updated_entities": [
    {{
      "target_path": "Exact relative path from Notes/, e.g. 'Lore/Church/Lore - The Many Faced Lady.md' or 'NPCs/NPC - Demire AKA The Traveller.md' or 'NPCs/Old Marta Kell.md'",
      "filename": "Target file name, e.g. 'Lore - The Many Faced Lady.md'",
      "rationale": "Why this entity needs updating based on the session",
      "status_update": "e.g. 'Deceased' or null if unchanged",
      "section_to_update": "e.g. 'Key Traits & Observations' or 'Relationship & Interactions'",
      "markdown_append": "Precise markdown text/bullets to add into the existing note"
    }}
  ],
  "checklist_actions": {{
    "checked_off": ["List of strings from Changes to be Made.md that this session resolves"],
    "new_tasks": ["New tasks/leads discovered in this session to add to the checklist"]
  }}
}}
"""

    models_to_try = ["gemini-2.5-flash", "gemini-3.8-flash"]
    response = None

    for model_name in models_to_try:
        print(f"[*] Calling Google Gemini API ({model_name}) for {session_path.name}...")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }

        try:
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=150)
            if res.status_code == 200:
                response = res
                break
            elif res.status_code in [503, 429]:
                print(f"[-] {model_name} busy ({res.status_code}). Trying next model...")
                continue
            else:
                print(f"[!] API error ({res.status_code}): {res.text}")
                continue
        except Exception as e:
            print(f"[!] Request exception for {model_name}: {e}")
            continue

    if not response or response.status_code != 200:
        print("[!] All model attempts failed or were unavailable.")
        return

    res_json = response.json()
    try:
        raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(raw_text, strict=False)
    except Exception as e:
        print(f"[!] Failed to parse JSON response: {e}")
        try:
            # Fallback cleanup for control characters
            cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', lambda m: ' ' if m.group(0) in '\n\r\t' else '', raw_text)
            data = json.loads(cleaned, strict=False)
        except Exception as e2:
            print(f"[!] Secondary JSON parse also failed: {e2}")
            return

    # Stage the output into _Review/
    session_id = session_path.stem.replace(" ", "_")
    target_review_dir = REVIEW_DIR / session_id
    new_dir = target_review_dir / "New"
    updates_dir = target_review_dir / "Updates"
    
    # Clean previous staging for this session to avoid leftover incorrect files
    if target_review_dir.exists():
        import shutil
        shutil.rmtree(target_review_dir)
        
    new_dir.mkdir(parents=True, exist_ok=True)
    updates_dir.mkdir(parents=True, exist_ok=True)

    # 1. Write new entity files
    for item in data.get("new_entities", []):
        subfolder = new_dir / item.get("folder", "")
        subfolder.mkdir(parents=True, exist_ok=True)
        file_path = subfolder / item["filename"]
        file_path.write_text(item["markdown_content"], encoding="utf-8")
        print(f"  [+] Drafted new entity: {item.get('folder')}/{item['filename']}")

    # 2. Write update proposals
    for upd in data.get("updated_entities", []):
        safe_name = upd['filename'].replace(".md", "")
        upd_file = updates_dir / f"Update_{safe_name}.md"
        content = (
            f"---\n"
            f"target_file: {upd.get('target_path') or upd.get('filename')}\n"
            f"status_update: {upd.get('status_update')}\n"
            f"section: {upd.get('section_to_update')}\n"
            f"---\n\n"
            f"# Proposed Update for [[{safe_name}]]\n\n"
            f"> [!info] Rationale\n"
            f"> {upd.get('rationale')}\n\n"
            f"### Content to Append / Update:\n"
            f"{upd.get('markdown_append')}\n"
        )
        upd_file.write_text(content, encoding="utf-8")
        print(f"  [~] Drafted update for: {upd['filename']}")

    # 3. Write Master Review Index Note
    summary_path = target_review_dir / "00_SESSION_REVIEW.md"
    summary_md = f"""---
session: {session_path.name}
status: pending_review
---

# ⚔️ Session Review: {session_path.stem}

## 📖 Executive Summary
{data.get('session_summary', 'No summary generated.')}

---

## 🆕 New Entities Staged for Vault
Review each file below in `_Review/{session_id}/New/`:
"""
    if data.get("new_entities"):
        for item in data.get("new_entities", []):
            rel = f"New/{item.get('folder')}/{item['filename']}"
            summary_md += f"- [ ] **{item.get('entity_type', 'Entity')}:** [[{item['filename']}|{Path(item['filename']).stem}]] (`{rel}`)\n"
    else:
        summary_md += "_No new entities created. All mentions matched existing vault records._\n"

    summary_md += "\n---\n\n## 🔄 Proposed Updates to Existing Notes\n"
    for upd in data.get("updated_entities", []):
        target_name = Path(upd['filename']).stem
        summary_md += f"- [ ] **Update [[{target_name}]]:** {upd.get('rationale')}\n"
        if upd.get("status_update"):
            summary_md += f"  - *Status Change:* `{upd.get('status_update')}`\n"

    summary_md += "\n---\n\n## ✅ Checklist Updates for 'Changes to be Made.md'\n"
    summary_md += "### Resolved / Checked Off:\n"
    for item in data.get("checklist_actions", {}).get("checked_off", []):
        summary_md += f"- [x] {item}\n"

    summary_md += "\n### New Tasks / Leads:\n"
    for item in data.get("checklist_actions", {}).get("new_tasks", []):
        summary_md += f"- [ ] {item}\n"

    summary_path.write_text(summary_md, encoding="utf-8")
    print(f"\n[OK] Staged session review at: {summary_path.relative_to(VAULT_DIR.parent)}")
    print(f"[OK] You can now inspect these notes directly in Obsidian under `_Review/{session_id}/`!\n")


def apply_review(session_id: str):
    """Applies approved staged notes from _Review to the live vault."""
    target_review_dir = REVIEW_DIR / session_id
    if not target_review_dir.exists():
        print(f"[!] Review folder {target_review_dir} does not exist.")
        return

    # 1. Apply New entities
    new_dir = target_review_dir / "New"
    if new_dir.exists():
        for root, _, files in os.walk(new_dir):
            for file in files:
                src = Path(root) / file
                rel = src.relative_to(new_dir)
                dest = NOTES_DIR / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(read_file_safe(src), encoding="utf-8")
                print(f"[+] Added to vault: {dest.relative_to(VAULT_DIR)}")

    # 2. Apply Updates to existing notes
    updates_dir = target_review_dir / "Updates"
    if updates_dir.exists():
        for upd_file in updates_dir.glob("*.md"):
            content = read_file_safe(upd_file)
            target_match = re.search(r"target_file:\s*([^\n]+)", content)
            status_match = re.search(r"status_update:\s*([^\n]+)", content)
            append_match = re.search(r"### Content to Append / Update:\n([\s\S]+)$", content)

            if not target_match:
                continue

            target_rel = target_match.group(1).strip()
            target_file = NOTES_DIR / target_rel
            if not target_file.exists():
                # Try finding by filename
                found = list(NOTES_DIR.rglob(Path(target_rel).name))
                if found:
                    target_file = found[0]
                else:
                    print(f"[-] Target file {target_rel} not found in vault, skipping update.")
                    continue

            file_text = read_file_safe(target_file)

            # Update status in frontmatter if specified and not 'None'
            if status_match:
                new_status = status_match.group(1).strip()
                if new_status and new_status.lower() != "none":
                    file_text = re.sub(r"(status:\s*)[^\n]+", rf"\g<1>{new_status}", file_text, count=1)
                    print(f"[~] Updated status to '{new_status}' in {target_file.name}")

            # Append new text
            if append_match:
                append_text = append_match.group(1).strip()
                if append_text and append_text not in file_text:
                    file_text = file_text.rstrip() + f"\n\n#### Notes from {session_id.replace('Session_Notes_', 'Session ')}\n{append_text}\n"
                    print(f"[~] Appended session notes to {target_file.name}")

            target_file.write_text(file_text, encoding="utf-8")

    # 3. Check off resolved tasks in Changes to be Made.md
    summary_file = target_review_dir / "00_SESSION_REVIEW.md"
    changes_file = VAULT_DIR / "Changes to be Made.md"
    if summary_file.exists() and changes_file.exists():
        summary_text = read_file_safe(summary_file)
        changes_text = read_file_safe(changes_file)
        resolved_match = re.search(r"### Resolved / Checked Off:\n([\s\S]+?)(?=\n###|\n##|$)", summary_text)
        if resolved_match:
            resolved_items = [
                line.strip()[4:].strip()
                for line in resolved_match.group(1).splitlines()
                if line.strip().startswith("- [x]")
            ]
            for item in resolved_items:
                # Replace unchecked version in Changes to be Made
                pattern = re.compile(rf"- \[ \]\s+{re.escape(item)}", re.IGNORECASE)
                if pattern.search(changes_text):
                    changes_text = pattern.sub(f"- [x] {item}", changes_text)
                    print(f"[x] Checked off in Changes to be Made.md: {item}")
            changes_file.write_text(changes_text, encoding="utf-8")

    # 4. Mark review note as applied
    if summary_file.exists():
        summary_text = read_file_safe(summary_file)
        summary_text = summary_text.replace("status: pending_review", "status: applied")
        summary_file.write_text(summary_text, encoding="utf-8")

    print(f"\n[OK] Successfully applied review for {session_id} to the live vault!")


def batch_parse(start_date: str = "2026-07-08"):
    """Sequentially parses all sessions starting from start_date."""
    session_files = sorted((NOTES_DIR / "Session Notes").glob("Session Notes 2026-*.md"))
    to_process = []
    for s in session_files:
        # Extract date from name e.g. Session Notes 2026-07-08.md
        match = re.search(r"\d{4}-\d{2}-\d{2}", s.name)
        if match:
            s_date = match.group(0)
            if s_date >= start_date:
                to_process.append(s)

    print(f"\n==================================================")
    print(f"[*] Starting Batch Lore-Master on {len(to_process)} sessions:")
    for s in to_process:
        print(f"    - {s.name}")
    print(f"==================================================\n")

    for idx, s in enumerate(to_process, 1):
        print(f"\n>>> [{idx}/{len(to_process)}] Processing {s.name}...")
        parse_session(s.name)

    print(f"\n==================================================")
    print(f"[OK] Batch parsing complete! All drafts staged under _Review/ for your review.")
    print(f"==================================================\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="AI Lore-Master Obsidian Scribe")
    subparsers = parser.add_subparsers(dest="command")

    parse_cmd = subparsers.add_parser("parse", help="Parse a session note with Gemini")
    parse_cmd.add_argument("session", help="Session note filename (e.g. 'Session Notes 2026-06-03.md' or '2026-06-03')")

    apply_cmd = subparsers.add_parser("apply", help="Apply staged notes to vault")
    apply_cmd.add_argument("session_id", help="Session review folder name (e.g. 'Session_Notes_2026-06-03')")

    batch_cmd = subparsers.add_parser("batch", help="Batch parse all pending backlog sessions")
    batch_cmd.add_argument("--start", default="2026-07-08", help="Start date (YYYY-MM-DD), default: 2026-07-08")

    args = parser.parse_args()
    if args.command == "parse":
        parse_session(args.session)
    elif args.command == "apply":
        apply_review(args.session_id)
    elif args.command == "batch":
        batch_parse(args.start)
    else:
        parser.print_help()
