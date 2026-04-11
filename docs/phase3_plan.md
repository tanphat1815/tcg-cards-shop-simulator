# Phase 3: Environment & Furniture Managers

## Status: Completed ✅

### Completed Tasks
- [x] Analyze MainScene.ts logic for environment and furniture handling
- [x] Extract EnvironmentManager logic (walls/floors/expansion rendering) - ALREADY IMPLEMENTED
- [x] Extract FurnitureManager logic (shelves/tables/counters rendering) - ALREADY IMPLEMENTED
- [x] Implement Dependency Injection pattern - ALREADY USED IN MainScene
- [x] Add public getters for groups (fixed accessibility in FurnitureManager)
- [x] Add initializeFurniture() method to FurnitureManager
- [x] Add comprehensive JSDoc Vietnamese documentation for both managers
- [x] Add drawDashedRect() helper method to EnvironmentManager for blueprint preview
- [x] All files compile successfully without errors

### Implementation Details

#### EnvironmentManager.ts Changes
- Extended JSDoc with complete class documentation
- Added missing `drawDashedRect()` method for dashed rectangle drawing in preview
- Methods documented:
  - `initializeEnvironment()` - Initial setup
  - `refreshEnvironment()` - Update when expansion changes
  - `updatePhysicalWalls()` - Update collision bodies
  - `getShopBounds()`, `getDoorLocation()` - Public getters
  - `drawFloor()`, `drawWalls()`, `drawOutside()` - Rendering methods

#### FurnitureManager.ts Changes
- Changed `shelvesGroup`, `tablesGroup`, `cashierGroup` from private to public (required by MainScene collision setup)
- Extended JSDoc with complete class documentation showing component flow
- Added `initializeFurniture()` public method that wraps `displayAllFurniture()`
- All methods now have comprehensive Vietnamese JSDoc including:
  - `displayAllFurniture()` - Render all furniture from gameStore
  - `displayShelf()`, `displayTable()`, `displayCashier()` - Individual rendering
  - `updateFurnitureDisplay()` - Update only labels/text
  - `removeFurniture()` - Remove individual items
  - `clearAllFurniture()` - Clear all objects
  - `destroy()` - Cleanup for scene shutdown

### Dependency Injection Verification
✅ EnvironmentManager(scene: Phaser.Scene)
✅ FurnitureManager(scene: Phaser.Scene)
✅ No circular dependencies between managers
✅ MainScene acts as orchestrator for both managers
✅ Managers don't directly call each other

### Next Steps (Phase 4)
- Create NPCManager for customer AI and behavior
- Extract NPC state machine logic from MainScene.ts
- Implement pathfinding and movement logic
- Handle NPC interactions (shopping, paying, leaving)

### Key Files
- src/game/MainScene.ts - Source of logic to extract
- src/game/managers/EnvironmentManager.ts - New/existing
- src/game/managers/FurnitureManager.ts - New/existing
- src/stores/modules/shopStore.ts - Provides state for managers

### Phase 3 Deliverables
- Clean separation of environment rendering logic
- Clean separation of furniture rendering logic
- Dependency Injection pattern implemented
- JSDoc documentation for both managers
