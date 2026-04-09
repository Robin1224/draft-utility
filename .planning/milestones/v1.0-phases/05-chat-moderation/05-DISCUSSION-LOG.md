# Phase 5: Chat & Moderation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the Q&A.

**Date:** 2026-04-04
**Phase:** 05-chat-moderation
**Mode:** discuss
**Areas discussed:** Chat UI placement, Message persistence, Slur filter source, Host visibility & mute UX

---

## Areas Discussed

### Chat UI Placement

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Lobby layout | Right sidebar / Bottom drawer / Floating toggle | Right sidebar |
| Draft board layout | Right sidebar (same) / Bottom bar / Collapsed by default | Right sidebar — same placement as lobby |
| Panel structure | Single panel (auto-selected by role) / Channel tabs visible to all | Two tabs: All + role-specific in lobby; role-specific only in draft |

**Scope expansion noted:** User added an "All chat" general channel (visible to all lobby participants) that is not in the original CHAT-01/02 requirements. Confirmed to add to Phase 5 scope.

### Message Persistence

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Storage | In-memory fanout only / DB-persisted (chat_message table) | In-memory fanout only |

### Slur Filter Source

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Word list source | npm package / Bundled static list in repo | Bundled static list in repo |
| Message length cap | 500 chars / 200 chars / 1000 chars | 500 characters |

### Host Visibility & Mute UX

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Host sees spectator chat? | Yes — host sees spectator chat / No — host only sees their own channels | No — host only sees their own channels |
| Mute control location | In the spectator list / In the chat message itself | In the spectator list |

---

## Scope Expansion

**All chat lobby channel** — User explicitly added a general "All" channel (everyone can see and send) available during the lobby phase. This is a new capability beyond CHAT-01/02. Added to Phase 5 scope as D-02.

---

## No Corrections

All decisions confirmed as captured — no revisits requested.
