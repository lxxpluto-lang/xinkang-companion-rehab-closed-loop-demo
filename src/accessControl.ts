import {
  Building2,
  CalendarDays,
  ClipboardPlus,
  ClipboardPenLine,
  CalendarCheck2,
  FileSignature,
  LayoutDashboard,
  MonitorUp,
  Siren,
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
  sidebarRoles?: Role[];
  badge?: string;
  hidden?: boolean;
};

const clinicalRoles: Role[] = ["ADMIN", "DOCTOR", "REHAB_EXECUTION"];

export const navItems: NavItem[] = [
  { key: "dashboard", label: "今日工作台", icon: LayoutDashboard, group: "business", roles: clinicalRoles },
  { key: "patients", label: "患者档案", icon: UsersRound, group: "business", roles: clinicalRoles },
  { key: "prescriptions", label: "处方管理", icon: ClipboardPlus, group: "business", roles: ["ADMIN", "DOCTOR"] },
  { key: "treatments", label: "治疗管理", icon: ClipboardPenLine, group: "business", roles: ["ADMIN", "REHAB_EXECUTION"] },
  { key: "alerts", label: "异常警告", icon: Siren, group: "business", roles: clinicalRoles, sidebarRoles: [] },
  { key: "appointments", label: "预约管理", icon: CalendarDays, group: "business", roles: clinicalRoles, sidebarRoles: ["ADMIN"] },
  { key: "followups", label: "随访管理", icon: CalendarCheck2, group: "business", roles: clinicalRoles, sidebarRoles: ["ADMIN"] },
  { key: "training", label: "训练大屏", icon: MonitorUp, group: "business", roles: clinicalRoles },
  { key: "videoConfig", label: "视频资源", icon: Video, group: "admin", roles: clinicalRoles },
  { key: "orgPermissions", label: "组织权限", icon: Building2, group: "admin", roles: ["ADMIN"] },
  { key: "documentConfig", label: "签字管理", icon: FileSignature, group: "admin", roles: clinicalRoles }
];

export const roleMeta: Record<Role, { label: string; account: string; scope: DataScope; note: string }> = {
  ADMIN: { label: "系统管理员", account: "林管理员", scope: "ALL", note: "全部业务与后台管理权限；操作以管理员本人身份留痕" },
  DOCTOR: { label: "康复医生", account: "王医生", scope: "TEAM", note: "查看团队患者，复核本人处方任务与异常事件；训练大屏只读" },
  REHAB_EXECUTION: { label: "康复师", account: "周康复师", scope: "CENTER", note: "患者、评估、治疗、训练、报告与随访" },
  PATIENT: { label: "患者", account: "陈女士", scope: "SELF_TASK", note: "仅本人数据" }
};

const adminActions: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "REVIEW", "SIGN", "PUBLISH", "UNPUBLISH", "DELETE", "RESTORE", "PERMANENT_DELETE", "PRINT", "EXPORT", "GRANT"];

export const roleActions: Record<Role, PermissionAction[]> = {
  ADMIN: adminActions,
  DOCTOR: ["VIEW", "CREATE", "EDIT", "REVIEW", "SIGN", "PRINT", "EXPORT", "PUBLISH"],
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
