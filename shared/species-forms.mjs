// Pokedata's human-readable form labels are not Showdown/calculator names.
// Unknown labels stay intact so a new form cannot silently become its base form.
export function sourceSpeciesName(name) {
  const match = String(name)
    .trim()
    .match(/^(.*?)\s*\[([^\]]+)\]$/);
  if (!match) return String(name).trim();
  const [, species, form] = match;
  const regional = {
    "Alolan Form": "Alola",
    "Galarian Form": "Galar",
    "Hisuian Form": "Hisui",
  };
  if (regional[form]) return `${species}-${regional[form]}`;
  if (
    ["Indeedee", "Meowstic", "Basculegion"].includes(species) &&
    ["Male", "Female"].includes(form)
  )
    return species + (form === "Female" ? "-F" : "");
  if (
    species === "Tauros" &&
    /^Paldean Form - (Aqua|Blaze|Combat) Breed$/.test(form)
  )
    return `Tauros-Paldea-${form.match(/- (\w+) Breed/)[1]}`;
  if (species === "Rotom" && /^(Heat|Wash|Frost|Fan|Mow) Rotom$/.test(form))
    return `Rotom-${form.split(" ")[0]}`;
  if (species === "Lycanroc" && /^(Midday|Midnight|Dusk) Form$/.test(form))
    return `Lycanroc-${form.split(" ")[0]}`;
  const cosmetic = {
    "Floette|Eternal Flower": "Floette-Eternal",
    "Sinistcha|Unremarkable Form": "Sinistcha",
    "Sinistcha|Masterpiece Form": "Sinistcha",
    "Maushold|Family of Three": "Maushold",
    "Maushold|Family of Four": "Maushold-Four",
    "Toxtricity|Amped Form": "Toxtricity",
    "Toxtricity|Low Key Form": "Toxtricity",
  };
  if (
    species === "Squawkabilly" &&
    /^(Green|Blue|Yellow|White) Plumage$/.test(form)
  )
    return species;
  return cosmetic[`${species}|${form}`] || name;
}
