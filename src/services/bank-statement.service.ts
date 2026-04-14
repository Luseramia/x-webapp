import GlobalApi from "./global.api";

export interface Transaction {
  datetime: string;
  transaction_type: string;
  withdrawal: string;
  deposit: string;
  balance: string;
  channel: string;
  details: string;
}

export interface ProcessStatementResponse {
  transactions: Transaction[];
}

export default class BankStatementService {
  globalApi = new GlobalApi();

  async processStatement(file: FormData): Promise<ProcessStatementResponse> {
    const response = await this.globalApi.authPost("ocr/process-statement", file);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || response.statusText);
    }
    return response.json();
  }

  async getTransactions(params?: { year?: number; month?: number; day?: number }): Promise<Transaction[]> {
    const query = new URLSearchParams();
    if (params?.year) query.set("year", String(params.year));
    if (params?.month) query.set("month", String(params.month));
    if (params?.day) query.set("day", String(params.day));
    const qs = query.toString();
    const response = await this.globalApi.authGet(`ocr/transactions${qs ? `?${qs}` : ""}`);
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    return response.json();
  }

  async saveTransactions(transactions: Transaction[]): Promise<Response> {
    return this.globalApi.authPostJson("ocr/save-transactions", { transactions });
  }
}
