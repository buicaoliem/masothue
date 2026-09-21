export type VsicVersion = "2018" | "2025";
export type VsicLevel = 1 | 2 | 3 | 4 | 5;

export type VsicRelationship =
  | "one_to_one"
  | "one_to_many"
  | "many_to_one"
  | "many_to_many" // both sides have several partners; preserved as the official table shows it
  | "partial" // reserved: only set when the official source itself says the link is partial
  | "unknown";

export type VsicMapping = {
  fromVersion: VsicVersion;
  fromCode: string;
  fromName?: string;
  toVersion: VsicVersion;
  toCode: string;
  toName?: string;
  relationship: VsicRelationship;
  officialNote?: string;
  level: VsicLevel;
  /** The official table marks the code with an asterisk. The file does not explain the symbol; it is passed through, not interpreted. */
  flagged: boolean;
};

export type VsicEntry = {
  version: VsicVersion;
  code: string;
  level: VsicLevel;
  name: string;
  parentCode?: string;
  description?: string[];
  exclusions?: string[];
  source: string;
};

export type VsicSourceFile = {
  id: string;
  title: string;
  url: string;
  file: string;
  sha256: string;
  bytes: number;
  downloadedAt: string;
};
