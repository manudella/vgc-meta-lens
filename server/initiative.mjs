import fs from "node:fs";
const metadata = JSON.parse(
  fs.readFileSync(
    new URL("../vendor/showdown/move-priority.json", import.meta.url),
    "utf8",
  ),
).moves;
export function movePriority(move, pokemon, terrain, grounded) {
  if (move.name === "(No Move)") return { priority: 0, target: "self" };
  const meta = metadata[move.name];
  if (!meta) return { priority: null, target: "normal" };
  let priority = meta.priority;
  if (pokemon.ability === "Prankster" && move.category === "Status") priority++;
  if (
    pokemon.ability === "Gale Wings" &&
    move.type === "Flying" &&
    pokemon.curHP === pokemon.maxHP
  )
    priority++;
  if (pokemon.ability === "Triage" && move.isHealing) priority += 3;
  if (move.name === "Grassy Glide" && terrain === "Grassy" && grounded)
    priority++;
  return { ...meta, priority };
}
export function attackOrder({
  teamSpeed,
  opponentSpeed,
  teamMove,
  opponentMove,
  teamAbility = "",
  opponentAbility = "",
  teamItem = "",
  opponentItem = "",
  trickRoom = false,
}) {
  const speed =
    teamSpeed === opponentSpeed
      ? "tie"
      : teamSpeed > opponentSpeed
        ? "team"
        : "opponent";
  const result = {
    speed,
    teamSpeed,
    opponentSpeed,
    teamPriority: teamMove.priority,
    opponentPriority: opponentMove.priority,
    teamMove: teamMove.move,
    opponentMove: opponentMove.move,
  };
  if (teamMove.priority === null || opponentMove.priority === null)
    return { ...result, first: "unknown", reason: "Move priority unavailable" };
  if (teamMove.blocked || opponentMove.blocked)
    return {
      ...result,
      first: "blocked",
      reason: teamMove.blocked
        ? `Your move: ${teamMove.blocked}`
        : `Opponent move: ${opponentMove.blocked}`,
    };
  if (teamMove.priority !== opponentMove.priority)
    return {
      ...result,
      first: teamMove.priority > opponentMove.priority ? "team" : "opponent",
      reason: "Priority bracket",
    };
  if (
    [teamItem, opponentItem].some((x) =>
      ["Quick Claw", "Custap Berry"].includes(x),
    ) ||
    [teamAbility, opponentAbility].includes("Quick Draw")
  )
    return {
      ...result,
      first: "unknown",
      reason: "Conditional or random move-order activation",
    };
  const last = (ability, item, move) =>
    ["Lagging Tail", "Full Incense"].includes(item) ||
    ability === "Stall" ||
    (ability === "Mycelium Might" && move.category === "Status");
  const aLast = last(teamAbility, teamItem, teamMove),
    bLast = last(opponentAbility, opponentItem, opponentMove);
  if (aLast !== bLast)
    return {
      ...result,
      first: aLast ? "opponent" : "team",
      reason: "Moves last within priority bracket",
    };
  if (speed === "tie")
    return { ...result, first: "tie", reason: "Speed tie: 50/50 order" };
  // Trick Room uses the cartridge's 13-bit speed inversion, including the >1808 edge case.
  const score = (s) => (trickRoom ? (10000 - s) % 8192 : s);
  return {
    ...result,
    first: score(teamSpeed) > score(opponentSpeed) ? "team" : "opponent",
    reason: trickRoom ? "Trick Room" : "Effective speed",
  };
}
