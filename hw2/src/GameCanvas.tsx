import { useEffect, useRef, useState } from "react";
import {
  BG_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  OVEN_ZONE,
  REGISTER_ZONE,
  BURGER_STATION_ZONE,
  PLAYER_RADIUS,
  PLAYER_SPEED_PX_PER_SEC,
  PLAYER_CAPACITY,
  OVEN_STACK_MAX,
  BURGER_STATION_STACK_MAX,
  REGISTER_STACK_MAX,
  OVEN_PRODUCE_INTERVAL_S,
  BURGER_PRODUCE_INTERVAL_S,
  TAKE_RATE_PER_SEC,
  DROP_RATE_PER_SEC,
  CUSTOMER_SPAWN_INTERVAL_MIN_S,
  CUSTOMER_SPAWN_INTERVAL_MAX_S,
  CUSTOMER_NEED_MIN,
  CUSTOMER_NEED_MAX,
  PRICE_PER_PIZZA,
  LEVEL_TIME_LIMIT_S,
  LEVEL_TARGET_MONEY,
  LEVEL3_TARGET_MONEY,
  COLORS,
  TYPOGRAPHY,
  ISOMETRIC,
  BURGER_STACK_MAX,
} from "./constants";

// ==================== 類型定義 ====================
type Vec2 = { x: number; y: number };
type GamePhase = "L1" | "UPGRADE_SELECT" | "L2" | "L2_UPGRADE_SELECT" | "L3" | "WIN" | "LOSE";
type ProductType = 'pizza' | 'burger';

// ==================== 工具函數 ====================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

function pointInAABB(x: number, y: number, zone: { x: number; y: number; w: number; h: number }): boolean {
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== 繪製函數 ====================

function clear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.BG_PRIMARY;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  // 繪製等距地板
  drawIsometricFloor(ctx);
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const playerRef = useRef<Vec2>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const [resetFlag, setResetFlag] = useState(0);
  const pausedRef = useRef(false);
  const pizzaImageRef = useRef<HTMLImageElement | null>(null);
  const characterImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const ovenImageRef = useRef<HTMLImageElement | null>(null);
  const registerImageRef = useRef<HTMLImageElement | null>(null);
  const burgerStationImageRef = useRef<HTMLImageElement | null>(null);
  const burgerImageRef = useRef<HTMLImageElement | null>(null);

  const phaseRef = useRef<GamePhase>("L1");
  const shouldApplyUpgradeRef = useRef<boolean>(false);

  // Runtime tunables (per-level / upgrades)
  const playerCapacityRef = useRef<number>(PLAYER_CAPACITY);
  const playerSpeedRef = useRef<number>(PLAYER_SPEED_PX_PER_SEC);
  const ovenIntervalRef = useRef<number>(OVEN_PRODUCE_INTERVAL_S);
  const burgerIntervalRef = useRef<number>(BURGER_PRODUCE_INTERVAL_S);
  const spawnMinRef = useRef<number>(CUSTOMER_SPAWN_INTERVAL_MIN_S);
  const spawnMaxRef = useRef<number>(CUSTOMER_SPAWN_INTERVAL_MAX_S);
  const needMinRef = useRef<number>(CUSTOMER_NEED_MIN);
  const needMaxRef = useRef<number>(CUSTOMER_NEED_MAX);
  const priceRef = useRef<number>(PRICE_PER_PIZZA);
  const timeLimitRef = useRef<number>(LEVEL_TIME_LIMIT_S);
  const targetMoneyRef = useRef<number>(LEVEL_TARGET_MONEY);
  const takeRateRef = useRef<number>(TAKE_RATE_PER_SEC); //拿取效率
  const dropRateRef = useRef<number>(DROP_RATE_PER_SEC);

  // Upgrade selection state
  const upgradeIndexRef = useRef<number>(0); // 0..3 in 2x2 grid
  const upgradeAppliedRef = useRef<boolean>(false);

  // 載入圖片資源
  useEffect(() => {
    // 載入披薩圖片
    const pizzaImg = new Image();
    pizzaImg.src = '/pizza.png';
    pizzaImg.onload = () => {
      pizzaImageRef.current = pizzaImg;
    };

    // 載入烤爐圖片
    const ovenImg = new Image();
    ovenImg.src = '/pizza_oven.png';
    ovenImg.onload = () => {
      ovenImageRef.current = ovenImg;
    };

    // 載入收銀台圖片
    const registerImg = new Image();
    registerImg.src = '/cash-register.png';
    registerImg.onload = () => {
      registerImageRef.current = registerImg;
    };

    // 載入漢堡煎台圖片
    const burgerStationImg = new Image();
    burgerStationImg.src = '/burger_fry_station.png';
    burgerStationImg.onload = () => {
      burgerStationImageRef.current = burgerStationImg;
    };

    // 載入漢堡圖片
    const burgerImg = new Image();
    burgerImg.src = '/burger.png';
    burgerImg.onload = () => {
      burgerImageRef.current = burgerImg;
    };

    // 載入角色圖片
    const characterPaths = [
      'character-employee',
      'character-female-a', 'character-female-b', 'character-female-c', 
      'character-female-d', 'character-female-e', 'character-female-f',
      'character-male-a', 'character-male-b', 'character-male-c',
      'character-male-d', 'character-male-e', 'character-male-f'
    ];

    characterPaths.forEach(path => {
      const img = new Image();
      img.src = `/${path}.png`;
      img.onload = () => {
        characterImagesRef.current[path] = img;
      };
    });
  }, []);

  // 鍵盤事件處理
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "r") {
        setResetFlag((v) => v + 1); // 重新開始遊戲
      }
      if (e.key.toLowerCase() === "p") {
        pausedRef.current = !pausedRef.current; // 暫停/繼續
      }

      // 升級選單控制
      if (phaseRef.current === "UPGRADE_SELECT" || phaseRef.current === "L2_UPGRADE_SELECT") {
        const key = e.key.toLowerCase();
        if (["arrowup", "w"].includes(key)) upgradeIndexRef.current = (upgradeIndexRef.current + 2) % 4;
        if (["arrowdown", "s"].includes(key)) upgradeIndexRef.current = (upgradeIndexRef.current + 2) % 4;
        if (["arrowleft", "a"].includes(key)) upgradeIndexRef.current = (upgradeIndexRef.current + 3) % 4;
        if (["arrowright", "d"].includes(key)) upgradeIndexRef.current = (upgradeIndexRef.current + 1) % 4;
        if (key === " " || key === "space") {
          shouldApplyUpgradeRef.current = true; // 確認升級選擇
        }
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // 遊戲主迴圈
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const context = ctx as CanvasRenderingContext2D;

    let running = true;
    let last = performance.now();

    // ==================== 遊戲狀態變數 ====================
    let handCount = 0; // 玩家手上商品數量
    let ovenStack = 0; // 烤爐披薩堆疊
    let registerStack = 0; // 收銀台披薩堆疊
    let burgerStationStack = 0; // L3: 漢堡煎台堆疊
    let registerBurgerStack = 0; // L3: 收銀台漢堡堆疊
    let playerProductType: ProductType | null = null; // L3: 玩家手上拿的商品類型
    let money = 0; // 金錢
    let soldCount = 0; // 已售出商品數量
    let timeLeft = timeLimitRef.current; // 剩餘時間
    let lastOvenProduce = 0; // 烤爐生產計時器
    let lastBurgerProduce = 0; // L3: 漢堡煎台生產計時器
    let finished = false; // 遊戲是否結束
    let won = false; // 是否勝利
    let loseTimer = 0; // 失敗後自動重置計時器

    // 顧客類型定義
    type Customer = { 
      id: number;
      need: number; 
      productType: ProductType;
      patience: number;
      maxPatience: number;
    };
    const customers: Customer[] = []; // 顧客佇列
    let nextCustomerIn = randomRange(spawnMinRef.current, spawnMaxRef.current); // 下一個顧客生成時間

    // 浮動文字系統（用於販售回饋）
    type FloatingText = { x: number; y: number; text: string; ttl: number };
    const floatingTexts: FloatingText[] = [];

    // ==================== 遊戲主迴圈函數 ====================
    function step(now: number) {
      if (!running) return;
      const dtRaw = (now - last) / 1000;
      // 計算增量時間（暫停時為0）
      const dt = pausedRef.current || finished || phaseRef.current === "UPGRADE_SELECT" || phaseRef.current === "L2_UPGRADE_SELECT" ? 0 : dtRaw;
      last = now;

      // ==================== 玩家移動更新 ====================
      const player = playerRef.current;
      const k = keysRef.current;
      const up = k["w"] || k["arrowup"]; 
      const down = k["s"] || k["arrowdown"]; 
      const left = k["a"] || k["arrowleft"]; 
      const right = k["d"] || k["arrowright"]; 

      // 計算移動方向
      let moveX = 0;
      let moveY = 0;
      if (left) moveX -= 1;
      if (right) moveX += 1;
      if (up) moveY -= 1;
      if (down) moveY += 1;
      
      // 正規化移動向量並應用速度
      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY) || 1;
        moveX /= len; 
        moveY /= len; 
        player.x += moveX * playerSpeedRef.current * dt;
        player.y += moveY * playerSpeedRef.current * dt;
      }

      // 邊界檢查（世界AABB）
      player.x = clamp(player.x, PLAYER_RADIUS, GAME_WIDTH - PLAYER_RADIUS);
      player.y = clamp(player.y, PLAYER_RADIUS, GAME_HEIGHT - PLAYER_RADIUS);

      // 確保當手上沒有商品時，productType 被重置
      if (handCount === 0) {
        playerProductType = null;
      }

      // ==================== 生產系統更新 ====================
      // 烤爐生產披薩
      lastOvenProduce += dt;
      while (lastOvenProduce >= ovenIntervalRef.current) {
        lastOvenProduce -= ovenIntervalRef.current;
        if (ovenStack < OVEN_STACK_MAX) ovenStack += 1;
      }

      // 漢堡煎台生產漢堡（僅L3）
      if (phaseRef.current === 'L3') {
        lastBurgerProduce += dt;
        while (lastBurgerProduce >= burgerIntervalRef.current) {
          lastBurgerProduce -= burgerIntervalRef.current;
          if (burgerStationStack < BURGER_STATION_STACK_MAX) burgerStationStack += 1; 
        }
      }

      // ==================== 拿取/放下系統更新 ====================
      // 檢查玩家是否在各個區域內
      const inOven = pointInAABB(player.x, player.y, OVEN_ZONE);
      const inRegister = pointInAABB(player.x, player.y, REGISTER_ZONE);
      const inBurgerStation = phaseRef.current === 'L3' && pointInAABB(player.x, player.y, BURGER_STATION_ZONE);

      // L3: 單一商品限制 - 玩家只能拿一種商品
      const canTakePizza = phaseRef.current !== 'L3' || (playerProductType === null || playerProductType === 'pizza');
      const canTakeBurger = phaseRef.current === 'L3' && (playerProductType === null || playerProductType === 'burger');

      // 從烤爐拿取披薩
      if (inOven && ovenStack > 0 && handCount < playerCapacityRef.current && canTakePizza) {
        const canTake = Math.min(
          ovenStack,
          playerCapacityRef.current - handCount,
          takeRateRef.current * dt
        );
        if (canTake > 0) {
          ovenStack -= canTake;
          handCount += canTake;
          playerProductType = 'pizza'; // 從烤爐拿取的都是披薩
        }
      }

      // 從漢堡煎台拿取漢堡
      if (inBurgerStation && burgerStationStack > 0 && handCount < playerCapacityRef.current && canTakeBurger) {
        const canTake = Math.min(
          burgerStationStack,
          playerCapacityRef.current - handCount,
          takeRateRef.current * dt
        );
        if (canTake > 0) {
          burgerStationStack -= canTake;
          handCount += canTake;
          playerProductType = 'burger'; // 從漢堡煎台拿取的都是漢堡
        }
      }

      // 在收銀台放下商品
      if (inRegister && handCount > 0) {
        // L3: 放下披薩
        if (phaseRef.current === 'L3' && playerProductType === 'pizza' && registerStack < REGISTER_STACK_MAX) {
          const canDrop = Math.min(
            handCount,
            REGISTER_STACK_MAX - registerStack,
            dropRateRef.current * dt
          );
          if (canDrop > 0) {
            handCount -= canDrop;
            registerStack += canDrop;
            if (handCount < 1) playerProductType = null; //手上沒有商品
          }
        } 
        // L3: 放下漢堡
        else if (phaseRef.current === 'L3' && playerProductType === 'burger' && registerBurgerStack < BURGER_STACK_MAX) {
          const canDrop = Math.min(
            handCount,
            BURGER_STACK_MAX - registerBurgerStack,
            dropRateRef.current * dt
          );
          if (canDrop > 0) {
            handCount -= canDrop;
            registerBurgerStack += canDrop;
            if (handCount < 1) playerProductType = null;
          }
        } 
        // L1/L2: 放下披薩
        else if (phaseRef.current !== 'L3' && registerStack < REGISTER_STACK_MAX) {
          const canDrop = Math.min(
            handCount,
            REGISTER_STACK_MAX - registerStack,
            dropRateRef.current * dt
          );
          if (canDrop > 0) {
            handCount -= canDrop;
            registerStack += canDrop;
          }
        }
      }

      // ==================== 顧客系統更新 ====================
      // 生成新顧客
      nextCustomerIn -= dt;
      if (nextCustomerIn <= 0) {
        const productType: ProductType = phaseRef.current === 'L3' ? 
          (Math.random() < 0.5 ? 'pizza' : 'burger') : 'pizza';
        customers.push({ 
          id: Date.now() + Math.random(),
          need: randomInt(needMinRef.current, needMaxRef.current),
          productType,
          patience: 30, // 30秒耐心
          maxPatience: 30
        });
        nextCustomerIn = randomRange(spawnMinRef.current, spawnMaxRef.current);
      }

      // ==================== 販售系統更新 ====================
      // 整批販售邏輯：只有當收銀台有足夠商品滿足顧客完整需求時才販售
      if (customers.length > 0) {
        const firstCustomer = customers[0];
        
        // L3: 根據商品類型檢查對應的堆疊
        if (phaseRef.current === 'L3') {
          // 販售披薩
          if (firstCustomer.productType === 'pizza' && registerStack >= firstCustomer.need) {
            registerStack -= firstCustomer.need;
            const earnedMoney = firstCustomer.need * priceRef.current;
            money += earnedMoney;
            soldCount += firstCustomer.need;
            customers.shift();
            
            // 顯示賺取金錢的浮動文字
            floatingTexts.push({
              x: REGISTER_ZONE.x + REGISTER_ZONE.w / 2,
              y: REGISTER_ZONE.y - 8,
              text: `+$${earnedMoney}`,
              ttl: 1.0
            });
          } 
          // 販售漢堡
          else if (firstCustomer.productType === 'burger' && registerBurgerStack >= firstCustomer.need) {
            registerBurgerStack -= firstCustomer.need;
            const earnedMoney = firstCustomer.need * priceRef.current;
            money += earnedMoney;
            soldCount += firstCustomer.need;
            customers.shift();
            
            // 顯示賺取金錢的浮動文字
            floatingTexts.push({
              x: REGISTER_ZONE.x + REGISTER_ZONE.w / 2,
              y: REGISTER_ZONE.y - 8,
              text: `+$${earnedMoney}`,
              ttl: 1.0
            });
          }
        } else {
          // L1/L2: 只有披薩
          if (registerStack >= firstCustomer.need) {
            registerStack -= firstCustomer.need;
            const earnedMoney = firstCustomer.need * priceRef.current;
            money += earnedMoney;
            soldCount += firstCustomer.need;
            customers.shift();
            
            // 顯示賺取金錢的浮動文字
            floatingTexts.push({
              x: REGISTER_ZONE.x + REGISTER_ZONE.w / 2,
              y: REGISTER_ZONE.y - 8,
              text: `+$${earnedMoney}`,
              ttl: 0.7,
            });
          }
        }
      }

      // ==================== 遊戲狀態檢查 ====================
      // 時間倒數
      timeLeft = Math.max(0, timeLeft - dt);
      if (!finished && timeLeft <= 0) {
        if (phaseRef.current === "L1") {
          // L1結束：檢查是否過關
          if (money >= targetMoneyRef.current) {
            phaseRef.current = "UPGRADE_SELECT";
          } else {
            finished = true; // L1失敗
            won = false;
          }
        } else if (phaseRef.current === "L2") {
          // L2結束：檢查是否過關
          if (money >= targetMoneyRef.current) {
            phaseRef.current = "L2_UPGRADE_SELECT";
            upgradeAppliedRef.current = false; // 重置升級標記
          } else {
            finished = true; // L2失敗
            won = false;
          }
        } else if (phaseRef.current === "L3") {
          finished = true;
          won = money >= targetMoneyRef.current;
        }
      }

      // ==================== 失敗處理 ====================
      // 失敗後自動返回L1
      if (finished && !won) {
        loseTimer += dtRaw;
        if (loseTimer > 1.2) {
          hardResetToL1(); // 重置到L1初始狀態
          finished = false;
          won = false;
          loseTimer = 0;
        }
      }

      // ==================== 渲染系統 ====================
      clear(context);

      // 繪製家具和設備（使用精靈圖）
      drawOvenWithSprite(context, OVEN_ZONE, ovenImageRef.current || undefined);
      drawRegisterWithSprite(context, REGISTER_ZONE, registerImageRef.current || undefined);
      
      // L3: 繪製漢堡煎台
      if (phaseRef.current === 'L3') {
        drawBurgerStationWithSprite(context, BURGER_STATION_ZONE, burgerStationImageRef.current || undefined);
      }
      
      // 區域：僅保留邏輯（無視覺覆蓋）

      // 玩家角色（使用精靈圖）
      drawPlayerWithSprite(context, player.x, player.y, handCount >= playerCapacityRef.current - 0.001, characterImagesRef.current);
      // 視覺化玩家手上攜帶的商品（玩家旁邊的小堆疊）
      drawCarriedProducts(context, player.x, player.y, handCount, playerProductType, pizzaImageRef.current || undefined, burgerImageRef.current || undefined);

      // 繪製披薩堆疊（3D效果）
      // 僅在有披薩時繪製烤爐披薩堆疊
      if (ovenStack > 0) {
        drawPizzaStack(context, OVEN_ZONE.x + OVEN_ZONE.w / 2 , OVEN_ZONE.y + OVEN_ZONE.h - 20 - 60, ovenStack, OVEN_STACK_MAX, pizzaImageRef.current || undefined);
      }
      
      // 僅在有披薩時繪製收銀台披薩堆疊
      if (registerStack > 0) {
        drawPizzaStack(context, REGISTER_ZONE.x + REGISTER_ZONE.w / 2 , REGISTER_ZONE.y + REGISTER_ZONE.h - 20 - 60, registerStack, REGISTER_STACK_MAX, pizzaImageRef.current || undefined);
      }

      // L3: 繪製漢堡堆疊
      if (phaseRef.current === 'L3') {
        // 僅在有漢堡時繪製漢堡煎台漢堡堆疊
        if (burgerStationStack > 0) {
          drawBurgerStack(context, BURGER_STATION_ZONE.x + BURGER_STATION_ZONE.w / 2, BURGER_STATION_ZONE.y + BURGER_STATION_ZONE.h - 20 - 60, burgerStationStack, 20, burgerImageRef.current || undefined);
        }
        
        // 僅在有漢堡時繪製收銀台漢堡堆疊
        if (registerBurgerStack > 0) {
          drawBurgerStack(context, REGISTER_ZONE.x + REGISTER_ZONE.w / 2 + 50, REGISTER_ZONE.y + REGISTER_ZONE.h - 20 - 60, registerBurgerStack, 30, burgerImageRef.current || undefined);
        }
      }

      // 玩家手上商品指示器（改進的樣式）
      drawPlayerHandIndicator(context, player.x, player.y - 30, handCount, playerCapacityRef.current);

      // ==================== UI系統 ====================
      // 收銀台附近的佇列視覺效果
      drawCustomerQueueWithSprites(context, customers, characterImagesRef.current);

      // 區域內的提示文字
      if (inOven) drawPrompt(context, OVEN_ZONE.x + OVEN_ZONE.w / 2, OVEN_ZONE.y - 6, `拿取中… +${takeRateRef.current}/s`);
      if (inRegister) drawPrompt(context, REGISTER_ZONE.x + REGISTER_ZONE.w / 2, REGISTER_ZONE.y - 6, `放置中… +${dropRateRef.current}/s`);
      if (inBurgerStation) drawPrompt(context, BURGER_STATION_ZONE.x + BURGER_STATION_ZONE.w / 2, BURGER_STATION_ZONE.y - 6, `拿取中… +${takeRateRef.current}/s`);

      // 浮動金錢文字效果
      updateAndDrawFloatingTexts(context, dt);

      // HUD頂部UI
      drawHUD(context, money, timeLeft, customers, handCount, ovenStack, registerStack, playerCapacityRef.current, targetMoneyRef.current, phaseRef.current, burgerStationStack, registerBurgerStack);

      // ==================== 升級選單系統 ====================
      // L1升級選單覆蓋層
      if (phaseRef.current === "UPGRADE_SELECT") {
        drawUpgradeOverlay(context, soldCount, money, upgradeIndexRef.current, takeRateRef.current);
        if (shouldApplyUpgradeRef.current) {
          _performUpgrade();
          shouldApplyUpgradeRef.current = false;
        }
      }

      // L2升級選單覆蓋層
      if (phaseRef.current === "L2_UPGRADE_SELECT") {
        drawL2UpgradeOverlay(context, soldCount, money, upgradeIndexRef.current);
        if (shouldApplyUpgradeRef.current) {
          _performL2Upgrade();
          shouldApplyUpgradeRef.current = false;
        }
      }

      // overlays
      if (pausedRef.current) drawOverlay(context, "暫停 (按 P 繼續)");
      if (finished) {
        const msg = won ? "LEVEL CLEAR!" : "LOSE - Returning to L1...";
        drawOverlay(context, msg);
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
    return () => {
      running = false;
    };
    
    function hardResetToL1() {
      // Reset tunable refs
      phaseRef.current = "L1";
      upgradeAppliedRef.current = false;
      shouldApplyUpgradeRef.current = false;
      playerCapacityRef.current = PLAYER_CAPACITY;
      playerSpeedRef.current = PLAYER_SPEED_PX_PER_SEC;
      ovenIntervalRef.current = OVEN_PRODUCE_INTERVAL_S;
      spawnMinRef.current = CUSTOMER_SPAWN_INTERVAL_MIN_S;
      spawnMaxRef.current = CUSTOMER_SPAWN_INTERVAL_MAX_S;
      needMinRef.current = CUSTOMER_NEED_MIN;
      needMaxRef.current = CUSTOMER_NEED_MAX;
      priceRef.current = PRICE_PER_PIZZA;
      timeLimitRef.current = LEVEL_TIME_LIMIT_S;
      targetMoneyRef.current = LEVEL_TARGET_MONEY;
      takeRateRef.current = TAKE_RATE_PER_SEC;
      dropRateRef.current = DROP_RATE_PER_SEC;

      // Reset runtime local state (L1 start)
      soldCount = 0;
      money = 0;
      timeLeft = timeLimitRef.current;
      ovenStack = 0;
      registerStack = 0;
      handCount = 0;
      customers.splice(0, customers.length);
      nextCustomerIn = randomRange(spawnMinRef.current, spawnMaxRef.current);
    }
    function _performUpgrade() {
      if (upgradeAppliedRef.current) return;
      const idx = upgradeIndexRef.current; // 0..3
      // 0: capacity +5, 1: speed +25%, 2: oven efficiency +25%, 3: take efficiency +1/s
      if (idx === 0) playerCapacityRef.current += 5;
      if (idx === 1) playerSpeedRef.current *= 1.25;
      if (idx === 2) ovenIntervalRef.current = ovenIntervalRef.current / 1.25;
      if (idx === 3) takeRateRef.current += 1;
      // Configure L2
      spawnMinRef.current = 1.6; //顧客生成間隔 
      spawnMaxRef.current = 2.8;
      needMinRef.current = 2; //顧客需求量下限
      needMaxRef.current = 4; //顧客需求量上限
      priceRef.current = 10; //顧客收入
      timeLimitRef.current = 60;
      targetMoneyRef.current = 350; 

      // reset level state for L2
      phaseRef.current = "L2";
      upgradeAppliedRef.current = true;
      soldCount = 0;
      money = 0;
      timeLeft = timeLimitRef.current;
      ovenStack = 0;
      registerStack = 0;
      handCount = 0;
      customers.splice(0, customers.length);
      nextCustomerIn = randomRange(spawnMinRef.current, spawnMaxRef.current);
    }
    
    function _performL2Upgrade() {
      if (upgradeAppliedRef.current) return;
      const idx = upgradeIndexRef.current; // 0..3
      // L2 升級選項：0: capacity +5, 1: speed +25%, 2: 所有工作台效率 +25%, 3: 拿效率 +1/s
      if (idx === 0) playerCapacityRef.current += 5;
      if (idx === 1) playerSpeedRef.current *= 1.25;
      if (idx === 2) {
        ovenIntervalRef.current = ovenIntervalRef.current / 1.25;
        // 漢堡煎台效率也會提升（在 L3 中生效）
      }
      if (idx === 3) takeRateRef.current += 1;
      
      // Configure L3
      spawnMinRef.current = 0.5; // 顧客生成間隔 p
      spawnMaxRef.current = 1.5; // 顧客生成間隔
      needMinRef.current = 1; // 顧客需求量下限a
      needMaxRef.current = 3; // 顧客需求量上限
      priceRef.current = 10; // 顧客收入
      timeLimitRef.current = 60;
      targetMoneyRef.current = LEVEL3_TARGET_MONEY; // 400

      // reset level state for L3
      phaseRef.current = "L3";
      upgradeAppliedRef.current = true;
      soldCount = 0;
      money = 0;
      timeLeft = timeLimitRef.current;
      ovenStack = 0;
      registerStack = 0;
      burgerStationStack = 0; // L3 新增
      registerBurgerStack = 0; // L3 新增
      handCount = 0;
      playerProductType = null; // L3 新增
      customers.splice(0, customers.length);
      nextCustomerIn = randomRange(spawnMinRef.current, spawnMaxRef.current);
    }

  }, [resetFlag]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} style={{ border: "1px solid #ddd", background: BG_COLOR }} />
    </div>
  );
}


function drawHUD(
  ctx: CanvasRenderingContext2D,
  money: number,
  timeLeft: number,
  customers: { need: number; productType?: ProductType }[],
  hand: number,
  oven: number,
  register: number,
  capacity: number,
  target: number,
  phase: GamePhase,
  burgerStation?: number,
  registerBurger?: number
) {
  const padding = 12;
  const badgeHeight = 28;
  
  // Background with subtle shadow
  ctx.fillStyle = COLORS.SHADOW_LIGHT;
  ctx.fillRect(0, 2, GAME_WIDTH, badgeHeight);
  
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = COLORS.UI_BG;
  ctx.fillRect(0, 0, GAME_WIDTH, badgeHeight);
  ctx.restore();

  // Border
  ctx.strokeStyle = COLORS.UI_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, GAME_WIDTH, badgeHeight);

  ctx.fillStyle = COLORS.UI_TEXT;
  ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
  
  const timeStr = formatTime(Math.ceil(timeLeft));
  const items = [
    { text: `$${Math.floor(money)}/${target}`, color: money >= target ? COLORS.UI_SUCCESS : COLORS.UI_TEXT },
    { text: `⏱ ${timeStr}`, color: timeLeft < 30 ? COLORS.UI_WARNING : COLORS.UI_TEXT },
    { text: `🎒 ${Math.floor(hand)}/${capacity}`, color: COLORS.UI_TEXT },
    { text: `🔥 ${Math.floor(oven)}`, color: COLORS.UI_TEXT },
    { text: `🧾 ${Math.floor(register)}`, color: COLORS.UI_TEXT },
  ];
  
  // L3: 添加漢堡信息
  if (phase === 'L3') {
    items.push({ text: `🍳 ${Math.floor(burgerStation || 0)}`, color: COLORS.UI_TEXT }); //漢堡煎台堆疊
    items.push({ text: `🍔 ${Math.floor(registerBurger || 0)}`, color: COLORS.UI_TEXT });
  }
  
  items.push({ text: `👥 ${customers.length}`, color: COLORS.UI_TEXT });
  items.push({ text: `↑↓←→ 移動, P 暫停, R 重玩`, color: COLORS.UI_TEXT });
  
  if (phase === 'L3') {
    items.push({ text: `! 每次搬運只能拿單一品項`, color: COLORS.UI_TEXT }); //漢堡煎台堆疊
  }

  let x = padding;
  for (const item of items) {
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, x, 20);
    x += ctx.measureText(item.text).width + 20;
  }
}


function drawOverlay(ctx: CanvasRenderingContext2D, text: string) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_TITLE} ${TYPOGRAPHY.FONT_FAMILY}`;
  const metrics = ctx.measureText(text);
  const x = (GAME_WIDTH - metrics.width) / 2;
  const y = GAME_HEIGHT / 2;
  ctx.fillText(text, x, y);
}

function drawUpgradeOverlay(ctx: CanvasRenderingContext2D, soldCount: number, money: number, selectedIndex: number, takeRateRef: number) {
  // Dim background
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.restore();

  // Title
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_TITLE} ${TYPOGRAPHY.FONT_FAMILY}`;
  const title = `Level 1 WIN!  銷量 ${soldCount}  收入 $${money}`;
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, (GAME_WIDTH - tw) / 2, 80);

  // Cards 2x2
  const cardW = 220;
  const cardH = 100;
  const gap = 24;
  const startX = (GAME_WIDTH - (cardW * 2 + gap)) / 2;
  const startY = 140;
  const cards = [
    { title: "手持上限 +5", desc: `目前 ${PLAYER_CAPACITY}` },
    { title: "移動速度 +25%", desc: `目前 ${PLAYER_SPEED_PX_PER_SEC}px/s` },
    { title: "烤爐效率 +25%", desc: `目前 ${OVEN_PRODUCE_INTERVAL_S}s/片` },
    { title: "拿披薩效率 +1片/s", desc: `目前 ${takeRateRef}片/s` },
  ];
  //這段for在select upgrade的時候會被執行，所以需要重新render upgrade的時候畫面才會更新
  for (let i = 0; i < 4; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    ctx.fillStyle = i === selectedIndex ? "#ffffff" : "#f7f7f7";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = i === selectedIndex ? COLORS.UI_SUCCESS : COLORS.UI_BORDER;
    ctx.lineWidth = i === selectedIndex ? 3 : 1;
    ctx.strokeRect(x, y, cardW, cardH);

    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.fillText(cards[i].title, x + 12, y + 32);
    ctx.font = `${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.fillStyle = "#666";
    ctx.fillText(cards[i].desc, x + 12, y + 58);
  }

  // Hint
  ctx.fillStyle = "#fff";
  ctx.font = `${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
  const hint = "↑↓←→ 選擇  Space 確認";
  const hw = ctx.measureText(hint).width;
  ctx.fillText(hint, (GAME_WIDTH - hw) / 2, GAME_HEIGHT - 40);
}

function drawL2UpgradeOverlay(ctx: CanvasRenderingContext2D, soldCount: number, money: number, selectedIndex: number) {
  // Dim background
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.restore();

  // Title
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_TITLE} ${TYPOGRAPHY.FONT_FAMILY}`;
  const title = `Level 2 WIN!  銷量 ${soldCount}  收入 $${money}`;
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, (GAME_WIDTH - tw) / 2, 80);

  // Cards 2x2
  const cardW = 220;
  const cardH = 100;
  const gap = 24;
  const startX = (GAME_WIDTH - (cardW * 2 + gap)) / 2;
  const startY = 140;
  const cards = [
    { title: "手持上限 +5", desc: `目前 ${PLAYER_CAPACITY}` },
    { title: "移動速度 +25%", desc: `目前 ${PLAYER_SPEED_PX_PER_SEC}px/s` },
    { title: "所有工作台效率 +25%", desc: `烤爐+漢堡煎台` },
    { title: "拿效率 +1片/s", desc: `披薩+漢堡` },
  ];
  
  for (let i = 0; i < 4; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    ctx.fillStyle = i === selectedIndex ? "#ffffff" : "#f7f7f7";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = i === selectedIndex ? COLORS.UI_SUCCESS : COLORS.UI_BORDER;
    ctx.lineWidth = i === selectedIndex ? 3 : 1;
    ctx.strokeRect(x, y, cardW, cardH);

    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.fillText(cards[i].title, x + 12, y + 32);
    ctx.font = `${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.fillStyle = "#666";
    ctx.fillText(cards[i].desc, x + 12, y + 58);
  }

  // Hint
  ctx.fillStyle = "#fff";
  ctx.font = `${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
  const hint = "↑↓←→ 選擇  Space 確認";
  const hw = ctx.measureText(hint).width;
  ctx.fillText(hint, (GAME_WIDTH - hw) / 2, GAME_HEIGHT - 40);
}

// Isometric drawing functions
function drawIsometricFloor(ctx: CanvasRenderingContext2D) {
  const tileSize = ISOMETRIC.TILE_SIZE;
  const cols = Math.ceil(GAME_WIDTH / tileSize) + 2;
  const rows = Math.ceil(GAME_HEIGHT / tileSize) + 2;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileSize;
      const y = row * tileSize;
      const isEven = (row + col) % 2 === 0;
      
      ctx.fillStyle = isEven ? COLORS.FLOOR_TILE_A : COLORS.FLOOR_TILE_B;
      ctx.fillRect(x, y, tileSize, tileSize);
      
      // Add subtle border
      ctx.strokeStyle = COLORS.SHADOW_LIGHT;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }
}

function drawIsometricOven(ctx: CanvasRenderingContext2D, zone: { x: number; y: number; w: number; h: number }) {
  const { x, y, w, h } = zone;
  
  // Base shadow
  ctx.fillStyle = COLORS.SHADOW_MEDIUM;
  ctx.fillRect(x + 4, y + 4, w, h);
  
  // Main oven body
  ctx.fillStyle = COLORS.OVEN_BODY;
  ctx.fillRect(x, y, w, h);
  
  // Oven door
  ctx.fillStyle = COLORS.OVEN_DOOR;
  ctx.fillRect(x + w * 0.2, y + h * 0.1, w * 0.6, h * 0.8);
  
  // Door handle
  ctx.fillStyle = COLORS.COUNTER_WOOD;
  ctx.fillRect(x + w * 0.7, y + h * 0.4, 8, 4);
  
  // Top surface
  ctx.fillStyle = COLORS.COUNTER_TOP;
  ctx.fillRect(x, y - 8, w, 8);
}

function drawIsometricRegister(ctx: CanvasRenderingContext2D, zone: { x: number; y: number; w: number; h: number }) {
  const { x, y, w, h } = zone;
  
  // Base shadow
  ctx.fillStyle = COLORS.SHADOW_MEDIUM;
  ctx.fillRect(x + 4, y + 4, w, h);
  
  // Main register body
  ctx.fillStyle = COLORS.REGISTER_BODY;
  ctx.fillRect(x, y, w, h);
  
  // Screen area
  ctx.fillStyle = COLORS.REGISTER_SCREEN;
  ctx.fillRect(x + w * 0.1, y + h * 0.2, w * 0.8, h * 0.6);
  
  // Counter top
  ctx.fillStyle = COLORS.COUNTER_TOP;
  ctx.fillRect(x, y - 8, w, 8);
  
  // Wooden base
  ctx.fillStyle = COLORS.COUNTER_WOOD;
  ctx.fillRect(x, y + h - 12, w, 12);
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, isMax: boolean) {
  // Shadow
  ctx.fillStyle = COLORS.SHADOW_LIGHT;
  ctx.beginPath();
  ctx.arc(x + 2, y + 2, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  
  // Main body
  ctx.fillStyle = COLORS.PLAYER_BODY;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  
  // Uniform details
  ctx.fillStyle = COLORS.PLAYER_UNIFORM;
  ctx.fillRect(x - 8, y - 4, 16, 8);
  
  // MAX indicator
  if (isMax) {
    ctx.fillStyle = COLORS.UI_ACCENT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("MAX", x, y - PLAYER_RADIUS - 8);
    ctx.textAlign = "left";
  }
}

// 堆疊披薩在烤箱和收銀機上
function drawPizzaStack(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, _max: number, pizzaImage?: HTMLImageElement) {
  if (count < 1) return;
  
  const stackHeight = Math.min(count, 8); // Visual limit
  const pizzaSize = 60; // Size of pizza image
  const pizzaHeight = 3; // Height spacing between pizzas
  
  for (let i = 0; i < stackHeight; i++) {
    const offsetY = y - i * pizzaHeight;
    const offsetX = x + (i % 2) * 2; // Slight stagger
    
    if (pizzaImage) {
      // Draw pizza image with shadow
      ctx.save();
      ctx.shadowColor = COLORS.SHADOW_MEDIUM;
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.drawImage(pizzaImage, offsetX - pizzaSize/2, offsetY - pizzaSize/2, pizzaSize, pizzaSize);
      ctx.restore();
    } else {
      // Fallback to drawn pizza if image not loaded
      const pizzaRadius = pizzaSize / 2;
      
      // Shadow
      ctx.fillStyle = COLORS.SHADOW_LIGHT;
      ctx.beginPath();
      ctx.arc(offsetX + 1, offsetY + 1, pizzaRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Pizza crust
      ctx.fillStyle = COLORS.PIZZA_CRUST;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, pizzaRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Topping
      ctx.fillStyle = COLORS.PIZZA_TOPPING;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, pizzaRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      
      // Cheese
      ctx.fillStyle = COLORS.PIZZA_CHEESE;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, pizzaRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Count badge
  if (count > 0) {
    ctx.fillStyle = COLORS.UI_BG;
    ctx.fillRect(x - 12, y - stackHeight * pizzaHeight - 20, 24, 16);
    ctx.strokeStyle = COLORS.UI_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 12, y - stackHeight * pizzaHeight - 20, 24, 16);
    
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(count).toString(), x, y - stackHeight * pizzaHeight - 8);
    ctx.textAlign = "left";
  }
}

function drawPlayerHandIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, current: number, max: number) {
  // Background badge
  ctx.fillStyle = COLORS.UI_BG;
  ctx.fillRect(x - 20, y - 8, 40, 16);
  ctx.strokeStyle = COLORS.UI_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 20, y - 8, 40, 16);
  
  // Text
  ctx.fillStyle = COLORS.UI_TEXT;
  ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(current)}/${max}`, x, y + 2);
  ctx.textAlign = "left";
}

// 堆疊商品在玩家手上
function drawCarriedProducts(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, productType: ProductType | null, pizzaImage?: HTMLImageElement, burgerImage?: HTMLImageElement) {
  if (count <= 0) return;
  const maxVisual = 8; // avoid clutter
  const n = Math.min(maxVisual, Math.floor(count));
  const size = 30;
  
  // Draw a small stack at player's right side
  for (let i = 0; i < n; i++) {
    const offsetY = 10 + y - i * 4; // small vertical stack
    const offsetX = x + 22 + (i % 2) * 2; // slight stagger to the right
    
    // L1/L2: 默認是披薩，L3: 根據 productType 決定
    const isPizza = productType === null || productType === 'pizza';
    
    if (isPizza && pizzaImage) {
      ctx.save();
      ctx.shadowColor = COLORS.SHADOW_LIGHT;
      ctx.shadowBlur = 1;
      ctx.drawImage(pizzaImage, offsetX - size / 2, offsetY - size / 2, size, size);
      ctx.restore();
    } else if (isPizza) {
      // Fallback pizza drawing
      ctx.fillStyle = COLORS.PIZZA_CRUST;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.PIZZA_TOPPING;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.PIZZA_CHEESE;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (productType === 'burger') {
      if (burgerImage) {
        // Use burger sprite
        ctx.save();
        ctx.shadowColor = COLORS.SHADOW_LIGHT;
        ctx.shadowBlur = 1;
        ctx.drawImage(burgerImage, offsetX - size/2, offsetY - size/2, size, size);
        ctx.restore();
      } else {
        // Fallback burger drawing
        ctx.fillStyle = COLORS.PIZZA_CRUST;
        ctx.fillRect(offsetX - size/2, offsetY - size/2, size, size);
        
        // Add burger details
        ctx.fillStyle = "#8B4513"; // Brown for meat
        ctx.fillRect(offsetX - size/2 + 2, offsetY - size/2 + 5, size - 4, 3);
        
        ctx.fillStyle = "#228B22"; // Green for lettuce
        ctx.fillRect(offsetX - size/2 + 2, offsetY - size/2 + 8, size - 4, 2);
        
        ctx.fillStyle = "#FFD700"; // Yellow for cheese
        ctx.fillRect(offsetX - size/2 + 2, offsetY - size/2 + 11, size - 4, 2);
      }
    }
  }
}

// 堆疊披薩在玩家手上 (保留舊函數以備用)


// New character sprite functions
function drawPlayerWithSprite(ctx: CanvasRenderingContext2D, x: number, y: number, isMax: boolean, characterImages?: Record<string, HTMLImageElement>) {
  if (characterImages?.['character-employee']) {
    // Use employee sprite
    const spriteSize = 80;
    ctx.drawImage(characterImages['character-employee'], x - spriteSize/2, y - spriteSize/2, spriteSize, spriteSize);
  } else {
    // Fallback to drawn player
    drawPlayer(ctx, x, y, isMax);
  }
  
  // MAX indicator
  if (isMax) {
    ctx.fillStyle = COLORS.UI_ACCENT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("MAX", x, y - PLAYER_RADIUS - 8);
    ctx.textAlign = "left";
  }
}

function drawCustomerQueueWithSprites(ctx: CanvasRenderingContext2D, customers: { need: number; productType?: ProductType }[], characterImages?: Record<string, HTMLImageElement>) {
  const baseX = REGISTER_ZONE.x + REGISTER_ZONE.w + 12;
  let y = REGISTER_ZONE.y + 24;
  
  // Available customer character types
  const customerTypes = [
    'character-female-a', 'character-female-b', 'character-female-c',
    'character-male-a', 'character-male-b', 'character-male-c'
  ];
  
  for (let i = 0; i < Math.min(customers.length, 6); i++) {
    const c = customers[i];
    const bubbleX = baseX;
    const bubbleY = y + i * 24;
    
    // Select character type based on customer index
    const characterType = customerTypes[i % customerTypes.length];
    
    if (characterImages?.[characterType]) {
      // Use character sprite
      const spriteSize = 60;
      ctx.drawImage(characterImages[characterType], bubbleX - spriteSize/2, bubbleY - spriteSize/2, spriteSize, spriteSize);
    } else {
      // Fallback to circle
      ctx.fillStyle = COLORS.CUSTOMER_BODY;
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Need text badge (auto-sized to fit text)
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
    const productIcon = c.productType === 'burger' ? '🍔' : '🍕';
    const label = `${productIcon}x${c.need}`;
    const paddingX = 6;
    const paddingY = 3;
    const textW = ctx.measureText(label).width;
    const boxW = textW + paddingX * 2;
    const boxH = 14 + paddingY; // small badge height
    const boxX = bubbleX + 18; // place to the right of the character
    const boxY = bubbleY - boxH / 2;

    ctx.fillStyle = COLORS.UI_BG;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = COLORS.UI_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.fillText(label, boxX + paddingX, bubbleY + (boxH / 2) - 3);
  }
}

function drawOvenWithSprite(ctx: CanvasRenderingContext2D, zone: { x: number; y: number; w: number; h: number }, ovenImage?: HTMLImageElement) {
  const { x, y, w, h } = zone;
  
  if (ovenImage) {
    // Use pizza oven sprite
    ctx.drawImage(ovenImage, x, y, w, h);
  } else {
    // Fallback to drawn oven
    drawIsometricOven(ctx, zone);
  }
}

function drawRegisterWithSprite(ctx: CanvasRenderingContext2D, zone: { x: number; y: number; w: number; h: number }, registerImage?: HTMLImageElement) {
  const { x, y, w, h } = zone;
  
  if (registerImage) {
    // Use cash register sprite
    ctx.drawImage(registerImage, x, y, w, h);
  } else {
    // Fallback to drawn register
    drawIsometricRegister(ctx, zone);
  }
}

function drawBurgerStationWithSprite(ctx: CanvasRenderingContext2D, zone: { x: number; y: number; w: number; h: number }, burgerStationImage?: HTMLImageElement) {
  const { x, y, w, h } = zone;
  
  if (burgerStationImage) {
    // Use burger station sprite
    ctx.drawImage(burgerStationImage, x, y, w, h);
  } else {
    // Fallback to drawn burger station
    ctx.fillStyle = COLORS.OVEN_BODY;
    ctx.fillRect(x, y, w, h);
    
    // Add some details
    ctx.fillStyle = COLORS.OVEN_DOOR;
    ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
    
    // Label
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.fillText("漢堡煎台", x + w/2 - 30, y + h/2);
  }
}

function drawBurgerStack(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, _max: number, burgerImage?: HTMLImageElement) {
  if (count < 1) return;
  
  const stackHeight = Math.min(count, 8); // Visual limit (和披薩一致)
  const burgerSize = 60; // Size of burger image (和披薩一致)
  const burgerHeight = 3; // Height spacing between burgers (和披薩一致)
  
  for (let i = 0; i < stackHeight; i++) { // 堆疊高度
    const offsetY = y - i * burgerHeight;
    const offsetX = x + (i % 2) * 2; // Slight stagger (和披薩一致)
    
    if (burgerImage) {
      // Draw burger image with shadow (和披薩一致的陰影效果)
      ctx.save();
      ctx.shadowColor = COLORS.SHADOW_MEDIUM;
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.drawImage(burgerImage, offsetX - burgerSize/2, offsetY - burgerSize/2, burgerSize, burgerSize);
      ctx.restore();
    } else {
      // Fallback to drawn burger if image not loaded (和披薩一致的fallback結構)
      const burgerRadius = burgerSize / 2;
      
      // Shadow (和披薩一致的陰影)
      ctx.fillStyle = COLORS.SHADOW_LIGHT;
      ctx.beginPath();
      ctx.arc(offsetX + 1, offsetY + 1, burgerRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Burger bun (bottom)
      ctx.fillStyle = COLORS.PIZZA_CRUST;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, burgerRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Meat patty
      ctx.fillStyle = "#8B4513"; // Brown for meat
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, burgerRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      
      // Lettuce
      ctx.fillStyle = "#228B22"; // Green for lettuce
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, burgerRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Count badge (和披薩完全一致的計數顯示)
  if (count > 0) {
    ctx.fillStyle = COLORS.UI_BG;
    ctx.fillRect(x - 12, y - stackHeight * burgerHeight - 20, 24, 16);
    ctx.strokeStyle = COLORS.UI_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 12, y - stackHeight * burgerHeight - 20, 24, 16);
    
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(count).toString(), x, y - stackHeight * burgerHeight - 8);
    ctx.textAlign = "left";
  }
}

function drawPrompt(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = `${TYPOGRAPHY.FONT_SIZE_SMALL} ${TYPOGRAPHY.FONT_FAMILY}`;
  const w = ctx.measureText(text).width + 16;
  const h = 20;
  
  // Background with shadow
  ctx.fillStyle = COLORS.SHADOW_LIGHT;
  ctx.fillRect(x - w / 2 + 2, y - h / 2 + 2, w, h);
  
  ctx.fillStyle = COLORS.UI_BG;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  
  // Border
  ctx.strokeStyle = COLORS.UI_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  
  // Text
  ctx.fillStyle = COLORS.UI_TEXT;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y + 2);
  ctx.textAlign = "left";
}

function updateAndDrawFloatingTexts(ctx: CanvasRenderingContext2D, dt: number) {
  const arr: { x: number; y: number; text: string; ttl: number }[] = (window as any)._ftArr || [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const t = arr[i];
    t.ttl -= dt;
    t.y -= 20 * dt;
    if (t.ttl <= 0) {
      arr.splice(i, 1);
      continue;
    }
    const alpha = Math.min(1, t.ttl / 0.7);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.UI_SUCCESS;
    ctx.font = `bold ${TYPOGRAPHY.FONT_SIZE_LARGE} ${TYPOGRAPHY.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.textAlign = "left";
    ctx.restore();
  }
}


