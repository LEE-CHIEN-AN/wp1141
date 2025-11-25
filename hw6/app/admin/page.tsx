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
      },
      {
        label: "註冊指南",
        value:
          stats?.categoryStats?.[CONVERSATION_CATEGORIES.REGISTRATION] || 0,
        icon: "📋",
        unit: "人",
        category: CONVERSATION_CATEGORIES.REGISTRATION,
      },
      {
        label: "網速 / 流量反映",
        value: stats?.activeConversations || 0,
        icon: "🐢",
        unit: "件",
        category: CONVERSATION_CATEGORIES.NETWORK_ISSUE,
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
      <div className="flex min-h-screen items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-fairy-sand text-fairy-coffee font-sans lg:flex">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-fairy-clay/60 bg-fairy-cream lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-fairy-mint text-2xl shadow-card">
            🧚🏻‍♀️
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-fairy-cocoa/70">
              NTU Lady 8
            </p>
            <p className="text-lg font-semibold text-fairy-coffee">
              宿網小精靈後台
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                item.active
                  ? "bg-fairy-mint text-fairy-fern shadow-card"
                  : "text-fairy-cocoa/70 hover:bg-fairy-clay hover:text-fairy-coffee"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-fairy-clay px-6 py-6 text-sm">
          <p className="text-xs uppercase tracking-wide text-fairy-cocoa/60">
            登入帳號
          </p>
          <p className="truncate font-semibold">
            {session.user?.email || session.user?.name}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="mt-4 w-full rounded-xl bg-fairy-coral px-4 py-2 font-medium text-white transition hover:bg-fairy-coral/80"
          >
            登出
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-fairy-clay/80 bg-fairy-cream/90 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-fairy-cocoa/60">
                後台儀表板
              </p>
              <h1 className="text-2xl font-heading font-bold text-fairy-coffee">
                宿網小精靈 · 客服監控中心
              </h1>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:block">
                {session.user?.name || "管理員"}
              </span>
              <span className="rounded-full bg-fairy-mint px-4 py-1 text-fairy-fern">
                小精靈值班中
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-10 px-4 py-8 sm:px-6 lg:px-10">
          {/* Stats */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-fairy-coffee">
                  小精靈今日戰報
                </h2>
                <p className="text-sm text-fairy-cocoa/70">
                  數據每 5 秒更新一次，掌握宿網狀況
                </p>
                {statsUpdatedAt && (
                  <p className="text-xs text-fairy-cocoa/60">
                    最後更新：{statsUpdatedAt.toLocaleTimeString("zh-TW")}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleResetFilters()}
                className="btn btn-sm rounded-full border-none bg-fairy-teal/20 text-fairy-fern hover:bg-fairy-teal/40"
              >
                重置篩選
              </button>
            </div>
            {statsLoading ? (
              <p>載入中...</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="flex-1 min-w-[220px] rounded-2xl bg-white p-6 shadow-card ring-1 ring-fairy-clay/40"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-fairy-cocoa/60">
                          {card.label}
                        </p>
                        <p className="mt-2 text-4xl font-bold text-fairy-coffee">
                          {card.value}
                          <span className="ml-1 text-base font-medium text-fairy-cocoa/70">
                            {card.unit}
                          </span>
                        </p>
                      </div>
                      <span className="text-3xl">{card.icon}</span>
                    </div>
                    <p className="mt-2 text-xs text-fairy-cocoa/60">
                      統計更新：{new Date().toLocaleTimeString("zh-TW")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-fairy-coffee">
                  對話列表
                </h2>
                <p className="text-sm text-fairy-cocoa/70">
                  監控所有使用者與宿網小精靈的對話
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-fairy-clay/60">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-fairy-cocoa/70">
                    開始日期
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input input-bordered h-11 rounded-xl bg-fairy-cream text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-fairy-cocoa/70">
                    結束日期
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input input-bordered h-11 rounded-xl bg-fairy-cream text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-fairy-cocoa/70">
                    類別
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="select select-bordered h-11 rounded-xl bg-fairy-cream text-sm"
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
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-fairy-cocoa/70">
                    狀態
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select select-bordered h-11 rounded-xl bg-fairy-cream text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="active">進行中</option>
                    <option value="completed">已完成</option>
                    <option value="archived">已封存</option>
                  </select>
                </div>
                <div className="flex min-w-[200px] flex-1 flex-col">
                  <label className="text-xs font-medium text-fairy-cocoa/70">
                    搜尋（使用者 / 對話內容）
                  </label>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="輸入關鍵字..."
                    className="input input-bordered h-11 rounded-xl bg-fairy-cream text-sm"
                  />
                </div>
                <button
                  onClick={handleResetFilters}
                  className="btn btn-sm rounded-full border-none bg-fairy-coral/30 text-fairy-cocoa hover:bg-fairy-coral/50"
                >
                  清除條件
                </button>
              </div>
            </div>

            {/* 顯示篩選結果數量 */}
            {conversationsData && (
              <div className="text-sm text-fairy-cocoa/70">
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
              <p className="mt-4 text-sm text-fairy-cocoa/60">載入中...</p>
            ) : conversationsData?.conversations.length ? (
              <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-fairy-clay/60">
                <table className="min-w-[1100px] divide-y divide-fairy-clay/50">
                  <thead className="bg-fairy-mint/60 text-left text-xs font-semibold uppercase tracking-wide text-fairy-fern">
                    <tr>
                      {["使用者", "類別", "狀態", "最新時間", "操作", "最新訊息"].map(
                        (header) => (
                          <th key={header} className="px-6 py-4">
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white text-sm text-fairy-coffee">
                    {conversationsData?.conversations.map((conv, idx) => (
                      <tr
                        key={conv._id}
                        className={idx % 2 === 0 ? "bg-fairy-cream/60" : ""}
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-medium">
                          {conv.userId?.displayName || "未知使用者"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-fairy-cocoa/80">
                          {conv.category || "未分類"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`badge border-none px-3 py-3 text-xs font-semibold ${
                              conv.status === "active"
                                ? "bg-fairy-mint text-fairy-fern"
                                : conv.status === "completed"
                                ? "bg-fairy-sky text-[#3C5A7A]"
                                : "bg-fairy-clay text-fairy-cocoa"
                            }`}
                          >
                            {conv.status === "active"
                              ? "進行中"
                              : conv.status === "completed"
                              ? "已完成"
                              : "已封存"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-fairy-cocoa/80">
                          {new Date(
                            conv.lastMessageTime ||
                              conv.updatedAt ||
                              conv.createdAt
                          ).toLocaleString("zh-TW")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <a
                            href={`/admin/conversations/${conv._id}`}
                            className="btn btn-xs rounded-full border-none bg-fairy-teal/30 text-fairy-fern hover:bg-fairy-teal/50"
                          >
                            查看完整對話
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          {conv.lastMessage ? (
                            <div className="max-w-xs">
                              <p className="text-xs text-fairy-cocoa/60">
                                {conv.lastMessageRole === "user"
                                  ? "使用者"
                                  : conv.lastMessageRole === "assistant"
                                  ? "助手"
                                  : "系統"}
                              </p>
                              <p className="mt-1 truncate text-fairy-coffee">
                                {formatPostbackContent(conv.lastMessage)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-fairy-cocoa/40">尚無訊息</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              
              {/* 分頁控制 */}
              {conversationsData &&
                conversationsData.pagination.totalPages > 1 && (
                  <div className="flex flex-col gap-4 border-t border-fairy-clay/50 bg-white px-4 py-4 text-sm text-fairy-cocoa/80 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      顯示第{" "}
                      <span className="font-semibold text-fairy-coffee">
                        {(conversationsData.pagination.page - 1) *
                          conversationsData.pagination.limit +
                          1}
                      </span>{" "}
                      到{" "}
                      <span className="font-semibold text-fairy-coffee">
                        {Math.min(
                          conversationsData.pagination.page *
                            conversationsData.pagination.limit,
                          conversationsData.pagination.total
                        )}
                      </span>{" "}
                      筆，共{" "}
                      <span className="font-semibold text-fairy-coffee">
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
                        className="btn btn-sm rounded-full border-none bg-fairy-cream text-fairy-cocoa disabled:opacity-40"
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
                        className="btn btn-sm rounded-full border-none bg-fairy-mint text-fairy-fern disabled:opacity-40"
                      >
                        下一頁
                      </button>
                    </div>
                  </div>
                )}
            </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-white p-12 text-center shadow-card ring-1 ring-fairy-clay/60">
                <p className="text-4xl">🪄</p>
                <p className="mt-2 text-lg font-semibold text-fairy-coffee">
                  尚未找到符合條件的對話
                </p>
                <p className="text-sm text-fairy-cocoa/70">
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

