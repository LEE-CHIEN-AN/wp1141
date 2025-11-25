export const POSTBACK_LABEL_MAP: Record<string, string> = {
  menu: "回主選單",
  "action:connection_troubleshoot": "🚫 無法上網",
  "action:registration_guide": "📝 如何註冊",
  "action:speed_check": "🐢 網速很慢",
  "action:contact": "📞 聯絡網管",
  "network:step1:multiple": "多人同時遇到問題",
  "network:step1:single": "只有我一個人",
  "network:multiple": "多人問題",
  "network:single": "個人問題",
  "network:conn:router": "透過路由器 (Wi-Fi)",
  "network:conn:direct": "電腦直接插網路線",
  "network:multi:check_router": "檢查路由器接線",
  "network:multi:check_traffic": "檢查流量",
  "network:multi:report": "報修 / 錄封包",
  "network:multi:resolved": "拔電源後恢復正常",
  "network:router:troubleshoot": "路由器排查",
  "network:router:fixed": "路由器修好了",
  "network:step2:no_connection": "完全無法連線",
  "network:step2:intermittent": "斷斷續續 / 網速慢",
  "network:hardware_detail": "硬體檢查詳情",
  "network:ip_setting_detail": "IP 設定詳情",
  "network:pinginfo_screenshot": "PingInfoView 截圖教學",
  "network:check_blocked": "查詢是否被封鎖",
  "network:blocked_status": "查詢違規狀態",
  "registration:first_time": "第一次註冊準備",
  "registration:first_time_steps": "第一次註冊步驟",
  "registration:post_registration": "註冊後設定",
  "registration:router": "路由器設定教學",
  "registration:router_mac": "路由器 MAC 設定",
  "registration:router_faq": "路由器常見問題",
  "registration:router_wan": "路由器 WAN 設置",
  "registration:router_mac_issue": "路由器 MAC 調整",
  "registration:router_no_internet": "路由器無法上網",
  "registration:change_mac": "修改 MAC 地址",
  "registration:change_computer": "更換電腦",
  "registration:mac_duplicate": "MAC 重複問題",
  "registration:troubleshoot": "註冊疑難排解",
  "registration:cant_access": "無法進入註冊頁面",
  "registration:data_issue": "住宿組資料問題",
  "registration:no_internet_after": "註冊後無法上網",
  "registration:show_email": "顯示網管 Email",
  "registration:router_steps": "註冊步驟詳解",
  "speed:quota": "查詢流量使用",
  "speed:test": "測速檢測",
  "speed:analysis": "可能原因分析",
  "speed:advanced": "進階排查",
  "contact:info": "聯絡方式",
  "contact:info_list": "提供資訊清單",
  "security:incident": "資安事件通報",
};

export function resolvePostbackDisplayText(
  data?: string,
  fallback?: string
): string | undefined {
  if (!data) return fallback;
  if (POSTBACK_LABEL_MAP[data]) {
    return POSTBACK_LABEL_MAP[data];
  }

  if (data.startsWith("network:symptom:")) {
    const symptom = data.split(":")[2];
    if (symptom === "hardware") return "硬體狀況診斷";
    if (symptom === "config") return "設定檢查";
    if (symptom === "blocked") return "違規 / 封鎖狀態";
  }

  if (data.startsWith("network:multi:")) {
    const action = data.split(":")[2];
    if (action === "check_router") return "檢查路由器接線";
    if (action === "check_traffic") return "檢查流量";
    if (action === "report") return "報修 / 錄封包";
  }

  if (data.startsWith("network:step2:")) {
    const action = data.split(":")[2];
    if (action === "no_connection") return "完全無法連線";
    if (action === "intermittent") return "斷斷續續 / 網速慢";
  }

  return fallback;
}

export function formatPostbackContent(content: string): string {
  if (!content) return content;
  const trimmed = content.trim();

  if (trimmed.startsWith("[Postback]")) {
    const rawData = trimmed.replace("[Postback]", "").trim();
    const label = resolvePostbackDisplayText(rawData);
    return label || rawData;
  }

  const label = resolvePostbackDisplayText(trimmed);
  return label || content;
}

