import assert from "node:assert/strict";
import test from "node:test";
import { getActivityAvailability } from "../src/engine/activityAvailability.ts";
import { beginnerWorlds } from "../src/data/beginnerWorlds.ts";
import { worlds as b1Worlds } from "../src/data/worlds.ts";

test("B1 activity availability reflects structured example coverage", () => {
  const exampleRich = b1Worlds.filter((world) =>
    world.words.some((word) => word.example),
  );
  const withoutExamples = b1Worlds.filter((world) =>
    world.words.every((word) => !word.example),
  );

  assert.equal(exampleRich.length, 3);
  assert.equal(withoutExamples.length, 31);

  exampleRich.forEach((world) => {
    assert.equal(
      getActivityAvailability(world, "sentence-builder").available,
      true,
    );
    assert.equal(getActivityAvailability(world, "dialogue").available, true);
    assert.equal(
      getActivityAvailability(world, "story-shuffle").available,
      true,
    );
    assert.equal(
      getActivityAvailability(world, "unit-challenge").available,
      true,
    );
  });

  withoutExamples.forEach((world) => {
    assert.equal(getActivityAvailability(world, "listening").available, true);
    assert.equal(
      getActivityAvailability(world, "sentence-builder").available,
      false,
    );
    assert.equal(getActivityAvailability(world, "dialogue").available, false);
    assert.equal(
      getActivityAvailability(world, "story-shuffle").available,
      false,
    );
    assert.equal(
      getActivityAvailability(world, "unit-challenge").available,
      false,
    );
  });
});

test("all A1-A2 units retain their structured activities", () => {
  beginnerWorlds.forEach((world) => {
    (
      [
        "listening",
        "sentence-builder",
        "dialogue",
        "story-shuffle",
        "unit-challenge",
      ] as const
    ).forEach((activityType) => {
      assert.equal(
        getActivityAvailability(world, activityType).available,
        true,
      );
    });
  });
});
