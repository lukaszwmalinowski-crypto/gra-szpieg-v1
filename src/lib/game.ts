import type { Player, Room, Vote } from './types';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function getStoredPlayerId() {
  const key = 'szpieg.playerId';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export function makeRoomCode(length = 5) {
  return Array.from({ length }, () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]).join('');
}

export function formatTimer(room: Room | null, now: number) {
  if (!room?.round_started_at) return formatSeconds(room?.timer_seconds ?? 0);
  const started = new Date(room.round_started_at).getTime();
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  return formatSeconds(Math.max(0, room.timer_seconds - elapsed));
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60).toString();
  const seconds = Math.floor(total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function voteSummary(players: Player[], votes: Vote[]) {
  const counts = new Map<string, number>();
  votes.forEach((vote) => counts.set(vote.voted_player_id, (counts.get(vote.voted_player_id) ?? 0) + 1));
  const sorted = [...players].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  const winner = sorted[0] ?? null;
  return {
    winner,
    winnerVotes: winner ? counts.get(winner.id) ?? 0 : 0,
    counts,
  };
}
