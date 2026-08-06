import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileHeart,
  FileText,
  HeartPulse,
  PenLine,
  PhoneCall,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { demoPatients } from "../mockData";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { singleTrainingReportDetails } from "../clinicalSharedData";
import { calculateSppb, createBlankSppb, type AssessmentRecord, type OcrAssessmentImportDraft } from "../assessmentData";
import type { FollowUpRecord, FollowUpTask } from "../followUpData";
import type {
  ClinicalNarrativeRecord,
  PatientClinicalProfile,
} from "../prescriptionWorkspaceData";
import {
  treatmentInterventionOptions,
  treatmentStatusLabel,
  type CardiopulmonaryTreatmentRecord,
  type TreatmentIntervention,
} from "../treatmentData";
import type {
  ClinicalDataSource,
  FieldCollectionStatus,
  PatientRecordStatus,
  PatientStatus,
  Role,
  StaffRole,
  TreatmentSignature,
} from "../types";
import type { RehabReport } from "../dischargeHandbookData";
import { readStaffSignature } from "../signatureStore";

export type PatientWorkspaceTab =
  | "profile"
  | "assessments"
  | "sessions"
  | "treatments"
  | "rehabReports"
  | "followups";
type TrainingTab = "actual" | "single" | "stage";

export type ManagedPatient = {
  patient_demo_id: string;
  patient_code: string;
  patient_no: string;
  hospital_patient_no: string;
  institution_id: string;
  institution_name: string;
  environment: "测试环境" | "生产环境";
  record_source: "手工补录基础资料" | "OCR单张导入" | "OCR批量导入";
  source_file_name: string;
  ocr_confidence: number | null;
  review_status: "待核对" | "已确认" | "已拒绝";
  reviewed_by: string;
  reviewed_at: string;
  record_status: "有效" | "已归档";
  workflow_status: PatientRecordStatus;
  field_status: Record<string, FieldCollectionStatus>;
  name: string;
  id_number: string;
  id_type: "身份证" | "护照" | "其他";
  phone: string;
  birth_date: string;
  age: number;
  gender: string;
  emergency_contact: string;
  emergency_relation: string;
  emergency_phone: string;
  assigned_doctor: string;
  diagnosis_summary: string;
  medical_history: string;
  procedure_history: string;
  current_medications: string;
  drug_allergies: string;
  exercise_precautions: string;
  referral_source: string;
  discharge_date: string;
  planned_rehab_date: string;
  risk_level: string;
  rehab_group: string;
  rehab_stage: string;
  consent_status: string;
  consent_time: string;
  consent_method: string;
  height_cm: string;
  weight_kg: string;
  record_note: string;
  clinical_confirmed: boolean;
  clinical_confirmed_by: string;
  clinical_confirmed_role: string;
  clinical_confirmed_at: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  audit_log: string[];
  assessment: { cpet: string; six_mwt: string; resting_hr: number };
  prescription_version: string;
  training_status: string;
  latest_abnormal: string;
  report_status: string;
  last_followup: string;
  patient_status?: PatientStatus;
};

const profiles = [
  [
    "陈女士",
    "000001",
    "1967-04-18",
    "女",
    "136****2031",
    "Ⅱ期 · 第4周",
    "2026-07-02",
    "rehabilitation",
  ],
  [
    "李秀兰",
    "000002",
    "1968-09-12",
    "女",
    "136****1938",
    "Ⅱ期 · 第2周",
    "2026-06-20",
    "prescription_opened",
  ],
  [
    "王先生",
    "000003",
    "1960-02-26",
    "男",
    "159****2850",
    "Ⅱ期 · 第3周",
    "2026-05-02",
    "rehabilitation",
  ],
  [
    "赵女士",
    "000004",
    "1966-11-03",
    "女",
    "137****8246",
    "随访期",
    "2026-07-08",
    "recovered",
  ],
] as const;

export const initialPatients: ManagedPatient[] = demoPatients.map(
  (raw, index) => {
    const [name, no, birth, gender, phone, stage, discharge, status] =
      profiles[index];
    return {
      ...raw,
      patient_demo_id: raw.patient_demo_id,
      patient_code: `CRH-P-2026-${no}`,
      patient_no: no,
      hospital_patient_no: no,
      institution_id: "ORG-DEMO-001",
      institution_name: "示例康复中心",
      environment: "测试环境",
      record_source: "手工补录基础资料",
      source_file_name: "",
      ocr_confidence: null,
      review_status: "已确认",
      reviewed_by: "周康复师",
      reviewed_at: "2026-07-20 09:35",
      record_status: "有效",
      workflow_status: "confirmed",
      field_status: {},
      name,
      id_number: "",
      id_type: "身份证",
      phone,
      birth_date: birth,
      age: calculateAge(birth),
      gender,
      emergency_contact: "",
      emergency_relation: "",
      emergency_phone: "",
      assigned_doctor: "外部资料记录",
      diagnosis_summary: raw.diagnosis_summary || "冠心病术后康复",
      medical_history: "未提供",
      procedure_history: index === 0 ? "PCI术后" : "未提供",
      current_medications:
        index === 0 ? "阿司匹林、美托洛尔（外部资料）" : "未提供",
      drug_allergies: "未提供",
      exercise_precautions: "以院方正式处方为准",
      referral_source: "院内转介",
      discharge_date: discharge,
      planned_rehab_date: "",
      risk_level: raw.risk_level || "未提供",
      rehab_group: "运动康复组",
      rehab_stage: stage,
      consent_status: "",
      consent_time: "",
      consent_method: "",
      height_cm: "",
      weight_kg: "",
      record_note: "",
      clinical_confirmed: false,
      clinical_confirmed_by: "",
      clinical_confirmed_role: "",
      clinical_confirmed_at: "",
      created_by: "周康复师",
      created_at: "2026-07-20 09:20",
      updated_by: "周康复师",
      updated_at: "2026-07-28 10:10",
      audit_log: [],
      patient_status: status,
      last_followup: "",
    };
  },
);

export function calculateAge(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  return Math.max(
    0,
    now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
        ? 1
        : 0),
  );
}

const trainingRecords = [
  {
    id: "TR-20260725-012",
    patientId: "P-DEMO-001",
    date: "2026-07-25 09:30",
    project: "功率车",
    duration: 30,
    avgHr: 103,
    peakHr: 116,
    spo2: 97,
    rpe: 12,
    completeness: 96,
    event: "短暂胸闷，暂停后缓解",
    prescriptionTaskId: "RX-TASK-001",
    prescriptionVersion: "V2",
    source: "prescription" as const,
  },
  {
    id: "TR-20260723-011",
    patientId: "P-DEMO-001",
    date: "2026-07-23 09:20",
    project: "功率车",
    duration: 30,
    avgHr: 101,
    peakHr: 114,
    spo2: 98,
    rpe: 11,
    completeness: 94,
    event: "无",
    prescriptionTaskId: "RX-TASK-001",
    prescriptionVersion: "V2",
    source: "prescription" as const,
  },
  {
    id: "TR-20260716-009",
    patientId: "P-DEMO-001",
    date: "2026-07-16 09:10",
    project: "八段锦",
    duration: 18,
    avgHr: 88,
    peakHr: 96,
    spo2: 98,
    rpe: 9,
    completeness: 90,
    event: "无",
    prescriptionTaskId: undefined,
    prescriptionVersion: undefined,
    source: "appointment" as const,
  },
  {
    id: "TR-20260712-008",
    patientId: "P-DEMO-001",
    date: "2026-07-12 09:00",
    project: "腹式呼吸",
    duration: 12,
    avgHr: 75,
    peakHr: 82,
    spo2: 99,
    rpe: 7,
    completeness: 92,
    event: "无",
    prescriptionTaskId: undefined,
    prescriptionVersion: undefined,
    source: "onsite_supplement" as const,
  },
];

const statusLabels: Record<PatientStatus, string> = {
  prescription_opened: "开具处方",
  rehabilitation: "康复治疗",
  recovered: "已康复",
};

export function PatientArchivePage({
  role,
  currentAccount = "周康复师",
  patients,
  followUpTasks = [],
  followUpRecords = [],
  assessmentRecords = [],
  treatmentRecords = [],
  rehabReports = [],
  initialPatientId,
  initialTab = "profile",
  initialRecordId,
  initialRecordKind,
  onSavePatient,
  onOpenFollowUp,
  onOpenAssessment,
  onSaveTreatmentRecord,
  onSaveRehabReport,
  onSaveAssessment,
}: {
  role: Exclude<Role, "PATIENT">;
  currentAccount?: string;
  patients: ManagedPatient[];
  followUpTasks?: FollowUpTask[];
  followUpRecords?: FollowUpRecord[];
  clinicalNarratives?: ClinicalNarrativeRecord[];
  clinicalProfiles?: PatientClinicalProfile[];
  assessmentRecords?: AssessmentRecord[];
  treatmentRecords?: CardiopulmonaryTreatmentRecord[];
  rehabReports?: RehabReport[];
  initialPatientId?: string | null;
  initialTab?: PatientWorkspaceTab;
  initialRecordId?: string | null;
  initialRecordKind?: string | null;
  onSavePatient: (
    patient: ManagedPatient,
    previousDischargeDate: string,
    reason: string,
  ) => void;
  onUpdatePatient?: (patient: ManagedPatient) => void;
  onOpenFollowUp: (taskId: string) => void;
  onOpenAssessment: (patientId?: string, recordId?: string) => void;
  onOpenDischargeReport?: (patientId: string) => void;
  onSaveTreatmentRecord?: (record: CardiopulmonaryTreatmentRecord) => void;
  onSaveRehabReport?: (report: RehabReport) => void;
  onSaveAssessment?: (record: AssessmentRecord) => void;
}) {
  const [selectedId, setSelectedId] = useState(initialPatientId ?? null);
  const [tab, setTab] = useState<PatientWorkspaceTab>(
    initialTab === ("reports" as PatientWorkspaceTab) ? "sessions" : initialTab,
  );
  const [trainingTab, setTrainingTab] = useState<TrainingTab>(
    initialRecordKind === "single"
      ? "single"
      : initialRecordKind === "stage"
        ? "stage"
        : "actual",
  );
  const [nameFilter, setNameFilter] = useState("");
  const [patientNoFilter, setPatientNoFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("全部阶段");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [ocrPickerOpen, setOcrPickerOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedPatient | null>(null);
  const [treatmentDraft, setTreatmentDraft] =
    useState<CardiopulmonaryTreatmentRecord | null>(
      () =>
        treatmentRecords.find((item) => item.treatmentId === initialRecordId) ??
        null,
    );
  const [selectedStageSessions, setSelectedStageSessions] = useState<string[]>(
    [],
  );
  const [stageDraftOpen, setStageDraftOpen] = useState(false);
  const [stageSent, setStageSent] = useState(false);
  const selected =
    patients.find((item) => item.patient_demo_id === selectedId) ?? null;
  const filtered = useMemo(
    () =>
      patients.filter(
        (item) =>
          (!nameFilter ||
            item.name.toLowerCase().includes(nameFilter.toLowerCase())) &&
          (!patientNoFilter ||
            item.patient_no
              .toLowerCase()
              .includes(patientNoFilter.toLowerCase())) &&
          (stageFilter === "全部阶段" || item.rehab_stage === stageFilter) &&
          (statusFilter === "全部状态" ||
            statusLabels[item.patient_status ?? "rehabilitation"] ===
              statusFilter),
      ),
    [patients, nameFilter, patientNoFilter, stageFilter, statusFilter],
  );
  const canEdit = role !== "DOCTOR";
  const canImportAssessment = role === "REHAB_EXECUTION";

  if (treatmentDraft && selected)
    return (
      <TreatmentRecordPage
        patient={selected}
        record={treatmentDraft}
        role={role as StaffRole}
        onBack={() => setTreatmentDraft(null)}
        onSave={(record) => {
          onSaveTreatmentRecord?.(record);
          setTreatmentDraft(record);
        }}
        onCorrect={(record) => setTreatmentDraft(record)}
      />
    );

  if (!selected)
    return (
      <section data-testid="page-VIEW-PATIENTS">
        <PageHeader
          eyebrow="康复管理端"
          title="患者档案"
          description="按姓名、患者编号、康复阶段和患者状态查询；本系统不维护完整HIS病历。"
          action={
            canEdit ? (
              <div className="flex gap-2">
                {canImportAssessment && <button
                  type="button"
                  onClick={() => setOcrPickerOpen(true)}
                  className="btn-secondary"
                >
                  <Upload className="h-4 w-4" />
                  体能评估OCR识别
                </button>}
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...patients[0],
                      patient_demo_id: `P-DEMO-${Date.now()}`,
                      name: "",
                      patient_no: "",
                      hospital_patient_no: "",
                      phone: "",
                      birth_date: "",
                      age: 0,
                    })
                  }
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  手工补录基础资料
                </button>
              </div>
            ) : undefined
          }
        />
        <section className="card p-4">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-3">
            <label>
              <span className="field-label">患者姓名</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  className="text-field pl-9"
                  placeholder="输入患者姓名"
                />
              </div>
            </label>
            <label>
              <span className="field-label">患者编码</span>
              <input
                value={patientNoFilter}
                onChange={(event) => setPatientNoFilter(event.target.value)}
                className="text-field"
                placeholder="输入患者编码"
              />
            </label>
            <label>
              <span className="field-label">康复阶段</span>
              <select
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
                className="text-field"
              >
                <option>全部阶段</option>
                {Array.from(
                  new Set(patients.map((item) => item.rehab_stage)),
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">患者状态</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="text-field"
              >
                <option>全部状态</option>
                <option>开具处方</option>
                <option>康复治疗</option>
                <option>已康复</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setNameFilter("");
                setPatientNoFilter("");
                setStageFilter("全部阶段");
                setStatusFilter("全部状态");
              }}
              className="btn-secondary"
            >
              清空筛选
            </button>
          </div>
        </section>
        <section className="card mt-4 overflow-hidden">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.75fr_1fr_0.85fr_0.85fr_0.6fr] bg-slate-50 px-5 py-3 text-[10px] font-bold text-slate-400">
            <span>患者</span>
            <span>患者编号</span>
            <span>性别/年龄</span>
            <span>康复阶段</span>
            <span>患者状态</span>
            <span>最近训练</span>
            <span>操作</span>
          </div>
          {filtered.map((patient) => (
            <button
              type="button"
              key={patient.patient_demo_id}
              onClick={() => {
                setSelectedId(patient.patient_demo_id);
                setTab("profile");
              }}
              className="grid w-full grid-cols-[1.1fr_0.8fr_0.75fr_1fr_0.85fr_0.85fr_0.6fr] items-center border-t border-slate-100 px-5 py-4 text-left text-xs hover:bg-blue-50"
            >
              <b>{patient.name}</b>
              <span className="font-mono">{patient.patient_no}</span>
              <span>
                {patient.gender} / {patient.age}
              </span>
              <span>{patient.rehab_stage}</span>
              <StatusBadge
                tone={
                  patient.patient_status === "recovered"
                    ? "green"
                    : patient.patient_status === "prescription_opened"
                      ? "orange"
                      : "blue"
                }
              >
                {statusLabels[patient.patient_status ?? "rehabilitation"]}
              </StatusBadge>
              <span>
                {patient.patient_demo_id === "P-DEMO-001"
                  ? "7月25日"
                  : "未采集"}
              </span>
              <b className="text-blue-700">打开档案</b>
            </button>
          ))}
        </section>
        {ocrPickerOpen && <OcrImportDialog patients={patients} currentAccount={currentAccount} onClose={() => setOcrPickerOpen(false)} onConfirm={(patient, record) => {
          const previousDischargeDate = patients.find((item) => item.patient_demo_id === patient.patient_demo_id)?.discharge_date ?? "";
          onSavePatient(patient, previousDischargeDate, "体能评估OCR核对归档");
          onSaveAssessment?.(record);
          setOcrPickerOpen(false);
        }} />}
        {editing && (
          <PatientModal
            patient={editing}
            onChange={setEditing}
            onClose={() => setEditing(null)}
            onSave={() => {
              onSavePatient(
                {
                  ...editing,
                  age: calculateAge(editing.birth_date),
                  patient_no:
                    editing.patient_no ||
                    String(patients.length + 1).padStart(6, "0"),
                  hospital_patient_no:
                    editing.patient_no ||
                    String(patients.length + 1).padStart(6, "0"),
                },
                "",
                "",
              );
              setEditing(null);
            }}
          />
        )}
      </section>
    );

  const patientAssessments = assessmentRecords.filter(
    (item) => item.patientId === selected.patient_demo_id,
  );
  const patientTreatments = treatmentRecords.filter(
    (item) => item.patientId === selected.patient_demo_id,
  );
  const patientSessions = trainingRecords.filter(
    (item) => item.patientId === selected.patient_demo_id,
  );
  return (
    <section>
      <PageHeader
        eyebrow="患者档案"
        title={`${selected.name} · ${selected.patient_no}`}
        description={`${statusLabels[selected.patient_status ?? "rehabilitation"]} · ${selected.rehab_stage} · 正式处方来源于医院原流程`}
        action={
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回患者列表
          </button>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm">
        {(
          [
            ["profile", "基础档案"],
            ["assessments", "体能评估"],
            ["sessions", "训练记录"],
            ["treatments", "治疗记录"],
            ["rehabReports", "康复报告"],
            ["followups", "随访记录"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => { setTab(key); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" })); }}
            data-testid={`patient-tab-${key}`}
            className={`flex-none rounded-lg px-5 py-2.5 text-xs font-bold ${tab === key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "profile" && (
        <Profile
          patient={selected}
          canEdit={canEdit}
          onEdit={() => setEditing({ ...selected })}
        />
      )}
      {tab === "assessments" && (
        <RecordList
          title="体能评估报告"
          description="支持批量OCR、单张OCR和手工录入；点击记录将在新网页页签打开。"
          action={
            canEdit ? (
              <button
                type="button"
                onClick={() => onOpenAssessment(selected.patient_demo_id)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                新建体能评估
              </button>
            ) : undefined
          }
          headers={[
            "评估日期",
            "评估次数",
            "录入方式",
            "SPPB总分",
            "状态",
            "操作",
          ]}
          rows={patientAssessments.map((item) => [
            item.assessedAt.slice(0, 10),
            `第${item.attemptNo}次`,
            item.source.startsWith("ocr") ? "OCR辅助" : "手工录入",
            `${item.sppb.totalScore}/12`,
            item.status === "completed" ? "已完成" : "草稿",
            <button
              className="text-blue-700"
              onClick={() =>
                onOpenAssessment(selected.patient_demo_id, item.assessmentId)
              }
            >
              新页签查看
            </button>,
          ])}
        />
      )}
      {tab === "treatments" && (
        <RecordList
          title="心肺康复治疗记录"
          description="严格记录训练前、实施项目、训练后评估和签名日期。"
          action={
            role === "REHAB_EXECUTION" ? (
              <button
                type="button"
                onClick={() =>
                  setTreatmentDraft(
                    createBlankTreatment(selected, currentAccount),
                  )
                }
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                新增治疗记录
              </button>
            ) : undefined
          }
          headers={[
            "治疗日期",
            "治疗记录号",
            "训练项目",
            "生命体征",
            "状态",
            "操作",
          ]}
          rows={patientTreatments.map((item) => [
            item.treatmentAt.slice(0, 10),
            item.treatmentNo,
            item.interventions
              .filter((x) => x.selected)
              .map((x) => x.label)
              .join("、"),
            `${item.preAssessment.heartRate ?? "—"} → ${item.postAssessment.heartRate ?? "—"} bpm`,
            treatmentStatusLabel(item.status),
            <button
              className="text-blue-700"
              onClick={() =>
                openPatientRecord(
                  selected.patient_demo_id,
                  "treatments",
                  item.treatmentId,
                )
              }
            >
              新页签查看
            </button>,
          ])}
        />
      )}
      {tab === "sessions" && (
        <TrainingWorkspace
          patient={selected}
          sessions={patientSessions}
          initialRecordId={initialRecordId}
          trainingTab={trainingTab}
          setTrainingTab={setTrainingTab}
          selectedStageSessions={selectedStageSessions}
          setSelectedStageSessions={setSelectedStageSessions}
          stageDraftOpen={stageDraftOpen}
          setStageDraftOpen={setStageDraftOpen}
          stageSent={stageSent}
          setStageSent={setStageSent}
          canEdit={false}
          currentAccount={currentAccount}
        />
      )}
      {tab === "rehabReports" && (
        <RehabReportWorkspace
          patient={selected}
          reports={rehabReports.filter(
            (item) => item.patientId === selected.patient_demo_id,
          )}
          initialReportId={initialRecordId}
        />
      )}
      {tab === "followups" && (
        <RecordList
          title="随访记录"
          description="只保留人工电话随访闭环；高风险情况提示线下联系医疗人员。"
          headers={[
            "联系时间",
            "联系结果",
            "患者口述",
            "训练参与",
            "下次联系",
            "操作",
          ]}
          rows={followUpRecords
            .filter((item) => item.patientId === selected.patient_demo_id)
            .map((item) => [
              item.contactedAt,
              item.contactResult,
              item.symptoms.join("、") || "无明显不适",
              item.exerciseAdherence,
              item.nextContactDate || "—",
              <button
                className="text-blue-700"
                onClick={() =>
                  openFollowUpTab(selected.patient_demo_id, item.taskId)
                }
              >
                新页签查看
              </button>,
            ])}
          action={
            canEdit &&
            followUpTasks.find(
              (item) => item.patientId === selected.patient_demo_id,
            ) ? (
              <button
                type="button"
                onClick={() =>
                  onOpenFollowUp(
                    followUpTasks.find(
                      (item) => item.patientId === selected.patient_demo_id,
                    )!.id,
                  )
                }
                className="btn-primary"
              >
                <PhoneCall className="h-4 w-4" />
                新增电话记录
              </button>
            ) : undefined
          }
        />
      )}
      {editing && (
        <PatientModal
          patient={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => {
            onSavePatient(
              { ...editing, age: calculateAge(editing.birth_date) },
              selected.discharge_date,
              "基础资料更正",
            );
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function Profile({
  patient,
  canEdit,
  onEdit,
}: {
  patient: ManagedPatient;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <section className="card p-5">
      <SectionHeader
        title="基础档案与必要临床信息"
        description="只保留训练、治疗记录和随访所需字段。"
        action={
          canEdit ? (
            <button type="button" onClick={onEdit} className="btn-secondary">
              <PenLine className="h-4 w-4" />
              编辑
            </button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-4 gap-3">
        {[
          ["姓名", patient.name],
          ["性别/年龄", `${patient.gender} / ${patient.age}岁`],
          ["出生日期", patient.birth_date],
          ["患者编号", patient.patient_no],
          ["联系方式", patient.phone || "未提供"],
          [
            "患者状态",
            statusLabels[patient.patient_status ?? "rehabilitation"],
          ],
          ["康复阶段", patient.rehab_stage],
          ["出院日期", patient.discharge_date || "未提供"],
          ["诊断", cleanMissing(patient.diagnosis_summary)],
          ["手术方式/记录", cleanMissing(patient.procedure_history)],
          ["特殊用药", cleanMissing(patient.current_medications)],
          ["最近训练/评估/随访", "7月25日 / 7月20日 / 未记录"],
        ].map(([label, value]) => (
          <Info key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function RecordList({
  title,
  description,
  headers,
  rows,
  action,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: React.ReactNode[][];
  action?: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="p-5">
        <SectionHeader
          title={title}
          description={description}
          action={action}
        />
      </div>
      <div
        className="grid border-y border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-bold text-slate-400"
        style={{
          gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
        }}
      >
        {headers.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      {rows.length ? (
        rows.map((row, index) => (
          <div
            key={index}
            className="grid items-center border-b border-slate-100 px-5 py-4 text-xs text-slate-600"
            style={{
              gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
            }}
          >
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="pr-2">
                {cell}
              </div>
            ))}
          </div>
        ))
      ) : (
        <div className="py-14 text-center text-xs text-slate-400">暂无记录</div>
      )}
    </section>
  );
}

function TrainingWorkspace(props: {
  patient: ManagedPatient;
  sessions: typeof trainingRecords;
  initialRecordId?: string | null;
  trainingTab: TrainingTab;
  setTrainingTab: (v: TrainingTab) => void;
  selectedStageSessions: string[];
  setSelectedStageSessions: (v: string[]) => void;
  stageDraftOpen: boolean;
  setStageDraftOpen: (v: boolean) => void;
  stageSent: boolean;
  setStageSent: (v: boolean) => void;
  canEdit: boolean;
  currentAccount: string;
}) {
  const { sessions } = props;
  const prescriptionCycleSessions = sessions.filter(
    (item) => item.prescriptionTaskId === "RX-TASK-001",
  );
  const canGeneratePrescriptionCycle = prescriptionCycleSessions.length >= 2;
  const tabs: [TrainingTab, string][] = [
    ["actual", "实际训练"],
    ["single", "单次报告"],
    ["stage", "阶段报告"],
  ];
  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-xl border border-slate-100 bg-white p-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => props.setTrainingTab(key)}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${props.trainingTab === key ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {props.trainingTab === "actual" &&
        (props.initialRecordId ? (
          <ActualTrainingCard
            session={sessions.find((item) => item.id === props.initialRecordId)}
          />
        ) : (
          <RecordList
            title="实际训练记录"
            description="仅统计实际发生的训练，不计算处方计划完成率。"
            headers={[
              "训练日期",
              "项目",
              "实际时长",
              "平均/峰值心率",
              "最低血氧",
              "RPE",
              "异常",
              "操作",
            ]}
            rows={sessions.map((item) => [
              item.date,
              item.project,
              `${item.duration}分钟`,
              `${item.avgHr}/${item.peakHr} bpm`,
              `${item.spo2}%`,
              item.rpe,
              item.event,
              <button
                className="text-blue-700"
                onClick={() =>
                  openPatientRecord(
                    props.patient.patient_demo_id,
                    "sessions",
                    item.id,
                    "actual",
                  )
                }
              >
                新页签查看
              </button>,
            ])}
          />
        ))}
      {props.trainingTab === "single" &&
        (props.initialRecordId ? (
          <SingleReportCard reportId={props.initialRecordId} />
        ) : (
          <RecordList
            title="单次报告"
            description="与患者端同步；点击后在新网页页签查看。"
            headers={[
              "报告号",
              "训练日期",
              "运动类型",
              "时长",
              "平均心率",
              "状态",
              "操作",
            ]}
            rows={singleTrainingReportDetails
              .filter(
                (item) => item.patientId === props.patient.patient_demo_id,
              )
              .map((item) => [
                item.singleReportNo,
                item.actualStartAt.slice(0, 10),
                item.exercise,
                `${item.totalMinutes}分钟`,
                `${item.hrStats.average} bpm`,
                "已生成",
                <button
                  className="text-blue-700"
                  onClick={() =>
                    openPatientRecord(
                      props.patient.patient_demo_id,
                      "sessions",
                      item.id,
                      "single",
                    )
                  }
                >
                  新页签查看
                </button>,
              ])}
          />
        ))}
      {props.trainingTab === "stage" && (
        <section className="card p-5">
          <SectionHeader
            title="阶段报告"
            description={canGeneratePrescriptionCycle ? "已关联签署处方，可按同一处方关联的已完成训练生成全周期AI报告。" : "未关联可靠处方时，由康复师选择至少2次实际训练生成阶段报告。"}
            action={
              props.canEdit ? (
                <button
                  type="button"
                  disabled={sessions.length < 2}
                  onClick={() => {
                    props.setSelectedStageSessions(
                      (canGeneratePrescriptionCycle ? prescriptionCycleSessions : sessions).map((item) => item.id),
                    );
                    props.setStageSent(false);
                    props.setStageDraftOpen(true);
                  }}
                  className="btn-primary disabled:bg-slate-300"
                >
                  <FileHeart className="h-4 w-4" />
                  {props.stageSent ? "生成新版本" : canGeneratePrescriptionCycle ? "AI生成全周期报告" : "生成阶段报告"}
                </button>
              ) : undefined
            }
          />
          {props.stageSent && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
              <b>阶段报告已发送患者端</b>
              <p className="mt-1">
                已锁定纳入记录、发送人和发送时间；如需调整请生成新报告。
              </p>
            </div>
          )}
          {!props.stageSent && !props.stageDraftOpen && (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-xs text-slate-500">
              当前有 {sessions.length}{" "}
              条已完成训练，可由康复师决定何时生成阶段报告。
            </div>
          )}
          {props.stageDraftOpen && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <b className="text-sm">确认纳入范围</b>
                <p className="mt-1 text-xs text-slate-600">
                  {canGeneratePrescriptionCycle ? "默认纳入处方 RX-10001-0020 · V2 关联的全部已完成训练；至少保留2条。" : "默认选择上一份已发送报告之后的全部已完成记录；至少保留2条。"}
                </p>
                <div className="mt-3 space-y-2">
                  {sessions.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg bg-white p-3 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={props.selectedStageSessions.includes(item.id)}
                        onChange={() =>
                          props.setSelectedStageSessions(
                            props.selectedStageSessions.includes(item.id)
                              ? props.selectedStageSessions.filter(
                                  (id) => id !== item.id,
                                )
                              : [...props.selectedStageSessions, item.id],
                          )
                        }
                      />
                      <b>{item.date}</b>
                      <span>
                        {item.project} · {item.duration}分钟
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Info
                  label="纳入次数"
                  value={`${props.selectedStageSessions.length}次`}
                />
                <Info
                  label="报告周期"
                  value={`${sessions.at(-1)?.date.slice(0, 10)} 至 ${sessions[0]?.date.slice(0, 10)}`}
                />
                <Info
                  label="实际总时长"
                  value={`${sessions.filter((x) => props.selectedStageSessions.includes(x.id)).reduce((sum, x) => sum + x.duration, 0)}分钟`}
                />
                <Info
                  label="数据完整率"
                  value={`${Math.round(sessions.filter((x) => props.selectedStageSessions.includes(x.id)).reduce((sum, x) => sum + x.completeness, 0) / Math.max(props.selectedStageSessions.length, 1))}%`}
                />
              </div>
              <section className="rounded-xl border border-slate-100 p-4">
                <b className="text-xs">按运动类型分别汇总</b>
                {Array.from(
                  new Set(
                    sessions
                      .filter((x) => props.selectedStageSessions.includes(x.id))
                      .map((x) => x.project),
                  ),
                ).map((project) => (
                  <p key={project} className="mt-2 text-xs text-slate-600">
                    <b>{project}</b>：
                    {
                      sessions.filter(
                        (x) =>
                          x.project === project &&
                          props.selectedStageSessions.includes(x.id),
                      ).length
                    }
                    次；不与其他运动混算功率、速度或目标心率。
                  </p>
                ))}
              </section>
              <label className="block">
                <span className="field-label">康复师阶段结论与患者建议</span>
                <textarea
                  className="text-field min-h-24"
                  defaultValue="患者训练参与情况总体稳定，建议继续按院方要求运动；如出现持续胸痛、明显气促、头晕或晕厥，立即停止并联系医护人员。"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={props.selectedStageSessions.length < 2}
                  onClick={() => {
                    props.setStageSent(true);
                    props.setStageDraftOpen(false);
                    localStorage.setItem(
                      `xinkang-stage-${props.patient.patient_demo_id}`,
                      JSON.stringify({
                        status: "sent",
                        scope: canGeneratePrescriptionCycle ? "prescription_cycle" : "manual_stage",
                        prescriptionTaskId: canGeneratePrescriptionCycle ? "RX-TASK-001" : undefined,
                        prescriptionVersion: canGeneratePrescriptionCycle ? "V2" : undefined,
                        version: Number(localStorage.getItem(`xinkang-stage-version-${props.patient.patient_demo_id}`) ?? "0") + 1,
                        selectedSessionIds: props.selectedStageSessions,
                        sentBy: props.currentAccount,
                        sentAt: new Date().toISOString(),
                      }),
                    );
                    localStorage.setItem(`xinkang-stage-version-${props.patient.patient_demo_id}`, String(Number(localStorage.getItem(`xinkang-stage-version-${props.patient.patient_demo_id}`) ?? "0") + 1));
                  }}
                  className="btn-primary disabled:bg-slate-300"
                >
                  <Send className="h-4 w-4" />
                  确认并发送患者端
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RehabReportWorkspace({
  patient,
  reports,
  initialReportId,
}: {
  patient: ManagedPatient;
  reports: RehabReport[];
  initialReportId?: string | null;
}) {
  const ordered = [...reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const [selectedReportId, setSelectedReportId] = useState(initialReportId ?? ordered[0]?.reportId ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedReport = ordered.find((item) => item.reportId === selectedReportId) ?? null;
  return (
    <div className="space-y-5" data-testid="patient-rehab-report-workspace">
      <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><SectionHeader title="康复报告版本" description="报告由责任医生在处方详情生成并确认；患者档案用于查看和追溯。" /><StatusBadge tone="blue">{ordered.length} 个版本</StatusBadge></div>{ordered.length ? <div className="flex flex-wrap gap-2 p-4">{ordered.map((report) => <button type="button" key={report.reportId} onClick={() => setSelectedReportId(report.reportId)} className={`rounded-xl border px-4 py-3 text-left text-xs transition ${selectedReportId === report.reportId ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}><b className="block">康复手册 V{report.version ?? report.episodeNo ?? 1}</b><span className="mt-1 block">{report.generatedAt.slice(0, 10)} · {report.status === "published" ? "已发送患者端" : report.status === "doctor_confirmed" ? "医生已确认" : "草稿"}</span></button>)}</div> : <div className="p-10 text-center"><FileHeart className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 text-base font-bold text-slate-700">暂无康复报告</h3><p className="mt-2 text-sm text-slate-500">请由责任医生进入“处方管理—患者处方详情—康复报告”生成。</p></div>}</section>
      {selectedReport && <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><SectionHeader title={`康复报告 V${selectedReport.version ?? selectedReport.episodeNo ?? 1}`} description="医护端按结构化文书查看；图文手册仅在患者端预览和打印时展示。" /><button type="button" className="btn-secondary" onClick={() => setPreviewOpen(true)}><FileHeart className="h-4 w-4" />患者端预览</button></div><div className="grid gap-4 p-5 lg:grid-cols-2"><HandbookBlock title="医疗与治疗摘要" text={selectedReport.medicalSection.treatmentCourse} /><HandbookBlock title="体能评估摘要" text={selectedReport.rehabSection.assessmentSummary} /><HandbookBlock title="实际训练摘要" text={selectedReport.rehabSection.trainingSummary} /><HandbookBlock title="阶段变化总结" text={selectedReport.rehabSection.improvementSummary} /><div className="lg:col-span-2"><HandbookBlock title="患者建议与安全提醒" text={selectedReport.recommendationDraft} /></div></div><footer className="flex flex-wrap justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500"><span>引用记录：{selectedReport.sourceRefs.length} 条 · 缺失字段：{selectedReport.missingFields?.length ? selectedReport.missingFields.join("、") : "无"}</span><span>确认人：{selectedReport.confirmedBy || "尚未确认"}</span></footer></section>}
      {previewOpen && selectedReport && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-6" onClick={() => setPreviewOpen(false)}><div className="mx-auto max-w-5xl" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex justify-end gap-2"><button type="button" className="btn-secondary bg-white" onClick={() => window.print()}><Printer className="h-4 w-4" />打印预览</button><button type="button" className="btn-secondary bg-white" onClick={() => setPreviewOpen(false)}><X className="h-4 w-4" />关闭</button></div><ArchiveHandbookPreview report={selectedReport} patientName={patient.name} /></div></div>}
    </div>
  );
}

function ArchiveHandbookPreview({ report, patientName }: { report: RehabReport; patientName: string }) {
  const narrative = report.patientNarrative;
  const status = report.status === "published" ? "已发送患者端" : report.status === "doctor_confirmed" ? "医生已确认" : "草稿";
  return <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"><header className="relative overflow-hidden bg-[#123b5d] px-8 py-8 text-white"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-teal-400/20" /><div className="absolute right-20 top-10 h-24 w-24 rounded-full bg-blue-300/10" /><div className="relative flex items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-teal-200"><FileHeart className="h-4 w-4" />心康伴侣 · 康复成果手册</div><h2 className="mt-5 text-3xl font-bold">{narrative?.greeting || `${patientName}，你好！`}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/90">{narrative?.celebrationMessage || "这份手册记录了本阶段已经确认的康复成果和下一阶段需要注意的事项。"}</p></div><div className="flex flex-col items-end gap-3"><span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">{status}</span><Award className="h-12 w-12 text-amber-300" /></div></div></header><div className="grid gap-px bg-slate-200 sm:grid-cols-3"><HandbookStat label="康复周期" value={`${narrative?.admissionDate || report.admissionDate || "未采集"} 至 ${narrative?.dischargeDate || report.dischargeDate || "未采集"}`} /><HandbookStat label="完成训练" value={`${narrative?.completedTrainingCount ?? 0} 次`} strong /><HandbookStat label="阶段结论" value={report.rehabSection.improvementSummary || "未采集"} /></div><div className="grid gap-6 p-7 lg:grid-cols-[1.05fr_0.95fr]"><section><p className="text-xs font-bold tracking-[0.15em] text-blue-600">01 · 康复成果</p><h3 className="mt-2 text-xl font-bold text-slate-900">本阶段留下了什么变化</h3><div className="mt-4 space-y-3"><HandbookBlock title="体能评估" text={report.rehabSection.assessmentSummary} /><HandbookBlock title="训练足迹" text={report.rehabSection.trainingSummary} /><HandbookBlock title="治疗记录" text={report.medicalSection.treatmentCourse} /></div></section><section><p className="text-xs font-bold tracking-[0.15em] text-emerald-600">02 · 下一阶段</p><h3 className="mt-2 text-xl font-bold text-slate-900">带回家的行动清单</h3><p className="mt-4 whitespace-pre-line rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">{report.recommendationDraft}</p><div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><b>安全提醒：</b>出现持续胸痛、明显气促、头晕或晕厥时，应停止运动并及时联系医疗人员。</div></section></div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4 text-xs text-slate-500"><span>报告编号：{report.reportId}</span><span>确认人：{report.confirmedBy || "尚未确认"} · 生成日期：{report.generatedAt.slice(0, 10)}</span></footer></article>;
}

function HandbookStat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className="bg-white p-5"><p className="text-xs font-bold text-slate-400">{label}</p><p className={`mt-2 leading-6 ${strong ? "text-2xl font-bold text-blue-700" : "text-sm font-bold text-slate-800"}`}>{value}</p></div>; }
function HandbookBlock({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{title}</p><p className="mt-2 text-sm leading-6 text-slate-700">{text || "未采集"}</p></div>; }

function SingleReportCard({ reportId }: { reportId: string }) {
  const report = singleTrainingReportDetails.find(
    (item) => item.id === reportId,
  );
  if (!report)
    return (
      <section className="card p-8 text-center text-xs text-slate-500">
        未找到该单次报告，可能尚未同步到当前页签。
      </section>
    );
  return (
    <section className="card p-5">
      <SectionHeader
        title={`${report.exercise} · 单次训练报告`}
        description={`${report.singleReportNo} · ${report.actualStartAt.replace("T", " ").slice(0, 16)}`}
        action={<StatusBadge tone="green">已生成</StatusBadge>}
      />
      <div className="grid grid-cols-5 gap-3">
        <Info label="实际总时长" value={`${report.totalMinutes}分钟`} />
        <Info label="实际运动时间" value={`${report.activeMinutes}分钟`} />
        <Info label="平均心率" value={`${report.hrStats.average} bpm`} />
        <Info label="峰值心率" value={`${report.hrStats.peak} bpm`} />
        <Info label="安全摘要" value={report.safetySummary} />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-[10px] font-bold text-slate-400">
          <span>指标</span>
          <span>热身</span>
          <span>训练</span>
          <span>放松</span>
        </div>
        {report.phaseVitals.map((item) => (
          <div
            key={item.metric}
            className="grid grid-cols-4 border-t border-slate-100 px-4 py-3 text-xs"
          >
            <b>{item.metric}</b>
            <span>{item.warmup}</span>
            <span>{item.training}</span>
            <span>{item.cooldown}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        血压仅展示带测量时间的间歇测量点；缺失指标不按0参与计算。
      </p>
    </section>
  );
}

function ActualTrainingCard({
  session,
}: {
  session?: (typeof trainingRecords)[number];
}) {
  if (!session)
    return (
      <section className="card p-8 text-center text-xs text-slate-500">
        未找到该训练记录。
      </section>
    );
  return (
    <section className="card p-5">
      <SectionHeader
        title={`${session.project} · 实际训练记录`}
        description={`${session.id} · ${session.date}`}
        action={<StatusBadge tone="green">已完成</StatusBadge>}
      />
      <div className="grid grid-cols-6 gap-3">
        <Info label="实际时长" value={`${session.duration}分钟`} />
        <Info label="平均心率" value={`${session.avgHr} bpm`} />
        <Info label="峰值心率" value={`${session.peakHr} bpm`} />
        <Info label="最低血氧" value={`${session.spo2}%`} />
        <Info label="RPE/Borg" value={String(session.rpe)} />
        <Info label="数据完整率" value={`${session.completeness}%`} />
      </div>
      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-900">
        <b>异常与现场处置</b>
        <p className="mt-2">{session.event}</p>
      </div>
    </section>
  );
}

export function TreatmentRecordPage({
  patient,
  record,
  role,
  onBack,
  onSave,
  onCorrect,
  embedded = false,
  readOnly = false,
}: {
  patient: ManagedPatient;
  record: CardiopulmonaryTreatmentRecord;
  role: StaffRole;
  onBack: () => void;
  onSave: (v: CardiopulmonaryTreatmentRecord) => void;
  onCorrect: (v: CardiopulmonaryTreatmentRecord) => void;
  embedded?: boolean;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState(record);
  const locked = readOnly || draft.status === "completed" || role !== "REHAB_EXECUTION";
  const configuredSignature = readStaffSignature(draft.therapist);
  const [printReady, setPrintReady] = useState(draft.status === "completed" || Boolean(draft.signature));
  const vital = (
    section: "preAssessment" | "postAssessment",
    key: string,
    value: string | number | null,
  ) => setDraft({ ...draft, [section]: { ...draft[section], [key]: value } });
  const updateIntervention = (
    index: number,
    patch: Partial<TreatmentIntervention>,
  ) =>
    setDraft({
      ...draft,
      interventions: draft.interventions.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  function saveAndGeneratePrint() {
    const next = {
      ...draft,
      status: "draft" as const,
      signature: configuredSignature ? {
        mode: "uploaded" as const,
        signerRole: "REHAB_EXECUTION" as const,
        signerName: draft.therapist,
        signatureImage: configuredSignature.imageData,
        treatmentAt: draft.treatmentAt,
        signedAt: new Date().toISOString(),
      } : draft.signature,
    };
    setDraft(next);
    onSave(next);
    setPrintReady(true);
  }
  function printTreatmentRecord() {
    const cleanup = () => document.body.classList.remove("printing-treatment");
    document.body.classList.add("printing-treatment");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => window.print(), 0);
  }
  return (
    <section>
      <div className="treatment-screen">
        {!embedded && <PageHeader
          eyebrow="患者档案 · 治疗记录"
          title={`${patient.name} · 心肺康复治疗记录`}
          description={`${draft.treatmentNo} · 治疗记录仅由康复师填写和签字，医生与管理员只读查看。`}
          action={
            <div className="flex gap-2">
              <button onClick={onBack} className="btn-secondary">
                <ArrowLeft className="h-4 w-4" />
                返回记录列表
              </button>
              <button disabled={!printReady} onClick={printTreatmentRecord} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
                <Printer className="h-4 w-4" />
                {printReady ? "一键打印预览" : "保存后可打印"}
              </button>
            </div>
          }
        />}
        {draft.actualMetrics && Object.keys(draft.actualMetrics).length > 0 && <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-blue-950">实际数据来源</b>{Object.entries(draft.actualMetrics).map(([key, metric]) => <span key={key} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-800">{metricLabel(key)}：{String(metric.value ?? "未采集")} · {sourceLabel(metric.source)}</span>)}</div><p className="mt-2 text-xs text-blue-700">设备采集和规则计算属于事实数据；AI建议不会写入本区域。</p></section>}
        <section className="card overflow-hidden print:shadow-none">
          {readOnly && <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800">上一次治疗记录仅供查看，不可编辑、重新签署或覆盖。</div>}
          <TreatmentPaperForm patient={patient} draft={draft} locked={locked} setDraft={setDraft} vital={vital} updateIntervention={updateIntervention} />
          <div className="flex items-center justify-between border-t border-slate-300 bg-slate-50 p-5">
            <div>
              <p className="text-xs font-bold">康复师签名与日期</p>
              {draft.signature?.signatureImage && (
                <img
                  src={draft.signature.signatureImage}
                  alt="康复师签名"
                  className="mt-2 h-12 max-w-40 object-contain"
                />
              )}
              <p className="mt-1 text-[10px] text-slate-500">
                治疗时间：{draft.treatmentAt.replace("T", " ")} · 签署时间：
                {draft.signature?.signedAt?.replace("T", " ").slice(0, 19) ??
                  "未签署"}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {configuredSignature ? "已读取后台本人电子签名；保存生成后可一键打印。" : "尚未在后台“签字管理”上传本人电子签名。"}
              </p>
            </div>
            {!locked ? (
              <div className="flex gap-2">
                <button onClick={saveAndGeneratePrint} className="btn-secondary"><Save className="h-4 w-4" />保存并生成打印版</button>
                <button
                  disabled={!draft.signature}
                  onClick={() => {
                    const next = { ...draft, status: "completed" as const };
                    setDraft(next);
                    onSave(next);
                  }}
                  className="btn-primary disabled:bg-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  完成并锁定
                </button>
                <button type="button" disabled={!printReady} onClick={printTreatmentRecord} className="btn-primary disabled:bg-slate-300"><Printer className="h-4 w-4" />一键打印</button>
              </div>
            ) : (
              !readOnly && role === "REHAB_EXECUTION" && (
                <button
                  onClick={() =>
                    onCorrect({
                      ...draft,
                      treatmentId: `${draft.treatmentId}-COR-${Date.now()}`,
                      treatmentNo: `${draft.treatmentNo}-更正`,
                      correctionOf: draft.treatmentId,
                      status: "draft",
                      signature: undefined,
                    })
                  }
                  className="btn-secondary"
                >
                  复制为更正记录
                </button>
              )
            )}
            {locked && <button type="button" onClick={printTreatmentRecord} className="btn-secondary"><Printer className="h-4 w-4" />一键打印</button>}
          </div>
        </section>
      </div>
      <TreatmentPrintSheet patient={patient} record={draft} />
    </section>
  );
}

function TreatmentPaperForm({ patient, draft, locked, setDraft, vital, updateIntervention }: {
  patient: ManagedPatient;
  draft: CardiopulmonaryTreatmentRecord;
  locked: boolean;
  setDraft: (value: CardiopulmonaryTreatmentRecord) => void;
  vital: (section: "preAssessment" | "postAssessment", key: string, value: string | number | null) => void;
  updateIntervention: (index: number, patch: Partial<TreatmentIntervention>) => void;
}) {
  const text = (value: string | number | null | undefined, onChange: (value: string) => void, options?: { type?: string; placeholder?: string; className?: string }) => <input type={options?.type ?? "text"} disabled={locked} value={value ?? ""} placeholder={options?.placeholder} onChange={(event) => onChange(event.target.value)} className={`treatment-paper-input ${options?.className ?? ""}`} />;
  const number = (value: number | null | undefined, onChange: (value: number | null) => void, placeholder?: string) => text(value, (next) => onChange(next === "" ? null : Number(next)), { type: "number", placeholder });
  const pre = draft.preAssessment;
  const post = draft.postAssessment;
  const surgeryOptions: NonNullable<CardiopulmonaryTreatmentRecord["surgeryMethod"]>[] = ["正中胸骨切开", "肋缘侧切", "微创", "其他"];
  return <div className="treatment-paper-form">
    <div className="treatment-paper-title"><h2>心肺康复治疗记录</h2><p>脱敏演示记录 · 网页填写与 A4 打印字段一致</p></div>
    <table className="treatment-paper-table treatment-paper-basic"><tbody>
      <tr><td>床号：<span className="treatment-paper-static">—</span></td><td>姓名：<span className="treatment-paper-static">{patient.name}</span></td><td>性别：<span className="treatment-paper-static">{patient.gender}</span></td><td>年龄：<span className="treatment-paper-static">{patient.age}</span></td><td>病案号：<span className="treatment-paper-static">{patient.patient_no}</span></td></tr>
      <tr><th>诊断：</th><td colSpan={4}>{text(draft.diagnosis, (value) => setDraft({ ...draft, diagnosis: value }))}</td></tr>
      <tr><th>手术方式：</th><td colSpan={4}><div className="flex flex-wrap gap-x-5 gap-y-2">{surgeryOptions.map((item) => <label key={item} className="inline-flex items-center gap-1.5"><input type="radio" disabled={locked} checked={(draft.surgeryMethod ?? "其他") === item} onChange={() => setDraft({ ...draft, surgeryMethod: item })} />{item}</label>)}</div></td></tr>
      <tr><th>特殊用药：</th><td colSpan={4}>{text(draft.specialMedications, (value) => setDraft({ ...draft, specialMedications: value }))}</td></tr>
      <tr><th>治疗时间：</th><td colSpan={2}>{text(draft.treatmentAt.slice(0, 16), (value) => setDraft({ ...draft, treatmentAt: value }), { type: "datetime-local" })}</td><th>治疗记录号：</th><td>{text(draft.treatmentNo, (value) => setDraft({ ...draft, treatmentNo: value }))}</td></tr>
    </tbody></table>
    <table className="treatment-paper-table treatment-paper-record"><thead><tr><th className="treatment-paper-count">次数</th><th colSpan={2}>治疗记录</th></tr></thead><tbody><tr>
      <td className="treatment-paper-count"><span>第</span><b>{draft.treatmentNo.split("-").at(-1) ?? "—"}</b><span>次</span></td>
      <td className="treatment-paper-left">
        <PaperSection title="训练前评估">
          <div className="treatment-paper-line">血压 {text(pre.bloodPressure.replace(/\s*mmHg/gi, ""), (value) => vital("preAssessment", "bloodPressure", value), { placeholder: "收缩压/舒张压" })} mmHg；心率 {number(pre.heartRate, (value) => vital("preAssessment", "heartRate", value))} 次/分</div>
          <div className="treatment-paper-line">SpO₂ {number(pre.spo2, (value) => vital("preAssessment", "spo2", value))} %；呼吸 {number(pre.respiratoryRate, (value) => vital("preAssessment", "respiratoryRate", value))} 次/分</div>
          <div className="treatment-paper-line">心律 {text(pre.rhythm, (value) => vital("preAssessment", "rhythm", value), { placeholder: "如：窦性心律" })}</div>
          <div className="treatment-paper-line">水肿 {text(pre.edema, (value) => vital("preAssessment", "edema", value))}</div>
          <div className="treatment-paper-line">疼痛 VAS：静态 {number(pre.chestPainRestVas, (value) => vital("preAssessment", "chestPainRestVas", value))}；体位变化 {text(pre.posturalPainChange, (value) => vital("preAssessment", "posturalPainChange", value))}；活动后 {number(pre.chestPainActivityVas, (value) => vital("preAssessment", "chestPainActivityVas", value))}</div>
          <div className="treatment-paper-line">胸部引流 {text(pre.chestDrainage, (value) => vital("preAssessment", "chestDrainage", value))}</div>
          <div className="treatment-paper-line">生命辅助装置 {text(pre.lifeSupportDevice, (value) => vital("preAssessment", "lifeSupportDevice", value))}</div>
        </PaperSection>
        <PaperSection title="训练后评估">
          <div className="treatment-paper-line">血压 {text(post.bloodPressure.replace(/\s*mmHg/gi, ""), (value) => vital("postAssessment", "bloodPressure", value), { placeholder: "收缩压/舒张压" })} mmHg；心率 {number(post.heartRate, (value) => vital("postAssessment", "heartRate", value))} 次/分</div>
          <div className="treatment-paper-line">SpO₂ {number(post.spo2, (value) => vital("postAssessment", "spo2", value))} %；呼吸 {number(post.respiratoryRate, (value) => vital("postAssessment", "respiratoryRate", value))} 次/分</div>
          <div className="treatment-paper-line">心律 {text(post.rhythm, (value) => vital("postAssessment", "rhythm", value))}；Borg评分 {number(post.borg, (value) => vital("postAssessment", "borg", value))}</div>
          <div className="treatment-paper-line">症状变化 {text(post.symptomChange, (value) => vital("postAssessment", "symptomChange", value))}</div>
        </PaperSection>
        <PaperSection title="治疗后评价"><textarea disabled={locked} value={draft.treatmentSummary} onChange={(event) => setDraft({ ...draft, treatmentSummary: event.target.value })} className="treatment-paper-textarea" placeholder="填写治疗完成情况及患者反应" /></PaperSection>
        <PaperSection title="备注"><textarea disabled={locked} value={[draft.adverseEvent, draft.fieldAction].filter(Boolean).join("\n")} onChange={(event) => { const [adverseEvent = "", ...rest] = event.target.value.split("\n"); setDraft({ ...draft, adverseEvent, fieldAction: rest.join("\n") }); }} className="treatment-paper-textarea" placeholder="第一行填写异常事件，后续填写现场处置" /></PaperSection>
      </td>
      <td className="treatment-paper-right"><h3>实施训练情况</h3><div className="treatment-paper-interventions">{draft.interventions.map((item, index) => <label key={item.code} className="treatment-paper-intervention"><input type="checkbox" disabled={locked} checked={item.selected} onChange={(event) => updateIntervention(index, { selected: event.target.checked })} /><span><b>{index + 1}、{treatmentInterventionTitle(item.code)}：</b>{defaultInterventionText(item.code)}</span></label>)}</div>
        <p className="treatment-paper-note">以上训练强度可根据个人情况进行调整。</p>
        <div className="treatment-paper-sign-grid"><div><b>康复治疗师：</b><span>{draft.signature?.signerName || "待签署"}</span></div><label className="inline-flex items-center gap-2"><input type="checkbox" disabled={locked} checked={draft.patientAcknowledged} onChange={(event) => setDraft({ ...draft, patientAcknowledged: event.target.checked })} /><b>患者参加确认</b></label></div>
        <p className="treatment-paper-date">治疗时间：{draft.treatmentAt.replace("T", " ").slice(0, 16)}</p>
      </td>
    </tr></tbody></table>
  </div>;
}

function PaperSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="treatment-paper-section"><h3>{title}</h3>{children}</section>;
}

function TreatmentPrintSheet({
  patient,
  record,
}: {
  patient: ManagedPatient;
  record: CardiopulmonaryTreatmentRecord;
}) {
  const pre = record.preAssessment;
  const post = record.postAssessment;
  const treatmentDate = record.treatmentAt.slice(0, 10);
  const treatmentTime = record.treatmentAt.includes("T")
    ? record.treatmentAt.slice(11, 16)
    : "";
  const surgeryOptions = ["正中胸骨切开", "肋缘侧切", "微创", "其他"];
  return (
    <article
      id="printable-treatment-record"
      className="treatment-print-sheet"
      aria-label="心肺康复治疗记录打印页"
    >
      <header className="treatment-print-header">
        <h1>心肺康复治疗记录</h1>
        <div className="treatment-print-rule" />
      </header>
      <table className="treatment-print-table treatment-print-demographics">
        <tbody>
          <tr>
            <td>
              床号：
              <PrintValue value="—" />
            </td>
            <td>
              姓名：
              <PrintValue value={patient.name} />
            </td>
            <td>
              男{patient.gender === "男" ? "（√）" : ""} / 女
              {patient.gender === "女" ? "（√）" : ""}
            </td>
            <td>
              年龄：
              <PrintValue value={`${patient.age}`} />
            </td>
            <td>
              病案号：
              <PrintValue value={patient.patient_no} />
            </td>
          </tr>
          <tr>
            <th>诊断：</th>
            <td colSpan={4}>
              <PrintValue value={record.diagnosis} wide />
            </td>
          </tr>
          <tr>
            <th>手术方式：</th>
            <td colSpan={4}>
              {surgeryOptions.map((item) => (
                <span key={item} className="mr-4">
                  <b className="treatment-print-checkbox">
                    {record.surgeryMethod === item ? "☑" : "□"}
                  </b>
                  {item}
                </span>
              ))}
              {record.surgeryHistory && (
                <span>　补充：{record.surgeryHistory}</span>
              )}
            </td>
          </tr>
          <tr>
            <th>特殊用药：</th>
            <td colSpan={4}>
              <PrintValue value={record.specialMedications} wide />
            </td>
          </tr>
        </tbody>
      </table>
      <table className="treatment-print-table treatment-print-record">
        <thead>
          <tr>
            <th className="treatment-print-count">次数</th>
            <th colSpan={2}>治疗记录</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="treatment-print-count treatment-print-vertical">
              第　　次
            </td>
            <td className="treatment-print-left">
              <PrintAssessmentBlock title="训练前评估">
                <p>
                  血压：{pv(pre.bloodPressure)} mmHg；心率：{pv(pre.heartRate)}{" "}
                  次/分
                </p>
                <p>
                  SpO₂：{pv(pre.spo2)}%；呼吸：{pv(pre.respiratoryRate)} 次/分
                </p>
                <p>
                  心律：
                  <span className="treatment-print-checkbox">
                    {pre.rhythm.includes("窦") ? "☑" : "□"}
                  </span>
                  窦性心律　{!pre.rhythm.includes("窦") && pv(pre.rhythm)}
                </p>
                <p>水肿：{pv(pre.edema)}</p>
                <p>
                  疼痛 VAS评分：静态 {pv(pre.chestPainRestVas)}　体位变化{" "}
                  {pv(pre.posturalPainChange)}　活动后{" "}
                  {pv(pre.chestPainActivityVas)}
                </p>
                <p>胸部引流：{pv(pre.chestDrainage)}</p>
                <p>
                  生命辅助装置：
                  {pv(pre.lifeSupportDevice || pre.assistiveDevice)}
                </p>
              </PrintAssessmentBlock>
              <PrintAssessmentBlock title="训练后评估">
                <p>
                  血压：{pv(post.bloodPressure)} mmHg；心率：
                  {pv(post.heartRate)} 次/分
                </p>
                <p>
                  SpO₂：{pv(post.spo2)}%；呼吸：{pv(post.respiratoryRate)} 次/分
                </p>
                <p>
                  心律：
                  <span className="treatment-print-checkbox">
                    {post.rhythm.includes("窦") ? "☑" : "□"}
                  </span>
                  窦性心律　Borg评分：{pv(post.borg)}
                </p>
                <p>症状变化：{pv(post.symptomChange)}</p>
              </PrintAssessmentBlock>
              <PrintAssessmentBlock title="治疗后评价">
                <p>{pv(record.treatmentSummary)}</p>
                {record.adverseEvent && <p>异常：{record.adverseEvent}</p>}
                {record.fieldAction && <p>现场处置：{record.fieldAction}</p>}
              </PrintAssessmentBlock>
              <PrintAssessmentBlock title="备注">
                <p>{pv(record.adverseEvent || record.fieldAction)}</p>
              </PrintAssessmentBlock>
            </td>
            <td className="treatment-print-right">
              <h2>实施训练情况</h2>
              <ol>
                {record.interventions.map((item, index) => (
                  <li key={item.code}>
                    <span className="treatment-print-checkbox">
                      {item.selected ? "☑" : "□"}
                    </span>
                    <b>
                      {index + 1}、{treatmentInterventionTitle(item.code)}：
                    </b>
                    <span>
                      {defaultInterventionText(item.code)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="treatment-print-adjustment">
                以上训练强度可根据个人情况进行调整。
              </p>
              <div className="treatment-print-signatures">
                <div>
                  康复治疗师：
                  {record.signature?.signatureImage ? (
                    <img
                      src={record.signature.signatureImage}
                      alt="康复治疗师签名"
                    />
                  ) : (
                    <span className="treatment-print-sign-line" />
                  )}
                </div>
                <div>
                  患者参加确认：
                  {record.patientAcknowledged ? "已确认" : <span className="treatment-print-sign-line" />}
                </div>
              </div>
              <p className="treatment-print-date">
                治疗时间：{treatmentDate}　{treatmentTime}
              </p>
              <p className="treatment-print-date">
                打印时间：
                {new Date().toLocaleString("zh-CN", { hour12: false })}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <footer className="treatment-print-footer">记录号：{record.treatmentNo}　·　演示数据</footer>
    </article>
  );
}

function PrintAssessmentBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="treatment-print-assessment">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function PrintValue({
  value,
  wide = false,
}: {
  value?: string;
  wide?: boolean;
}) {
  return (
    <span className={`treatment-print-value ${wide ? "is-wide" : ""}`}>
      {value || "　"}
    </span>
  );
}
function pv(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "　　　　"
    : String(value).replace(/\s*mmHg/gi, "");
}
function defaultInterventionText(code: string) {
  const descriptions: Record<string, string> = {
    pulmonary: "气道廓清技术；手法治疗；呼吸肌训练；呼吸控制。",
    strength: "手足环转10次/组×2；髋周肌力训练10次/组×2；踝泵10次/组×2；其他。",
    balance: "单足、双足立位下动静态平衡训练；功能性平衡训练。各10次/组×2；其他。",
    coordination: "提高肢体与躯干的运动协调性、四肢配合能力，制定个体化方案。各10次/组×2；其他。",
    transfer: "交叉抱胸翻身、起坐训练、功能性转移训练，提高安全转移能力。各10次/组×2；其他。",
    adl: "步行训练、日常生活动作应用等训练。各10次/组×2；其他。",
    resistance: "利用沙袋、哑铃、小弹力带等进行抗阻训练。各10次/组×2。",
    endurance: "结合心肺训练，进行全身大肌肉群耐力训练。各10次/组×2。",
    ecg: "对康复训练患者进行心电监测，保证患者训练安全。",
    bike: "在心电监护下，利用踏车设置功率，增强心肺功能及耐力。15min。",
    counterpulsation: "通过下肢气囊周期性加压，增强心脏供血并改善血管功能，增强心功能。20min。",
  };
  return descriptions[code] ?? "";
}

function treatmentInterventionTitle(code: string) {
  const titles: Record<string, string> = {
    pulmonary: "肺功能综合训练",
    strength: "身体功能障碍作业疗法训练",
    balance: "肢体平衡功能训练",
    coordination: "运动协调性训练",
    transfer: "转移动作训练",
    adl: "日常生活动作训练",
    resistance: "器械运动训练",
    endurance: "耐力训练",
    ecg: "遥测心电图康复训练监测",
    bike: "康复踏车训练",
    counterpulsation: "体外反搏治疗",
  };
  return titles[code] ?? code;
}

function TreatmentVitals({
  title,
  data,
  disabled,
  onChange,
  pre = false,
}: {
  title: string;
  data:
    | CardiopulmonaryTreatmentRecord["preAssessment"]
    | CardiopulmonaryTreatmentRecord["postAssessment"];
  disabled: boolean;
  onChange: (key: string, value: string | number | null) => void;
  pre?: boolean;
}) {
  const n = (key: string, label: string) => (
    <Field
      label={label}
      type="number"
      value={String((data as unknown as Record<string, unknown>)[key] ?? "")}
      disabled={disabled}
      onChange={(v) => onChange(key, v ? Number(v) : null)}
    />
  );
  return (
    <div className="border-t border-slate-200 p-5">
      <SectionHeader title={title} />
      <div className="grid grid-cols-5 gap-3">
        <Field
          label="血压 mmHg"
          value={data.bloodPressure}
          disabled={disabled}
          onChange={(v) => onChange("bloodPressure", v)}
        />
        {n("heartRate", "心率 bpm")}
        {n("spo2", "SpO₂ %")}
        {n("respiratoryRate", "呼吸率 次/分")}
        <Field
          label="心律"
          value={data.rhythm}
          disabled={disabled}
          onChange={(v) => onChange("rhythm", v)}
        />
        {pre && (
          <>
            <Field
              label="水肿"
              value={
                (data as CardiopulmonaryTreatmentRecord["preAssessment"]).edema
              }
              disabled={disabled}
              onChange={(v) => onChange("edema", v)}
            />
            {n("chestPainRestVas", "静态疼痛 VAS")}
            {n("chestPainActivityVas", "活动疼痛 VAS")}
            <Field
              label="体位变化"
              value={
                (data as CardiopulmonaryTreatmentRecord["preAssessment"])
                  .posturalPainChange
              }
              disabled={disabled}
              onChange={(v) => onChange("posturalPainChange", v)}
            />
            <Field
              label="胸部引流"
              value={
                (data as CardiopulmonaryTreatmentRecord["preAssessment"])
                  .chestDrainage
              }
              disabled={disabled}
              onChange={(v) => onChange("chestDrainage", v)}
            />
            <Field
              label="生命辅助装置"
              value={
                (data as CardiopulmonaryTreatmentRecord["preAssessment"])
                  .lifeSupportDevice
              }
              disabled={disabled}
              onChange={(v) => onChange("lifeSupportDevice", v)}
            />
          </>
        )}
        {!pre && (
          <>
            {n("borg", "Borg评分")}
            <Field
              label="症状变化"
              value={
                (data as CardiopulmonaryTreatmentRecord["postAssessment"])
                  .symptomChange
              }
              disabled={disabled}
              onChange={(v) => onChange("symptomChange", v)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PatientModal({
  patient,
  onChange,
  onClose,
  onSave,
}: {
  patient: ManagedPatient;
  onChange: (v: ManagedPatient) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6">
      <section className="w-full max-w-3xl rounded-2xl bg-white p-6">
        <div className="flex justify-between">
          <div>
            <p className="eyebrow">基础资料</p>
            <h2 className="mt-1 text-xl font-bold">精简患者档案</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <Field
            label="姓名"
            value={patient.name}
            disabled={false}
            onChange={(v) => onChange({ ...patient, name: v })}
          />
          <label>
            <span className="field-label">性别</span>
            <select
              value={patient.gender}
              onChange={(e) => onChange({ ...patient, gender: e.target.value })}
              className="text-field"
            >
              <option>男</option>
              <option>女</option>
            </select>
          </label>
          <Field
            label="出生日期"
            type="date"
            value={patient.birth_date}
            disabled={false}
            onChange={(v) => onChange({ ...patient, birth_date: v })}
          />
          <Field
            label="患者编号"
            value={patient.patient_no}
            disabled={false}
            onChange={(v) =>
              onChange({ ...patient, patient_no: v, hospital_patient_no: v })
            }
          />
          <Field
            label="联系方式"
            value={patient.phone}
            disabled={false}
            onChange={(v) => onChange({ ...patient, phone: v })}
          />
          <label>
            <span className="field-label">患者状态</span>
            <select
              value={patient.patient_status ?? "rehabilitation"}
              onChange={(e) =>
                onChange({
                  ...patient,
                  patient_status: e.target.value as PatientStatus,
                })
              }
              className="text-field"
            >
              <option value="prescription_opened">开具处方</option>
              <option value="rehabilitation">康复治疗</option>
              <option value="recovered">已康复</option>
            </select>
          </label>
          <Field
            label="康复阶段"
            value={patient.rehab_stage}
            disabled={false}
            onChange={(v) => onChange({ ...patient, rehab_stage: v })}
          />
          <Field
            label="出院日期"
            type="date"
            value={patient.discharge_date}
            disabled={false}
            onChange={(v) => onChange({ ...patient, discharge_date: v })}
          />
          <Field
            label="诊断（外部资料）"
            value={patient.diagnosis_summary}
            disabled={false}
            onChange={(v) => onChange({ ...patient, diagnosis_summary: v })}
          />
          <Field
            label="手术方式/记录"
            value={patient.procedure_history}
            disabled={false}
            onChange={(v) => onChange({ ...patient, procedure_history: v })}
          />
          <Field
            label="特殊用药"
            value={patient.current_medications}
            disabled={false}
            onChange={(v) => onChange({ ...patient, current_medications: v })}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={onSave} className="btn-primary">
            保存
          </button>
        </div>
      </section>
    </div>
  );
}

export function createBlankTreatment(
  patient: ManagedPatient,
  actor: string,
): CardiopulmonaryTreatmentRecord {
  const now = new Date().toISOString();
  return {
    treatmentId: `TREAT-${Date.now()}`,
    patientId: patient.patient_demo_id,
    patientNo: patient.patient_no,
    treatmentNo: `TX-${Date.now()}`,
    treatmentAt: now,
    diagnosis: patient.diagnosis_summary,
    surgeryHistory: patient.procedure_history,
    surgeryMethod: "其他",
    specialMedications: patient.current_medications,
    source: "人工录入",
    preAssessment: {
      bloodPressure: "",
      heartRate: null,
      spo2: null,
      respiratoryRate: null,
      rhythm: "窦性心律",
      measuredAt: "",
      chestPainRestVas: null,
      chestPainActivityVas: null,
      respiratorySymptoms: "",
      assistiveDevice: "",
      edema: "",
      posturalPainChange: "",
      chestDrainage: "",
      lifeSupportDevice: "",
    },
    interventions: treatmentInterventionOptions.map((item) => ({
      ...item,
      selected: false,
    })),
    postAssessment: {
      bloodPressure: "",
      heartRate: null,
      spo2: null,
      respiratoryRate: null,
      rhythm: "窦性心律",
      measuredAt: "",
      borg: null,
      symptomChange: "",
    },
    treatmentSummary: "",
    actualMetrics: {},
    adverseEvent: "",
    fieldAction: "",
    therapist: actor,
    patientAcknowledged: false,
    status: "draft",
  };
}
function OcrImportDialog({ patients, currentAccount, onClose, onConfirm }: { patients: ManagedPatient[]; currentAccount: string; onClose: () => void; onConfirm: (patient: ManagedPatient, record: AssessmentRecord) => void }) {
  const seed = patients[0];
  const [phase, setPhase] = useState<"upload" | "review">("upload");
  const [error, setError] = useState("");
  const [archiveMode, setArchiveMode] = useState<"update" | "new">("update");
  const [draft, setDraft] = useState<OcrAssessmentImportDraft>({
    sourceFileName: "",
    patientFields: { name: seed?.name ?? "", gender: seed?.gender ?? "", birthDate: seed?.birth_date ?? "", patientNo: seed?.patient_no ?? "", phone: seed?.phone ?? "", diagnosis: seed?.diagnosis_summary ?? "", weightKg: 62.4 },
    assessmentFields: { assessedAt: new Date().toISOString().slice(0, 10), preBloodPressure: "128/78", prePulse: 72, postBloodPressure: "136/82", postPulse: 88, sideBySideSec: 10, semiTandemSec: 10, tandemSec: 8.2, walkTrial1Sec: 6.4, walkTrial2Sec: 6.1, chairTrial1Sec: 14.2, chairTrial2Sec: 13.8, maxSpeed1: 0.62, maxSpeed2: 0.66, leftGrip1: 18.2, leftGrip2: 18.6, rightGrip1: 19.1, rightGrip2: 19.4, upperStrength: "4级", lowerStrength: "4级", notes: "" },
    confidence: 86,
    fieldConfidence: { patientNo: 98, name: 97, diagnosis: 78, tandemSec: 74, leftGrip2: 76 }
  });
  const patientNo = String(draft.patientFields.patientNo ?? "").trim();
  const exactMatch = patients.find((item) => item.patient_no === patientNo);
  const demographicMatch = patients.find((item) => item.name === draft.patientFields.name && item.gender === draft.patientFields.gender && item.birth_date === draft.patientFields.birthDate);
  const match = exactMatch ?? demographicMatch;
  const setPatientField = (key: string, value: string) => setDraft((current) => ({ ...current, patientFields: { ...current.patientFields, [key]: value } }));
  const setAssessmentField = (key: string, value: string) => setDraft((current) => ({ ...current, assessmentFields: { ...current.assessmentFields, [key]: value } }));

  function confirm() {
    if (!patientNo) return setError("患者编号未识别，请人工补充后再归档。");
    if (!String(draft.patientFields.name ?? "").trim()) return setError("请核对患者姓名。");
    if (archiveMode === "update" && !match) return setError("未匹配到现有患者，请选择新建基础患者或修正患者编号。");
    const now = new Date().toISOString();
    const base = archiveMode === "update" && match ? match : seed;
    if (!base) return setError("缺少患者基础模板，无法归档。");
    const patientId = archiveMode === "update" && match ? match.patient_demo_id : `P-OCR-${Date.now()}`;
    const birthDate = String(draft.patientFields.birthDate ?? "");
    const patient: ManagedPatient = {
      ...base, patient_demo_id: patientId, patient_code: archiveMode === "update" && match ? match.patient_code : `CRH-P-OCR-${patientNo}`, patient_no: patientNo, hospital_patient_no: patientNo,
      name: String(draft.patientFields.name ?? ""), gender: String(draft.patientFields.gender ?? ""), birth_date: birthDate, age: calculateAge(birthDate), phone: String(draft.patientFields.phone ?? ""), diagnosis_summary: String(draft.patientFields.diagnosis ?? "未提供"), weight_kg: draft.patientFields.weightKg == null ? "" : String(draft.patientFields.weightKg),
      record_source: "OCR单张导入", source_file_name: draft.sourceFileName, ocr_confidence: draft.confidence, review_status: "已确认", reviewed_by: currentAccount, reviewed_at: now, updated_by: currentAccount, updated_at: now,
      created_by: archiveMode === "update" && match ? match.created_by : currentAccount, created_at: archiveMode === "update" && match ? match.created_at : now,
      audit_log: [...(archiveMode === "update" && match ? match.audit_log : []), `${now.slice(0, 10)} ${currentAccount}核对并归档体能评估OCR资料`]
    };
    const a = draft.assessmentFields;
    const scored = calculateSppb({ balance: { sideBySideSec: numberOrNull(a.sideBySideSec), semiTandemSec: numberOrNull(a.semiTandemSec), tandemSec: numberOrNull(a.tandemSec), score: 0 }, walk4m: { trial1Sec: numberOrNull(a.walkTrial1Sec), trial2Sec: numberOrNull(a.walkTrial2Sec), fastestSec: null, score: 0 }, chairStand: { trial1Sec: numberOrNull(a.chairTrial1Sec), trial2Sec: numberOrNull(a.chairTrial2Sec), fastestSec: null, score: 0 }, maxWalkingSpeedMs: { trial1: numberOrNull(a.maxSpeed1), trial2: numberOrNull(a.maxSpeed2), fastest: null } });
    const blank = createBlankSppb(patient, 1, currentAccount);
    const record: AssessmentRecord = {
      ...blank, assessmentId: `ASMT-${patientId}-${Date.now()}`, assessedAt: `${String(a.assessedAt || now.slice(0, 10))}T09:00:00+08:00`, source: "ocr_single", status: "completed", sourceNote: `OCR单张导入：${draft.sourceFileName}`, ocrConfidence: draft.confidence, ocrFieldConfidence: draft.fieldConfidence, reviewedBy: currentAccount, reviewedAt: now,
      patientSnapshot: { name: patient.name, gender: patient.gender, age: patient.age, hospitalPatientNo: patientNo, diagnosis: patient.diagnosis_summary }, weightKg: numberOrNull(draft.patientFields.weightKg), preVitals: { bloodPressure: String(a.preBloodPressure ?? ""), pulse: numberOrNull(a.prePulse) }, postVitals: { bloodPressure: String(a.postBloodPressure ?? ""), pulse: numberOrNull(a.postPulse) },
      sppb: { ...scored, grip: { leftTrial1Kg: numberOrNull(a.leftGrip1), leftTrial2Kg: numberOrNull(a.leftGrip2), rightTrial1Kg: numberOrNull(a.rightGrip1), rightTrial2Kg: numberOrNull(a.rightGrip2) }, canWalk100m: "unknown", unableWalkReason: "", muscleStrength: { upper: String(a.upperStrength ?? ""), lower: String(a.lowerStrength ?? "") } }, notes: String(a.notes ?? ""), therapist: currentAccount, enteredBy: currentAccount, completedAt: now
    };
    onConfirm(patient, record);
  }

  const fields: [string, string, "patient" | "assessment"][] = [["name", "姓名", "patient"], ["gender", "性别", "patient"], ["birthDate", "出生日期", "patient"], ["patientNo", "患者编号", "patient"], ["phone", "联系电话", "patient"], ["diagnosis", "诊断", "patient"], ["weightKg", "体重(kg)", "patient"], ["assessedAt", "评估日期", "assessment"], ["preBloodPressure", "评估前血压", "assessment"], ["prePulse", "评估前脉搏", "assessment"], ["postBloodPressure", "评估后血压", "assessment"], ["postPulse", "评估后脉搏", "assessment"], ["sideBySideSec", "双脚并立(s)", "assessment"], ["semiTandemSec", "半前后站立(s)", "assessment"], ["tandemSec", "前后站立(s)", "assessment"], ["walkTrial1Sec", "4米步行1(s)", "assessment"], ["walkTrial2Sec", "4米步行2(s)", "assessment"], ["chairTrial1Sec", "椅子坐立1(s)", "assessment"], ["chairTrial2Sec", "椅子坐立2(s)", "assessment"], ["leftGrip1", "左手握力1(kg)", "assessment"], ["rightGrip1", "右手握力1(kg)", "assessment"]];

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4"><section className="mx-auto my-6 w-full max-w-5xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="eyebrow">体能评估OCR识别</p><h2 className="mt-1 text-xl font-bold">{phase === "upload" ? "上传一份体能评估报告" : "核对识别结果后归档"}</h2><p className="mt-1 text-sm text-slate-500">OCR仅辅助填写，未经人工确认不会写入患者档案。</p></div><button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
    {phase === "upload" ? <div className="p-8"><label className="flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-center"><Upload className="h-10 w-10 text-blue-500" /><b className="mt-4 text-base">选择 JPG、PNG 或 PDF</b><span className="mt-2 text-sm text-slate-500">选择后模拟OCR识别并进入人工核对</span><input className="sr-only" type="file" accept="image/*,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setDraft((current) => ({ ...current, sourceFileName: file.name })); window.setTimeout(() => setPhase("review"), 300); }} /></label></div> : <><div className="grid gap-4 p-5 lg:grid-cols-[1fr_280px]"><div><div className="mb-3 flex items-center justify-between"><h3 className="text-base font-bold">患者信息与体能测试结果</h3><StatusBadge tone="orange">OCR {draft.confidence}% · 待核对</StatusBadge></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key, label, group]) => { const confidence = draft.fieldConfidence[key] ?? 90; const value = group === "patient" ? draft.patientFields[key] : draft.assessmentFields[key]; return <label key={key} className={`rounded-xl border p-3 ${confidence < 80 ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}><span className="flex justify-between text-xs font-bold text-slate-600"><span>{label}</span><span className={confidence < 80 ? "text-amber-700" : "text-slate-400"}>{confidence}%</span></span><input className="text-field mt-2" value={value ?? ""} placeholder="未识别" onChange={(event) => group === "patient" ? setPatientField(key, event.target.value) : setAssessmentField(key, event.target.value)} /></label>; })}</div></div><aside className="space-y-3"><section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><b className="text-sm text-blue-950">患者匹配</b><p className="mt-2 text-sm text-blue-800">{match ? `已匹配：${match.name} · ${match.patient_no}` : "未匹配现有患者"}</p><p className="mt-1 text-xs text-blue-600">{exactMatch ? "患者编号精确匹配" : demographicMatch ? "人口学信息辅助匹配" : "请修正编号或选择新建"}</p></section><label className="flex gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="radio" checked={archiveMode === "update"} onChange={() => setArchiveMode("update")} />更新匹配患者</label><label className="flex gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="radio" checked={archiveMode === "new"} onChange={() => setArchiveMode("new")} />新建基础患者</label><section className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">黄色字段置信度低于80%，缺失值保持空白，不按0归档。</section></aside></div>{error && <p className="mx-5 mb-3 text-sm font-semibold text-red-600">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 p-4"><button type="button" className="btn-secondary" onClick={() => setPhase("upload")}>重新上传</button><button type="button" className="btn-primary" onClick={confirm}><Save className="h-4 w-4" />确认并归档</button></div></>}
  </section></div>;
}

function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function openPatientRecord(
  patientId: string,
  tab: PatientWorkspaceTab,
  recordId: string,
  recordKind?: string,
) {
  const url = new URL(window.location.href);
  url.searchParams.set("system", "staff");
  url.searchParams.set("page", "patients");
  url.searchParams.set("patientId", patientId);
  url.searchParams.set("tab", tab);
  url.searchParams.set("recordId", recordId);
  if (recordKind) url.searchParams.set("recordKind", recordKind);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
function openFollowUpTab(patientId: string, taskId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("system", "staff");
  url.searchParams.set("page", "followups");
  url.searchParams.set("patientId", patientId);
  url.searchParams.set("taskId", taskId);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-field"
      />
    </label>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-1.5 text-xs font-bold leading-5 text-slate-800">
        {value || "未提供"}
      </p>
    </div>
  );
}
function SmallNum({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value?: number;
  disabled: boolean;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label>
      <span className="text-[9px] text-slate-400">{label}</span>
      <input
        type="number"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className="text-field"
      />
    </label>
  );
}
function cleanMissing(value: string) {
  return !value || value === "待补充" || value === "未录入" ? "未提供" : value;
}

function sourceLabel(source: ClinicalDataSource) {
  if (source === "DEVICE_CAPTURED") return "设备采集";
  if (source === "RULE_DERIVED") return "规则计算";
  if (source === "AI_SUGGESTED") return "AI建议";
  return "人工录入";
}

function metricLabel(metric: string) {
  if (metric === "averageHeartRate") return "平均心率";
  if (metric === "peakHeartRate") return "峰值心率";
  if (metric === "activeMinutes") return "实际运动时间";
  return metric;
}
