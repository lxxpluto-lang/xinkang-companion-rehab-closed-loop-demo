import { ClipboardList } from "lucide-react";
import { PrescriptionWorklist } from "../components/PrescriptionWorklist";
import { PageHeader } from "../components/UI";
import type { PrescriptionTask } from "../prescriptionData";

export function PrescriptionManagementPage({ tasks, onOpen, onGenerate }: { tasks: PrescriptionTask[]; onOpen: (id: string) => void; onGenerate: (id: string) => void }) {
  return (
    <section data-testid="page-VIEW-PRESCRIPTIONS">
      <PageHeader eyebrow="处方管理" title="运动处方任务" description="初始处方由康复医生录入；调整处方必须关联单次或阶段性报告，并由医生完成复核、签名和版本发布。" action={<span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"><ClipboardList className="h-4 w-4 text-blue-600" />共 {tasks.length} 项</span>} />
      <PrescriptionWorklist tasks={tasks} onOpen={onOpen} onGenerate={onGenerate} />
    </section>
  );
}
