import { apiUrl } from "./api-base-url";

export type InvestmentAssetType =
  | "หุ้นไทย"
  | "หุ้นต่างประเทศ"
  | "กองทุน"
  | "คริปโท"
  | "ทองคำ"
  | "อื่น ๆ";

export interface InvestmentHoldingRecord {
  id: number;
  symbol: string;
  asset_name: string;
  asset_type: InvestmentAssetType;
  market: string;
  quantity: string;
  total_cost: string;
  current_price: string;
  purchase_date: string;
  notes: string | null;
}

export interface InvestmentHoldingInput {
  symbol: string;
  asset_name: string;
  asset_type: InvestmentAssetType;
  market: string;
  quantity: number;
  total_cost: number;
  current_price: number;
  purchase_date: string;
  notes: string;
}

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "ไม่สามารถเชื่อมต่อระบบจัดเก็บข้อมูลได้");
  }
  return response.json() as Promise<T>;
};

export default class InvestmentService {
  async list(): Promise<InvestmentHoldingRecord[]> {
    const response = await fetch(apiUrl("investments/list"), {
      headers: authHeaders(),
    });
    const body = await parseResponse<{ data: InvestmentHoldingRecord[] }>(response);
    return body.data;
  }

  async create(payload: InvestmentHoldingInput): Promise<InvestmentHoldingRecord> {
    const response = await fetch(apiUrl("investments/save"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await parseResponse<{ data: InvestmentHoldingRecord }>(response);
    return body.data;
  }

  async update(id: number, payload: InvestmentHoldingInput): Promise<InvestmentHoldingRecord> {
    const response = await fetch(apiUrl(`investments/${id}`), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await parseResponse<{ data: InvestmentHoldingRecord }>(response);
    return body.data;
  }

  async remove(id: number): Promise<void> {
    const response = await fetch(apiUrl(`investments/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
    });
    await parseResponse<{ message: string }>(response);
  }
}
