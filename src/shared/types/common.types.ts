/** UUID string alias for clarity */
export type UUID = string;

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type Status = "active" | "inactive" | "pending" | "completed" | "cancelled";
export type Difficulty = "easy" | "medium" | "hard";
export type Priority   = "low" | "normal" | "high" | "urgent";
