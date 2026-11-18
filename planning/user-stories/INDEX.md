# User-story index

<!-- FORMAT: ID | Priority | Scope | Title | File:section | Owners -->

This is the compact, machine-readable lookup for product intent. Detailed
stories and acceptance criteria live in the referenced domain files.

```text
FLG-01 | P0 | MVP | Operators manage flags | flags.md:FLG-01 | api,ui,shared
FLG-02 | P1 | MVP | Operators can see who changed a flag | flags.md:FLG-02 | api,shared
FLG-03 | P0 | MVP | Applications evaluate flags with safe defaults | flags.md:FLG-03 | api,ui,shared
FLG-04 | P3 | Post-MVP | Operators can retire flags | flags.md:FLG-04 | api,ui
RES-01 | P0 | MVP | The app keeps working when the flag API is unavailable | resilience.md:RES-01 | ui
RES-02 | P1 | MVP | Developers can see where a flag value came from | resilience.md:RES-02 | ui
RES-03 | P2 | Post-MVP | Last-known values survive an outage | resilience.md:RES-03 | ui
ARC-01 | P0 | MVP | API and UI share one validated contract | platform.md:ARC-01 | shared,api,ui
ARC-02 | P1 | MVP | Storage and HTTP layers are replaceable | platform.md:ARC-02 | api
ARC-03 | P3 | Post-MVP | A second HTTP adapter proves portability | platform.md:ARC-03 | api
OBS-01 | P1 | MVP | Operators can trace a request | platform.md:OBS-01 | api
SEC-01 | P0 | MVP | Agents cannot read or write real env files | security.md:SEC-01 | planning,api,ui,shared
```
