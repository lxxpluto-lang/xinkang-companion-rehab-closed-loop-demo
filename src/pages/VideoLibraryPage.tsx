import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Ban, CheckCircle2, FileVideo, FolderOpen, Link as LinkIcon, Play, RotateCcw, Send, ShieldCheck, Trash2, Upload, Video } from "lucide-react";
import { can } from "../accessControl";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { ContentStatus, Role } from "../types";

export type VideoCategory = "呼吸训练" | "有氧运动" | "抗阻运动" | "柔韧性运动" | "中医运动";
export type PublishedTrainingVideo = {
  id: string;
  title: string;
  category: VideoCategory;
  subtype: string;
  source: "local" | "upload" | "link";
  url: string;
};
export type TrainingVideo = PublishedTrainingVideo & {
  status: ContentStatus;
  fileSize?: string;
  updatedBy?: string;
};

const localVideoUrl = (fileName: string) => `/local-training-videos/${encodeURIComponent(fileName)}`;
const qiantanVideo = "云逛魔都 4K HDR ｜ 前滩夏日的傍晚：从繁华的太古里到静謐江滨绿道 [BV1HKKt6eEdh].mp4";
const bikeVideo = "云逛魔都 4K HDR ｜ 沉浸式体验陆家嘴滨江骑行：南浦大桥到杨浦大桥 [BV1HKgX6LEe1].mp4";
const breathingVideoUrl = "https://www.bilibili.com/video/BV1Av4y1p7SL/";

export const initialTrainingVideos: TrainingVideo[] = [
  { id: "VIDEO-BIKE-LOCAL-001", title: "云逛魔都 4K HDR ｜沉浸式滨江骑行", category: "有氧运动", subtype: "功率车", source: "local", url: localVideoUrl(bikeVideo), status: "PUBLISHED", fileSize: "871 MB", updatedBy: "服务器视频目录" },
  { id: "VIDEO-BIKE-LOCAL-002", title: "前滩夏日傍晚骑行", category: "有氧运动", subtype: "功率车", source: "local", url: localVideoUrl(qiantanVideo), status: "PUBLISHED", fileSize: "983 MB", updatedBy: "本地视频目录" },
  { id: "VIDEO-BREATH-LINK-001", title: "腹式呼吸与正念呼吸指导", category: "呼吸训练", subtype: "腹式呼吸", source: "link", url: breathingVideoUrl, status: "PUBLISHED", updatedBy: "王医生" },
  { id: "VIDEO-BADUANJIN-LINK-001", title: "八段锦康复跟练", category: "中医运动", subtype: "八段锦", source: "link", url: breathingVideoUrl, status: "PUBLISHED", updatedBy: "周康复师" },
  { id: "VIDEO-RESIST-001", title: "弹力带上肢训练", category: "抗阻运动", subtype: "弹力带", source: "upload", url: "", status: "PENDING", updatedBy: "周康复师" },
  { id: "VIDEO-BIKE-OLD", title: "功率车旧版热身", category: "有氧运动", subtype: "功率车", source: "upload", url: "", status: "OFFLINE", updatedBy: "林管理员" }
];

const categorySubtypes: Record<VideoCategory, string[]> = {
  呼吸训练: ["腹式呼吸", "正念呼吸"],
  有氧运动: ["功率车", "椭圆机"],
  抗阻运动: ["哑铃", "弹力带"],
  柔韧性运动: ["上肢拉伸", "下肢拉伸", "全身柔韧"],
  中医运动: ["八段锦", "太极拳"]
};

export const statusMeta: Record<ContentStatus, { label: string; tone: "green" | "orange" | "blue" | "gray" | "red" }> = {
  DRAFT: { label: "草稿", tone: "gray" },
  PENDING: { label: "待发布", tone: "orange" },
  PUBLISHED: { label: "已发布", tone: "green" },
  OFFLINE: { label: "已下架", tone: "blue" },
  RECYCLED: { label: "回收站", tone: "red" }
};

export function VideoLibraryPage({
  videos,
  setVideos,
  role
}: {
  videos: TrainingVideo[];
  setVideos: Dispatch<SetStateAction<TrainingVideo[]>>;
  role: Exclude<Role, "PATIENT">;
}) {
  const [category, setCategory] = useState<VideoCategory>("有氧运动");
  const [title, setTitle] = useState("");
  const [subtype, setSubtype] = useState(categorySubtypes["有氧运动"][0]);
  const [externalUrl, setExternalUrl] = useState("");
  const [previewId, setPreviewId] = useState("VIDEO-BIKE-LOCAL-001");
  const canPublish = can(role, "PUBLISH");
  const canDelete = can(role, "DELETE");
  const canPermanentDelete = can(role, "PERMANENT_DELETE");
  const visibleVideos = useMemo(() => videos.filter((video) => video.status !== "RECYCLED" || role === "ADMIN"), [role, videos]);

  function changeCategory(next: VideoCategory) {
    setCategory(next);
    setSubtype(categorySubtypes[next][0]);
  }

  function addRecord(record: TrainingVideo) {
    setVideos((items) => [record, ...items]);
    setPreviewId(record.id);
    setTitle("");
  }

  function uploadFile(file?: File) {
    if (!file) return;
    addRecord({
      id: `VIDEO-UPLOAD-${Date.now()}`,
      title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
      category,
      subtype,
      source: "upload",
      url: URL.createObjectURL(file),
      status: "DRAFT",
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      updatedBy: role === "DOCTOR" ? "王医生" : role === "REHAB_EXECUTION" ? "周康复师" : "林管理员"
    });
  }

  function addExternalLink() {
    const url = externalUrl.trim();
    if (!/^https?:\/\//.test(url)) return;
    addRecord({ id: `VIDEO-LINK-${Date.now()}`, title: title.trim() || "外部训练视频", category, subtype, source: "link", url, status: "DRAFT", updatedBy: role === "DOCTOR" ? "王医生" : "周康复师" });
    setExternalUrl("");
  }

  function changeStatus(videoId: string, status: ContentStatus) {
    setVideos((items) => items.map((video) => video.id === videoId ? { ...video, status, updatedBy: role === "ADMIN" ? "林管理员" : role === "DOCTOR" ? "王医生" : "周康复师" } : video));
  }

  function permanentDelete(videoId: string) {
    if (!window.confirm("永久删除后不可恢复，确认继续？该操作会写入审计日志。")) return;
    setVideos((items) => items.filter((video) => video.id !== videoId));
    setPreviewId(videos.find((video) => video.id !== videoId)?.id ?? "");
  }

  const preview = visibleVideos.find((video) => video.id === previewId) ?? visibleVideos[0];

  return (
    <section data-testid="page-VIEW-VIDEO-LIBRARY">
      <PageHeader
        eyebrow="训练内容 · 动作权限可配置"
        title="视频资源"
        description={canPublish ? "当前账号具有发布、下架和回收权限。永久删除需要独立权限及二次确认。" : "医生与康复执行岗可上传、编辑草稿并提交发布；正式发布、下架和删除由授权人员处理。"}
        action={<div className="flex gap-2"><StatusBadge tone="green"><Video className="h-3.5 w-3.5" />{videos.filter((video) => video.status === "PUBLISHED").length} 个已发布</StatusBadge><StatusBadge tone="orange">{videos.filter((video) => video.status === "PENDING").length} 个待发布</StatusBadge></div>}
      />
      <div className="mb-5 flex gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {(Object.keys(categorySubtypes) as VideoCategory[]).map((item) => <button type="button" key={item} onClick={() => changeCategory(item)} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold ${category === item ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{item}</button>)}
      </div>
      <div className="grid grid-cols-[0.78fr_1.22fr] gap-5">
        <div className="space-y-5">
            <section className="card p-5">
            <SectionHeader title="添加训练视频" description="支持本地文件上传，也支持通过链接嵌入；保存后先进入草稿。" />
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
              <FolderOpen className="mt-0.5 h-5 w-5 shrink-0" />
              <span>功率车使用站点视频目录 <b>/local-training-videos</b>（服务器与本机开发环境通用）；呼吸训练和中医运动也可通过外部链接嵌入。患者端只展示已发布且与处方项目匹配的内容。</span>
            </div>
            <label className="block"><span className="field-label">视频名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="text-field" placeholder="例如：腹式呼吸基础练习" /></label>
            <label className="mt-4 block"><span className="field-label">训练子类型</span><select value={subtype} onChange={(event) => setSubtype(event.target.value)} className="text-field">{categorySubtypes[category].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-5 py-8 text-center hover:border-blue-400">
              <Upload className="h-7 w-7 text-blue-600" /><span className="mt-3 font-bold text-blue-800">选择本地视频文件</span><span className="mt-1 text-[10px] text-slate-500">支持 MP4、MOV、WebM · 保存后进入我的草稿</span>
              <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(event) => uploadFile(event.target.files?.[0])} />
            </label>
            <div className="mt-4 rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-700"><LinkIcon className="h-4 w-4 text-blue-600" />链接嵌入</div><div className="mt-2 flex gap-2"><input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className="text-field flex-1" placeholder="https://..." /><button type="button" onClick={addExternalLink} disabled={!externalUrl.trim()} className="btn-secondary disabled:opacity-50">保存链接</button></div><p className="mt-2 text-[10px] text-slate-400">正式发布前由管理员确认来源和适用运动项目。</p></div>
          </section>
          <section className="card overflow-hidden">
            <div className="px-5 pt-5"><SectionHeader title={`${category}视频`} /></div>
            {visibleVideos.filter((video) => video.category === category).map((video) => <button type="button" key={video.id} onClick={() => setPreviewId(video.id)} className={`flex w-full items-center gap-3 border-t border-slate-100 px-5 py-3 text-left ${preview?.id === video.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200"><FileVideo className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block truncate text-slate-800">{video.title}</b><small className="mt-1 block text-[10px] text-slate-400">{video.subtype} · {video.updatedBy}</small></span><StatusBadge tone={statusMeta[video.status].tone}>{statusMeta[video.status].label}</StatusBadge></button>)}
          </section>
        </div>
        {preview ? (
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold text-blue-600">内容与权限预览</p><h2 className="mt-1 text-lg font-bold text-slate-900">{preview.title}</h2></div><StatusBadge tone={statusMeta[preview.status].tone}>{statusMeta[preview.status].label}</StatusBadge></div>
            <div className="relative aspect-video bg-slate-950">
              {preview.url ? preview.source === "link" ? <iframe title={preview.title} src={preview.url} className="h-full w-full border-0" allow="autoplay; fullscreen" /> : <video src={preview.url} className="h-full w-full" controls playsInline /> : <div className="flex h-full flex-col items-center justify-center text-slate-400"><Play className="h-12 w-12" /><p className="mt-3 text-xs">尚未上传视频文件</p></div>}
            </div>
            <div className="p-5">
              <div className="grid grid-cols-4 gap-3">{[["运动大类", preview.category], ["训练子类型", preview.subtype], ["素材来源", preview.source === "local" ? "本地视频目录" : preview.source === "link" ? "外部链接" : "院内上传"], ["最近维护", preview.updatedBy || "—"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold text-slate-800">{value}</p></div>)}</div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {preview.status === "DRAFT" && <button type="button" disabled={!preview.url} onClick={() => changeStatus(preview.id, "PENDING")} className="btn-primary"><Send className="h-4 w-4" />提交发布</button>}
                {canPublish && preview.status === "PENDING" && <button type="button" disabled={!preview.url} onClick={() => changeStatus(preview.id, "PUBLISHED")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />审核并发布</button>}
                {canPublish && preview.status === "PUBLISHED" && <button type="button" onClick={() => changeStatus(preview.id, "OFFLINE")} className="btn-secondary"><Ban className="h-4 w-4" />下架</button>}
                {canPublish && preview.status === "OFFLINE" && <button type="button" onClick={() => changeStatus(preview.id, "PUBLISHED")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />重新上架</button>}
                {canDelete && preview.status !== "RECYCLED" && <button type="button" onClick={() => changeStatus(preview.id, "RECYCLED")} className="btn-secondary text-red-600"><Trash2 className="h-4 w-4" />移入回收站</button>}
                {preview.status === "RECYCLED" && canDelete && <button type="button" onClick={() => changeStatus(preview.id, "DRAFT")} className="btn-secondary"><RotateCcw className="h-4 w-4" />恢复为草稿</button>}
                {preview.status === "RECYCLED" && canPermanentDelete && <button type="button" onClick={() => permanentDelete(preview.id)} className="btn-danger"><ShieldCheck className="h-4 w-4" />永久删除</button>}
              </div>
            </div>
          </section>
        ) : <section className="card flex items-center justify-center text-slate-400">当前分类暂无视频</section>}
      </div>
    </section>
  );
}
