import test from "node:test";
import assert from "node:assert/strict";
import {
  spriteId,
  displaySpecies,
  spriteCandidates,
} from "../shared/sprites.mjs";
import { publishedTeamsFromCsv } from "../server/sources.mjs";
test("sprite mapping retains Mega variants and regional forms", () => {
  assert.equal(spriteId("Mega Charizard Y"), "charizard-megay");
  assert.equal(spriteId("Garchomp-Mega-Z"), "garchomp-megaz");
  assert.equal(spriteId("Mega Meowstic"), "meowstic-mmega");
  assert.equal(spriteId("Tauros-Paldea-Aqua"), "tauros-paldeaaqua");
  assert.equal(spriteId("Farfetch’d"), "farfetchd");
  assert.equal(spriteId("Aegislash-Shield"), "aegislash");
  assert.equal(
    spriteCandidates("Mega Salamence")[1],
    "https://play.pokemonshowdown.com/sprites/dex/salamence-mega.png",
  );
  const set = { species: "Salamence", item: "Salamencite" };
  assert.equal(
    displaySpecies(set, { Salamencite: "Mega Salamence" }),
    "Mega Salamence",
  );
  assert.equal(
    displaySpecies({ ...set, mega: false }, { Salamencite: "Mega Salamence" }),
    "Salamence",
  );
});
test("published previews use the six species columns, including teams without spreads", () => {
  const csv =
    "Team ID,Team Description,Full Name,Pokepaste,EVs,Date Shared,Tournament / Event,Rank,Pokemon Text for Copypasta,,,,,,Team ID\nMC1,Preview,Player,https://pokepast.es/9088ce7f283bf776,No,Today,Regional,1,Salamence-Mega,Tyranitar-Mega,Excadrill,Sneasler,Indeedee,Corviknight,MC1";
  const [team] = publishedTeamsFromCsv(csv);
  assert.equal(team.hasSpread, false);
  assert.deepEqual(team.members, [
    "Mega Salamence",
    "Mega Tyranitar",
    "Excadrill",
    "Sneasler",
    "Indeedee",
    "Corviknight",
  ]);
});
