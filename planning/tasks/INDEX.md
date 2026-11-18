# Task index

<!-- FORMAT: ID | Priority | Title | Status | Subprojects | Domain | Depends | Stories -->

Execution order follows the dependencies. TASK-002 (security rules) is deferred to P1
by the owner and does not block product work.

```text
TASK-001 | P0 | Monorepo scaffold | ✅ | shared,api,ui | platform | — | —
TASK-002 | P1 | Agent security and steering rules | ⬚ | planning,api,ui,shared | security | TASK-001 | SEC-01
TASK-003 | P0 | Shared contract | ✅ | shared | contract | TASK-001 | ARC-01,FLG-01
TASK-004 | P0 | Flag service core and in-memory repository | ✅ | api | api | TASK-003 | FLG-01,FLG-03,ARC-02
TASK-005 | P1 | Audit log | ✅ | api | api | TASK-004 | FLG-02
TASK-006 | P0 | Fastify HTTP adapter | ✅ | api | api | TASK-004,TASK-005 | FLG-01,FLG-03,ARC-02,OBS-01
TASK-007 | P0 | UI flag registry and resolver | ✅ | ui | ui | TASK-003 | FLG-03,RES-01,RES-02
TASK-008 | P0 | UI flag provider with timeout and fallback | ✅ | ui | ui | TASK-007 | RES-01
TASK-009 | P0 | Flag management screen | ⬚ | ui | ui | TASK-006,TASK-008 | FLG-01,RES-02
TASK-010 | P1 | Fallback demonstration and evidence | ⬚ | api,ui | delivery | TASK-009 | RES-01,RES-02
TASK-011 | P1 | README and decision notes | ⬚ | planning | delivery | TASK-010 | —
TASK-012 | P1 | Curate and redact AI session logs | ⬚ | planning | delivery | TASK-010 | —
```
