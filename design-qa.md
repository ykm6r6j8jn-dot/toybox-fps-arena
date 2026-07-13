# DonPaChi FPS Design QA

- source visual truth: `/Users/hideo2112/Library/Mobile Documents/com~apple~CloudDocs/生成画像2 (6).png`
- implementation screenshot: `/tmp/donpachi-roadster-desktop.png`
- mobile screenshot: `/tmp/donpachi-roadster-mobile.png`
- AURORA TOWER nearby screenshot: `/tmp/donpachi-aurora-nearby.png`
- SAFE DISTRICT desktop screenshot: `/tmp/donpachi-safe-district-desktop.png`
- SAFE DISTRICT mobile screenshot: `/tmp/donpachi-safe-district-mobile.png`
- SAFE DISTRICT public mobile screenshot: `/tmp/donpachi-safe-district-public-mobile.png`
- RESILIENCE reconnect screenshot: `/tmp/donpachi-resilience-reconnecting.png`
- RESILIENCE mobile reconnect screenshot: `/tmp/donpachi-resilience-mobile-reconnecting.png`
- clean mobile lobby screenshot: `/tmp/donpachi-resilience-mobile-lobby.png`
- RESILIENCE public mobile screenshot: `/tmp/donpachi-resilience-public-mobile.png`
- COMBAT 2.0 desktop screenshot: `/tmp/donpachi-combat-desktop.png`
- COMBAT 2.0 mobile screenshot: `/tmp/donpachi-combat-mobile.png`
- COMBAT 2.0 public mobile screenshot: `/tmp/donpachi-combat-public-mobile.png`
- MOTION 2.0 desktop screenshot: `/tmp/donpachi-motion-desktop.jpg`
- MOTION 2.0 mobile screenshot: `/tmp/donpachi-motion-mobile.jpg`
- MOTION 2.0 remote runner screenshot: `/tmp/donpachi-motion-mobile-runner.jpg`
- MOTION 2.0 public mobile screenshot: `/tmp/donpachi-motion-public-mobile.jpg`
- TACTICS 2.0 local mobile screenshot: `/tmp/donpachi-tactics-local-mobile.png`
- TACTICS 2.0 local settings screenshot: `/tmp/donpachi-tactics-settings-mobile.png`
- TACTICS 2.0 public mobile screenshot: `/tmp/donpachi-tactics-public-mobile.png`
- TACTICS 2.0 public settings screenshot: `/tmp/donpachi-tactics-public-settings.png`
- WORLD 3.0 local mobile door screenshot: `/tmp/donpachi-world3-local-mobile.png`
- WORLD 3.0 local desktop NEXUS screenshot: `/tmp/donpachi-world3-local-desktop.png`
- WORLD 3.0 public mobile screenshot: `/tmp/donpachi-world3-public-mobile.png`
- WORLD 3.0 public settings screenshot: `/tmp/donpachi-world3-public-settings.png`
- WORLD 3.0 public desktop screenshot: `/tmp/donpachi-world3-public-desktop.png`
- VERTICAL 4.0 local AURORA landing screenshot: `/tmp/donpachi-vertical4-final.jpg`
- VERTICAL 4.0 public clean-spawn screenshot: `/tmp/donpachi-vertical4-public.jpg`
- desktop viewport: `1440 x 900`
- mobile viewport: `844 x 390`
- state: FPS match active in global room `DONPCH`; local VERTICAL 4.0 browser QA used an isolated practice room and QA-only creative positioning

## Full-view comparison evidence

The source and implementation were compared at a desktop viewport. The implementation now follows the source hierarchy: room and invite controls at upper left, circular minimap below, centered score ring, connection/settings controls at upper right, kill feed at right, health at lower left, weapon/ammo at lower right, and the ready-room strip across the bottom. The white concrete, blue, green, and yellow arena palette, painted wall marks, barrels, stairs, rooftops, and compact dark HUD surfaces are present in the rendered game.

## Focused region evidence

Separate focused crops were not needed because the native `1440 x 900` capture keeps the HUD copy, weapon silhouette, minimap, player labels, and bottom strip legible. Mobile was separately captured at `844 x 390` to check control spacing and settings access.

## Required fidelity surfaces

- Fonts and typography: Japanese system UI stack, bold compact HUD hierarchy, tabular score/ammo values, no clipped primary labels.
- Spacing and layout rhythm: primary HUD regions match the reference positions; the skill control no longer overlaps ammo; desktop and mobile report no document overflow.
- Colors and visual tokens: dark navy translucent panels, bright lime ready action, white concrete, saturated blue/green/yellow arena accents, and pale sky match the reference direction.
- Image and asset quality: existing Three.js arena textures, decals, clouds, weapon geometry, icon asset, and character geometry render sharply. The real-time 3D scene is intentionally lighter than the offline reference render.
- Copy and content: room, invite, score, health, ammo, settings, and ready labels remain functional. `200 HP`, one-life mode, global room `DONPCH`, and the collapsed 20-player list are intentional product requirements that supersede reference mock data.
- Icons and interactions: Lucide controls remain aligned; mobile settings opens to a `320px`-high scrollable panel; ammo does not intersect mobile action buttons.
- World interactions: four shared roadsters use server-owned drivers, obstacle/player/CP collision, analog steering, braking, and enter/exit controls. AURORA TOWER provides an automatic entrance, four interior floors, real stairwell openings, instanced spiral steps, a lobby, and a reachable roof.
- World authority: six sliding entrances now use one room-owned open ratio. Players, CPs, vehicles, bullets, tracers, and reconnect snapshots consume the same panel state; remote interaction is rejected and valid manual opening is rate-limited.
- NEXUS CENTER: the former solid west high-rise is now a five-floor accessible building with a sealed entrance, lobby, reception, interior cover, split floor slabs, an instanced spiral route, roof railings, utilities, and a reachable landing roof.
- Vertical authority: AURORA and NEXUS have server-owned elevator position, target floor, arrival time, and projectile collision. The same shared definitions drive visual shafts, floor openings, client grounding, interaction range, and server snapshots.
- Vertical CP routes: CPs now preserve their actual height, queue at tower entrances, commit to the interior route, and traverse the same continuous spiral geometry instead of teleporting or being reset to ground level.
- Match pacing: one-life and life3 now use a server-owned multi-phase safe zone with waiting, shrinking, holding, and final stages. CPs route back toward safety and life3 respawns are selected inside the current zone.
- Late joins: players and replacement CPs entering after a shrink use collision-checked spawn points inside the active safe zone. Initial human spawns remain unchanged, while every CP spawn is checked against walls, vehicles, humans, and previously placed CPs.
- Team play: desktop `P`/middle-click and the smartphone pin control create short-lived server-filtered markers that are delivered only to teammates and also appear on the minimap.
- Vehicle balance: roadsters have 600 durability, weapon damage, a disabled/restart state, compact durability HUD, and three low-cost repair pads. Repair pads are visible in the world and as green crosses on the minimap.
- Network resilience: unexpected disconnects preserve the server-owned player state for 15 seconds. The client reconnects with a session-only resume token, freezes combat input while disconnected, and restores the same player id, health, score, equipment, and match state.
- Network rendering: remote players and shared vehicles use timestamped interpolation, capped short extrapolation, teleport-history resets, yaw-wrap handling, measured packet jitter, and an adaptive 122-220ms interpolation window.
- Shot fairness: the client sends the server timestamp of the rendered target state and the server applies a bounded 220ms rewind while retaining authoritative weapon range and wall blocking.
- Combat precision: player hits use server-owned head, torso, and limb volumes after lag rewind. Head damage is `1.38x`, torso damage is `1.0x`, limb damage is `0.82x`, and the reported damage is capped to the target's actual remaining health.
- Weapon handling: every gun has independent shot bloom, bloom ceiling, and recovery speed. Movement and airborne states widen aim, sneak reduces movement bloom, and DMR/AWM scope plus touch compensation tighten it; the four-part reticle reflects the live spread.
- Damage readability: rapid hits from one attack aggregate for 160ms, so the Type 95 three-round head burst displays as `!-75` instead of three cards. Incoming attacks show a camera-relative direction arc, hit zone, weapon, attacker, and exact damage.
- Movement authority: the server normalizes unlimited yaw rotations, bounds horizontal and vertical state changes, preserves the shared high-force trampoline envelope, validates walls, and returns a targeted correction only when the requested pose is invalid.
- Movement feel: desktop and touch input use responsive acceleration/deceleration, touch input has a radial dead zone plus low-speed response curve, full-forward touch hold sustains auto sprint, and 170ms jump buffering plus 135ms coyote time prevents dropped edge inputs without enabling repeat air jumps.
- Character motion: remote bodies use measured network speed and vertical speed for interpolated leg, arm, and airborne poses. First-person walk and landing motion is reduced on touch devices and disabled by the operating system's reduced-motion preference.
- CP tactics: four deterministic roles use bounded reaction time, sticky target memory, health and local-number checks, weapon-specific ranges, safe-zone priority, strafing, pushing, flanking, retreating, and cached cover selection. Target decisions run every `650-1095ms` and inspect at most five candidates.
- CP physical safety: wall-following and wall-recovery use the same `0.68m` radius; CP movement cannot enter vehicles or other players, and human-facing personal space stays above `2m` without blocking movement away from an overlap.
- Mobile combat layout: the special control has a `44px` minimum target and a dedicated center-right lane; it does not overlap fire, jump, scope, reload, weapon, heal, ping, or settings controls at `844 x 390`.

## Comparison history

1. P1: the original render was washed out and the weapon/ammo/skill hierarchy collided. Fixed contrast, material values, weapon silhouette, ammo copy, panel tokens, and skill placement. Post-fix evidence: `/tmp/donpachi-final-desktop.png`.
2. P1: mobile ammo overlapped right-side action controls. Moved ammo below the top utility controls and separated health from the movement stick. Post-fix evidence: `/tmp/donpachi-final-mobile.png`; automated bounds check reports `controlsOverlap: false`.
3. P2: spawn yaw faced away from the central arena and first-player spawns were blocked by nearby structures. Corrected yaw and moved the first two spawns to clear central sight lines. Post-fix evidence: final desktop capture shows central colored cover, stairs, rooftops, props, and enemies immediately visible.
4. P2: nearby name tags obscured the center of combat. Reduced the world-space name tag from `1.8 x 0.45` to `1.34 x 0.335` while preserving readability.
5. P1: mobile movement snapped to eight directions and 44px controls were undersized. Switched to continuous analog vectors, 48px action targets, a 68px fire target, haptic feedback, and background-input cancellation.
6. P1: the initial tower slab crossed the spiral route visually. Split every floor into four physical slabs around a real `6.8 x 6.8m` stairwell opening and synchronized matching server bullet blockers.
7. P1: vehicles could have overlapped CPs or kept a silent driver alive indefinitely. Added dynamic CP/player collision and stopped vehicle simulation from refreshing network presence.
8. P1: the first SAFE card placement covered part of the red score. Moved it below the desktop minimap and kept a separate compact mobile placement; the final desktop image shows both scores unobstructed.
9. P1: the smartphone fire-size setting was overridden by a fixed in-match size. The selected 72-96px value now controls the live fire target while preserving zero overlap with jump/reload controls.
10. P1: smartphone players had no direct control for their five starting heal packs. Added a dedicated 48px heal action with the existing server-authoritative inventory check.
11. P2: the compact smartphone HUD had hidden the real latency/FPS readout. Restored a small 84px live readout without intersecting the centered score, audio, settings, or ammo controls.
12. P1: a brief mobile disconnect previously required manual re-entry and could lose the current state. Added automatic retry with an explicit recovery overlay and a 15-second server resume window; browser QA used `?qa=1` and `F10` to reproduce the real WebSocket close.
13. P1: the mobile lobby showed movement, firing, score, and combat HUD behind the scrollable join surface. Those controls now remain hidden until a match is active, while the full lobby still scrolls to poker, online players, and update history.
14. P2: the mobile settings content could scroll visually above its sticky title. Removed the negative top offset; the close control and title now stay cleanly fixed while all settings remain reachable.
15. P1: multiplayer smoke tests could inherit players from the shared local `DONPCH` room and become spawn-order dependent. The test now starts and stops its own isolated production server, so reconnect, vehicle, safe-zone, ping, shot, and elimination checks are deterministic.
16. P1: the former single `0.8m` player hit radius made shots above the torso count as hits and prevented meaningful precision. Replaced it with server-authoritative skin-aware head, torso, and limb intersections while preserving wall, range, vehicle, castle-core, and lag-rewind ordering.
17. P1: mobile auto-aim targeted `0.65m` above the network pose, which only worked because the old hit sphere was oversized. It now targets the rendered torso center and keeps automatic fire body-biased rather than granting assisted headshots.
18. P1: Type 95 and shotgun pellets generated repeated damage cards and repeated non-fatal feed rows. Damage cards now aggregate for 160ms, hit-marker totals accumulate, hit confirmation audio is rate-limited, and non-fatal server feed rows are throttled to one per 220ms.
19. P1: mobile damage cards could cover the ammo panel. They now occupy a centered `180px` lane below the score; measured bounds were `x332-512`, while ammo stayed at `x754-834`, settings at `x788-836`, and fire/jump remained in the lower-right control area.
20. P2: managed or embedded Chromium could reject Pointer Lock and leave an unhandled error. Both synchronous rejection and Promise rejection are now contained while normal click-to-fire continues.
21. P1: rejected wall or speed movement previously remained visible on the client until a later state change, while the server silently used a different shooting origin. The server now returns a rate-limited authoritative correction and the client applies a short reconciliation or immediate large-error snap.
22. P1: vertical state updates accepted an immediate request up to the arena ceiling. Normal movement now has a strict upward/downward envelope, while shared trampoline locations receive a separate envelope large enough for the `10x` launch stage.
23. P1: yaw was clamped at two full rotations, so repeated turning could leave the remote model pinned at the boundary. Client input, recoil, aim assist, respawn, debug poses, and server state now normalize continuously to `[-PI, PI)`.
24. P2: keyboard and touch jump requests lived for one render frame, making low-frame-rate or just-before-landing presses unreliable. A tested input buffer and short grounded grace now consume the request on the first legal frame.
25. P2: touch auto sprint was extended only by pointer-move events, so holding the stick still could drop back to walking. The initial full-forward timestamp now drives sustained sprint independently of later pointer movement.
26. P2: mobile aim target selection ran twice per firing frame and camera motion added redundant ground scans. The animation loop now reuses one target result and cached contact state, and reuses a movement scratch vector to avoid extra frame allocations.
27. P2: the ground sweep allowed a surface up to `0.75-0.9m` above the current eye reference even while rising, which could classify an overhead edge as ground. Rising motion now accepts only surfaces at or below the current pose; descending and stair motion keep their normal landing tolerance.
28. P1: CPs followed fixed arena orbits and selected only the nearest visible target. Replaced that loop with role-based tactical movement, human reaction windows, sticky target memory, local-number checks, range-aware weapon choice, and cached cover routing.
29. P1: CP movement used a `0.55m` route radius but a `0.68m` wall-recovery radius, allowing a wall-edge correction to look like a speed spike. Both paths now use `0.68m`; the 19-CP live test caps observed movement at `11.5m/s` and reports no correction spike.
30. P1: the mobile special button overlapped jump by `48 x 10px` and fire by `20 x 28px`. Moved it to a responsive independent lane and increased its target height from `32px` to `44px`; post-fix pairwise overlap is zero.
31. P1: one late CP spawn started `0.93m` from the human camera, and CP movement had no player-body entry check. Added sequential collision-checked CP spawning plus directional personal-space collision; the eight-second 19-CP run held a minimum human gap of `2.21m`.
32. P1: AURORA's visual door opened independently on each client and was absent from server movement and projectile collision. Replaced it with six room-owned door states used by every client and all authoritative collision paths.
33. P1: the first closed-door test found a `0.15m` seam where a perfectly centered projectile could pass. Shifted both leaves into a slight physical overlap and retained the full open path; the live test now observes the impact at the closed METRO entrance.
34. P1: the west high-rise was a solid box with a long exterior staircase and no interior. Replaced it with NEXUS CENTER's five split floors, lobby, cover, continuous spiral stairwell, and roof route, with matching server geometry.
35. P2: the car-only context button gave no mobile or keyboard affordance for doors. `E` and the 50px mobile context control now switch between vehicle and door actions with an explicit label and Lucide door icon.
36. P2: transparent sliding leaves were difficult to distinguish when closed. Added one moving metal handle per leaf; all six entrances gain only twelve additional detail meshes.
37. P1: CP height was overwritten to `1.6m` every update, making legitimate upper-floor pursuit impossible and creating apparent warps. CPs now retain height and use deterministic tower entry, landing, ascending, and descending stages.
38. P1: the original floor slabs covered the new lift shafts. AURORA and NEXUS floors are split around matching open shafts, while server projectile geometry uses the same openings and the moving platform supplies the temporary blocker.
39. P1: a same-floor lift interaction could immediately send the cabin away while the player was still standing outside. A landed lift now becomes actionable only after the player enters the cabin; other floors remain callable from their landings.
40. P2: a low landing trim crossed the first-person sightline. The status trim was raised above eye level and the final desktop capture confirms an unobstructed cabin view.
41. P1: a long-lived global room could reuse an occupied spawn index after an earlier player left, placing two players at nearly identical coordinates and expanding the nearby world-space name tag across the camera. Initial joins and active-zone respawns now reject occupied, blocked, and vehicle-adjacent positions; the smoke test reproduces the vacated-slot sequence.

## Findings

No actionable P0, P1, or P2 findings remain for this pass.

## Follow-up polish

- P3: additional bespoke beveled building modules and baked normal maps could move the lightweight browser renderer closer to the offline reference, but would need a separate performance budget.
- P3: dynamic sun shadows are available only through `?ultra=1` on capable desktop hardware; normal links use lightweight contact shadows to protect frame stability.

## Verification

- Browser page identity and nonblank canvas: WORLD 3.0 passed locally and publicly at desktop `1440 x 900` and mobile `844 x 390`; the final desktop canvas backing size exactly matched `1440 x 900`.
- VERTICAL 4.0 local browser proof: the AURORA lift carried the player smoothly through sampled heights `0.4m`, `1.9m`, `4.4m`, `5.6m`, and `5.7m`; the final scene held `51-56fps` with zero console messages. A `1280 x 720` central canvas sample contained `1,633` unique colors and a `5.61%` near-black ratio, proving a nonblank, varied render.
- VERTICAL 4.0 public browser proof: the production page entered `DONPCH`, rendered a `2035 x 1144` backing canvas in the live viewport, and reported no console warnings or errors. A forced vacated-slot sequence kept the replacement player `91.21m` from the occupied spawn; the follow-up screenshot confirms the prior camera-filling name tag is absent.
- Framework overlay: none.
- Console errors and warnings: none in desktop and mobile checks.
- Desktop render: local WORLD 3.0 held `58-60fps`; public WORLD 3.0 held `60fps` at `1440 x 900`, with zero horizontal overflow and zero console errors/warnings.
- Mobile render: local and public WORLD 3.0 held `60fps` at `844 x 390`; public RTT was `181-183ms`, the real latency/FPS text remained visible, horizontal overflow was zero, and console errors/warnings were zero.
- Interaction: the public mobile lobby was scrollable at `390/1535px`; public settings opened a `318px`-high panel with `706px` content. Main gameplay controls measured at least `48px`, the fire target remained `88px`, and pairwise overlap checks returned zero, including while the 50px door control was visible.
- Door integration: the production-style WebSocket test synchronized all six doors to two clients, rejected remote use, blocked a closed-door projectile, opened by proximity, held by manual interaction, and closed after the hold expired.
- Build, controls, gameplay-systems, network-systems, combat-systems, movement-systems, AI systems, world systems, vertical systems, 19-CP production live test, world live test, vertical live test, and three-client multiplayer smoke tests: passed. The vertical live test rejected remote lift use, synchronized both lifts, observed arrival and projectile collision, and confirmed 19 CPs climbed without warping.
- Bundle: main gameplay JS `171.49 kB` (`61.18 kB` gzip), CSS `77.39 kB` (`16.11 kB` gzip), Three.js chunk `505.62 kB` (`127.25 kB` gzip).
- Production dependency audit: `npm audit --audit-level=high --omit=dev` reports `0 vulnerabilities`; Vite remains build-only and is no longer installed in the Render runtime image.
- Public verification: VERTICAL 4.0 implementation commit `ed9992d` is `live` at `https://toybox-fps-arena.onrender.com`. The public page loaded `index-2rNljmA_.js`, `index-DKlM9KuW.css`, and `three-cAQsBUvP.js`; the WebSocket snapshot reported `worldVersion: VERTICAL 4.0`, two valid elevator states, six valid door states, no QA-only CP route fields, and `aiVersion: TACTICS 2.0`. The verifier also received an authoritative movement correction and the production spawn probe rejected occupied-slot reuse.
- `tsc --noEmit`: stopped after it made no progress for 30 seconds; this repository's narrower build/runtime checks completed normally.

final result: passed

## BACCARAT 1.0 pass

### Scope

- Replaced the user-facing Texas Poker flow with one server-authoritative global Baccarat table, `DONBAC`.
- Added an eight-deck cryptographically shuffled shoe, standard third-card rules, timed deal/reveal/result phases, Player/Banker/Tie/Pair bets, pushes, and exact payout settlement.
- Added one shared Don wallet per account or guest token. New wallets start at `2,000 Don`; there is no purchase, cash-out, or real-money value.
- Added capped FPS match rewards from completion, kills, verified damage, item pickups, and victory. The server awards and persists the result once per match.

### Visual direction

- Desktop concept: `/Users/hideo2112/.codex/generated_images/019f0963-5b5c-7b30-bdfd-a0cf426115b2/exec-868ab559-f6ca-45ca-8149-6b939243da21.png`.
- Mobile concept: `/Users/hideo2112/.codex/generated_images/019f0963-5b5c-7b30-bdfd-a0cf426115b2/exec-53d2116c-04a1-413b-899f-1f6df3778819.png`.
- Final browser captures: `/tmp/donpachi-baccarat-final-desktop.png`, `/tmp/donpachi-baccarat-final-mobile.png`, and `/tmp/donpachi-baccarat-final-portrait.png`.
- The final implementation keeps the concept's deep green felt, charcoal lacquer, restrained brass edge, ivory cards, and distinct Player/Banker/Tie colors. Decorative avatars and a rendered shoe were intentionally omitted to protect the browser performance budget; live cards, totals, bets, history, participants, and settlement remain authoritative and functional.

### Verification

- Desktop `1280 x 720`: panel and document both measured exactly `1280 x 720`; no horizontal or vertical overflow. Pair labels wrap without clipping.
- Mobile landscape `844 x 390`: panel and document both measured exactly `844 x 390`; cards, five bet targets, chips, and actions remain visible without overlap.
- Mobile portrait `390 x 844`: panel and document both measured exactly `390 x 844`; the compact four-column header measured `380 x 50`, and the overlap probe found zero conflicting leaf elements.
- Touch-sized betting flow: selected `50 Don`, placed it on Banker, observed the server-owned wallet change from `2,000` to `1,950`, then undid it and observed both the wager and wallet return to zero and `2,000`.
- `test:baccarat`: passed eight-deck construction, standard draw rules, payouts, locked authoritative bets, reveal timing, and settlement.
- `test:baccarat-live`: passed two-client shared-table synchronization, one shared result, and server balance settlement.
- `test:economy`: passed completion, kill, damage, pickup, victory, sanitization, and `350 Don` match cap cases.
- `test:match-live`: passed warmup, ready flow, active combat, respawn, and CPU-free match requirements after the economy integration.
- Production build: CSS `97.85 kB` (`20.01 kB` gzip), app JS `176.92 kB` (`62.84 kB` gzip), shared Three.js chunk `505.62 kB` (`127.25 kB` gzip).

final result: passed
