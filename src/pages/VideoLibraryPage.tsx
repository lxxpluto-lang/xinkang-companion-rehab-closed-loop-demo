import { useEffect, useRef, useState } from "react";
import { Ban, CheckCircle2, ExternalLink, FileVideo, Link2, Play, Upload, Video } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";

type VideoCategory = "呼吸训练" | "有氧运动" | "抗阻运动" | "柔韧性运动" | "中医运动";
type TrainingVideo = {
  id: string;
  title: string;
  category: VideoCategory;
  subtype: string;
  source: "bilibili" | "upload";
  url: string;
  status: "已发布" | "未发布";
  fileSize?: string;
};

const initialVideos: TrainingVideo[] = [
  { id: "VIDEO-BDJ-001", title: "八段锦完整教学", category: "中医运动", subtype: "八段锦", source: "bilibili", url: "https://player.bilibili.com/player.html?bvid=BV1gT4y1m7ec&page=1&high_quality=1&danmaku=0", status: "已发布" },
  { id: "VIDEO-BREATH-001", title: "腹式呼吸基础练习", category: "呼吸训练", subtype: "腹式呼吸", source: "upload", url: "", status: "未发布" },
  { id: "VIDEO-RESIST-001", title: "弹力带上肢训练", category: "抗阻运动", subtype: "弹力带", source: "upload", url: "", status: "未发布" }
];

const categorySubtypes: Record<VideoCategory, string[]> = {
  呼吸训练: ["腹式呼吸", "正念呼吸"],
  有氧运动: ["功率车", "椭圆机"],
  抗阻运动: ["哑铃", "弹力带"],
  柔韧性运动: ["上肢拉伸", "下肢拉伸", "全身柔韧"],
  中医运动: ["八段锦", "太极拳"]
};

export function VideoLibraryPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>(initialVideos);
  const [sourceMode, setSourceMode] = useState<"upload" | "bilibili">("upload");
  const [category, setCategory] = useState<VideoCategory>("中医运动");
  const [title, setTitle] = useState("");
  const [subtype, setSubtype] = useState(categorySubtypes["中医运动"][0]);
  const [bilibiliUrl, setBilibiliUrl] = useState("");
  const [initialStatus, setInitialStatus] = useState<TrainingVideo["status"]>("未发布");
  const [linkError, setLinkError] = useState("");
  const [previewId, setPreviewId] = useState("VIDEO-BDJ-001");
  const uploadedObjectUrls = useRef<string[]>([]);

  useEffect(() => () => uploadedObjectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function changeCategory(next: VideoCategory) {
    setCategory(next);
    setSubtype(categorySubtypes[next][0]);
  }

  function uploadFile(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    uploadedObjectUrls.current.push(url);
    const record: TrainingVideo = {
      id: `VIDEO-UPLOAD-${Date.now()}`,
      title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
      category,
      subtype,
      source: "upload",
      url,
      status: initialStatus,
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`
    };
    setVideos((items) => [record, ...items]);
    setPreviewId(record.id);
    setTitle("");
  }

  function addBilibiliLink() {
    const bvid = bilibiliUrl.match(/BV[0-9A-Za-z]{10}/i)?.[0];
    if (!bvid) {
      setLinkError("未识别到有效的 BV 号，请粘贴标准B站视频页或播放器链接。");
      return;
    }
    const record: TrainingVideo = {
      id: `VIDEO-BILIBILI-${Date.now()}`,
      title: title.trim() || `${subtype}跟练视频`,
      category,
      subtype,
      source: "bilibili",
      url: `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0`,
      status: initialStatus
    };
    setVideos((items) => [record, ...items]);
    setPreviewId(record.id);
    setBilibiliUrl("");
    setTitle("");
    setLinkError("");
  }

  function changeStatus(videoId: string, status: TrainingVideo["status"]) {
    setVideos((items) => items.map((video) => video.id === videoId ? { ...video, status } : video));
  }

  const preview = videos.find((video) => video.id === previewId) ?? videos[0];

  return (
    <section data-testid="page-VIEW-VIDEO-LIBRARY">
      <PageHeader eyebrow="训练内容管理" title="训练视频库" description="按运动大类和子类型管理患者跟练视频。上传文件仅用于当前本地Demo会话，正式系统需接入授权素材存储与发布审核。" action={<StatusBadge tone="blue"><Video className="h-3.5 w-3.5" />{videos.filter((video) => video.status === "已发布").length} 个已发布</StatusBadge>} />
      <div className="mb-5 flex gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {(Object.keys(categorySubtypes) as VideoCategory[]).map((item) => <button type="button" key={item} onClick={() => changeCategory(item)} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold ${category === item ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{item}</button>)}
      </div>
      <div className="grid grid-cols-[0.78fr_1.22fr] gap-5">
        <div className="space-y-5">
          <section className="card p-5">
            <SectionHeader title="添加训练视频" description="支持上传院内视频文件，或粘贴B站视频链接。" />
            <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => { setSourceMode("upload"); setLinkError(""); }} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${sourceMode === "upload" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}><Upload className="h-4 w-4" />上传本地视频</button>
              <button type="button" onClick={() => setSourceMode("bilibili")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${sourceMode === "bilibili" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}><Link2 className="h-4 w-4" />添加B站链接</button>
            </div>
            <label className="block"><span className="field-label">视频名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="text-field" placeholder="例如：腹式呼吸基础练习" /></label>
            <label className="mt-4 block"><span className="field-label">训练子类型</span><select value={subtype} onChange={(event) => setSubtype(event.target.value)} className="text-field">{categorySubtypes[category].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="mt-4 block"><span className="field-label">初始发布状态</span><select value={initialStatus} onChange={(event) => setInitialStatus(event.target.value as TrainingVideo["status"])} className="text-field"><option>未发布</option><option>已发布</option></select></label>
            {sourceMode === "upload" ? (
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-5 py-8 text-center hover:border-blue-400">
                <Upload className="h-7 w-7 text-blue-600" />
                <span className="mt-3 font-bold text-blue-800">选择本地视频文件</span>
                <span className="mt-1 text-[10px] text-slate-500">支持 MP4、MOV、WebM；可选择直接发布或暂存为未发布</span>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(event) => uploadFile(event.target.files?.[0])} />
              </label>
            ) : (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <label className="block"><span className="field-label">B站视频链接</span><input value={bilibiliUrl} onChange={(event) => { setBilibiliUrl(event.target.value); setLinkError(""); }} className="text-field bg-white" placeholder="https://www.bilibili.com/video/BV..." /></label>
                <p className={`mt-2 text-[10px] ${linkError ? "font-bold text-red-600" : "text-slate-500"}`}>{linkError || "支持标准视频页链接和包含 bvid 的播放器链接。"}</p>
                <button type="button" onClick={addBilibiliLink} className="btn-primary mt-4 w-full"><Link2 className="h-4 w-4" />添加并预览</button>
              </div>
            )}
          </section>
          <section className="card overflow-hidden">
            <div className="px-5 pt-5"><SectionHeader title={`${category}视频`} /></div>
            {videos.filter((video) => video.category === category).map((video) => <button type="button" key={video.id} onClick={() => setPreviewId(video.id)} className={`flex w-full items-center gap-3 border-t border-slate-100 px-5 py-3 text-left ${preview.id === video.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200"><FileVideo className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block truncate text-slate-800">{video.title}</b><small className="mt-1 block text-slate-400">{video.subtype} · {video.source === "bilibili" ? "外部在线播放" : video.fileSize || "待上传"}</small></span><StatusBadge tone={video.status === "已发布" ? "green" : "orange"}>{video.status}</StatusBadge></button>)}
          </section>
        </div>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold text-blue-600">患者端发布预览</p><h2 className="mt-1 text-lg font-bold text-slate-900">{preview.title}</h2></div><StatusBadge tone={preview.status === "已发布" ? "green" : "orange"}>{preview.status}</StatusBadge></div>
          <div className="relative aspect-video bg-slate-950">
            {preview.url ? preview.source === "bilibili" ? <iframe title={preview.title} src={preview.url} className="absolute inset-0 h-full w-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" /> : <video src={preview.url} className="h-full w-full" controls /> : <div className="flex h-full flex-col items-center justify-center text-slate-400"><Play className="h-12 w-12" /><p className="mt-3 text-xs">尚未上传视频文件</p></div>}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">{[["运动大类", preview.category], ["训练子类型", preview.subtype], ["素材来源", preview.source === "bilibili" ? "B站官方播放器" : "院内上传文件"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold text-slate-800">{value}</p></div>)}</div>
            {preview.source === "bilibili" && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" /><span>该条目使用B站官方播放器嵌入，不复制第三方视频文件。正式发布前应确认院内使用范围、网络条件和内容授权。</span></div>}
            <div className="mt-5 flex justify-end gap-3">
              {preview.status === "已发布" ? (
                <button type="button" onClick={() => changeStatus(preview.id, "未发布")} className="btn-secondary"><Ban className="h-4 w-4" />取消发布</button>
              ) : (
                <button type="button" disabled={!preview.url} onClick={() => changeStatus(preview.id, "已发布")} className="btn-primary"><CheckCircle2 className="h-4 w-4" />发布到患者端</button>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
