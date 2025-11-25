"use client";

import { usePolling } from "@/lib/hooks/usePolling";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatPostbackContent } from "@/lib/constants/postback-map";

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

  const conversation = data?.conversation;
  const messages = data?.messages ?? [];
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-slate-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-800">找不到對話</p>
          <Link
            href="/admin"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
          >
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const avatarInitial =
    conversation.userId.displayName?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span>←</span>
              <span>返回列表</span>
            </Link>
            <div className="h-6 w-px bg-slate-300"></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                對話詳情
              </p>
              <h1 className="text-xl font-bold text-slate-800">
                {conversation.userId.displayName}
              </h1>
            </div>
          </div>
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              conversation.status === "active"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {conversation.status === "active" ? "進行中" : "已完成"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* User Info Sidebar */}
          <section className="h-fit rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-md">
                {avatarInitial}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  使用者
                </p>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {conversation.userId.displayName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {conversation.userId.lineUserId}
                </p>
              </div>
            </div>
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  類別
                </p>
                <p className="mt-2 text-base font-semibold text-slate-800">
                  {conversation.category || "未分類"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  建立時間
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {new Date(conversation.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
            </div>
          </section>

          {/* Chat Window */}
          <section className="rounded-2xl bg-white shadow-lg">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                訊息紀錄
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                共 {messages.length} 則訊息（最舊在上）
              </p>
            </div>
            <div
              ref={scrollRef}
              className="flex max-h-[calc(100vh-280px)] min-h-[500px] flex-col gap-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-6 py-6"
            >
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl mb-4">💬</p>
                    <p className="text-slate-600">尚無訊息</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex max-w-[75%] gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                          : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700"
                      }`}>
                        {message.role === "user" ? "👤" : "🧚🏻‍♀️"}
                      </div>
                      
                      {/* Message Bubble */}
                      <div className="flex flex-col gap-1">
                        <p
                          className={`text-xs ${
                            message.role === "user"
                              ? "text-right text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleString("zh-TW")}
                        </p>
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-md ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                              : "bg-white text-slate-800 border border-slate-200"
                          }`}
                        >
                          <p className={`text-sm leading-relaxed ${
                            message.role === "user" ? "text-white" : "text-slate-800"
                          }`}>
                            {formatPostbackContent(message.content)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
