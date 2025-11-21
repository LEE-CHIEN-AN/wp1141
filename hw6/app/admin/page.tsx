"use client";

import { usePolling } from "@/lib/hooks/usePolling";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Stats {
  totalConversations: number;
  activeConversations: number;
  totalUsers: number;
  totalMessages: number;
  categoryStats: Record<string, number>;
}

interface Conversation {
  _id: string;
  status: string;
  category?: string;
  createdAt: string;
  userId: {
    displayName: string;
    lineUserId: string;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = usePolling<Stats>(
    "/api/stats",
    5000
  );
  const { data: conversationsData, isLoading: conversationsLoading } =
    usePolling<{ conversations: Conversation[]; pagination: any }>(
      "/api/conversations?limit=10",
      5000
    );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold">管理後台</h1>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              登出
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">統計資料</h2>
          {statsLoading ? (
            <p>載入中...</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white p-6 shadow">
                <p className="text-sm text-gray-600">總對話數</p>
                <p className="mt-2 text-3xl font-bold">
                  {stats?.totalConversations || 0}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <p className="text-sm text-gray-600">進行中對話</p>
                <p className="mt-2 text-3xl font-bold">
                  {stats?.activeConversations || 0}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <p className="text-sm text-gray-600">總使用者數</p>
                <p className="mt-2 text-3xl font-bold">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <p className="text-sm text-gray-600">總訊息數</p>
                <p className="mt-2 text-3xl font-bold">
                  {stats?.totalMessages || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">最近對話</h2>
          {conversationsLoading ? (
            <p className="mt-4">載入中...</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      使用者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      類別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      建立時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {conversationsData?.conversations.map((conv) => (
                    <tr key={conv._id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {conv.userId?.displayName || "未知使用者"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {conv.category || "未分類"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                            conv.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {conv.status === "active" ? "進行中" : "已完成"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(conv.createdAt).toLocaleString("zh-TW")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <a
                          href={`/admin/conversations/${conv._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看詳情
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

