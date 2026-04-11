# Implementation Plan - Play Tables (Tính năng Cộng đồng)

This plan outlines the addition of "Play Tables", where NPCs can sit and play cards, generating passive XP for the player.

## User Review Required

> [!IMPORTANT]
> **Matchmaking Logic**: Each Play Table will have 2 fixed seats (Left/Right). A match only starts when both seats are occupied.
> **XP Reward**: 50 XP will be granted per match completion.
> **Visual Feedback**: I will add a progress bar or an icon (e.g., 🃏) floating over the NPCs during the match.

## Proposed Changes

### Configuration

#### [MODIFY] [shopData.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/config/shopData.ts)
- Add `play_table` to `FURNITURE_ITEMS`:
    - Name: "Play Table"
    - Price: $400
    - Level: 5
    - Description: "Bàn chơi bài cho khách hàng. Tạo XP thụ động khi có người thi đấu."

---

### State Management

#### [MODIFY] [gameStore.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/stores/gameStore.ts)
- Define `PlayTableData` interface:
    ```typescript
    interface PlayTableData {
      id: string;
      x: number;
      y: number;
      occupants: (string | null)[]; // instanceIds of NPCs [seat0, seat1]
      matchTimer: number; // current match progress
    }
    ```
- Add `placedTables` to state.
- Update `placeFurniture` to support table creation.
- Add `checkInToTable(instanceId, tableId)` and `checkOutFromTable(instanceId)` actions.

---

### Game Logic & Rendering

#### [MODIFY] [MainScene.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/game/MainScene.ts)
- **Preload**: Load a placeholder or new asset for `play_table`.
- **Rendering**: Add `renderPlayTables()` to draw tables from store.
- **NPC AI Update**:
    - Add `NPCState`: `WANT_TO_PLAY`, `SEEK_TABLE`, `PLAYING`.
    - 30% chance on spawn to set state to `WANT_TO_PLAY`.
    - **SEEK_TABLE**: Find a table with `occupants.includes(null)`.
    - **PLAYING**: Move to seat position, wait for match completion.
    - Match logic: Tick `matchTimer` in `update()` when both seats are full.
    - On completion: Call `gameStore.gainExp(50)`, set NPCs to `LEAVE`.

## Open Questions
- **Seat Positions**: I'll assume 2 players sit horizontally (left and right of the table). Is this layout okay for your shop design?
- **XP Amount**: Is 50 XP per match (10-15s) balanced with your current level progression? (Level 1->2 needs 100 XP).

## Verification Plan

### Manual Verification
- Buy and place a Play Table from the Furniture shop.
- Observe NPCs spawning; verify some have the "Want to play" intent (visual indicator or label).
- Verify NPCs sit at the table and wait for a second player.
- Verify match starts when 2 players are seated.
- Verify XP is granted after the timer ends and NPCs leave.
