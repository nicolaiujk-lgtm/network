import { NextResponse } from "next/server";

type YouTubeSearchItem = {
  id?: {
    channelId?: string;
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
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

const regionNames: Record<string, string> = {
  BR: "巴西",
  US: "美国",
  ID: "印度尼西亚",
  AE: "中东",
  SA: "中东",
  EG: "中东",
  QA: "中东",
  KW: "中东",
  BH: "中东",
  OM: "中东",
  JO: "中东",
  LB: "中东",
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
  es: "西班牙语"
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
  if (!Number.isFinite(views) || !Number.isFinite(videos) || videos <= 0) return "暂未提供";

  return formatNumber(String(Math.round(views / videos)));
}

function extractEmails(text?: string) {
  if (!text) return [];

  return Array.from(
    new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
  );
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
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "channel");
    searchUrl.searchParams.set("maxResults", "50");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("key", apiKey);

    const searchResponse = await fetch(searchUrl, {
      next: { revalidate: 300 }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      return NextResponse.json(
        { error: "YouTube channel search failed.", details: errorText },
        { status: searchResponse.status }
      );
    }

    const searchData = (await searchResponse.json()) as { items?: YouTubeSearchItem[] };
    const channelIds = Array.from(
      new Set(searchData.items?.map((item) => item.id?.channelId).filter(Boolean) as string[])
    );

    if (channelIds.length === 0) {
      return NextResponse.json({ creators: [] });
    }

    const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelsUrl.searchParams.set("part", "snippet,statistics,brandingSettings");
    channelsUrl.searchParams.set("id", channelIds.join(","));
    channelsUrl.searchParams.set("key", apiKey);

    const channelsResponse = await fetch(channelsUrl, {
      next: { revalidate: 300 }
    });

    if (!channelsResponse.ok) {
      const errorText = await channelsResponse.text();
      return NextResponse.json(
        { error: "YouTube channel details lookup failed.", details: errorText },
        { status: channelsResponse.status }
      );
    }

    const channelsData = (await channelsResponse.json()) as { items?: YouTubeChannelItem[] };
    const creators = (channelsData.items ?? []).map((channel) => {
      const subscriberCountRaw = channel.statistics?.hiddenSubscriberCount
        ? null
        : Number(channel.statistics?.subscriberCount ?? 0);
      const subscriberCount = channel.statistics?.hiddenSubscriberCount
        ? "未公开"
        : formatNumber(channel.statistics?.subscriberCount);
      const viewCount = Number(channel.statistics?.viewCount ?? 0);
      const videoCount = Number(channel.statistics?.videoCount ?? 0);
      const averageViewsRaw =
        Number.isFinite(viewCount) && Number.isFinite(videoCount) && videoCount > 0
          ? Math.round(viewCount / videoCount)
          : null;
      const { region, regionCode } = getRegion(
        channel.snippet?.country ?? channel.brandingSettings?.channel?.country
      );
      const { language, languageCode } = getLanguage(
        channel.snippet?.defaultLanguage ?? channel.brandingSettings?.channel?.defaultLanguage
      );

      const description = channel.snippet?.description ?? "";
      const emails = extractEmails(description);

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
        averageViews: getAverageViews(channel.statistics?.viewCount, channel.statistics?.videoCount),
        averageViewsRaw,
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
