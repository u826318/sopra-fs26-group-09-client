# Contributions

Every member has to complete at least 2 meaningful tasks per week, where a
single development task should have a granularity of 0.5-1 day. The completed
tasks have to be shown in the weekly TA meetings. You have one "Joker" to miss
one weekly TA meeting and another "Joker" to once skip continuous progress over
the remaining weeks of the course. Please note that you cannot make up for
"missed" continuous progress, but you can "work ahead" by completing twice the
amount of work in one week to skip progress on a subsequent week without using
your "Joker". Please communicate your planning **ahead of time**.

Note: If a team member fails to show continuous progress after using their
Joker, they will individually fail the overall course (unless there is a valid
reason).

**You MUST**:

- Have two meaningful contributions per week.

**You CAN**:

- Have more than one commit per contribution.
- Have more than two contributions per week.
- Link issues to contributions descriptions for better traceability.

**You CANNOT**:

- Link the same commit more than once.
- Use a commit authored by another GitHub user.

---

## Contributions Week 1 - [23.03.2026] to [30.03.2026]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **Tingting Xu [tingting-xu824]** | 24.03.2026 | [client commit d6a46f9](https://github.com/u826318/sopra-fs26-group-09-client/commit/d6a46f9) | Implemented login/register frontend pages based on the approved prototype, including shared auth styling, route integration, validation UX, and refined error handling/messages. | Delivers core S1 onboarding UX and enables users to register/login through the designed interface, which is required for all authenticated user stories. |
|  **Tingting Xu [tingting-xu824]** | 24.03.2026 | [server commit 8d2be51](https://github.com/u826318/sopra-fs26-group-09-server/commit/8d2be51) | Implemented backend auth foundations: extended User model/repository, added `POST /users/register`, `POST /users/login`, `POST /users/logout`, and added password hashing with BCrypt plus related tests. | Provides secure authentication and session lifecycle support required by S1 acceptance criteria and enables the frontend auth flow to work end-to-end. |
|  **Tingyuan Wang [u826318]**     | 29.03.2026 | [server commit 908f561](https://github.com/u826318/sopra-fs26-group-09-server/commit/908f561), [server commit 0ac67cf](https://github.com/u826318/sopra-fs26-group-09-server/commit/0ac67cf) | Implemented WebSocket infrastructure: added WebSocketConfig with STOMP endpoint /ws, AuthHandshakeInterceptor to validate token on handshake, and corresponding tests. | Enables real-time pantry sync by establishing the WebSocket connection layer required by #62. |
|   **Tingyuan Wang [u826318]**     | 29.03.2026 | [server commit 79db1c5](https://github.com/u826318/sopra-fs26-group-09-server/commit/79db1c5), [server commit 88c1217](https://github.com/u826318/sopra-fs26-group-09-server/commit/88c1217) | Implemented PantryBroadcastService to push pantry update events to household-scoped STOMP topics, with PantryUpdateMessage payload model and tests. | Provides the broadcast infrastructure required by #63, enabling pantry changes to be pushed to all connected household members in real-time. |
|  **Maxim Emelianov [maxim451]**     | [29.03.2026]   | [server commit 28ca2e0](https://github.com/u826318/sopra-fs26-group-09-server/commit/28ca2e0)  | Implemented backend persistence for barcode-based product addition: created PantryItem entity and repository to store product metadata (barcode, name, calories, timestamp) returned from OpenFoodFacts API. | Supports the barcode lookup user story (#4) by enabling confirmed products to be persisted and later displayed in the pantry view, #4 can not be implemented without this part | 
|**Maxim Emelianov [maxim451]** | [29.03.2026]   | [server commit 6421b54](https://github.com/u826318/sopra-fs26-group-09-server/commit/6421b54)  | Implemented backend consumption tracking: introduced ConsumptionLog entity and repository to persist consumption events with quantity, calories, and timestamp. | Supports the consume item user story (#7) by enabling accurate tracking of consumed portions and ensuring correct calorie accounting. Again without resloving this issue that user story can not be done |
|**Maxim Emelianov [maxim451]** | [29.03.2026]   | [server commit ee0c423](https://github.com/u826318/sopra-fs26-group-09-server/commit/ee0c423) | Implemented core calorie aggregation logic in PantryService to compute total pantry calories (sum of kcalPerPackage × count) together with simple unit test | Supports the pantry overview user story (#8) by enabling calculation of total calorie inventory displayed to users. |
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |

---

## Contributions Week 2 - [30.03.2026] to [06.04.2026]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **Tingting Xu [tingting-xu824]** | 04.04.2026 | [server commit 9349243](https://github.com/u826318/sopra-fs26-group-09-server/commit/934924333319a313c7df30ff48a50ed6714828d0) | #29 + #30 Implemented household invitation flow: owner invite-code generation endpoint (`POST /households/{householdId}/invite-code`) and join-by-code endpoint (`POST /households/join`) with validation and conflict handling. | Enables collaborative virtual pantry membership management, allowing owners to invite and users to securely join shared households. |
| **Tingting Xu [tingting-xu824]** | 04.04.2026 | [server commit 98928d0](https://github.com/u826318/sopra-fs26-group-09-server/commit/98928d08b46fb22dbfb1b4d8f699317221a06d3c) | #29 Implemented backend invite-code expiration checks with a 7-day TTL and validation in the household join workflow. | Improves invitation security and consistency by preventing stale invite codes from being reused and enforcing predictable invite lifecycle behavior. |
| **Tingting Xu [tingting-xu824]** | 04.04.2026 | [client commit 5f249ee](https://github.com/u826318/sopra-fs26-group-09-client/commit/5f249ee080892f5be0e98f8bdd400a47c3fbb4a9) | #24 Built the Household Management frontend page and workflow, including create household, invite-code generation/join interactions, UI polishing, and page-level test coverage for the new households page. | Delivers the core household collaboration entry point on the client side and improves confidence in new code through dedicated UI behavior tests. |
| **Tingyuan Wang [u826318]** | 30.03.2026 | [server commit 74444ae](https://github.com/u826318/sopra-fs26-group-09-server/commit/74444ae), [server commit a43cd8d](https://github.com/u826318/sopra-fs26-group-09-server/commit/a43cd8d), [server commit a9ed7f5](https://github.com/u826318/sopra-fs26-group-09-server/commit/a9ed7f5) | #27 Added Household, HouseholdMember, HouseholdMemberId JPA entities and HouseholdRepository, HouseholdMemberRepository with integration tests. | Provides the core data model and persistence layer required for household management, enabling subsequent implementation of household creation and membership endpoints. |
|                             | 31.03.2026 | [server commit 4642684](https://github.com/u826318/sopra-fs26-group-09-server/commit/4642684), [server commit 072d855](https://github.com/u826318/sopra-fs26-group-09-server/commit/072d855), [server commit 0cbb6e7](https://github.com/u826318/sopra-fs26-group-09-server/commit/0cbb6e7) | #24 Implemented token-based authentication filter that validates the Authorization header against the DB and sets authenticatedUserId as a request attribute, with tests. | Secures all protected endpoints by centralizing auth logic in a reusable filter, required by all user stories that need authenticated access. |
|                             | 31.03.2026 | [server commit 14a26af](https://github.com/u826318/sopra-fs26-group-09-server/commit/14a26af), [server commit fe25b37](https://github.com/u826318/sopra-fs26-group-09-server/commit/fe25b37) | #28 Implemented POST /households endpoint with HouseholdService, DTO mapping, auto-adding the creator as the first member, and unit tests. | Delivers the household creation flow, allowing authenticated users to create a shared household and automatically become its owner and first member. |
|**Maxim Emelianov [maxim451]**  | 05.04.2026 | [server commit e097d56](https://github.com/u826318/sopra-fs26-group-09-server/commit/e097d56) | #18 Implemented POST /households/{householdId}/pantry/{itemId}/consume endpoint with validation, membership checks, and consumption logging. | Provides core pantry interaction logic, ensuring correct inventory updates and enabling real-time tracking of consumption across household members. |
|**Maxim Emelianov [maxim451]** | 05.04.2026 | [server commit e097d56](https://github.com/u826318/sopra-fs26-group-09-server/commit/e097d56) | #19 Added auto-removal of pantry items when quantity reaches zero within consumption workflow. | Ensures data consistency and prevents stale inventory entries, keeping the pantry state accurate and aligned with real usage. |
|**Maxim Emelianov [maxim451]** | 05.04.2026 | [server commit f538bee](https://github.com/u826318/sopra-fs26-group-09-server/commit/f538bee) | #51 Implemented GET /households/{householdId}/pantry endpoint returning pantry items and total calories with DTO mapping and tests. | Provides aggregated pantry overview for users, combining inventory and calorie data into a single API required by the dashboard UI. |
| **[@githubUser3]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **Yifu Li [@y-f-li]** | Apr.3.26   | [server commit e25d4a9](https://github.com/u826318/sopra-fs26-group-09-server/commit/e25d4a94111c02d2cb735c68584d34c79da49754) | #34 Integrate OpenFoodFacts API client in backend | Implemented a open food facts API portal that allows the user to send a barcode or the item name to open food facts and return in the first panel the nutrition information, and in the second panel all of the data that the API is able to return. It also offers the functionality of exporting all of the information returned by Open Food Facts as a text file. This should allow for future implementation Of adding the calorie information to the pantry or all of the nutrition information that we care about. |
|                    | Apr.3.26   | [client commit 50303a4](https://github.com/u826318/sopra-fs26-group-09-client/commit/50303a4f73551c8d3555489fe8ee9a1fad9891da) | #18 Connect barcode input to REST API and display results | Implemented the front end open food facts API portal that allows the user to send a barcode or the item name to open food facts and return in the first panel the nutrition information, and in the second panel all of the data that the API is able to return. It also offers the functionality of exporting all of the information returned by Open Food Facts as a text file. This should allow for future implementation Of adding the calorie information to the pantry or all of the nutrition information that we care about. |

---

## Contributions Week 3 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 4 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 5 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 6 - [Begin Date] to [End Date]

_Continue with the same table format as above._
