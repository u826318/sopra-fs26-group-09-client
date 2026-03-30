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
|  **[maxim451]**     | [29.03.2026]   | [server commit 28ca2e0](https://github.com/u826318/sopra-fs26-group-09-server/commit/28ca2e0)  | Implemented backend persistence for barcode-based product addition: created PantryItem entity and repository to store product metadata (barcode, name, calories, timestamp) returned from OpenFoodFacts API. | Supports the barcode lookup user story (#4) by enabling confirmed products to be persisted and later displayed in the pantry view, #4 can not be implemented without this part | 
|| [29.03.2026]   | [server commit 6421b54](https://github.com/u826318/sopra-fs26-group-09-server/commit/6421b54)  | Implemented backend consumption tracking: introduced ConsumptionLog entity and repository to persist consumption events with quantity, calories, and timestamp. | Supports the consume item user story (#7) by enabling accurate tracking of consumed portions and ensuring correct calorie accounting. Again without resloving this issue that user story can not be done |
|| [29.03.2026]   | [server commit ee0c423](https://github.com/u826318/sopra-fs26-group-09-server/commit/ee0c423) | Implemented core calorie aggregation logic in PantryService to compute total pantry calories (sum of kcalPerPackage × count) together with simple unit test | Supports the pantry overview user story (#8) by enabling calculation of total calorie inventory displayed to users. |
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |

---

## Contributions Week 2 - [Begin Date] to [End Date]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **[@githubUser1]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser2]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser3]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |

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
