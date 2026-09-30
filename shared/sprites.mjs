const aliases = {
  "kommo-o": "kommoo",
  "aegislash-shield": "aegislash",
  "gourgeist-average": "gourgeist",
  "lycanroc-midday": "lycanroc",
  "maushold-four": "maushold",
  "meowstic-mega": "meowstic-mmega",
  "meowstic-f-mega": "meowstic-fmega",
};
export function spriteId(name) {
  let value = String(name || "").trim();
  if (value.startsWith("Mega ")) {
    const match = value.slice(5).match(/^(.*?)(?: ([XYZ]))?$/);
    value = `${match[1]}-mega${match[2] || ""}`;
  }
  value = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-mega-([xyz])$/, "-mega$1")
    .replace("-paldea-", "-paldea");
  return aliases[value] || value;
}
export function spriteCandidates(name) {
  const id = spriteId(name);
  const official = /^raichu-mega[xy]$/.test(id)
    ? `https://legends.pokemon.com/_next/image?url=%2Fimages%2Fdlc%2Fmega_raichu_${id.endsWith("x") ? "x" : "y"}_square.png&w=384&q=75`
    : null;
  return [
    official,
    `https://play.pokemonshowdown.com/sprites/gen5/${id}.png`,
    `https://play.pokemonshowdown.com/sprites/dex/${id}.png`,
  ].filter(Boolean);
}
export function displaySpecies(set, megaItems = {}) {
  if (set.mega === false && set.species.startsWith("Mega "))
    return set.species.slice(5).replace(/ [XYZ]$/, "");
  const mega = megaItems[set.item];
  const base = (s) =>
    s
      .replace(/^Mega /, "")
      .replace(/ [XYZ]$/, "")
      .replace("-Eternal", "");
  return set.mega !== false && mega && base(mega) === base(set.species)
    ? mega
    : set.species;
}
