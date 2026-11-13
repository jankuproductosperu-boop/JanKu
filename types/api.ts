export type ApiError = { error: string; code?: string; fields?: Record<string, string> };
export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
