"use client";

import { usePolling } from "@/lib/hooks/usePolling";
import { useParams } from "next/navigation";
import Link from "next/link";

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

  const avatarInitial =
    conversation.userId.displayName?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              ← 返回列表
            </Link>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                對話詳情
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                {conversation.userId.displayName}
              </h1>
            </div>
          </div>
          <span
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              conversation.status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {conversation.status === "active" ? "進行中" : "已完成"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 space-y-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-600">
                {avatarInitial}
              </div>
              <div>
                <p className="text-sm text-slate-500">使用者</p>
                <p className="text-lg font-semibold text-slate-900">
                  {conversation.userId.displayName}
                </p>
                <p className="text-xs text-slate-400">
                  LINE ID：{conversation.userId.lineUserId}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <p className="text-xs text-slate-400">類別</p>
                <p className="font-medium">
                  {conversation.category || "未分類"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">建立時間</p>
                <p className="font-medium">
                  {new Date(conversation.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-0 shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              訊息紀錄（最新在上）
            </h2>
          </div>
          <div className="space-y-0 divide-y divide-slate-100">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`px-6 py-4 ${
                  message.role === "user" ? "bg-slate-50" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        message.role === "user"
                          ? "text-slate-900"
                          : "text-blue-700"
                      }`}
                    >
                      {message.role === "user" ? "使用者" : "助手"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {message.content}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(message.createdAt).toLocaleString("zh-TW")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


