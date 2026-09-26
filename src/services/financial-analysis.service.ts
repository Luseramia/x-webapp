const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type FinancialUnit = "ONES" | "THOUSAND" | "MILLION" | "BILLION";
export type FinancialScope = "CONSOLIDATED" | "SEPARATE";
export type WorkbookCell = string | number | boolean | null;

export interface WorkbookSheet {
  name: string;
  rows: WorkbookCell[][];
}

export interface FinancialCompany {
  id: number;
  name: string;
  ticker: string | null;
  market: string | null;
  industry: string | null;
  sector: string | null;
  country: string;
  default_currency: string;
}

export interface CanonicalAccount {
  code: string;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY";
  subcategory: string;
  isTotal?: boolean;
}

export interface ImportValue {
  periodEnd: string;
  value: number;
  originalValue: string;
  sourceColumn?: number;
}

export interface FinancialImportRow {
  originalLabel: string;
  canonicalCode?: string | null;
  confidence?: number;
  mappingSource?: string;
  sourceSheet?: string;
  sourceRow: number;
  values: ImportValue[];
}

export interface ValidationResult {
  periodEnd: string;
  status: "PASS" | "WARNING" | "FAIL";
  difference: number;
  differencePercent: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface PreviewResult {
  rows: Array<FinancialImportRow & { normalizedLabel: string; canonicalCode: string | null; confidence: number; mappingSource: string }>;
  validation: ValidationResult[];
  duplicates: Array<{ periodEnd: string; canonicalCode: string }>;
  requiresMapping: number;
}

export interface AiPreviewResult extends PreviewResult {
  currency: string;
  unit: FinancialUnit;
  scope: FinancialScope;
  normalizationWarnings: string[];
  requiresHumanReview: true;
}

export interface FinancialMetrics {
  currentAssets: number;
  nonCurrentAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebt: number;
  cash: number;
  netDebt: number;
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  debtToAssets: number | null;
  netDebtToEquity: number | null;
  cashToAssets: number | null;
  receivablesToAssets: number | null;
  inventoryToAssets: number | null;
  ppeToAssets: number | null;
  goodwillToAssets: number | null;
  equityToAssets: number | null;
}

export interface FinancialSource {
  documentId: number;
  originalLabel: string;
  originalValue: string;
  sourceSheet?: string | null;
  sourceRow: number;
  sourceColumn?: number | null;
  confidence: number;
}

export interface FinancialPeriod {
  periodEnd: string;
  fiscalYear: number;
  values: Record<string, number>;
  sources: Record<string, FinancialSource>;
  metrics: FinancialMetrics;
  validation: ValidationResult;
}

export interface FinancialDashboard {
  company: FinancialCompany;
  accounts: CanonicalAccount[];
  documents: Array<{ id: number; file_name: string; period_end: string; validation_status: string; created_at: string }>;
  periods: FinancialPeriod[];
  directions: Array<{ dimension: string; trend: string; value: number | null; evidence: string }>;
  signals: Array<{ id: string; category: string; severity: "info" | "warning" | "danger"; title: string; message: string; evidence: string[] }>;
  growth?: { assets: number | null; debt: number | null; cash: number | null; equity: number | null };
  summary: string;
}

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/financial-analysis${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "ไม่สามารถเชื่อมต่อระบบวิเคราะห์งบการเงินได้");
  return body.data as T;
}

export default class FinancialAnalysisService {
  listCompanies() {
    return request<FinancialCompany[]>("/companies");
  }

  createCompany(input: { name: string; ticker?: string; market?: string; industry?: string; defaultCurrency?: string }) {
    return request<FinancialCompany>("/companies", { method: "POST", body: JSON.stringify(input) });
  }

  accounts() {
    return request<CanonicalAccount[]>("/accounts");
  }

  preview(input: { companyId: number; unit: FinancialUnit; rows: FinancialImportRow[] }) {
    return request<PreviewResult>("/preview", { method: "POST", body: JSON.stringify(input) });
  }

  aiPreview(input: {
    companyId: number;
    fileName: string;
    preferredScope: FinancialScope;
    currencyHint?: string;
    unitHint?: FinancialUnit;
    sheets: WorkbookSheet[];
  }) {
    return request<AiPreviewResult>("/ai-preview", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  importStatement(input: { companyId: number; fileName: string; fileType: string; currency: string; unit: FinancialUnit; rows: FinancialImportRow[] }) {
    return request<{ documentIds: number[]; validation: ValidationResult[] }>("/import", { method: "POST", body: JSON.stringify(input) });
  }

  dashboard(companyId: number) {
    return request<FinancialDashboard>(`/companies/${companyId}/dashboard`);
  }
}
