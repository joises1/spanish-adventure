import type { ActivityType, World } from "../types";
import { normalizeText } from "./activityEngine.ts";

export type ActivityAvailability = {
  available: boolean;
  reason?: string;
};

const uniqueCount = (values: readonly string[]) =>
  new Set(values.map(normalizeText).filter(Boolean)).size;

export const getActivityAvailability = (
  world: World,
  activityType: ActivityType,
): ActivityAvailability => {
  const uniqueSpanish = uniqueCount(world.words.map((word) => word.es));
  const uniqueMeanings = uniqueCount(world.words.map((word) => word.en));
  const exampleCount = world.words.filter(
    (word) => word.example?.es && word.example.en,
  ).length;

  switch (activityType) {
    case "explore":
      return uniqueSpanish >= 1
        ? { available: true }
        : { available: false, reason: "This unit has no vocabulary yet." };
    case "matching":
      return uniqueSpanish >= 2 && uniqueMeanings >= 2
        ? { available: true }
        : {
            available: false,
            reason: "At least two distinct Spanish-English pairs are needed.",
          };
    case "listening":
      return uniqueSpanish >= 4 && uniqueMeanings >= 4
        ? { available: true }
        : {
            available: false,
            reason: "At least four distinct words and meanings are needed.",
          };
    case "sentence-builder":
      return exampleCount >= 3
        ? { available: true }
        : {
            available: false,
            reason: "This unit needs at least three reviewed example sentences.",
          };
    case "dialogue":
      return uniqueSpanish >= 4 && exampleCount >= 3
        ? { available: true }
        : {
            available: false,
            reason: "This unit needs more example-backed phrases for dialogue.",
          };
    case "story-shuffle":
      return uniqueSpanish >= 3 && exampleCount >= 3
        ? { available: true }
        : {
            available: false,
            reason: "This unit needs three reviewed examples for a safe story.",
          };
    case "unit-challenge":
      return uniqueSpanish >= 6 && uniqueMeanings >= 4 && exampleCount >= 3
        ? { available: true }
        : {
            available: false,
            reason:
              "This unit does not yet have enough structured material for a balanced challenge.",
          };
    case "grammar-repair":
      return {
        available: false,
        reason: "Grammar Repair is not available as a standalone activity yet.",
      };
    default:
      return { available: true };
  }
};
