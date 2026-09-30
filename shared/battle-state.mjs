export function displayedStage(set, effective, stat) {
  return (
    set.stageOverrides?.[stat] ??
    effective?.boosts?.[stat] ??
    set.boosts?.[stat] ??
    0
  );
}
export function resetBattleState(set) {
  return { ...set, boosts: {}, stageOverrides: {}, hpPercent: 100 };
}
