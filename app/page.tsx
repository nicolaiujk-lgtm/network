"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Globe2,
  Languages,
  Loader2,
  Search,
  SlidersHorizontal,
  Tags,
  TrendingUp,
  Wand2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ActiveWindow = "any" | "7" | "30" | "90";
type UploadFrequencyFilter = "any" | "weekly-3-plus" | "weekly" | "monthly";

type Creator = {
  name: string;
  handle: string;
  channelId: string;
  channelUrl: string;
  profileImage: string;
  platform: "YouTube";
  flag: string;
  region: string;
  regionCode: string;
  language: string;
  languageCode: string;
  followers: string;
  followersCount: number | null;
  avgViews: string;
  avgViewsCount: number | null;
  engagement: string;
  engagementRateRaw: number | null;
  email: string;
  emails: string[];
  tags: string[];
  lastUpload: string;
  lastUploadAt: string | null;
  lastUploadDaysAgo: number | null;
  uploadFrequency: string;
  uploadsPerWeekRaw: number | null;
  score: number;
  description: string;
};

type YouTubeCreatorResponse = {
  channelTitle: string;
  channelId: string;
  profileImage: string;
  subscriberCount: string;
  subscriberCountRaw: number | null;
  description: string;
  channelUrl: string;
  averageViews?: string;
  averageViewsRaw: number | null;
  engagementRate: string;
  engagementRateRaw: number | null;
  lastUpload: string;
  lastUploadAt: string | null;
  lastUploadDaysAgo: number | null;
  uploadFrequency: string;
  uploadsPerWeekRaw: number | null;
  region: string;
  regionCode: string;
  language: string;
  languageCode: string;
  email: string;
  emails: string[];
};

type FilterState = {
  regions: string[];
  languages: string[];
  minFollowers: number;
  minAverageViews: number;
  minEngagementRate: number;
  activeWithinDays: ActiveWindow;
  uploadFrequency: UploadFrequencyFilter;
};

type RangeOption = {
  value: number;
  label: string;
  selectedLabel?: string;
};

const filters = {
  地区: ["巴西", "美国", "欧洲", "韩国", "日本", "泰国", "越南", "印尼", "菲律宾", "港台", "俄罗斯", "阿拉伯", "土耳其"],
  语言: ["葡萄牙语", "西班牙语", "英语", "韩语", "日语", "泰语", "越南语", "印尼语", "菲律宾语", "中文", "俄语", "阿拉伯语", "土耳其语"]
};

const activeWindowOptions: Array<{ label: string; value: ActiveWindow }> = [
  { label: "不限", value: "any" },
  { label: "近 7 天", value: "7" },
  { label: "近 30 天", value: "30" },
  { label: "近 90 天", value: "90" }
];

const uploadFrequencyOptions: Array<{ label: string; value: UploadFrequencyFilter }> = [
  { label: "不限", value: "any" },
  { label: "每周 3 次以上", value: "weekly-3-plus" },
  { label: "每周更新", value: "weekly" },
  { label: "每月更新", value: "monthly" }
];

const defaultFilterState: FilterState = {
  regions: [],
  languages: [],
  minFollowers: 1000,
  minAverageViews: 300,
  minEngagementRate: 0,
  activeWithinDays: "any",
  uploadFrequency: "any"
};

const followerRangeOptions: RangeOption[] = [
  { value: 1000, label: "1K", selectedLabel: "1K+" },
  { value: 10000, label: "1w", selectedLabel: "1w+" },
  { value: 50000, label: "5w", selectedLabel: "5w+" },
  { value: 100000, label: "10w", selectedLabel: "10w+" },
  { value: 200000, label: "20w", selectedLabel: "20w+" },
  { value: 300000, label: "30w", selectedLabel: "30w+" },
  { value: 500000, label: "50w", selectedLabel: "50w+" },
  { value: 1000000, label: "100w", selectedLabel: "100w+" }
];

const engagementRangeOptions: RangeOption[] = [
  { value: 0, label: "0", selectedLabel: "不限" },
  { value: 5, label: "5%", selectedLabel: "5%+" },
  { value: 10, label: "10%", selectedLabel: "10%+" },
  { value: 15, label: "15%", selectedLabel: "15%+" }
];

const averageViewRangeOptions: RangeOption[] = [
  { value: 300, label: "300", selectedLabel: "300+" },
  { value: 500, label: "500", selectedLabel: "500+" },
  { value: 1000, label: "1k", selectedLabel: "1k+" },
  { value: 5000, label: "5k", selectedLabel: "5k+" },
  { value: 10000, label: "1w+", selectedLabel: "1w+" }
];

const regionCodeGroups: Record<string, string[]> = {
  巴西: ["BR"],
  美国: ["US"],
  欧洲: ["GB", "DE", "FR", "ES", "IT", "NL", "PL", "SE", "NO", "DK", "FI", "PT"],
  韩国: ["KR"],
  日本: ["JP"],
  泰国: ["TH"],
  越南: ["VN"],
  印尼: ["ID"],
  菲律宾: ["PH"],
  港台: ["HK", "TW", "MO"],
  俄罗斯: ["RU"],
  阿拉伯: ["AE", "SA", "EG", "QA", "KW", "BH", "OM", "JO", "LB", "IQ", "MA", "DZ", "TN"],
  土耳其: ["TR"]
};

const languageCodeGroups: Record<string, string[]> = {
  葡萄牙语: ["pt"],
  西班牙语: ["es"],
  英语: ["en"],
  韩语: ["ko"],
  日语: ["ja"],
  泰语: ["th"],
  越南语: ["vi"],
  印尼语: ["id"],
  菲律宾语: ["tl", "fil"],
  中文: ["zh"],
  俄语: ["ru"],
  阿拉伯语: ["ar"],
  土耳其语: ["tr"]
};

const uploadFrequencyThresholds: Record<Exclude<UploadFrequencyFilter, "any">, number> = {
  "weekly-3-plus": 3,
  weekly: 1,
  monthly: 0.25
};

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

const percentageFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

function inferTags(query: string, description: string) {
  const source = `${query} ${description}`.toLowerCase();
  const tags = [
    ["Roblox", "roblox"],
    ["移动游戏", "mobile"],
    ["MMORPG", "mmorpg"],
    ["沙盒", "sandbox"],
    ["模拟经营", "simulation"],
    ["二次元游戏", "anime"]
  ]
    .filter(([, keyword]) => source.includes(keyword))
    .map(([tag]) => tag);

  return tags.length > 0 ? tags.slice(0, 3) : ["YouTube", "游戏内容", "创作者"];
}

function normalizeCreator(item: YouTubeCreatorResponse, query: string, index: number): Creator {
  return {
    name: item.channelTitle,
    handle: `频道 ID：${item.channelId}`,
    channelId: item.channelId,
    channelUrl: item.channelUrl,
    profileImage: item.profileImage,
    platform: "YouTube",
    flag: "🌐",
    region: item.region,
    regionCode: item.regionCode,
    language: item.language,
    languageCode: item.languageCode,
    followers: item.subscriberCount,
    followersCount: item.subscriberCountRaw,
    avgViews: item.averageViews ?? "暂未提供",
    avgViewsCount: item.averageViewsRaw,
    engagement: item.engagementRate,
    engagementRateRaw: item.engagementRateRaw,
    email: item.email,
    emails: item.emails,
    tags: inferTags(query, item.description),
    lastUpload: item.lastUpload,
    lastUploadAt: item.lastUploadAt,
    lastUploadDaysAgo: item.lastUploadDaysAgo,
    uploadFrequency: item.uploadFrequency,
    uploadsPerWeekRaw: item.uploadsPerWeekRaw,
    score: Math.max(82, 96 - index * 3),
    description: item.description || "该频道暂未提供简介，可进入 YouTube 主页查看完整内容与近期视频。"
  };
}

function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

function formatPercentage(value: number) {
  return `${percentageFormatter.format(value)}%`;
}

function getRangeOptionIndex(value: number, options: RangeOption[]) {
  const optionIndex = options.findIndex((option) => option.value === value);

  return optionIndex >= 0 ? optionIndex : 0;
}

function getSelectedRangeLabel(value: number, options: RangeOption[]) {
  const safeIndex = getRangeOptionIndex(value, options);
  const option = options[safeIndex];

  return option.selectedLabel ?? option.label;
}

function buildSearchQuery(baseQuery: string, regions: string[], languages: string[]) {
  const segments = [baseQuery.trim(), ...regions, ...languages].filter(Boolean);
  const uniqueSegments = Array.from(new Set(segments));

  return uniqueSegments.join(" ").trim();
}

function matchesSelectedGroup(value: string, selected: string[], groups: Record<string, string[]>) {
  if (selected.length === 0) return true;
  if (!value) return true;

  return selected.some((item) => groups[item]?.includes(value));
}

function matchesActiveWindow(lastUploadDaysAgo: number | null, activeWithinDays: ActiveWindow) {
  if (activeWithinDays === "any") return true;

  return typeof lastUploadDaysAgo === "number" && lastUploadDaysAgo <= Number(activeWithinDays);
}

function matchesUploadFrequency(
  uploadsPerWeekRaw: number | null,
  uploadFrequency: UploadFrequencyFilter
) {
  if (uploadFrequency === "any") return true;

  return (
    typeof uploadsPerWeekRaw === "number" &&
    uploadsPerWeekRaw >= uploadFrequencyThresholds[uploadFrequency]
  );
}

function filterCreators(creators: Creator[], filterState: FilterState) {
  return creators.filter((creator) => {
    const matchesRegion = matchesSelectedGroup(creator.regionCode, filterState.regions, regionCodeGroups);
    const matchesLanguage = matchesSelectedGroup(
      creator.languageCode,
      filterState.languages,
      languageCodeGroups
    );
    const matchesFollowers =
      typeof creator.followersCount !== "number" || creator.followersCount >= filterState.minFollowers;
    const matchesAverageViews =
      typeof creator.avgViewsCount !== "number" ||
      creator.avgViewsCount >= filterState.minAverageViews;
    const matchesEngagement =
      filterState.minEngagementRate <= 0 ||
      (typeof creator.engagementRateRaw === "number" &&
        creator.engagementRateRaw >= filterState.minEngagementRate);
    const matchesRecentActivity = matchesActiveWindow(
      creator.lastUploadDaysAgo,
      filterState.activeWithinDays
    );
    const matchesFrequency = matchesUploadFrequency(
      creator.uploadsPerWeekRaw,
      filterState.uploadFrequency
    );

    return (
      matchesRegion &&
      matchesLanguage &&
      matchesFollowers &&
      matchesAverageViews &&
      matchesEngagement &&
      matchesRecentActivity &&
      matchesFrequency
    );
  });
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCreatorsToCsv(creators: Creator[], query: string) {
  const headers = [
    "名字",
    "频道链接",
    "国家/地区",
    "地区代码",
    "语言",
    "粉丝数量",
    "粉丝数原始值",
    "平均播放",
    "互动率",
    "最近活跃",
    "更新频率",
    "邮箱",
    "频道ID",
    "频道简介"
  ];
  const rows = creators.map((creator) => [
    creator.name,
    creator.channelUrl,
    creator.region,
    creator.regionCode || "未公开",
    creator.language,
    creator.followers,
    creator.followersCount ?? "未公开",
    creator.avgViews,
    creator.engagement,
    creator.lastUpload,
    creator.uploadFrequency,
    creator.email,
    creator.channelId,
    creator.description
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeQuery = query.trim().replace(/[\\/:*?"<>|]+/g, "-") || "youtube-creators";

  link.href = url;
  link.download = `${safeQuery}-博主搜索结果.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [query, setQuery] = useState("Roblox 巴西");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const didRunInitialSearch = useRef(false);
  const previousServerFilterSignature = useRef("");

  const searchCreators = useCallback(async (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      setCreators([]);
      setSelectedCreator(null);
      setHasSearched(true);
      return;
    }

    setIsLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(trimmedQuery)}`);
      const data = (await response.json()) as {
        creators?: YouTubeCreatorResponse[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "YouTube 检索失败，请稍后重试。");
      }

      const normalizedCreators = (data.creators ?? []).map((item, index) =>
        normalizeCreator(item, trimmedQuery, index)
      );
      setCreators(normalizedCreators);
      setSelectedCreator(null);
    } catch (searchError) {
      setCreators([]);
      setSelectedCreator(null);
      setError(searchError instanceof Error ? searchError.message : "YouTube 检索失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runSearch = useCallback(
    (nextBaseQuery: string) => {
      searchCreators(buildSearchQuery(nextBaseQuery, filterState.regions, filterState.languages));
    },
    [filterState.languages, filterState.regions, searchCreators]
  );

  const serverFilterSignature = useMemo(
    () =>
      JSON.stringify({
        regions: [...filterState.regions].sort(),
        languages: [...filterState.languages].sort()
      }),
    [filterState.languages, filterState.regions]
  );

  useEffect(() => {
    if (didRunInitialSearch.current) {
      return;
    }

    didRunInitialSearch.current = true;
    previousServerFilterSignature.current = serverFilterSignature;
    runSearch("Roblox 巴西");
  }, [runSearch, serverFilterSignature]);

  useEffect(() => {
    if (!hasSearched) {
      previousServerFilterSignature.current = serverFilterSignature;
      return;
    }

    if (previousServerFilterSignature.current === serverFilterSignature) {
      return;
    }

    previousServerFilterSignature.current = serverFilterSignature;
    runSearch(query);
  }, [hasSearched, query, runSearch, serverFilterSignature]);

  const filteredCreators = useMemo(() => filterCreators(creators, filterState), [creators, filterState]);

  useEffect(() => {
    setSelectedCreator((currentCreator) => {
      if (currentCreator && filteredCreators.some((creator) => creator.channelId === currentCreator.channelId)) {
        return currentCreator;
      }

      return null;
    });
  }, [filteredCreators]);

  const resultSummary = useMemo(() => {
    if (isLoading) return "正在从 YouTube API 获取频道数据";
    if (error) return "检索遇到问题";
    if (creators.length === 0 && hasSearched) return "暂无匹配频道";
    if (filteredCreators.length !== creators.length) {
      return `${filteredCreators.length} / ${creators.length} 个频道符合当前筛选`;
    }
    return `${creators.length} 个 YouTube 频道结果`;
  }, [creators.length, error, filteredCreators.length, hasSearched, isLoading]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <Hero
          exportCreators={creators}
          isLoading={isLoading}
          query={query}
          resultSummary={resultSummary}
          searchCreators={runSearch}
          setQuery={setQuery}
        />
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <FilterPanel filterState={filterState} setFilterState={setFilterState} />
          <SearchResults
            creators={filteredCreators}
            error={error}
            totalCreators={creators.length}
            isLoading={isLoading}
            hasSearched={hasSearched}
            searchCreators={() => runSearch(query)}
            selectedCreatorId={selectedCreator?.channelId ?? null}
            setSelectedCreator={setSelectedCreator}
          />
        </div>
      </section>
    </main>
  );
}

function Hero({
  exportCreators,
  isLoading,
  query,
  resultSummary,
  searchCreators,
  setQuery
}: {
  exportCreators: Creator[];
  isLoading: boolean;
  query: string;
  resultSummary: string;
  searchCreators: (nextQuery: string) => void;
  setQuery: (value: string) => void;
}) {
  const hasExportData = exportCreators.length > 0;

  return (
    <section className="overflow-hidden rounded-none pt-20 lg:pt-0">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.98] p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              V1 博主发现中枢
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Activity className="size-4 text-success" />
              YouTube API 实时频道检索
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            为你的新游戏快速找到合适博主
          </h1>
          <p className="mt-4 text-lg text-slate-600">通过搜索、标签筛选和相似推荐，快速发现高匹配度博主。</p>

          <form
            className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-inner"
            onSubmit={(event) => {
              event.preventDefault();
              searchCreators(query);
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-h-14 flex-1 items-center gap-3 rounded-md bg-white px-4 shadow-sm">
                <Search className="size-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="按博主、游戏、标签或关键词搜索"
                  className="w-full border-0 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                className="flex min-h-14 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-6 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : <SlidersHorizontal className="size-5" />}
                {isLoading ? "检索中" : "检索博主"}
              </button>
            </div>
          </form>

          <p className="mt-3 text-sm font-medium text-slate-500">{resultSummary}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.98] p-6 shadow-card">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">数据导出</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">导出本次搜索结果</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              导出所有 YouTube API 搜索出的博主数据，包含名字、频道链接、国家/地区、粉丝数量和邮箱。
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">可导出频道</p>
                <p className="mt-1 text-xs text-slate-500">{exportCreators.length} 个频道 · CSV 文件</p>
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-primary">
                全量搜索结果
              </span>
            </div>
          </div>

          <button
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasExportData || isLoading}
            onClick={() => exportCreatorsToCsv(exportCreators, query)}
          >
            <Download className="size-4" />
            {hasExportData ? "导出 CSV 文件" : "暂无可导出数据"}
          </button>

          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
            邮箱来自频道简介自动识别；若频道未公开邮箱，文件中会显示“未公开”。
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterPanel({
  filterState,
  setFilterState
}: {
  filterState: FilterState;
  setFilterState: (value: FilterState | ((current: FilterState) => FilterState)) => void;
}) {
  const toggleFilter = (type: "regions" | "languages", value: string) => {
    setFilterState((current) => {
      const currentValues = current[type];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...current,
        [type]: nextValues
      };
    });
  };

  const clearFilters = () => setFilterState(defaultFilterState);

  return (
    <aside className="rounded-lg border border-white/10 bg-white p-5 shadow-card xl:sticky xl:top-8 xl:self-start">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">筛选面板</p>
          <p className="mt-1 text-xs text-slate-500">按上线匹配度精准筛选博主</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-primary"
          >
            清空筛选
          </button>
          <Filter className="size-5 text-primary" />
        </div>
      </div>

      <div className="thin-scrollbar mt-5 max-h-none space-y-6 overflow-auto xl:max-h-[720px]">
        <FilterGroup
          label="地区"
          onToggle={(value) => toggleFilter("regions", value)}
          options={filters.地区}
          selectedOptions={filterState.regions}
        />
        <FilterGroup
          label="语言"
          onToggle={(value) => toggleFilter("languages", value)}
          options={filters.语言}
          selectedOptions={filterState.languages}
        />

        <RangeBlock
          label="粉丝量"
          options={followerRangeOptions}
          onChange={(value) =>
            setFilterState((current) => ({
              ...current,
              minFollowers: value
            }))
          }
          value={filterState.minFollowers}
          valueLabel={getSelectedRangeLabel(filterState.minFollowers, followerRangeOptions)}
        />
        <RangeBlock
          label="互动率"
          options={engagementRangeOptions}
          onChange={(value) =>
            setFilterState((current) => ({
              ...current,
              minEngagementRate: value
            }))
          }
          value={filterState.minEngagementRate}
          valueLabel={getSelectedRangeLabel(filterState.minEngagementRate, engagementRangeOptions)}
        />
        <RangeBlock
          label="平均播放"
          options={averageViewRangeOptions}
          onChange={(value) =>
            setFilterState((current) => ({
              ...current,
              minAverageViews: value
            }))
          }
          value={filterState.minAverageViews}
          valueLabel={getSelectedRangeLabel(filterState.minAverageViews, averageViewRangeOptions)}
        />

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="size-4 text-slate-400" />
            最近活跃时间
          </label>
          <select
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-primary"
            value={filterState.activeWithinDays}
            onChange={(event) =>
              setFilterState((current) => ({
                ...current,
                activeWithinDays: event.target.value as ActiveWindow
              }))
            }
          >
            {activeWindowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingUp className="size-4 text-slate-400" />
            更新频率
          </label>
          <select
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-primary"
            value={filterState.uploadFrequency}
            onChange={(event) =>
              setFilterState((current) => ({
                ...current,
                uploadFrequency: event.target.value as UploadFrequencyFilter
              }))
            }
          >
            {uploadFrequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}

function FilterGroup({
  label,
  onToggle,
  options,
  selectedOptions
}: {
  label: string;
  onToggle: (value: string) => void;
  options: string[];
  selectedOptions: string[];
}) {
  const iconMap: Record<string, typeof Globe2> = {
    地区: Globe2,
    语言: Languages
  };
  const Icon = iconMap[label] ?? Tags;
  const summary =
    selectedOptions.length === 0
      ? `选择${label}`
      : selectedOptions.length <= 2
        ? selectedOptions.join("、")
        : `已选 ${selectedOptions.length} 项`;

  return (
    <details className="group">
      <summary className="flex min-h-11 list-none items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-white">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">{summary}</span>
        </span>
        <span className="flex items-center gap-2">
          {selectedOptions.length > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-primary">
              {selectedOptions.length}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            <input
              checked={selectedOptions.includes(option)}
              onChange={() => onToggle(option)}
              type="checkbox"
              className="size-4 accent-primary"
            />
            <span className="min-w-0 truncate">{option}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function RangeBlock({
  label,
  options,
  onChange,
  value,
  valueLabel
}: {
  label: string;
  options: RangeOption[];
  onChange?: (value: number) => void;
  value: number | string;
  valueLabel?: string;
}) {
  const currentValue = typeof value === "number" ? value : options[0]?.value ?? 0;
  const sliderIndex = getRangeOptionIndex(currentValue, options);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs font-semibold text-primary">{valueLabel ?? value}</p>
      </div>
      {onChange ? (
        <>
          <input
            className="range-track w-full"
            max={Math.max(options.length - 1, 0)}
            min={0}
            onChange={(event) => {
              const nextIndex = Number(event.target.value);
              const nextOption = options[nextIndex] ?? options[0];

              if (nextOption) {
                onChange(nextOption.value);
              }
            }}
            step={1}
            type="range"
            value={sliderIndex}
          />
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            {options.map((option, index) => {
              const isActive = index <= sliderIndex;

              return (
                <span
                  key={`${label}-${option.value}`}
                  className={`text-center text-[11px] font-semibold transition ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {option.label}
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <input className="range-track w-full" type="range" min="0" max="100" defaultValue="72" />
      )}
    </div>
  );
}

function SearchResults({
  creators,
  error,
  hasSearched,
  isLoading,
  searchCreators,
  selectedCreatorId,
  setSelectedCreator,
  totalCreators
}: {
  creators: Creator[];
  error: string;
  hasSearched: boolean;
  isLoading: boolean;
  searchCreators: () => void;
  selectedCreatorId: string | null;
  setSelectedCreator: (creator: Creator | null) => void;
  totalCreators: number;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">博主检索</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">YouTube 频道实时检索结果</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
          {["匹配度", "订阅量", "频道质量"].map((item, index) => (
            <button
              key={item}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {isLoading && <LoadingState />}
        {!isLoading && error && <ErrorState error={error} onRetry={searchCreators} />}
        {!isLoading && !error && hasSearched && creators.length === 0 && <EmptyState hasRawResults={totalCreators > 0} />}
        {!isLoading &&
          !error &&
          creators.map((creator) => (
            <CreatorCard
              key={creator.channelId}
              creator={creator}
              isRecommendationOpen={selectedCreatorId === creator.channelId}
              similarCreators={creators.filter((item) => item.channelId !== creator.channelId).slice(0, 3)}
              setSelectedCreator={setSelectedCreator}
            />
          ))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex animate-pulse gap-4">
            <div className="size-16 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasRawResults }: { hasRawResults: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Search className="mx-auto size-9 text-slate-300" />
      <h3 className="mt-4 text-lg font-semibold text-slate-950">
        {hasRawResults ? "当前筛选条件下没有匹配频道" : "没有找到匹配的 YouTube 频道"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {hasRawResults ? "放宽筛选条件后再试一次。" : "换一个游戏、地区或内容关键词再试一次。"}
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-5">
      <h3 className="font-semibold text-red-700">YouTube API 请求失败</h3>
      <p className="mt-2 text-sm leading-6 text-red-600">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:-translate-y-0.5"
      >
        重新检索
      </button>
    </div>
  );
}

function CreatorCard({
  creator,
  isRecommendationOpen,
  similarCreators,
  setSelectedCreator
}: {
  creator: Creator;
  isRecommendationOpen: boolean;
  similarCreators: Creator[];
  setSelectedCreator: (creator: Creator | null) => void;
}) {
  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-lift sm:p-5"
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Avatar creator={creator} large />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-slate-950">{creator.name}</h3>
              <PlatformBadge platform={creator.platform} />
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{creator.flag}</span>
            </div>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{creator.handle}</p>
            <p className="mt-2 text-sm font-medium text-slate-600">
              邮箱：<span className={creator.email === "未公开" ? "text-slate-400" : "text-primary"}>{creator.email}</span>
            </p>
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">{creator.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {creator.tags.map((tag, index) => (
                <button
                  key={tag}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 ${
                    index === 0
                      ? "bg-indigo-50 text-primary"
                      : index === 1
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="粉丝量" value={creator.followers} />
            <Metric label="平均播放" value={creator.avgViews} />
            <Metric label="互动率" value={creator.engagement} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">最近活跃</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{creator.lastUpload}</p>
              <p className="mt-1 text-xs text-slate-500">更新频率：{creator.uploadFrequency}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 p-3">
              <p className="text-xs font-medium text-slate-500">匹配度</p>
              <p className="mt-1 text-sm font-semibold text-primary">{creator.score}% 匹配</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              label="查看主页"
              icon={BarChart3}
              onClick={() => window.open(creator.channelUrl, "_blank", "noopener,noreferrer")}
            />
            <ActionButton
              label={isRecommendationOpen ? "收起相似博主" : "查找相似博主"}
              icon={Wand2}
              primary
              onClick={() => setSelectedCreator(isRecommendationOpen ? null : creator)}
            />
            <ActionButton label="收藏博主" icon={Bookmark} />
          </div>
        </div>
      </div>

      {isRecommendationOpen && similarCreators.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">相似博主推荐</p>
              <h4 className="mt-1 text-lg font-semibold text-slate-950">与 {creator.name} 相近的 YouTube 博主</h4>
            </div>
            <p className="text-sm text-slate-500">在当前卡片内直接展开，方便快速对比。</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {similarCreators.map((item) => (
              <InlineRecommendationCard key={item.channelId} creator={item} />
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}

function InlineRecommendationCard({ creator }: { creator: Creator }) {
  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:border-indigo-200 hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <Avatar creator={creator} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-950">{creator.name}</p>
            <PlatformBadge platform={creator.platform} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{creator.region}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="粉丝量" value={creator.followers} />
        <Metric label="平均播放" value={creator.avgViews} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {creator.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">
            {tag}
          </span>
        ))}
      </div>

      <button
        onClick={() => window.open(creator.channelUrl, "_blank", "noopener,noreferrer")}
        className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-primary"
      >
        <BarChart3 className="size-4" />
        查看主页
      </button>
    </motion.article>
  );
}

function Avatar({ creator, large = false }: { creator: Creator; large?: boolean }) {
  const initials = creator.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  if (creator.profileImage) {
    return (
      <img
        alt={`${creator.name} 头像`}
        className={`shrink-0 rounded-lg object-cover shadow-lg shadow-indigo-500/10 ${
          large ? "size-20" : "size-12"
        }`}
        src={creator.profileImage}
      />
    );
  }

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-900 via-primary to-secondary font-bold text-white shadow-lg shadow-indigo-500/20 ${
        large ? "size-20 text-xl" : "size-12 text-sm"
      }`}
      aria-label={`${creator.name} 头像`}
    >
      {initials}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: Creator["platform"] }) {
  const colorMap = {
    YouTube: "bg-red-50 text-red-600"
  };

  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${colorMap[platform]}`}>{platform}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  primary = false,
  onClick
}: {
  label: string;
  icon: typeof Search;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
        primary
          ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15"
          : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
