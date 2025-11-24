import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import Conversation from "@/lib/db/models/Conversation";
import User from "@/lib/db/models/User";
import Message from "@/lib/db/models/Message";
import { Types } from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // 篩選參數
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search"); // 搜尋使用者名稱或對話內容

    // 建立查詢條件
    const query: any = {};

    // 日期範圍篩選
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // 結束日期設為當天 23:59:59
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // 類別篩選
    if (category && category !== "all") {
      query.category = category;
    }

    // 狀態篩選
    if (status && status !== "all") {
      query.status = status;
    }

    // 搜尋功能（搜尋使用者名稱或對話內容）
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      
      // 先找到符合的使用者
      const matchingUsers = await User.find({
        $or: [
          { displayName: searchRegex },
          { lineUserId: searchRegex },
        ],
      }).select("_id").lean();

      const userIds = matchingUsers.map((u) => u._id);

      // 找到包含搜尋關鍵字的訊息對應的對話
      const matchingMessages = await Message.find({
        content: searchRegex,
      }).select("conversationId").lean();

      const conversationIdsFromMessages = Array.from(
        new Set(matchingMessages.map((m) => m.conversationId.toString()))
      ).map((id) => new Types.ObjectId(id));

      // 建立搜尋條件：符合使用者或對話內容
      const searchConditions: any[] = [];
      
      if (userIds.length > 0) {
        searchConditions.push({ userId: { $in: userIds } });
      }
      
      if (conversationIdsFromMessages.length > 0) {
        searchConditions.push({ _id: { $in: conversationIdsFromMessages } });
      }

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      } else {
        // 如果沒有找到任何匹配，返回空結果
        query._id = { $in: [] };
      }
    }

    // 執行查詢
    const conversations = await Conversation.find(query)
      .populate("userId", "displayName lineUserId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const conversationIds = conversations.map((conv) => conv._id);

    let latestMessagesMap = new Map<
      string,
      { lastMessage: string; lastMessageTime: Date; lastMessageRole: string }
    >();

    if (conversationIds.length > 0) {
      const latestMessages = await Message.aggregate([
        {
          $match: {
            conversationId: {
              $in: conversationIds.map((id) => new Types.ObjectId(id)),
            },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$conversationId",
            lastMessage: { $first: "$content" },
            lastMessageTime: { $first: "$createdAt" },
            lastMessageRole: { $first: "$role" },
          },
        },
      ]);

      latestMessagesMap = new Map(
        latestMessages.map((item) => [
          item._id.toString(),
          {
            lastMessage: item.lastMessage,
            lastMessageTime: item.lastMessageTime,
            lastMessageRole: item.lastMessageRole,
          },
        ])
      );
    }

    const conversationsWithPreview = conversations.map((conv) => {
      const latest = latestMessagesMap.get(conv._id.toString());
      return {
        ...conv,
        lastMessage: latest?.lastMessage || "",
        lastMessageTime: latest?.lastMessageTime || conv.updatedAt || conv.createdAt,
        lastMessageRole: latest?.lastMessageRole || "",
      };
    });

    // 計算總數（用於分頁）
    const total = await Conversation.countDocuments(query);

    return NextResponse.json({
      conversations: conversationsWithPreview,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


