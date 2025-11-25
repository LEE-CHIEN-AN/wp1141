import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import Conversation from "@/lib/db/models/Conversation";
import User from "@/lib/db/models/User";
import Message from "@/lib/db/models/Message";
import { subHours } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const since = subHours(new Date(), 12);

    const [
      totalConversations,
      activeConversations,
      totalUsers,
      totalMessages,
      categoryStats,
      trendBuckets,
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
      Message.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              hour: { $dateTrunc: { date: "$createdAt", unit: "hour" } },
              category: "$category",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.hour": 1 } },
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
      trend: trendBuckets.map((bucket) => ({
        timestamp: bucket._id.hour,
        category: bucket._id.category || "未分類",
        count: bucket.count,
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


