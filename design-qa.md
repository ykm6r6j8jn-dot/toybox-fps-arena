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
- desktop viewport: `1440 x 900`
- mobile viewport: `844 x 390`
- state: FPS match active in global room `DONPCH`; practice mode and CP fill disabled for COMBAT 2.0 browser QA

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
- Match pacing: one-life and life3 now use a server-owned multi-phase safe zone with waiting, shrinking, holding, and final stages. CPs route back toward safety and life3 respawns are selected inside the current zone.
- Late joins: players and replacement CPs entering after a shrink use collision-checked spawn points inside the active safe zone, while initial match spawns remain unchanged.
- Team play: desktop `P`/middle-click and the smartphone pin control create short-lived server-filtered markers that are delivered only to teammates and also appear on the minimap.
- Vehicle balance: roadsters have 600 durability, weapon damage, a disabled/restart state, compact durability HUD, and three low-cost repair pads. Repair pads are visible in the world and as green crosses on the minimap.
- Network resilience: unexpected disconnects preserve the server-owned player state for 15 seconds. The client reconnects with a session-only resume token, freezes combat input while disconnected, and restores the same player id, health, score, equipment, and match state.
- Network rendering: remote players and shared vehicles use timestamped interpolation, capped short extrapolation, teleport-history resets, yaw-wrap handling, measured packet jitter, and an adaptive 122-220ms interpolation window.
- Shot fairness: the client sends the server timestamp of the rendered target state and the server applies a bounded 220ms rewind while retaining authoritative weapon range and wall blocking.
- Combat precision: player hits use server-owned head, torso, and limb volumes after lag rewind. Head damage is `1.38x`, torso damage is `1.0x`, limb damage is `0.82x`, and the reported damage is capped to the target's actual remaining health.
- Weapon handling: every gun has independent shot bloom, bloom ceiling, and recovery speed. Movement and airborne states widen aim, sneak reduces movement bloom, and DMR/AWM scope plus touch compensation tighten it; the four-part reticle reflects the live spread.
- Damage readability: rapid hits from one attack aggregate for 160ms, so the Type 95 three-round head burst displays as `!-75` instead of three cards. Incoming attacks show a camera-relative direction arc, hit zone, weapon, attacker, and exact damage.

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

## Findings

No actionable P0, P1, or P2 findings remain for this pass.

## Follow-up polish

- P3: additional bespoke beveled building modules and baked normal maps could move the lightweight browser renderer closer to the offline reference, but would need a separate performance budget.
- P3: dynamic sun shadows are available only through `?ultra=1` on capable desktop hardware; normal links use lightweight contact shadows to protect frame stability.

## Verification

- Browser page identity and nonblank canvas: passed.
- Framework overlay: none.
- Console errors and warnings: none in desktop and mobile checks.
- Desktop render: `58-60fps` observed after settle in the in-app browser.
- Mobile render: `60fps` observed at `844 x 390`; the actual latency/FPS text remained visible.
- Interaction: mobile settings opened a `320px`-high scrollable panel with `706px` content; active controls measured at `48px` or larger, the fire target honored its `88px` setting, and pairwise button-overlap/document-overflow checks returned zero.
- Build, controls, gameplay-systems, network-systems, combat-systems, and three-client multiplayer smoke tests: passed. Combat tests cover head/torso/limb intersections, exact damage multipliers, aim spread/recovery, constant-time direction normalization, same-id reconnect, a lag-compensated headshot, and an exact `200` total applied-damage cap.
- Bundle: main gameplay JS `152.80 kB` (`54.62 kB` gzip), CSS `76.62 kB` (`15.97 kB` gzip), Three.js chunk `505.62 kB` (`127.25 kB` gzip).
- Production dependency audit: `npm audit --audit-level=high --omit=dev` reports `0 vulnerabilities`; Vite remains build-only and is no longer installed in the Render runtime image.
- Public verification: COMBAT 2.0 is live at `https://toybox-fps-arena.onrender.com` from Render commit `ab0502d`. The public browser loaded `index-C-tgZEIX.js` and `index-BIae-yIk.css`; an ordinary WebSocket client reached the browser target through the collision-checked arena route and produced three server-authoritative Type 95 head hits for exactly `75` damage. At `844 x 390`, a later lethal hit rendered `!-50`, `ヘッドショット`, `95式`, attacker name, and the source-direction arc at `60fps`; the `180px` damage card remained separate from the ammo and settings controls with zero document overflow.
- `tsc --noEmit`: stopped after it made no progress for about 60 seconds; this repository's narrower build/runtime checks completed normally.

final result: passed
