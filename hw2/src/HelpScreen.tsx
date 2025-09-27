import { useEffect, useRef } from "react";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TYPOGRAPHY } from "./constants";

interface HelpScreenProps {
  onStartGame: () => void;
}

export default function HelpScreen({ onStartGame }: HelpScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const context = ctx as CanvasRenderingContext2D;

    function drawHelpScreen() {
      // 清除畫布
      context.fillStyle = COLORS.BG_PRIMARY;
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 標題
      context.fillStyle = COLORS.UI_TEXT;
      context.font = `bold ${TYPOGRAPHY.FONT_SIZE_TITLE} ${TYPOGRAPHY.FONT_FAMILY}`;
      context.textAlign = "center";
      context.fillText("🍕 Pizza Ready - 遊戲說明", GAME_WIDTH / 2, 60);

      // 說明內容
      const helpTexts = [
        "🎮 遊戲目標",
        "在時間限制內賺取足夠的金錢完成關卡目標",
        "",
        "🎯 關卡說明",
        "• L1: 60秒內賺取 $200 (僅披薩)",
        "• L2: 60秒內賺取 $350 (僅披薩，難度提升)",
        "• L3: 60秒內賺取 $400 (披薩 + 漢堡)",
        "",
        "🎮 基本操作",
        "WASD 或 方向鍵：移動角色 , P：暫停/繼續遊戲 , R：重新開始遊戲",
        "",
        "🏪 工作站說明",
        "• 🍕 烤爐：生產披薩，站在區域內自動拿取",
        "• 🍳 漢堡煎台：生產漢堡 (僅L3)",
        "• 💰 收銀台：放下商品，顧客自動購買",
        "",
        "⚠️ 重要限制 (L3)",
        "• 每次只能拿一種商品類型，手上有披薩時無法拿漢堡，手上有漢堡時無法拿披薩",
        "• 必須先放下所有商品才能切換類型"
      ];

      // 繪製說明文字 
      context.font = `${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
      context.textAlign = "left";
      
      let y = 100;
      const lineHeight = 22;
      const startX = 40;

      for (const text of helpTexts) {
        if (text === "") {
          y += lineHeight / 2; // 空行
          continue;
        }

        // 檢查是否為標題
        if (text.startsWith("🎮") || text.startsWith("🎯") || text.startsWith("🏪") || 
            text.startsWith("⚠️") || text.startsWith("💡")) {
          context.fillStyle = COLORS.UI_ACCENT;
          context.font = `bold ${TYPOGRAPHY.FONT_SIZE_LARGE} ${TYPOGRAPHY.FONT_FAMILY}`;
        } else if (text.startsWith("•")) {
          context.fillStyle = COLORS.UI_TEXT;
          context.font = `${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
        } else {
          context.fillStyle = COLORS.UI_TEXT;
          context.font = `${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
        }

        context.fillText(text, startX, y);
        y += lineHeight;
      }

      // 開始遊戲提示
      context.fillStyle = COLORS.UI_SUCCESS;
      context.font = `bold ${TYPOGRAPHY.FONT_SIZE_LARGE} ${TYPOGRAPHY.FONT_FAMILY}`;
      context.textAlign = "center";
      context.fillText("按 空白鍵 或 Enter 開始遊戲", GAME_WIDTH / 2, GAME_HEIGHT - 40);
      
      context.fillStyle = COLORS.UI_TEXT;
      context.font = `${TYPOGRAPHY.FONT_SIZE_MEDIUM} ${TYPOGRAPHY.FONT_FAMILY}`;
      context.fillText("或按 H 鍵也可以開始", GAME_WIDTH / 2, GAME_HEIGHT - 15);
      
      context.textAlign = "left";
    }

    // 鍵盤事件處理
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === " " || key === "space" || key === "enter" || key === "h") {
        onStartGame();
      }
    };

    // 繪製說明畫面
    drawHelpScreen();

    // 添加鍵盤事件監聽器
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onStartGame]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <canvas 
        ref={canvasRef} 
        width={GAME_WIDTH} 
        height={GAME_HEIGHT} 
        style={{ 
          border: "1px solid #ddd", 
          background: COLORS.BG_PRIMARY,
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
        }} 
      />
    </div>
  );
}
