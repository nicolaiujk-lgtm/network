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
  matchedVideoCount: number;
};

const VIDEO_SEARCH_LIMIT = 30;
const MAX_CHANNEL_RESULTS = 50;
const RECENT_UPLOAD_LIMIT = 8;
const CONCURRENT_ACTIVITY_REQUESTS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const regionNames: Record<string, string> = {
  BR: "巴西",
  US: "美国",
  KR: "韩国",
  JP: "日本",
  TH: "泰国",
  VN: "越南",
  ID: "印度尼西亚",
  PH: "菲律宾",
  HK: "港台",
  TW: "港台",
  MO: "港台",
  RU: "俄罗斯",
  TR: "土耳其",
  AE: "阿拉伯",
  SA: "阿拉伯",
  EG: "阿拉伯",
  QA: "阿拉伯",
  KW: "阿拉伯",
  BH: "阿拉伯",
  OM: "阿拉伯",
  JO: "阿拉伯",
  LB: "阿拉伯",
  IQ: "阿拉伯",
  MA: "阿拉伯",
  DZ: "阿拉伯",
  TN: "阿拉伯",
  GB: "欧洲",
  DE: "欧洲",
  FR: "欧洲",
  ES: "欧洲",
  IT: "欧洲",
  NL: "欧洲",
  PL: "欧洲",
  SE: "欧洲",
  NO: "欧洲",
  DK: "欧洲",
  FI: "欧洲",
  PT: "欧洲"
};

const languageNames: Record<string, string> = {
  pt: "葡萄牙语",
  ar: "阿拉伯语",
  en: "英语",
  es: "西班牙语",
  ko: "韩语",
  ja: "日语",
  th: "泰语",
  vi: "越南语",
  id: "印尼语",
  tl: "菲律宾语",
  fil: "菲律宾语",
  zh: "中文",
  ru: "俄语",
  tr: "土耳其语"
};

const fallbackActivityMetrics: ChannelActivityMetrics = {
  engagementRate: "暂未提供",
  engagementRateRaw: null,
  lastUpload: "暂未提供",
  lastUploadAt: null,
  lastUploadDaysAgo: null,
  uploadFrequency: "暂未提供",
  uploadsPerWeekRaw: null
};

function formatNumber(value?: string) {
  if (!value) return "未公开";
  const number = Number(value);
  if (!Number.isFinite(number)) return "未公开";

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
}

function formatPercentage(value: number | null) {
  const safeValue = value ?? 0;
  if (value === null || !Number.isFinite(safeValue)) return "暂未提供";

  return `${new Intl.NumberFormat("en", {
    minimumFractionDigits: safeValue >= 10 ? 0 : 1,
    maximumFractionDigits: 1
  }).format(safeValue)}%`;
}

function getRegion(code?: string) {
  const normalizedCode = code?.toUpperCase();
  if (!normalizedCode) return { region: "未公开", regionCode: "" };

  return {
    region: regionNames[normalizedCode] ?? normalizedCode,
    regionCode: normalizedCode
  };
}

function getLanguage(code?: string) {
  const normalizedCode = code?.split("-")[0]?.toLowerCase();
  if (!normalizedCode) return { language: "未公开", languageCode: "" };

  return {
    language: languageNames[normalizedCode] ?? normalizedCode,
    languageCode: normalizedCode
  };
}

function getAverageViews(viewCount?: string, videoCount?: string) {
  const views = Number(viewCount ?? 0);
  const videos = Number(videoCount ?? 0);
  if (!Number.isFinite(views) || !Number.isFinite(videos) || videos <= 0) {
    return { averageViews: "暂未提供", averageViewsRaw: null };
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
  if (!lastUploadAt) return { lastUpload: "暂未提供", lastUploadDaysAgo: null };

  const date = new Date(lastUploadAt);
  if (Number.isNaN(date.getTime())) {
    return { lastUpload: "暂未提供", lastUploadDaysAgo: null };
  }

  const daysAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / MS_PER_DAY));
  const dateLabel = date.toISOString().slice(0, 10);
  const suffix = daysAgo === 0 ? "今天" : daysAgo === 1 ? "1 天前" : `${daysAgo} 天前`;

  return {
    lastUpload: `${dateLabel} · ${suffix}`,
    lastUploadDaysAgo: daysAgo
  };
}

function getUploadFrequency(uploadsPerWeekRaw: number | null) {
  const safeUploadsPerWeek = uploadsPerWeekRaw ?? 0;
  if (uploadsPerWeekRaw === null || !Number.isFinite(safeUploadsPerWeek)) return "暂未提供";
  if (safeUploadsPerWeek >= 3) return "每周 3 次以上";
  if (safeUploadsPerWeek >= 1) return "每周更新";
  if (safeUploadsPerWeek >= 0.25) return "每月更新";
  return "低于每月更新";
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
  keywords: string[],
  candidates: Map<string, ChannelCandidate>
) {
  items.forEach((item, index) => {
    const channelId = item.snippet?.channelId;
    if (!channelId) return;

    const titleMatches = countKeywordMatches(item.snippet?.title ?? "", keywords);
    const descriptionMatches = countKeywordMatches(item.snippet?.description ?? "", keywords);
    const scoreDelta = 140 - index * 2 + titleMatches * 24 + descriptionMatches * 6;

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
    const recentUploads = playlistData.items ?? [];
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
  maxResults: number
) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  return fetchYouTubeJson<{ items?: YouTubeSearchItem[] }>(searchUrl);
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

async function fetchMatchedVideoLanguageSignals(apiKey: string, videoIds: string[]) {
  const uniqueVideoIds = Array.from(new Set(videoIds)).filter(Boolean);
  if (uniqueVideoIds.length === 0) {
    return new Map<string, ChannelVideoLanguageSignal>();
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet");
  videosUrl.searchParams.set("id", uniqueVideoIds.join(","));
  videosUrl.searchParams.set("key", apiKey);

  const videosData = await fetchYouTubeJson<{ items?: YouTubeVideoItem[] }>(videosUrl);
  const languageCodesByChannel = new Map<string, string[]>();
  const matchedVideoCountByChannel = new Map<string, number>();

  (videosData.items ?? []).forEach((video) => {
    const channelId = video.snippet?.channelId;
    if (!channelId) return;

    matchedVideoCountByChannel.set(channelId, (matchedVideoCountByChannel.get(channelId) ?? 0) + 1);

    const languageCode = video.snippet?.defaultAudioLanguage ?? video.snippet?.defaultLanguage;
    if (!languageCode) return;

    const currentCodes = languageCodesByChannel.get(channelId) ?? [];
    currentCodes.push(languageCode);
    languageCodesByChannel.set(channelId, currentCodes);
  });

  const signals = new Map<string, ChannelVideoLanguageSignal>();

  matchedVideoCountByChannel.forEach((matchedVideoCount, channelId) => {
    const languageCodes = languageCodesByChannel.get(channelId) ?? [];

    signals.set(channelId, {
      dominantLanguageCode: getDominantLanguageCode(languageCodes),
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
    const videoSearchData = await fetchSearchItems(apiKey, query, VIDEO_SEARCH_LIMIT);

    const channelCandidates = new Map<string, ChannelCandidate>();
    const matchedVideoIds = (videoSearchData.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId));

    collectVideoSearchCandidates(videoSearchData.items ?? [], keywords, channelCandidates);
    const matchedVideoLanguageSignals = await fetchMatchedVideoLanguageSignals(apiKey, matchedVideoIds);

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

    const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelsUrl.searchParams.set("part", "snippet,statistics,brandingSettings,contentDetails");
    channelsUrl.searchParams.set("id", sortedChannelIds.join(","));
    channelsUrl.searchParams.set("key", apiKey);

    const channelsData = await fetchYouTubeJson<{ items?: YouTubeChannelItem[] }>(channelsUrl);
    const channelsById = new Map((channelsData.items ?? []).map((channel) => [channel.id, channel]));
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
        ? "未公开"
        : formatNumber(channel.statistics?.subscriberCount);
      const { averageViews, averageViewsRaw } = getAverageViews(
        channel.statistics?.viewCount,
        channel.statistics?.videoCount
      );
      const matchedVideoSignal = matchedVideoLanguageSignals.get(channel.id);
      const { region, regionCode } = getRegion(
        channel.snippet?.country ?? channel.brandingSettings?.channel?.country
      );
      const { language, languageCode } = getLanguage(
        matchedVideoSignal?.dominantLanguageCode ??
          channel.snippet?.defaultLanguage ??
          channel.brandingSettings?.channel?.defaultLanguage
      );
      const description = channel.snippet?.description ?? "";
      const emails = extractEmails(description);
      const activity = activityMetrics[index] ?? fallbackActivityMetrics;

      return {
        channelTitle: channel.snippet?.title ?? "未命名频道",
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
        email: emails[0] ?? "未公开",
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
