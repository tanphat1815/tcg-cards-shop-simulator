/**
 * Centralized Depth (Z-index) configuration for Phaser game objects.
 * Higher values are drawn on top of lower values.
 */
export const DEPTH = {
  OUTSIDE: 1,
  FLOOR: 2,
  WALL_GRAPHICS: 3,
  WALL: 5,
  
  FURNITURE: 10,
  CASHIER: 10,
  TABLE: 10,
  NPC: 15,
  PLAYER: 20,
  
  UI_TEXT: 21,
  UI: 1000, // Top level UI elements
  EDIT_OVERLAY: 900, // Overlay during edit mode
  
  GHOST: 100, // Ghost sprite during placement
  PLACEMENT_VISUALIZER: 150, // Red boxes
  PREVIEW: 200, // Blueprint/expansion preview
};

/**
 * Other rendering constants can be added here
 */
export const RENDER_CONSTANTS = {
  DASH_LEN: 10,
  GAP_LEN: 5,
  THICKNESS_WALL: 40,
  DOOR_WIDTH: 80,
};

export const EXPANSIONS_LOT_A = [
  { id: 1, cost: 500, requiredLevel: 2, rentIncrease: 10 },
  { id: 2, cost: 1500, requiredLevel: 5, rentIncrease: 25 },
  { id: 3, cost: 5000, requiredLevel: 10, rentIncrease: 60 },
  { id: 4, cost: 12000, requiredLevel: 15, rentIncrease: 150 },
  { id: 5, cost: 30000, requiredLevel: 20, rentIncrease: 400 },
];
