// Core balance values and dimensions
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const PLAYER_SPEED_PX_PER_SEC = 180;
export const PLAYER_CAPACITY = 10; //手上最多可拿的披薩數量

export const OVEN_PRODUCE_INTERVAL_S = 1.2; // 烤爐生產速度
export const OVEN_STACK_MAX = 20; //烤爐最多可放的披薩數量
export const REGISTER_STACK_MAX = 30; //轉運台最多可放的披薩數量

//轉運速度
export const TAKE_RATE_PER_SEC = 2; // from oven
export const DROP_RATE_PER_SEC = 3; // to register

export const CUSTOMER_SPAWN_INTERVAL_MIN_S = 2.5;
export const CUSTOMER_SPAWN_INTERVAL_MAX_S = 4.0;
export const CUSTOMER_NEED_MIN = 1;
export const CUSTOMER_NEED_MAX = 3;
export const PRICE_PER_PIZZA = 10;

export const LEVEL_TIME_LIMIT_S = 60; //遊戲時長
export const LEVEL_TARGET_MONEY = 200;

// L3 漢堡系統常數
export const BURGER_PRICE = 10; // 漢堡售價
export const BURGER_STACK_MAX = 30; // 收銀台漢堡堆疊上限
export const BURGER_PRODUCE_INTERVAL_S = 1.2; // 漢堡煎台生產速度
export const BURGER_STATION_STACK_MAX = 20; // 漢堡煎台最多可放的漢堡數量

// L3 目標
export const LEVEL3_TARGET_MONEY = 400;

// Zones (AABB)
export const OVEN_ZONE = { x: 680, y: 60, w: 200, h: 160 };
export const REGISTER_ZONE = { x: 80, y: 300, w: 260, h: 160 };
export const BURGER_STATION_ZONE = { x: 680, y: 250, w: 200, h: 160 }; // 漢堡煎台區域

// Visual Design Specs
export const PLAYER_RADIUS = 16;

// Color Palette (High Saturation + Soft Shadows)
export const COLORS = {
  // Background & Floor
  BG_PRIMARY: "#f8f4f0",      // Warm cream
  BG_SECONDARY: "#f0ebe5",    // Slightly darker cream
  FLOOR_TILE_A: "#e8ddd4",    // Light tile
  FLOOR_TILE_B: "#d4c4b0",    // Dark tile
  
  // Furniture & Equipment
  COUNTER_WOOD: "#8b4513",    // Rich brown
  COUNTER_TOP: "#f5deb3",     // Beige countertop
  OVEN_BODY: "#ff6b35",       // Vibrant orange
  OVEN_DOOR: "#ff8c42",       // Lighter orange
  REGISTER_BODY: "#4a90e2",   // Bright blue
  REGISTER_SCREEN: "#2c5aa0", // Darker blue
  
  // Pizza & Food
  PIZZA_CRUST: "#d4a574",     // Golden crust
  PIZZA_TOPPING: "#ff4757",   // Red sauce
  PIZZA_CHEESE: "#ffd700",    // Golden cheese
  
  // Characters & UI
  PLAYER_BODY: "#2ecc71",     // Vibrant green
  PLAYER_UNIFORM: "#27ae60",  // Darker green
  CUSTOMER_BODY: "#95a5a6",  // Neutral gray
  
  // UI Elements
  UI_BG: "#ffffff",           // Pure white
  UI_BORDER: "#34495e",       // Dark gray
  UI_TEXT: "#2c3e50",        // Dark blue-gray
  UI_ACCENT: "#e74c3c",       // Red accent
  UI_SUCCESS: "#27ae60",      // Green success
  UI_WARNING: "#f39c12",      // Orange warning
  
  // Shadows
  SHADOW_LIGHT: "rgba(0,0,0,0.1)",
  SHADOW_MEDIUM: "rgba(0,0,0,0.2)",
  SHADOW_DARK: "rgba(0,0,0,0.3)",
} as const;

// Typography
export const TYPOGRAPHY = {
  FONT_FAMILY: "'Noto Sans TC', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  FONT_SIZE_SMALL: "12px",
  FONT_SIZE_MEDIUM: "14px", 
  FONT_SIZE_LARGE: "16px",
  FONT_SIZE_XLARGE: "20px",
  FONT_SIZE_TITLE: "24px",
  FONT_WEIGHT_NORMAL: "400",
  FONT_WEIGHT_BOLD: "700",
} as const;

// Isometric Perspective
export const ISOMETRIC = {
  ANGLE: Math.PI / 6,         // 30 degrees
  SCALE_X: Math.cos(Math.PI / 6),
  SCALE_Y: Math.sin(Math.PI / 6),
  TILE_SIZE: 32,              // Base tile size
} as const;

// Legacy colors for compatibility
export const BG_COLOR = COLORS.BG_PRIMARY;
export const OVEN_COLOR = COLORS.OVEN_BODY;
export const REGISTER_COLOR = COLORS.REGISTER_BODY;
export const ZONE_ALPHA = 0.25;


