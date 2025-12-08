export enum FieldType {
  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',
  Select = 'select',
  KeyValueSelect = 'key_value_select', // New type
  Image = 'image', // Stores a URL
  LongText = 'longtext'
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  options?: string[]; // For simple Select type
  keyValueOptions?: { key: string; value: string }[]; // For KeyValueSelect type
  defaultValue?: any;
}

export type RowData = Record<string, any>;

export interface ProjectData {
  name: string;
  schema: FieldDefinition[];
  rows: RowData[];
}

export interface AiGenerationConfig {
  apiKey?: string;
  prompt?: string;
  count?: number;
}