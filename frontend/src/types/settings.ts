export interface Setting {
  key: string;
  value: number;
  default: number;
  overridden: boolean;
  min: number;
  max: number;
  unit: string;
  description: string;
}
