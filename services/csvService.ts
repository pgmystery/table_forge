import { ProjectData, FieldType } from "../types";

export const exportToCsv = (project: ProjectData, separator: string = ','): string => {
  const headers = project.schema.map(f => {
    const val = f.name;
    // Escape headers if they contain the separator, quotes, or newlines
    if (val.includes(separator) || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(separator);

  const rows = project.rows.map(row => {
    return project.schema.map(field => {
      let value = row[field.id];

      // Handle ImageFile special object structure
      if (field.type === FieldType.ImageFile && typeof value === 'object' && value !== null) {
        // Priority: filePath > fileName > empty
        value = value.filePath || value.fileName || '';
      }

      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains separator, quote or newline
      if (stringValue.includes(separator) || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(separator);
  }).join('\n');

  return `${headers}\n${rows}`;
};

export const downloadCsv = (csvContent: string, filename: string) => {
  // Prepend BOM (\uFEFF) to ensure Excel opens the file as UTF-8
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadJson = (data: ProjectData, filename: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename + ".json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
