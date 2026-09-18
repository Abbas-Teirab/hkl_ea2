## Plan: ESP32 FreeRTOS + Supabase (Updated)

Refactor ESP32/src/main.cpp from single-loop flow into a dual-core FreeRTOS design that uses Ethernet-only communication, queue-based task handoff, and synchronized shared state. Replace legacy HTTP POST logic inside sendJsonPost with jhagas/ESPSupabase (or a compatible Supabase client if needed), and enforce nodes-table-driven runtime behavior for transmission interval and sensor send eligibility.

**Implementation Plan**

1. Phase 1 - Dependencies and baseline prep
2. Update ESP32/platformio.ini to include jhagas/ESPSupabase and any required transport dependency for Supabase realtime over Ethernet.
3. Keep current business behavior in main.cpp as reference (sensor sampling, lock handling, Ethernet status), then move orchestration into FreeRTOS tasks.
4. Convert SENSOR_POST_INTERVAL_MS from fixed constant to mutable runtime value (milliseconds) stored in shared state.
5. Phase 2 - Shared state, synchronization, and IPC
6. Create a RuntimeState object with fields: ethConnected, nodeExists, nodeEnabled, transmissionPeriodMs, and other shared flags.
7. Protect RuntimeState with a mutex (or binary semaphore used as mutex) for all read/write access.
8. Create queues for inter-task communication:
9. Queue A: outbound database write requests (sensor and lock payloads).
10. Queue B: node configuration updates from startup query and realtime events.
11. Optionally use EventGroup bits for fast gating checks (ETH_CONNECTED, NODE_ALLOWED_TO_SEND).
12. Phase 3 - Task split and core assignment
13. Pin network-focused tasks to Core 0:
14. RealtimeTask: subscribe to nodes INSERT/UPDATE and parse updates.
15. SupabaseWriteTask: single writer task for all DB writes and retry handling.
16. Pin hardware/logic tasks to Core 1:
17. SensorTask: periodic sensor read and queue publish request.
18. LockTask: waits for ISR notification, debounces, and queues lock event payload.
19. StartupNodeCheckTask (or startup step before scheduler): query nodes by name with retry policy.
20. Keep loop() minimal (idle delay only).
21. Phase 4 - Supabase API integration update
22. Refactor sendJsonPost to call ESPSupabase APIs instead of manual HTTP request assembly.
23. Keep a compatible return contract (success/failure status) so upstream callers can preserve existing control flow.
24. Move direct network I/O out of producer logic: producers only build payload and enqueue; SupabaseWriteTask performs transmission.
25. Add bounded retry + backoff in SupabaseWriteTask to improve reliability for transient Ethernet/API failures.
26. Phase 5 - Task requirements mapping
27. Task 1 (Realtime nodes updates)
28. Listen to Supabase realtime INSERT/UPDATE on nodes.
29. If incoming row name equals local name variable, update transmissionPeriodMs from transmission_period, then apply to SENSOR_POST_INTERVAL_MS runtime value.
30. Task 2 (Sensor posting with startup checks and gating)
31. On boot, query nodes by local name and update transmission period from transmission_period.
32. If startup query fails, retry exactly 3 times with 10-second wait between retries.
33. Permit sensor writes only when both are true: nodeExists and nodeEnabled.
34. Block sensor writes when no matching nodes row exists.
35. Block sensor writes when matching nodes row exists but enabled is false.
36. Send sensor rows to sensors table at the current SENSOR_POST_INTERVAL_MS cadence when allowed.
37. Task 3 (Interrupt handling)
38. ISR for interruptPin must only notify the designated FreeRTOS task (no heavy work inside ISR).
39. LockTask receives notification, processes debounce/state logic, then queues resulting event.
40. Phase 6 - Supabase skill usage and validation
41. Use Supabase SKILL guidance to validate realtime subscription behavior, table access expectations, and write/query patterns.
42. Validate end-to-end behavior under Ethernet-only operation.

**Relevant Files**

- ESP32/src/main.cpp - main refactor target for tasks, queues, ISR notification, and sendJsonPost update.
- ESP32/platformio.ini - dependency updates for ESPSupabase and realtime support.
- supabase/db-initialization.txt - verify nodes/sensors schema assumptions for runtime gating and updates.

**Verification Checklist**

1. PlatformIO build passes for esp32_wroom_da.
2. Device boots with Ethernet connected and both cores running assigned tasks.
3. Startup nodes query follows 3 retries at 10-second intervals on failure.
4. With no matching nodes.name, sensors rows are not sent.
5. With matching nodes.name and enabled=false, sensors rows are not sent.
6. With matching nodes.name and enabled=true, sensors rows are sent at SENSOR_POST_INTERVAL_MS interval.
7. Updating nodes.transmission_period for matching name changes next sensor send cadence.
8. interruptPin transitions trigger ISR notification and LockTask processing without blocking or watchdog issues.
9. Temporary network/API failures show retry/backoff behavior while producer tasks remain responsive.
