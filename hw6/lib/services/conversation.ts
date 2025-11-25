import connectDB from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Conversation, { IConversation } from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import { Types } from "mongoose";

export async function getOrCreateUser(
  lineUserId: string,
  displayName: string,
  pictureUrl?: string
) {
  await connectDB();

  let user = await User.findOne({ lineUserId });

  if (!user) {
    user = await User.create({
      lineUserId,
      displayName,
      pictureUrl,
    });
  } else {
    // 更新使用者資訊
    user.displayName = displayName;
    if (pictureUrl) {
      user.pictureUrl = pictureUrl;
    }
    await user.save();
  }

  return user;
}

export async function getOrCreateActiveConversation(
  userId: Types.ObjectId
): Promise<IConversation> {
  await connectDB();

  let conversation = await Conversation.findOne({
    userId,
    status: "active",
  }).sort({ createdAt: -1 });

  if (!conversation) {
    conversation = await Conversation.create({
      userId,
      status: "active",
      metadata: {},
    });
  }

  return conversation;
}

export async function saveMessage(
  conversationId: Types.ObjectId,
  role: "user" | "assistant",
  content: string,
  lineMessageId?: string,
  webhookEventId?: string,
  metadata?: Record<string, unknown>
) {
  await connectDB();

  const message = await Message.create({
    conversationId,
    role,
    content,
    lineMessageId,
    webhookEventId,
    metadata,
  });

  return message;
}

export async function getConversationMessages(conversationId: string) {
  await connectDB();

  const messages = await Message.find({
    conversationId: new Types.ObjectId(conversationId),
  })
    .sort({ createdAt: 1 })
    .lean();

  return messages;
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<IConversation>
) {
  await connectDB();

  const conversation = await Conversation.findByIdAndUpdate(
    conversationId,
    updates,
    { new: true }
  );

  return conversation;
}


