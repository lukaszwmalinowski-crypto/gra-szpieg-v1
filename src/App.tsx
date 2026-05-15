import { Copy, Eye, EyeOff, Play, Plus, Radio, Send, Shield, Swords, Users, Vote as VoteIcon } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { locationCategories, pickLocation } from './data/locations';
import { formatTimer, getStoredPlayerId, makeRoomCode, voteSummary } from './lib/game';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { Player, Room, Vote } from './lib/types';

type Screen = 'home' | 'create' | 'join' | 'room';

type RoomViewProps = {
  room: Room;
  players: Player[];
  gamePlayers: Player[];
  votes: Vote[];
  me: Player | null;
  isHost: boolean;
  currentTarget: Player | null;
  myVote: Vote | undefined;
  roleHidden: boolean;
  timer: string;
  onCopy: () => void;
  onStartRound: () => void;
  onAskPlayer: (id: string) => void;
  onStartVoting: () => void;
  onCastVote: (id: string) => void;
  onShowResults: () => void;
  onEndRound: () => void;
  onToggleRole: () => void;
};

const roundOptions = [
  { label: '5 min', value: 300 },
  { label: '8 min', value: 480 },
  { label: '10 min', value: 600 },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [playerId] = useState(() => getStoredPlayerId());
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(new URLSearchParams(location.search).get('room') ?? '');
  const [category, setCategory] = useState(locationCategories[0].id);
  const [timerSeconds, setTimerSeconds] = useState(480);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [roleHidden, setRoleHidden] = useState(false);
  const [now, setNow] = useState(Date.now());

  const me = players.find((player) => player.id === playerId) ?? null;
  const isHost = Boolean(me?.is_host && room?.host_player_id === playerId);
  const gamePlayers = useMemo(() => players.filter((player) => !player.is_host), [players]);
  const currentTarget = players.find((player) => player.id === room?.current_question_target_player_id) ?? null;
  const myVote = votes.find((vote) => vote.voter_player_id === playerId);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (joinCode) setScreen('join');
  }, []);

  useEffect(() => {
    if (!room?.id) return;

    const reload = async () => {
      const [{ data: roomData }, { data: playerData }, { data: voteData }] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', room.id).single(),
        supabase.from('players').select('*').eq('room_id', room.id).order('joined_at'),
        supabase.from('votes').select('*').eq('room_id', room.id).eq('round_number', room.round_number),
      ]);
      if (roomData) setRoom(roomData);
      if (playerData) setPlayers(playerData);
      if (voteData) setVotes(voteData);
    };

    reload();
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${room.id}` }, reload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, room?.round_number]);

  useEffect(() => {
    if (!room?.id || !me) return;
    const interval = window.setInterval(() => {
      supabase.from('players').update({ last_seen_at: new Date().toISOString() }).eq('id', playerId);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [me, playerId, room?.id]);

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    const hostName = name.trim();
    if (!hostName) return setMessage('Wpisz nick hosta.');
    if (!isSupabaseConfigured) return setMessage('Uzupełnij konfigurację Supabase.');
    setBusy(true);
    setMessage('');

    try {
      const createdRoom = await createUniqueRoom();
      const nowIso = new Date().toISOString();
      const { error: playerError } = await supabase.from('players').upsert({
        id: playerId,
        room_id: createdRoom.id,
        name: hostName,
        is_host: true,
        joined_at: nowIso,
        last_seen_at: nowIso,
      });
      if (playerError) throw playerError;

      const { data, error } = await supabase
        .from('rooms')
        .update({ host_player_id: playerId })
        .eq('id', createdRoom.id)
        .select()
        .single();
      if (error) throw error;
      setRoom(data);
      setPlayers([{ id: playerId, room_id: data.id, name: hostName, is_host: true, joined_at: nowIso, last_seen_at: nowIso }]);
      setScreen('room');
    } catch {
      setMessage('Nie udało się utworzyć pokoju.');
    } finally {
      setBusy(false);
    }
  }

  async function createUniqueRoom(attempt = 0): Promise<Room> {
    if (attempt > 4) throw new Error('Room code collision');
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code: makeRoomCode(),
        status: 'lobby',
        category,
        timer_seconds: timerSeconds,
        round_number: 0,
      })
      .select()
      .single();
    if (error?.code === '23505') return createUniqueRoom(attempt + 1);
    if (error || !data) throw error;
    return data;
  }

  async function joinRoom(event: FormEvent) {
    event.preventDefault();
    const playerName = name.trim();
    const code = joinCode.trim().toUpperCase();
    if (!playerName) return setMessage('Wpisz nick.');
    if (!code) return setMessage('Wpisz kod pokoju.');
    if (!isSupabaseConfigured) return setMessage('Uzupełnij konfigurację Supabase.');
    setBusy(true);
    setMessage('');

    try {
      const { data: foundRoom, error: roomError } = await supabase.from('rooms').select('*').eq('code', code).single();
      if (roomError || !foundRoom) return setMessage('Nie znaleziono pokoju.');
      if (foundRoom.status !== 'lobby') return setMessage('Pokój już trwa.');

      const nowIso = new Date().toISOString();
      const { error: playerError } = await supabase.from('players').upsert({
        id: playerId,
        room_id: foundRoom.id,
        name: playerName,
        is_host: false,
        joined_at: nowIso,
        last_seen_at: nowIso,
      });
      if (playerError) throw playerError;
      setRoom(foundRoom);
      setScreen('room');
    } catch {
      setMessage('Wystąpił błąd Supabase.');
    } finally {
      setBusy(false);
    }
  }

  async function startRound() {
    if (!room) return;
    if (gamePlayers.length < 3) return setMessage('Potrzeba min. 3 graczy.');
    const spyPlayer = gamePlayers[Math.floor(Math.random() * gamePlayers.length)];
    const locationName = pickLocation(room.category);
    setRoleHidden(false);
    setMessage('');
    await updateRoom({
      status: 'playing',
      location: locationName,
      spy_player_id: spyPlayer.id,
      current_question_target_player_id: null,
      round_number: room.round_number + 1,
      round_started_at: new Date().toISOString(),
    });
  }

  async function askPlayer(targetId: string) {
    await updateRoom({ current_question_target_player_id: targetId });
  }

  async function startVoting() {
    setMessage('');
    await updateRoom({ status: 'voting' });
  }

  async function castVote(votedPlayerId: string) {
    if (!room || myVote) return setMessage('Głos został już oddany.');
    const { error } = await supabase.from('votes').insert({
      room_id: room.id,
      round_number: room.round_number,
      voter_player_id: playerId,
      voted_player_id: votedPlayerId,
    });
    if (error) setMessage(error.code === '23505' ? 'Głos został już oddany.' : 'Nie udało się oddać głosu.');
  }

  async function showResults() {
    await updateRoom({ status: 'results' });
  }

  async function endRound() {
    await updateRoom({ status: 'results' });
  }

  async function updateRoom(patch: Partial<Room>) {
    if (!room) return;
    const { error } = await supabase.from('rooms').update(patch).eq('id', room.id);
    if (error) setMessage('Wystąpił błąd Supabase.');
  }

  function copyInvite() {
    if (!room) return;
    const url = `${location.origin}${location.pathname}?room=${room.code}`;
    navigator.clipboard?.writeText(url);
    setMessage('Link skopiowany.');
  }

  return (
    <main className="app-shell">
      <div className="ambient" />
      <section className="phone-frame">
        {screen === 'home' && <Home onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} />}
        {screen === 'create' && (
          <CreateRoom
            name={name}
            setName={setName}
            category={category}
            setCategory={setCategory}
            timerSeconds={timerSeconds}
            setTimerSeconds={setTimerSeconds}
            busy={busy}
            onSubmit={createRoom}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'join' && (
          <JoinRoom
            name={name}
            setName={setName}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            busy={busy}
            onSubmit={joinRoom}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'room' && room && (
          <RoomView
            room={room}
            players={players}
            gamePlayers={gamePlayers}
            votes={votes}
            me={me}
            isHost={isHost}
            currentTarget={currentTarget}
            myVote={myVote}
            roleHidden={roleHidden}
            timer={formatTimer(room, now)}
            onCopy={copyInvite}
            onStartRound={startRound}
            onAskPlayer={askPlayer}
            onStartVoting={startVoting}
            onCastVote={castVote}
            onShowResults={showResults}
            onEndRound={endRound}
            onToggleRole={() => setRoleHidden((value) => !value)}
          />
        )}
        {message && <div className="toast">{message}</div>}
      </section>
    </main>
  );
}

function Home({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="screen home-screen">
      <div>
        <div className="badge"><Shield size={16} /> tajna misja</div>
        <h1>Szpieg</h1>
        <p>Jedno miejsce. Jeden blef. Wszyscy patrzą podejrzliwie.</p>
      </div>
      <div className="stack">
        <button className="primary huge" onClick={onCreate}><Plus />Utwórz pokój</button>
        <button className="secondary huge" onClick={onJoin}><Radio />Dołącz do gry</button>
      </div>
    </div>
  );
}

function CreateRoom(props: {
  name: string;
  setName: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  timerSeconds: number;
  setTimerSeconds: (value: number) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form className="screen" onSubmit={props.onSubmit}>
      <Header title="Nowy pokój" onBack={props.onBack} />
      <label>Nick hosta<input value={props.name} onChange={(event) => props.setName(event.target.value)} placeholder="np. Łukasz" /></label>
      <label>Kategoria<select value={props.category} onChange={(event) => props.setCategory(event.target.value)}>{locationCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div>
        <span className="label">Czas rundy</span>
        <div className="segments">{roundOptions.map((option) => <button type="button" className={props.timerSeconds === option.value ? 'active' : ''} key={option.value} onClick={() => props.setTimerSeconds(option.value)}>{option.label}</button>)}</div>
      </div>
      <div className="mini-card"><Swords /> 1 szpieg w rundzie</div>
      <button className="primary sticky-action" disabled={props.busy}>{props.busy ? 'Tworzenie...' : 'Utwórz pokój'}</button>
    </form>
  );
}

function JoinRoom(props: {
  name: string;
  setName: (value: string) => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form className="screen" onSubmit={props.onSubmit}>
      <Header title="Dołącz" onBack={props.onBack} />
      <label>Kod pokoju<input className="code-input" value={props.joinCode} onChange={(event) => props.setJoinCode(event.target.value.toUpperCase())} placeholder="A7K2Q" /></label>
      <label>Nick<input value={props.name} onChange={(event) => props.setName(event.target.value)} placeholder="Jak mamy Cię wołać?" /></label>
      <button className="primary sticky-action" disabled={props.busy}>{props.busy ? 'Dołączanie...' : 'Dołącz do gry'}</button>
    </form>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="topbar"><button type="button" className="ghost" onClick={onBack}>←</button><h2>{title}</h2></header>;
}

function RoomView(props: RoomViewProps) {
  if (props.room.status === 'lobby') return <Lobby {...props} />;
  if (props.isHost) return <HostRound {...props} />;
  return <PlayerRound {...props} />;
}

function Lobby({ room, players, gamePlayers, isHost, onCopy, onStartRound }: RoomViewProps) {
  return (
    <div className="screen">
      <div className="room-code"><span>Kod pokoju</span><strong>{room.code}</strong><button className="icon-button" onClick={onCopy} aria-label="Kopiuj link"><Copy size={20} /></button></div>
      <div className="section-title"><Users size={18} /> Gracze ({gamePlayers.length})</div>
      <PlayerList players={players} />
      {isHost ? (
        <button className="primary sticky-action" disabled={gamePlayers.length < 3} onClick={onStartRound}><Play />Rozpocznij grę</button>
      ) : (
        <div className="waiting">Czekamy, aż host rozpocznie grę.</div>
      )}
    </div>
  );
}

function HostRound({ room, gamePlayers, votes, currentTarget, timer, onAskPlayer, onStartVoting, onShowResults, onEndRound, onStartRound }: RoomViewProps) {
  const votingDone = votes.length >= gamePlayers.length;
  if (room.status === 'results') return <Results room={room} gamePlayers={gamePlayers} votes={votes} onStartRound={onStartRound} />;
  return (
    <div className="screen">
      <StatusBar timer={timer} status={room.status} />
      {room.status === 'voting' ? (
        <>
          <div className="hero-card"><VoteIcon /> Zagłosowało {votes.length}/{gamePlayers.length}</div>
          <button className="primary sticky-action" onClick={onShowResults}>{votingDone ? 'Pokaż wynik' : 'Zakończ i pokaż wynik'}</button>
        </>
      ) : (
        <>
          <div className="target-box">{currentTarget ? `Odpowiada: ${currentTarget.name}` : 'Wybierz osobę do pytania'}</div>
          <div className="player-actions">
            {gamePlayers.map((player) => <button key={player.id} className={currentTarget?.id === player.id ? 'selected' : ''} onClick={() => onAskPlayer(player.id)}>{player.name}<span>Zadaj pytanie</span></button>)}
          </div>
          <div className="two-actions">
            <button className="secondary" onClick={onStartVoting}><VoteIcon />Głosowanie</button>
            <button className="danger" onClick={onEndRound}>Zakończ</button>
          </div>
        </>
      )}
    </div>
  );
}

function PlayerRound({ room, me, gamePlayers, votes, currentTarget, myVote, roleHidden, timer, onToggleRole, onCastVote }: RoomViewProps) {
  if (room.status === 'results') return <Results room={room} gamePlayers={gamePlayers} votes={votes} canStart={false} />;
  const amSpy = me?.id === room.spy_player_id;
  const answersNow = currentTarget?.id === me?.id;

  return (
    <div className="screen">
      <StatusBar timer={timer} status={room.status} />
      {room.status === 'voting' ? (
        <div className="stack">
          <h2>Kto jest szpiegiem?</h2>
          {myVote ? <div className="waiting">Twój głos zapisany.</div> : gamePlayers.map((player) => <button className="vote-row" key={player.id} onClick={() => onCastVote(player.id)}>{player.name}<Send size={18} /></button>)}
        </div>
      ) : (
        <>
          <RoleCard amSpy={amSpy} locationName={room.location} hidden={roleHidden} onToggle={onToggleRole} />
          <div className={answersNow ? 'answer-now pulse' : 'target-box'}>{answersNow ? 'Teraz odpowiadasz!' : currentTarget ? `Odpowiada: ${currentTarget.name}` : 'Host wybiera pytanego.'}</div>
        </>
      )}
    </div>
  );
}

function RoleCard({ amSpy, locationName, hidden, onToggle }: { amSpy: boolean; locationName: string | null; hidden: boolean; onToggle: () => void }) {
  return (
    <div className={`role-card ${hidden ? 'covered' : ''}`}>
      {hidden ? <><EyeOff size={40} /><strong>Karta ukryta</strong></> : amSpy ? <><Shield size={40} /><strong>Jesteś szpiegiem.</strong><p>Nie znasz miejsca. Słuchaj odpowiedzi i nie daj się złapać.</p></> : <><Eye size={40} /><span>Twoje miejsce</span><strong>{locationName}</strong></>}
      <button className="secondary" onClick={onToggle}>{hidden ? 'Pokaż kartę' : 'Ukryj kartę'}</button>
    </div>
  );
}

function Results({ room, gamePlayers, votes, onStartRound, canStart = true }: { room: Room; gamePlayers: Player[]; votes: Vote[]; onStartRound?: () => void; canStart?: boolean }) {
  const summary = voteSummary(gamePlayers, votes);
  const spy = gamePlayers.find((player) => player.id === room.spy_player_id);
  const caught = summary.winner?.id === room.spy_player_id;
  return (
    <div className="screen results">
      <div className="result-banner">{caught ? 'Wygrywają gracze' : 'Wygrywa szpieg'}</div>
      <p>Najwięcej głosów: <strong>{summary.winner?.name ?? 'brak'}</strong> ({summary.winnerVotes})</p>
      <p>Szpiegiem był(a): <strong>{spy?.name ?? 'nieznany gracz'}</strong></p>
      <p>Miejsce: <strong>{room.location}</strong></p>
      <div className="vote-breakdown">
        {gamePlayers.map((player) => <span key={player.id}>{player.name}: {summary.counts.get(player.id) ?? 0}</span>)}
      </div>
      {canStart ? <button className="primary sticky-action" onClick={onStartRound}>Nowa runda</button> : <div className="waiting">Host może rozpocząć kolejną rundę.</div>}
    </div>
  );
}

function StatusBar({ timer, status }: { timer: string; status: string }) {
  return <div className="status-bar"><strong>{timer}</strong><span>{status === 'voting' ? 'Głosowanie' : 'Runda trwa'}</span></div>;
}

function PlayerList({ players }: { players: Player[] }) {
  return (
    <div className="player-list">
      {players.map((player) => {
        const isOffline = Date.now() - new Date(player.last_seen_at).getTime() > 45000;
        return (
          <div key={player.id}>
            <span>{player.name}</span>
            <small>{isOffline ? 'brak połączenia' : player.is_host ? 'host' : 'gotowy'}</small>
          </div>
        );
      })}
    </div>
  );
}
