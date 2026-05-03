export interface BaseDto {
  success: boolean;
  message: string;
  timestamp: number;
}

export interface PaginatedDto<T> extends BaseDto {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
