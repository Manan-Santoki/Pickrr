export interface QbitTorrent {
  hash: string;
  name: string;
  size: number;
  progress: number; // 0.0 to 1.0
  dlspeed: number; // bytes/sec
  upspeed: number;
  num_seeds: number;
  num_leechs: number;
  eta: number; // seconds, 8640000 = infinity
  state: string; // 'downloading' | 'uploading' | 'stalledDL' | 'pausedDL' etc.
  save_path: string;
  category: string;
  tags: string;
  added_on: number; // unix timestamp
  completion_on: number;
}
