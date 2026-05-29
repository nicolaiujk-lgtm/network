import { NextResponse } from "next/server";

type YouTubeSearchItem = {
  id?: {
    channelId?: string;
    videoId?: string;
  };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
  nextPageToken?: string;
};

type YouTubeChannelItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    country?: string;
    defaultLanguage?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
    };
  };
  brandingSettings?: {
    channel?: {
      country?: string;
      defaultLanguage?: string;
    };
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

type YouTubePlaylistItem = {
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
};

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type ChannelActivityMetrics = {
  engagementRate: string;
  engagementRateRaw: number | null;
  lastUpload: string;
  lastUploadAt: string | null;
  lastUploadDaysAgo: number | null;
  uploadFrequency: string;
  uploadsPerWeekRaw: number | null;
};

type ChannelCandidate = {
  channelId: string;
  searchScore: number;
  matchedVideoCount: number;
};

type ChannelVideoLanguageSignal = {
  dominantLanguageCode: string | null;
  derivedRegionCode: string | null;
  matchedVideoCount: number;
};

const VIDEO_SEARCH_PAGE_SIZE = 50;
const MAX_VIDEO_SEARCH_PAGES = 8;
const MAX_CHANNEL_RESULTS = 200;
const CHANNEL_DETAILS_BATCH_SIZE = 50;
const RECENT_UPLOAD_LIMIT = 8;
const CONCURRENT_ACTIVITY_REQUESTS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const regionNames: Record<string, string> = {
  BR: "Brazil",
  US: "United States",
  KR: "Korea",
  JP: "Japan",
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  PH: "Philippines",
  HK: "Hong Kong & Taiwan",
  TW: "Hong Kong & Taiwan",
  MO: "Hong Kong & Taiwan",
  RU: "Russia",
  TR: "Turkey",
  AE: "Arab",
  SA: "Arab",
  EG: "Arab",
  QA: "Arab",
  KW: "Arab",
  BH: "Arab",
  OM: "Arab",
  JO: "Arab",
  LB: "Arab",
  IQ: "Arab",
  MA: "Arab",
  DZ: "Arab",
  TN: "Arab",
  GB: "Europe",
  DE: "Europe",
  FR: "Europe",
  ES: "Europe",
  IT: "Europe",
  NL: "Europe",
  PL: "Europe",
  SE: "Europe",
  NO: "Europe",
  DK: "Europe",
  FI: "Europe",
  PT: "Europe"
};

const languageNames: Record<string, string> = {
  pt: "Portuguese",
  ar: "Arabic",
  en: "English",
  es: "Spanish",
  ko: "Korean",
  ja: "Japanese",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  tl: "Filipino",
  fil: "Filipino",
  zh: "Chinese",
  ru: "Russian",
  tr: "Turkish"
};

const fallbackActivityMetrics: ChannelActivityMetrics = {
  engagementRate: "Unavailable",
  engagementRateRaw: null,
  lastUpload: "Unavailable",
  lastUploadAt: null,
  lastUploadDaysAgo: null,
  uploadFrequency: "Unavailable",
  uploadsPerWeekRaw: null
};

function formatNumber(value?: string) {
  if (!value) return "Hidden";

  const number = Number(value);
  if (!Number.isFinite(number)) return "Hidden";

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
}

function formatPercentage(value: number | null) {
  const safeValue = value ?? 0;
  if (value === null || !Number.isFinite(safeValue)) return "Unavailable";

  return `${new Intl.NumberFormat("en", {
    minimumFractionDigits: safeValue >= 10 ? 0 : 1,
    maximumFractionDigits: 1
  }).format(safeValue)}%`;
}

function getRegion(code?: string) {
  const normalizedCode = code?.toUpperCase();
  if (!normalizedCode) return { region: "Unknown", regionCode: "" };

  return {
    region: regionNames[normalizedCode] ?? normalizedCode,
    regionCode: normalizedCode
  };
}

function getLanguage(code?: string) {
  const normalizedCode = code?.split("-")[0]?.toLowerCase();
  if (!normalizedCode) return { language: "Unknown", languageCode: "" };

  return {
    language: languageNames[normalizedCode] ?? normalizedCode,
    languageCode: normalizedCode
  };
}

function getAverageViews(viewCount?: string, videoCount?: string) {
  const views = Number(viewCount ?? 0);
  const videos = Number(videoCount ?? 0);

  if (!Number.isFinite(views) || !Number.isFinite(videos) || videos <= 0) {
    return { averageViews: "Unavailable", averageViewsRaw: null };
  }

  const averageViewsRaw = Math.round(views / videos);

  return {
    averageViews: formatNumber(String(averageViewsRaw)),
    averageViewsRaw
  };
}

function extractEmails(text?: string) {
  if (!text) return [];

  return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []));
}

function average(values: number[]) {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getLastUploadLabel(lastUploadAt: string | null) {
  if (!lastUploadAt) {
    return {
      lastUpload: "Unavailable",
      lastUploadDaysAgo: null
    };
  }

  const date = new Date(lastUploadAt);
  if (Number.isNaN(date.getTime())) {
    return {
      lastUpload: "Unavailable",
      lastUploadDaysAgo: null
    };
  }

  const daysAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / MS_PER_DAY));
  const dateLabel = date.toISOString().slice(0, 10);
  const suffix = daysAgo === 0 ? "today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;

  return {
    lastUpload: `${dateLabel} - ${suffix}`,
    lastUploadDaysAgo: daysAgo
  };
}

function getUploadFrequency(uploadsPerWeekRaw: number | null) {
  const safeUploadsPerWeek = uploadsPerWeekRaw ?? 0;
  if (uploadsPerWeekRaw === null || !Number.isFinite(safeUploadsPerWeek)) return "Unavailable";
  if (safeUploadsPerWeek >= 3) return "3+ uploads/week";
  if (safeUploadsPerWeek >= 1) return "Weekly";
  if (safeUploadsPerWeek >= 0.25) return "Monthly";
  return "Less than monthly";
}

function normalizeSearchText(text?: string) {
  return (text ?? "").toLowerCase().trim();
}

function buildQueryKeywords(query: string) {
  return Array.from(
    new Set(
      normalizeSearchText(query)
        .split(/\s+/)
        .map((keyword) => keyword.replace(/[^\p{L}\p{N}]+/gu, ""))
        .filter(Boolean)
    )
  );
}

function countKeywordMatches(text: string, keywords: string[]) {
  const normalizedText = normalizeSearchText(text);

  return keywords.reduce((score, keyword) => {
    return normalizedText.includes(keyword) ? score + 1 : score;
  }, 0);
}

function getMinimumKeywordMatches(keywords: string[]) {
  if (keywords.length <= 1) return 1;
  return keywords.length;
}

function matchesVideoTitleQuery(title: string, query: string, keywords: string[]) {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedQuery = normalizeSearchText(query);
  const titleMatches = countKeywordMatches(title, keywords);
  const exactPhraseMatch =
    normalizedQuery.length > 0 && normalizedTitle.includes(normalizedQuery);
  const allKeywordsMatch = titleMatches >= getMinimumKeywordMatches(keywords);

  return {
    titleMatches,
    exactPhraseMatch,
    isRelevant: exactPhraseMatch || allKeywordsMatch
  };
}

function inferLanguageCodeFromTitle(title: string) {
  const normalizedTitle = normalizeSearchText(title);

  if (!normalizedTitle) return null;
  if (/[\u3040-\u30ff]/u.test(normalizedTitle)) return "ja";
  if (/[\uac00-\ud7af]/u.test(normalizedTitle)) return "ko";
  if (/[\u0e00-\u0e7f]/u.test(normalizedTitle)) return "th";
  if (/[\u0600-\u06ff]/u.test(normalizedTitle)) return "ar";
  if (/[\u0400-\u04ff]/u.test(normalizedTitle)) return "ru";
  if (/[\u4e00-\u9fff]/u.test(normalizedTitle)) return "zh";
  if (/[ăâđêôơư]/u.test(normalizedTitle)) return "vi";
  if (/[ğışçöü]/u.test(normalizedTitle)) return "tr";

  const words: string[] = normalizedTitle.match(/[a-z]+/g) ?? [];
  if (words.length === 0) return null;

  const languageKeywordMap: Record<string, string[]> = {
    es: ["de", "y", "en", "para", "con", "el", "la", "los", "las", "como", "por", "del", "al", "que"],
    pt: ["de", "e", "para", "com", "o", "a", "os", "as", "do", "da", "em", "no", "na", "que"],
    en: ["the", "and", "with", "for", "how", "to", "of", "is", "in", "on", "best", "update"],
    id: ["yang", "untuk", "dengan", "dari", "cara", "dan", "ini", "itu", "main", "pada"],
    fil: ["ang", "mga", "para", "paano", "sa", "ng", "at", "ito", "ako", "mo"]
  };

  const scores = (Object.entries(languageKeywordMap) as Array<[string, string[]]>).map(
    ([code, terms]) => {
      const score = terms.reduce<number>(
        (sum, term) => sum + (words.includes(term) ? 1 : 0),
        0
      );
      return { code, score };
    }
  );

  scores.sort((left, right) => right.score - left.score);

  return scores[0] && scores[0].score > 0 ? scores[0].code : null;
}

function deriveRegionCodeFromLanguage(languageCode: string | null, fallbackCountryCode?: string) {
  const normalizedLanguageCode = languageCode?.split("-")[0]?.toLowerCase() ?? "";
  const normalizedCountryCode = fallbackCountryCode?.toUpperCase() ?? "";

  const languageRegionMap: Record<string, string> = {
    ko: "KR",
    ja: "JP",
    th: "TH",
    vi: "VN",
    id: "ID",
    tl: "PH",
    fil: "PH",
    ru: "RU",
    tr: "TR",
    ar: "AE",
    zh: "HK",
    pt: "BR"
  };

  if (normalizedLanguageCode === "en") {
    return normalizedCountryCode || null;
  }

  if (normalizedLanguageCode === "es") {
    return normalizedCountryCode || null;
  }

  return languageRegionMap[normalizedLanguageCode] ?? normalizedCountryCode ?? null;
}

function upsertChannelCandidate(
  candidates: Map<string, ChannelCandidate>,
  channelId: string,
  scoreDelta: number,
  matchedVideoCountDelta = 0
) {
  const current = candidates.get(channelId);

  if (current) {
    current.searchScore += scoreDelta;
    current.matchedVideoCount += matchedVideoCountDelta;
    return;
  }

  candidates.set(channelId, {
    channelId,
    searchScore: scoreDelta,
    matchedVideoCount: matchedVideoCountDelta
  });
}

function collectVideoSearchCandidates(
  items: YouTubeSearchItem[],
  query: string,
  keywords: string[],
  candidates: Map<string, ChannelCandidate>
) {
  items.forEach((item, index) => {
    const channelId = item.snippet?.channelId;
    if (!channelId) return;

    const matchResult = matchesVideoTitleQuery(item.snippet?.title ?? "", query, keywords);
    if (!matchResult.isRelevant) return;

    const scoreDelta =
      160 - index * 2 + matchResult.titleMatches * 28 + (matchResult.exactPhraseMatch ? 24 : 0);

    upsertChannelCandidate(candidates, channelId, scoreDelta, 1);
  });
}

async function fetchYouTubeJson<T>(url: URL) {
  const response = await fetch(url, {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));

  return results;
}

async function fetchChannelActivityMetrics(apiKey: string, uploadsPlaylistId?: string) {
  if (!uploadsPlaylistId) return fallbackActivityMetrics;

  try {
    const playlistItemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    playlistItemsUrl.searchParams.set("part", "contentDetails");
    playlistItemsUrl.searchParams.set("playlistId", uploadsPlaylistId);
    playlistItemsUrl.searchParams.set("maxResults", String(RECENT_UPLOAD_LIMIT));
    playlistItemsUrl.searchParams.set("key", apiKey);

    const playlistData = await fetchYouTubeJson<{ items?: YouTubePlaylistItem[] }>(playlistItemsUrl);
    const recentUploads: YouTubePlaylistItem[] = playlistData.items ?? [];
    const videoIds = recentUploads
      .map((item) => item.contentDetails?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId));

    if (videoIds.length === 0) return fallbackActivityMetrics;

    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,statistics");
    videosUrl.searchParams.set("id", videoIds.join(","));
    videosUrl.searchParams.set("key", apiKey);

    const videosData = await fetchYouTubeJson<{ items?: YouTubeVideoItem[] }>(videosUrl);
    const videosById = new Map((videosData.items ?? []).map((video) => [video.id, video]));

    const recentVideoMetrics = recentUploads
      .map((item) => {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) return null;

        const video = videosById.get(videoId);

        return {
          publishedAt: item.contentDetails?.videoPublishedAt ?? video?.snippet?.publishedAt ?? null,
          viewCount: Number(video?.statistics?.viewCount ?? 0),
          likeCount: Number(video?.statistics?.likeCount ?? 0),
          commentCount: Number(video?.statistics?.commentCount ?? 0)
        };
      })
      .filter(
        (
          item
        ): item is {
          publishedAt: string | null;
          viewCount: number;
          likeCount: number;
          commentCount: number;
        } => item !== null
      );

    const engagementSamples = recentVideoMetrics
      .map((video) => {
        if (!video.viewCount || !Number.isFinite(video.viewCount) || video.viewCount <= 0) {
          return null;
        }

        const interactions =
          (Number.isFinite(video.likeCount) ? video.likeCount : 0) +
          (Number.isFinite(video.commentCount) ? video.commentCount : 0);

        return (interactions / video.viewCount) * 100;
      })
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    const engagementRateRawAverage = average(engagementSamples);
    const engagementRateRaw =
      typeof engagementRateRawAverage === "number"
        ? Number(engagementRateRawAverage.toFixed(2))
        : null;

    const publishedDates = recentVideoMetrics
      .map((video) => video.publishedAt)
      .filter((publishedAt): publishedAt is string => Boolean(publishedAt))
      .map((publishedAt) => new Date(publishedAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => right.getTime() - left.getTime());

    const lastUploadAt = publishedDates[0]?.toISOString() ?? null;
    const { lastUpload, lastUploadDaysAgo } = getLastUploadLabel(lastUploadAt);

    let uploadsPerWeekRaw: number | null = null;

    if (publishedDates.length >= 2) {
      const newest = publishedDates[0].getTime();
      const oldest = publishedDates[publishedDates.length - 1].getTime();
      const daysSpan = Math.max((newest - oldest) / MS_PER_DAY, 1);
      uploadsPerWeekRaw = Number((((publishedDates.length - 1) / daysSpan) * 7).toFixed(2));
    }

    return {
      engagementRate: formatPercentage(engagementRateRaw),
      engagementRateRaw,
      lastUpload,
      lastUploadAt,
      lastUploadDaysAgo,
      uploadFrequency: getUploadFrequency(uploadsPerWeekRaw),
      uploadsPerWeekRaw
    };
  } catch {
    return fallbackActivityMetrics;
  }
}

async function fetchSearchItems(
  apiKey: string,
  query: string,
  maxResults: number,
  pageToken?: string
) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  if (pageToken) {
    searchUrl.searchParams.set("pageToken", pageToken);
  }

  return fetchYouTubeJson<YouTubeSearchResponse>(searchUrl);
}

async function fetchPaginatedSearchItems(apiKey: string, query: string) {
  const items: YouTubeSearchItem[] = [];
  let nextPageToken: string | undefined;

  for (let pageIndex = 0; pageIndex < MAX_VIDEO_SEARCH_PAGES; pageIndex += 1) {
    const searchData = await fetchSearchItems(
      apiKey,
      query,
      VIDEO_SEARCH_PAGE_SIZE,
      nextPageToken
    );

    items.push(...(searchData.items ?? []));
    nextPageToken = searchData.nextPageToken;

    if (!nextPageToken) {
      break;
    }
  }

  return items;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function fetchChannelsByIds(apiKey: string, channelIds: string[]) {
  const channelEntries = await Promise.all(
    chunkArray(channelIds, CHANNEL_DETAILS_BATCH_SIZE).map(async (channelIdChunk) => {
      const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
      channelsUrl.searchParams.set("part", "snippet,statistics,brandingSettings,contentDetails");
      channelsUrl.searchParams.set("id", channelIdChunk.join(","));
      channelsUrl.searchParams.set("key", apiKey);

      const channelsData = await fetchYouTubeJson<{ items?: YouTubeChannelItem[] }>(channelsUrl);

      return channelsData.items ?? [];
    })
  );

  return channelEntries.flat();
}

function getDominantLanguageCode(languageCodes: string[]) {
  const counter = new Map<string, number>();

  languageCodes.forEach((code) => {
    const normalizedCode = code.split("-")[0]?.toLowerCase();
    if (!normalizedCode) return;

    counter.set(normalizedCode, (counter.get(normalizedCode) ?? 0) + 1);
  });

  const sorted = Array.from(counter.entries()).sort((left, right) => right[1] - left[1]);

  return sorted[0]?.[0] ?? null;
}

function buildMatchedVideoLanguageSignals(
  items: YouTubeSearchItem[],
  query: string,
  keywords: string[]
) {
  if (items.length === 0) {
    return new Map<string, ChannelVideoLanguageSignal>();
  }

  const languageCodesByChannel = new Map<string, string[]>();
  const matchedVideoCountByChannel = new Map<string, number>();

  items.forEach((item) => {
    const channelId = item.snippet?.channelId;
    if (!channelId) return;

    const matchResult = matchesVideoTitleQuery(item.snippet?.title ?? "", query, keywords);
    if (!matchResult.isRelevant) return;

    matchedVideoCountByChannel.set(channelId, (matchedVideoCountByChannel.get(channelId) ?? 0) + 1);

    const languageCode = inferLanguageCodeFromTitle(item.snippet?.title ?? "");
    if (!languageCode) return;

    const currentCodes: string[] = languageCodesByChannel.get(channelId) ?? [];
    currentCodes.push(languageCode);
    languageCodesByChannel.set(channelId, currentCodes);
  });

  const signals = new Map<string, ChannelVideoLanguageSignal>();

  matchedVideoCountByChannel.forEach((matchedVideoCount, channelId) => {
    const languageCodes: string[] = languageCodesByChannel.get(channelId) ?? [];
    const dominantLanguageCode = getDominantLanguageCode(languageCodes);

    signals.set(channelId, {
      dominantLanguageCode,
      derivedRegionCode: deriveRegionCodeFromLanguage(dominantLanguageCode),
      matchedVideoCount
    });
  });

  return signals;
}

export async function GET(request: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing YOUTUBE_API_KEY environment variable." },
      { status: 500 }
    );
  }

  if (!query) {
    return NextResponse.json({ creators: [] });
  }

  try {
    const keywords = buildQueryKeywords(query);
    const videoSearchItems = await fetchPaginatedSearchItems(apiKey, query);

    const channelCandidates = new Map<string, ChannelCandidate>();

    collectVideoSearchCandidates(videoSearchItems, query, keywords, channelCandidates);
    const matchedVideoLanguageSignals = buildMatchedVideoLanguageSignals(
      videoSearchItems,
      query,
      keywords
    );

    const sortedChannelIds = Array.from(channelCandidates.values())
      .sort((left, right) => {
        if (right.searchScore !== left.searchScore) {
          return right.searchScore - left.searchScore;
        }

        return right.matchedVideoCount - left.matchedVideoCount;
      })
      .slice(0, MAX_CHANNEL_RESULTS)
      .map((candidate) => candidate.channelId);

    if (sortedChannelIds.length === 0) {
      return NextResponse.json({ creators: [] });
    }

    const channelItems = await fetchChannelsByIds(apiKey, sortedChannelIds);
    const channelsById = new Map(channelItems.map((channel) => [channel.id, channel]));
    const sortedChannels = sortedChannelIds
      .map((channelId) => channelsById.get(channelId))
      .filter((channel): channel is YouTubeChannelItem => Boolean(channel));

    const activityMetrics = await mapWithConcurrency(
      sortedChannels,
      CONCURRENT_ACTIVITY_REQUESTS,
      (channel) => fetchChannelActivityMetrics(apiKey, channel.contentDetails?.relatedPlaylists?.uploads)
    );

    const creators = sortedChannels.map((channel, index) => {
      const subscriberCountRaw = channel.statistics?.hiddenSubscriberCount
        ? null
        : Number(channel.statistics?.subscriberCount ?? 0);
      const subscriberCount = channel.statistics?.hiddenSubscriberCount
        ? "Hidden"
        : formatNumber(channel.statistics?.subscriberCount);
      const { averageViews, averageViewsRaw } = getAverageViews(
        channel.statistics?.viewCount,
        channel.statistics?.videoCount
      );
      const matchedVideoSignal = matchedVideoLanguageSignals.get(channel.id);
      const channelCountryCode =
        channel.snippet?.country ?? channel.brandingSettings?.channel?.country;
      const matchedLanguageCode = matchedVideoSignal?.dominantLanguageCode ?? null;
      const safeMatchedLanguageCode = matchedLanguageCode ?? undefined;
      const derivedRegionCode =
        deriveRegionCodeFromLanguage(matchedLanguageCode, channelCountryCode) ??
        matchedVideoSignal?.derivedRegionCode ??
        channelCountryCode ??
        null;
      const safeDerivedRegionCode = derivedRegionCode ?? undefined;
      const { region, regionCode } = getRegion(safeDerivedRegionCode);
      const { language, languageCode } = getLanguage(safeMatchedLanguageCode);
      const description = channel.snippet?.description ?? "";
      const emails = extractEmails(description);
      const activity = activityMetrics[index] ?? fallbackActivityMetrics;

      return {
        channelTitle: channel.snippet?.title ?? "Untitled Channel",
        channelId: channel.id,
        profileImage:
          channel.snippet?.thumbnails?.high?.url ??
          channel.snippet?.thumbnails?.medium?.url ??
          channel.snippet?.thumbnails?.default?.url ??
          "",
        subscriberCount,
        subscriberCountRaw,
        description,
        emails,
        email: emails[0] ?? "Unknown",
        channelUrl: `https://www.youtube.com/channel/${channel.id}`,
        averageViews,
        averageViewsRaw,
        engagementRate: activity.engagementRate,
        engagementRateRaw: activity.engagementRateRaw,
        lastUpload: activity.lastUpload,
        lastUploadAt: activity.lastUploadAt,
        lastUploadDaysAgo: activity.lastUploadDaysAgo,
        uploadFrequency: activity.uploadFrequency,
        uploadsPerWeekRaw: activity.uploadsPerWeekRaw,
        region,
        regionCode,
        language,
        languageCode
      };
    });

    return NextResponse.json({ creators });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected YouTube API error.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
