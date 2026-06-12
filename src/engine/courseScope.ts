import type { GameState, VocabularyWord, World } from "../types";

export const getCompletedPreviousWords = (
  currentWorld: World,
  allWorlds: readonly World[],
  state: GameState,
) =>
  allWorlds
    .filter(
      (world) =>
        world.unit < currentWorld.unit &&
        (state.worlds[world.id]?.completedSessions ?? 0) > 0,
    )
    .flatMap((world) => {
      const collectedIds = new Set(
        state.worlds[world.id]?.collectedWordIds ?? [],
      );
      return world.words.filter((word) => collectedIds.has(word.id));
    });

export const findWordWorld = (
  worlds: readonly World[],
  wordId: string,
): { word: VocabularyWord; world: World } | undefined => {
  for (const world of worlds) {
    const word = world.words.find((candidate) => candidate.id === wordId);
    if (word) return { word, world };
  }
  return undefined;
};
