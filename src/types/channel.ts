export interface Channel {
  id: string;
  name: string;
  logoUrl: string | null;
  category: string;
  streamUrl: string;
  tvgId: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
}

export interface CategoryGroup {
  name: string;
  channels: Channel[];
}
