import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import Conversation from "@/lib/db/models/Conversation";
import User from "@/lib/db/models/User";
import Message from "@/lib/db/models/Message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const [
      totalConversations,
      activeConversations,
      totalUsers,
      totalMessages,
      categoryStats,
    ] = await Promise.all([
      Conversation.countDocuments(),
      Conversation.countDocuments({ status: "active" }),
      User.countDocuments(),
      Message.countDocuments(),
      Conversation.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      totalConversations,
      activeConversations,
      totalUsers,
      totalMessages,
      categoryStats: categoryStats.reduce(
        (acc, stat) => {
          acc[stat._id || "未分類"] = stat.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


