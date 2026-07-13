import { Flag } from "../lib/flags";

type Position = "GK" | "DEF" | "MID" | "FWD";
type Formation = "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "3-4-3" | "5-3-2";
type Player = { fixturePlayerId: string; participantId: string; preferredName: string; position: Position };
type Participant = { id: string; name: string };

const formationLayout: Record<Formation, Record<Position, number>> = {
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 }
};

export function FormationPitch({ formation, playerIds, players, participants, onSlotClick }: { formation: Formation; playerIds: string[]; players: Player[]; participants: Participant[]; onSlotClick: (id: string) => void }) {
  const playerById = new Map(players.map((player) => [player.fixturePlayerId, player]));
  const teamById = new Map(participants.map((team) => [team.id, team.name]));

  return <section className="pitch" aria-label={`Your ${formation} formation`}>
    <div className="pitch-title"><span className="eyebrow">Your XI</span><strong>{formation}</strong></div>
    {(["FWD", "MID", "DEF", "GK"] as Position[]).map((position) => {
      const selected = playerIds.map((id) => playerById.get(id)).filter((player): player is Player => player?.position === position).slice(0, formationLayout[formation][position]);
      const slots = [...selected, ...Array<Player | null>(formationLayout[formation][position] - selected.length).fill(null)];
      return <div className={`pitch-row pitch-row-${position.toLowerCase()}`} key={position}>{slots.map((player, index) => player ? <button className="pitch-slot is-filled" key={player.fixturePlayerId} onClick={() => onSlotClick(player.fixturePlayerId)} aria-label={`Remove ${player.preferredName} from your XI`}><span className="pitch-slot-label">{player.preferredName.split(",")[0]}</span><span className="pitch-player-flag"><Flag countryName={teamById.get(player.participantId)} /></span></button> : <span className="pitch-slot is-empty" key={`${position}-${index}`} aria-label={`Empty ${position} slot`}>{position}</span>)}</div>;
    })}
  </section>;
}
