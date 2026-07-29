import {
  Activity,
  AlertTriangle,
  BellRing,
  Building2,
  ClipboardList,
  FileCheck2,
  FileSignature,
  Gauge,
  LayoutDashboard,
  ListChecks,
  MonitorUp,
  Settings2,
  ShieldCheck,
  Stethoscope,
  UserCog,
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
  submenus: string[];
  badge?: string;
};

const clinicalRoles: Role[] = ["ADMIN", "DOCTOR", "REHAB_EXECUTION"];

export const navItems: NavItem[] = [
  { key: "dashboard", label: "今日工作台", icon: LayoutDashboard, group: "business", roles: clinicalRoles, submenus: ["我的待办", "处方待办", "异常待处理", "今日训练概览", "最近阶段报告"] },
  { key: "patients", label: "患者管理", icon: UsersRound, group: "business", roles: clinicalRoles, submenus: ["团队患者", "本中心患者", "首次建档", "患者档案", "资料更正申请"] },
  { key: "report", label: "报告中心", icon: FileCheck2, group: "business", roles: clinicalRoles, submenus: ["单次报告", "阶段性报告", "待审核报告", "已审核报告", "历史报告"] },
  { key: "prescriptions", label: "处方管理", icon: ClipboardList, group: "business", roles: ["ADMIN", "DOCTOR"], submenus: ["待出具", "AI 草稿", "待复核", "待签署", "已生效", "已完成", "处方版本", "打印与签名记录"] },
  { key: "training", label: "训练工作台", icon: MonitorUp, group: "business", roles: clinicalRoles, submenus: ["今日训练计划", "待接诊", "训练前准备", "训练中", "现场记录", "工位状态", "训练大屏"] },
  { key: "abnormal", label: "异常中心", icon: AlertTriangle, group: "business", roles: clinicalRoles, submenus: ["训练异常", "生理指标异常", "患者主诉", "随访异常", "待医生复核", "已关闭事件"], badge: "2" },
  { key: "followup", label: "随访管理", icon: ListChecks, group: "business", roles: clinicalRoles, submenus: ["今日待随访", "共享任务池", "我的随访", "随访计划", "失访管理", "异常升级"] },
  { key: "videos", label: "视频资源", icon: Video, group: "business", roles: clinicalRoles, submenus: ["视频库", "我的草稿", "上传视频", "链接嵌入", "提交发布", "使用记录"] },
  { key: "adminOverview", label: "管理概览", icon: Gauge, group: "admin", roles: ["ADMIN"], submenus: ["运行概览", "权限提醒", "内容待办", "高风险操作", "系统告警"] },
  { key: "organization", label: "组织与账号", icon: Building2, group: "admin", roles: ["ADMIN"], submenus: ["机构与院区", "康复中心", "科室管理", "用户账号", "医疗团队", "任务负责人"] },
  { key: "permissions", label: "权限中心", icon: UserCog, group: "admin", roles: ["ADMIN"], submenus: ["角色管理", "菜单权限", "操作权限", "数据范围", "字段权限", "特别授权", "变更记录"] },
  { key: "videoConfig", label: "视频配置", icon: Video, group: "admin", roles: ["ADMIN"], submenus: ["视频审核", "发布与下架", "删除与恢复", "分类标签", "运动项目关联", "默认视频", "域名白名单"] },
  { key: "businessConfig", label: "业务配置", icon: Settings2, group: "admin", roles: ["ADMIN"], submenus: ["运动项目字典", "处方参数范围", "危险分组", "随访规则", "异常事件分级", "医生复核规则"] },
  { key: "trainingConfig", label: "训练与设备", icon: Activity, group: "admin", roles: ["ADMIN"], submenus: ["设备类型", "设备编号", "工位管理", "蓝牙规则", "采集项", "告警阈值", "语音与声音"] },
  { key: "documentConfig", label: "报告、打印与签名", icon: FileSignature, group: "admin", roles: ["ADMIN"], submenus: ["报告模板", "处方打印模板", "数字签名", "签名授权", "签署与打印记录"] },
  { key: "notifications", label: "消息与通知", icon: BellRing, group: "admin", roles: ["ADMIN"], submenus: ["站内通知", "待办提醒", "异常提醒", "随访提醒", "消息模板"] },
  { key: "audit", label: "数据与审计", icon: ShieldCheck, group: "admin", roles: ["ADMIN"], submenus: ["操作日志", "登录日志", "资料变更", "处方与签名", "视频操作", "权限变更", "数据导出"] },
  { key: "integrations", label: "系统与接口", icon: Stethoscope, group: "admin", roles: ["ADMIN"], submenus: ["系统参数", "身份认证", "设备接口", "第三方接口", "文件存储", "运行状态"] }
];

export const roleMeta: Record<Role, { label: string; account: string; scope: DataScope; note: string }> = {
  ADMIN: { label: "系统管理员", account: "林管理员", scope: "ALL", note: "系统与临床全部权限" },
  DOCTOR: { label: "康复医生", account: "王医生", scope: "TEAM", note: "团队共享查看 · 本人任务负责" },
  REHAB_EXECUTION: { label: "康复执行岗", account: "周康复师", scope: "CENTER", note: "当前康复中心执行与随访" },
  PATIENT: { label: "患者", account: "陈建国", scope: "SELF_TASK", note: "仅本人数据" }
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
