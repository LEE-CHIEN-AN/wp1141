/**
 * 統一的錯誤處理工具
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * 從 API 響應中提取錯誤信息
 */
export async function extractApiError(response: Response): Promise<ApiError> {
  let message = '發生錯誤，請稍後再試';
  let code: string | undefined;
  let details: any;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      message = data.message || message;
      code = data.code;
      details = data.details;
    } else {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    // 如果無法解析 JSON，使用默認消息
    message = `HTTP ${response.status}: ${response.statusText}`;
  }

  return {
    message,
    code,
    status: response.status,
    details,
  };
}

/**
 * 判斷是否為網路錯誤
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('fetch') || error.message.includes('network');
  }
  if (error instanceof Error) {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('network')
    );
  }
  return false;
}

/**
 * 判斷是否為超時錯誤
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('timeout') || error.message.includes('Timeout');
  }
  return false;
}

/**
 * 獲取用戶友好的錯誤消息
 */
export function getUserFriendlyMessage(error: unknown, defaultMessage = '發生錯誤，請稍後再試'): string {
  if (isNetworkError(error)) {
    return '網路連線失敗，請檢查您的網路連線後再試';
  }

  if (isTimeoutError(error)) {
    return '請求超時，請稍後再試';
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * 帶重試的 fetch 請求
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 如果是 5xx 錯誤，重試
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      // 如果是網路錯誤且還有重試次數，重試
      if (isNetworkError(error) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      // 如果不是網路錯誤或已達最大重試次數，拋出錯誤
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * 安全的 API 請求包裝器
 */
export async function safeApiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<{ ok: boolean; data?: T; error?: ApiError; status?: number }> {
  try {
    const response = retry
      ? await fetchWithRetry(url, options)
      : await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000), // 30秒超時
        });

    if (!response.ok) {
      const error = await extractApiError(response);
      return { ok: false, error, status: response.status };
    }

    const data = await response.json();
    return { ok: true, data, status: response.status };
  } catch (error) {
    const message = getUserFriendlyMessage(error);
    return {
      ok: false,
      error: {
        message,
        code: isNetworkError(error) ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
      },
      status: isNetworkError(error) ? 0 : 500,
    };
  }
}







