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
import type { Dispatch, SetStateAction } from "react";

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
  Regions: [
    "Brazil",
    "United States",
    "Europe",
    "Korea",
    "Japan",
    "Thailand",
    "Vietnam",
    "Indonesia",
    "Philippines",
    "Hong Kong & Taiwan",
    "Russia",
    "Arab",
    "Turkey"
  ],
  Languages: [
    "Portuguese",
    "Spanish",
    "English",
    "Korean",
    "Japanese",
    "Thai",
    "Vietnamese",
    "Indonesian",
    "Filipino",
    "Chinese",
    "Russian",
    "Arabic",
    "Turkish"
  ]
};

const activeWindowOptions: Array<{ label: string; value: ActiveWindow }> = [
  { label: "No limit", value: "any" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" }
];

const uploadFrequencyOptions: Array<{ label: string; value: UploadFrequencyFilter }> = [
  { label: "No limit", value: "any" },
  { label: "3+ uploads/week", value: "weekly-3-plus" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" }
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
  { value: 10000, label: "10K", selectedLabel: "10K+" },
  { value: 50000, label: "50K", selectedLabel: "50K+" },
  { value: 100000, label: "100K", selectedLabel: "100K+" },
  { value: 200000, label: "200K", selectedLabel: "200K+" },
  { value: 300000, label: "300K", selectedLabel: "300K+" },
  { value: 500000, label: "500K", selectedLabel: "500K+" },
  { value: 1000000, label: "1M", selectedLabel: "1M+" }
];

const engagementRangeOptions: RangeOption[] = [
  { value: 0, label: "0%", selectedLabel: "No limit" },
  { value: 5, label: "5%", selectedLabel: "5%+" },
  { value: 10, label: "10%", selectedLabel: "10%+" },
  { value: 15, label: "15%", selectedLabel: "15%+" }
];

const averageViewRangeOptions: RangeOption[] = [
  { value: 300, label: "300", selectedLabel: "300+" },
  { value: 500, label: "500", selectedLabel: "500+" },
  { value: 1000, label: "1K", selectedLabel: "1K+" },
  { value: 5000, label: "5K", selectedLabel: "5K+" },
  { value: 10000, label: "10K", selectedLabel: "10K+" }
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

function inferTags(query: string, description: string) {
  const source = `${query} ${description}`.toLowerCase();
  const tagRules: Array<[string, string]> = [
    ["Roblox", "roblox"],
    ["Mobile", "mobile"],
    ["MMORPG", "mmorpg"],
    ["Sandbox", "sandbox"],
    ["Simulation", "simulation"],
    ["Anime", "anime"]
  ];

  const tags = tagRules
    .filter(([, keyword]) => source.includes(keyword))
    .map(([tag]) => tag);

  return tags.length > 0 ? tags.slice(0, 3) : ["YouTube", "Gaming", "Creator"];
}

function getRegionFlag(regionCode: string) {
  const flagMap: Record<string, string> = {
    BR: "BR",
    US: "US",
    KR: "KR",
    JP: "JP",
    TH: "TH",
    VN: "VN",
    ID: "ID",
    PH: "PH",
    HK: "HK",
    TW: "TW",
    MO: "MO",
    RU: "RU",
    TR: "TR",
    AE: "AE"
  };

  return flagMap[regionCode] ?? "YT";
}

function normalizeCreator(item: YouTubeCreatorResponse, query: string, index: number): Creator {
  return {
    name: item.channelTitle,
    handle: `Channel ID: ${item.channelId}`,
    channelId: item.channelId,
    channelUrl: item.channelUrl,
    profileImage: item.profileImage,
    platform: "YouTube",
    flag: getRegionFlag(item.regionCode),
    region: item.region || "Unknown",
    regionCode: item.regionCode,
    language: item.language || "Unknown",
    languageCode: item.languageCode,
    followers: item.subscriberCount,
    followersCount: item.subscriberCountRaw,
    avgViews: item.averageViews ?? "Unavailable",
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
    description:
      item.description ||
      "This channel does not provide a public description yet. Open the channel page to review recent videos."
  };
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
    "Name",
    "Channel URL",
    "Region",
    "Region Code",
    "Language",
    "Followers",
    "Followers Raw",
    "Average Views",
    "Engagement Rate",
    "Last Upload",
    "Upload Frequency",
    "Email",
    "Channel ID",
    "Description"
  ];

  const rows = creators.map((creator) => [
    creator.name,
    creator.channelUrl,
    creator.region,
    creator.regionCode || "Unknown",
    creator.language,
    creator.followers,
    creator.followersCount ?? "Unknown",
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
  link.download = `${safeQuery}-creators.csv`;
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

  useEffect(() => {
    setQuery("");
    setCreators([]);
    setSelectedCreator(null);
    setError("");
    setHasSearched(false);
  }, []);

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
        throw new Error(data.error ?? "YouTube search failed. Please try again.");
      }

      const normalizedCreators = (data.creators ?? []).map((item, index) =>
        normalizeCreator(item, trimmedQuery, index)
      );

      setCreators(normalizedCreators);
      setSelectedCreator(null);
    } catch (searchError) {
      setCreators([]);
      setSelectedCreator(null);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "YouTube search failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredCreators = useMemo(() => filterCreators(creators, filterState), [creators, filterState]);

  useEffect(() => {
    setSelectedCreator((currentCreator) => {
      if (
        currentCreator &&
        filteredCreators.some((creator) => creator.channelId === currentCreator.channelId)
      ) {
        return currentCreator;
      }

      return null;
    });
  }, [filteredCreators]);

  const resultSummary = useMemo(() => {
    if (isLoading) return "Loading creators from YouTube...";
    if (error) return "Search hit an error.";
    if (!hasSearched) return "Enter a keyword to start searching.";
    if (creators.length === 0) return "No matching channels found.";
    if (filteredCreators.length !== creators.length) {
      return `${filteredCreators.length} / ${creators.length} channels match the current filters.`;
    }
    return `${creators.length} YouTube channels found.`;
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
              Influencer Search
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Activity className="size-4 text-success" />
              Live channel discovery with YouTube API
            </span>
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Find matching creators for your game faster
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Search by keyword first, then narrow the channel list with region, language,
            follower, activity, and engagement filters.
          </p>

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
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search keywords, games, genres, or topics"
                  className="w-full border-0 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                className="flex min-h-14 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-6 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <SlidersHorizontal className="size-5" />
                )}
                {isLoading ? "Searching" : "Search Creators"}
              </button>
            </div>
          </form>

          <p className="mt-3 text-sm font-medium text-slate-500">{resultSummary}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.98] p-6 shadow-card">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Export</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Export the current result set
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Download the creators currently returned by the search, including region,
              language, followers, engagement, upload activity, and contact fields.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Exportable channels</p>
                <p className="mt-1 text-xs text-slate-500">
                  {exportCreators.length} channels, CSV format
                </p>
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-primary">
                Search snapshot
              </span>
            </div>
          </div>

          <button
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasExportData}
            onClick={() => exportCreatorsToCsv(exportCreators, query)}
            type="button"
          >
            <Download className="size-4" />
            Export CSV
          </button>
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
  setFilterState: Dispatch<SetStateAction<FilterState>>;
}) {
  const toggleMultiSelect = (groupKey: "regions" | "languages", value: string) => {
    setFilterState((current) => {
      const group = current[groupKey];
      const nextValues = group.includes(value)
        ? group.filter((item) => item !== value)
        : [...group, value];

      return {
        ...current,
        [groupKey]: nextValues
      };
    });
  };

  return (
    <aside className="rounded-lg border border-white/10 bg-white p-5 shadow-card sm:p-6">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <Filter className="size-4" />
          Filters
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Refine the channel list</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Search always uses the raw keyword first. Everything below filters the channel set after
          the search results come back.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <FilterGroup
          label="Regions"
          onToggle={(value) => toggleMultiSelect("regions", value)}
          options={filters.Regions}
          selectedOptions={filterState.regions}
        />

        <FilterGroup
          label="Languages"
          onToggle={(value) => toggleMultiSelect("languages", value)}
          options={filters.Languages}
          selectedOptions={filterState.languages}
        />

        <RangeBlock
          label="Followers"
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
          label="Engagement Rate"
          options={engagementRangeOptions}
          onChange={(value) =>
            setFilterState((current) => ({
              ...current,
              minEngagementRate: value
            }))
          }
          value={filterState.minEngagementRate}
          valueLabel={getSelectedRangeLabel(
            filterState.minEngagementRate,
            engagementRangeOptions
          )}
        />

        <RangeBlock
          label="Average Views"
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
            Recent Activity
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
            Upload Frequency
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
    Regions: Globe2,
    Languages: Languages
  };

  const Icon = iconMap[label] ?? Tags;

  const placeholderMap: Record<string, string> = {
    Regions: "Select regions",
    Languages: "Select languages"
  };

  const summary =
    selectedOptions.length === 0
      ? placeholderMap[label] ?? `Select ${label}`
      : selectedOptions.length <= 2
        ? selectedOptions.join(", ")
        : `${selectedOptions.length} selected`;

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
          <div
            className="mt-3 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
          >
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
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Results</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Real-time YouTube creator results
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
          {["Match", "Followers", "Quality"].map((item, index) => (
            <button
              key={item}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {isLoading && <LoadingState />}
        {!isLoading && error && <ErrorState error={error} onRetry={searchCreators} />}
        {!isLoading && !error && hasSearched && creators.length === 0 && (
          <EmptyState hasRawResults={totalCreators > 0} />
        )}
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
        {hasRawResults ? "No channels match the current filters." : "No matching YouTube channels found."}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {hasRawResults
          ? "Try loosening the filters and search again."
          : "Try another game, keyword, region, or topic."}
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-5">
      <h3 className="font-semibold text-red-700">YouTube API request failed</h3>
      <p className="mt-2 text-sm leading-6 text-red-600">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:-translate-y-0.5"
        type="button"
      >
        Retry Search
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
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                {creator.flag}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{creator.handle}</p>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Email:{" "}
              <span className={creator.email === "Unknown" ? "text-slate-400" : "text-primary"}>
                {creator.email}
              </span>
            </p>
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">
              {creator.description}
            </p>
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
                  type="button"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Followers" value={creator.followers} />
            <Metric label="Avg Views" value={creator.avgViews} />
            <Metric label="Engagement" value={creator.engagement} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Recent Activity</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{creator.lastUpload}</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload Frequency: {creator.uploadFrequency}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 p-3">
              <p className="text-xs font-medium text-slate-500">Match Score</p>
              <p className="mt-1 text-sm font-semibold text-primary">{creator.score}% match</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              label="Open Channel"
              icon={BarChart3}
              onClick={() => window.open(creator.channelUrl, "_blank", "noopener,noreferrer")}
            />
            <ActionButton
              label={isRecommendationOpen ? "Hide Similar" : "Find Similar"}
              icon={Wand2}
              primary
              onClick={() => setSelectedCreator(isRecommendationOpen ? null : creator)}
            />
            <ActionButton label="Save Creator" icon={Bookmark} />
          </div>
        </div>
      </div>

      {isRecommendationOpen && similarCreators.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Similar Creators
              </p>
              <h4 className="mt-1 text-lg font-semibold text-slate-950">
                More channels close to {creator.name}
              </h4>
            </div>
            <p className="text-sm text-slate-500">
              Opened inline so you can compare without jumping to the page bottom.
            </p>
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
        <Metric label="Followers" value={creator.followers} />
        <Metric label="Avg Views" value={creator.avgViews} />
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
        type="button"
      >
        <BarChart3 className="size-4" />
        Open Channel
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
        alt={`${creator.name} avatar`}
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
      aria-label={`${creator.name} avatar`}
    >
      {initials}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: Creator["platform"] }) {
  const colorMap = {
    YouTube: "bg-red-50 text-red-600"
  };

  return (
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${colorMap[platform]}`}>
      {platform}
    </span>
  );
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
      type="button"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
