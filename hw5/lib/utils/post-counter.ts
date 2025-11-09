/**
 * 計算文章字數（考慮 URL、hashtag、mention 的特殊規則）
 * - URL 每條視為 23 字元
 * - #hashtag 和 @mention 不計入字數
 * - 上限 280 字元
 */

export interface PostCountResult {
  count: number; // 實際計數
  maxCount: number; // 最大字數（280）
  isValid: boolean; // 是否有效（未超過上限）
  urls: string[]; // 找到的 URL 列表
  hashtags: string[]; // 找到的 hashtag 列表
  mentions: string[]; // 找到的 mention 列表
}

// URL 正則表達式（匹配 http/https/ftp 等協議）
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;

// Hashtag 正則表達式（# 後跟字母、數字、下劃線）
export const HASHTAG_REGEX = /#[\w\u4e00-\u9fa5]+/gi;

// Mention 正則表達式（@ 後跟字母、數字、下劃線）
const MENTION_REGEX = /@[\w\u4e00-\u9fa5]+/gi;

export function countPostCharacters(content: string): PostCountResult {
  if (!content) {
    return {
      count: 0,
      maxCount: 280,
      isValid: true,
      urls: [],
      hashtags: [],
      mentions: [],
    };
  }

  // 找出所有 URL
  const urls = content.match(URL_REGEX) || [];
  const uniqueUrls = Array.from(new Set(urls));

  // 找出所有 hashtag
  const hashtags = content.match(HASHTAG_REGEX) || [];
  const uniqueHashtags = Array.from(new Set(hashtags));

  // 找出所有 mention
  const mentions = content.match(MENTION_REGEX) || [];
  const uniqueMentions = Array.from(new Set(mentions));

  // 計算字數：先移除 hashtag 和 mention，然後計算剩餘字數
  let text = content;

  // 移除 hashtag（不計入字數）
  uniqueHashtags.forEach((tag) => {
    text = text.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  });

  // 移除 mention（不計入字數）
  uniqueMentions.forEach((mention) => {
    text = text.replace(new RegExp(mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  });

  // 計算剩餘文字的字數
  const textLength = text.trim().length;

  // URL 每條視為 23 字元
  const urlLength = uniqueUrls.length * 23;

  // 總字數 = 文字字數 + URL 字數
  const totalCount = textLength + urlLength;

  return {
    count: totalCount,
    maxCount: 280,
    isValid: totalCount <= 280,
    urls: uniqueUrls,
    hashtags: uniqueHashtags,
    mentions: uniqueMentions,
  };
}

/**
 * 解析文章內容，將 URL、hashtag、mention 轉換為可點擊的連結
 */
export function parsePostContent(content: string): string {
  if (!content) return '';

  let parsed = content;

  // 將 URL 轉換為連結
  parsed = parsed.replace(URL_REGEX, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`;
  });

  // 將 hashtag 轉換為連結
  parsed = parsed.replace(HASHTAG_REGEX, (tag) => {
    const tagText = tag.substring(1); // 移除 #
    return `<a href="/hashtag/${encodeURIComponent(tagText)}" class="text-blue-500 hover:underline">${tag}</a>`;
  });

  // 將 mention 轉換為連結
  parsed = parsed.replace(MENTION_REGEX, (mention) => {
    const userId = mention.substring(1); // 移除 @
    return `<a href="/profile/${encodeURIComponent(userId)}" class="text-blue-500 hover:underline">${mention}</a>`;
  });

  return parsed;
}

export function extractHashtags(content: string): string[] {
  if (!content) return [];
  const matches = content.match(HASHTAG_REGEX) || [];
  return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())));
}


