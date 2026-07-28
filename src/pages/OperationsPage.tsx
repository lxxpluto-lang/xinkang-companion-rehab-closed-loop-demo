import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  RefreshCcw,
  Router
} from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";

const abnormalDistribution = [
  { label: "患者主诉", value: 4, width: "62%", color: "bg-red-500" },
  { label: "生理指标", value: 3, width: "48%", color: "bg-orange-500" },
  { label: "设备断连", value: 2, width: "32%", color: "bg-amber-400" },
  { label: "数据质量", value: 1, width: "18%", color: "bg-slate-400" }
];

export function OperationsPage({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [resetAt, setResetAt] = useState("");

  function reset() {
    onReset();
    setResetAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    setConfirming(false);
  }

  return (
    <section data-testid="page-VIEW-OPERATIONS">
      <PageHeader
        eyebrow="Demo 运行态势"
        title="运营概览"
        description="展示演示环境的人次、异常、数据质量、AI 与设备指标，不代表正式上线 KPI。"
        action={
          <button className="btn-secondary" type="button" onClick={() => setConfirming(true)} data-action="ACT-DEMO-RESET">
            <RefreshCcw className="h-4 w-4" />演示环境复位
          </button>
        }
      />

      {resetAt && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />Demo 状态已于 {resetAt} 恢复为预设场景。
        </div>
      )}

      <div className="mb-5 grid grid-cols-5 gap-4">
        <StatCard label="今日训练人次" value="18" note="功率车 14 · 视觉训练 4" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="异常事件" value="10" note="均为模拟事件" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="AI 草稿成功率" value="94%" note="失败时降级为结构化模板" tone="green" icon={<Bot className="h-5 w-5" />} />
        <StatCard label="设备连接成功率" value="96%" note="48 次连接 · 2 次模拟失败" tone="green" icon={<Router className="h-5 w-5" />} />
        <StatCard label="平均数据完整度" value="91%" note="缺失不填 0，不参与趋势" tone="orange" icon={<Database className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <section className="card p-5" data-testid="region-REG-OPS-ABNORMAL">
          <SectionHeader title="异常事件分布" description="Demo 日期范围 · 共 10 项" />
          <div className="space-y-4">
            {abnormalDistribution.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium text-slate-700">{item.label}</span><span className="font-bold text-slate-900">{item.value}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">异常数量仅用于展示闭环，不应用于判断真实临床风险。</div>
        </section>

        <section className="card p-5" data-testid="region-REG-OPS-QUALITY">
          <SectionHeader title="数据质量分布" description="统一质量枚举" />
          <div className="flex items-center gap-6">
            <div className="relative h-36 w-36 rounded-full" style={{ background: "conic-gradient(#10b981 0 72%, #3b82f6 72% 86%, #f59e0b 86% 95%, #ef4444 95% 100%)" }}>
              <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-center"><div><p className="text-2xl font-bold text-slate-900">92%</p><p className="text-[10px] text-slate-400">完整度</p></div></div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              {[["valid", "72%", "bg-emerald-500"], ["simulated", "14%", "bg-blue-500"], ["delayed", "9%", "bg-amber-500"], ["missing", "5%", "bg-red-500"]].map(([label, value, color]) => (
                <div className="flex items-center gap-2" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="flex-1 text-slate-600">{label}</span><strong className="text-slate-900">{value}</strong></div>
              ))}
            </div>
          </div>
        </section>

        <section className="card p-5" data-testid="region-REG-OPS-SYSTEM">
          <SectionHeader title="演示服务状态" description="全部为本地 Mock 能力" action={<StatusBadge tone="green">可演示</StatusBadge>} />
          <div className="space-y-3">
            {[
              ["功率车设备适配器", "模拟在线"],
              ["统一指标转换", "正常"],
              ["异常规则引擎", "演示规则"],
              ["AI 草稿服务", "本地预置"],
              ["多模态视觉来源", "占位 PoC"],
              ["HIS / EMR 接口", "未连接"]
            ].map(([service, status], index) => (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3" key={service}>
                <span className={`h-2.5 w-2.5 rounded-full ${index === 5 ? "bg-slate-400" : "bg-emerald-500"}`} />
                <span className="flex-1 text-sm font-medium text-slate-700">{service}</span>
                <span className="text-xs font-semibold text-slate-500">{status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45" role="dialog" aria-modal="true">
          <div className="w-[500px] rounded-2xl bg-white p-6 shadow-2xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><RefreshCcw className="h-6 w-6" /></span>
            <h2 className="mt-4 text-xl font-bold text-slate-950">复位演示环境？</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">将恢复预设患者、处方、训练、异常和报告状态。仅影响本地 Demo，不涉及真实数据。</p>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-secondary" type="button" onClick={() => setConfirming(false)}>取消</button>
              <button className="btn-primary" type="button" onClick={reset}>确认复位</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
