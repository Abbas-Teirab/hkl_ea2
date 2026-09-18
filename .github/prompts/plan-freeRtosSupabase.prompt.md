## Plan: ESP32 FreeRTOS Supabase Refactor

Convert the current single-loop firmware into a dual-core FreeRTOS design where sensor capture, lock interrupt handling, and network I/O are separated into tasks. Keep Ethernet-only transport, replace raw HTTP posting with ESPSupabase for writes, and implement nodes-driven runtime control (transmission_period and enabled) so sensor publishing is gated by nodes state.

**Steps**

1. Phase 1 - Dependency and baseline setup
2. Update ESP32/platformio.ini to add ESPSupabase and an explicit websocket client dependency for non-SSL realtime (HTTP/WS local gateway).
3. In ESP32/src/main.cpp, keep existing sensor/lock logic behavior as baseline references from sendSensorsValues, processLockInput, WiFiEvent, and onLockChange, but move orchestration out of loop.
4. Convert SENSOR_POST_INTERVAL_MS from compile-time constant to mutable runtime state with bounds (for example min and max guardrails) and store as milliseconds.
5. Phase 2 - Runtime state, synchronization, and IPC
6. Define a shared runtime state structure for ethConnected, nodeExists, nodeEnabled, transmissionPeriodMs, and lockStableState; protect state reads/writes with a mutex.
7. Create FreeRTOS queues:
8. One outbound queue for data write requests to Supabase (sensor payloads and lock payloads).
9. One config-update queue for node changes coming from realtime callback and periodic reconciliation.
10. Use an EventGroup (or equivalent flags) for ETH_UP and NODE_ALLOWED_TO_SEND gates so producer tasks can cheaply check eligibility.
11. Phase 3 - Task architecture and core pinning
12. Pin network-heavy tasks to Core 0:
13. RealtimeRxTask: websocket subscription loop and message handling.
14. SupabaseTxTask: single writer task that performs all Supabase REST writes from outbound queue.
15. Pin hardware/logic tasks to Core 1:
16. SensorTask: periodic DS18B20+BME280 read and enqueue sensor payload.
17. LockTask: waits for ISR notification, debounces lock input, enqueues lock payload on real state change.
18. Add a low-frequency NodeReconcileTask (Core 1 or Core 0 low priority) to query nodes by name and recover from missed realtime events or row deletion scenarios.
19. Keep loop minimal (idle delay only), with no business logic.
20. Phase 4 - Supabase integration changes
21. Replace sendJsonPost internals to use ESPSupabase REST methods instead of manual WiFiClient request assembly:
22. Map requested path/table target and call Supabase insert or query-builder flow.
23. Return HTTP code compatibility so existing callers can keep the same success/failure handling pattern.
24. Move direct network calls out of sendSensorsValues and sendLockState; these functions should prepare JSON and enqueue to SupabaseTxTask.
25. Implement retry policy in SupabaseTxTask (bounded retries + backoff + logging) for reliable delivery without blocking sensor and lock tasks.
26. Phase 5 - Nodes-driven control (Task 1 and Task 2 constraints)
27. On startup, perform a nodes lookup by exact name and select latest matching row (deterministic ordering + limit).
28. If no matching nodes row exists, set nodeExists false and block sensor publishing.
29. If matching row exists but enabled is false, block sensor publishing.
30. For matching row updates (INSERT/UPDATE), parse transmission_period and enabled then atomically update shared runtime state.
31. Because you selected seconds as input unit, convert transmission_period seconds to transmissionPeriodMs before storing.
32. Realtime receive path for local HTTP/WS endpoint:
33. Use a suitable non-SSL websocket approach for postgres_changes subscription on nodes with filter name equals local node name.
34. Keep ESPSupabase for write path to satisfy sendJsonPost replacement requirement.
35. Phase 6 - Interrupt handling (Task 3)
36. Replace lockChangePending polling handshake with direct ISR-to-task notification:
37. ISR only signals LockTask using vTaskNotifyGiveFromISR and optional context switch yield.
38. LockTask performs debounce and retrigger lockout (preserving current behavior intent from processLockInput).
39. LockTask publishes lock state changes through outbound queue; SupabaseTxTask performs the actual database write.
40. Phase 7 - Database and environment compatibility checks
41. Ensure nodes table changes are available to realtime subscriptions in your Supabase setup (publication and API exposure as needed for your deployment mode).
42. Validate local gateway compatibility for ESPSupabase write path and chosen websocket receive path under Ethernet networking.

**Relevant files**

- c:/Users/abees/Documents/squ/hkl_ea2/ESP32/src/main.cpp - convert orchestration from loop to FreeRTOS tasks; refactor sendJsonPost, sendSensorsValues, sendLockState, processLockInput, WiFiEvent, onLockChange.
- c:/Users/abees/Documents/squ/hkl_ea2/ESP32/platformio.ini - add required libraries for ESPSupabase and realtime websocket client.
- c:/Users/abees/Documents/squ/hkl_ea2/supabase/db-initialization.txt - verify nodes participation in realtime publication and table/API accessibility assumptions.

**Verification**

1. Build check: run PlatformIO build for env esp32_wroom_da and ensure no compile/link errors.
2. Boot check: verify Ethernet comes up, tasks start on intended cores, and no watchdog resets.
3. Nodes gating check (no row): with no matching nodes.name, confirm sensor payloads are not sent.
4. Nodes gating check (disabled): with matching nodes row and enabled false, confirm sensor payloads are not sent.
5. Nodes gating check (enabled): set enabled true and confirm sensor payloads begin flowing.
6. Realtime period update check: update nodes.transmission_period and confirm next publish cadence changes accordingly.
7. Lock ISR check: toggle interruptPin input and confirm LockTask receives notifications and publishes lock events once per debounced transition.
8. Reliability check: temporarily drop Ethernet or API reachability and confirm retry/backoff behavior without task starvation.

**Decisions**

- transmission_period will be interpreted as seconds and converted to milliseconds in firmware runtime state.
- Supabase endpoint is HTTP/WS local only, so realtime receive will use a suitable non-SSL websocket path; ESPSupabase will be used for write path and sendJsonPost replacement.
- Firmware will continue using service role key in-device as requested.
- Scope is firmware-focused; no frontend or data migration changes are included.

**Further Considerations**

1. Security hardening follow-up: migrate from service role key to anon key plus explicit policies when operational requirements allow.
2. Optional maintainability follow-up: split main.cpp into task modules after functional parity is confirmed.
