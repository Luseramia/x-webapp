import GlobalApi from "./global.api";

export interface CryptoNews {
  id: number;
  title: string;
  link: string;
  source: string | null;
  pub_date: string | null;
  summary_th: string | null;
  sentiment: string | null;
  sentiment_reason: string | null;
  coins_mentioned: string[] | null;
  pre_score: number | null;
  source_attribution_score: number | null;
  source_attribution_notes: string | null;
  red_flags: string[] | null;
  credibility: string | null;
  recommended_action: string | null;
  parse_ok: boolean | null;
  analyzed_at: string;
}

export interface NewsFilters {
  sentiments: string[];
  credibilities: string[];
  coins: string[];
}

export default class CryptoNewsService {
  globalApi = new GlobalApi();

  async list(params?: {
    sentiment?: string;
    credibility?: string;
    coin?: string;
    search?: string;
    minScore?: number;
    limit?: number;
  }): Promise<CryptoNews[]> {
    const qs = new URLSearchParams();
    if (params?.sentiment) qs.set("sentiment", params.sentiment);
    if (params?.credibility) qs.set("credibility", params.credibility);
    if (params?.coin) qs.set("coin", params.coin);
    if (params?.search) qs.set("search", params.search);
    if (params?.minScore != null) qs.set("minScore", String(params.minScore));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await this.globalApi.authGet(`crypto-news/list${suffix}`);
    if (!res.ok) throw new Error("ดึงข้อมูลข่าวไม่สำเร็จ");
    return res.json();
  }

  async getFilters(): Promise<NewsFilters> {
    const res = await this.globalApi.authGet("crypto-news/filters");
    if (!res.ok) throw new Error("ดึงตัวกรองไม่สำเร็จ");
    return res.json();
  }

  async remove(id: number): Promise<void> {
    const token = localStorage.getItem("token");
    const baseUrl =
      (this.globalApi as any).baseUrl ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/crypto-news/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("ลบไม่สำเร็จ");
  }
}
