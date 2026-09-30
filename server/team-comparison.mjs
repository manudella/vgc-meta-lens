import { validateSet } from "./engine.mjs";
export function exactThreats(opponentTeam) {
  if (
    !Array.isArray(opponentTeam) ||
    opponentTeam.length < 1 ||
    opponentTeam.length > 6
  )
    throw new Error("Import 1–6 opponent Pokémon.");
  opponentTeam.forEach(validateSet);
  return opponentTeam.map((set, i) => ({
    id: `opponent-${i}`,
    opponentIndex: i,
    exact: true,
    species: set.species,
    usage: null,
    rank: null,
    spreadCoverage: 100,
    sets: [
      {
        ...set,
        id: `exact-${i}`,
        kind: "exact",
        weight: 100,
        label: "Exact opponent set",
      },
    ],
    distributions: {
      items: [],
      abilities: [],
      natures: [],
      moves: [],
      spreads: [],
    },
  }));
}
