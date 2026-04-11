# Pokemon TCG Shop Simulator (2D Top-down)

A Vue 3 + Phaser 3 webgame project for simulating a Pokemon TCG cards shop. Players can manage their shop, sell packs/cards, and open packs for rare cards (gacha mechanics).

## Project Overview

- **Main Technologies:** Vue 3 (Composition API), Vite, TypeScript, Phaser 3, Pinia, Tailwind CSS.
- **Architecture:** 
  - **Single Source of Truth:** Pinia stores (`src/stores`) manage the global game state (money, inventory, shop layout).
  - **UI Layer:** Vue components (`src/components`) handle all menus, overlays, and HUD elements.
  - **Game Engine:** Phaser 3 (`src/game`) handles physics, player movement, NPC AI, and rendering the shop floor.
  - **Managers:** The Phaser `MainScene` uses specialized managers (`NPCManager`, `FurnitureManager`, `BuildManager`, `StaffManager`) to handle specific game logic.
  - **Communication:** Vue and Phaser communicate via Pinia store subscriptions and custom event emitters. Direct DOM manipulation from Phaser is forbidden.

## Key Directories

- `src/game/`: Contains Phaser logic, scenes, and managers.
- `src/components/`: Vue UI components.
- `src/stores/`: Pinia modules for global state.
- `src/config/`: Static game data (items, expansion rates, render configurations).
- `src/types/`: TypeScript interfaces and types.
- `docs/`: Technical documentation and project reports.

## Building and Running

### Development
```powershell
npm install
npm run dev
```

### Production Build
```powershell
npm run build
```

### Preview Build
```powershell
npm run preview
```

## Development Conventions

- **Language:** Code in English (variable names, functions, comments), though some documentation/comments may be in Vietnamese as it's a personal project.
- **Modularity:** Keep Vue UI logic strictly separated from Phaser game logic.
- **State Management:** Always use Pinia for any data that needs to be shared between the UI and the Game.
- **Save System:** The project includes an automatic save system (`src/utils/saveSystem.ts`) that persists the Pinia state to `localStorage`.
- **Assets:** SVG assets are used for entities (`player.svg`, `npc.svg`, `shelf.svg`).

## Technical Notes

- The project uses `requestAnimationFrame` indirectly through Phaser's internal game loop.
- Dynamic shop rendering is handled via Phaser Graphics based on `expansionLevel`.
- Collision detection is managed by Phaser Arcade Physics.
- NPCs follow an AI state machine for shopping, queueing at the cashier, and exiting.
