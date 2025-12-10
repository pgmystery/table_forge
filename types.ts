export enum FieldType {
  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',
  Select = 'select',
  KeyValueSelect = 'key_value_select',
  ImageURL = 'image_url', // Link to an image on the web
  ImageFile = 'image_file', // Local file upload (Base64 storage, Filename export)
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

export interface RowData {
  __groupId?: string;
  [key: string]: any;
}

export interface GroupDefinition {
  id: string;
  name: string;
  color?: string;
  collapsed?: boolean;
  assetPrefix?: string; // Group-specific asset prefix (overrides global if set)
}

export interface ProjectData {
  name: string;
  schema: FieldDefinition[];
  groups: GroupDefinition[];
  rows: RowData[];
  assetPrefix?: string; // Global prefix for local assets (e.g. "assets/sprites/")
  csvSeparator?: string; // Preferred CSV separator character
}
