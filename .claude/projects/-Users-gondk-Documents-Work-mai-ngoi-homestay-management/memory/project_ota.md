---
name: ota-integration-plan
description: Client uses Agoda + Traveloka. V1 is manual sync, V2 via Channel Manager (STAAH or eZee)
type: project
---

Client uses both Agoda and Traveloka as OTA channels. Direct API access is not available for small properties.

**Why:** OTAs only certify PMS/Channel Manager vendors, not individual apps. Agoda and Traveloka don't support iCal either.

**How to apply:** V1 = manual sync (owner updates app + OTA extranets separately). V2 = integrate with a Channel Manager (STAAH or eZee — cheapest in Vietnam) via their API. Don't build anything that blocks future CM integration (e.g., keep booking source tracking, don't hardcode room availability logic that can't accept external updates).
