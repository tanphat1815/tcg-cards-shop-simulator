/**
 * Centralized Depth (Z-index) configuration for Phaser game objects.
 * Higher values are drawn on top of lower values.
 */
export const DEPTH = {
  OUTSIDE: 1,
  FLOOR: 2,
  WALL_GRAPHICS: 3,
  
  FURNITURE: 10,
  CASHIER: 10,
  TABLE: 10,
  NPC: 15,
  PLAYER: 20,
  
  UI_TEXT: 21,
  
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
