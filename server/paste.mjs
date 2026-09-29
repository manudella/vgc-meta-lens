import { STATS, speciesName, validateSet } from "./engine.mjs";
const aliases = {
  hp: "hp",
  atk: "at",
  at: "at",
  def: "df",
  df: "df",
  spa: "sa",
  spatk: "sa",
  sa: "sa",
  spd: "sd",
  spdef: "sd",
  sd: "sd",
  spe: "sp",
  speed: "sp",
  sp: "sp",
};
export function parsePaste(text, { allowMissing = false } = {}) {
  if (typeof text !== "string" || text.length > 80000)
    throw new Error("Paste must be text under 80 KB.");
  const blocks = text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .filter(Boolean);
  if (!blocks.length || blocks.length > 6)
    throw new Error("Import between 1 and 6 Pokémon.");
  return blocks.map((block) => {
    const lines = block
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const [header, item = ""] = lines.shift().split(/\s+@\s+/);
    const clean = header.replace(/\s*\((M|F)\)$/, "");
    const nickname = clean.match(/\(([^)]+)\)$/);
    const species = speciesName(nickname?.[1] || clean);
    if (!species) throw new Error(`Unknown Champions Pokémon: ${clean}`);
    const set = {
      species,
      item,
      nature: "Hardy",
      ability: "",
      sp: Object.fromEntries(STATS.map((k) => [k, 0])),
      moves: [],
      spreadKnown: false,
    };
    for (const line of lines) {
      if (line.startsWith("- ")) set.moves.push(line.slice(2));
      else if (line.startsWith("Ability:")) set.ability = line.slice(8).trim();
      else if (line.endsWith(" Nature"))
        set.nature = line.replace(" Nature", "");
      else if (/^(EVs|SPs|Stat Points):/i.test(line)) {
        const isEV = line.startsWith("EVs:");
        let evTotal = 0;
        for (const part of line.split(":").slice(1).join(":").split("/")) {
          const match = part.trim().match(/^(\d+)\s+([a-zA-Z. ]+)$/);
          if (!match) throw new Error(`Invalid spread: ${line}`);
          const k = aliases[match[2].toLowerCase().replace(/[. ]/g, "")];
          if (!k) throw new Error(`Unknown stat: ${match[2]}`);
          const value = Number(match[1]);
          evTotal += value;
          if (isEV && value > 252)
            throw new Error(
              "EVs may not exceed 252 per stat. Use SPs: for Champions stat points.",
            );
          set.sp[k] = isEV
            ? Math.floor((31 + Math.floor(value / 4)) / 2) - 15
            : value;
        }
        if (isEV && evTotal > 510) throw new Error("EV total exceeds 510.");
        set.spreadKnown = true;
      } else if (
        line.startsWith("IVs:") &&
        !/^IVs: (31 \w+( \/ )?)+$/.test(line)
      )
        throw new Error(
          "Champions assumes perfect IVs. Low-IV pastes cannot be imported unchanged.",
        );
      else if (line.startsWith("Level:") && line !== "Level: 50")
        throw new Error("Champions calculations use level 50.");
    }
    if (!set.spreadKnown && !allowMissing)
      set.warning =
        "No spread supplied: 0 SP in every stat. Edit before relying on these calcs.";
    validateSet(set);
    return set;
  });
}
export function exportPaste(team) {
  return team
    .map(
      (s) =>
        `${s.species}${s.item ? " @ " + s.item : ""}\nAbility: ${s.ability}\nLevel: 50\nSPs: ${STATS.map((k, i) => `${s.sp[k] || 0} ${["HP", "Atk", "Def", "SpA", "SpD", "Spe"][i]}`).join(" / ")}\n${s.nature} Nature\n${s.moves.map((m) => "- " + m).join("\n")}`,
    )
    .join("\n\n");
}
