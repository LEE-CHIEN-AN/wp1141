import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import User from "@/lib/db/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * 健康檢查端點，提供系統狀態、效能指標和服務可用性
 */
export async function GET() {
  const startTime = Date.now();
  const healthStatus: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    services: {
      database: {
        status: "healthy" | "unhealthy";
        responseTime: number;
        error?: string;
      };
      lineApi: {
        status: "healthy" | "unhealthy";
        configured: boolean;
        error?: string;
      };
      geminiApi: {
        status: "healthy" | "unhealthy";
        configured: boolean;
        error?: string;
      };
    };
    metrics: {
      totalConversations: number;
      activeConversations: number;
      totalUsers: number;
      totalMessages: number;
      recentMessages: number; // 過去 1 小時的訊息數
      averageResponseTime?: number; // 如果有記錄的話
    };
    version: string;
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: "unhealthy",
        responseTime: 0,
      },
      lineApi: {
        status: "unhealthy",
        configured: false,
      },
      geminiApi: {
        status: "unhealthy",
        configured: false,
      },
    },
    metrics: {
      totalConversations: 0,
      activeConversations: 0,
      totalUsers: 0,
      totalMessages: 0,
      recentMessages: 0,
    },
    version: "1.0.0",
  };

  // 檢查資料庫連線
  try {
    const dbStartTime = Date.now();
    await connectDB();
    const dbResponseTime = Date.now() - dbStartTime;
    
    healthStatus.services.database = {
      status: "healthy",
      responseTime: dbResponseTime,
    };

    // 取得基本統計
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [
      totalConversations,
      activeConversations,
      totalUsers,
      totalMessages,
      recentMessages,
    ] = await Promise.all([
      Conversation.countDocuments(),
      Conversation.countDocuments({ status: "active" }),
      User.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: oneHourAgo } }),
    ]);

    healthStatus.metrics = {
      totalConversations,
      activeConversations,
      totalUsers,
      totalMessages,
      recentMessages,
    };
  } catch (error) {
    healthStatus.services.database = {
      status: "unhealthy",
      responseTime: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    healthStatus.status = "unhealthy";
  }

  // 檢查 LINE API 設定
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET) {
    healthStatus.services.lineApi = {
      status: "healthy",
      configured: true,
    };
  } else {
    healthStatus.services.lineApi = {
      status: "unhealthy",
      configured: false,
      error: "LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET not configured",
    };
    if (healthStatus.status === "healthy") {
      healthStatus.status = "degraded";
    }
  }

  // 檢查 Gemini API 設定
  if (process.env.GEMINI_API_KEY) {
    healthStatus.services.geminiApi = {
      status: "healthy",
      configured: true,
    };
  } else {
    healthStatus.services.geminiApi = {
      status: "unhealthy",
      configured: false,
      error: "GEMINI_API_KEY not configured",
    };
    if (healthStatus.status === "healthy") {
      healthStatus.status = "degraded";
    }
  }

  // 計算總回應時間
  const totalResponseTime = Date.now() - startTime;

  // 根據服務狀態決定 HTTP 狀態碼
  let statusCode = 200;
  if (healthStatus.status === "unhealthy") {
    statusCode = 503; // Service Unavailable
  } else if (healthStatus.status === "degraded") {
    statusCode = 200; // OK but degraded
  }

  return NextResponse.json(
    {
      ...healthStatus,
      responseTime: totalResponseTime,
    },
    { status: statusCode }
  );
}

