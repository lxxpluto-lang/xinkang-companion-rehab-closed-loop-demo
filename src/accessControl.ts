import {
  Building2,
  ClipboardList,
  FileCheck2,
  FileSignature,
  LayoutDashboard,
  MonitorUp,
  UsersRound,
  Video,
  type LucideIcon
} from "lucide-react";
import type { DataScope, DoctorPageKey, PermissionAction, Role } from "./types";

export type NavItem = {
  key: DoctorPageKey;
  label: string;
  icon: LucideIcon;
  group: "business" | "admin";
  roles: Role[];
  badge?: string;
};

const clinicalRoles: Role[] = ["ADMIN", "DOCTOR", "REHAB_EXECUTION"];

export const navItems: NavItem[] = [
  { key: "dashboard", label: "今日工作台", icon: LayoutDashboard, group: "business", roles: clinicalRoles },
  { key: "report", label: "报告中心", icon: FileCheck2, group: "business", roles: clinicalRoles },
  { key: "prescriptions", label: "处方管理", icon: ClipboardList, group: "business", roles: ["ADMIN", "DOCTOR"] },
  { key: "training", label: "训练工作台", icon: MonitorUp, group: "business", roles: clinicalRoles },
  { key: "patients", label: "患者档案", icon: UsersRound, group: "admin", roles: clinicalRoles },
  { key: "videoConfig", label: "视频资源", icon: Video, group: "admin", roles: clinicalRoles },
  { key: "orgPermissions", label: "组织权限", icon: Building2, group: "admin", roles: ["ADMIN"] },
  { key: "documentConfig", label: "报告打印签名", icon: FileSignature, group: "admin", roles: ["ADMIN"] }
];

export const roleMeta: Record<Role, { label: string; account: string; scope: DataScope; note: string }> = {
  ADMIN: { label: "系统管理员", account: "林管理员", scope: "ALL", note: "系统与临床全部权限" },
  DOCTOR: { label: "康复医生", account: "王医生", scope: "TEAM", note: "团队共享查看 · 本人任务负责" },
  REHAB_EXECUTION: { label: "康复执行岗", account: "周康复师", scope: "CENTER", note: "当前康复中心执行与异常上报" },
  PATIENT: { label: "患者", account: "陈女士", scope: "SELF_TASK", note: "仅本人数据" }
};

const allActions: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "REVIEW", "SIGN", "PUBLISH", "UNPUBLISH", "DELETE", "RESTORE", "PERMANENT_DELETE", "PRINT", "EXPORT", "GRANT"];

export const roleActions: Record<Role, PermissionAction[]> = {
  ADMIN: allActions,
  DOCTOR: ["VIEW", "CREATE", "EDIT", "REVIEW", "SIGN", "PRINT", "EXPORT"],
  REHAB_EXECUTION: ["VIEW", "CREATE", "EDIT", "EXPORT"],
  PATIENT: ["VIEW"]
};

export function canAccessPage(role: Role, page: DoctorPageKey) {
  return navItems.find((item) => item.key === page)?.roles.includes(role) ?? false;
}

export function can(role: Role, action: PermissionAction) {
  return roleActions[role].includes(action);
}

export function firstPageForRole(role: Role): DoctorPageKey {
  return navItems.find((item) => item.roles.includes(role))?.key ?? "dashboard";
}
