const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (configuredBaseUrl || (import.meta.env?.PROD ? "/api" : "http://localhost:3000")).replace(/\/+$/, "");

export function apiUrl(endpoint: string): string {
  return `${API_BASE_URL}/${endpoint.replace(/^\/+/, "")}`;
}
