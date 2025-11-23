import {
  createTextWithMenuOption,
  createQuickReply,
  createButtonWithUri,
  createButtonWithMultipleUris,
  createWelcomeMessage,
  createFlexMessage,
  createFlexText,
  createFlexButton,
  type LineMessage,
  type LineButtonTemplate,
  type LineCarouselTemplate,
  type LineFlexMessage,
} from "@/lib/utils/line-templates";
import type { LineCarouselTemplate as CarouselType } from "@/lib/utils/line-templates";
import { DEFAULT_RESPONSES } from "@/lib/gemini/prompts";

/**
 * 節點 1：無法上網 - 起始點（影響範圍判定）
 */
export function createConnectionTroubleshootNode(): LineMessage {
  return createQuickReply(
    `收到，宿網小精靈來幫您進行故障排除！🛠️\n\n為了找出原因，請先告訴我這個問題的影響範圍：`,
    [
      { label: "👥 多人/全寢室都壞", data: "network:step1:multiple", displayText: "多人同時遇到問題" },
      { label: "👤 只有我一個人", data: "network:step1:single", displayText: "只有我一個人" },
      { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
    ]
  );
}

/**
 * 節點 D：個人問題 - 連接方式判定
 */
export function createSingleUserConnectionTypeNode(): LineMessage {
  return createQuickReply(
    `好的，針對您個人的連線問題，請問您是透過什麼方式連接宿網的呢？`,
    [
      { label: "📶 透過路由器(WiFi)", data: "network:conn:router", displayText: "透過路由器(WiFi)" },
      { label: "🔌 電腦直接插網路線", data: "network:conn:direct", displayText: "電腦直接插網路線" },
      { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
    ]
  );
}

/**
 * 節點 E：路由器 (WiFi) 排查流程
 */
export function createRouterTroubleshootNode(): LineMessage {
  // 改用 Flex Message 以支援粗體文字
  return createFlexMessage(
    "使用路由器時的黃金救援步驟",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("使用路由器時的黃金救援步驟", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("請先嘗試這兩個「黃金救援步驟」：", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("1️⃣ 重啟大法", "lg", "bold", "#000000"),
            createFlexText("請拔掉路由器的電源線，心中默數 10 秒，再插回去。等待燈號穩定後再試試。", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("2️⃣ 檢查接線", "lg", "bold", "#000000"),
            createFlexText("請確認牆壁出來的那條網路線，是插在路由器的「WAN 孔」（通常顏色特別，或有標示 Internet）。", "sm"),
            createFlexText("⚠️ 千萬不能插在 LAN 孔喔！", "sm", "bold", "#FF0000"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("如果以上都試過還是不行，可能是路由器設定跑掉了。", "sm", "regular", "#666666"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("重啟後可以了", {
              type: "postback",
              data: "network:router:fixed",
              displayText: "重啟後可以了",
            }, "primary"),
            createFlexButton("還是不行，檢查設定", {
              type: "postback",
              data: "registration:router",
              displayText: "還是不行，檢查設定",
            }, "secondary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 E1：路由器問題已解決
 */
export function createRouterFixedNode(): LineMessage {
  return createTextWithMenuOption(
    `太好了！問題解決了！🎉\n\n重啟路由器通常可以解決大部分連線問題。如果之後又遇到類似情況，記得先試試重啟大法！\n\n如果還有其他問題，歡迎隨時詢問！`
  );
}

/**
 * 節點 F：電腦直連 - 症狀診斷 (Carousel Template)
 */
export function createDirectConnectionSymptomNode(): LineMessage {
  const carousel: LineCarouselTemplate = {
    type: "template",
    altText: "請選擇您電腦目前的網路狀態圖示",
    template: {
      type: "carousel",
      columns: [
        {
          title: "顯示「未連接」或紅叉叉",
          text: "電腦認為網路線根本沒插好。",
          actions: [
            {
              type: "postback",
              label: "檢查硬體與線路",
              data: "network:symptom:hardware",
              displayText: "檢查硬體與線路",
            },
          ],
        },
        {
          title: "已連線但無網路 (黃色驚嘆號)",
          text: "線有插好，但 IP 或 DNS 設定錯誤。",
          actions: [
            {
              type: "postback",
              label: "檢查 IP/DNS 設定",
              data: "network:symptom:config",
              displayText: "檢查 IP/DNS 設定",
            },
          ],
        },
        {
          title: "打開網頁被導向特定頁面",
          text: "可能尚未註冊，或是因為中毒/違規被鎖卡了。",
          actions: [
            {
              type: "postback",
              label: "查詢違規狀態",
              data: "network:symptom:blocked",
              displayText: "查詢違規狀態",
            },
          ],
        },
        {
          title: "網路很慢或一直斷線",
          text: "可以連線，但速度異常緩慢或不穩定。",
          actions: [
            {
              type: "postback",
              label: "進行網速與斷線排查",
              data: "action:speed_check",
              displayText: "進行網速與斷線排查",
            },
          ],
        },
      ],
    },
  };
  return carousel;
}

/**
 * 節點 G：硬體檢查流程
 */
export function createHardwareCheckNode(): LineMessage {
  // 改用 Flex Message 以支援粗體文字
  return createFlexMessage(
    "硬體層問題排查",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("硬體層問題排查 🔧", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("請依序檢查以下項目：", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("1️⃣ 檢查網路線", "lg", "bold", "#000000"),
            createFlexText("• 確認網路線有正確插入電腦的網路孔（聽到「喀」一聲）", "sm"),
            createFlexText("• 確認網路線另一端有插入牆壁的網路孔", "sm"),
            createFlexText("• 嘗試更換另一條網路線測試", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("2️⃣ 檢查網路孔", "lg", "bold", "#000000"),
            createFlexText("• 確認牆壁的網路孔燈號是否正常（如果有燈號）", "sm"),
            createFlexText("• 嘗試使用其他網路孔測試", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("3️⃣ 檢查電腦網路卡", "lg", "bold", "#000000"),
            createFlexText("• 確認電腦的網路卡驅動程式已正確安裝", "sm"),
            createFlexText("• 在裝置管理員中檢查網路卡是否有驚嘆號", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("如果以上都檢查過還是不行，可能需要聯絡網管檢查牆壁網路孔。", "sm", "regular", "#666666"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("檢查完還是不行", {
              type: "postback",
              data: "action:contact",
              displayText: "檢查完還是不行",
            }, "primary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 H：設定檢查流程 (IP/DNS 設定)
 */
export function createConfigCheckNode(): LineMessage {
  return createButtonWithMultipleUris(
    `黃色驚嘆號通常代表 IP 設定錯誤。台大宿網必須設定為「自動取得 IP」。\n\n請參考下方教學檢查您的電腦設定：`,
    [
      {
        label: "📖 Windows 設定教學",
        uri: "https://hackmd.io/@RuH9UULLRMuRo2iEsweIqA/H1mFo2-Wll#Windows-%E8%A8%AD%E5%AE%9A",
      },
      {
        label: "📖 Mac 設定教學",
        uri: "https://hackmd.io/@RuH9UULLRMuRo2iEsweIqA/H1mFo2-Wll#Mac-%E8%A8%AD%E5%AE%9A",
      },
    ],
    "IP/DNS 設定檢查教學"
  );
}

/**
 * 節點 I：違規查詢流程
 */
export function createBlockedStatusNode(): LineMessage {
  // 改用 Flex Message 以支援粗體文字
  return createFlexMessage(
    "帳號/資安層問題",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("帳號/資安層問題 🔒", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("如果打開網頁被導向特定頁面（如 140.112.2.197），可能的原因有：", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("1️⃣ 尚未註冊", "lg", "bold", "#000000"),
            createFlexText("• 請確認您是否已完成宿網註冊", "sm"),
            createFlexText("• 如果還沒註冊，請點選「📝 如何註冊」進行註冊", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("2️⃣ 帳號被封鎖", "lg", "bold", "#000000"),
            createFlexText("• 可能因為違規使用（如 BT、P2P 下載）", "sm"),
            createFlexText("• 可能因為電腦中毒導致異常流量", "sm"),
            createFlexText("• 需要聯絡網管查詢封鎖原因", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("3️⃣ MAC 地址問題", "lg", "bold", "#000000"),
            createFlexText("• 可能因為更換設備但未更新 MAC 地址", "sm"),
            createFlexText("• 請點選「📝 如何註冊」→「修改 MAC 地址」進行更新", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("📝 如何註冊", {
              type: "postback",
              data: "action:registration",
              displayText: "如何註冊",
            }, "primary"),
            createFlexButton("📞 聯絡網管查詢", {
              type: "postback",
              data: "action:contact",
              displayText: "聯絡網管查詢",
            }, "secondary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 2-1：個人問題 - 第二個問題（是完全無法連線還是會斷斷續續？）
 * 保留舊版本以向後兼容
 */
export function createSingleUserQuestion2Node(): LineMessage {
  return createQuickReply(
    `了解，這是您個人的網路問題。\n\n請告訴我：\n\n是完全無法連線，還是會斷斷續續或網速很慢？`,
    [
      { label: "完全無法連線", data: "network:step2:no_connection", displayText: "完全無法連線" },
      { label: "會斷斷續續/網速慢", data: "network:step2:intermittent", displayText: "會斷斷續續/網速慢" },
      { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
    ]
  );
}

/**
 * 節點 C：多人問題流程 - 系統化排查（改進版）
 * 根據台大宿網實務經驗，多人同時無法上網的三大原因：
 * 1. 路由器接錯孔（DHCP 衝突）- 最常見
 * 2. 流量超額（多人共用同一 IP）
 * 3. 學校基礎設施故障
 */
export function createMultipleUsersRouterCheckNode(): LineMessage {
  return createFlexMessage(
    "多人同時無法上網 - 系統化排查",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("👥 多人同時無法上網", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("根據台大宿網經驗，多人同時斷線通常有三大原因，請依序檢查：", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("🔴 最常見：路由器接錯孔", "lg", "bold", "#FF0000"),
            createFlexText("• 檢查寢室內所有路由器", "sm"),
            createFlexText("• 確認牆壁網路線是否插在「WAN 孔」", "sm"),
            createFlexText("• 如果插在 LAN 孔，會造成 DHCP 衝突", "sm"),
            createFlexText("• 導致附近同學抓到錯誤的 IP（192.168.x.x）", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("🟡 次常見：流量超額", "lg", "bold", "#FFA500"),
            createFlexText("• 多人共用同一台路由器 = 共用同一個 IP", "sm"),
            createFlexText("• 台大宿網每日流量上限：6GB", "sm"),
            createFlexText("• 超過後會被限速或封鎖", "sm"),
            createFlexText("• 可至計中網站查詢該 IP 流量", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("🟢 較少見：學校設備故障", "lg", "bold", "#1DB446"),
            createFlexText("• 樓層交換器故障", "sm"),
            createFlexText("• 光纖線路異常", "sm"),
            createFlexText("• 需要聯絡網管報修", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("🔍 第一步：檢查路由器接線", {
              type: "postback",
              data: "network:multi:check_router",
              displayText: "檢查路由器接線",
            }, "primary"),
            createFlexButton("📊 第二步：檢查流量", {
              type: "postback",
              data: "network:multi:check_traffic",
              displayText: "檢查流量",
            }, "secondary"),
            createFlexButton("📞 第三步：報修", {
              type: "postback",
              data: "network:multi:report",
              displayText: "報修",
            }, "secondary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 C1：多人問題 - 路由器接線檢查（第一步）
 */
export function createMultipleUsersRouterCheckWiringNode(): LineMessage {
  return createFlexMessage(
    "第一步：檢查路由器接線",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("🔴 最常見原因：路由器接錯孔", "xl", "bold", "#FF0000"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("請立即檢查寢室內所有路由器：", "md", "bold", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("✅ 正確接法：", "lg", "bold", "#1DB446"),
            createFlexText("• 牆壁網路孔 → 路由器的「WAN 孔」", "sm"),
            createFlexText("• WAN 孔通常顏色特別（藍色/黃色）", "sm"),
            createFlexText("• 或有標示「Internet」或「WAN」", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("❌ 錯誤接法（會造成 DHCP 衝突）：", "lg", "bold", "#FF0000"),
            createFlexText("• 牆壁網路孔 → 路由器的「LAN 孔」", "sm"),
            createFlexText("• LAN 孔通常有 1-4 號標示", "sm"),
            createFlexText("• 會導致附近同學抓到 192.168.x.x 錯誤 IP", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("🔧 立即處理步驟：", "lg", "bold", "#000000"),
            createFlexText("1. 拔掉所有路由器的電源", "sm"),
            createFlexText("2. 等待 1 分鐘", "sm"),
            createFlexText("3. 檢查直接插線的電腦是否恢復正常", "sm"),
            createFlexText("4. 如果恢復了，找出接錯的路由器並修正", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("✅ 拔掉後恢復了", {
              type: "postback",
              data: "network:multi:resolved",
              displayText: "恢復了，是路由器的問題",
            }, "primary"),
            createFlexButton("❌ 拔掉後還是不行", {
              type: "postback",
              data: "network:multi:check_traffic",
              displayText: "還是不行，檢查流量",
            }, "secondary"),
            createFlexButton("📖 查看接線教學", {
              type: "uri",
              uri: "https://ut0903.github.io/2024/09/01/ntu-dorm-router-setup/",
            }, "secondary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 C1-1：多人問題 - 路由器問題已解決
 */
export function createMultipleUsersRouterResolvedNode(): LineMessage {
  return createFlexMessage(
    "問題解決了！",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("🎉 太好了！問題解決了！", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("這表示寢室內有某台路由器接錯線，導致 DHCP 衝突。", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("📋 接下來請：", "lg", "bold", "#000000"),
            createFlexText("1. 找出是哪台路由器接錯", "sm"),
            createFlexText("2. 將牆壁網路線改插到「WAN 孔」", "sm"),
            createFlexText("3. 重新啟動路由器", "sm"),
            createFlexText("4. 確認所有同學都能正常上網", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("💡 預防措施：", "lg", "bold", "#000000"),
            createFlexText("• 提醒室友正確接線方式", "sm"),
            createFlexText("• 定期檢查路由器接線", "sm"),
            createFlexText("• 如果不知道如何接線，請參考教學", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("📖 查看路由器接線教學", {
              type: "uri",
              uri: "https://ut0903.github.io/2024/09/01/ntu-dorm-router-setup/",
            }, "primary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 C2：多人問題 - 檢查流量（第二步）
 */
export function createMultipleUsersTrafficCheckNode(): LineMessage {
  return createFlexMessage(
    "第二步：檢查流量是否超額",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("🟡 次常見原因：流量超額", "xl", "bold", "#FFA500"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("如果多人共用同一台路由器，會共用同一個 IP 的流量額度。", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("📊 台大宿網流量限制：", "lg", "bold", "#000000"),
            createFlexText("• 每個 IP 每日流量上限：6GB", "sm"),
            createFlexText("• 超過後會被自動限速（降至 1Mbps 以下）", "sm"),
            createFlexText("• 甚至可能被暫時封鎖", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("🔍 檢查方式：", "lg", "bold", "#000000"),
            createFlexText("1. 登入計中網站查詢該 IP 的流量", "sm"),
            createFlexText("2. 如果流量已超過 6GB，需要等待隔日重置", "sm"),
            createFlexText("3. 或考慮分散使用（部分同學改用其他路由器）", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("💡 解決方案：", "lg", "bold", "#000000"),
            createFlexText("• 如果流量未超額，可能是其他問題", "sm"),
            createFlexText("• 如果流量已超額，請等待隔日重置", "sm"),
            createFlexText("• 或聯絡網管協助處理", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("✅ 流量正常，還是不行", {
              type: "postback",
              data: "network:multi:report",
              displayText: "流量正常，需要報修",
            }, "primary"),
            createFlexButton("📊 查看流量查詢網站", {
              type: "uri",
              uri: "https://140.112.2.197",
            }, "secondary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 C3：多人問題 - 引導報修（第三步）
 */
export function createMultipleUsersReportNode(): LineMessage {
  return createFlexMessage(
    "第三步：報修流程",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("🟢 較少見原因：學校設備故障", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("如果已排除路由器接錯和流量問題，可能是學校基礎設施故障。", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("🔍 可能原因：", "lg", "bold", "#000000"),
            createFlexText("• 該樓層的網路交換器（Switch）當機", "sm"),
            createFlexText("• 整棟宿舍的光纖線路異常", "sm"),
            createFlexText("• 計中機房端的設備問題", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("📞 報修步驟：", "lg", "bold", "#000000"),
            createFlexText("1. 聯絡宿舍網管", "sm"),
            createFlexText("2. 說明情況：多人同時無法上網", "sm"),
            createFlexText("3. 提供資訊：寢室號碼、樓層", "sm"),
            createFlexText("4. 網管會協助錄製封包或直接報修", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("📖 進階：學習錄製封包", "lg", "bold", "#000000"),
            createFlexText("如果網管需要封包分析，可參考以下教學：", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("📖 封包錄製教學", {
              type: "uri",
              uri: "https://hackmd.io/@ntu-dorm-network/rJ8XqQZ8H",
            }, "primary"),
            createFlexButton("📧 聯絡網管", {
              type: "postback",
              data: "action:contact",
              displayText: "聯絡網管",
            }, "secondary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 3：多人問題 - 錄封包流程（保留舊版本以向後兼容）
 */
export function createMultipleUsersPacketCaptureNode(): LineMessage {
  return createTextWithMenuOption(`多人反映網路連不到、太慢 → 錄封包

當多人反映網路連不到、網路瞬斷時，需要錄製封包分析：

📋 準備工作：
1. 先詢問是否是許多人連同一台路由器
   → 如果是，可能是流量問題（6G給四個人用當然慢）

🔧 錄封包步驟：
1. 寄信聯繫網管前往該房間錄製封包或自己依照以下步驟錄製後寄給網管
2. 用網路線連接網孔和有線網卡
3. 開啟 Wireshark，選「乙太網路」
4. 開始錄封包，錄五分鐘
5. 點 save as 存成 .pcap 檔
   檔名：時間 例如 20250514_1310-1315

📤 上傳與回報：
1. 錄完檔案應該很大，上傳到雲端
2. 開分享，檔名：時間 例如 20250514_1310-1315
3. 網管寄封包連結給計中：dormnet@ntu.edu.tw`);
}

/**
 * 節點 4：封包解讀教學
 */
export function createPacketAnalysisGuideNode(): LineMessage {
  return createTextWithMenuOption(`📖 解讀封包

1. 打開 cmd，輸入：ipconfig /all
2. 看現在 IP（例如：192.168.0.100）
3. 在封包中對應來源 IP
   → 前面幾行的來源 IP 是正常現象（可能微軟內部網路機制）

⚠️ 不正常的現象：
• 發現有很多別人的 IP 在大量發射封包
• 影響到你的網速

如果發現異常，請將封包檔案寄給計中分析。`);
}

/**
 * 節點 5：個人問題 - PingInfoView
 */
export function createSingleUserPingInfoViewNode(): LineMessage {
  return createQuickReply(`個人反映瞬斷、網速慢 → 開 PingInfoView

📋 前置確認：
1. 先確認同學是否是連自己手機網路
   → 不是宿舍網路的問題
2. 聯繫網管到同學房間，用網管的電腦接網孔和有線網卡
   → 確認是否為硬體問題（網卡孔、路由器接觸不良）

🔧 PingInfoView 使用步驟：
1. 傳給同學 PingInfoView 宿舍壓縮檔
2. 到他房間，用同學的電腦
3. 開啟 PingInfoView 檔案，解壓縮
4. 開啟應用程式，跑一個晚上

📸 需要截的圖：
• 重點是下面那區，顯示瞬斷的時間
• 雙擊 G8-Gateway 那行，跳出視窗截圖

📤 完成後：
• 跑完一個晚上後，PingInfoView 資料夾內會多出許多檔案
• 請同學將 PingInfoView 整包壓縮
• 檔名：時間 例如 20250514_2110-20250515_0910
• 回傳寄給網管，網管再寄給計中`, [
    { label: "截圖說明", data: "network:pinginfo_screenshot", displayText: "截圖說明" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 6：截圖說明
 */
export function createPingInfoScreenshotGuideNode(): LineMessage {
  return createTextWithMenuOption(`📸 需要截的圖說明

重點是下面那區，顯示瞬斷的時間。

雙擊 G8-Gateway 那行，跳出這個視窗，截圖。`);
}

/**
 * 節點 7：完全無法連線 - 檢查清單（Carousel）
 */
export function createNoConnectionChecklistNode(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "完全無法連線 - 檢查清單",
    template: {
      type: "carousel",
      columns: [
        {
          title: "🔌 硬體檢查",
          text: "• 網路線是否正確插入（聽到「喀」一聲）\n• 網路孔是否有接觸不良\n• 嘗試更換網路線測試\n• 借室友的電腦測試網路孔",
          actions: [
            {
              type: "postback",
              label: "查看詳細步驟",
              data: "network:hardware_detail",
              displayText: "硬體檢查詳細步驟",
            },
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
        {
          title: "⚙️ IP 設定檢查",
          text: "• 確認是否為「自動取得 IP 位址」\n• 確認是否為「自動取得 DNS 伺服器位址」\n• 檢查 IP 是否為 140.112.xxx.xxx\n• 如果 IP 為 169.254.xxx.xxx，表示未取得 IP",
          actions: [
            {
              type: "postback",
              label: "查看詳細步驟",
              data: "network:ip_setting_detail",
              displayText: "IP 設定檢查詳細步驟",
            },
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
        {
          title: "🔒 是否被封鎖",
          text: "• 至台大違規主機名單查詢：\n  http://cert.ntu.edu.tw/Module/Index/ip.php\n• 若被鎖，請先掃毒後回報",
          actions: [
            {
              type: "uri",
              label: "查詢是否被封鎖",
              uri: "http://cert.ntu.edu.tw/Module/Index/ip.php",
            },
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 節點 8：硬體檢查詳細步驟
 */
export function createHardwareCheckDetailNode(): LineMessage {
  return createQuickReply(`🔌 硬體檢查詳細步驟

1. 確認網路線類型
   ⚠️ 請確認是否使用的是「網路線」
   → 電話線雖然長得很像，但並不能通用

2. 檢查網路線插入
   • 如果小方孔上面的蓋子沒辦法用網路線輕輕推入
   → 請用手輕輕把他往旁邊撥
   • 輕輕插入網路孔，直到聽到「喀」一聲
   • 使網路線脫離的方式：輕壓網路插頭上突出可以下壓的部位

3. 交叉測試
   • 如果室友可以正常使用，借他的網路線和電腦
   • 插入你的網路孔測試
   • 若室友的電腦無法透過你的網路孔連上
   → 可能是插座壞了，請報修
   • 若室友的電腦可以透過你的網路孔連上
   → 可能是你的網路線或電腦問題`, [
    { label: "IP 設定檢查", data: "network:ip_setting_detail", displayText: "IP 設定檢查" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 9：IP 設定檢查詳細步驟
 */
export function createIpSettingDetailNode(): LineMessage {
  return createButtonWithUri(
    `⚙️ IP 設定檢查詳細步驟

1. 開啟設定視窗
   • Windows：右下角網路圖示 → 右鍵 → 「開啟網路和共用中心」
   • 點擊「乙太網路」→「內容」→「網際網路通訊協定第 4 版（TCP/IPv4）」

2. 確認設定
   ✅ 自動取得 IP 位址
   ✅ 自動取得 DNS 伺服器位址

3. 檢查 IP
   • 打開 cmd，輸入：ipconfig /all
   • 確認 IP 是否為 140.112.xxx.xxx
   • 如果 IP 為 169.254.xxx.xxx → 未取得 IP
   • 如果 IP 為 192.168.xxx.xxx 或 10.xxx.xxx.xxx
   → 可能有其他人私接無線分享器但接錯插孔

4. 手動設定 IP（如果自動取得失敗）
   請參考註冊成功時顯示的 IP 資訊：
   • IP 位址：140.112.xxx.yyy
   • 子網路遮罩：255.255.255.0
   • 預設閘道：140.112.xxx.254
   • DNS：140.112.254.4 和 140.112.2.2`,
    "查看詳細教學文件",
    "https://ccnet.ntu.edu.tw/ccnet/pages/student_dorm_content/doc/set_ip.pdf",
    "IP 設定檢查詳細步驟"
  );
}

/**
 * 節點 10：如何註冊 - 註冊類型選擇
 */
export function createRegistrationTypeSelectionNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "如何註冊 - 宿網註冊教學",
    template: {
      type: "buttons",
      text: DEFAULT_RESPONSES.REGISTRATION_GUIDE,
      actions: [
        {
          type: "postback",
          label: "第一次註冊",
          data: "registration:first_time",
          displayText: "第一次註冊",
        },
        {
          type: "postback",
          label: "使用路由器",
          data: "registration:router",
          displayText: "使用路由器",
        },
        {
          type: "postback",
          label: "修改 MAC",
          data: "registration:change_mac",
          displayText: "修改 MAC",
        },
        {
          type: "postback",
          label: "疑難排解",
          data: "registration:troubleshoot",
          displayText: "疑難排解",
        },
      ],
    },
  };
}

/**
 * 節點 11：第一次註冊 - 前置準備（Carousel）
 */
export function createFirstTimeRegistrationPrepNode(): LineFlexMessage {
  return createFlexMessage("第一次註冊 - 前置準備檢查清單", [
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("✅ 確認網段", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("• 確認您的網段是否正確（例如：女八舍）", "sm"),
          createFlexText("• 是否已向宿舍輔導員報到", "sm"),
          createFlexText("• 報到後等住宿組資料更新", "sm"),
          createFlexText("• 等住宿組資料同步到宿舍網路註冊系統", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("下一步：註冊步驟", {
            type: "postback",
            data: "registration:first_time_steps",
            displayText: "註冊步驟",
          }),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("📋 準備資訊", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("• 路由器的 MAC 地址（如果要使用路由器）", "sm"),
          createFlexText("• 或電腦的 MAC 地址（如果直接連電腦）", "sm"),
          createFlexText("• 計中帳號（學號）", "sm"),
          createFlexText("• 計中密碼（預設：身分證字號第一個英文字母小寫+末四碼）", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("下一步：註冊步驟", {
            type: "postback",
            data: "registration:first_time_steps",
            displayText: "註冊步驟",
          }),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("🔌 連接網路", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("• 將網路線插入宿舍座位底下的網路孔", "sm"),
          createFlexText("• 將網路線插入電腦或路由器", "sm"),
          createFlexText("• 確認網路線有正確連接（聽到「喀」一聲）", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("下一步：註冊步驟", {
            type: "postback",
            data: "registration:first_time_steps",
            displayText: "註冊步驟",
          }),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
  ]);
}

/**
 * 節點 12：註冊步驟詳細教學
 */
export function createRegistrationStepsDetailNode(): LineMessage {
  return createButtonWithUri(
    `📝 註冊步驟詳細教學

1️⃣ 連接網路
   • 將網路線連接至宿舍網路孔
   • 將網路線連接至電腦或路由器
   • 確認網路線有正確插入

2️⃣ 進入註冊網站
   • 打開瀏覽器（Firefox、Chrome、Safari、Edge）
   • 在網址列輸入：140.112.2.197
   • 按下 Enter
   ⚠️ 此網站要在有連校內網路、IP 在校內才進得去
   ⚠️ 此時就算顯示無網際網路，依舊可以進入到 140.112.2.197
   ⚠️ 其他網頁打不開是正常的

3️⃣ 登入註冊系統
   • 點擊「宿舍網路註冊系統」
   • 使用計中帳號密碼登入
   • 帳號：學號
   • 密碼：註冊計中帳號時的密碼

4️⃣ 完成註冊
   • 登入後點擊「註冊電腦於：[您的宿舍]」
   • 確認 MAC 地址是否正確
   • 若填入的為電腦本身的 MAC，將網路線連接電腦應該即可上網
   • 想用路由器上網須到 140.112.2.197 將 MAC 改為路由器的 MAC

5️⃣ 等待生效
   • 稍等 5 至 10 分鐘
   • 若還不能使用，試試看重新開機
   • 若仍失敗，請參考疑難排解`,
    "查看詳細教學文件",
    "https://ccnet.ntu.edu.tw/ccnet/pages/student_dorm_content/doc/register.pdf",
    "註冊步驟詳細教學"
  );
}

/**
 * 節點 13：註冊後設定
 */
export function createPostRegistrationSetupNode(): LineMessage {
  return createQuickReply(`✅ 註冊後設定

完成註冊後，系統會顯示被分配到的 IP，建議可以記錄下來。

📋 查詢網路設定：
• 可以至 https://dorm.ntu.edu.tw/register/index.php 登入後查詢
• 或查看系統自動 Email 到註冊所填信箱的 IP 資訊

⚙️ 網路參數（如果需要手動設定）：
• IP 位址：140.112.xxx.yyy（註冊時顯示的 IP）
• 子網路遮罩：255.255.255.0
• 預設閘道：IP 位址的最後一碼改成 254
  例如：140.112.30.100 的閘道就是 140.112.30.254
• 慣用 DNS：140.112.254.4
• 其他 DNS：168.95.1.1

💡 使用路由器：
• 若填入的為電腦本身的 MAC，將網路線連接電腦應該即可上網
• 想用路由器上網須到 140.112.2.197 將 MAC 改為路由器的 MAC`, [
    { label: "路由器設定教學", data: "registration:router", displayText: "路由器設定教學" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 14：使用路由器註冊 - 路由器設定
 */
export function createRouterSetupNode(): LineMessage {
  return createButtonWithUri(
    `🔧 路由器設定教學

📋 所需工具：
• 一台路由器
• 一條網路線（通常隨路由器附送）

🔧 設定步驟：

1️⃣ 連接路由器
   • 將網路線連結於路由器上的 WAN 孔與宿舍網路孔之間
   • 將路由器接上電源
   • 用電腦連 WiFi 到路由器

2️⃣ 進入路由器管理頁面
   • 在電腦網址欄輸入「192.168.0.1」（或參考路由器說明書）
   • 輸入帳號和密碼（預設通常為 admin/admin，請參考說明書）

3️⃣ 設定網際網路(WAN)
   • 點擊「網路設定」>「網際網路(WAN)」
   • 修改以下設定：
   
   ✅ 連線類型：改成「固定IP」
   ✅ IP 位址：改成宿網註冊平台中的註冊 IP
      ⚠️ 不是登入 IP，是註冊 IP！
   ✅ 子網路遮罩：輸入「255.255.255.0」
      （如果要輸入遮罩長度，請輸入「24」）
   ✅ 預設閘道：IP 位址的最後一碼改成 254
      例如：140.112.245.100 的閘道就是 140.112.245.254
   ✅ 主要 DNS：140.112.254.4
   ✅ 次要 DNS：168.95.1.1 或 8.8.8.8
   
   ⚠️ 修改完成後請再三確認沒有打錯，記得按儲存

4️⃣ 修改 MAC 位址
   有兩種方法，選一種即可：
   • 方法 1：修改路由器的 MAC
   • 方法 2：修改宿網管理系統的註冊 MAC
   → 把兩個 MAC 位址改成一樣的

5️⃣ 連接網路
   • 把路由器接上網路線到宿舍網路孔
   ⚠️ 注意：要接在有寫 WAN 的網路孔上，不要插錯了

6️⃣ 等待生效
   • 有時候需要等待 5-10 分鐘的學校資料庫更新
   • 可以用電腦或手機試試看能不能連上網路`,
    "查看詳細教學",
    "https://ut0903.github.io/post/router-install",
    "路由器設定教學"
  );
}

/**
 * 節點 15：MAC 地址設定詳細說明（Carousel）
 */
export function createMacAddressSetupNode(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "MAC 地址設定 - 兩種方法",
    template: {
      type: "carousel",
      columns: [
        {
          title: "方法 1：修改路由器的 MAC",
          text: "1. 在路由器管理頁面找到「MAC 位址設定」或「MAC 複製」\n2. 將路由器的 MAC 改成與註冊系統中顯示的 MAC 相同\n3. 儲存設定\n\n💡 如果找不到路由器初始的 MAC 位址：\n   路由器本體的下面通常會寫這台機器的詳細資訊",
          actions: [
            {
              type: "postback",
              label: "路由器常見問題",
              data: "registration:router_faq",
              displayText: "路由器常見問題",
            },
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
        {
          title: "方法 2：修改註冊 MAC",
          text: "1. 進入 140.112.2.197\n2. 使用計中帳號登入\n3. 點擊「修改 MAC」\n4. 修改之 MAC 那格會自動跳出你現在的 MAC\n5. 可以先原封不改，按修改之後等 5-10 分鐘\n6. 連接看看路由器的 WiFi 是否有網路了\n\n⚠️ 適用於有些路由器不能改 MAC（爛路由器）",
          actions: [
            {
              type: "postback",
              label: "路由器常見問題",
              data: "registration:router_faq",
              displayText: "路由器常見問題",
            },
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 節點 16：路由器常見問題
 */
export function createRouterFAQNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "路由器常見問題",
    template: {
      type: "buttons",
      text: "路由器常見問題\n\n請選擇您的問題：",
      actions: [
        {
          type: "postback",
          label: "路由器 WAN 設置",
          data: "registration:router_wan",
          displayText: "路由器 WAN 設置",
        },
        {
          type: "postback",
          label: "MAC 地址問題",
          data: "registration:router_mac",
          displayText: "MAC 地址問題",
        },
        {
          type: "postback",
          label: "路由器無法上網",
          data: "registration:router_no_internet",
          displayText: "路由器無法上網",
        },
        {
          type: "postback",
          label: "📋 回主選單",
          data: "menu",
          displayText: "回主選單",
        },
      ],
    },
  };
}

/**
 * 節點 16-1：路由器 WAN 設置
 */
export function createRouterWANSetupNode(): LineMessage {
  return createTextWithMenuOption(`路由器 WAN 設置說明

可以嘗試看看：
1. 先將您的路由器的網際網路(WAN)設置改成「浮動 IP」
2. 再把網路線插上電腦或路由器
3. 將電腦連接至該 WiFi 後
4. 進入 https://140.112.2.197 後用計中帳號登入
5. 按「修改 MAC」
6. 修改之 MAC 那格會自動跳出你現在的 MAC
7. 可以先原封不改，按修改之後等 5-10 分鐘
8. 連接看看路由器的 WiFi 是否有網路了

⚠️ 如果還是不行，請改回「固定 IP」並按照路由器設定教學操作`);
}

/**
 * 節點 17：修改 MAC 地址
 */
export function createChangeMacAddressNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "修改 MAC 地址",
    template: {
      type: "buttons",
      text: "修改 MAC 地址\n\n請選擇您的情況：",
      actions: [
        {
          type: "postback",
          label: "更換電腦",
          data: "registration:change_computer",
          displayText: "更換電腦",
        },
        {
          type: "postback",
          label: "MAC 重複問題",
          data: "registration:mac_duplicate",
          displayText: "MAC 重複問題",
        },
        {
          type: "postback",
          label: "📋 回主選單",
          data: "menu",
          displayText: "回主選單",
        },
      ],
    },
  };
}

/**
 * 節點 17-1：更換電腦
 */
export function createChangeComputerNode(): LineMessage {
  return createButtonWithUri(
    `更換電腦 - 修改 MAC 地址

由於台大宿舍網路系統有綁定「網路卡位址－IP」對應，電腦更換後必須重新註冊修改網卡 MAC 位址後才能上網。

📋 修改步驟：
1. 開啟瀏覽器，自動導到註冊頁面
   或在瀏覽器網址欄位輸入：140.112.2.197
2. 用你的學校帳號密碼登入
3. 選「修改」成現在的 MAC 位址即可

💡 提示：
• 如果使用他人註冊過的電腦，會出現 MAC 位址與他人重複
• 此時請聯絡網管協助刪除已註冊資料`,
    "查看詳細說明",
    "http://dorm.ntu.edu.tw/register/change_mac.htm",
    "更換電腦 - 修改 MAC 地址"
  );
}

/**
 * 節點 17-2：MAC 重複問題
 */
export function createMacDuplicateNode(): LineMessage {
  return createButtonWithUri(
    `MAC 重複問題解決方法

可能原因：
1. 先前有將電腦用其他帳號註冊
   → 例如：有用臨時帳號註冊過
   → 或將電腦借給其他人註冊過
   
   解決方法：聯絡網管協助刪除舊帳號資料

2. 網卡 MAC 位址與其他人相同
   → 原則上 MAC 位址是不會重複的
   → 但有些電腦製造商可能使用相同的 MAC 位址
   
   解決方法：
   • 洽詢電腦廠商
   • 或手動更改本機網路卡 MAC 位址
   • 然後再重新於註冊頁面修改 MAC 位址

3. 宿舍搬遷時的問題
   → 新宿舍註冊頁面會自動偵測到搬遷訊息
   → 照步驟將舊宿舍資料轉移到新宿舍註冊
   → 如果無法跳出搬遷確認選項
   → 請通知網管幫忙刪除舊宿舍註冊帳號`,
    "查看詳細說明",
    "http://dorm.ntu.edu.tw/register/change_dorm.htm",
    "MAC 重複問題解決方法"
  );
}

/**
 * 節點 18：註冊疑難排解
 */
export function createRegistrationTroubleshootNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "註冊疑難排解",
    template: {
      type: "buttons",
      text: "註冊疑難排解\n\n請選擇您的問題：",
      actions: [
        {
          type: "postback",
          label: "無法進入註冊頁面",
          data: "registration:cant_access",
          displayText: "無法進入註冊頁面",
        },
        {
          type: "postback",
          label: "住宿組資料問題",
          data: "registration:data_issue",
          displayText: "住宿組資料問題",
        },
        {
          type: "postback",
          label: "註冊完無法上網",
          data: "registration:no_internet_after",
          displayText: "註冊完無法上網",
        },
        {
          type: "postback",
          label: "📋 回主選單",
          data: "menu",
          displayText: "回主選單",
        },
      ],
    },
  };
}

/**
 * 節點 18-1：無法進入註冊頁面
 */
export function createCantAccessRegistrationNode(): LineMessage {
  return createQuickReply(`無法進入註冊頁面 - 排除步驟

1. 等待幾分鐘
   → 可能需要等個幾分鐘才能進入

2. 檢查網路設定
   • 查看右下角的圖示是否有黃色驚嘆號
   • 確認網路設定是否為「自動取得 IP 位址」
   • 確認是否為「自動取得 DNS 伺服器位址」

3. 檢查 IP
   • 如果 IP 為 172.27.xxx.xxx → 正常
   • 如果 IP 為 192.168.xxx.xxx 或 10.xxx.xxx.xxx
   → 可能有同宿舍有其他人私接無線分享器但接錯插孔
   → 導致其他人取不到正常 IP
   → 請聯絡網管或計中來故障排除
   
   • 如果 IP 為 169.254.xxx.xxx
   → 表示未取得任何 IP
   → 確定網路線有正確連接
   → 請重開機或關閉再啟用網路卡去自動取得 IP

4. 檢查無線網路
   • 若無法開啟註冊頁面會一直跳出無線網路登入頁面
   → 表示是無線網路卡開啟造成
   → 請將無線網路功能停用或關閉無線網路卡

5. 檢查帳號權限
   • 若帳號無法登入
   → 表示該帳號尚未開通或權限不足
   → 通常發生於新生開學之前
   → 請詢問計中諮詢櫃台(02-33665022)帳號權限
   → 或洽詢住宿組申請住宿臨時帳號`, [
    { label: "IP 設定教學", data: "network:ip_setting_detail", displayText: "IP 設定教學" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 18-2：住宿組資料問題
 */
export function createRegistrationDataIssueNode(): LineMessage {
  return createTextWithMenuOption(`住宿組資料問題

如果註冊頁面顯示「住宿組無住宿資料或資料不完整」：

📋 解決方法：
1. 請聯繫宿舍輔導員
2. 確認是否已向宿舍輔導員報到
3. 報到後等住宿組資料更新
4. 等住宿組資料同步到宿舍網路註冊系統後
5. 應就能進入網站順利註冊

💡 提示：
• 如果從其他宿舍搬遷過來
• 新宿舍註冊頁面會自動偵測到搬遷訊息
• 照步驟將舊宿舍資料轉移到新宿舍註冊即可`);
}

/**
 * 節點 18-4：網域不在女八舍問題
 */
export function createWrongDormSegmentNode(): LineMessage {
  return createFlexMessage(
    "網域不在女八舍 - 解決方法",
    [
      {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("📍 網域不在女八舍", "xl", "bold", "#1DB446"),
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexText("如果您的網域不在女八舍，需要先刪除其他宿舍的註冊資料才能註冊女八舍。", "md", "regular", "#000000", true),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("📧 請寄信給女八舍網管：", "lg", "bold", "#000000"),
            createFlexText("b12705041@ntu.edu.tw", "md", "bold", "#1DB446"),
            createFlexText("（請手動複製 Email 地址）", "xs", "regular", "#666666"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("📋 信件內容請包含：", "lg", "bold", "#000000"),
            createFlexText("• 學號", "sm"),
            createFlexText("• 姓名", "sm"),
            createFlexText("• MAC 地址", "sm"),
            createFlexText("• 目前的網段在哪間宿舍", "sm"),
            {
              type: "separator",
              margin: "md",
            },
            createFlexText("💡 處理流程：", "lg", "bold", "#000000"),
            createFlexText("1. 女八舍網管會聯繫該宿舍網管", "sm"),
            createFlexText("2. 協助刪除您之前的註冊資料", "sm"),
            createFlexText("3. 刪除後即可順利註冊女八舍網段", "sm"),
          ],
          spacing: "sm",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            createFlexButton("📧 複製 Email 地址", {
              type: "postback",
              data: "registration:show_email",
              displayText: "b12705041@ntu.edu.tw",
            }, "primary"),
            createFlexButton("📋 回主選單", {
              type: "postback",
              data: "menu",
              displayText: "回主選單",
            }, "secondary"),
          ],
          spacing: "sm",
        },
      },
    ]
  );
}

/**
 * 節點 18-3：註冊完無法上網
 */
export function createNoInternetAfterRegistrationNode(): LineMessage {
  return createQuickReply(`註冊完等了很久依然無法上網

📋 解決步驟：

1. 檢查 IP 設定
   • 請手動設定網路
   • 參考註冊成功時顯示的 IP 資訊
   • 或查看系統自動 Email 的 IP 資訊

2. 檢查是否被封鎖
   • 至台大違規主機名單查詢：
     http://cert.ntu.edu.tw/Module/Index/ip.php
   • 若有被鎖，請先掃毒後回報

3. 重新開機
   • 有時候作業系統問題會造成網路不正常
   • 請重新開機試試看

4. 修改 MAC 位址
   • 若以上方式都嘗試過也取得 IP 位址但就是無法上網
   • 可以嘗試修改本機網卡 MAC 位址
   • 然後再重新於註冊頁面修改 MAC 位址應該就可以

5. 如果全寢室皆無法上網
   • 可能是網路設備或光纖線路故障
   • 請聯絡網管或輔導員報修`, [
    { label: "IP 設定教學", data: "network:ip_setting_detail", displayText: "IP 設定教學" },
    { label: "檢查是否被封鎖", data: "network:check_blocked", displayText: "檢查是否被封鎖" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 20：網速很慢 - 問題分類
 */
export function createSpeedCheckNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "網速很慢 - 網速與流量查詢",
    template: {
      type: "buttons",
      text: DEFAULT_RESPONSES.SPEED_CHECK,
      actions: [
        {
          type: "postback",
          label: "查詢流量使用",
          data: "speed:quota",
          displayText: "查詢流量使用",
        },
        {
          type: "postback",
          label: "測速檢測",
          data: "speed:test",
          displayText: "測速檢測",
        },
        {
          type: "postback",
          label: "可能原因分析",
          data: "speed:analysis",
          displayText: "可能原因分析",
        },
        {
          type: "postback",
          label: "進階排查",
          data: "speed:advanced",
          displayText: "進階排查",
        },
      ],
    },
  };
}

/**
 * 節點 21：查詢流量使用
 */
export function createQuotaCheckNode(): LineMessage {
  return createButtonWithUri(
    `📊 查詢流量使用

宿舍網路使用規範：
• 一個 IP 每天可存取（包含上、下傳）總流量為 6GB
• 所有應用皆列入計算
• 當日超過此總量限制之個別 IP 的傳輸率將立刻被限制為 1M/256Kbps
• 並於每日上午 8 時重新計算解除

🔗 查詢流量使用情形：

1. 最準確查詢：
   http://dorminfo.cc.ntu.edu.tw/check_quota/

2. 其他查詢網站：
   • http://netmng.cc.ntu.edu.tw/sql_topn/
   • http://dorm.ntu.edu.tw/quota.html

💡 提示：
• 如果流量超過 6GB，會被限速至 1M/256Kbps
• 可以透過測速網站進一步檢測是否被限速`,
    "查詢流量",
    "http://dorminfo.cc.ntu.edu.tw/check_quota/",
    "查詢流量使用"
  );
}

/**
 * 節點 22：測速檢測（Carousel）
 */
export function createSpeedTestNode(): LineMessage {
  return createFlexMessage("測速檢測 - 選擇測速方式", [
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("校內測速", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("使用臺大測速網站：", "sm", "bold"),
          createFlexText("http://speed.ntu.edu.tw/", "sm", "regular", "#0066CC"),
          {
            type: "separator",
            margin: "md",
          },
          createFlexText("校內測速的結果：", "sm", "bold"),
          createFlexText("• 下載和上傳速度至少會有 70Mbps 以上", "sm"),
          createFlexText("• 因為流量沒有流出入校外網路", "sm"),
          createFlexText("• 如果校內測速也很慢，可能是其他問題", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("開啟測速網站", {
            type: "uri",
            uri: "http://speed.ntu.edu.tw/",
          }, "primary"),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("校外測速", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("使用校外測速網站：", "sm", "bold"),
          createFlexText("https://www.speedtest.net/", "sm", "regular", "#0066CC"),
          {
            type: "separator",
            margin: "md",
          },
          createFlexText("校外測速結果：", "sm", "bold"),
          createFlexText("• 若有被限速，速度將被明顯下降至 1Mbps 以下", "sm"),
          createFlexText("• 一般來說至少都有 50 Mbps 以上", "sm"),
          createFlexText("• 如果校外測速很慢但校內正常，可能是流量超額", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("開啟測速網站", {
            type: "uri",
            uri: "https://www.speedtest.net/",
          }, "primary"),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
  ]);
}

/**
 * 節點 23：可能原因分析（Flex Message）
 */
export function createSpeedAnalysisNode(): LineMessage {
  return createFlexMessage("網速很慢 - 可能原因分析", [
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("多人共用問題", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("可能原因：", "sm", "bold"),
          createFlexText("• 多人同時使用同一條線路", "sm"),
          createFlexText("• 6G 給四個人用當然慢", "sm"),
          {
            type: "separator",
            margin: "md",
          },
          createFlexText("解決建議：", "sm", "bold"),
          createFlexText("• 檢查是否有室友在下載大檔案", "sm"),
          createFlexText("• 協調使用時間", "sm"),
          createFlexText("• 如果持續很慢，可能需要錄封包分析", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("查看詳細解決方法", {
            type: "postback",
            data: "network:multiple",
            displayText: "錄封包分析",
          }, "primary"),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("路由器問題", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("可能原因：", "sm", "bold"),
          createFlexText("• 路由器負載過高", "sm"),
          createFlexText("• 路由器故障或老化", "sm"),
          {
            type: "separator",
            margin: "md",
          },
          createFlexText("解決建議：", "sm", "bold"),
          createFlexText("• 重新啟動路由器（關機後等待約 10 秒再重新開機）", "sm"),
          createFlexText("• 檢查路由器燈號是否為異常顏色（如黃燈、橘燈等）", "sm"),
          createFlexText("• 如果問題持續，可能需要更換路由器", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
    {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("設備異常", "lg", "bold", "#1DB446"),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexText("可能原因：", "sm", "bold"),
          createFlexText("• 網路設備異常", "sm"),
          createFlexText("• 光纖線路故障", "sm"),
          {
            type: "separator",
            margin: "md",
          },
          createFlexText("解決建議：", "sm", "bold"),
          createFlexText("• 可以嘗試錄製封包分析，找出問題根源", "sm"),
          createFlexText("• 檢查是否有特定時段特別嚴重", "sm"),
          createFlexText("• 如果全寢室皆無法上網，可能是網路設備或光纖線路故障", "sm"),
          createFlexText("• 請聯絡網管協助進一步排查", "sm"),
        ],
        spacing: "sm",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          createFlexButton("查看詳細解決方法", {
            type: "postback",
            data: "network:multiple",
            displayText: "錄封包分析",
          }, "primary"),
          createFlexButton("📋 回主選單", {
            type: "postback",
            data: "menu",
            displayText: "回主選單",
          }, "secondary"),
        ],
        spacing: "sm",
      },
    },
  ]);
}

/**
 * 節點 24：進階排查
 */
export function createAdvancedTroubleshootNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "進階排查方法",
    template: {
      type: "buttons",
      text: "進階排查方法\n\n如果一般方法無法解決，可以嘗試以下進階排查：",
      actions: [
        {
          type: "postback",
          label: "錄封包分析",
          data: "network:multiple",
          displayText: "錄封包分析",
        },
        {
          type: "postback",
          label: "PingInfoView 檢測",
          data: "network:single",
          displayText: "PingInfoView 檢測",
        },
        {
          type: "postback",
          label: "📋 回主選單",
          data: "menu",
          displayText: "回主選單",
        },
      ],
    },
  };
}

/**
 * 節點 30：聯絡網管
 */
export function createContactNode(): LineButtonTemplate {
  return {
    type: "template",
    altText: "聯絡網管",
    template: {
      type: "buttons",
      text: DEFAULT_RESPONSES.CONTACT,
      actions: [
        {
          type: "postback",
          label: "聯絡方式",
          data: "contact:info",
          displayText: "聯絡方式",
        },
        {
          type: "postback",
          label: "提供資訊清單",
          data: "contact:info_list",
          displayText: "提供資訊清單",
        },
      ],
    },
  };
}

/**
 * 節點 30-1：聯絡方式
 */
export function createContactInfoNode(): LineMessage {
  return createQuickReply(`📞 聯絡網管 - 聯絡方式

📧 電子郵件：
• b12705041@ntu.edu.tw
• 請詳細描述問題並附上相關資訊


💡 提供資訊：
聯絡時請準備：
• 姓名、學號、房位
• 問題描述
• 已嘗試的解決方法
• 相關截圖或錯誤訊息
• IP 位址（如果有的話）
• MAC 位址（如果有的話）`, [
    { label: "提供資訊清單", data: "contact:info_list", displayText: "提供資訊清單" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 30-2：提供資訊清單（Carousel）
 */
export function createContactInfoListNode(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "聯絡網管 - 需要提供的資訊",
    template: {
      type: "carousel",
      columns: [
        {
          title: "基本資訊",
          text: "• 姓名\n• 學號\n• 房位\n• 手機號碼\n• 問題發生時間",
          actions: [
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
        {
          title: "問題描述",
          text: "• 詳細的問題描述\n• 問題發生的頻率\n• 是否影響其他裝置\n• 已嘗試的解決方法",
          actions: [
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
        {
          title: "技術資訊",
          text: "• IP 位址\n• MAC 位址\n• 網路設定截圖\n• 錯誤訊息截圖\n• 相關日誌檔案",
          actions: [
            {
              type: "postback",
              label: "📋 回主選單",
              data: "menu",
              displayText: "回主選單",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 節點 31：資安事件處理
 */
export function createSecurityIncidentNode(): LineMessage {
  return createQuickReply(DEFAULT_RESPONSES.SECURITY_INCIDENT, [
    { label: "查詢是否被封鎖", data: "network:check_blocked", displayText: "查詢是否被封鎖" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

