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
import { useCallback, useEffect, useMemo, useState } from "react";

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
  鍦板尯: ["Brazil", "United States", "Europe", "Korea", "Japan", "Thailand", "Vietnam", "Indonesia", "Philippines", "Hong Kong & Taiwan", "Russia", "Arab", "Turkey"],
  璇█: ["Portuguese", "Spanish", "English", "Korean", "Japanese", "Thai", "Vietnamese", "Indonesian", "Filipino", "Chinese", "Russian", "Arabic", "Turkish"]
};

const activeWindowOptions: Array<{ label: string; value: ActiveWindow }> = [
  { label: "涓嶉檺", value: "any" },
  { label: "杩?7 澶?, value: "7" },
  { label: "杩?30 澶?, value: "30" },
  { label: "杩?90 澶?, value: "90" }
];

const uploadFrequencyOptions: Array<{ label: string; value: UploadFrequencyFilter }> = [
  { label: "涓嶉檺", value: "any" },
  { label: "姣忓懆 3 娆′互涓?, value: "weekly-3-plus" },
  { label: "姣忓懆鏇存柊", value: "weekly" },
  { label: "姣忔湀鏇存柊", value: "monthly" }
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
  { value: 0, label: "0", selectedLabel: "涓嶉檺" },
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
  Brazil: ["BR"],
  "United States": ["US"],
  Europe: ["GB", "DE", "FR", "ES", "IT", "NL", "PL", "SE", "NO", "DK", "FI", "PT"],
  Korea: ["KR"],
  Japan: ["JP"],
  Thailand: ["TH"],
  Vietnam: ["VN"],
  Indonesia: ["ID"],
  Philippines: ["PH"],
  "Hong Kong & Taiwan": ["HK", "TW", "MO"],
  Russia: ["RU"],
  Arab: ["AE", "SA", "EG", "QA", "KW", "BH", "OM", "JO", "LB", "IQ", "MA", "DZ", "TN"],
  Turkey: ["TR"]
};

const languageCodeGroups: Record<string, string[]> = {
  Portuguese: ["pt"],
  Spanish: ["es"],
  English: ["en"],
  Korean: ["ko"],
  Japanese: ["ja"],
  Thai: ["th"],
  Vietnamese: ["vi"],
  Indonesian: ["id"],
  Filipino: ["tl", "fil"],
  Chinese: ["zh"],
  Russian: ["ru"],
  Arabic: ["ar"],
  Turkish: ["tr"]
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
    ["绉诲姩娓告垙", "mobile"],
    ["MMORPG", "mmorpg"],
    ["娌欑洅", "sandbox"],
    ["妯℃嫙缁忚惀", "simulation"],
    ["浜屾鍏冩父鎴?, "anime"]
  ]
    .filter(([, keyword]) => source.includes(keyword))
    .map(([tag]) => tag);

  return tags.length > 0 ? tags.slice(0, 3) : ["YouTube", "娓告垙鍐呭", "鍒涗綔鑰?];
}

function normalizeCreator(item: YouTubeCreatorResponse, query: string, index: number): Creator {
  return {
    name: item.channelTitle,
    handle: `棰戦亾 ID锛?{item.channelId}`,
    channelId: item.channelId,
    channelUrl: item.channelUrl,
    profileImage: item.profileImage,
    platform: "YouTube",
    flag: "馃寪",
    region: item.region,
    regionCode: item.regionCode,
    language: item.language,
    languageCode: item.languageCode,
    followers: item.subscriberCount,
    followersCount: item.subscriberCountRaw,
    avgViews: item.averageViews ?? "鏆傛湭鎻愪緵",
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
    description: item.description || "璇ラ閬撴殏鏈彁渚涚畝浠嬶紝鍙繘鍏?YouTube 涓婚〉鏌ョ湅瀹屾暣鍐呭涓庤繎鏈熻棰戙€?
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

function matchesSelectedGroup(value: string, selected: string[], groups: Record<string, string[]>) {
  if (selected.length === 0) return true;
  if (!value) return false;

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
    "鍚嶅瓧",
    "棰戦亾閾炬帴",
    "鍥藉/鍦板尯",
    "鍦板尯浠ｇ爜",
    "璇█",
    "绮変笣鏁伴噺",
    "绮変笣鏁板師濮嬪€?,
    "骞冲潎鎾斁",
    "浜掑姩鐜?,
    "鏈€杩戞椿璺?,
    "鏇存柊棰戠巼",
    "閭",
    "棰戦亾ID",
    "棰戦亾绠€浠?
  ];
  const rows = creators.map((creator) => [
    creator.name,
    creator.channelUrl,
    creator.region,
    creator.regionCode || "鏈叕寮€",
    creator.language,
    creator.followers,
    creator.followersCount ?? "鏈叕寮€",
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
  link.download = `${safeQuery}-鍗氫富鎼滅储缁撴灉.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);

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
        throw new Error(data.error ?? "YouTube 妫€绱㈠け璐ワ紝璇风◢鍚庨噸璇曘€?);
      }

      const normalizedCreators = (data.creators ?? []).map((item, index) =>
        normalizeCreator(item, trimmedQuery, index)
      );
      setCreators(normalizedCreators);
      setSelectedCreator(null);
    } catch (searchError) {
      setCreators([]);
      setSelectedCreator(null);
      setError(searchError instanceof Error ? searchError.message : "YouTube 妫€绱㈠け璐ワ紝璇风◢鍚庨噸璇曘€?);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    if (isLoading) return "姝ｅ湪浠?YouTube API 鑾峰彇棰戦亾鏁版嵁";
    if (error) return "妫€绱㈤亣鍒伴棶棰?;
    if (!hasSearched) return "请输入关键词后开始搜索";
    if (creators.length === 0 && hasSearched) return "鏆傛棤鍖归厤棰戦亾";
    if (filteredCreators.length !== creators.length) {
      return `${filteredCreators.length} / ${creators.length} 涓閬撶鍚堝綋鍓嶇瓫閫塦;
    }
    return `${creators.length} 涓?YouTube 棰戦亾缁撴灉`;
  }, [creators.length, error, filteredCreators.length, hasSearched, isLoading]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <Hero
          exportCreators={creators}
          isLoading={isLoading}
          query={query}
          resultSummary={resultSummary}
          searchCreators={searchCreators}
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
            searchCreators={() => searchCreators(query)}
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
              V1 鍗氫富鍙戠幇涓灑
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Activity className="size-4 text-success" />
              YouTube API 瀹炴椂棰戦亾妫€绱?            </span>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            涓轰綘鐨勬柊娓告垙蹇€熸壘鍒板悎閫傚崥涓?          </h1>
          <p className="mt-4 text-lg text-slate-600">閫氳繃鎼滅储銆佹爣绛剧瓫閫夊拰鐩镐技鎺ㄨ崘锛屽揩閫熷彂鐜伴珮鍖归厤搴﹀崥涓汇€?/p>

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
                  placeholder="鎸夊崥涓汇€佹父鎴忋€佹爣绛炬垨鍏抽敭璇嶆悳绱?
                  className="w-full border-0 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                className="flex min-h-14 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-6 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : <SlidersHorizontal className="size-5" />}
                {isLoading ? "妫€绱腑" : "妫€绱㈠崥涓?}
              </button>
            </div>
          </form>

          <p className="mt-3 text-sm font-medium text-slate-500">{resultSummary}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.98] p-6 shadow-card">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">鏁版嵁瀵煎嚭</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">瀵煎嚭鏈鎼滅储缁撴灉</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              瀵煎嚭鎵€鏈?YouTube API 鎼滅储鍑虹殑鍗氫富鏁版嵁锛屽寘鍚悕瀛椼€侀閬撻摼鎺ャ€佸浗瀹?鍦板尯銆佺矇涓濇暟閲忓拰閭銆?            </p>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">鍙鍑洪閬?/p>
                <p className="mt-1 text-xs text-slate-500">{exportCreators.length} 涓閬?路 CSV 鏂囦欢</p>
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-primary">
                鍏ㄩ噺鎼滅储缁撴灉
              </span>
            </div>
          </div>

          <button
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasExportData || isLoading}
            onClick={() => exportCreatorsToCsv(exportCreators, query)}
          >
            <Download className="size-4" />
            {hasExportData ? "瀵煎嚭 CSV 鏂囦欢" : "鏆傛棤鍙鍑烘暟鎹?}
          </button>

          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
            閭鏉ヨ嚜棰戦亾绠€浠嬭嚜鍔ㄨ瘑鍒紱鑻ラ閬撴湭鍏紑閭锛屾枃浠朵腑浼氭樉绀衡€滄湭鍏紑鈥濄€?          </div>
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
          <p className="text-sm font-semibold text-slate-950">绛涢€夐潰鏉?/p>
          <p className="mt-1 text-xs text-slate-500">鎸変笂绾垮尮閰嶅害绮惧噯绛涢€夊崥涓?/p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-primary"
          >
            娓呯┖绛涢€?          </button>
          <Filter className="size-5 text-primary" />
        </div>
      </div>

      <div className="thin-scrollbar mt-5 max-h-none space-y-6 overflow-auto xl:max-h-[720px]">
        <FilterGroup
          label="鍦板尯"
          onToggle={(value) => toggleFilter("regions", value)}
          options={filters.鍦板尯}
          selectedOptions={filterState.regions}
        />
        <FilterGroup
          label="璇█"
          onToggle={(value) => toggleFilter("languages", value)}
          options={filters.璇█}
          selectedOptions={filterState.languages}
        />

        <RangeBlock
          label="绮変笣閲?
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
          label="浜掑姩鐜?
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
          label="骞冲潎鎾斁"
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
            鏈€杩戞椿璺冩椂闂?          </label>
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
            鏇存柊棰戠巼
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
    鍦板尯: Globe2,
    璇█: Languages
  };
  const Icon = iconMap[label] ?? Tags;
  const placeholderMap: Record<string, string> = {
    鍦板尯: "Select Region",
    璇█: "Select Language"
  };
  const summary =
    selectedOptions.length === 0
      ? placeholderMap[label] ?? `Select ${label}`
      : selectedOptions.length <= 2
        ? selectedOptions.join("銆?)
        : `Selected ${selectedOptions.length}`;

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
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">鍗氫富妫€绱?/p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">YouTube 棰戦亾瀹炴椂妫€绱㈢粨鏋?/h2>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
          {["鍖归厤搴?, "璁㈤槄閲?, "棰戦亾璐ㄩ噺"].map((item, index) => (
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
        {hasRawResults ? "褰撳墠绛涢€夋潯浠朵笅娌℃湁鍖归厤棰戦亾" : "娌℃湁鎵惧埌鍖归厤鐨?YouTube 棰戦亾"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {hasRawResults ? "鏀惧绛涢€夋潯浠跺悗鍐嶈瘯涓€娆°€? : "鎹竴涓父鎴忋€佸湴鍖烘垨鍐呭鍏抽敭璇嶅啀璇曚竴娆°€?}
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-5">
      <h3 className="font-semibold text-red-700">YouTube API 璇锋眰澶辫触</h3>
      <p className="mt-2 text-sm leading-6 text-red-600">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:-translate-y-0.5"
      >
        閲嶆柊妫€绱?      </button>
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
              閭锛?span className={creator.email === "鏈叕寮€" ? "text-slate-400" : "text-primary"}>{creator.email}</span>
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
            <Metric label="绮変笣閲? value={creator.followers} />
            <Metric label="骞冲潎鎾斁" value={creator.avgViews} />
            <Metric label="浜掑姩鐜? value={creator.engagement} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">鏈€杩戞椿璺?/p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{creator.lastUpload}</p>
              <p className="mt-1 text-xs text-slate-500">鏇存柊棰戠巼锛歿creator.uploadFrequency}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 p-3">
              <p className="text-xs font-medium text-slate-500">鍖归厤搴?/p>
              <p className="mt-1 text-sm font-semibold text-primary">{creator.score}% 鍖归厤</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              label="鏌ョ湅涓婚〉"
              icon={BarChart3}
              onClick={() => window.open(creator.channelUrl, "_blank", "noopener,noreferrer")}
            />
            <ActionButton
              label={isRecommendationOpen ? "鏀惰捣鐩镐技鍗氫富" : "鏌ユ壘鐩镐技鍗氫富"}
              icon={Wand2}
              primary
              onClick={() => setSelectedCreator(isRecommendationOpen ? null : creator)}
            />
            <ActionButton label="鏀惰棌鍗氫富" icon={Bookmark} />
          </div>
        </div>
      </div>

      {isRecommendationOpen && similarCreators.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">鐩镐技鍗氫富鎺ㄨ崘</p>
              <h4 className="mt-1 text-lg font-semibold text-slate-950">涓?{creator.name} 鐩歌繎鐨?YouTube 鍗氫富</h4>
            </div>
            <p className="text-sm text-slate-500">鍦ㄥ綋鍓嶅崱鐗囧唴鐩存帴灞曞紑锛屾柟渚垮揩閫熷姣斻€?/p>
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
        <Metric label="绮変笣閲? value={creator.followers} />
        <Metric label="骞冲潎鎾斁" value={creator.avgViews} />
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
        鏌ョ湅涓婚〉
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
        alt={`${creator.name} 澶村儚`}
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
      aria-label={`${creator.name} 澶村儚`}
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

