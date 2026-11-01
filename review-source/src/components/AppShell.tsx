import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  Calendar,
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  MoreVertical,
  PenLine,
  Settings,
  UserSquare,
} from "lucide-react";
import { ROLES, stageRole, STATUS, type PreviewRole } from "@/lib/evaluation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEvaluations } from "@/components/evaluation-context";

const side = [
  Settings,
  CalendarCheck,
  PenLine,
  FileText,
  Calendar,
  ClipboardList,
  UserSquare,
  LayoutGrid,
];
const tabs = [
  "Điều hành",
  "Thực hiện",
  "Đánh giá",
  "KPI HIỆU SUẤT CÔNG VIỆC",
  "Quản lý nhóm nhiệm vụ",
];

export function AppShell({
  children,
  crumbs,
  title,
  actions,
}: {
  children: ReactNode;
  crumbs: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  const { evaluations, previewRole, setPreviewRole } = useEvaluations();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = evaluations.filter(
    (item) => stageRole[item.step] === previewRole && item.step !== "done",
  );
  const unread = notifications.length;
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-[68px] shrink-0 flex-col items-center gap-3 py-4">
        <div className="mb-4 flex h-10 w-10 items-center justify-center text-2xl font-black text-primary">
          V
        </div>
        {side.map((Icon, i) => (
          <button
            key={i}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
              i === 5 && "bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-end justify-between pr-4 pt-3">
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-t-xl px-6 py-3 text-sm text-muted-foreground",
                  t === "Đánh giá" && "bg-card font-medium text-primary",
                )}
              >
                {t}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-4 pb-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Thông báo"
                aria-expanded={notificationsOpen}
                title="Thông báo"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Bell />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                    {unread}
                  </span>
                )}
              </Button>
              {notificationsOpen && (
                <section
                  aria-label="Danh sách thông báo"
                  className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border bg-card shadow-md"
                >
                  <h2 className="border-b px-4 py-3 text-sm font-semibold">Hồ sơ chờ xử lý</h2>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">Không có thông báo</p>
                  ) : (
                    notifications.map((item) => (
                      <Button
                        key={item.id}
                        asChild
                        variant="ghost"
                        className="h-auto w-full justify-start whitespace-normal rounded-none border-b px-4 py-3 text-left"
                      >
                        <Link
                          to="/danh-gia/$id"
                          params={{ id: item.id }}
                          onClick={() => {
                            setNotificationsOpen(false);
                          }}
                        >
                          <span className="block">
                            <span className="block font-semibold">
                              {item.owner} · {STATUS[item.step].label}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {item.id} · {item.unit}
                            </span>
                            <span className="mt-1 block text-xs text-primary">
                              Chờ vai trò hiện tại xử lý
                            </span>
                          </span>
                        </Link>
                      </Button>
                    ))
                  )}
                </section>
              )}
            </div>
            <select
              aria-label="Vai trò xem mẫu"
              value={previewRole}
              onChange={(event) => {
                setPreviewRole(event.target.value as PreviewRole);
                setNotificationsOpen(false);
              }}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm"
            >
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                ĐT
              </div>
              <div className="text-sm leading-tight">
                <div className="font-medium">{ROLES[previewRole]}</div>
                <div className="text-xs text-muted-foreground">Xem mẫu theo vai trò</div>
              </div>
            </div>
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        </header>
        <main className="mr-4 mb-4 flex-1 rounded-b-xl rounded-tr-xl bg-card px-4 py-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground">
                  Trang chủ
                </Link>
                <span>›</span>
                {crumbs}
              </div>
              <h1 className="mt-1 text-xl font-semibold">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

const toneCls = {
  pending:
    "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200",
  review:
    "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200",
  council:
    "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200",
  warning: "border-warning/40 bg-warning-soft text-warning",
  info: "border-info/40 bg-info-soft text-info",
  danger: "border-primary/40 bg-danger-soft text-primary",
  success: "border-success/40 bg-success-soft text-success",
  muted: "border-border bg-muted text-muted-foreground",
};
export const statusStepClasses = {
  pending: "border-yellow-500 bg-yellow-500 text-yellow-950",
  info: "border-info bg-info text-white",
  review: "border-violet-600 bg-violet-600 text-white",
  council: "border-orange-600 bg-orange-600 text-white",
  warning: "border-amber-500 bg-amber-500 text-amber-950",
  danger: "border-primary bg-primary text-white",
  success: "border-success bg-success text-white",
  muted: "border-border bg-muted text-muted-foreground",
};
export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof toneCls;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-sm",
        toneCls[tone],
      )}
    >
      {children}
    </span>
  );
}
