export type LocalTrainingVideoDefinition = {
  id: string;
  title: string;
  category: "呼吸训练" | "有氧运动" | "中医运动";
  subtype: "腹式呼吸" | "功率车" | "八段锦";
  fileName: string;
  fileSize: string;
  updatedBy: string;
};

export const localTrainingVideoDefinitions: LocalTrainingVideoDefinition[] = [
  {
    id: "VIDEO-BIKE-LOCAL-001",
    title: "云逛魔都 4K HDR｜沉浸式滨江骑行",
    category: "有氧运动",
    subtype: "功率车",
    fileName: "云逛魔都 4K HDR ｜ 沉浸式体验陆家嘴滨江骑行：南浦大桥到杨浦大桥 [BV1HKgX6LEe1].mp4",
    fileSize: "8.1 MB",
    updatedBy: "部署视频目录"
  },
  {
    id: "VIDEO-BIKE-LOCAL-002",
    title: "前滩夏日傍晚骑行",
    category: "有氧运动",
    subtype: "功率车",
    fileName: "云逛魔都 4K HDR ｜ 前滩夏日的傍晚：从繁华的太古里到静謐江滨绿道 [BV1HKKt6eEdh].mp4",
    fileSize: "6.0 MB",
    updatedBy: "部署视频目录"
  },
  {
    id: "VIDEO-BREATH-LOCAL-001",
    title: "腹式呼吸指导",
    category: "呼吸训练",
    subtype: "腹式呼吸",
    fileName: "腹式呼吸_BV1Av4y1p7SL.mp4",
    fileSize: "21 MB",
    updatedBy: "部署视频目录"
  },
  {
    id: "VIDEO-BADUANJIN-LOCAL-001",
    title: "八段锦康复跟练",
    category: "中医运动",
    subtype: "八段锦",
    fileName: "八段锦_BV1gT4y1m7ec.mp4",
    fileSize: "75 MB",
    updatedBy: "部署视频目录"
  }
];

export const localBikeVideoFileNames = new Set(
  localTrainingVideoDefinitions.filter((video) => video.subtype === "功率车").map((video) => video.fileName)
);

export function localTrainingVideoUrl(fileName: string) {
  return `/training-videos/${encodeURIComponent(fileName)}`;
}
