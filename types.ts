
export type VideoType = 'short' | 'long';

export interface Video {
  id: string;
  video_url: string;
  poster_url?: string;
  type: VideoType;
  likes: number;
  views: number;
  title: string;
  category: string;
  narration?: string; // New: Narration/Subtitles text
  tags?: string[];
  created_at?: string;
  public_id: string;
  external_link?: string;
  isFeatured?: boolean;
  telegram_file_id?: string; // New: Store telegram file ID
}

export interface UserInteractions {
  likedIds: string[];
  dislikedIds: string[];
  savedIds: string[];
  savedCategoryNames: string[]; 
  watchHistory: { id: string; progress: number }[];
  downloadedIds: string[];
}

export enum AppView {
  HOME = 'home',
  TREND = 'trend',
  LIKES = 'likes',
  SAVED = 'saved',
  UNWATCHED = 'unwatched',
  HIDDEN = 'hidden',
  PRIVACY = 'privacy',
  ADMIN = 'admin',
  CATEGORY = 'category',
  OFFLINE = 'offline'
}
