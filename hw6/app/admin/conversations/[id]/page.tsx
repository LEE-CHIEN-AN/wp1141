"use client";

import { usePolling } from "@/lib/hooks/usePolling";
import { useParams } from "next/navigation";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  status: string;
  category?: string;
  createdAt: string;
  userId: {
    displayName: string;
    lineUserId: string;
    pictureUrl?: string;
  };
}

export default function ConversationDetailPage() {
  const params = useParams();
  const conversationId = params.id as string;

  const { data, isLoading } = usePolling<{
    conversation: Conversation;
    messages: Message[];
  }>(`/api/conversations/${conversationId}`, 5000);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>找不到對話</p>
      </div>
    );
  }

  const { conversation, messages } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <a
                href="/admin"
                className="text-blue-600 hover:text-blue-900"
              >
                ← 返回列表
              </a>
              <h1 className="ml-4 text-xl font-semibold">對話詳情</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">對話資訊</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">使用者</p>
              <p className="font-medium">{conversation.userId.displayName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">類別</p>
              <p className="font-medium">{conversation.category || "未分類"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">狀態</p>
              <p className="font-medium">
                {conversation.status === "active" ? "進行中" : "已完成"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">建立時間</p>
              <p className="font-medium">
                {new Date(conversation.createdAt).toLocaleString("zh-TW")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold">訊息紀錄</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`px-6 py-4 ${
                  message.role === "user" ? "bg-gray-50" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {message.role === "user" ? "使用者" : "助手"}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {message.content}
                    </p>
                  </div>
                  <p className="ml-4 text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString("zh-TW")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


