"use client";

import { usePolling } from "@/lib/hooks/usePolling";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { CONVERSATION_CATEGORIES } from "@/config/conversation";
import { formatPostbackContent } from "@/lib/constants/postback-map";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  timestamp: string;
  category: string;
  count: number;
}

interface Stats {
  totalConversations: number;
  activeConversations: number;
  totalUsers: number;
  totalMessages: number;
  categoryStats: Record<string, number>;
  trend: TrendPoint[];
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
  const navItems = [
    { label: "儀表板", href: "/admin", active: true, icon: "📊" },
    { label: "對話管理", href: "/admin", icon: "💬" },
    { label: "使用者洞察", href: "#", icon: "👥" },
    { label: "統計報表", href: "#", icon: "📈" },
    { label: "系統設定", href: "#", icon: "⚙️" },
  ];
  
  // 篩選狀態
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);

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

  useEffect(() => {
    if (stats) {
      setStatsUpdatedAt(new Date());
    }
  }, [stats]);

  const statCards = useMemo(
    () => [
      {
        label: "無法上網 / 報修",
        value:
          stats?.categoryStats?.[CONVERSATION_CATEGORIES.NETWORK_ISSUE] || 0,
        icon: "⚠️",
        unit: "件",
        category: CONVERSATION_CATEGORIES.NETWORK_ISSUE,
        cardClass: "bg-gradient-to-br from-orange-50 via-orange-100 to-red-50",
        accentClass: "from-orange-400 to-red-500",
      },
      {
        label: "註冊指南",
        value:
          stats?.categoryStats?.[CONVERSATION_CATEGORIES.REGISTRATION] || 0,
        icon: "📋",
        unit: "人",
        category: CONVERSATION_CATEGORIES.REGISTRATION,
        cardClass: "bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100",
        accentClass: "from-blue-400 to-indigo-500",
      },
      {
        label: "網速 / 流量反映",
        value: stats?.activeConversations || 0,
        icon: "🐢",
        unit: "件",
        category: CONVERSATION_CATEGORIES.NETWORK_ISSUE,
        cardClass: "bg-gradient-to-br from-teal-50 via-cyan-50 to-cyan-100",
        accentClass: "from-teal-400 to-cyan-500",
      },
      {
        label: "聯絡網管 / 其他",
        value:
          stats?.categoryStats?.[CONVERSATION_CATEGORIES.OTHER] ||
          stats?.categoryStats?.未分類 ||
          0,
        icon: "📞",
        unit: "次",
        category: "other",
        cardClass: "bg-gradient-to-br from-purple-50 via-pink-50 to-pink-100",
        accentClass: "from-purple-400 to-pink-500",
      },
    ],
    [stats]
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-slate-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white shadow-xl lg:flex">
        <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl shadow-lg">
            🧚🏻‍♀️
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              NTU Lady 8
            </p>
            <p className="text-lg font-bold text-slate-800">
              宿網小精靈後台
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                item.active
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-6 py-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              登入帳號
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
              {session.user?.email || session.user?.name}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="w-full rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-red-600 hover:to-pink-700"
          >
            登出
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
          <div className="flex items-center justify-between px-6 py-4 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                後台儀表板
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-800">
                宿網小精靈 · 客服監控中心
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-slate-600 sm:block">
                {session.user?.name || "管理員"}
              </span>
              <span className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md">
                ✨ 小精靈值班中
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-10">
          {/* Stats Section */}
          <section className="mb-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                小精靈今日戰報
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                數據每 5 秒更新一次，掌握宿網狀況
              </p>
              {statsUpdatedAt && (
                <p className="mt-1 text-xs text-slate-500">
                  最後更新：{statsUpdatedAt.toLocaleTimeString("zh-TW")}
                </p>
              )}
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center rounded-2xl bg-white p-12 shadow-lg">
                <div className="text-center">
                  <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                  <p className="text-sm text-slate-600">載入統計資料中...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, index) => {
                  // 為每個卡片定義完整的漸層類別
                  const gradientClasses = [
                    "bg-gradient-to-br from-orange-50 via-orange-100 to-red-50",
                    "bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100",
                    "bg-gradient-to-br from-teal-50 via-cyan-50 to-cyan-100",
                    "bg-gradient-to-br from-purple-50 via-pink-50 to-pink-100",
                  ];
                  const accentGradients = [
                    "bg-gradient-to-br from-orange-400 to-red-500",
                    "bg-gradient-to-br from-blue-400 to-indigo-500",
                    "bg-gradient-to-br from-teal-400 to-cyan-500",
                    "bg-gradient-to-br from-purple-400 to-pink-500",
                  ];
                  
                  return (
                    <div
                      key={card.label}
                      className={`group relative overflow-hidden rounded-2xl ${gradientClasses[index]} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 border border-white/50`}
                    >
                      <div className="relative z-10">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-5xl drop-shadow-sm">{card.icon}</span>
                          <div className="h-14 w-14 rounded-full bg-white/60 backdrop-blur-sm shadow-inner"></div>
                        </div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                          {card.label}
                        </p>
                        <p className="text-5xl font-extrabold text-slate-900">
                          {card.value}
                          <span className="ml-2 text-xl font-semibold text-slate-600">
                            {card.unit}
                          </span>
                        </p>
                      </div>
                      <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full ${accentGradients[index]} opacity-30 blur-3xl`}></div>
                      <div className={`absolute -left-4 -bottom-4 h-24 w-24 rounded-full ${accentGradients[index]} opacity-20 blur-2xl`}></div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Conversations Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">對話列表</h2>
              <p className="mt-1 text-sm text-slate-600">
                監控所有使用者與宿網小精靈的對話
              </p>
            </div>

            {/* Filters */}
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">篩選條件</h3>
                <button
                  onClick={handleResetFilters}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  清除條件
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    開始日期
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    結束日期
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    類別
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">全部</option>
                    <option value={CONVERSATION_CATEGORIES.NETWORK_ISSUE}>
                      {CONVERSATION_CATEGORIES.NETWORK_ISSUE}
                    </option>
                    <option value={CONVERSATION_CATEGORIES.SECURITY_INCIDENT}>
                      網速很慢
                    </option>
                    <option value={CONVERSATION_CATEGORIES.REGISTRATION}>
                      {CONVERSATION_CATEGORIES.REGISTRATION}
                    </option>
                    <option value={CONVERSATION_CATEGORIES.OTHER}>
                      {CONVERSATION_CATEGORIES.OTHER}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    狀態
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">全部</option>
                    <option value="active">進行中</option>
                    <option value="completed">已完成</option>
                    <option value="archived">已封存</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    搜尋
                  </label>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="輸入關鍵字..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Results Count */}
            {conversationsData && (
              <div className="mb-4 text-sm text-slate-600">
                找到 <span className="font-semibold text-slate-800">{conversationsData.pagination.total}</span> 筆對話
                {conversationsData.pagination.totalPages > 1 && (
                  <span className="ml-2">
                    （第 <span className="font-semibold text-slate-800">{conversationsData.pagination.page}</span> /{" "}
                    <span className="font-semibold text-slate-800">{conversationsData.pagination.totalPages}</span> 頁）
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            {conversationsLoading ? (
              <div className="flex items-center justify-center rounded-2xl bg-white p-12 shadow-lg">
                <div className="text-center">
                  <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                  <p className="text-sm text-slate-600">載入對話列表中...</p>
                </div>
              </div>
            ) : conversationsData?.conversations.length ? (
              <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <tr>
                        {["使用者", "類別", "狀態", "最新時間", "操作", "最新訊息"].map(
                          (header) => (
                            <th
                              key={header}
                              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-700"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {conversationsData?.conversations.map((conv, idx) => (
                        <tr
                          key={conv._id}
                          className={`transition-colors hover:bg-slate-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="font-medium text-slate-900">
                              {conv.userId?.displayName || "未知使用者"}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                            {conv.category || "未分類"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                conv.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : conv.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {conv.status === "active"
                                ? "進行中"
                                : conv.status === "completed"
                                ? "已完成"
                                : "已封存"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                            {new Date(
                              conv.lastMessageTime ||
                                conv.updatedAt ||
                                conv.createdAt
                            ).toLocaleString("zh-TW")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <a
                              href={`/admin/conversations/${conv._id}`}
                              className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-blue-600 hover:to-indigo-700"
                            >
                              查看完整對話
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            {conv.lastMessage ? (
                              <div className="max-w-xs">
                                <p className="text-xs text-slate-500">
                                  {conv.lastMessageRole === "user"
                                    ? "使用者"
                                    : conv.lastMessageRole === "assistant"
                                    ? "助手"
                                    : "系統"}
                                </p>
                                <p className="mt-1 truncate text-sm text-slate-800">
                                  {formatPostbackContent(conv.lastMessage)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">尚無訊息</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              
                {/* Pagination */}
                {conversationsData &&
                  conversationsData.pagination.totalPages > 1 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row">
                      <p className="text-sm text-slate-600">
                        顯示第{" "}
                        <span className="font-semibold text-slate-800">
                          {(conversationsData.pagination.page - 1) *
                            conversationsData.pagination.limit +
                            1}
                        </span>{" "}
                        到{" "}
                        <span className="font-semibold text-slate-800">
                          {Math.min(
                            conversationsData.pagination.page *
                              conversationsData.pagination.limit,
                            conversationsData.pagination.total
                          )}
                        </span>{" "}
                        筆，共{" "}
                        <span className="font-semibold text-slate-800">
                          {conversationsData.pagination.total}
                        </span>{" "}
                        筆
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (page > 1) setPage(page - 1);
                          }}
                          disabled={page === 1}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
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
                          className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一頁
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-12 text-center shadow-lg">
                <p className="text-6xl mb-4">🪄</p>
                <p className="text-lg font-semibold text-slate-800">
                  尚未找到符合條件的對話
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  試著調整搜尋或篩選條件，小精靈會持續為您留意。
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
