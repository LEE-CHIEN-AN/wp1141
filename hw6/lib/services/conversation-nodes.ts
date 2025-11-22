import {
  createTextWithMenuOption,
  createQuickReply,
  createButtonWithUri,
  createButtonWithMultipleUris,
  createWelcomeMessage,
  type LineMessage,
  type LineButtonTemplate,
  type LineCarouselTemplate,
} from "@/lib/utils/line-templates";
import { DEFAULT_RESPONSES } from "@/lib/gemini/prompts";

/**
 * 節點 2：無法上網 - 問題分類
 */
export function createConnectionTroubleshootNode(): LineMessage {
  return createQuickReply(DEFAULT_RESPONSES.CONNECTION_TROUBLESHOOT, [
    { label: "多人問題", data: "network:multiple", displayText: "多人問題" },
    { label: "個人問題", data: "network:single", displayText: "個人問題" },
    { label: "完全無法連線", data: "network:no_connection", displayText: "完全無法連線" },
    { label: "📋 回主選單", data: "menu", displayText: "回主選單" },
  ]);
}

/**
 * 節點 3：多人問題 - 錄封包流程
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
export function createFirstTimeRegistrationPrepNode(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "第一次註冊 - 前置準備檢查清單",
    template: {
      type: "carousel",
      columns: [
        {
          title: "✅ 確認網段",
          text: "• 確認您的網段是否正確（例如：女八舍）\n• 是否已向宿舍輔導員報到\n• 報到後等住宿組資料更新\n• 等住宿組資料同步到宿舍網路註冊系統",
          actions: [
            {
              type: "postback",
              label: "下一步：註冊步驟",
              data: "registration:first_time_steps",
              displayText: "註冊步驟",
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
          title: "📋 準備資訊",
          text: "• 路由器的 MAC 地址（如果要使用路由器）\n• 或電腦的 MAC 地址（如果直接連電腦）\n• 計中帳號（學號）\n• 計中密碼（預設：身分證字號第一個英文字母小寫+末四碼）",
          actions: [
            {
              type: "postback",
              label: "下一步：註冊步驟",
              data: "registration:first_time_steps",
              displayText: "註冊步驟",
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
          title: "🔌 連接網路",
          text: "• 將網路線插入宿舍座位底下的網路孔\n• 將網路線插入電腦或路由器\n• 確認網路線有正確連接（聽到「喀」一聲）",
          actions: [
            {
              type: "postback",
              label: "下一步：註冊步驟",
              data: "registration:first_time_steps",
              displayText: "註冊步驟",
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
export function createSpeedTestNode(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "測速檢測 - 選擇測速方式",
    template: {
      type: "carousel",
      columns: [
        {
          title: "校內測速",
          text: "使用臺大測速網站：\nhttp://speed.ntu.edu.tw/\n\n校內測速的結果：\n• 下載和上傳速度至少會有 70Mbps 以上\n• 因為流量沒有流出入校外網路\n• 如果校內測速也很慢，可能是其他問題",
          actions: [
            {
              type: "uri",
              label: "開啟測速網站",
              uri: "http://speed.ntu.edu.tw/",
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
          title: "校外測速",
          text: "使用校外測速網站：\n• https://www.speedtest.net/\n\n校外測速結果：\n• 若有被限速，速度將被明顯下降至 1Mbps 以下\n• 一般來說至少都有 50 Mbps 以上\n• 如果校外測速很慢但校內正常，可能是流量超額",
          actions: [
            {
              type: "uri",
              label: "開啟測速網站",
              uri: "https://www.speedtest.net/",
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
 * 節點 23：可能原因分析（Carousel）
 */
export function createSpeedAnalysisNode(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "網速很慢 - 可能原因分析",
    template: {
      type: "carousel",
      columns: [
        {
          title: "多人共用問題",
          text: "可能原因：\n• 多人同時使用同一條線路\n• 6G 給四個人用當然慢\n\n解決建議：\n• 檢查是否有室友在下載大檔案\n• 協調使用時間\n• 如果持續很慢，可能需要錄封包分析",
          actions: [
            {
              type: "postback",
              label: "查看詳細解決方法",
              data: "network:multiple",
              displayText: "錄封包分析",
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
          title: "路由器問題",
          text: "可能原因：\n• 路由器負載過高\n• 路由器故障或老化\n\n解決建議：\n• 重新啟動路由器（關機後等待約 10 秒再重新開機）\n• 檢查路由器燈號是否為異常顏色（如黃燈、橘燈等）\n• 如果問題持續，可能需要更換路由器",
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
          title: "設備異常",
          text: "可能原因：\n• 網路設備異常\n• 光纖線路故障\n\n解決建議：\n• 可以嘗試錄製封包分析，找出問題根源\n• 檢查是否有特定時段特別嚴重\n• 如果全寢室皆無法上網，可能是網路設備或光纖線路故障\n• 請聯絡網管協助進一步排查",
          actions: [
            {
              type: "postback",
              label: "查看詳細解決方法",
              data: "network:multiple",
              displayText: "錄封包分析",
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

