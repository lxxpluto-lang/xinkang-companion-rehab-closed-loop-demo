import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Copy,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  MessageSquareText,
  LockKeyhole,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Upload,
  X
} from "lucide-react";
import { demoPatients } from "../mockData";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { FieldCollectionStatus, PatientRecordStatus, Role } from "../types";
import {
  clinicalSnapshotChen,
  patientMasterChen,
  prescriptionVersionDetails,
  singleTrainingReportDetails
} from "../clinicalSharedData";
import type { PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels } from "../prescriptionData";
import type { PatientClinicalProfile } from "../prescriptionWorkspaceData";
import type { ClinicalNarrativeRecord } from "../prescriptionWorkspaceData";
import { hasSppbInput, type AssessmentRecord } from "../assessmentData";
import { contactResultLabels, dispositionLabels, effectiveFollowUpStatus, followUpStatusLabels, type FollowUpRecord, type FollowUpTask } from "../followUpData";
import { stageReportData } from "../patient/stageReportData";
import { treatmentInterventionOptions, treatmentStatusLabel, type CardiopulmonaryTreatmentRecord } from "../treatmentData";
import { formatDate, formatDateTime, formatTime } from "../utils/dateTime";

export type PatientWorkspaceTab = "profile" | "assessments" | "treatments" | "narratives" | "followups" | "prescriptions" | "sessions" | "reports";

export type ManagedPatient = {
  patient_demo_id: string;
  patient_code: string;
  patient_no: string;
  hospital_patient_no: string;
  institution_id: string;
  institution_name: string;
  environment: "测试环境" | "生产环境";
  record_source: "本地录入" | "OCR批量导入";
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
};

const patientProfiles = [
  { name: patientMasterChen.name, patient_no: patientMasterChen.patientNo, birth_date: "1967-04-18", id_number: patientMasterChen.idNumber, phone: patientMasterChen.phone, assigned_doctor: "王医生", discharge_date: "2026-07-02", rehab_group: patientMasterChen.rehabGroup, rehab_stage: "Ⅱ期 · 第4周", last_followup: patientMasterChen.latestFollowUp },
  { name: "李秀兰", patient_no: "000002", birth_date: "1968-09-12", id_number: "3702********4826", phone: "136****1938", assigned_doctor: "王医生", discharge_date: "2026-06-20", rehab_group: "运动康复 A 组", rehab_stage: "Ⅱ期 · 第2周", last_followup: "2026-07-26" },
  { name: "王先生", patient_no: "000003", birth_date: "1960-02-26", id_number: "3702********7714", phone: "159****2850", assigned_doctor: "赵医生", discharge_date: "2026-05-02", rehab_group: "运动康复 B 组", rehab_stage: "Ⅱ期 · 第3周", last_followup: "2026-06-02" },
  { name: "赵女士", patient_no: "000004", birth_date: "1966-11-03", id_number: "3702********3409", phone: "137****8246", assigned_doctor: "王医生", discharge_date: "2026-07-08", rehab_group: "重点监护组", rehab_stage: "首次评估", last_followup: "2026-07-24" }
];

export const initialPatients: ManagedPatient[] = demoPatients.map((patient, index) => {
  const profile = patientProfiles[index];
  return {
    ...patient,
    ...profile,
    patient_code: `CRH-P-2026-${profile.patient_no}`,
    hospital_patient_no: profile.patient_no,
    institution_id: "ORG-CRH-001",
    institution_name: "心脏康复中心",
    environment: "测试环境",
    record_source: "本地录入",
    record_status: "有效",
    workflow_status: "confirmed",
    field_status: {
      name: "confirmed",
      gender: "confirmed",
      birth_date: "confirmed",
      patient_no: "confirmed",
      phone: "confirmed",
      diagnosis_summary: "confirmed",
      medical_history: "pending_review",
      current_medications: "pending_review",
      assessment: "confirmed"
    },
    id_type: "身份证",
    emergency_contact: "未录入",
    emergency_relation: "",
    emergency_phone: "",
    medical_history: "待补充",
    procedure_history: "待补充",
    current_medications: "待补充",
    drug_allergies: "未发现",
    exercise_precautions: "以医生评估与处方为准",
    referral_source: "心内科门诊",
    discharge_date: profile.discharge_date,
    planned_rehab_date: "",
    consent_status: "已记录",
    consent_time: "2026-07-20 09:30",
    consent_method: "书面知情同意",
    height_cm: "",
    weight_kg: "",
    record_note: "",
    clinical_confirmed: true,
    clinical_confirmed_by: profile.assigned_doctor,
    clinical_confirmed_role: "康复医生",
    clinical_confirmed_at: "2026-07-20 09:35",
    created_by: profile.assigned_doctor,
    created_at: "2026-07-20 09:20",
    updated_by: profile.assigned_doctor,
    updated_at: "2026-07-28 10:10",
    audit_log: ["2026-07-20 09:20 创建患者档案"]
  };
});

export function calculateAge(birthDate: string) {
  if (!birthDate) return 0;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return Math.max(age, 0);
}

const trainingRecords = [
  { id: "TR-20260725-012", trainingRecordNo: "CRH-TR-20260725-0012", patientId: "P-DEMO-001", date: "2026-07-25T09:30:00+08:00", project: "功率车", version: "V4.0", duration: "30分钟", target: "84%", status: "已完成", event: "胸闷1次 · 已复核" },
  { id: "TR-20260723-011", trainingRecordNo: "CRH-TR-20260723-0011", patientId: "P-DEMO-001", date: "2026-07-23T09:20:00+08:00", project: "功率车", version: "V4.0", duration: "30分钟", target: "79%", status: "已完成", event: "无异常" },
  { id: "TR-20260716-009", trainingRecordNo: "CRH-TR-20260716-0009", patientId: "P-DEMO-001", date: "2026-07-16T09:10:00+08:00", project: "功率车", version: "V3.0", duration: "30分钟", target: "80%", status: "已完成", event: "无异常" }
];

const stageReports = [
  { id: "STAGE-202607", patientId: "P-DEMO-001", period: "2026-06-16 至 2026-07-25", versions: "V1–V4", completion: "11/12次", target: "84%", status: "已审核" },
  { id: "STAGE-202607-003", patientId: "P-DEMO-003", period: "2026-07-05 至 2026-07-28", versions: "V1–V3", completion: "9/10次", target: "78%", status: "待复核" }
];

function riskTone(risk: string): "red" | "orange" | "green" {
  return risk === "高危" ? "red" : risk === "中危" ? "orange" : "green";
}

function cpetStatusLabel(status: PatientClinicalProfile["cpetStatus"] | undefined) {
  return status === "completed" ? "已完成" : status === "not_completed" ? "未完成" : status === "pending_review" ? "待核对" : status === "not_applicable" ? "不适用" : "未采集";
}

function clinicalMetricLabel(metric: { value: number | null; unit: string; measuredAt: string; source: string; status: string } | undefined) {
  if (!metric || metric.value === null || metric.value === undefined) return "未采集";
  return `${metric.value} ${metric.unit}`;
}

export function PatientArchivePage({
  role,
  currentAccount,
  patients,
  tasks,
  followUpTasks = [],
  followUpRecords = [],
  clinicalNarratives = [],
  assessmentRecords = [],
  treatmentRecords = [],
  initialPatientId,
  initialTab = "profile",
  clinicalProfiles = [],
  onSavePatient,
  onUpdatePatient,
  onOpenPrescription,
  onOpenFollowUp,
  onOpenAssessment,
  onOpenDischargeReport,
  onSaveTreatmentRecord,
  onBackToPrescription
}: {
  role: Exclude<Role, "PATIENT">;
  currentAccount?: string;
  patients: ManagedPatient[];
  tasks: PrescriptionTask[];
  followUpTasks?: FollowUpTask[];
  followUpRecords?: FollowUpRecord[];
  clinicalNarratives?: ClinicalNarrativeRecord[];
  assessmentRecords?: AssessmentRecord[];
  treatmentRecords?: CardiopulmonaryTreatmentRecord[];
  initialPatientId?: string | null;
  initialTab?: PatientWorkspaceTab;
  clinicalProfiles?: PatientClinicalProfile[];
  onSavePatient: (patient: ManagedPatient, previousDischargeDate: string, dischargeChangeReason: string) => void;
  onUpdatePatient: (patient: ManagedPatient) => void;
  onOpenPrescription: (taskId: string) => void;
  onOpenFollowUp: (taskId: string) => void;
  onOpenAssessment: (patientId?: string) => void;
  onOpenDischargeReport?: (patientId: string) => void;
  onSaveTreatmentRecord?: (record: CardiopulmonaryTreatmentRecord) => void;
  onBackToPrescription?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialPatientId ?? null);
  const [activeTab, setActiveTab] = useState<PatientWorkspaceTab>(initialTab);
  const [keyword, setKeyword] = useState("");
  const [riskFilter, setRiskFilter] = useState("全部风险");
  const [stageFilter, setStageFilter] = useState("全部阶段");
  const [editDraft, setEditDraft] = useState<ManagedPatient | null>(null);
  const [editingMode, setEditingMode] = useState<"create" | "edit">("edit");
  const [formError, setFormError] = useState("");
  const [similarPatientWarning, setSimilarPatientWarning] = useState("");
  const [similarWarningAccepted, setSimilarWarningAccepted] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchText, setBatchText] = useState("姓名\t性别\t出生日期\t患者号\t联系电话\n示例患者\t女\t1968-01-01\t000999\t");
  const doctorName = currentAccount ?? "王医生";
  const canImport = role === "DOCTOR" || role === "REHAB_EXECUTION";
  const canEditClinical = false;
  const canCollectAssessment = role !== "ADMIN";
  const scopedPatients = useMemo(() => patients, [patients]);
  const selected = selectedId ? scopedPatients.find((patient) => patient.patient_demo_id === selectedId) ?? null : null;
  const selectedClinicalProfile = selected ? clinicalProfiles.find((profile) => profile.patientId === selected.patient_demo_id) : undefined;
  const clinicalProfileMap = useMemo(() => new Map(clinicalProfiles.map((profile) => [profile.patientId, profile])), [clinicalProfiles]);
  const [cpetFilter, setCpetFilter] = useState("全部 CPET");
  const [dataStatusFilter, setDataStatusFilter] = useState("全部状态");

  const filteredPatients = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    return scopedPatients.filter((patient) => {
      const matchesKeyword = !value || [patient.name, patient.patient_code, patient.hospital_patient_no, patient.id_number, patient.phone, patient.diagnosis_summary].some((field) => field.toLowerCase().includes(value));
      const matchesRisk = riskFilter === "全部风险" || patient.risk_level === riskFilter;
      const matchesStage = stageFilter === "全部阶段" || patient.rehab_stage.startsWith(stageFilter);
      const cpetStatus = clinicalProfileMap.get(patient.patient_demo_id)?.cpetStatus ?? "not_collected";
      const matchesCpet = cpetFilter === "全部 CPET" || (cpetFilter === "已完成" && cpetStatus === "completed") || (cpetFilter === "未完成" && cpetStatus === "not_completed") || (cpetFilter === "未采集" && cpetStatus === "not_collected") || (cpetFilter === "待核对" && cpetStatus === "pending_review");
      const matchesDataStatus = dataStatusFilter === "全部状态" || patient.training_status === dataStatusFilter || patient.prescription_version === dataStatusFilter;
      return matchesKeyword && matchesRisk && matchesStage && matchesCpet && matchesDataStatus;
    });
  }, [cpetFilter, clinicalProfileMap, dataStatusFilter, keyword, riskFilter, scopedPatients, stageFilter]);

  function savePatient() {
    if (!editDraft) return;
    const normalized = {
      ...editDraft,
      name: editDraft.name.trim(),
      hospital_patient_no: editDraft.hospital_patient_no.trim().toUpperCase(),
      id_number: editDraft.id_number.trim().toUpperCase(),
      phone: editDraft.phone.trim(),
      emergency_phone: editDraft.emergency_phone.trim(),
      age: calculateAge(editDraft.birth_date)
    };
    setFormError("");
    setSimilarPatientWarning("");
    if ((editingMode !== "create" && !normalized.hospital_patient_no) || !normalized.name || !normalized.gender || !normalized.birth_date || !normalized.assigned_doctor) {
      setFormError(editingMode === "create" ? "请完整填写患者姓名、性别、出生日期和主管医生。患者号将在保存时自动生成。" : "请完整填写患者号、患者姓名、性别、出生日期和主管医生。");
      return;
    }
    if (!normalized.phone && !normalized.emergency_phone) {
      setFormError("患者联系电话与紧急联系人电话至少填写一项。");
      return;
    }
    if (normalized.phone && !/^1\d{10}$/.test(normalized.phone)) {
      setFormError("患者联系电话应为 11 位手机号码。");
      return;
    }
    if (normalized.emergency_phone && !/^1\d{10}$/.test(normalized.emergency_phone)) {
      setFormError("紧急联系人电话应为 11 位手机号码。");
      return;
    }
    const comparablePatients = patients.filter((patient) => patient.patient_demo_id !== normalized.patient_demo_id);
    if (comparablePatients.some((patient) => patient.environment === normalized.environment && patient.institution_id === normalized.institution_id && patient.hospital_patient_no.toLowerCase() === normalized.hospital_patient_no.toLowerCase())) {
      setFormError("该患者号已存在，请核对后打开已有患者档案。");
      return;
    }
    if (normalized.id_number && comparablePatients.some((patient) => patient.environment === normalized.environment && patient.id_number.replace(/\*/g, "").toLowerCase() === normalized.id_number.replace(/\*/g, "").toLowerCase())) {
      setFormError("该证件号码已关联患者档案，不能重复建档。");
      return;
    }
    const similar = comparablePatients.find((patient) => patient.environment === normalized.environment && patient.name === normalized.name && patient.birth_date === normalized.birth_date && (!normalized.phone || patient.phone === normalized.phone));
    if (editingMode === "create" && similar && !similarWarningAccepted) {
      setSimilarPatientWarning(`发现相似患者：${similar.name}（${similar.patient_code}），请确认是否为同一人。`);
      return;
    }
    const now = new Date();
    const auditTime = formatDateTime(now.toISOString());
    let savedPatient: ManagedPatient = {
      ...normalized,
      workflow_status: normalized.clinical_confirmed ? "confirmed" : "saved",
      field_status: {
        ...normalized.field_status,
        name: normalized.name ? "saved" : "not_collected",
        gender: normalized.gender ? "saved" : "not_collected",
        birth_date: normalized.birth_date ? "saved" : "not_collected",
        patient_no: normalized.hospital_patient_no ? "saved" : "not_collected",
        phone: normalized.phone || normalized.emergency_phone ? "saved" : "not_collected",
        diagnosis_summary: normalized.diagnosis_summary ? "saved" : "not_collected",
        medical_history: normalized.medical_history ? "saved" : "not_collected",
        current_medications: normalized.current_medications ? "saved" : "not_collected",
        assessment: normalized.rehab_stage === "首次评估" ? "pending_review" : "not_collected"
      },
      clinical_confirmed_by: normalized.clinical_confirmed ? doctorName : "",
      clinical_confirmed_role: normalized.clinical_confirmed ? "康复医生" : "",
      clinical_confirmed_at: normalized.clinical_confirmed ? auditTime : ""
    };
    const original = patients.find((patient) => patient.patient_demo_id === normalized.patient_demo_id);
    let dischargeChangeReason = "";
    if (editingMode === "create") {
      const occupiedNumbers = [
        ...patients.map((patient) => Number(patient.patient_no) || 0),
        ...tasks.map((task) => Number(task.patientId.match(/(\d+)$/)?.[1]) || 0),
        ...clinicalProfiles.map((profile) => Number(profile.patientId.match(/(\d+)$/)?.[1]) || 0)
      ];
      const nextNumber = Math.max(0, ...occupiedNumbers) + 1;
      const sequence = String(nextNumber).padStart(6, "0");
      savedPatient = {
        ...savedPatient,
        patient_demo_id: `P-DEMO-${String(nextNumber).padStart(3, "0")}`,
        patient_code: `CRH-P-${now.getFullYear()}-${sequence}`,
        patient_no: sequence,
        hospital_patient_no: normalized.hospital_patient_no || sequence,
        field_status: { ...savedPatient.field_status, patient_no: "saved" },
        created_at: auditTime,
        updated_at: auditTime,
        audit_log: [`${auditTime} ${doctorName}创建患者档案`]
      };
    } else {
      const sensitiveChanged = original && ["name", "gender", "birth_date", "hospital_patient_no", "id_number"].some((key) => original[key as keyof ManagedPatient] !== normalized[key as keyof ManagedPatient]);
      if (sensitiveChanged && !window.confirm("姓名、性别、出生日期、病案号或证件号码已发生变化。确认保存并写入审计记录吗？")) return;
      if (original && original.discharge_date !== normalized.discharge_date) {
        if (!window.confirm("出院日期变化会重新计算尚未完成的1、3、6个月随访节点，已完成记录保持不变。确认继续吗？")) return;
        dischargeChangeReason = window.prompt("请输入调整出院日期的原因，将写入随访审计记录。", original.discharge_date ? "更正出院日期" : "补录出院日期")?.trim() ?? "";
        if (!dischargeChangeReason) {
          setFormError("修改出院日期必须填写变更原因。");
          return;
        }
      }
      savedPatient = { ...savedPatient, updated_by: doctorName, updated_at: auditTime, audit_log: [...normalized.audit_log, `${auditTime} ${doctorName}修改患者档案${dischargeChangeReason ? `（${dischargeChangeReason}）` : ""}`] };
    }
    onSavePatient(savedPatient, original?.discharge_date ?? "", dischargeChangeReason);
    setSelectedId(savedPatient.patient_demo_id);
    if (editingMode === "create") setJustCreatedId(savedPatient.patient_demo_id);
    setEditDraft(null);
  }

  function openEdit(patient: ManagedPatient) {
    if (!canEditClinical || patient.assigned_doctor !== doctorName) return;
    setEditingMode("edit");
    setFormError("");
    setSimilarPatientWarning("");
    setSimilarWarningAccepted(false);
    setEditDraft({ ...patient, assessment: { ...patient.assessment } });
  }

  function openCreate() {
    return;
    /* Legacy manual-entry form retained only for rollback comparison; it has no reachable entry in this version.
    const now = formatDateTime(new Date().toISOString());
    setEditingMode("create");
    setFormError("");
    setSimilarPatientWarning("");
    setSimilarWarningAccepted(false);
    setEditDraft({
      patient_demo_id: "",
      patient_code: "",
      patient_no: "",
      hospital_patient_no: "",
      institution_id: "ORG-CRH-001",
      institution_name: "心脏康复中心",
      environment: "测试环境",
      record_source: "本地录入",
      record_status: "有效",
      workflow_status: "draft",
      field_status: {
        name: "not_collected",
        gender: "not_collected",
        birth_date: "not_collected",
        patient_no: "not_collected",
        phone: "not_collected",
        diagnosis_summary: "not_collected",
        medical_history: "not_collected",
        current_medications: "not_collected",
        assessment: "not_collected"
      },
      name: "",
      id_number: "",
      id_type: "身份证",
      phone: "",
      birth_date: "",
      age: 0,
      gender: "",
      emergency_contact: "",
      emergency_relation: "",
      emergency_phone: "",
      assigned_doctor: doctorName,
      diagnosis_summary: "",
      medical_history: "",
      procedure_history: "",
      current_medications: "",
      drug_allergies: "",
      exercise_precautions: "",
      referral_source: "",
      discharge_date: "",
      planned_rehab_date: "",
      risk_level: "待评估",
      rehab_group: "待分组",
      rehab_stage: "待评估",
      consent_status: "未记录",
      consent_time: "",
      consent_method: "",
      height_cm: "",
      weight_kg: "",
      record_note: "",
      clinical_confirmed: false,
      clinical_confirmed_by: doctorName,
      clinical_confirmed_role: "康复医生",
      clinical_confirmed_at: now,
      created_by: doctorName,
      created_at: "保存后生成",
      updated_by: doctorName,
      updated_at: "保存后生成",
      audit_log: [],
      assessment: { cpet: "待评估", six_mwt: "待评估", resting_hr: 0 },
      prescription_version: "尚未开始",
      training_status: "尚未开始",
      latest_abnormal: "无",
      report_status: "尚未开始",
      last_followup: "尚未随访"
    }); */
  }

  function startFirstAssessment(patientId: string) {
    const patient = patients.find((item) => item.patient_demo_id === patientId);
    if (!patient) return;
    onUpdatePatient({
      ...patient,
      rehab_stage: "首次评估",
      updated_by: doctorName,
      updated_at: formatDateTime(new Date().toISOString()),
      audit_log: [...patient.audit_log, `${formatDateTime(new Date().toISOString())} ${doctorName}发起首次评估`]
    });
    setJustCreatedId(null);
  }

  function archivePatient(patient: ManagedPatient) {
    if (patient.assigned_doctor !== doctorName) return;
    const reason = window.prompt("请输入归档原因（不会物理删除患者数据）", "患者已结束本阶段康复")?.trim();
    if (!reason) return;
    const now = formatDateTime(new Date().toISOString());
    onUpdatePatient({ ...patient, record_status: "已归档", workflow_status: "archived", updated_by: doctorName, updated_at: now, audit_log: [...patient.audit_log, `${now} ${doctorName}归档患者：${reason}`] });
    setSelectedId(null);
  }

  function importBatchPatients() {
    const rows = batchText.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    if (rows.length < 2) return;
    const [header, ...dataRows] = rows;
    const headers = header.split(/\t|,/).map((item) => item.trim());
    const created = dataRows.map((row, index) => {
      const values = row.split(/\t|,/).map((item) => item.trim());
      const value = (name: string, fallback = "") => values[headers.indexOf(name)] ?? fallback;
      const birthDate = value("出生日期");
      const importedPatientNo = value("患者号") || value("患者号（可留空自动生成）") || String(900000 + index);
      const now = formatDateTime(new Date().toISOString());
      return {
        patient_demo_id: `P-IMPORT-${Date.now()}-${index}`,
        patient_code: `CRH-IMPORT-${Date.now()}-${index}`,
        patient_no: importedPatientNo,
        hospital_patient_no: importedPatientNo,
        institution_id: "ORG-CRH-001",
        institution_name: "心脏康复中心",
        environment: "测试环境" as const,
        record_source: "OCR批量导入" as const,
        record_status: "有效" as const,
        workflow_status: "incomplete" as const,
        field_status: { name: value("姓名") ? "saved" : "not_collected", gender: value("性别") ? "saved" : "not_collected", birth_date: birthDate ? "saved" : "not_collected", patient_no: importedPatientNo ? "saved" : "not_collected", phone: value("联系电话") ? "saved" : "not_collected" } as Record<string, FieldCollectionStatus>,
        name: value("姓名", `待核对患者${index + 1}`), id_number: "", id_type: "身份证" as const, phone: value("联系电话"), birth_date: birthDate, age: calculateAge(birthDate), gender: value("性别"), emergency_contact: "", emergency_relation: "", emergency_phone: "", assigned_doctor: value("主管医生", doctorName), diagnosis_summary: "", medical_history: "", procedure_history: "", current_medications: "", drug_allergies: "", exercise_precautions: "待工作人员核对", referral_source: "OCR批量导入", discharge_date: "", planned_rehab_date: "", risk_level: "待评估", rehab_group: "待分组", rehab_stage: "待评估", consent_status: "未记录", consent_time: "", consent_method: "", height_cm: "", weight_kg: "", record_note: "OCR识别草稿，待工作人员核对", clinical_confirmed: false, clinical_confirmed_by: "", clinical_confirmed_role: "", clinical_confirmed_at: "", created_by: doctorName, created_at: now, updated_by: doctorName, updated_at: now, audit_log: [`${now} ${doctorName}通过OCR批量导入，数据待核对`], assessment: { cpet: "待评估", six_mwt: "待评估", resting_hr: 0 }, prescription_version: "尚未开始", training_status: "尚未开始", latest_abnormal: "无", report_status: "尚未开始", last_followup: "尚未随访"
      } satisfies ManagedPatient;
    });
    created.forEach((patient) => onSavePatient(patient, "", ""));
    setShowBatchImport(false);
    setBatchText("姓名\t性别\t出生日期\t病案号\t联系电话\n");
  }

  return (
    <section data-testid="page-VIEW-PATIENT-ARCHIVES">
      {selected ? (
        <PatientDetail
          patient={selected}
          clinicalProfile={selectedClinicalProfile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tasks={tasks.filter((task) => task.patientId === selected.patient_demo_id && (role !== "DOCTOR" || task.assignedDoctor === doctorName))}
          followUpTasks={followUpTasks.filter((task) => task.patientId === selected.patient_demo_id)}
          followUpRecords={followUpRecords.filter((record) => record.patientId === selected.patient_demo_id)}
          clinicalNarratives={clinicalNarratives.filter((record) => record.patientId === selected.patient_demo_id)}
          assessmentRecords={assessmentRecords.filter((record) => record.patientId === selected.patient_demo_id)}
          treatmentRecords={treatmentRecords.filter((record) => record.patientId === selected.patient_demo_id)}
          onBack={() => { setSelectedId(null); setActiveTab("profile"); }}
          onBackToPrescription={onBackToPrescription}
          onEdit={() => openEdit(selected)}
          onArchive={() => archivePatient(selected)}
          canEdit={canEditClinical && selected.assigned_doctor === doctorName}
          canCollectAssessment={canCollectAssessment}
          justCreated={canEditClinical && justCreatedId === selected.patient_demo_id}
          onStartAssessment={() => startFirstAssessment(selected.patient_demo_id)}
          onOpenPrescription={onOpenPrescription}
          onOpenFollowUp={onOpenFollowUp}
          onOpenAssessment={onOpenAssessment}
          onOpenDischargeReport={onOpenDischargeReport}
          onSaveTreatmentRecord={(record) => onSaveTreatmentRecord?.(record)}
        />
      ) : (
        <>
          <PageHeader eyebrow="患者数据索引" title="患者训练数据" description="患者主档与正式病历由院内 HIS 维护；本系统只接收院方编号、必要基础信息和训练数据，不提供手工建档入口。" action={<div className="flex items-center gap-2"><StatusBadge tone="orange">脱敏演示数据</StatusBadge>{canImport && <button type="button" onClick={() => setShowBatchImport(true)} className="btn-primary"><Upload className="h-4 w-4" />OCR 批量导入</button>}</div>} />
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
              <label className="relative block min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400" placeholder="搜索姓名、档案编码、病案号、证件号或电话" />
              </label>
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600"><option>全部风险</option><option>待评估</option><option>低危</option><option>中危</option><option>高危</option></select>
              <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600"><option>全部阶段</option><option>待评估</option><option>首次评估</option><option>康复执行</option><option>随访</option><option>已结案</option><option>Ⅱ期</option></select>
              <select value={cpetFilter} onChange={(event) => setCpetFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600"><option>全部 CPET</option><option>已完成</option><option>未完成</option><option>未采集</option><option>待核对</option></select>
              <select value={dataStatusFilter} onChange={(event) => setDataStatusFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600"><option>全部状态</option><option>尚未开始</option><option>主训练中</option><option>等待核验</option><option>已完成</option><option>阻断</option><option>已出院</option><option>随访中</option></select>
              <span className="ml-2 text-[10px] font-bold text-slate-400">共 {filteredPatients.length} 位患者</span>
            </div>
            <div className="overflow-x-auto"><div className="min-w-[1180px]">
              <div className="grid grid-cols-[0.7fr_1.05fr_0.7fr_0.65fr_0.95fr_0.55fr_0.72fr_0.62fr_0.72fr_0.7fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">
                <span>患者姓名</span><span>康复档案编码</span><span>患者号</span><span>性别/年龄</span><span>诊断摘要</span><span>风险</span><span>康复阶段</span><span>CPET</span><span>执行状态</span><span>操作</span>
              </div>
              {filteredPatients.map((patient) => (
                <div key={patient.patient_demo_id} className="grid grid-cols-[0.7fr_1.05fr_0.7fr_0.65fr_0.95fr_0.55fr_0.72fr_0.62fr_0.72fr_0.7fr] items-center border-t border-slate-100 px-5 py-3 text-xs hover:bg-blue-50">
                  <button type="button" onClick={() => setSelectedId(patient.patient_demo_id)} className="flex items-center gap-2 text-left font-bold text-blue-700"><UserRound className="h-4 w-4" /><span>{patient.name}<small className="mt-1 block text-[9px] font-semibold text-slate-400">{patient.workflow_status === "confirmed" ? "已确认" : patient.workflow_status === "incomplete" ? "待补全" : patient.workflow_status === "archived" ? "已归档" : "已保存"}</small></span></button>
                  <span className="font-mono text-[10px] text-slate-500">{patient.patient_code}</span><span className="font-mono text-[10px] text-slate-500">{patient.hospital_patient_no}</span><span>{patient.gender} / {patient.age}岁</span><span className="truncate pr-3 leading-5 text-slate-600" title={patient.diagnosis_summary}>{patient.diagnosis_summary || "待补充"}</span>
                  <StatusBadge tone={patient.risk_level === "待评估" ? "gray" : riskTone(patient.risk_level)}>{patient.risk_level}</StatusBadge><span>{patient.rehab_stage}</span><span className="text-[10px] text-slate-500">{cpetStatusLabel(clinicalProfileMap.get(patient.patient_demo_id)?.cpetStatus ?? "not_collected")}</span><span className="text-[10px] font-semibold text-slate-600">{patient.training_status || patient.prescription_version || "未开始"}</span>
                  <button type="button" onClick={() => { setSelectedId(patient.patient_demo_id); setActiveTab("profile"); }} className="inline-flex items-center gap-1 font-bold text-blue-700">患者详情<ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div></div>
            {filteredPatients.length === 0 && <div className="py-12 text-center text-xs text-slate-400">没有符合条件的患者</div>}
          </section>
        </>
      )}
      {editDraft && <PatientEditModal patient={editDraft} setPatient={setEditDraft} mode={editingMode} formError={formError} similarWarning={similarPatientWarning} onAcceptSimilar={() => { setSimilarWarningAccepted(true); setSimilarPatientWarning(""); }} onClose={() => setEditDraft(null)} onSave={savePatient} />}
      {showBatchImport && <BatchImportModal text={batchText} onChange={setBatchText} onClose={() => setShowBatchImport(false)} onImport={importBatchPatients} />}
    </section>
  );
}

function BatchImportModal({ text, onChange, onClose, onImport }: { text: string; onChange: (value: string) => void; onClose: () => void; onImport: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState(false);
  const rows = text.split(/\r?\n/).filter(Boolean).slice(1);
  function recognizeFiles() {
    if (!files.length) return;
    setRecognizing(true);
    window.setTimeout(() => {
      const demoRows = files.map((_, index) => `${index === 0 ? "陈女士" : `待核对患者${index + 1}`}\t${index % 2 === 0 ? "女" : "男"}\t${index === 0 ? "1967-04-18" : ""}\t${String(900001 + index)}\t\t王医生`);
      onChange(`姓名\t性别\t出生日期\t患者号\t联系电话\t主管医生\n${demoRows.join("\n")}`);
      setRecognized(true);
      setRecognizing(false);
    }, 650);
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><section className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold text-violet-600">历史纸质资料 · OCR 批量导入</p><h2 className="mt-1 text-lg font-bold text-slate-950">扫描多份资料，生成待核对数据草稿</h2><p className="mt-1 text-xs text-slate-500">支持图片或 PDF 批量选择，仅识别姓名、性别、年龄/出生日期和院方编号等必要信息，不要求身份证号。</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><label className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 text-center"><Upload className="h-6 w-6 text-violet-600" /><b className="mt-2 text-xs text-violet-900">选择多张扫描图片或 PDF</b><span className="mt-1 text-[10px] text-violet-600">识别结果必须逐条人工核对</span><input type="file" multiple accept="image/*,.pdf" className="sr-only" onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setRecognized(false); onChange("姓名\t性别\t出生日期\t患者号\t联系电话\t主管医生\n"); }} /></label>{files.length > 0 && <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 p-3"><span className="text-xs text-slate-600">已选择 <b>{files.length}</b> 份资料</span><button type="button" onClick={recognizeFiles} disabled={recognizing} className="btn-secondary">{recognizing ? "OCR 识别中…" : "开始 OCR 识别"}</button></div>}{recognized && <><textarea value={text} onChange={(event) => onChange(event.target.value)} className="mt-4 min-h-40 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-violet-400" /><div className="mt-3 grid grid-cols-3 gap-3 text-xs"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><b>{rows.length}</b><p className="mt-1">识别草稿</p></div><div className="rounded-xl bg-amber-50 p-3 text-amber-800"><b>{rows.filter((row) => row.split(/\t|,/).some((field) => !field.trim())).length}</b><p className="mt-1">存在缺失字段</p></div><div className="rounded-xl bg-slate-50 p-3 text-slate-600"><b>待核对</b><p className="mt-1">不自动确认</p></div></div></>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">取消</button><button type="button" onClick={onImport} disabled={!recognized || rows.length === 0} className="btn-primary disabled:bg-slate-300"><Upload className="h-4 w-4" />导入待核对草稿</button></div></section></div>;
}

function PatientDetail({ patient, clinicalProfile, activeTab, setActiveTab, tasks, followUpTasks, followUpRecords, clinicalNarratives, assessmentRecords, treatmentRecords, onBack, onBackToPrescription, onEdit, onArchive, canEdit, canCollectAssessment, justCreated, onStartAssessment, onOpenPrescription, onOpenFollowUp, onOpenAssessment, onOpenDischargeReport, onSaveTreatmentRecord }: {
  patient: ManagedPatient;
  clinicalProfile?: PatientClinicalProfile;
  activeTab: PatientWorkspaceTab;
  setActiveTab: (tab: PatientWorkspaceTab) => void;
  tasks: PrescriptionTask[];
  followUpTasks: FollowUpTask[];
  followUpRecords: FollowUpRecord[];
  clinicalNarratives: ClinicalNarrativeRecord[];
  assessmentRecords: AssessmentRecord[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  onBack: () => void;
  onBackToPrescription?: () => void;
  onEdit: () => void;
  onArchive: () => void;
  canEdit: boolean;
  canCollectAssessment: boolean;
  justCreated: boolean;
  onStartAssessment: () => void;
  onOpenPrescription: (taskId: string) => void;
  onOpenFollowUp: (taskId: string) => void;
  onOpenAssessment: (patientId?: string) => void;
  onOpenDischargeReport?: (patientId: string) => void;
  onSaveTreatmentRecord?: (record: CardiopulmonaryTreatmentRecord) => void;
}) {
  const tabs: { key: PatientWorkspaceTab; label: string; icon: typeof UserRound }[] = [
    { key: "profile", label: "基础档案", icon: UserRound },
    { key: "assessments", label: "体能评估", icon: ClipboardList },
    { key: "treatments", label: "治疗记录", icon: Stethoscope },
    { key: "followups", label: "随访记录", icon: CalendarClock },
    { key: "sessions", label: "训练记录", icon: Activity },
    { key: "reports", label: "报告", icon: CalendarRange }
  ];
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="患者详情页面" title={`${patient.name} · ${patient.patient_code}`} description={`患者号 ${patient.hospital_patient_no} · 主管医生 ${patient.assigned_doctor} · ${patient.environment}`} action={<div className="flex gap-2">{canEdit && patient.record_status !== "已归档" && <button type="button" onClick={onArchive} className="btn-secondary text-rose-700">归档患者</button>}{onBackToPrescription && <button type="button" onClick={onBackToPrescription} className="btn-primary"><ArrowLeft className="h-4 w-4" />返回当前处方</button>}<button type="button" onClick={onBack} className="btn-secondary">返回患者列表</button></div>} />
      {justCreated && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><b className="text-sm text-emerald-900">患者档案创建成功</b><p className="mt-1 text-xs text-emerald-700">未自动生成运动处方。可继续发起首次评估，或返回患者列表。</p></div></div><div className="flex gap-2"><button type="button" onClick={onBack} className="btn-secondary">返回患者列表</button><button type="button" onClick={onStartAssessment} className="btn-primary">发起首次评估<ArrowRight className="h-4 w-4" /></button></div></section>}
      <section className="card p-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound className="h-6 w-6" /></span>
          <div className="grid flex-1 grid-cols-6 gap-3">
            <Summary label="患者号" value={patient.hospital_patient_no} /><Summary label="年龄 / 性别" value={`${patient.age}岁 / ${patient.gender}`} /><Summary label="危险分组" value={clinicalProfile?.riskLevel ?? patient.risk_level} /><Summary label="康复阶段" value={clinicalProfile?.rehabStage ?? patient.rehab_stage} /><Summary label="训练批次" value={patient.prescription_version} /><Summary label="训练状态" value={patient.training_status} />
          </div>
          {canEdit && <button type="button" onClick={onEdit} className="btn-secondary"><Pencil className="h-4 w-4" />编辑信息</button>}
        </div>
      </section>
      <DataChain patient={patient} clinicalProfile={clinicalProfile} tasks={tasks} followUpTasks={followUpTasks} clinicalNarratives={clinicalNarratives} assessmentRecords={assessmentRecords} />
      <nav className="card flex gap-1 p-1.5" aria-label="患者详情栏目">
        {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold ${activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>
      {activeTab === "profile" && <ProfileTab patient={patient} clinicalProfile={clinicalProfile} />}
      {activeTab === "assessments" && <AssessmentTab records={assessmentRecords} canEdit={canCollectAssessment} onOpenAssessment={onOpenAssessment} />}
      {activeTab === "treatments" && <TreatmentRecordsTab patientId={patient.patient_demo_id} patientNo={patient.patient_no} records={treatmentRecords} canEdit={canCollectAssessment} onSave={onSaveTreatmentRecord} />}
      {activeTab === "narratives" && <NarrativesTab records={clinicalNarratives} />}
      {activeTab === "followups" && <FollowUpsTab patient={patient} tasks={followUpTasks} records={followUpRecords} canEdit={canEdit} onEditPatient={onEdit} onOpenFollowUp={onOpenFollowUp} />}
      {activeTab === "prescriptions" && <PrescriptionsTab tasks={tasks} onOpen={onOpenPrescription} />}
      {activeTab === "sessions" && <SessionsTab patientId={patient.patient_demo_id} />}
      {activeTab === "reports" && <ReportsTab patientId={patient.patient_demo_id} clinicalProfile={clinicalProfile} onOpenPrescription={onOpenPrescription} tasks={tasks} onOpenDischargeReport={onOpenDischargeReport} />}
    </div>
  );
}

function DataChain({ patient, clinicalProfile, tasks, followUpTasks, clinicalNarratives, assessmentRecords }: { patient: ManagedPatient; clinicalProfile?: PatientClinicalProfile; tasks: PrescriptionTask[]; followUpTasks: FollowUpTask[]; clinicalNarratives: ClinicalNarrativeRecord[]; assessmentRecords: AssessmentRecord[] }) {
  const completedFollowUps = followUpTasks.filter((task) => effectiveFollowUpStatus(task) === "completed").length;
  const nodes = [
    { label: "OCR基础数据", detail: patient.workflow_status === "confirmed" ? "已确认" : patient.workflow_status === "incomplete" ? "待补全" : patient.workflow_status === "archived" ? "已归档" : "已保存", ready: Boolean(patient.patient_code) && patient.workflow_status !== "archived" },
    { label: "体能评估", detail: assessmentRecords.length ? `${assessmentRecords.length}次 · ${assessmentRecords.some((record) => record.status === "doctor_reviewed") ? "已复核" : "待复核"}` : clinicalProfile?.rehabAssessment.status ?? "待补充", ready: assessmentRecords.some((record) => record.status === "doctor_reviewed") || clinicalProfile?.rehabAssessment.status === "已复核" },
    { label: "本次项目选择", detail: tasks.length ? "康复师对照纸质处方" : "到诊后选择", ready: tasks.length > 0 },
    { label: "训练记录", detail: patient.training_status || "待开始", ready: patient.training_status !== "尚未开始" },
    { label: "阶段报告", detail: patient.report_status || "待生成", ready: patient.report_status !== "尚未开始" },
    { label: "出院/随访", detail: `${completedFollowUps}/${followUpTasks.length} 完成`, ready: completedFollowUps > 0 }
  ];
  return <section className="card p-5"><SectionHeader title="训练数据闭环" description="OCR基础数据 → 体能评估 → 到诊选择项目 → 训练记录 → AI阶段报告 → 出院随访；病历和正式处方留在HIS。" /><div className="mt-4 grid gap-2 md:grid-cols-6">{nodes.map((node, index) => <div key={node.label} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">{index < nodes.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden h-px w-4 bg-slate-300 md:block" />}<span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${node.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{node.ready ? "✓" : "·"}</span><p className="mt-2 text-[11px] font-bold text-slate-800">{node.label}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{node.detail}</p></div>)}</div></section>;
}

function AssessmentTab({ records, canEdit, onOpenAssessment }: { records: AssessmentRecord[]; canEdit: boolean; onOpenAssessment: (patientId?: string) => void }) {
  return <section className="card overflow-hidden"><div className="flex items-start justify-between gap-3 px-5 pt-5"><SectionHeader title="体能评估记录" description="SPPB 原始值、计算分数和复核状态均可追溯。" />{canEdit && <button type="button" onClick={() => onOpenAssessment(records[0]?.patientId)} className="btn-primary"><ClipboardList className="h-4 w-4" />进入体能评估</button>}</div><div className="mt-3 grid grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>评估编号</span><span>类型/次数</span><span>测试时间</span><span>SPPB</span><span>来源</span><span>状态</span></div>{records.map((record) => <div key={record.assessmentId} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] items-center border-t border-slate-100 px-5 py-3 text-xs"><span className="font-mono text-[10px] text-slate-500">{record.assessmentId}</span><span>{record.assessmentType} · 第{record.attemptNo}次</span><span>{record.assessedAt.slice(0, 10)}</span><b className="text-blue-700">{hasSppbInput(record.sppb) ? `${record.sppb.totalScore}/12` : "未采集"}</b><span>{record.source === "device" ? "设备采集" : record.source === "ocr" ? "OCR辅助" : "人工录入"}</span><StatusBadge tone={record.status === "doctor_reviewed" ? "green" : record.status === "therapist_confirmed" ? "orange" : "gray"}>{record.status === "doctor_reviewed" ? "医生已复核" : record.status === "therapist_confirmed" ? "康复师已确认" : "草稿"}</StatusBadge></div>)}{!records.length && <EmptyState text="暂无体能评估记录，请从患者档案内新建。" />}</section>;
}

function ProfileTab({ patient, clinicalProfile }: { patient: ManagedPatient; clinicalProfile?: PatientClinicalProfile }) {
  const specialMedication = patient.patient_demo_id === clinicalSnapshotChen.patientId ? clinicalSnapshotChen.specialMedications.join("、") : "未录入";
  const maskedPhone = patient.phone.length === 11 ? `${patient.phone.slice(0, 3)}****${patient.phone.slice(-4)}` : patient.phone || "未录入";
  const maskedId = clinicalProfile?.idNumberMasked ?? (patient.id_number.length > 8 ? `${patient.id_number.slice(0, 4)}********${patient.id_number.slice(-4)}` : patient.id_number || "未录入");
  return <div className="space-y-4">
    <ClinicalOverviewCard patient={patient} clinicalProfile={clinicalProfile} />
    <section className="card p-5"><SectionHeader title="系统属性" description="由系统生成或根据登录上下文写入，不在建档表单中人工修改。" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      ["康复档案编码", patient.patient_code], ["数据环境", patient.environment], ["档案来源", patient.record_source], ["数据状态", patient.workflow_status === "confirmed" ? "已确认" : patient.workflow_status === "incomplete" ? "待补全" : patient.workflow_status === "archived" ? "已归档" : "已保存"],
      ["档案状态", patient.workflow_status === "confirmed" ? "已确认" : patient.workflow_status === "incomplete" ? "待补全" : patient.workflow_status === "archived" ? "已归档" : "已保存"], ["主管医生", patient.assigned_doctor], ["创建信息", `${patient.created_by} · ${patient.created_at}`], ["最后修改", `${patient.updated_by} · ${patient.updated_at}`]
    ].map(([label, value]) => <Summary key={label} label={label} value={value} />)}</div></section>
    <section className="card p-5"><SectionHeader title="基础档案与临床信息" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      ["患者号", patient.hospital_patient_no], ["证件号码", maskedId], ["联系电话", clinicalProfile?.contact ?? maskedPhone], ["出生日期", patient.birth_date],
      ["康复分组", patient.rehab_group], ["静息生命体征", clinicalProfile?.restingVitals ?? (patient.assessment.resting_hr ? `${patient.assessment.resting_hr} bpm` : "待评估")],
      ["CPET", clinicalProfile?.cpet ?? patient.assessment.cpet], ["6分钟步行", clinicalProfile?.sixMinuteWalk ?? patient.assessment.six_mwt], ["最近随访", patient.last_followup], ["特殊用药", clinicalProfile?.specialMedications ?? specialMedication],
      ["紧急联系人", patient.emergency_contact || "未录入"]
    ].map(([label, value]) => <Summary key={label} label={label} value={value} />)}</div><div className="mt-4 grid gap-3 md:grid-cols-2"><DetailText label="诊断摘要" value={(clinicalProfile?.diagnosis ?? patient.diagnosis_summary) || "待补充"} /><DetailText label="运动禁忌与注意事项" value={patient.exercise_precautions || "待补充"} /></div>{clinicalProfile?.auditSummary && <p className="mt-3 text-[10px] text-blue-600">{clinicalProfile.auditSummary} · {clinicalProfile.updatedBy} · {formatDateTime(clinicalProfile.updatedAt)}</p>}</section>
    <section className="card p-5"><SectionHeader title="档案状态与记录" description="患者档案可先保存，再按评估和处方执行情况逐步补全。" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Summary label="数据状态" value={patient.workflow_status === "confirmed" ? "已确认" : patient.workflow_status === "incomplete" ? "待补全" : patient.workflow_status === "archived" ? "已归档" : "已保存"} /><Summary label="最近修改人" value={patient.updated_by || "待记录"} /><Summary label="最近修改时间" value={patient.updated_at || "待记录"} /><Summary label="审计记录" value={`${patient.audit_log.length} 条`} /></div></section>
  </div>;
}

function ClinicalOverviewCard({ patient, clinicalProfile }: { patient: ManagedPatient; clinicalProfile?: PatientClinicalProfile }) {
  const metric = clinicalProfile?.rehabAssessment;
  const overviewRows = [
    ["姓名", clinicalProfile?.name ?? patient.name], ["性别", clinicalProfile?.sex ?? patient.gender], ["出生日期", clinicalProfile?.birthDate ?? patient.birth_date], ["年龄", `${clinicalProfile?.age ?? patient.age} 岁`],
    ["身高", clinicalProfile?.heightCm == null ? "未采集" : `${clinicalProfile.heightCm} cm`], ["体重", clinicalProfile?.weightKg == null ? "未采集" : `${clinicalProfile.weightKg} kg`], ["BMI", clinicalProfile?.bmi == null ? "未采集" : `${clinicalProfile.bmi}`]
  ];
  const rehabRows = [
    ["康复阶段", clinicalProfile?.rehabStage ?? patient.rehab_stage], ["运动风险等级", clinicalProfile?.riskLevel ?? patient.risk_level], ["出院日期", (clinicalProfile?.dischargeDate ?? patient.discharge_date) || "未采集"], ["上次随访", (clinicalProfile?.previousFollowUpDate ?? patient.last_followup) || "未采集"], ["下次随访", clinicalProfile?.nextFollowUpDate ?? "未安排"], ["当前处方", clinicalProfile?.currentPrescriptionVersion ?? patient.prescription_version], ["训练状态", clinicalProfile?.trainingStatus ?? patient.training_status], ["最近异常", clinicalProfile?.latestAbnormal ?? patient.latest_abnormal]
  ];
  const assessmentRows = [
    ["CPET 状态", cpetStatusLabel(clinicalProfile?.cpetStatus)], ["无氧阈心率", clinicalMetricLabel(metric?.cpet.anaerobicThresholdHr)], ["峰值心率", clinicalMetricLabel(metric?.cpet.peakHr)], ["静息心率", clinicalMetricLabel(metric?.restingVitals.metric)], ["最近一次 SPPB", metric && metric.status !== "待补充" ? `${metric.sppb.balanceScore + metric.sppb.gaitScore + metric.sppb.chairStandScore}/12` : "未评估"], ["6 分钟步行", clinicalProfile?.sixMinuteWalk ?? "未评估"], ["最近评估日期", metric?.status === "待补充" ? "未评估" : metric?.assessedAt?.slice(0, 10) ?? "未评估"]
  ];
  return <section className="card border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5"><div className="flex items-start justify-between gap-3"><SectionHeader title="患者临床概览" description="医生、康复师和报告页面读取同一份临床摘要；指标均保留来源与确认状态。" /><StatusBadge tone={clinicalProfile?.riskLevel === "高危" ? "red" : clinicalProfile?.riskLevel === "中危" ? "orange" : "green"}>{clinicalProfile?.riskLevel ?? patient.risk_level}</StatusBadge></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><OverviewGroup title="基础信息" rows={overviewRows} /><OverviewGroup title="康复状态" rows={rehabRows} /><OverviewGroup title="功能评估" rows={assessmentRows} /></div>{metric && <p className="mt-3 text-[10px] text-slate-500">CPET/心率数据来源：{metric.cpet.peakHr.source} · 评估日期：{metric.assessedAt.slice(0, 10)} · 状态：{metric.cpet.peakHr.status === "confirmed" ? "已确认" : "待核对"} · 查看来源：CPET / SPPB 评估记录</p>}</section>;
}

function OverviewGroup({ title, rows }: { title: string; rows: string[][] }) {
  return <div className="rounded-xl border border-white/80 bg-white/80 p-4 shadow-sm"><p className="text-xs font-bold text-slate-800">{title}</p><div className="mt-3 grid grid-cols-2 gap-2">{rows.map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{value}</p></div>)}</div></div>;
}

function DetailText({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-2 text-xs font-semibold leading-6 text-slate-700">{value}</p></div>;
}

function NarrativesTab({ records }: { records: ClinicalNarrativeRecord[] }) {
  const sortedRecords = [...records].sort((left, right) => right.encounterAt.localeCompare(left.encounterAt));
  return <section className="card p-5"><SectionHeader title="历史口述与医患沟通" description="随访完成后自动同步摘要，并使用同一记录ID保持可追溯。" />{sortedRecords.length ? <div className="space-y-3">{sortedRecords.map((record) => <article key={record.narrativeId} className="grid gap-4 rounded-xl border border-slate-100 p-4 md:grid-cols-[150px_1fr]"><div><b className="text-slate-800">{formatDate(record.encounterAt)}</b><p className="mt-1 text-[10px] text-slate-400">{formatTime(record.encounterAt)} · {record.author}</p><StatusBadge tone="blue">{record.recordType}</StatusBadge><p className="mt-2 font-mono text-[9px] text-slate-400">{record.narrativeId}</p></div><div className="grid gap-3 text-xs leading-5 md:grid-cols-3"><NarrativeItem label="患者主诉" value={record.content.chiefComplaint} /><NarrativeItem label="生活方式 / 训练" value={[record.content.lifestyle, record.content.trainingFeedback].filter(Boolean).join("；")} /><NarrativeItem label="依从性与处置" value={`${record.content.medicationAdherence}；${record.content.clinicalAssessment}`} /></div></article>)}</div> : <EmptyState text="该患者暂无历史口述记录" />}</section>;
}

function FollowUpsTab({ patient, tasks, records, canEdit, onEditPatient, onOpenFollowUp }: { patient: ManagedPatient; tasks: FollowUpTask[]; records: FollowUpRecord[]; canEdit: boolean; onEditPatient: () => void; onOpenFollowUp: (taskId: string) => void }) {
  if (!patient.discharge_date) return <section className="card p-5"><SectionHeader title="随访计划" description="随访节点以出院日期为计算起点。" /><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" /><div><b className="text-xs text-amber-900">尚未生成随访计划</b><p className="mt-1 text-xs text-amber-700">请先补录出院日期，系统将自动生成1、3、6个月随访节点。</p></div></div>{canEdit && <button type="button" onClick={onEditPatient} className="btn-secondary">补录出院日期</button>}</div></section>;
  const sortedTasks = [...tasks].sort((left, right) => left.milestoneMonth - right.milestoneMonth);
  return <div className="space-y-4"><section className="card p-5"><SectionHeader title="1、3、6个月随访计划" description={`出院日期 ${patient.discharge_date} · 提前7天进入医生待办。`} /><div className="grid gap-3 md:grid-cols-3">{sortedTasks.map((task) => {
    const status = effectiveFollowUpStatus(task);
    const tone = status === "completed" ? "green" : status === "overdue" ? "red" : status === "due" ? "orange" : status === "rescheduled" ? "blue" : "gray";
    return <div key={task.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between"><b className="text-sm text-slate-900">出院后 {task.milestoneMonth} 个月</b><StatusBadge tone={tone}>{followUpStatusLabels[status]}</StatusBadge></div><p className="mt-3 text-xs text-slate-500">原计划：{task.originalPlannedDate}</p><p className="mt-1 text-xs font-bold text-slate-800">当前日期：{task.currentDueDate}</p>{canEdit && status !== "completed" && <button type="button" onClick={() => onOpenFollowUp(task.id)} className="mt-4 text-xs font-bold text-blue-700">去随访<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>}</div>;
  })}</div></section><section className="card p-5"><SectionHeader title="沟通时间线" description="包含成功随访和未接通后的再次联系安排。" />{records.length ? <div className="space-y-3">{[...records].sort((left, right) => right.contactedAt.localeCompare(left.contactedAt)).map((record) => <article key={record.recordId} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><b className="text-xs text-slate-900">{record.milestoneMonth}个月随访</b><StatusBadge tone={record.contactResult === "reached" ? "green" : "orange"}>{contactResultLabels[record.contactResult]}</StatusBadge></div><span className="text-[10px] text-slate-400">{formatDateTime(record.contactedAt)} · {record.operator}</span></div><p className="mt-3 text-xs leading-5 text-slate-600">{record.contactResult === "reached" ? `${record.clinicalAssessment}${record.disposition ? `；${dispositionLabels[record.disposition]}` : ""}` : `${record.notes}；下次联系 ${record.nextContactDate}`}</p><p className="mt-2 font-mono text-[9px] text-slate-400">记录ID {record.recordId} · 关联任务 {record.taskId}</p></article>)}</div> : <EmptyState text="该患者暂无随访沟通记录" />}</section></div>;
}

function PrescriptionsTab({ tasks, onOpen }: { tasks: PrescriptionTask[]; onOpen: (taskId: string) => void }) {
  const rows = tasks.length ? tasks : [];
  return <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="处方执行依据" description="展示从纸质处方或医院现有系统同步的执行版本；本系统不新建或修改正式临床处方。" /></div><div className="grid grid-cols-[1.1fr_0.6fr_0.8fr_1fr_0.8fr_0.7fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>处方号</span><span>版本</span><span>处方类型</span><span>依据</span><span>更新时间</span><span>操作</span></div>{rows.map((task) => <button type="button" key={task.id} onClick={() => onOpen(task.id)} className="grid w-full grid-cols-[1.1fr_0.6fr_0.8fr_1fr_0.8fr_0.7fr] items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50"><span className="font-mono text-[10px]">{task.prescriptionNo}</span><b>{task.versionNo}</b><span>{task.kind === "initial" ? "初始执行版" : "调整执行版"}</span><span>{task.sourceLabel}</span><span>{formatDate(task.updatedAt)} · {prescriptionStatusLabels[task.status]}</span><span className="font-bold text-blue-700">{task.status === "completed" ? "查看记录" : "核对执行项"}</span></button>)}{!rows.length && <EmptyState text="该患者暂无处方执行依据" />}</section>;
}

function SessionsTab({ patientId }: { patientId: string }) {
  const rows = trainingRecords.filter((item) => item.patientId === patientId);
  return <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="每次训练记录" /></div><div className="grid grid-cols-[1.15fr_0.95fr_0.6fr_0.6fr_0.55fr_0.9fr_0.55fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>训练记录号</span><span>训练时间</span><span>项目</span><span>处方版本</span><span>时长</span><span>异常/处置</span><span>状态</span></div>{rows.map((row) => <div key={row.id} className="grid grid-cols-[1.15fr_0.95fr_0.6fr_0.6fr_0.55fr_0.9fr_0.55fr] items-center border-t border-slate-100 px-5 py-3 text-xs"><span className="font-mono text-[10px]">{row.trainingRecordNo}</span><span>{formatDateTime(row.date)}</span><b>{row.project}</b><span>{row.version}</span><span>{row.duration}</span><span>{row.event}</span><StatusBadge tone="green">{row.status}</StatusBadge></div>)}{!rows.length && <EmptyState text="该患者暂无训练记录" />}</section>;
}

function TreatmentRecordsTab({ patientId, patientNo, records, canEdit, onSave }: { patientId: string; patientNo: string; records: CardiopulmonaryTreatmentRecord[]; canEdit: boolean; onSave?: (record: CardiopulmonaryTreatmentRecord) => void }) {
  const [showEditor, setShowEditor] = useState(false);
  const rows = records.filter((record) => record.patientId === patientId).sort((a, b) => b.treatmentAt.localeCompare(a.treatmentAt));
  return <section className="space-y-4"><section className="card p-5"><div className="flex items-start justify-between gap-3"><SectionHeader title="心肺康复治疗记录" description="每次治疗记录训练前后生命体征、项目执行、Borg/VAS 和现场处置，并关联单次报告。" />{canEdit && <button type="button" onClick={() => setShowEditor(true)} className="btn-primary"><Plus className="h-4 w-4" />新增治疗记录</button>}</div>{rows.length ? <div className="mt-4 space-y-3">{rows.map((record) => <TreatmentRecordCard key={record.treatmentId} record={record} />)}</div> : <EmptyState text="暂无治疗记录，可从本页新增" />}</section>{showEditor && <TreatmentRecordEditor patientId={patientId} patientNo={patientNo} onClose={() => setShowEditor(false)} onSave={(record) => { onSave?.(record); setShowEditor(false); }} />}</section>;
}

function TreatmentRecordCard({ record }: { record: CardiopulmonaryTreatmentRecord }) {
  return <article className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><b className="text-sm text-slate-900">{record.treatmentNo}</b><StatusBadge tone={record.status === "therapist_confirmed" ? "green" : record.status === "doctor_reviewed" ? "blue" : "orange"}>{treatmentStatusLabel(record.status)}</StatusBadge></div><p className="mt-1 font-mono text-[10px] text-slate-400">{record.treatmentId} · {formatDateTime(record.treatmentAt)} · {record.therapist}</p></div><div className="text-right text-[10px] text-slate-500">关联训练：{record.sessionId || "未关联"}<br />处方版本：{record.prescriptionVersionId || "未关联"}</div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><VitalSummary title="训练前评估" vitals={record.preAssessment} symptom={`静息胸痛 VAS ${record.preAssessment.chestPainRestVas ?? "—"}`} /><div className="rounded-xl border border-white bg-white p-3"><p className="text-[10px] font-bold text-slate-400">实施训练情况</p><div className="mt-2 flex flex-wrap gap-1.5">{record.interventions.filter((intervention) => intervention.selected).map((intervention) => <span key={intervention.code} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{intervention.label}</span>)}</div><p className="mt-2 text-xs leading-5 text-slate-600">{record.treatmentSummary || "未填写治疗小结"}</p></div><VitalSummary title="训练后评估" vitals={record.postAssessment} symptom={`Borg ${record.postAssessment.borg ?? "—"} · 活动后胸痛 VAS ${record.preAssessment.chestPainActivityVas ?? "—"}`} /></div>{(record.adverseEvent || record.fieldAction) && <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800"><b>异常与处置：</b>{record.adverseEvent || "无异常"} {record.fieldAction ? `；${record.fieldAction}` : ""}</div>}</article>;
}

function VitalSummary({ title, vitals, symptom }: { title: string; vitals: { bloodPressure: string; heartRate: number | null; spo2: number | null; respiratoryRate: number | null; rhythm: string }; symptom: string }) {
  return <div className="rounded-xl border border-white bg-white p-3"><p className="text-[10px] font-bold text-slate-400">{title}</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>血压 <b>{vitals.bloodPressure || "—"}</b></span><span>心率 <b>{vitals.heartRate ?? "—"} bpm</b></span><span>血氧 <b>{vitals.spo2 ?? "—"}%</b></span><span>呼吸 <b>{vitals.respiratoryRate ?? "—"}/分</b></span></div><p className="mt-2 text-[10px] text-slate-500">心律：{vitals.rhythm || "未采集"} · {symptom}</p></div>;
}

function TreatmentRecordEditor({ patientId, patientNo, onClose, onSave }: { patientId: string; patientNo: string; onClose: () => void; onSave: (record: CardiopulmonaryTreatmentRecord) => void }) {
  const [interventions, setInterventions] = useState<string[]>(["breathing", "bike"]);
  const [form, setForm] = useState({ treatmentAt: new Date().toISOString().slice(0, 16), preBp: "126/78", preHr: "72", preSpo2: "98", preRr: "18", preRhythm: "窦性心律", postBp: "128/80", postHr: "86", postSpo2: "98", postRr: "19", postRhythm: "窦性心律", borg: "3", summary: "患者完成个体化训练，耐受良好。", abnormal: "", action: "" });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggleIntervention = (value: string) => setInterventions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  function submit() {
    const treatmentId = `TRT-${Date.now()}`;
    onSave({ treatmentId, patientId, patientNo, treatmentNo: `待确认-${new Date().toISOString().slice(0, 10)}`, treatmentAt: new Date(form.treatmentAt).toISOString(), sessionId: "", prescriptionVersionId: "", diagnosis: "待补录诊断", surgeryHistory: "", specialMedications: "", source: "人工录入", preAssessment: { bloodPressure: form.preBp, heartRate: Number(form.preHr) || null, spo2: Number(form.preSpo2) || null, respiratoryRate: Number(form.preRr) || null, rhythm: form.preRhythm, measuredAt: form.treatmentAt, chestPainRestVas: 0, chestPainActivityVas: null, respiratorySymptoms: "", assistiveDevice: "无" }, interventions: treatmentInterventionOptions.map((item) => ({ ...item, selected: interventions.includes(item.code) })), postAssessment: { bloodPressure: form.postBp, heartRate: Number(form.postHr) || null, spo2: Number(form.postSpo2) || null, respiratoryRate: Number(form.postRr) || null, rhythm: form.postRhythm, measuredAt: form.treatmentAt, borg: Number(form.borg) || null, symptomChange: "" }, treatmentSummary: form.summary, adverseEvent: form.abnormal, fieldAction: form.action, therapist: "康复师", patientAcknowledged: false, status: "draft" });
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold text-blue-600">治疗记录 · {patientNo}</p><h2 className="mt-1 text-lg font-bold">新增心肺康复治疗记录</h2><p className="mt-1 text-xs text-slate-500">先记录结构化生命体征和训练项目，完成后可关联单次报告。</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><section className="rounded-xl border border-slate-100 p-4"><h3 className="text-xs font-bold text-slate-800">训练前评估</h3><div className="mt-3 grid grid-cols-2 gap-3"><SmallInput label="治疗时间" type="datetime-local" value={form.treatmentAt} onChange={(value) => update("treatmentAt", value)} /><SmallInput label="血压" value={form.preBp} onChange={(value) => update("preBp", value)} /><SmallInput label="心率 bpm" value={form.preHr} onChange={(value) => update("preHr", value)} /><SmallInput label="血氧 %" value={form.preSpo2} onChange={(value) => update("preSpo2", value)} /><SmallInput label="呼吸 /分" value={form.preRr} onChange={(value) => update("preRr", value)} /><SmallInput label="心律" value={form.preRhythm} onChange={(value) => update("preRhythm", value)} /></div></section><section className="rounded-xl border border-slate-100 p-4"><h3 className="text-xs font-bold text-slate-800">训练后评估</h3><div className="mt-3 grid grid-cols-2 gap-3"><SmallInput label="血压" value={form.postBp} onChange={(value) => update("postBp", value)} /><SmallInput label="心率 bpm" value={form.postHr} onChange={(value) => update("postHr", value)} /><SmallInput label="血氧 %" value={form.postSpo2} onChange={(value) => update("postSpo2", value)} /><SmallInput label="呼吸 /分" value={form.postRr} onChange={(value) => update("postRr", value)} /><SmallInput label="Borg 评分" value={form.borg} onChange={(value) => update("borg", value)} /><SmallInput label="心律" value={form.postRhythm} onChange={(value) => update("postRhythm", value)} /></div></section></div><section className="mt-4 rounded-xl border border-slate-100 p-4"><h3 className="text-xs font-bold text-slate-800">实施训练项目</h3><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">{treatmentInterventionOptions.map((item) => <label key={item.code} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-700"><input type="checkbox" checked={interventions.includes(item.code)} onChange={() => toggleIntervention(item.code)} />{item.label}</label>)}</div></section><div className="mt-4 grid gap-3 md:grid-cols-3"><SmallInput label="治疗小结" value={form.summary} onChange={(value) => update("summary", value)} /><SmallInput label="异常事件" value={form.abnormal} onChange={(value) => update("abnormal", value)} /><SmallInput label="现场处置" value={form.action} onChange={(value) => update("action", value)} /></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">取消</button><button type="button" onClick={submit} className="btn-primary"><Save className="h-4 w-4" />保存记录</button></div></section></div>;
}

function SmallInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="field-label">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="text-field" /></label>;
}

function ReportsTab({ patientId, clinicalProfile, tasks, onOpenPrescription, onOpenDischargeReport }: { patientId: string; clinicalProfile?: PatientClinicalProfile; tasks: PrescriptionTask[]; onOpenPrescription: (taskId: string) => void; onOpenDischargeReport?: (patientId: string) => void }) {
  const [reportType, setReportType] = useState<"stage" | "single">("stage");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedSingleId, setSelectedSingleId] = useState<string | null>(null);
  const stages = stageReports.filter((item) => item.patientId === patientId);
  const singles = singleTrainingReportDetails.filter((item) => item.patientId === patientId);
  if (selectedStageId) return <StageReportDetail reportId={selectedStageId} clinicalProfile={clinicalProfile} onBack={() => setSelectedStageId(null)} taskId={tasks.find((task) => task.sourceType === "stage_report")?.id} onOpenPrescription={onOpenPrescription} />;
  if (selectedSingleId) {
    const report = singles.find((item) => item.id === selectedSingleId);
    if (report) return <SingleReportDetail report={report} clinicalProfile={clinicalProfile} onBack={() => setSelectedSingleId(null)} />;
  }
  return <section className="space-y-4"><section className="card overflow-hidden"><div className="flex items-center justify-between px-5 pt-5"><SectionHeader title="训练报告" description="单次报告由每次训练自动生成；阶段报告由医生选择若干次训练记录后生成AI草稿。" /><div className="flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setReportType("stage")} className={`rounded-md px-4 py-2 text-[10px] font-bold ${reportType === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段性报告</button><button type="button" onClick={() => setReportType("single")} className={`rounded-md px-4 py-2 text-[10px] font-bold ${reportType === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>单次报告</button></div></div>{reportType === "stage" ? <><ReportHeader labels={["报告周期", "汇总训练记录", "完成情况", "靶区达标", "状态", "操作"]} />{stages.map((row) => <button type="button" key={row.id} onClick={() => setSelectedStageId(row.id)} className="grid w-full grid-cols-6 items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50"><span>{row.period}</span><b>{row.versions.replace("V1–V4", "最近4次")}</b><span>{row.completion}</span><b className="text-blue-700">{row.target}</b><StatusBadge tone="green">{row.status}</StatusBadge><span className="font-bold text-blue-700">查看阶段报告<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span></button>)}{!stages.length && <EmptyState text="该患者暂无阶段性报告" />}</> : <><ReportHeader labels={["训练时间", "运动项目", "运动类型", "总时长", "状态", "操作"]} />{singles.map((row) => <button type="button" key={row.id} onClick={() => setSelectedSingleId(row.id)} className="grid w-full grid-cols-6 items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50"><span>{row.dateTime}</span><b>{row.exercise}</b><span>{row.trainingType}</span><span>{row.totalMinutes}分钟</span><StatusBadge tone="green">{row.status}</StatusBadge><span className="font-bold text-blue-700">查看单次报告<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span></button>)}{!singles.length && <EmptyState text="该患者暂无单次报告" />}</>}</section><section className="card flex items-center justify-between border border-emerald-100 bg-emerald-50/60 p-4"><div><p className="text-xs font-bold text-emerald-700">康复出院报告</p><p className="mt-1 text-xs text-slate-600">医生生成并发布出院报告后，系统自动记录出院日期并触发随访提醒。</p></div>{onOpenDischargeReport && <button type="button" onClick={() => onOpenDischargeReport(patientId)} className="btn-primary">进入康复报告<ArrowRight className="h-4 w-4" /></button>}</section></section>;
}

function StageReportDetail({ reportId, clinicalProfile, taskId, onBack, onOpenPrescription }: { reportId: string; clinicalProfile?: PatientClinicalProfile; taskId?: string; onBack: () => void; onOpenPrescription: (taskId: string) => void }) {
  const selectedSessions = stageReportData.sessions.slice(-4);
  const completed = selectedSessions.filter((item) => item.completed).length;
  const planned = selectedSessions.length;
  const targetMinutes = selectedSessions.reduce((sum, item) => sum + item.targetZoneMinutes, 0);
  const activeMinutes = selectedSessions.reduce((sum, item) => sum + item.activeMinutes, 0);
  const targetRate = Math.round((targetMinutes / activeMinutes) * 100);
  return <div className="space-y-4">
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 px-5 py-4 text-white">
        <div className="flex items-start gap-3"><button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-bold text-blue-200">阶段性报告 · {reportId} · Demo 汇总数据</p><h2 className="mt-1 text-lg font-bold">陈女士 · 运动康复阶段评估</h2><p className="mt-1 text-[10px] text-slate-300">{stageReportData.reportPeriod.start} 至 {stageReportData.reportPeriod.end} · 患者号 {patientMasterChen.patientNo}</p></div></div>
        <div className="text-right"><StatusBadge tone="orange">中危 · 状态稳定</StatusBadge><p className="mt-2 text-[10px] text-slate-300">王医生已复核</p></div>
      </div>
      <div className="grid grid-cols-[1.4fr_repeat(4,0.65fr)] gap-3 p-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="flex items-center gap-2 text-xs font-bold text-blue-900"><Stethoscope className="h-4 w-4" />阶段结论</p><p className="mt-2 text-xs font-semibold leading-6 text-slate-700">{stageReportData.clinicalConclusion.summary}</p></div>
        <Metric label="计划完成" value={`${completed}/${planned}`} note={`${Math.round(completed / planned * 100)}%`} /><Metric label="靶区达标" value={`${targetRate}%`} note="按实际运动时间" /><Metric label="安全事件" value={`${stageReportData.safetyEvents.length}`} note="均已处置复核" tone="orange" /><Metric label="耐量变化" value="+18%" note="相近HR/RPE下" tone="green" />
      </div>
    </section>
    <section className="card p-5"><SectionHeader title="基线能力与阶段末能力" description="只有存在两个有效评估时间点时，才生成提升/下降结论。" />{clinicalProfile ? <div className="grid gap-3 md:grid-cols-3"><Metric label="当前静息心率" value={clinicalMetricLabel(clinicalProfile.rehabAssessment.restingVitals.metric)} note="缺少阶段末对照" /><Metric label="当前 SPPB" value={`${clinicalProfile.rehabAssessment.sppb.balanceScore + clinicalProfile.rehabAssessment.sppb.gaitScore + clinicalProfile.rehabAssessment.sppb.chairStandScore}/12`} note="缺少阶段末对照" /><Metric label="当前 6 分钟步行" value={clinicalProfile.rehabAssessment.sixMinuteWalk.distanceMeters == null ? "未采集" : `${clinicalProfile.rehabAssessment.sixMinuteWalk.distanceMeters} m`} note="缺少阶段末对照" /></div> : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">暂无有效评估数据，不能生成趋势结论。</p>}<p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px] text-amber-800">当前 Demo 仅提供一个有效评估时间点，因此不判定能力提升或下降；需补录阶段末评估后再比较静息心率、AT/峰值心率、SPPB、6 分钟步行、体重/BMI、RPE 与相同工作量下的平均心率。</p></section>
    <div className="grid grid-cols-[1.18fr_0.82fr] gap-4">
      <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="所选训练记录对比" description="本示例选择最近4次训练，重点比较训练前后心率、平均心率、血氧、RPE和完成情况。" /></div><div className="grid grid-cols-[0.7fr_0.72fr_0.72fr_0.72fr_0.72fr_0.9fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>次序</span><span>日期</span><span>平均/峰值心率</span><span>训练前后血压</span><span>最低血氧</span><span>RPE/主诉</span></div>{stageReportData.sessions.slice(-4).map((item, index) => <div key={item.id} className="grid grid-cols-[0.7fr_0.72fr_0.72fr_0.72fr_0.72fr_0.9fr] items-center border-t border-slate-100 px-5 py-3 text-xs"><b>第{index + 1}次</b><span>{item.date}</span><span>{item.avgHr}/{item.peakHr} bpm</span><span>{item.preBp ?? "未采集"} → {item.postBp ?? "未采集"}</span><span>{item.minSpo2}%</span><span>RPE {item.rpe} · {item.symptom}</span></div>)}</section>
      <section className="card p-5"><SectionHeader title="安全事件与复核" action={<ShieldAlert className="h-4 w-4 text-amber-600" />} /><div className="space-y-3">{stageReportData.safetyEvents.map((event) => <div key={event.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs"><div className="flex items-center justify-between"><b className="text-amber-900">{event.type}</b><StatusBadge tone="orange">{event.severity}</StatusBadge></div><p className="mt-2 text-amber-800">{event.occurredAt} · {event.value}</p><p className="mt-1 leading-5 text-slate-600">{event.action}；{event.review}</p></div>)}</div></section>
    </div>
    <section className="card flex items-center justify-between p-4"><div><b className="text-slate-900">AI阶段摘要（待医生确认）</b><p className="mt-1 text-xs text-slate-500">{stageReportData.clinicalConclusion.summary} 正式处方调整仍回到HIS完成，本系统不提供开方入口。</p></div><StatusBadge tone="orange">待医生确认</StatusBadge></section>
  </div>;
}

function SingleReportDetail({ report, clinicalProfile, onBack }: { report: typeof singleTrainingReportDetails[number]; clinicalProfile?: PatientClinicalProfile; onBack: () => void }) {
  const assessment = clinicalProfile?.rehabAssessment;
  return <section className="card p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" />返回报告列表</button><div><p className="text-[10px] font-bold text-blue-600">单次报告号 · {report.singleReportNo}</p><h2 className="mt-1 text-lg font-bold">{report.exercise} · {formatDateTime(report.actualStartAt)}</h2><p className="mt-1 font-mono text-[10px] text-slate-400">训练记录号 {report.trainingRecordNo}</p></div></div><StatusBadge tone="orange">{report.dataMode === "demo" ? "Demo 数据" : "设备采样"}</StatusBadge></div><div className="mt-5 grid grid-cols-6 gap-3"><Metric label="总时长" value={`${report.totalMinutes}分`} /><Metric label="实际运动" value={`${report.activeMinutes}分`} /><Metric label="靶区时间" value={`${report.targetZoneMinutes}分`} /><Metric label="实际平均心率" value={`${report.hrStats.average}`} note="bpm · 设备" /><Metric label="实际峰值心率" value={`${report.hrStats.peak}`} note="bpm · 设备" /><Metric label="安全摘要" value={report.safetySummary} /></div>{clinicalProfile && <><div className="mt-4 grid grid-cols-4 gap-3"><Metric label="康复阶段" value={clinicalProfile.rehabStage} /><Metric label="运动风险等级" value={clinicalProfile.riskLevel} /><Metric label="CPET 状态" value={cpetStatusLabel(clinicalProfile.cpetStatus)} /><Metric label="静息心率（基线）" value={clinicalMetricLabel(assessment?.restingVitals.metric)} note="评估来源" /></div><div className="mt-4 grid grid-cols-3 gap-3"><DetailText label="无氧阈心率（CPET）" value={clinicalMetricLabel(assessment?.cpet.anaerobicThresholdHr)} /><DetailText label="峰值心率（CPET）" value={clinicalMetricLabel(assessment?.cpet.peakHr)} /><DetailText label="本次训练前 / 后心率" value={`${report.hrStats.resting} bpm → 训练后测量见治疗记录`} /></div></>}<p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">{report.dataSourceNote}</p><div className="mt-4 overflow-hidden rounded-xl border border-slate-100"><div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-slate-50 px-4 py-2.5 text-[10px] font-bold text-slate-400"><span>分期指标</span><span>热身期</span><span>训练期</span><span>放松期</span></div>{report.phaseVitals.map((row) => <div key={row.metric} className="grid grid-cols-[1fr_1fr_1fr_1fr] border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><b>{row.metric}</b><span>{row.warmup}</span><span>{row.training}</span><span>{row.cooldown}</span></div>)}</div></section>;
}

function PatientEditModal({ patient, setPatient, mode, formError, similarWarning, onAcceptSimilar, onClose, onSave }: { patient: ManagedPatient; setPatient: (patient: ManagedPatient) => void; mode: "create" | "edit"; formError: string; similarWarning: string; onAcceptSimilar: () => void; onClose: () => void; onSave: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const age = calculateAge(patient.birth_date);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6">
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><div className="flex items-center gap-2"><p className="text-[10px] font-bold text-blue-600">患者档案</p><StatusBadge tone="orange">测试环境</StatusBadge></div><h2 className="mt-1 text-lg font-bold">{mode === "create" ? "新增患者" : "编辑患者档案"}</h2><p className="mt-1 text-[10px] text-slate-500">基础必填信息优先；更多临床与康复资料可按需展开补充。</p></div><button type="button" title="关闭" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      <div className="overflow-y-auto px-5 py-5 sm:px-6">
        <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div className="mb-3 flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-blue-600" /><b className="text-xs text-blue-900">系统属性</b><span className="text-[10px] text-blue-600">自动生成，不可填写</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReadOnlyField label="康复档案编码" value={patient.patient_code || "保存后生成"} copyable={Boolean(patient.patient_code)} /><ReadOnlyField label="患者号" value={patient.hospital_patient_no || "保存后生成"} /><ReadOnlyField label="档案来源" value={patient.record_source} /><ReadOnlyField label="数据状态" value={patient.workflow_status === "confirmed" ? "已确认" : patient.workflow_status === "incomplete" ? "待补全" : "已保存"} /></div></section>

        <section className="mt-5"><SectionHeader title="基础建档信息" description="标记 * 的字段为必填；患者电话与紧急联系人电话至少填写一项。" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EditField label="患者号" value={patient.hospital_patient_no} placeholder={mode === "create" ? "保存后自动生成" : "例如 000123"} onChange={(value) => setPatient({ ...patient, hospital_patient_no: value })} />
          <EditField required label="患者姓名" value={patient.name} placeholder="请输入真实姓名" onChange={(value) => setPatient({ ...patient, name: value })} />
          <label><span className="field-label">性别 <b className="text-red-500">*</b></span><select required value={patient.gender} onChange={(event) => setPatient({ ...patient, gender: event.target.value })} className="text-field"><option value="" disabled>请选择</option><option>男</option><option>女</option><option>未知</option></select></label>
          <label><span className="field-label">出生日期 <b className="text-red-500">*</b></span><input required type="date" max={new Date().toISOString().slice(0, 10)} value={patient.birth_date} onChange={(event) => setPatient({ ...patient, birth_date: event.target.value, age: calculateAge(event.target.value) })} className="text-field" /></label>
          <ReadOnlyField label="年龄" value={patient.birth_date ? `${age} 岁` : "选择出生日期后计算"} />
          <label><span className="field-label">证件类型</span><select value={patient.id_type} onChange={(event) => setPatient({ ...patient, id_type: event.target.value as ManagedPatient["id_type"] })} className="text-field"><option>身份证</option><option>护照</option><option>其他</option></select></label>
          <EditField label="证件号码" value={patient.id_number} placeholder="选填，保存后修改需确认" onChange={(value) => setPatient({ ...patient, id_number: value })} />
          <EditField label="患者联系电话" value={patient.phone} inputMode="numeric" placeholder="11 位手机号码" onChange={(value) => setPatient({ ...patient, phone: value })} />
          <ReadOnlyField label="主管医生" value={patient.assigned_doctor} />
          <label><span className="field-label">康复阶段 <b className="text-red-500">*</b></span><select value={patient.rehab_stage} onChange={(event) => setPatient({ ...patient, rehab_stage: event.target.value })} className="text-field"><option>待评估</option><option>首次评估</option><option>康复执行</option><option>随访</option><option>已结案</option></select></label>
          <label className="sm:col-span-2"><span className="field-label">建档备注</span><input value={patient.record_note} onChange={(event) => setPatient({ ...patient, record_note: event.target.value })} className="text-field" placeholder="选填，仅记录必要的建档说明" /></label>
        </div></section>

        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-5 flex w-full items-center justify-between border-y border-slate-100 py-4 text-left"><span><b className="text-xs text-slate-800">补充临床与康复信息</b><span className="ml-2 text-[10px] text-slate-400">选填，可在患者详情中继续完善</span></span><ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>

        {expanded && <div className="space-y-5 pt-5">
          <section><SectionHeader title="联系人与接诊信息" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><EditField label="紧急联系人" value={patient.emergency_contact} onChange={(value) => setPatient({ ...patient, emergency_contact: value })} /><EditField label="与患者关系" value={patient.emergency_relation} onChange={(value) => setPatient({ ...patient, emergency_relation: value })} /><EditField label="紧急联系人电话" value={patient.emergency_phone} inputMode="numeric" placeholder="患者无手机时必填" onChange={(value) => setPatient({ ...patient, emergency_phone: value })} /><EditField label="转诊来源" value={patient.referral_source} onChange={(value) => setPatient({ ...patient, referral_source: value })} /><EditField label="出院日期" type="date" value={patient.discharge_date} onChange={(value) => setPatient({ ...patient, discharge_date: value })} /><EditField label="计划开始康复日期" type="date" value={patient.planned_rehab_date} onChange={(value) => setPatient({ ...patient, planned_rehab_date: value })} /><EditField label="身高（cm）" type="number" value={patient.height_cm} onChange={(value) => setPatient({ ...patient, height_cm: value })} /><EditField label="体重（kg）" type="number" value={patient.weight_kg} onChange={(value) => setPatient({ ...patient, weight_kg: value })} /></div></section>
          <section><SectionHeader title="临床与康复信息" description="CPET、6MWT 等评估数据不在快速建档中录入。" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label><span className="field-label">危险分层</span><select value={patient.risk_level} onChange={(event) => setPatient({ ...patient, risk_level: event.target.value })} className="text-field"><option>待评估</option><option>低危</option><option>中危</option><option>高危</option></select></label><label><span className="field-label">康复分组</span><select value={patient.rehab_group} onChange={(event) => setPatient({ ...patient, rehab_group: event.target.value })} className="text-field"><option>待分组</option><option>运动康复 A 组</option><option>运动康复 B 组</option><option>重点监护组</option></select></label><EditField label="主要诊断" value={patient.diagnosis_summary} onChange={(value) => setPatient({ ...patient, diagnosis_summary: value })} /><EditField label="既往病史" value={patient.medical_history} onChange={(value) => setPatient({ ...patient, medical_history: value })} /><EditField label="手术 / 介入治疗史" value={patient.procedure_history} onChange={(value) => setPatient({ ...patient, procedure_history: value })} /><EditField label="当前用药" value={patient.current_medications} onChange={(value) => setPatient({ ...patient, current_medications: value })} /><EditField label="药物过敏史" value={patient.drug_allergies} onChange={(value) => setPatient({ ...patient, drug_allergies: value })} /><label className="sm:col-span-2"><span className="field-label">运动禁忌或注意事项</span><textarea value={patient.exercise_precautions} onChange={(event) => setPatient({ ...patient, exercise_precautions: event.target.value })} className="text-field min-h-20 py-2" /></label></div></section>
        </div>}

        {formError && <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</div>}
        {similarWarning && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start gap-2 text-xs font-semibold text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{similarWarning}</div><button type="button" onClick={onAcceptSimilar} className="mt-3 text-xs font-bold text-amber-800 underline">确认不是同一人，继续建档</button></div>}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6"><p className="hidden text-[10px] text-slate-400 sm:block">保存后不会自动生成运动处方</p><div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="btn-secondary">取消</button><button type="submit" className="btn-primary"><Save className="h-4 w-4" />{mode === "create" ? "创建档案" : "保存修改"}</button></div></div>
    </form>
  </div>;
}

function EditField({ label, value, onChange, required = false, placeholder, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; type?: string; inputMode?: "numeric" | "text" }) {
  return <label><span className="field-label">{label} {required && <b className="text-red-500">*</b>}</span><input required={required} type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="text-field" /></label>;
}

function ReadOnlyField({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return <div><span className="field-label">{label}</span><div className="flex min-h-[42px] items-center justify-between gap-2 rounded-[10px] border border-slate-200 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-slate-700"><span className="min-w-0 break-all">{value}</span>{copyable && <button type="button" title={`复制${label}`} onClick={() => navigator.clipboard?.writeText(value)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Copy className="h-3.5 w-3.5" /></button>}</div></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-xs font-bold leading-5 text-slate-800">{value}</p></div>;
}

function NarrativeItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><b className="text-[10px] text-slate-400">{label}</b><p className="mt-1 text-slate-600">{value}</p></div>;
}

function Metric({ label, value, note, tone = "blue" }: { label: string; value: string; note?: string; tone?: "blue" | "orange" | "green" }) {
  const colors = tone === "orange" ? "bg-amber-50 text-amber-800" : tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-900";
  return <div className={`rounded-xl p-4 ${colors}`}><p className="text-[10px] font-bold opacity-60">{label}</p><p className="mt-2 text-xl font-bold">{value}</p>{note && <p className="mt-1 text-[9px] opacity-60">{note}</p>}</div>;
}

function ReportHeader({ labels }: { labels: string[] }) {
  return <div className="grid grid-cols-6 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">{labels.map((label) => <span key={label}>{label}</span>)}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center py-12 text-xs text-slate-400"><FileText className="mb-2 h-6 w-6" />{text}</div>;
}
