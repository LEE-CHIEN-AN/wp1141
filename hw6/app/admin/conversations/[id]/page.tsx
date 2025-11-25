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
    <div className="min-h-screen bg-fairy-sand text-fairy-coffee">
      <header className="border-b border-fairy-clay/60 bg-fairy-cream/90 px-6 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="btn btn-sm rounded-full border-none bg-fairy-teal/20 text-fairy-fern hover:bg-fairy-teal/40"
            >
              ← 返回列表
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-fairy-cocoa/60">
                對話詳情
              </p>
              <h1 className="text-2xl font-heading font-bold text-fairy-coffee">
                {conversation.userId.displayName}
              </h1>
            </div>
          </div>
          <span
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              conversation.status === "active"
                ? "bg-fairy-mint text-fairy-fern"
                : "bg-fairy-clay text-fairy-cocoa"
            }`}
          >
            {conversation.status === "active" ? "進行中" : "已完成"}
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-fairy-clay/50">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fairy-mint text-2xl font-semibold text-fairy-fern">
                {avatarInitial}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-fairy-cocoa/60">
                  使用者
                </p>
                <p className="text-xl font-semibold text-fairy-coffee">
                  {conversation.userId.displayName}
                </p>
                <p className="text-xs text-fairy-cocoa/60">
                  LINE ID：{conversation.userId.lineUserId}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-fairy-cocoa/80">
              <div>
                <p className="text-xs uppercase tracking-wide text-fairy-cocoa/50">
                  類別
                </p>
                <p className="text-base font-medium text-fairy-coffee">
                  {conversation.category || "未分類"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-fairy-cocoa/50">
                  建立時間
                </p>
                <p className="text-base font-medium text-fairy-coffee">
                  {new Date(conversation.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-fairy-cream shadow-card ring-1 ring-fairy-clay/50">
            <div className="border-b border-fairy-clay/50 px-6 py-4">
              <h2 className="text-lg font-semibold text-fairy-coffee">
                訊息紀錄（最新在上）
              </h2>
            </div>
            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-6">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%] space-y-1">
                    <p
                      className={`text-xs ${
                        message.role === "user"
                          ? "text-fairy-cocoa/60 text-right"
                          : "text-fairy-cocoa/60"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleString("zh-TW")}
                    </p>
                    <div
                      className={`rounded-3xl px-4 py-3 text-sm shadow-sm ${
                        message.role === "user"
                          ? "bg-fairy-mint text-fairy-fern"
                          : "bg-white text-fairy-coffee border border-fairy-clay/40"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


