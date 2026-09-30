import React, { useState } from "react";
import { spriteCandidates } from "../shared/sprites.mjs";
import "./pokemon-sprite.css";

export function PokemonSprite({ name, small = false }) {
  return <Sprite key={name} name={name} small={small} />;
}
function Sprite({ name, small }) {
  const [attempt, setAttempt] = useState(0);
  const urls = spriteCandidates(name);
  return (
    <span className={`pokemon-sprite${small ? " small" : ""}`} title={name}>
      {attempt < urls.length ? (
        <img
          src={urls[attempt]}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setAttempt((x) => x + 1)}
        />
      ) : (
        <span role="img" aria-label={name}>
          {name.replace("Mega ", "").slice(0, 2)}
        </span>
      )}
    </span>
  );
}
