import { CheckCircle2, FileClock, PenTool, Sparkles } from "lucide-react";
import type { PrescriptionStatus, PrescriptionTask } from "../prescriptionData";
import { PrescriptionWorklist } from "../components/PrescriptionWorklist";
import { PageHeader, StatCard } from "../components/UI";

export function DashboardPage({
  tasks,
  onOpen,
  onGenerate
}: {
  tasks: PrescriptionTask[];
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
}) {
  const count = (status: PrescriptionStatus) => tasks.filter((task) => task.status === status).length;
  return (
    <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader eyebrow="医生处方工作台" title="王医生，上午好" description="根据患者报告完成处方生成、临床复核与签名。训练执行和设备监测由护士工作台与训练平板负责。" action={<span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">今日计划训练 15 人 · 仅供参考</span>} />
      <div className="mb-5 grid grid-cols-4 gap-4">
        <StatCard label="待生成处方" value={String(count("pending_generation"))} note="报告已就绪，等待生成草稿" icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="待医生复核" value={String(count("pending_review"))} note="含初始处方与AI草稿" tone="orange" icon={<FileClock className="h-5 w-5" />} />
        <StatCard label="待数字签名" value={String(count("pending_signature"))} note="参数已确认，等待正式签署" tone="orange" icon={<PenTool className="h-5 w-5" />} />
        <StatCard label="今日已完成" value={String(count("completed"))} note="已形成不可覆盖处方版本" tone="green" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>
      <PrescriptionWorklist tasks={tasks} onOpen={onOpen} onGenerate={onGenerate} compact />
    </section>
  );
}
