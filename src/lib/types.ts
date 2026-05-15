export type RoomStatus = 'lobby' | 'playing' | 'voting' | 'results';

export type Room = {
  id: string;
  code: string;
  status: RoomStatus;
  host_player_id: string | null;
  location: string | null;
  category: string;
  spy_player_id: string | null;
  current_question_target_player_id: string | null;
  round_number: number;
  timer_seconds: number;
  round_started_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
};

export type Vote = {
  id: string;
  room_id: string;
  round_number: number;
  voter_player_id: string;
  voted_player_id: string;
  created_at: string;
};
