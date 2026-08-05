import {
  Building2,
  CalendarCheck2,
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
  hidden?: boolean;
};

const clinicalRoles: Role[] = ["ADMIN", "REHAB_EXECUTION"];

export const navItems: NavItem[] = [
  { key: "dashboard", label: "今日工作台", icon: LayoutDashboard, group: "business", roles: clinicalRoles },
  { key: "patients", label: "患者档案", icon: UsersRound, group: "business", roles: clinicalRoles },
  { key: "followups", label: "随访管理", icon: CalendarCheck2, group: "business", roles: clinicalRoles },
  { key: "training", label: "训练大屏", icon: MonitorUp, group: "business", roles: clinicalRoles },
  { key: "videoConfig", label: "视频资源", icon: Video, group: "admin", roles: ["ADMIN", "REHAB_EXECUTION"] },
  { key: "orgPermissions", label: "组织权限", icon: Building2, group: "admin", roles: ["ADMIN"] },
  { key: "documentConfig", label: "报告打印签名", icon: FileSignature, group: "admin", roles: ["ADMIN"] }
];

export const roleMeta: Record<Role, { label: string; account: string; scope: DataScope; note: string }> = {
  ADMIN: { label: "系统管理员", account: "林管理员", scope: "ALL", note: "账号、权限、视频和打印模板配置；临床业务只读" },
  DOCTOR: { label: "历史医生角色", account: "—", scope: "TEAM", note: "仅用于兼容历史数据，不提供登录入口" },
  REHAB_EXECUTION: { label: "康复师", account: "周康复师", scope: "CENTER", note: "患者、评估、治疗、训练、报告与随访" },
  PATIENT: { label: "患者", account: "陈女士", scope: "SELF_TASK", note: "仅本人数据" }
};

const adminActions: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "REVIEW", "PUBLISH", "UNPUBLISH", "DELETE", "RESTORE", "PERMANENT_DELETE", "PRINT", "EXPORT", "GRANT"];

export const roleActions: Record<Role, PermissionAction[]> = {
  ADMIN: adminActions,
  DOCTOR: ["VIEW"],
  REHAB_EXECUTION: ["VIEW", "CREATE", "EDIT", "REVIEW", "SIGN", "PRINT", "EXPORT", "PUBLISH"],
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
