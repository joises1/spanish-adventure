import assert from "node:assert/strict";
import test from "node:test";
import { generateUnitChallenge } from "../src/engine/challengeEngine.ts";
import type { World } from "../src/types.ts";

const world: World = {
  id: "challenge-world",
  unit: 2,
  name: "Challenge",
  spanishName: "El reto",
  description: "Challenge fixture",
  color: "#fff",
  accent: "#000",
  icon: "C",
  words: Array.from({ length: 12 }, (_, index) => ({
    id: `challenge-${index}`,
    es: `palabra ${index}`,
    en: `meaning ${index}`,
    example: {
      es: `Esta es la frase ${index}.`,
      en: `This is sentence ${index}.`,
    },
  })),
};

test("unit challenge is balanced, capped, and duplicate-free", () => {
  const questions = generateUnitChallenge(world, [], "challenge-test");
  const skills = new Set(questions.map((question) => question.skill));

  assert.equal(questions.length, 10);
  assert.equal(new Set(questions.map((question) => question.id)).size, 10);
  assert.equal(
    new Set(questions.map((question) => question.semanticKey)).size,
    10,
  );
  assert.deepEqual(
    skills,
    new Set([
      "vocabulary",
      "listening",
      "sentence-building",
      "grammar",
      "dialogue",
      "story",
    ]),
  );
});
