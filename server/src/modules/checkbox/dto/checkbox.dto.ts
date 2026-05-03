export interface ToggleCheckboxDto {
  index: number;
}

export interface CheckboxStateDto {
  index: number;
  checked: boolean;
  toggledBy?: string;
  toggledAt?: number;
}

export interface CheckboxBatchDto {
  // Bitfield chunks: chunkIndex -> base64 encoded bitfield chunk
  chunks: Record<number, string>;
  total: number;
}
