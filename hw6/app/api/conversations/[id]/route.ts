import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import User from "@/lib/db/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const conversation = await Conversation.findById(id)
      .populate("userId", "displayName lineUserId pictureUrl")
      .lean();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const messages = await Message.find({
      conversationId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


