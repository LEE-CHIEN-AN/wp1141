"use client";

import { usePolling } from "@/lib/hooks/usePolling";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { CONVERSATION_CATEGORIES } from "@/config/conversation";

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
  updatedAt?: string;
  lastMessage?: string;
  lastMessageRole?: string;
  lastMessageTime?: string;
  userId: {
    displayName: string;
    lineUserId: string;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 篩選狀態
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // 建立 API URL（包含篩選參數）
  const conversationsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("page", String(page));
    
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (category && category !== "all") params.set("category", category);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    return `/api/conversations?${params.toString()}`;
  }, [startDate, endDate, category, statusFilter, search, page]);

  // 當篩選條件改變時，重置到第一頁
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, category, statusFilter, search]);

  const { data: stats, isLoading: statsLoading } = usePolling<Stats>(
    "/api/stats",
    5000
  );
  const { data: conversationsData, isLoading: conversationsLoading } =
    usePolling<{ conversations: Conversation[]; pagination: any }>(
      conversationsUrl,
      5000
    );

  // 重置篩選
  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setCategory("all");
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };

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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">對話列表</h2>
            <button
              onClick={handleResetFilters}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              重置篩選
            </button>
          </div>

          {/* 篩選表單 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* 日期範圍 - 開始日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  開始日期
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {/* 日期範圍 - 結束日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  結束日期
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {/* 類別篩選 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  類別
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value={CONVERSATION_CATEGORIES.NETWORK_ISSUE}>
                    {CONVERSATION_CATEGORIES.NETWORK_ISSUE}
                  </option>
                  <option value={CONVERSATION_CATEGORIES.SECURITY_INCIDENT}>
                    {CONVERSATION_CATEGORIES.SECURITY_INCIDENT}
                  </option>
                  <option value={CONVERSATION_CATEGORIES.REGISTRATION}>
                    {CONVERSATION_CATEGORIES.REGISTRATION}
                  </option>
                  <option value={CONVERSATION_CATEGORIES.OTHER}>
                    {CONVERSATION_CATEGORIES.OTHER}
                  </option>
                </select>
              </div>

              {/* 狀態篩選 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  狀態
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="active">進行中</option>
                  <option value="completed">已完成</option>
                  <option value="archived">已封存</option>
                </select>
              </div>

              {/* 搜尋框 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  搜尋（使用者/內容）
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="輸入關鍵字..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 顯示篩選結果數量 */}
          {conversationsData && (
            <div className="mb-4 text-sm text-gray-600">
              找到 {conversationsData.pagination.total} 筆對話
              {conversationsData.pagination.totalPages > 1 && (
                <span>
                  {" "}
                  （第 {conversationsData.pagination.page} /{" "}
                  {conversationsData.pagination.totalPages} 頁）
                </span>
              )}
            </div>
          )}

          {conversationsLoading ? (
            <p className="mt-4">載入中...</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg bg-white shadow">
              <table className="min-w-[1100px] divide-y divide-gray-200">
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
                      最新時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      操作
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      最新訊息
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
                              : conv.status === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {conv.status === "active"
                            ? "進行中"
                            : conv.status === "completed"
                            ? "已完成"
                            : "已封存"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(
                          conv.lastMessageTime || conv.updatedAt || conv.createdAt
                        ).toLocaleString("zh-TW")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <a
                          href={`/admin/conversations/${conv._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看詳情
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {conv.lastMessage ? (
                          <div className="max-w-xs">
                            <p className="text-xs text-gray-500">
                              {conv.lastMessageRole === "user"
                                ? "使用者"
                                : conv.lastMessageRole === "assistant"
                                ? "助手"
                                : "系統"}
                            </p>
                            <p className="mt-1 truncate text-gray-700">
                              {conv.lastMessage}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">尚無訊息</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* 分頁控制 */}
              {conversationsData && conversationsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => {
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }}
                      disabled={page === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      上一頁
                    </button>
                    <button
                      onClick={() => {
                        if (
                          conversationsData &&
                          page < conversationsData.pagination.totalPages
                        ) {
                          setPage(page + 1);
                        }
                      }}
                      disabled={
                        !conversationsData ||
                        page === conversationsData.pagination.totalPages
                      }
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      下一頁
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        顯示第{" "}
                        <span className="font-medium">
                          {(conversationsData.pagination.page - 1) *
                            conversationsData.pagination.limit +
                            1}
                        </span>{" "}
                        到{" "}
                        <span className="font-medium">
                          {Math.min(
                            conversationsData.pagination.page *
                              conversationsData.pagination.limit,
                            conversationsData.pagination.total
                          )}
                        </span>{" "}
                        筆，共{" "}
                        <span className="font-medium">
                          {conversationsData.pagination.total}
                        </span>{" "}
                        筆
                      </p>
                    </div>
                    <div>
                      <nav
                        className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() => {
                            if (page > 1) {
                              setPage(page - 1);
                            }
                          }}
                          disabled={page === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          上一頁
                        </button>
                        <button
                          onClick={() => {
                            if (
                              conversationsData &&
                              page < conversationsData.pagination.totalPages
                            ) {
                              setPage(page + 1);
                            }
                          }}
                          disabled={
                            !conversationsData ||
                            page === conversationsData.pagination.totalPages
                          }
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          下一頁
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

