import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status: number;
  details?: any;
}

/**
 * 創建標準化的 API 錯誤響應
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      message,
      code,
      status,
      details,
    },
    { status }
  );
}

/**
 * 處理常見的 API 錯誤
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  // Prisma 錯誤
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };
    
    switch (prismaError.code) {
      case 'P2002':
        return createErrorResponse(
          '資料已存在，請使用其他值',
          409,
          'DUPLICATE_ENTRY',
          prismaError.meta
        );
      case 'P2025':
        return createErrorResponse(
          '找不到指定的資料',
          404,
          'NOT_FOUND',
          prismaError.meta
        );
      case 'P2003':
        return createErrorResponse(
          '關聯資料不存在',
          400,
          'FOREIGN_KEY_CONSTRAINT',
          prismaError.meta
        );
      default:
        return createErrorResponse(
          '資料庫操作失敗',
          500,
          'DATABASE_ERROR',
          prismaError.meta
        );
    }
  }

  // 驗證錯誤
  if (error && typeof error === 'object' && 'issues' in error) {
    const validationError = error as { issues: Array<{ message: string; path: string[] }> };
    const firstIssue = validationError.issues[0];
    return createErrorResponse(
      firstIssue?.message || '驗證失敗',
      400,
      'VALIDATION_ERROR',
      validationError.issues
    );
  }

  // 一般錯誤
  if (error instanceof Error) {
    // 網路錯誤
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return createErrorResponse(
        '網路連線失敗，請檢查您的網路連線',
        503,
        'NETWORK_ERROR'
      );
    }

    // 超時錯誤
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return createErrorResponse(
        '請求超時，請稍後再試',
        504,
        'TIMEOUT_ERROR'
      );
    }

    return createErrorResponse(
      error.message || '發生錯誤，請稍後再試',
      500,
      'UNKNOWN_ERROR'
    );
  }

  // 未知錯誤
  return createErrorResponse(
    '發生未知錯誤，請稍後再試',
    500,
    'UNKNOWN_ERROR'
  );
}

/**
 * 包裝 API 處理器以自動處理錯誤
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}







