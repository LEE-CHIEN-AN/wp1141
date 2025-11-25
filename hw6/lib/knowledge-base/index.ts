/**
 * 知識庫索引系統
 * 整合多個知識來源，供 Gemini RAG 使用
 */

export interface KnowledgeSource {
  id: string;
  title: string;
  type: "hackmd" | "pdf" | "webpage" | "notion";
  url: string;
  description: string;
  content?: string; // 預先抓取的內容（可選）
  tags: string[];
}

/**
 * 知識庫來源列表
 * 包含所有提供的知識來源
 */
export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: "hackmd-1",
    title: "網管處理事件的步驟和回信",
    type: "hackmd",
    url: "https://hackmd.io/@RuH9UULLRMuRo2iEsweIqA/H1mFo2-Wll",
    description: "網管處理各種事件的標準流程和回信範本",
    tags: ["網管", "處理流程", "回信範本"],
  },
  {
    id: "hackmd-2",
    title: "國立台灣大學宿舍網路使用說明",
    type: "hackmd",
    url: "https://hackmd.io/@AdXSbob-RhG3gBR4lnaNIw/ryEZjbK4Z",
    description: "資工系江廷睿同學整理的宿舍網路使用說明",
    tags: ["使用說明", "網路設定", "基礎知識"],
  },
  {
    id: "webpage-1",
    title: "宿舍網路常見問題",
    type: "webpage",
    url: "https://ccnet.ntu.edu.tw/ccnet/pages/student_dorm_content/doc/dorm_qa.php",
    description: "台大計中官方常見問題頁面",
    tags: ["常見問題", "FAQ", "官方文件"],
  },
  {
    id: "pdf-1",
    title: "台大宿舍網路註冊流程說明",
    type: "pdf",
    url: "https://ccnet.ntu.edu.tw/ccnet/pages/student_dorm_content/doc/register.pdf",
    description: "官方註冊流程 PDF 文件",
    tags: ["註冊", "流程", "官方文件"],
  },
  {
    id: "webpage-2",
    title: "台大宿舍網路路由器零基礎安裝詳解",
    type: "webpage",
    url: "https://ut0903.github.io/post/router-install",
    description: "全圖解路由器安裝教學",
    tags: ["路由器", "安裝", "設定", "教學"],
  },
  {
    id: "webpage-3",
    title: "台大學生都應該要懂的網路基礎知識",
    type: "webpage",
    url: "https://ut0903.github.io/post/web-knowledge",
    description: "網路基礎知識教學",
    tags: ["基礎知識", "網路原理", "教學"],
  },
  {
    id: "webpage-4",
    title: "台大計中網路問題排除教學",
    type: "webpage",
    url: "https://ccnet.ntu.edu.tw/ccnet/dorm.php?page=troubleshooting",
    description: "官方故障排除教學",
    tags: ["故障排除", "問題解決", "官方文件"],
  },
  {
    id: "pdf-2",
    title: "臺灣大學宿舍網路故障排除 SOP",
    type: "pdf",
    url: "https://ccnet.ntu.edu.tw/ccnet/pages/student_dorm_content/doc/qa.pdf",
    description: "官方故障排除 SOP 文件",
    tags: ["故障排除", "SOP", "官方文件"],
  },
  {
    id: "notion-1",
    title: "研一男舍網路管理佈告欄",
    type: "notion",
    url: "https://daweiho.notion.site/ntu-dorm-MenGraduate1-network-853cad6a64974ad680a0e6fd6b8cb63f",
    description: "研一男舍網路管理相關資訊",
    tags: ["網路管理", "宿舍", "佈告欄"],
  },
  {
    id: "webpage-5",
    title: "違規主機、中毒查詢",
    type: "webpage",
    url: "https://cert.ntu.edu.tw/Module/Index/ip.php",
    description: "查詢 IP 是否違規或被封鎖",
    tags: ["違規", "封鎖", "查詢", "資安"],
  },
  {
    id: "pdf-3",
    title: "網路常用工具與原理介紹",
    type: "pdf",
    url: "https://tprc.tanet.edu.tw/tpnet2024/training/1131001.pdf",
    description: "網路工具和原理教學文件",
    tags: ["工具", "原理", "教學"],
  },
];

/**
 * 根據查詢關鍵字搜尋相關知識來源
 */
export function searchKnowledgeSources(query: string): KnowledgeSource[] {
  const lowerQuery = query.toLowerCase();
  const results: KnowledgeSource[] = [];

  for (const source of KNOWLEDGE_SOURCES) {
    // 檢查標題、描述、標籤是否匹配
    const titleMatch = source.title.toLowerCase().includes(lowerQuery);
    const descMatch = source.description.toLowerCase().includes(lowerQuery);
    const tagMatch = source.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));

    if (titleMatch || descMatch || tagMatch) {
      results.push(source);
    }
  }

  return results;
}

/**
 * 根據問題類型推薦相關知識來源
 */
export function getRelevantSourcesForIntent(intent: string, query?: string): KnowledgeSource[] {
  const intentMap: Record<string, string[]> = {
    registration: ["註冊", "流程", "MAC", "路由器"],
    connection_troubleshoot: ["故障排除", "問題解決", "路由器", "安裝"],
    speed_check: ["流量", "網速", "限速"],
    information_query: query ? [query] : [],
  };

  const keywords = intentMap[intent] || [];
  if (query) {
    keywords.push(query);
  }

  const results: KnowledgeSource[] = [];
  for (const keyword of keywords) {
    const matches = searchKnowledgeSources(keyword);
    for (const match of matches) {
      if (!results.find((r) => r.id === match.id)) {
        results.push(match);
      }
    }
  }

  return results.slice(0, 5); // 最多返回 5 個相關來源
}

/**
 * 生成知識庫上下文供 Gemini 使用
 */
export function buildKnowledgeContext(
  sources: KnowledgeSource[],
  maxLength: number = 2000
): string {
  let context = "## 相關知識庫內容\n\n";
  let currentLength = context.length;

  for (const source of sources) {
    const sourceInfo = `### ${source.title}\n來源：${source.url}\n描述：${source.description}\n標籤：${source.tags.join(", ")}\n\n`;
    
    if (currentLength + sourceInfo.length > maxLength) {
      break;
    }
    
    context += sourceInfo;
    currentLength += sourceInfo.length;

    // 如果有預先抓取的內容，也加入（未來可實作）
    if (source.content && currentLength + source.content.length <= maxLength) {
      context += `${source.content}\n\n`;
      currentLength += source.content.length;
    }
  }

  return context;
}

