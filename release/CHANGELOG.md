# Release & Version Changelog

## [v1.1.1] - 2026-11-11
### Fixed & Improved
- **Edge-to-Edge System Bar Layout**: Resolved status bar clock and gesture navigation bar clipping on modern tall Android devices (Pixel 11 Pro XL) by enforcing window edge-to-edge layout, setting dark theme colors (`#0e1117`), and dynamically padding system bar insets.
- **Home Dashboard Data Loading Resilience**:
  - Pre-seeded cached dashboard data on startup so quests and party members render with zero blank frames.
  - Hardened quest parsing in `api/home` to handle emoji priorities (`🔴 High`, `🟡 Med`, `🔵 Low`) and case-insensitive directory names (`Notes/Investigations`).
  - Added robust fallback matching for character notes in the Adventuring Roster.
  - Upgraded CSS `.pt-safe` and `.pb-safe` utilities for mobile web and native views.

## [v1.1.0] - 2026-11-11
### Added
- **Multi-Campaign Creation Wizard**: Anyone in the party can create a new campaign and vault, automatically initializing as the Campaign DM/Scribe with full authoring rights.
- **Three-Tier Note Privacy & Ownership**:
  - `🔒 DM Secret`: Visible only to DM/Scribe (or revealed notes).
  - `👤 Private (Character)`: Private to character owner and DM.
  - `👥 Party Shared`: Visible to all party members.
- **DM "Player View" Simulation**: DM/Scribe can toggle Player View in the header to preview the exact app experience seen by players.
- **Investigation & Quest Board Overhaul**:
  - Dynamic status transitions (`Open`, `Active`, `Resolved`) for all party members and DMs.
  - `+ New Quest` modal directly on the quest board.
  - 2-player archive voting consensus for players, plus 1-click DM archiving.
  - Active vs. Archived quests view tab with 1-click restoration.
- **Universal Codex Record Creation**: `+ New Record` buttons across NPCs, Locations, and Lore views.
- **Audio Scribe Local Persistence**: Chunks stored directly in device IndexedDB (`DndCampaignAudioDB`) with in-browser playback, raw audio downloads, and Gemini AI campaign-glossary-aware transcription.
- **Android System Navigation & Exit Safeguards**:
  - Multi-tier Android hardware back button handler.
  - Safe-area display cutout insets for status bar and gesture navigation bar.
  - Recording exit confirmation dialog to prevent accidental loss of live sessions.
- **Automated GitHub Release CI/CD**: Workflow to build and attach APKs to GitHub releases on version tags.

### Fixed
- Scratchpad note saving and table feed sharing with optimistic rendering and local session fallback.
- Character note visibility toggle in Party Hub.
- Scribe collation instructions clarifying DM-only collation action.

---

## [v1.0.0] - 2026-11-08
- Initial release of D&D Campaign Notes hub.
- Starving Vilgeismar gothic city campaign setting.
- Obsidian two-way sync, PIN authentication, dice roller, and party loot stash.
