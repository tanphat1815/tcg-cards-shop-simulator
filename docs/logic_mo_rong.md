# Implementation Plan - Chuẩn hóa Logic Mở rộng (Expansion Blueprint)

This plan details the standardization of the shop expansion system, adhering to a fixed anchor and specific growth increments, while adding a visual preview for the next expansion.

## User Review Required

> [!IMPORTANT]
> **Growth Increment**: Width will increase by **+200px** (5 tiles) and Height by **+80px** (2 tiles) per level.
> **Visual Indicator**: I will implement a dashed boundary or a subtle glow effect in the "outside" area to show where the shop will expand to next.

## Proposed Changes

### Configuration

#### [MODIFY] [expansionData.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/config/expansionData.ts)
- Update `getExpansionDimensions` to use level-based multipliers:
    - `extraW = level * 200`
    - `extraH = level * 80`
- Define `MAP_CONFIG` constants:
    - `TILE_SIZE: 40`
    - `WIDTH_STEP: 5` (tiles)
    - `HEIGHT_STEP: 2` (tiles)

### Game Rendering

#### [MODIFY] [MainScene.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/game/MainScene.ts)
- **State**: Add `previewGraphics: Phaser.GameObjects.Graphics`.
- **refreshEnvironment()**:
    - Calculate current bounds and next level bounds.
    - Render actual shop floor/walls as usual.
    - Render a "Blueprint" border for the next level using a dashed line or a light-blue transparent stroke in the `previewGraphics` layer.
- **NPC/Physics**: Update world bounds and wander logic to strictly adhere to current level dimensions.

## Open Questions
- **Preview Style**: Would you prefer a simple dashed line (Blueprint style) or a modern glowing effect ("Force field" style) for the expansion preview?

## Verification Plan

### Automated Tests
- Buy an expansion via the Online Shop.
- Verify that `MainScene` updates correctly and the preview border moves to the next possible expansion level.

### Manual Verification
- Confirm that the shop only expands to the Right and Bottom.
- Confirm that the Top-Left corner remains fixed at `(100, 100)`.
- Confirm that the "Next Level" boundary is visible outside the shop walls.
