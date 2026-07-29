import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Bluetooth,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleStop,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  FileText,
  Gauge,
  HeartPulse,
  House,
  IdCard,
  LockKeyhole,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SmilePlus,
  Stethoscope,
  Tablet,
  ThermometerSun,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  Volume2,
  Waves,
  Wifi,
  X
} from "lucide-react";
import type { TrainingState } from "../types";
import type { PublishedTrainingVideo } from "../pages/VideoLibraryPage";
import {
  announceHeartRateAlert,
  announcePhase,
  announceRecovery,
  phaseAnnouncements,
  stopAudioGuidance
} from "../utils/audioGuidance";
import { stageReportData, summarizeVersion } from "./stageReportData";
import type { PrescriptionVersion, VersionSummary } from "./stageReportData";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, getSingleTrainingReportDetail, singleTrainingReportDetails } from "../clinicalSharedData";

type PatientAppProps = {
  onExit: () => void;
  trainingState: TrainingState;
  setTrainingState: (state: TrainingState) => void;
  anomaly: boolean;
  setAnomaly: (value: boolean) => void;
  publishedTrainingVideos: PublishedTrainingVideo[];
};

type View =
  | "login"
  | "record"
  | "home"
  | "calendar"
  | "report"
  | "profile"
  | "prescription"
  | "devices"
  | "psych"
  | "bp"
  | "training"
  | "videoTraining"
  | "result";

type Exercise =
  | "diaphragmatic"
  | "mindfulness"
  | "bike"
  | "elliptical"
  | "dumbbell"
  | "resistanceBand"
  | "flexibilityUpper"
  | "flexibilityLower"
  | "flexibilityFull"
  | "baduanjin"
  | "taichi";
type TrainingType = "continuous" | "interval";
type BpMode = "twice" | "multiple" | "none";
type Phase = "warmup" | "training" | "cooldown";

const exerciseVideoSubtypes: Partial<Record<Exercise, string>> = {
  diaphragmatic: "腹式呼吸",
  mindfulness: "正念呼吸",
  elliptical: "椭圆机",
  dumbbell: "哑铃",
  resistanceBand: "弹力带",
  flexibilityUpper: "上肢拉伸",
  flexibilityLower: "下肢拉伸",
  flexibilityFull: "全身柔韧",
  baduanjin: "八段锦",
  taichi: "太极拳"
};

const patient = {
  name: "陈女士",
  code: "P-DEMO-001",
  sex: "女",
  age: 59,
  group: "运动康复 A 组",
  stage: "Ⅱ期院外康复",
  risk: "中危",
  sessions: 36,
  completed: 11
};

const flow = [
  ["prescription", "确认处方"],
  ["devices", "连接设备"],
  ["psych", "心理准备"],
  ["bp", "血压模式"],
  ["training", "开始训练"]
] as const;

export function PatientApp({
  onExit,
  trainingState,
  setTrainingState,
  anomaly,
  setAnomaly,
  publishedTrainingVideos
}: PatientAppProps) {
  const [view, setView] = useState<View>("login");
  const [exercise, setExercise] = useState<Exercise>("bike");
  const [trainingType, setTrainingType] = useState<TrainingType>("continuous");
  const [targetHr, setTargetHr] = useState(108);
  const [warmup, setWarmup] = useState(5);
  const [mainMinutes, setMainMinutes] = useState(20);
  const [cooldown, setCooldown] = useState(5);
  const [repeats, setRepeats] = useState(1);
  const [backpack, setBackpack] = useState(false);
  const [bikeConnected, setBikeConnected] = useState(false);
  const [psychAnswers, setPsychAnswers] = useState<Record<string, string>>({});
  const [bpMode, setBpMode] = useState<BpMode | null>(null);
  const [phase, setPhase] = useState<Phase>("warmup");
  const [elapsed, setElapsed] = useState(0);
  const [rpe, setRpe] = useState(11);
  const [paused, setPaused] = useState(false);
  const [measuredBp, setMeasuredBp] = useState("126 / 78");
  const [reportToOpen, setReportToOpen] = useState<string | null>(null);
  const selectedTrainingVideo = publishedTrainingVideos.find((video) => video.subtype === exerciseVideoSubtypes[exercise]) ?? null;

  const totalMinutes = warmup + mainMinutes * repeats + cooldown;
  useEffect(() => {
    if (view !== "training" || paused || trainingState !== "running") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [view, paused, trainingState]);

  useEffect(() => () => stopAudioGuidance(), []);

  function startTraining() {
    setPhase("warmup");
    setElapsed(0);
    setPaused(false);
    setTrainingState("running");
    setView("training");
    announcePhase("warmup");
  }

  function changePhase(nextPhase: Phase) {
    setPhase(nextPhase);
    announcePhase(nextPhase);
  }

  function changeAnomaly(nextAnomaly: boolean) {
    setAnomaly(nextAnomaly);
    if (nextAnomaly) {
      announceHeartRateAlert();
    } else {
      announceRecovery();
    }
  }

  function finishTraining() {
    stopAudioGuidance();
    setTrainingState("completed");
    setView("result");
  }

  function resetSession() {
    setExercise("bike");
    setBackpack(false);
    setBikeConnected(false);
    setPsychAnswers({});
    setBpMode(null);
    setPhase("warmup");
    setElapsed(0);
    setPaused(false);
    setAnomaly(false);
    setTrainingState("ready");
    setReportToOpen(null);
    setView("home");
  }

  if (view === "login") {
    return <LoginScreen onExit={onExit} onLogin={() => setView("home")} onCreate={() => setView("record")} />;
  }

  if (view === "record") {
    return <RecordScreen onBack={() => setView("login")} onSaved={() => setView("home")} />;
  }

  const mainView = view === "home" || view === "calendar" || view === "report" || view === "profile";

  return (
    <main className="ipad-stage min-h-screen" data-testid="page-VIEW-PATIENT-APP">
      <div className="patient-safe-area mx-auto flex min-h-screen max-w-[1440px] gap-3">
        <PatientSidebar
          active={view}
          onNavigate={(nextView) => {
            if (nextView === "report") setReportToOpen(null);
            setView(nextView);
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <PatientHeader view={view} onExit={onExit} />
          {flow.some(([key]) => key === view) && <FlowBar view={view} />}

          <div className="min-h-0 flex-1 py-3">
          {view === "home" && (
            <HomeScreen
              exercise={exercise}
              onChoose={setExercise}
              onStart={() => setView(exercise === "bike" ? "prescription" : "videoTraining")}
              publishedTrainingVideos={publishedTrainingVideos}
            />
          )}
          {view === "calendar" && <CalendarScreen onBack={() => setView("home")} />}
          {view === "report" && <ReportScreen onStart={() => setView("prescription")} initialSingleReportId={reportToOpen} />}
          {view === "profile" && <ProfileScreen onBack={() => setView("home")} />}
          {view === "prescription" && (
            <PrescriptionScreen
              exercise={exercise}
              trainingType={trainingType}
              setTrainingType={setTrainingType}
              targetHr={targetHr}
              setTargetHr={setTargetHr}
              warmup={warmup}
              setWarmup={setWarmup}
              mainMinutes={mainMinutes}
              setMainMinutes={setMainMinutes}
              cooldown={cooldown}
              setCooldown={setCooldown}
              repeats={repeats}
              setRepeats={setRepeats}
              totalMinutes={totalMinutes}
              onBack={() => setView("home")}
              onContinue={() => setView("devices")}
            />
          )}
          {view === "devices" && (
            <DeviceScreen
              backpack={backpack}
              bike={bikeConnected}
              onBackpack={() => setBackpack(true)}
              onBike={() => setBikeConnected(true)}
              onReset={() => {
                setBackpack(false);
                setBikeConnected(false);
              }}
              onBack={() => setView("prescription")}
              onContinue={() => setView("psych")}
            />
          )}
          {view === "psych" && (
            <PsychScreen
              answers={psychAnswers}
              setAnswer={(key, value) => setPsychAnswers((current) => ({ ...current, [key]: value }))}
              onBack={() => setView("devices")}
              onContinue={() => setView("bp")}
            />
          )}
          {view === "bp" && (
            <BpModeScreen
              mode={bpMode}
              setMode={setBpMode}
              onBack={() => setView("psych")}
              onStart={startTraining}
            />
          )}
          {view === "training" && (
            <TrainingScreen
              phase={phase}
              setPhase={changePhase}
              elapsed={elapsed}
              paused={paused}
              setPaused={(value) => {
                setPaused(value);
                setTrainingState(value ? "paused" : "running");
              }}
              bpMode={bpMode ?? "twice"}
              measuredBp={measuredBp}
              onMeasureBp={() => setMeasuredBp(measuredBp === "126 / 78" ? "122 / 76" : "126 / 78")}
              targetHr={targetHr}
              warmup={warmup}
              mainMinutes={mainMinutes}
              cooldown={cooldown}
              repeats={repeats}
              setElapsed={setElapsed}
              rpe={rpe}
              setRpe={setRpe}
              anomaly={anomaly}
              setAnomaly={changeAnomaly}
              onFinish={finishTraining}
            />
          )}
          {view === "videoTraining" && selectedTrainingVideo && <VideoTrainingScreen video={selectedTrainingVideo} onBack={() => setView("home")} onFinish={() => setView("home")} />}
          {view === "result" && (
            <ResultScreen
              totalMinutes={totalMinutes}
              targetHr={targetHr}
              rpe={rpe}
              bp={measuredBp}
              onDone={resetSession}
              onViewReport={() => {
                setReportToOpen("TR-20260725-012");
                setView("report");
              }}
            />
          )}
          </div>

          <div className="rounded-xl border border-medical-100 bg-white/80 px-4 py-2 text-center text-[11px] font-medium text-slate-500">
            调研演示数据 · 设备连接与生理指标为模拟状态 · 不用于真实医疗决策
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginScreen({ onExit, onLogin, onCreate }: { onExit: () => void; onLogin: () => void; onCreate: () => void }) {
  const [idNumber, setIdNumber] = useState("11010119650101****");
  return (
    <main className="ipad-stage flex min-h-screen items-center justify-center p-6" data-testid="page-VIEW-PATIENT-LOGIN">
      <section className="grid w-full max-w-[1180px] overflow-hidden rounded-[32px] border border-white bg-white shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[650px] overflow-hidden bg-gradient-to-br from-[#123d54] via-[#17636e] to-[#23928a] p-12 text-white">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[48px] border-white/5" />
          <div className="relative">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <HeartPulse className="h-8 w-8" />
            </span>
            <p className="mt-7 text-sm font-bold tracking-[0.22em] text-teal-100">CARDIAC REHABILITATION</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">心康伴侣<br />患者训练端</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-teal-50/80">围绕处方、设备、心理准备和训练监测，陪您安全完成每一次运动康复。</p>
          </div>
          <div className="absolute bottom-12 left-12 right-12 grid grid-cols-3 gap-3">
            {[["36", "计划训练"], ["11", "已完成"], ["专业", "医护陪同"]].map(([value, label]) => (
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10" key={label}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-teal-100/75">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-[650px] flex-col justify-center p-12">
          <p className="text-sm font-bold text-medical-700">患者身份验证</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">欢迎回来</h2>
          <p className="mt-2 text-sm text-slate-500">请输入身份证号进入个人训练界面。</p>
          <label className="mt-8 text-sm font-bold text-slate-700" htmlFor="patient-id">身份证号</label>
          <div className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-medical-400 focus-within:ring-4 focus-within:ring-medical-50">
            <IdCard className="h-5 w-5 text-slate-400" />
            <input id="patient-id" value={idNumber} onChange={(event) => setIdNumber(event.target.value)} className="h-14 flex-1 bg-transparent px-3 text-base font-semibold text-slate-800 outline-none" />
            <LockKeyhole className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-xs text-slate-400">当前为脱敏演示账号，不包含真实患者信息。</p>
          <button type="button" onClick={onLogin} disabled={idNumber.length < 6} className="patient-touch mt-7 flex items-center justify-center gap-2 rounded-2xl bg-medical-600 px-5 font-bold text-white shadow-lg shadow-medical-100 hover:bg-medical-700 disabled:bg-slate-300">
            登录患者端 <ArrowRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={onCreate} className="patient-touch mt-3 flex items-center justify-center gap-2 rounded-2xl border border-medical-200 bg-medical-50 px-5 font-bold text-medical-800 hover:bg-medical-100">
            <UserRoundPlus className="h-5 w-5" /> 首次使用，创建康复档案
          </button>
          <button type="button" onClick={onExit} className="mt-7 text-sm font-semibold text-slate-500 hover:text-slate-800">返回系统入口</button>
        </div>
      </section>
    </main>
  );
}

function RecordScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const fields = [
    ["姓名", "陈女士"],
    ["性别", "女"],
    ["出生日期 / 年龄", "1966-03-18 / 59 岁"],
    ["身高 / 体重", "162 cm / 63 kg"],
    ["康复分组", "运动康复 A 组"],
    ["康复阶段 / 风险", "Ⅱ期院外康复 / 中危"],
    ["静息心率", "72 bpm"],
    ["计划训练次数", "36 次"]
  ];
  return (
    <main className="ipad-stage min-h-screen p-5" data-testid="page-VIEW-PATIENT-RECORD">
      <section className="mx-auto max-w-[1180px] rounded-[28px] border border-white bg-white p-7 shadow-float">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <p className="text-sm font-bold text-medical-700">首次登录 · 步骤 1 / 1</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">建立个人康复档案</h1>
            <p className="mt-1 text-sm text-slate-500">基础信息由患者确认，临床分组与处方由医护审核。</p>
          </div>
          <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">演示预填数据</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {fields.map(([label, value]) => (
            <label key={label} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-bold text-slate-500">{label}</span>
              <input defaultValue={value} className="mt-2 w-full bg-transparent text-base font-bold text-slate-800 outline-none" />
            </label>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-medical-100 bg-medical-50 p-5">
          <div className="flex items-center gap-2 font-bold text-medical-900"><ClipboardCheck className="h-5 w-5" /> 上一次医生处方 · 结构化提取</div>
          <div className="mt-4 grid grid-cols-5 gap-3 text-sm">
            {[["训练方式", "功率车"], ["目标心率", "108 bpm"], ["阶段时长", "5 + 20 + 5 分"], ["训练频次", "每周 3 次"], ["总计划", "36 次"]].map(([label, value]) => (
              <div className="rounded-xl bg-white p-3" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回登录</button>
          <button type="button" onClick={onSaved} className="btn-primary patient-touch px-8"><Check className="h-5 w-5" /> 保存并进入首页</button>
        </div>
      </section>
    </main>
  );
}

function PatientSidebar({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  const activeKey = active === "calendar" ? "calendar" : active === "report" ? "report" : active === "profile" ? "profile" : "home";
  const items = [
    { key: "home" as const, label: "训练", icon: Bike },
    { key: "calendar" as const, label: "日历", icon: CalendarDays },
    { key: "report" as const, label: "报告", icon: FileText },
    { key: "profile" as const, label: "个人", icon: UserRound }
  ];
  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center rounded-[24px] border border-white/90 bg-white/90 py-4 shadow-card backdrop-blur" aria-label="患者端主导航">
      <button type="button" onClick={() => onNavigate("home")} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-medical-700 to-medical-500 text-white shadow-lg shadow-medical-100" aria-label="心康伴侣首页">
        <HeartPulse className="h-6 w-6" />
      </button>
      <nav className="mt-8 flex w-full flex-1 flex-col items-center gap-3">
        {items.map(({ key, label, icon: Icon }) => {
          const selected = activeKey === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onNavigate(key)}
              className={`relative flex h-[66px] w-[62px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold ${
                selected ? "bg-medical-50 text-medical-800" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              }`}
              aria-current={selected ? "page" : undefined}
            >
              {selected && <span className="absolute -left-[7px] h-8 w-1 rounded-r-full bg-medical-600" />}
              <Icon className={`h-5 w-5 ${selected ? "text-medical-600" : ""}`} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-700">陈</div>
      <p className="mt-1 text-[9px] font-bold text-slate-400">患者端</p>
    </aside>
  );
}

function PatientHeader({ view, onExit }: { view: View; onExit: () => void }) {
  const title = view === "home" ? "今日康复" : view === "calendar" ? "打卡日历" : view === "report" ? "训练报告" : view === "profile" ? "个人档案" : view === "videoTraining" ? "视频跟练" : "功率车训练";
  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-5 shadow-card backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-700 text-white"><HeartPulse className="h-6 w-6" /></span>
        <div><p className="text-lg font-bold text-slate-950">心康伴侣</p><p className="text-xs text-slate-500">患者训练端 · {title}</p></div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-medical-50 px-3 py-1.5 text-xs font-bold text-medical-700">{patient.name} · {patient.code}</span>
        <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Wifi className="h-4 w-4 text-medical-600" /> 院内网络</span>
        <button type="button" onClick={onExit} className="patient-touch flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" /> 退出</button>
      </div>
    </header>
  );
}

function FlowBar({ view }: { view: View }) {
  const current = flow.findIndex(([key]) => key === view);
  return (
    <nav className="mt-3 flex h-[48px] shrink-0 items-center rounded-2xl border border-white/80 bg-white/80 px-5" aria-label="功率车训练流程">
      {flow.map(([key, label], index) => (
        <div className="flex flex-1 items-center" key={key}>
          <div className={`flex items-center gap-2 whitespace-nowrap ${index <= current ? "text-medical-800" : "text-slate-400"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index < current ? "bg-medical-600 text-white" : index === current ? "bg-medical-100 ring-2 ring-medical-300" : "bg-slate-100"}`}>{index < current ? <Check className="h-4 w-4" /> : index + 1}</span>
            <span className="text-xs font-bold">{label}</span>
          </div>
          {index < flow.length - 1 && <span className={`mx-3 h-px flex-1 ${index < current ? "bg-medical-400" : "bg-slate-200"}`} />}
        </div>
      ))}
    </nav>
  );
}

function HomeScreen({ exercise, onChoose, onStart, publishedTrainingVideos }: { exercise: Exercise; onChoose: (value: Exercise) => void; onStart: () => void; publishedTrainingVideos: PublishedTrainingVideo[] }) {
  const exerciseNames: Record<Exercise, string> = {
    diaphragmatic: "腹式呼吸",
    mindfulness: "正念呼吸",
    bike: "功率车",
    elliptical: "椭圆机",
    dumbbell: "哑铃",
    resistanceBand: "弹力带",
    flexibilityUpper: "上肢拉伸",
    flexibilityLower: "下肢拉伸",
    flexibilityFull: "全身柔韧",
    baduanjin: "八段锦",
    taichi: "太极拳"
  };
  const categories: { title: string; icon: typeof Activity; items: Exercise[] }[] = [
    { title: "呼吸训练", icon: HeartPulse, items: ["diaphragmatic", "mindfulness"] },
    { title: "有氧运动", icon: Bike, items: ["bike", "elliptical"] },
    { title: "抗阻运动", icon: Dumbbell, items: ["dumbbell", "resistanceBand"] },
    { title: "柔韧性运动", icon: Activity, items: ["flexibilityUpper", "flexibilityLower", "flexibilityFull"] },
    { title: "中医运动", icon: Waves, items: ["baduanjin", "taichi"] }
  ];
  const videoForExercise = (item: Exercise) => publishedTrainingVideos.find((video) => video.subtype === exerciseVideoSubtypes[item]);
  const selectedVideo = videoForExercise(exercise);
  const canStart = exercise === "bike" || Boolean(selectedVideo);
  return (
    <section className="flex h-full min-h-[570px] flex-col gap-4" data-testid="page-VIEW-PATIENT-HOME">
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#123d54] via-[#17636e] to-[#21877f] px-7 py-6 text-white shadow-xl">
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[42px] border-white/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[30px] font-bold">上午好，{patient.name}</p>
            <p className="mt-2 text-sm text-teal-50/80">今天安排 1 项运动康复训练，请在护士协助下完成。</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 text-right ring-1 ring-white/15">
            <p className="text-xs text-teal-100">今日处方</p>
            <p className="mt-1 text-base font-bold">功率车 · 30 分钟</p>
          </div>
        </div>
      </article>

      <div className="grid flex-1 grid-cols-[1fr_270px] gap-4">
        <article className="flex flex-col rounded-3xl border border-white bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold text-medical-600">护士操作区</p><h1 className="mt-1 text-xl font-bold text-slate-950">选择今日运动方式</h1></div>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Stethoscope className="h-3.5 w-3.5" />护士确认</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {categories.map(({ title, icon: Icon, items }) => {
              const categorySelected = items.includes(exercise);
              return (
                <section key={title} className={`rounded-2xl border p-3 ${categorySelected ? "border-medical-300 bg-medical-50/70" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${categorySelected ? "bg-medical-600 text-white" : "bg-white text-slate-500"}`}><Icon className="h-4 w-4" /></span>
                    <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => onChoose(item)}
                        className={`relative min-h-9 rounded-xl border px-3 text-xs font-bold ${
                          exercise === item ? "border-medical-500 bg-medical-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-medical-300"
                        }`}
                      >
                        {exercise === item && <Check className="mr-1 inline h-3 w-3" />}
                        {exerciseNames[item]}
                        {item !== "bike" && videoForExercise(item) && <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${exercise === item ? "bg-white" : "bg-emerald-500"}`} title="已有已发布视频" />}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-auto flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
              <div><p className="text-sm font-bold text-slate-800">已选择：{exerciseNames[exercise]}</p><p className="mt-0.5 text-[11px] text-slate-500">{exercise === "bike" ? "医生处方已审核 · 目标心率 100–116 bpm" : selectedVideo ? `已发布视频：${selectedVideo.title}` : "该子项目尚无已发布视频，请联系医护人员"}</p></div>
            </div>
            <button type="button" onClick={onStart} disabled={!canStart} className="patient-touch flex items-center gap-2 rounded-2xl bg-medical-600 px-6 font-bold text-white shadow-lg shadow-medical-100 disabled:cursor-not-allowed disabled:bg-slate-300">
              {exercise === "bike" ? "进入功率车训练" : selectedVideo ? `开始${exerciseNames[exercise]}跟练` : "视频未发布"} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </article>

        <aside className="grid grid-rows-2 gap-4">
          <article className="flex flex-col rounded-3xl border border-white bg-white p-5 shadow-card">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-600">累计完成次数</p><Activity className="h-5 w-5 text-medical-600" /></div>
            <div className="mt-auto flex items-end gap-2"><p className="text-5xl font-bold text-slate-950">{patient.completed}</p><p className="pb-1 text-sm font-bold text-slate-400">/ {patient.sessions} 次</p></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[31%] rounded-full bg-medical-500" /></div>
            <p className="mt-2 text-[11px] text-slate-500">本月已完成 8 次</p>
          </article>
          <article className="flex flex-col rounded-3xl border border-medical-100 bg-medical-50 p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-medical-900">下次随访</p><CalendarDays className="h-5 w-5 text-medical-600" /></div>
            <div className="mt-auto"><p className="text-3xl font-bold text-slate-950">8 月 6 日</p><p className="mt-1 text-lg font-bold text-medical-800">14:30</p><p className="mt-3 text-xs text-slate-500">心脏康复门诊 · 王医生</p></div>
          </article>
        </aside>
      </div>
    </section>
  );
}

function VideoTrainingScreen({ video, onBack, onFinish }: { video: PublishedTrainingVideo; onBack: () => void; onFinish: () => void }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showMonitoring, setShowMonitoring] = useState(false);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const openFullscreen = () => playerRef.current?.requestFullscreen?.();

  return (
    <section className="grid h-full min-h-[600px] grid-cols-[1.38fr_0.62fr] gap-4" data-testid="page-VIEW-VIDEO-TRAINING">
      <article ref={playerRef} className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-[#0d2432] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
          <div><p className="text-xs font-bold text-teal-200">{video.category} · {video.subtype}</p><h1 className="mt-1 text-xl font-bold">{video.title}</h1></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">跟练计时 {time}</span><button type="button" onClick={openFullscreen} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15"><Maximize2 className="h-4 w-4" />全屏跟练</button></div>
        </div>
        <div className="relative min-h-0 flex-1 bg-black">
          {video.source === "bilibili" ? (
            <iframe
              title={video.title}
              src={video.url}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          ) : (
            <video title={video.title} src={video.url} className="absolute inset-0 h-full w-full object-contain" controls playsInline />
          )}
        </div>
        {showMonitoring && <div className="flex items-center gap-5 border-t border-white/10 bg-[#102c3b] px-5 py-3 text-xs text-white"><span className="font-bold text-teal-200">可选监测</span><span>心率 <b className="ml-1 text-base">86 bpm</b></span><span>血氧 <b className="ml-1 text-base">97%</b></span><span className="flex-1 text-slate-300">心电波形需连接背包后显示；当前Demo不覆盖在视频画面上。</span></div>}
      </article>
      <aside className="flex flex-col gap-4">
        <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-medical-600">训练处方</p><h2 className="mt-1 text-xl font-bold text-slate-950">{video.subtype} · 视频跟练</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">{[["建议时长", "按视频完成"], ["目标强度", "RPE 9–11"], ["动作节奏", "跟随指导"], ["呼吸要求", "自然呼吸"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-2 text-sm font-bold text-slate-800">{value}</p></div>)}</div>
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">请按医护人员确认的处方练习。若出现胸闷、头晕、心悸或明显气促，请立即停止并呼叫医护。</p>
        </article>
        <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
          <div className="flex items-center justify-between"><div><p className="font-bold text-slate-900">生理监测内容</p><p className="mt-1 text-xs text-slate-500">默认不遮挡教学视频</p></div><button type="button" onClick={() => setShowMonitoring((value) => !value)} className={`relative h-7 w-12 rounded-full transition ${showMonitoring ? "bg-medical-600" : "bg-slate-200"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${showMonitoring ? "left-6" : "left-1"}`} /></button></div>
        </article>
        <div className="mt-auto grid grid-cols-2 gap-3">
          <button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" />返回首页</button>
          {!started ? <button type="button" onClick={() => setStarted(true)} className="btn-primary patient-touch"><Play className="h-5 w-5 fill-current" />开始跟练计时</button> : <button type="button" onClick={onFinish} className="patient-touch flex items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white"><CheckCircle2 className="h-5 w-5" />完成练习</button>}
        </div>
      </aside>
    </section>
  );
}

function PrescriptionScreen(props: {
  exercise: Exercise; trainingType: TrainingType; setTrainingType: (value: TrainingType) => void; targetHr: number; setTargetHr: (value: number) => void;
  warmup: number; setWarmup: (value: number) => void; mainMinutes: number; setMainMinutes: (value: number) => void; cooldown: number; setCooldown: (value: number) => void;
  repeats: number; setRepeats: (value: number) => void; totalMinutes: number; onBack: () => void; onContinue: () => void;
}) {
  const { trainingType, setTrainingType, targetHr, setTargetHr, warmup, setWarmup, mainMinutes, setMainMinutes, cooldown, setCooldown, repeats, setRepeats, totalMinutes, onBack, onContinue } = props;
  const prescriptionAdvice = getPrescriptionVersionDetail("V4").advice;
  return (
    <section className="grid h-full min-h-[570px] grid-cols-[0.9fr_1.1fr] gap-4" data-testid="page-VIEW-PATIENT-PRESCRIPTION">
      <article className="rounded-3xl border border-white bg-white p-6 shadow-card">
        <p className="text-xs font-bold text-medical-600">医生处方 · 护士核对</p><h1 className="mt-2 text-2xl font-bold text-slate-950">今日功率车训练参数</h1><p className="mt-2 text-sm leading-6 text-slate-500">默认读取医生已审核处方。演示模式下可选择参数，用于调研处方调整交互。</p>
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#123d54] to-[#1f7e79] p-6 text-white">
          <p className="text-sm text-teal-100">今日目标</p><div className="mt-3 flex items-end gap-2"><span className="text-6xl font-bold">{targetHr}</span><span className="pb-2 text-lg text-teal-100">bpm</span></div><p className="mt-2 text-sm text-teal-50/75">建议控制区间 {targetHr - 8}–{targetHr + 8} bpm</p>
          <div className="mt-6 grid grid-cols-3 gap-2">{[["热身", warmup], ["训练", mainMinutes * repeats], ["放松", cooldown]].map(([label, value]) => <div className="rounded-xl bg-white/10 p-3" key={label}><p className="text-xs text-teal-100">{label}</p><p className="mt-1 text-xl font-bold">{value} 分</p></div>)}</div>
          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4"><span className="text-sm text-teal-100">总计时间</span><span className="text-2xl font-bold">{totalMinutes} 分钟</span></div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="mr-2 inline h-5 w-5" />处方版本 RX-20260726-03 · 王医生已审核</div>
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">医生写给您的注意事项</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs leading-5 text-amber-900">
            <PatientAdvice label="康复忌讳" value={prescriptionAdvice.rehabContraindications} />
            <PatientAdvice label="吃饭注意" value={prescriptionAdvice.dietCautions} />
            <PatientAdvice label="运动注意" value={prescriptionAdvice.exerciseCautions} />
            <PatientAdvice label="何时停止" value={prescriptionAdvice.stopConditions} />
            <PatientAdvice label="用药提醒" value={prescriptionAdvice.medicationAdvice} />
            <PatientAdvice label="医生说明" value={prescriptionAdvice.patientInstruction} />
          </div>
        </div>
      </article>
      <article className="flex flex-col rounded-3xl border border-white bg-white p-6 shadow-card">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-950">演示处方调整</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">医护操作</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["continuous", "interval"] as TrainingType[]).map((type) => <button type="button" key={type} onClick={() => setTrainingType(type)} className={`patient-touch rounded-2xl border px-4 text-left ${trainingType === type ? "border-medical-400 bg-medical-50 ring-2 ring-medical-100" : "border-slate-200"}`}><p className="font-bold text-slate-900">{type === "continuous" ? "连续训练" : "间歇训练"}</p><p className="mt-1 text-xs text-slate-500">{type === "continuous" ? "稳定功率持续运动" : "训练与恢复交替循环"}</p></button>)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <NumberControl label="目标心率" value={targetHr} unit="bpm" onMinus={() => setTargetHr(Math.max(60, targetHr - 1))} onPlus={() => setTargetHr(Math.min(180, targetHr + 1))} />
          {trainingType === "interval" ? <NumberControl label="循环次数" value={repeats} unit="次" onMinus={() => setRepeats(Math.max(1, repeats - 1))} onPlus={() => setRepeats(Math.min(10, repeats + 1))} /> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">训练模式</p><p className="mt-4 text-lg font-bold text-slate-800">1 个连续阶段</p></div>}
          <SelectMinutes label="热身时间" value={warmup} options={[5, 10, 15]} onChange={setWarmup} />
          <SelectMinutes label="主要训练" value={mainMinutes} options={trainingType === "continuous" ? [10, 15, 20, 25, 30, 40, 50] : [1, 3, 5, 8, 10]} onChange={setMainMinutes} />
          <SelectMinutes label="放松时间" value={cooldown} options={[5, 10, 15]} onChange={setCooldown} />
          <div className="rounded-2xl border border-medical-100 bg-medical-50 p-4"><p className="text-xs font-bold text-medical-700">自动计算总时长</p><p className="mt-2 text-3xl font-bold text-medical-900">{totalMinutes}<span className="ml-1 text-sm">分钟</span></p></div>
        </div>
        <div className="mt-auto flex justify-between pt-5"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回首页</button><button type="button" onClick={onContinue} className="btn-primary patient-touch px-7">确认处方，检查设备 <ArrowRight className="h-5 w-5" /></button></div>
      </article>
    </section>
  );
}

function PatientAdvice({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 p-3"><p className="font-bold text-amber-950">{label}</p><p className="mt-1">{value}</p></div>;
}

function NumberControl({ label, value, unit, onMinus, onPlus }: { label: string; value: number; unit: string; onMinus: () => void; onPlus: () => void }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><div className="mt-3 flex items-center justify-between"><button type="button" onClick={onMinus} className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold text-slate-700">−</button><p className="text-2xl font-bold text-slate-950">{value}<span className="ml-1 text-xs text-slate-500">{unit}</span></p><button type="button" onClick={onPlus} className="h-10 w-10 rounded-xl bg-medical-100 text-xl font-bold text-medical-800">+</button></div></div>;
}

function SelectMinutes({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (value: number) => void }) {
  return <label className="rounded-2xl border border-slate-200 p-4"><span className="text-xs font-bold text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-800 outline-none">{options.map((option) => <option key={option} value={option}>{option} 分钟</option>)}</select></label>;
}

function DeviceScreen({ backpack, bike, onBackpack, onBike, onReset, onBack, onContinue }: { backpack: boolean; bike: boolean; onBackpack: () => void; onBike: () => void; onReset: () => void; onBack: () => void; onContinue: () => void }) {
  const allReady = backpack && bike;
  return (
    <section className="flex h-full min-h-[560px] flex-col rounded-3xl border border-white bg-white p-7 shadow-card" data-testid="page-VIEW-PATIENT-DEVICES">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-medical-600">训练前准备 · 第 1 项</p><h1 className="mt-2 text-2xl font-bold text-slate-950">连接背包与功率车</h1><p className="mt-2 text-sm text-slate-500">两个设备均连接通过后，才能进入下一步。</p></div><span className={`rounded-full px-4 py-2 text-xs font-bold ${allReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{allReady ? "设备已就绪" : `已连接 ${Number(backpack) + Number(bike)} / 2`}</span></div>
      <div className="mt-8 grid flex-1 grid-cols-2 gap-5">
        <DeviceCard icon={Bluetooth} title="智能监测背包" code="CARDIO-BAG-08" details={["心率传感器", "血氧传感器", "血压模块"]} connected={backpack} onConnect={onBackpack} />
        <DeviceCard icon={Bike} title="功率车" code="BIKE-REHAB-03" details={["速度 / 距离", "功率 / 阻力", "踏频数据"]} connected={bike} onConnect={onBike} />
      </div>
      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800"><Bluetooth className="mr-2 inline h-5 w-5" />本 Demo 使用模拟连接状态；真实版本需接入背包 BLE 与功率车 SDK，并保留断线重连。</div>
      <div className="mt-6 flex justify-between"><div className="flex gap-3"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回处方</button><button type="button" onClick={onReset} className="btn-secondary patient-touch"><RotateCcw className="h-4 w-4" /> 重新检测</button></div><button type="button" disabled={!allReady} onClick={onContinue} className="btn-primary patient-touch px-8">设备通过，进行心理准备 <ArrowRight className="h-5 w-5" /></button></div>
    </section>
  );
}

function DeviceCard({ icon: Icon, title, code, details, connected, onConnect }: { icon: typeof Bluetooth; title: string; code: string; details: string[]; connected: boolean; onConnect: () => void }) {
  return <article className={`flex flex-col rounded-3xl border p-6 ${connected ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${connected ? "bg-emerald-600 text-white" : "bg-white text-slate-500"}`}><Icon className="h-7 w-7" /></span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{connected ? "已连接" : "等待连接"}</span></div><h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{code}</p><div className="mt-5 grid grid-cols-3 gap-2">{details.map((item) => <span key={item} className={`rounded-xl px-2 py-3 text-center text-xs font-bold ${connected ? "bg-white text-emerald-700" : "bg-white text-slate-500"}`}>{connected && <Check className="mr-1 inline h-3 w-3" />}{item}</span>)}</div><button type="button" onClick={onConnect} className={`patient-touch mt-auto rounded-2xl font-bold ${connected ? "bg-white text-emerald-700 ring-1 ring-emerald-200" : "bg-medical-600 text-white"}`}>{connected ? "连接检测通过" : "搜索并连接"}</button></article>;
}

function PsychScreen({ answers, setAnswer, onBack, onContinue }: { answers: Record<string, string>; setAnswer: (key: string, value: string) => void; onBack: () => void; onContinue: () => void }) {
  const questions = [
    ["mood", "此刻整体心情如何？", ["轻松", "一般", "紧张"]],
    ["confidence", "对完成今天训练有信心吗？", ["有信心", "不确定", "没有信心"]],
    ["discomfort", "目前是否有明显不适或担忧？", ["没有", "轻微", "明显"]]
  ];
  return (
    <section className="flex h-full min-h-[560px] flex-col rounded-3xl border border-white bg-white p-7 shadow-card" data-testid="page-VIEW-PATIENT-PSYCH">
      <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><SmilePlus className="h-7 w-7" /></span><div><p className="text-xs font-bold text-violet-600">训练前准备 · 第 2 项</p><h1 className="mt-1 text-2xl font-bold text-slate-950">心理与主观感受评估</h1><p className="mt-1 text-sm text-slate-500">用于判断训练准备度；出现明显不适时应由医护进一步确认。</p></div></div>
      <div className="mt-7 grid flex-1 grid-cols-3 gap-4">
        {questions.map(([key, title, options]) => <article key={key as string} className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold text-slate-400">必答</p><h2 className="mt-3 min-h-[52px] text-lg font-bold text-slate-900">{title}</h2><div className="mt-5 space-y-3">{(options as string[]).map((option) => <button type="button" key={option} onClick={() => setAnswer(key as string, option)} className={`patient-touch flex w-full items-center justify-between rounded-2xl border px-4 font-bold ${answers[key as string] === option ? "border-violet-400 bg-violet-50 text-violet-800 ring-2 ring-violet-100" : "border-slate-200 bg-white text-slate-600"}`}>{option}{answers[key as string] === option && <CheckCircle2 className="h-5 w-5" />}</button>)}</div></article>)}
      </div>
      {answers.discomfort === "明显" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">已提示：存在明显不适，请护士确认后再继续。本 Demo 仍允许继续以便调研异常流程。</div>}
      <div className="mt-6 flex justify-between"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回设备</button><button type="button" disabled={Object.keys(answers).length !== 3} onClick={onContinue} className="btn-primary patient-touch px-8">评估完成，选择血压模式 <ArrowRight className="h-5 w-5" /></button></div>
    </section>
  );
}

function BpModeScreen({ mode, setMode, onBack, onStart }: { mode: BpMode | null; setMode: (value: BpMode) => void; onBack: () => void; onStart: () => void }) {
  const modes: { key: BpMode; title: string; detail: string; tag: string }[] = [
    { key: "twice", title: "测量 2 次", detail: "训练开始前、训练结束后各测量一次", tag: "常规推荐" },
    { key: "multiple", title: "分阶段测量", detail: "开始前、训练中、放松期与结束后测量", tag: "重点监测" },
    { key: "none", title: "本次不测量", detail: "仅在医护确认无需测量时选择", tag: "需确认" }
  ];
  return (
    <section className="flex h-full min-h-[550px] flex-col rounded-3xl border border-white bg-white p-7 shadow-card" data-testid="page-VIEW-PATIENT-BP">
      <div><p className="text-xs font-bold text-medical-600">训练前准备 · 最后一项</p><h1 className="mt-2 text-2xl font-bold text-slate-950">选择本次血压测量模式</h1><p className="mt-2 text-sm text-slate-500">延续一期训练前的测量模式选择，并在训练中提供手动测量入口。</p></div>
      <div className="mt-8 grid flex-1 grid-cols-3 gap-5">
        {modes.map((item, index) => <button type="button" key={item.key} onClick={() => setMode(item.key)} className={`relative rounded-3xl border p-6 text-left ${mode === item.key ? "border-medical-400 bg-medical-50 ring-2 ring-medical-100" : "border-slate-200 bg-slate-50"}`}><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${mode === item.key ? "bg-medical-600 text-white" : "bg-white text-slate-500"}`}><Activity className="h-6 w-6" /></span><span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-500">{item.tag}</span><p className="mt-8 text-xl font-bold text-slate-950">{item.title}</p><p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>{mode === item.key && <p className="mt-6 flex items-center gap-2 text-sm font-bold text-medical-700"><CheckCircle2 className="h-5 w-5" /> 已选择</p>}</button>)}
      </div>
      <div className="mt-6 flex justify-between"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回评估</button><button type="button" disabled={!mode} onClick={onStart} className="patient-touch flex items-center gap-2 rounded-2xl bg-medical-600 px-10 font-bold text-white shadow-lg shadow-medical-100 disabled:bg-slate-300"><Play className="h-5 w-5 fill-current" /> 开始功率车训练</button></div>
    </section>
  );
}

function TrainingScreen(props: {
  phase: Phase; setPhase: (value: Phase) => void; elapsed: number; paused: boolean; setPaused: (value: boolean) => void; bpMode: BpMode; measuredBp: string; onMeasureBp: () => void;
  targetHr: number; warmup: number; mainMinutes: number; cooldown: number; repeats: number; setElapsed: (value: number) => void; rpe: number; setRpe: (value: number) => void; anomaly: boolean; setAnomaly: (value: boolean) => void; onFinish: () => void;
}) {
  const { phase, setPhase, elapsed, paused, setPaused, bpMode, measuredBp, onMeasureBp, targetHr, warmup, mainMinutes, cooldown, repeats, setElapsed, rpe, setRpe, anomaly, setAnomaly, onFinish } = props;
  const hr = anomaly ? targetHr + 24 : phase === "warmup" ? targetHr - 14 : phase === "cooldown" ? targetHr - 10 : targetHr + (elapsed % 5) - 2;
  const speed = paused ? 0 : phase === "training" ? 22.6 : 16.8;
  const phaseLabels: Record<Phase, string> = { warmup: "热身", training: "主要训练", cooldown: "放松" };
  const trainingMinutes = mainMinutes * repeats;
  const totalSeconds = (warmup + trainingMinutes + cooldown) * 60;
  const warmupEnd = warmup * 60;
  const trainingEnd = (warmup + trainingMinutes) * 60;
  const remainingSeconds = Math.max(totalSeconds - elapsed, 0);
  const overallProgress = Math.min((elapsed / totalSeconds) * 100, 100);
  const hrZonePosition = Math.min(Math.max(((hr - (targetHr - 24)) / 48) * 100, 4), 96);
  const hrStatus = anomaly
    ? "心率高于目标区间，请降低踏频"
    : hr < targetHr - 8
      ? "正在进入目标心率区间"
      : hr > targetHr + 8
        ? "请适当降低踏频"
        : "心率处于目标区间，保持节奏";
  const phasePlan: { key: Phase; label: string; minutes: number }[] = [
    { key: "warmup", label: "热身", minutes: warmup },
    { key: "training", label: "训练", minutes: trainingMinutes },
    { key: "cooldown", label: "放松", minutes: cooldown }
  ];
  const phaseIndex = phasePlan.findIndex((item) => item.key === phase);
  const nextPhase = () => {
    if (phase === "warmup") {
      setElapsed(warmupEnd);
      setPhase("training");
    } else if (phase === "training") {
      setElapsed(trainingEnd);
      setPhase("cooldown");
    } else {
      onFinish();
    }
  };
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
      return;
    }
    void video.play().catch(() => undefined);
  }, [paused]);

  useEffect(() => {
    if (paused || elapsed >= totalSeconds) return;
    const expectedPhase: Phase = elapsed < warmupEnd ? "warmup" : elapsed < trainingEnd ? "training" : "cooldown";
    if (expectedPhase !== phase) setPhase(expectedPhase);
  }, [elapsed, paused, phase, setPhase, totalSeconds, trainingEnd, warmupEnd]);

  return (
    <section className="h-full min-h-[620px]" data-testid="page-VIEW-PATIENT-TRAINING">
      <article className="relative h-full min-h-[620px] overflow-hidden rounded-3xl bg-medical-50 shadow-card ring-1 ring-white">
        <video
          ref={videoRef}
          src="/media/phase1-bike-demo-h264.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${paused ? "scale-[1.01] opacity-55" : "opacity-100"}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white/35 via-white/10 to-transparent" />
        <div className="relative flex h-full flex-col p-4">
          <header className="grid grid-cols-[118px_1fr_118px] items-center gap-4 rounded-2xl border border-white/80 bg-white/82 px-4 py-3 shadow-xl backdrop-blur-xl">
            <div>
              <p className="text-[10px] font-bold text-slate-500">运动时间</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-950">{formatTime(elapsed)}</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-medical-800">热身 {warmup} 分钟 · 训练 {trainingMinutes} 分钟 · 放松 {cooldown} 分钟</p>
                <p className="text-[10px] font-bold text-medical-600">当前：{phaseLabels[phase]}</p>
              </div>
              <div className="relative h-8 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-medical-400 to-medical-600 transition-[width] duration-1000 ease-linear" style={{ width: `${overallProgress}%` }} />
                <div className="relative grid h-full" style={{ gridTemplateColumns: `${warmup}fr ${trainingMinutes}fr ${cooldown}fr` }}>
                  {phasePlan.map((item, index) => (
                    <div key={item.key} className={`flex items-center justify-center text-[10px] font-bold ${index > 0 ? "border-l border-white/80" : ""} ${index < phaseIndex ? "text-white" : "text-slate-600"}`}>
                      <span className={phase === item.key ? "rounded-full bg-white/90 px-2.5 py-0.5 text-medical-800 shadow-sm" : ""}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500">剩余时间</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-medical-800">{formatTime(remainingSeconds)}</p>
            </div>
          </header>

          <div className="mt-2 flex items-start justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-md">
              <span className={`h-2 w-2 rounded-full ${paused ? "bg-amber-400" : "metric-live-dot bg-emerald-500"}`} />
              {paused ? "视频已暂停" : "康复骑行视频正在播放"}
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-md ${anomaly ? "border-red-200 bg-red-50/95 text-red-700" : "border-medical-100 bg-white/90 text-medical-800"}`}>
              <Volume2 className={`h-4 w-4 ${anomaly ? "animate-pulse" : ""}`} />
              {anomaly ? "声音警报：心率高于目标区间" : `语音提示：${phaseAnnouncements[phase]}`}
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <aside className={`absolute left-0 top-1/2 w-[250px] -translate-y-1/2 rounded-3xl border bg-white/88 p-4 shadow-xl backdrop-blur-xl ${anomaly ? "border-red-200" : "border-white/90"}`} aria-label="实时心率监测">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${anomaly ? "bg-red-50 text-red-600" : "bg-rose-50 text-rose-600"}`}>
                    <HeartPulse className={`h-6 w-6 ${anomaly ? "animate-pulse" : ""}`} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500">实时心率</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">背包设备实时采集</p>
                  </div>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${anomaly ? "animate-pulse bg-red-500" : "metric-live-dot bg-emerald-500"}`} />
              </div>
              <div className={`mt-3 flex items-end gap-2 rounded-2xl px-3 py-2 ${anomaly ? "bg-red-600" : "bg-slate-900"}`}>
                <span className="text-4xl font-bold tabular-nums text-white">{hr}</span>
                <span className="pb-1 text-xs font-bold text-white/75">bpm</span>
              </div>
              <div className="relative mt-3">
                <div className="grid h-2.5 grid-cols-4 overflow-hidden rounded-full">
                  <span className="bg-sky-400" />
                  <span className="bg-emerald-400" />
                  <span className="bg-amber-400" />
                  <span className="bg-red-500" />
                </div>
                <span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-900 shadow" style={{ left: `${hrZonePosition}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] font-bold">
                <span className="text-slate-400">目标心率</span>
                <span className="text-medical-700">{targetHr - 8}–{targetHr + 8} bpm</span>
              </div>
              <p className={`mt-3 rounded-xl px-3 py-2 text-[10px] font-bold leading-4 ${anomaly ? "bg-red-50 text-red-700" : hr < targetHr - 8 ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>{hrStatus}</p>
            </aside>

            {paused && (
              <div className="flex flex-col items-center rounded-3xl border border-white bg-white/92 px-10 py-7 text-center text-slate-900 shadow-xl backdrop-blur-md">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-medical-50 text-medical-700"><Pause className="h-7 w-7" /></span>
                <p className="mt-4 text-xl font-bold">训练与视频已暂停</p>
                <p className="mt-1 text-xs text-slate-500">点击下方“继续训练”恢复视频播放</p>
              </div>
            )}
            {anomaly && !paused && (
              <div className="rounded-3xl border border-red-200 bg-red-50/95 px-8 py-5 text-center text-red-800 shadow-xl backdrop-blur-md">
                <AlertTriangle className="mx-auto h-8 w-8 animate-pulse text-red-600" />
                <p className="mt-2 text-lg font-bold">请降低踏频并等待医护确认</p>
                <p className="mt-1 text-xs text-red-600">心率已高于目标控制区间</p>
              </div>
            )}
          </div>

          <div className="mb-2 ml-auto grid w-[520px] grid-cols-3 gap-2">
            <button type="button" onClick={() => setPaused(!paused)} className="patient-touch flex items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/90 font-bold text-medical-800 shadow-lg backdrop-blur-xl">{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}{paused ? "继续训练" : "暂停训练"}</button>
            <button type="button" onClick={nextPhase} className="patient-touch flex items-center justify-center gap-2 rounded-xl bg-medical-600/95 font-bold text-white shadow-lg backdrop-blur-xl">{phase === "cooldown" ? <CircleStop className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}{phase === "cooldown" ? "结束训练" : "下一阶段"}</button>
            <button type="button" onClick={() => setAnomaly(!anomaly)} className={`patient-touch rounded-xl font-bold shadow-lg backdrop-blur-xl ${anomaly ? "border border-red-200 bg-red-50/95 text-red-700" : "border border-amber-200 bg-amber-50/95 text-amber-800"}`}>{anomaly ? "恢复正常指标" : "演示心率异常"}</button>
          </div>

          <div className="grid grid-cols-8 gap-2 rounded-2xl border border-white/80 bg-white/75 p-2.5 shadow-xl backdrop-blur-xl">
            <TrainingMetric icon={Gauge} label="速度" value={speed.toFixed(1)} unit="km/h" />
            <TrainingMetric icon={Activity} label="距离" value={(elapsed * speed / 3600).toFixed(2)} unit="km" />
            <TrainingMetric icon={Bike} label="功率" value={phase === "training" ? "68" : "42"} unit="W" />
            <TrainingMetric icon={Settings2} label="阻力" value={phase === "training" ? "5" : "3"} unit="级" />
            <TrainingMetric icon={Clock3} label="热量" value={String(Math.round(elapsed / 8))} unit="kcal" />
            <TrainingMetric icon={ThermometerSun} label="血氧" value="97" unit="%" />
            <button type="button" onClick={onMeasureBp} disabled={bpMode === "none"} className="rounded-xl border border-sky-100 bg-sky-50/90 p-2 text-left shadow-sm disabled:opacity-50">
              <p className="text-[9px] font-bold text-sky-600">血压 · 测量</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{bpMode === "none" ? "— / —" : measuredBp}</p>
              <p className="mt-0.5 text-[8px] text-slate-500">mmHg</p>
            </button>
            <label className="rounded-xl border border-violet-100 bg-violet-50/90 p-2 shadow-sm">
              <p className="text-[9px] font-bold text-violet-600">主观用力 RPE</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{rpe}<span className="ml-1 text-[8px] text-slate-500">/ 20</span></p>
              <input type="range" min="6" max="20" value={rpe} onChange={(event) => setRpe(Number(event.target.value))} className="mt-1 w-full accent-violet-600" />
            </label>
          </div>
        </div>
      </article>
    </section>
  );
}

function TrainingMetric({ icon: Icon, label, value, unit, tone = "blue", note }: { icon: typeof Gauge; label: string; value: string; unit: string; tone?: "blue" | "rose" | "red"; note?: string }) {
  const toneClasses = tone === "red" ? "border-red-100 bg-red-50/90 text-red-600" : tone === "rose" ? "border-rose-100 bg-rose-50/90 text-rose-600" : "border-medical-100 bg-medical-50/90 text-medical-600";
  return (
    <div className={`rounded-xl border p-2 shadow-sm ${toneClasses}`}>
      <div className="flex items-center gap-1"><Icon className="h-3.5 w-3.5" /><p className="text-[9px] font-bold">{label}</p></div>
      <p className="mt-1 text-base font-bold text-slate-950">{value}<span className="ml-0.5 text-[8px] text-slate-500">{unit}</span></p>
      {note && <p className="mt-0.5 truncate text-[8px] font-bold">{note}</p>}
    </div>
  );
}

function ResultScreen({
  totalMinutes,
  targetHr,
  rpe,
  bp,
  onDone,
  onViewReport
}: {
  totalMinutes: number;
  targetHr: number;
  rpe: number;
  bp: string;
  onDone: () => void;
  onViewReport: () => void;
}) {
  return (
    <section className="grid h-full min-h-[610px] grid-cols-[0.8fr_1.2fr] gap-5" data-testid="page-VIEW-PATIENT-RESULT">
      <article className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#123d54] to-[#1f7e79] p-8 text-center text-white shadow-xl"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/5"><CheckCircle2 className="h-14 w-14" /></span><p className="mt-7 text-sm font-bold text-teal-100">第 {patient.completed + 1} 次训练</p><h1 className="mt-2 text-4xl font-bold">训练已完成</h1><p className="mt-3 max-w-sm text-sm leading-6 text-teal-50/75">本次过程平稳，数据已生成训练记录并同步给医生端。</p><div className="mt-8 w-full space-y-3"><button type="button" onClick={onViewReport} className="patient-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-medical-900"><FileText className="h-5 w-5" /> 查看单次报告</button><button type="button" onClick={onDone} className="patient-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 font-bold text-white ring-1 ring-white/25 hover:bg-white/15"><House className="h-5 w-5" /> 返回首页</button></div></article>
      <article className="rounded-3xl border border-white bg-white p-7 shadow-card"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-medical-600">本次训练小结</p><h2 className="mt-1 text-2xl font-bold text-slate-950">功率车 · 连续训练</h2></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">数据完整</span></div><div className="mt-7 grid grid-cols-3 gap-4">{[["计划 / 完成", `${totalMinutes} / ${totalMinutes} 分`], ["平均心率", `${targetHr - 2} bpm`], ["目标区间时长", "18 分 42 秒"], ["距离", "8.4 km"], ["消耗热量", "126 kcal"], ["结束血压", `${bp} mmHg`], ["平均功率", "64 W"], ["平均血氧", "97%"], ["RPE", `${rpe} / 20`]].map(([label, value]) => <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={label}><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-lg font-bold text-slate-900">{value}</p></div>)}</div><div className="mt-6 rounded-2xl border border-medical-100 bg-medical-50 p-5"><p className="font-bold text-medical-900">训练建议</p><p className="mt-2 text-sm leading-6 text-slate-600">请坐位休息并少量饮水。若离开后出现持续胸闷、心悸或明显不适，请及时联系医护人员。</p></div></article>
    </section>
  );
}

function CalendarScreen({ onBack }: { onBack: () => void }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return <section className="rounded-3xl border border-white bg-white p-7 shadow-card"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-medical-600">训练记录</p><h1 className="mt-1 text-2xl font-bold text-slate-950">2026 年 7 月打卡日历</h1></div><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> 返回首页</button></div><div className="mt-7 grid grid-cols-7 gap-3">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <p key={day} className="text-center text-xs font-bold text-slate-400">周{day}</p>)}{days.map((day) => { const done = [2, 4, 7, 9, 11, 14, 16, 18, 22, 23, 25].includes(day); return <div key={day} className={`flex h-16 items-center justify-center rounded-2xl text-sm font-bold ${day === 26 ? "bg-medical-600 text-white ring-4 ring-medical-100" : done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>{done ? <span className="text-center"><Check className="mx-auto h-4 w-4" /><small className="text-[9px]">已训练</small></span> : day}</div>; })}</div></section>;
}

function ReportScreen({
  onStart,
  initialSingleReportId
}: {
  onStart: () => void;
  initialSingleReportId?: string | null;
}) {
  const [reportTab, setReportTab] = useState<"single" | "stage">("single");
  const [selectedSingleReport, setSelectedSingleReport] = useState<string | null>(initialSingleReportId ?? null);
  return (
    <section className="space-y-4 pb-2" data-testid="page-VIEW-PATIENT-REPORT">
      <header className="flex items-center justify-between rounded-3xl border border-white bg-white px-6 py-4 shadow-card">
        <div>
          <p className="text-xs font-bold text-medical-600">康复训练报告</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">陈女士的运动康复记录</h1>
        </div>
        <div className="flex rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="报告类型">
          <button type="button" role="tab" aria-selected={reportTab === "single"} onClick={() => { setReportTab("single"); setSelectedSingleReport(null); }} className={`min-h-10 rounded-xl px-6 text-sm font-bold ${reportTab === "single" ? "bg-white text-medical-800 shadow-sm" : "text-slate-500"}`}>单次报告</button>
          <button type="button" role="tab" aria-selected={reportTab === "stage"} onClick={() => setReportTab("stage")} className={`min-h-10 rounded-xl px-6 text-sm font-bold ${reportTab === "stage" ? "bg-white text-medical-800 shadow-sm" : "text-slate-500"}`}>阶段性报告</button>
        </div>
      </header>
      {reportTab === "single" ? (
        selectedSingleReport
          ? <SingleTrainingReport reportId={selectedSingleReport} onBack={() => setSelectedSingleReport(null)} />
          : <SingleReportList onSelect={setSelectedSingleReport} />
      ) : <StageTrainingReport onStart={onStart} />}
    </section>
  );
}

function SingleReportList({ onSelect }: { onSelect: (reportId: string) => void }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white bg-white shadow-card" data-testid="page-VIEW-SINGLE-REPORT-LIST">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div><p className="text-xs font-bold text-medical-600">单次训练记录</p><h2 className="mt-1 text-xl font-bold text-slate-950">选择一条记录查看完整报告</h2><p className="mt-1 text-xs text-slate-500">列表按训练时间倒序排列。</p></div>
        <span className="rounded-full bg-medical-50 px-4 py-2 text-xs font-bold text-medical-700">共 {patient.completed} 份报告</span>
      </div>
      <div className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.75fr_0.85fr_0.85fr_0.7fr] bg-slate-50 px-5 py-3 text-[11px] font-bold text-slate-400">
        <span>报告编号</span><span>训练时间</span><span>运动项目</span><span>运动类型</span><span>总时长</span><span>平均心率</span><span>有效时间</span><span>状态 / 查看</span>
      </div>
      {singleTrainingReportDetails.map((record) => (
        <button type="button" key={record.id} onClick={() => onSelect(record.id)} className="grid w-full grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.75fr_0.85fr_0.85fr_0.7fr] items-center border-t border-slate-100 px-5 py-4 text-left text-xs text-slate-600 hover:bg-medical-50/60">
          <span className="font-bold text-slate-800">{record.id}</span>
          <span>{record.dateTime}</span><span className="font-bold text-slate-700">{record.exercise}</span><span>{record.trainingType}</span><span>{record.totalMinutes} 分钟</span><span>{record.hrStats.average} bpm</span><span>{record.activeMinutes} 分钟</span>
          <span className="font-bold text-medical-700">{record.status} <ChevronRight className="inline h-3.5 w-3.5" /></span>
        </button>
      ))}
    </article>
  );
}

function SingleTrainingReport({ reportId, onBack }: { reportId: string; onBack: () => void }) {
  const report = getSingleTrainingReportDetail(reportId);
  const prescriptionDetail = getPrescriptionVersionDetail(report.prescriptionVersionId);
  const patientInfo = [
    ["患者姓名", report.clinicalSnapshot.name],
    ["年龄", `${report.clinicalSnapshot.age} 岁`],
    ["体重", `${report.clinicalSnapshot.weightKg} kg`],
    ["BMI", `${report.clinicalSnapshot.bmi} kg/m²`],
    ["运动时间", `${report.totalMinutes} 分钟`],
    ["危险分组", report.clinicalSnapshot.riskLevel],
    ["运动项目", report.exercise],
    ["运动类型", report.trainingType]
  ];
  const prescription = [
    ["热身时间", `${prescriptionDetail.warmupMinutes} 分钟`],
    ["训练时间", `${prescriptionDetail.trainingMinutes} 分钟`],
    ["放松时间", `${prescriptionDetail.cooldownMinutes} 分钟`],
    ["靶心率", `${prescriptionDetail.targetHr[0]}–${prescriptionDetail.targetHr[1]} bpm`]
  ];
  return (
    <div className="space-y-4">
      <article className="rounded-3xl border border-white bg-white p-6 shadow-card">
        <div className="flex items-center justify-between"><div className="flex items-center gap-4"><button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="返回单次报告列表"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold text-medical-600">训练编号 {reportId}</p><h2 className="mt-1 text-xl font-bold text-slate-950">单次功率车训练报告</h2></div></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />训练已完成</span></div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {patientInfo.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[11px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-sm font-bold text-slate-900">{value}</p></div>)}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[["病史", report.clinicalSnapshot.patientFriendlySummary], ["诊断", report.clinicalSnapshot.diagnosis], ["特殊用药", report.clinicalSnapshot.specialMedications.join("、")]].map(([label, value]) => <div key={label} className="rounded-2xl border border-medical-100 bg-medical-50 p-3.5"><p className="text-[11px] font-bold text-medical-600">{label}</p><p className="mt-1.5 text-xs font-bold leading-5 text-medical-950">{value}</p></div>)}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-sm font-bold text-slate-900">运动处方参数</p><div className="mt-3 grid grid-cols-4 gap-3">{prescription.map(([label, value]) => <div key={label} className="rounded-2xl border border-medical-100 bg-medical-50 p-3.5"><p className="text-[11px] font-bold text-medical-600">{label}</p><p className="mt-1.5 text-base font-bold text-medical-900">{value}</p></div>)}</div></div>
      </article>

      <article className="rounded-3xl border border-white bg-white p-6 shadow-card">
        <div><p className="text-xs font-bold text-medical-600">处方执行情况</p><h2 className="mt-1 text-xl font-bold text-slate-950">训练时间与分期生命体征</h2></div>
        <div className="mt-5 grid grid-cols-[260px_1fr] gap-6">
          <div className="flex items-center gap-5 rounded-2xl bg-slate-50 p-5">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#1f7e79 0 ${report.activeMinutes / report.totalMinutes * 100}%, #dbe6ec ${report.activeMinutes / report.totalMinutes * 100}% 100%)` }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold text-slate-950">{report.totalMinutes}</span><span className="text-[10px] font-bold text-slate-400">总分钟</span></div>
            </div>
            <div className="space-y-4"><div><p className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-medical-600" />有效运动时间</p><p className="mt-1 text-xl font-bold text-slate-950">{report.activeMinutes} 分钟</p></div><div><p className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />无效运动时间</p><p className="mt-1 text-xl font-bold text-slate-950">{report.invalidMinutes} 分钟</p></div></div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="grid grid-cols-[1.05fr_1fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500"><span>监测指标</span><span>热身期</span><span>训练期</span><span>放松期</span></div>
            {report.phaseVitals.map((row) => <div key={row.metric} className="grid grid-cols-[1.05fr_1fr_1fr_1fr] border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><b className="text-slate-800">{row.metric}</b><span>{row.warmup}</span><span>{row.training}</span><span>{row.cooldown}</span></div>)}
          </div>
        </div>
      </article>
      <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-card">
        <p className="text-sm font-bold text-amber-900">医生同步给您的注意事项</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs leading-5 text-amber-900">
          <PatientAdvice label="吃饭注意" value={prescriptionDetail.advice.dietCautions} />
          <PatientAdvice label="运动注意" value={prescriptionDetail.advice.exerciseCautions} />
          <PatientAdvice label="何时停止" value={prescriptionDetail.advice.stopConditions} />
        </div>
      </article>

      <div className="grid grid-cols-2 gap-4">
        <TrendChart
          title="心率、呼吸率与血氧趋势"
          subtitle="随运动持续时间变化"
          series={[
            { name: "心率 bpm", color: "#e84b68", values: [86, 92, 101, 108, 112, 109, 103, 96] },
            { name: "呼吸率 次/分", color: "#347faf", values: [17, 18, 20, 22, 23, 22, 20, 18] },
            { name: "血氧 %", color: "#1f7e79", values: [98, 98, 97, 97, 96, 97, 98, 98] }
          ]}
        />
        <TrendChart
          title="血压与心电监测趋势"
          subtitle="收缩压、舒张压及心电监测"
          series={[
            { name: "收缩压 mmHg", color: "#8b5cf6", values: [126, 128, 132, 136, 134, 131, 127, 124] },
            { name: "舒张压 mmHg", color: "#f59e0b", values: [76, 78, 80, 82, 81, 80, 78, 76] },
            { name: "心电稳定度", color: "#1f7e79", values: [96, 97, 96, 95, 96, 97, 98, 98] }
          ]}
          footer="心电监测：全程窦性心律，未记录持续性心律失常（演示结论）"
        />
      </div>
    </div>
  );
}

function TrendChart({ title, subtitle, series, footer }: { title: string; subtitle: string; series: { name: string; color: string; values: number[] }[]; footer?: string }) {
  const pointsFor = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    return values.map((value, index) => `${40 + index * (460 / (values.length - 1))},${150 - ((value - min) / range) * 92}`).join(" ");
  };
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-medical-600">{subtitle}</p><h3 className="mt-1 text-base font-bold text-slate-950">{title}</h3></div><span className="text-[10px] text-slate-400">0–30 分钟</span></div>
      <div className="mt-3 flex flex-wrap gap-3">{series.map((item) => <span key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>)}</div>
      <svg viewBox="0 0 540 190" className="mt-2 h-[180px] w-full" role="img" aria-label={title}>
        {[58, 89, 120, 150].map((y) => <line key={y} x1="40" y1={y} x2="500" y2={y} stroke="#e8eef1" strokeWidth="1" />)}
        {[0, 5, 10, 15, 20, 25, 30].map((minute, index) => <g key={minute}><line x1={40 + index * (460 / 6)} y1="45" x2={40 + index * (460 / 6)} y2="155" stroke="#f2f5f7" strokeWidth="1" /><text x={40 + index * (460 / 6)} y="176" textAnchor="middle" fontSize="9" fill="#94a3b8">{minute}m</text></g>)}
        {series.map((item) => <polyline key={item.name} points={pointsFor(item.values)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      {footer && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">{footer}</p>}
      {!footer && <p className="text-[10px] text-slate-400">不同单位趋势经归一化后同屏展示，具体数值以原始记录为准。</p>}
    </article>
  );
}

function StageTrainingReport({ onStart }: { onStart: () => void }) {
  const data = stageReportData;
  const [selectedPrescriptionVersion, setSelectedPrescriptionVersion] = useState<PrescriptionVersion["id"] | null>(null);
  const summaries = useMemo(
    () => data.prescriptionVersions.map((version) => summarizeVersion(data, version)),
    [data]
  );
  const plannedSessions = data.prescriptionVersions.reduce((total, version) => total + version.plannedSessions, 0);
  const completedSessions = summaries.reduce((total, summary) => total + summary.completedSessions, 0);
  const completionRate = Math.round(completedSessions / plannedSessions * 100);
  const avgActiveMinutes = summaries.reduce((total, summary) => total + summary.avgActiveMinutes * summary.completedSessions, 0) / completedSessions;
  const targetZoneRate = data.sessions.reduce((total, item) => total + item.targetZoneMinutes, 0) / data.sessions.reduce((total, item) => total + item.activeMinutes, 0) * 100;
  const abnormalSessionCount = new Set(data.safetyEvents.map((event) => event.sessionId)).size;
  const interruptedSessionCount = data.sessions.filter((item) => item.pauses > 0 || item.terminatedEarly).length;
  const selectedPrescriptionDetail = selectedPrescriptionVersion ? getPrescriptionVersionDetail(selectedPrescriptionVersion) : null;
  return (
    <section className="space-y-4 pb-3" data-testid="page-VIEW-STAGE-REPORT">
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-4">
        <article className="rounded-3xl bg-gradient-to-br from-[#123d54] via-[#165e69] to-[#1f7e79] p-6 text-white shadow-xl">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold text-teal-100">阶段报告 · 报告周期：{data.reportPeriod.start} 至 {data.reportPeriod.end}</p>
              <h2 className="mt-2 text-2xl font-bold">运动耐量提高，建议维持当前强度</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50/80">{data.clinicalConclusion.summary}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/20">医患共读版</span>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              [`${completedSessions}/${plannedSessions}`, "计划完成"],
              [`${completionRate}%`, "总完成率"],
              [`${avgActiveMinutes.toFixed(1)} 分`, "平均实际运动"],
              [`${targetZoneRate.toFixed(0)}%`, "靶区达标率"]
            ].map(([value, label]) => <div key={label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-[10px] text-teal-100">{label}</p></div>)}
          </div>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-card">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle className="h-5 w-5" />医生优先关注</p><span className="text-xs font-bold text-amber-700">{data.safetyEvents.length} 条事件</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl font-bold text-slate-950">{abnormalSessionCount}</p><p className="mt-1 text-[10px] font-bold text-slate-500">异常训练次数</p></div>
            <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl font-bold text-slate-950">{interruptedSessionCount}</p><p className="mt-1 text-[10px] font-bold text-slate-500">暂停/中断训练</p></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-amber-800">V3出现运动后血压升高和孤立室早；V4有1次训练后血压未采集。当前风险：{data.patientSnapshot.riskAtStart} → {data.patientSnapshot.currentRisk}。</p>
        </article>
      </div>

      <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
        <div><p className="text-xs font-bold text-medical-600">我的临床信息</p><h2 className="mt-1 text-xl font-bold text-slate-950">医生同步的病史、诊断与特殊用药</h2></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[["病史", clinicalSnapshotChen.patientFriendlySummary], ["诊断", clinicalSnapshotChen.diagnosis], ["特殊用药", clinicalSnapshotChen.specialMedications.join("、")]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-sm font-bold leading-6 text-slate-900">{value}</p></div>)}
        </div>
      </article>

      <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-bold text-medical-600">处方版本演变</p><h2 className="mt-1 text-xl font-bold text-slate-950">四次处方为什么调整、强度如何变化</h2></div>
          <div className="text-right text-[11px] text-slate-500"><p>{data.patientSnapshot.name} · {data.patientSnapshot.age}岁 · BMI {data.patientSnapshot.bmi}</p><p className="mt-1">报告生成：{data.reportPeriod.generatedAt}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {data.prescriptionVersions.map((version, index) => <PrescriptionVersionCard key={version.id} version={version} summary={summaries[index]} onOpen={() => setSelectedPrescriptionVersion(version.id)} />)}
        </div>
      </article>

      <PrescriptionEvolutionTable versions={data.prescriptionVersions} summaries={summaries} />

      <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
        <div><p className="text-xs font-bold text-medical-600">处方执行效果</p><h2 className="mt-1 text-xl font-bold text-slate-950">完成度、实际剂量与患者反应</h2><p className="mt-1 text-xs text-slate-500">数据有效时间、实际运动时间与靶区达标时间分别计算。</p></div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          <VersionMetricBars title="完成率" unit="%" values={summaries.map((item) => item.completionRate)} max={100} color="bg-medical-500" />
          <VersionMetricBars title="靶区达标率" unit="%" values={summaries.map((item) => item.completedSessions ? item.targetZoneRate : null)} max={100} color="bg-sky-500" />
          <VersionMetricBars title="平均功率" unit="W" values={summaries.map((item) => item.completedSessions ? item.avgPower : null)} max={70} color="bg-violet-500" />
          <VersionMetricBars title="平均 RPE" unit="/20" values={summaries.map((item) => item.completedSessions ? item.avgRpe : null)} max={20} color="bg-amber-500" />
        </div>
        <VersionExecutionTable summaries={summaries} />
      </article>

      <StageSafetySection />

      <div className="grid grid-cols-[1.05fr_0.95fr] gap-4">
        <FunctionalAssessmentSection />
        <PatientOutcomeSection />
      </div>

      <article className="rounded-3xl border border-medical-200 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-6">
          <div><p className="text-xs font-bold text-medical-600">阶段结论与下一步</p><h2 className="mt-1 text-xl font-bold text-slate-950">医生确认后执行下一阶段计划</h2></div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"><ShieldCheck className="mr-1 inline h-4 w-4" />{data.clinicalConclusion.confirmedBy}已确认</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-800">已达到目标</p><ul className="mt-3 space-y-2 text-xs text-emerald-900">{data.clinicalConclusion.achievedGoals.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
          <div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">尚待完成</p><ul className="mt-3 space-y-2 text-xs text-amber-900">{data.clinicalConclusion.pendingGoals.map((item) => <li key={item} className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
        </div>
        <div className="mt-4 grid grid-cols-[1.25fr_0.75fr] gap-4">
          <div className="rounded-2xl bg-medical-50 p-4"><p className="text-xs font-bold text-medical-700">下一处方建议</p><p className="mt-2 text-sm font-bold leading-6 text-medical-950">{data.clinicalConclusion.nextPrescription}</p><p className="mt-2 text-xs text-slate-600">{data.clinicalConclusion.reassessment}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">确认与随访</p><p className="mt-2 text-sm font-bold text-slate-900">{data.clinicalConclusion.confirmedBy} · {data.clinicalConclusion.confirmedAt}</p><p className="mt-3 text-xs text-slate-500">下次随访</p><p className="mt-1 text-lg font-bold text-medical-800">{data.clinicalConclusion.nextFollowUp}</p><button type="button" onClick={onStart} className="mt-3 text-xs font-bold text-medical-700">返回今日训练</button></div>
        </div>
        <p className="mt-4 text-[10px] text-slate-400">演示报告：指标来自模拟设备与人工记录。间歇血压保留测量时间；缺失数据不按0计入均值。</p>
      </article>
      {selectedPrescriptionDetail && <PatientPrescriptionDetailModal version={selectedPrescriptionDetail} onClose={() => setSelectedPrescriptionVersion(null)} />}
    </section>
  );
}

function PrescriptionVersionCard({ version, summary, onOpen }: { version: PrescriptionVersion; summary: VersionSummary; onOpen: () => void }) {
  const directionStyle = version.direction === "上调" ? "bg-sky-50 text-sky-700" : version.direction === "维持" ? "bg-amber-50 text-amber-700" : version.direction === "下调" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600";
  return (
    <button type="button" onClick={onOpen} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-medical-200 hover:bg-medical-50/50">
      <div className="flex items-center justify-between"><span className="text-xl font-bold text-slate-950">{version.id}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${directionStyle}`}>{version.direction === "上调" && "↑ "}{version.direction === "下调" && "↓ "}{version.direction === "维持" && "→ "}{version.direction}</span></div>
      <p className="mt-1 text-[10px] text-slate-400">{version.effectiveDate}生效 · {version.physician}</p>
      <p className="mt-3 min-h-10 text-xs font-bold leading-5 text-slate-700">{version.adjustmentReason}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl bg-white p-2"><p className="text-slate-400">靶心率</p><p className="mt-1 font-bold text-slate-800">{version.targetHr.join("–")} bpm</p></div>
        <div className="rounded-xl bg-white p-2"><p className="text-slate-400">目标功率</p><p className="mt-1 font-bold text-slate-800">{version.targetPower.join("–")} W</p></div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-slate-500">完成 {summary.completedSessions}/{version.plannedSessions}次</span><span className="font-bold text-medical-700">{summary.completionRate.toFixed(0)}%</span></div>
      <p className="mt-2 text-[10px] font-bold text-medical-700">查看本版处方内容 <ChevronRight className="inline h-3.5 w-3.5" /></p>
    </button>
  );
}

function PatientPrescriptionDetailModal({ version, onClose }: { version: ReturnType<typeof getPrescriptionVersionDetail>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold text-medical-600">处方详情 · {version.version}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">这版医生给我的训练安排</h2><p className="mt-2 text-sm text-slate-500">{version.issuedAt} · {version.physician}开具</p></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500" aria-label="关闭处方详情"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[["频次", `每周${version.weeklyFrequency}次`], ["时间", `${version.warmupMinutes}+${version.trainingMinutes}+${version.cooldownMinutes} 分`], ["心率", `${version.targetHr[0]}–${version.targetHr[1]} bpm`], ["功率", `${version.targetPower[0]}–${version.targetPower[1]} W`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-sm font-bold text-slate-900">{value}</p></div>)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm leading-6">
          <PatientAdvice label="医生说明" value={version.advice.patientInstruction} />
          <PatientAdvice label="吃饭注意" value={version.advice.dietCautions} />
          <PatientAdvice label="运动注意" value={version.advice.exerciseCautions} />
          <PatientAdvice label="何时停止" value={version.advice.stopConditions} />
        </div>
      </section>
    </div>
  );
}

function PrescriptionEvolutionTable({ versions, summaries }: { versions: PrescriptionVersion[]; summaries: VersionSummary[] }) {
  const rows = [
    ["生效日期", ...versions.map((item) => item.effectiveDate)],
    ["调整原因", ...versions.map((item) => item.adjustmentReason)],
    ["运动/模式", ...versions.map((item) => `${item.exerciseProject} · ${item.trainingType}`)],
    ["频次", ...versions.map((item) => `每周${item.weeklyFrequency}次`)],
    ["阶段时长", ...versions.map((item) => `${item.warmupMinutes}+${item.trainingMinutes}+${item.cooldownMinutes}分`)],
    ["靶心率", ...versions.map((item) => `${item.targetHr.join("–")} bpm`)],
    ["功率/阻力", ...versions.map((item) => `${item.targetPower.join("–")}W / ${item.resistance.join("–")}级`)],
    ["RPE目标", ...versions.map((item) => item.rpeTarget.join("–"))],
    ["计划/完成", ...versions.map((item, index) => `${summaries[index].completedSessions}/${item.plannedSessions}次`)]
  ];
  return (
    <article className="overflow-hidden rounded-3xl border border-white bg-white shadow-card">
      <div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold text-medical-600">完整处方对照</p><h2 className="mt-1 text-lg font-bold text-slate-950">V1–V4 FITT与强度参数</h2></div>
      <div className="grid grid-cols-[1.1fr_repeat(4,1fr)] bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500"><span>处方字段</span>{versions.map((item) => <span key={item.id}>{item.id}</span>)}</div>
      {rows.map((row) => <div key={row[0]} className="grid grid-cols-[1.1fr_repeat(4,1fr)] border-t border-slate-100 px-5 py-3 text-xs text-slate-600">{row.map((item, index) => <span key={`${row[0]}-${index}`} className={index === 0 ? "font-bold text-slate-800" : ""}>{item}</span>)}</div>)}
    </article>
  );
}

function VersionMetricBars({ title, unit, values, max, color }: { title: string; unit: string; values: (number | null)[]; max: number; color: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <div className="mt-3 flex h-24 items-end justify-around gap-2">
        {values.map((value, index) => <div key={`${title}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end"><span className="mb-1 text-[9px] font-bold text-slate-600">{value === null ? "—" : `${value.toFixed(title === "平均 RPE" ? 1 : 0)}${unit}`}</span><div className={`w-full max-w-8 rounded-t-md ${value === null ? "bg-slate-200" : color}`} style={{ height: `${value === null ? 4 : Math.max(8, value / max * 64)}px` }} /><span className="mt-1 text-[9px] font-bold text-slate-400">V{index + 1}</span></div>)}
      </div>
    </div>
  );
}

function VersionExecutionTable({ summaries }: { summaries: VersionSummary[] }) {
  const show = (item: VersionSummary, value: string) => item.completedSessions ? value : "—";
  const rows = [
    ["实际训练次数", ...summaries.map((item) => `${item.completedSessions}次`)],
    ["平均训练时长", ...summaries.map((item) => show(item, `${item.avgDuration.toFixed(1)}分`))],
    ["数据有效率", ...summaries.map((item) => show(item, `${item.sensorValidRate.toFixed(0)}%`))],
    ["平均实际运动", ...summaries.map((item) => show(item, `${item.avgActiveMinutes.toFixed(1)}分`))],
    ["平均靶区时间", ...summaries.map((item) => show(item, `${item.avgTargetZoneMinutes.toFixed(1)}分`))],
    ["平均/峰值心率", ...summaries.map((item) => show(item, `${item.avgHr.toFixed(0)}/${item.peakHr} bpm`))],
    ["平均/峰值功率", ...summaries.map((item) => show(item, `${item.avgPower.toFixed(0)}/${item.peakPower} W`))],
    ["距离/热量", ...summaries.map((item) => show(item, `${item.totalDistance.toFixed(1)}km / ${item.totalCalories}kcal`))],
    ["RPE/暂停", ...summaries.map((item) => show(item, `${item.avgRpe.toFixed(1)} / ${item.pauses}次`))],
    ["数据完整率", ...summaries.map((item) => show(item, `${item.dataCompleteness.toFixed(0)}%`))],
    ["缺失字段", ...summaries.map((item) => item.completedSessions ? (item.missingFields.length ? item.missingFields.join("、") : "无") : "无训练数据")]
  ];
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500"><span>执行指标</span>{summaries.map((item) => <span key={item.versionId}>{item.versionId}</span>)}</div>
        {rows.map((row) => <div key={row[0]} className="grid grid-cols-[1.2fr_repeat(4,1fr)] border-t border-slate-100 px-4 py-3 text-xs text-slate-600">{row.map((item, index) => <span key={`${row[0]}-${index}`} className={index === 0 ? "font-bold text-slate-800" : item !== "无" && row[0] === "缺失字段" ? "font-bold text-amber-700" : ""}>{item}</span>)}</div>)}
      </div>
    </div>
  );
}

function StageSafetySection() {
  const data = stageReportData;
  const bpRows = data.prescriptionVersions.map((version) => {
    const sessions = data.sessions.filter((item) => item.prescriptionVersionId === version.id);
    const firstPre = sessions.find((item) => item.preBp);
    const latestPostSession = [...sessions].reverse().find((item) => item.postBp);
    const pre = firstPre?.preBp ? `${firstPre.preBp} (${firstPre.date}训练前)` : "未采集";
    const latestPost = latestPostSession?.postBp ? `${latestPostSession.postBp} (${latestPostSession.date}训练后)` : "未采集";
    const missing = sessions.filter((item) => item.postBp === null).length;
    return [version.id, pre, latestPost, missing ? `${missing}次未采集` : "完整"];
  });
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div><p className="text-xs font-bold text-medical-600">安全与生命体征</p><h2 className="mt-1 text-xl font-bold text-slate-950">异常事件、间歇血压与医护处置</h2></div>
      <div className="mt-5 grid grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <div className="grid grid-cols-[0.6fr_0.9fr_1fr_1.5fr] bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-500"><span>版本</span><span>事件</span><span>数值/时间</span><span>处置与复核</span></div>
          {data.safetyEvents.map((event) => <div key={event.id} className="grid grid-cols-[0.6fr_0.9fr_1fr_1.5fr] border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"><span className="font-bold text-slate-800">{event.prescriptionVersionId}</span><span><b className={event.severity === "关注" ? "text-amber-700" : "text-sky-700"}>{event.type}</b><br />{event.severity}</span><span>{event.value}<br />{event.occurredAt}</span><span>{event.action}<br /><b className="text-medical-700">{event.review}</b></span></div>)}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <div className="grid grid-cols-[0.55fr_1fr_1fr_0.8fr] bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-500"><span>版本</span><span>训练前</span><span>最近训练后</span><span>完整性</span></div>
          {bpRows.map((row) => <div key={row[0]} className="grid grid-cols-[0.55fr_1fr_1fr_0.8fr] border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"><span className="font-bold text-slate-800">{row[0]}</span><span>{row[1]}{row[1] !== "未采集" && " mmHg"}</span><span>{row[2]}{row[2] !== "未采集" && " mmHg"}</span><span className={row[3] === "完整" ? "text-emerald-700" : "font-bold text-amber-700"}>{row[3]}</span></div>)}
          <p className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">血压为训练前后间歇测量，不代表连续实时血压。</p>
        </div>
      </div>
    </article>
  );
}

function FunctionalAssessmentSection() {
  const formatValue = (value: number | null, unit: string) => value === null ? "未评估" : `${value} ${unit}`;
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-medical-600">能力变化</p><h2 className="mt-1 text-lg font-bold text-slate-950">基线与阶段末评估</h2></div><TrendingUp className="h-6 w-6 text-medical-600" /></div>
      <div className="mt-4 grid grid-cols-[1fr_0.9fr_0.9fr_0.8fr] bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-500"><span>指标</span><span>基线</span><span>阶段末</span><span>变化</span></div>
      {stageReportData.functionalAssessments.map((item) => {
        const change = item.latest === null || item.baseline === null ? "—" : `${item.latest - item.baseline > 0 ? "+" : ""}${(item.latest - item.baseline).toFixed(1)}`;
        return <div key={item.metric} className="grid grid-cols-[1fr_0.9fr_0.9fr_0.8fr] border-t border-slate-100 px-3 py-3 text-[11px] text-slate-600"><span className="font-bold text-slate-800">{item.metric}</span><span>{formatValue(item.baseline, item.unit)}</span><span className={item.latest === null ? "font-bold text-amber-700" : ""}>{formatValue(item.latest, item.unit)}</span><span className="font-bold text-medical-700">{change}</span></div>;
      })}
    </article>
  );
}

function PatientOutcomeSection() {
  const outcomes = stageReportData.patientReportedOutcomes;
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div><p className="text-xs font-bold text-medical-600">患者感受与依从性</p><h2 className="mt-1 text-lg font-bold text-slate-950">同等或更高工作量下，RPE逐步下降</h2></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {outcomes.map((item) => <div key={item.prescriptionVersionId} className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-xs font-bold text-slate-500">{item.prescriptionVersionId}</p><p className="mt-2 text-2xl font-bold text-slate-950">{item.avgRpe}</p><p className="text-[9px] text-slate-400">平均RPE</p><div className="mt-3 space-y-1.5 text-left text-[9px] text-slate-500"><p>信心 <b className="float-right text-slate-700">{item.confidence}%</b></p><p>准备度 <b className="float-right text-slate-700">{item.readiness}%</b></p><p>依从性 <b className="float-right text-slate-700">{item.adherence}%</b></p></div></div>)}
      </div>
      <div className="mt-4 rounded-2xl bg-medical-50 p-3 text-xs leading-5 text-medical-900"><b>医生解读：</b>V4平均功率高于V1约20W，而平均心率接近，RPE较V3由12.7回落至11，提示运动耐量改善；仍需结合剩余训练和阶段末CPET确认。</div>
    </article>
  );
}

function ProfileScreen({ onBack }: { onBack: () => void }) {
  const rows = [["姓名 / 性别", `${patient.name} / ${patient.sex}`], ["年龄", `${patient.age} 岁`], ["康复分组", patient.group], ["康复阶段", patient.stage], ["运动风险", patient.risk], ["计划进度", `${patient.completed} / ${patient.sessions} 次`], ["上次处方", "功率车 · 108 bpm · 30 分钟"], ["训练频次", "每周 3 次"]];
  return <section className="rounded-3xl border border-white bg-white p-7 shadow-card"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-medical-600">患者建档信息</p><h1 className="mt-1 text-2xl font-bold text-slate-950">个人康复档案</h1></div><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> 返回首页</button></div><div className="mt-7 grid grid-cols-2 gap-4">{rows.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-lg font-bold text-slate-900">{value}</p></div>)}</div><div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">临床分组、风险等级与运动处方仅可由医护端修改；患者端用于查看和确认。</div></section>;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}
