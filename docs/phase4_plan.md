# Phase 4: NPC & AI Manager

## Status: CODE GENERATION COMPLETE ✅

### Completed Tasks
- [x] Create NPCManager.ts class structure (1200+ lines)
- [x] Extract spawnCustomer() logic - public method
- [x] Extract npcLeaveShop() logic - private method with 3-phase animation
- [x] Extract state machine (update loop) logic - handleNPCState() + 10 handlers
- [x] Extract animation and status text logic - updateNPCAnimation(), updateStatusText()
- [x] Extract stuck recovery logic - handleStuckRecovery()
- [x] Add comprehensive JSDoc Vietnamese documentation - full class + all methods
- [ ] Update MainScene.ts to use NPCManager (NEXT)
- [ ] Test NPC behavior with NPCManager (NEXT)

### NPC State Machine States
1. **SPAWN** - NPC entering shop from door
2. **WANDER** - Random movement looking for items/tables
3. **SEEK_ITEM** - Moving towards a shelf
4. **INTERACT** - Taking items from shelf
5. **GO_CASHIER** - Moving to cashier queue
6. **WAITING** - Waiting in cashier queue
7. **WANT_TO_PLAY** - Looking for game table
8. **SEEK_TABLE** - Moving to assigned table
9. **PLAYING** - Playing card game at table
10. **LEAVE** - Exiting shop via door

### Key Methods to Extract
- `spawnCustomer()` - Create and configure new NPC
- `npcLeaveShop(customer)` - Handle leaving with pathfinding
- `updateNPCBehavior(time)` - Main update loop with state machine
- `updateNPCAnimation(customer)` - Handle sprite animations
- `updateStatusText(customer)` - Update overhead label
- `handleStuckRecovery(customer, time)` - Stuck detection and recovery
- Various state handlers: handleSpawn, handleWander, handleSeekItem, etc.

### Dependency Injection
- scene: Phaser.Scene (for physics, time, add, tweens)
- environmentManager: EnvironmentManager (for doorLocation, shopBounds)
- customers array owned by MainScene (managed by NPCManager methods)

### Public API (for MainScene)
- `initializeNPCs()` - Setup spawning events
- `updateNPCs(time)` - Called every frame from MainScene.update()
- `spawnCustomer()` - Spawn new NPC periodically
- `getCustomers()` - Get all active customers
- `getNPCCount()` - Get customer count

### Store Access
- useGameStore() - For placedShelves, placedTables, placedCashiers, etc.

### Phase 3 Improvements
- Reduce MainScene.ts from ~1200 to ~600 lines
- Centralize all NPC AI logic in NPCManager
- Improve maintainability with clear method separation
- Add detailed JSDoc for state machine logic
