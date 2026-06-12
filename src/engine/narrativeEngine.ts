import type {
  ActivityChoice,
  ActivityQuestion,
  DialogueTurn,
  StorySentence,
  VocabularyWord,
  World,
} from "../types";
import {
  dedupeQuestions,
  normalizeText,
  shuffle,
} from "./activityEngine.ts";

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seed: string) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const uniqueWords = (words: readonly VocabularyWord[]) => {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = `${normalizeText(word.es)}:${normalizeText(word.en)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const choicesForWords = (
  questionId: string,
  correct: VocabularyWord,
  pool: readonly VocabularyWord[],
  useSpanish: boolean,
  random: () => number,
) => {
  const value = (word: VocabularyWord) => (useSpanish ? word.es : word.en);
  const seen = new Set([normalizeText(value(correct))]);
  const distractors = shuffle(
    pool.filter((word) => word.id !== correct.id),
    random,
  ).filter((word) => {
    const key = normalizeText(value(word));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
  const options = shuffle([correct, ...distractors], random);
  const choices: ActivityChoice[] = options.map((word) => ({
    id: `${questionId}:choice:${word.id}`,
    text: useSpanish ? word.es : word.en,
  }));
  return {
    choices,
    correctChoiceId: `${questionId}:choice:${correct.id}`,
  };
};

const turn = (
  id: string,
  speaker: string,
  text: string,
  translation?: string,
  isLearnerTurn = false,
): DialogueTurn => ({
  id,
  speaker,
  text,
  translation,
  isLearnerTurn,
});

export const generateDialogueQuestions = (
  world: World,
  previouslyLearnedWords: readonly VocabularyWord[] = [],
  seed = `${world.id}:dialogue`,
) => {
  const random = createSeededRandom(seed);
  const currentWords = shuffle(uniqueWords(world.words), random).slice(0, 5);
  if (currentWords.length === 0) return [];
  const allowedPool = uniqueWords([
    ...world.words,
    ...previouslyLearnedWords,
  ]);
  const getWord = (index: number) =>
    currentWords[index % currentWords.length];

  const bestWord = getWord(0);
  const bestId = `dialogue:${world.id}:best-response:${bestWord.id}`;
  const bestChoice = choicesForWords(
    bestId,
    bestWord,
    allowedPool,
    true,
    random,
  );

  const orderWord = getWord(1);
  const orderId = `dialogue:${world.id}:order:${orderWord.id}`;
  const orderedTurns = [
    turn(
      `${orderId}:turn:1`,
      "Profesora",
      `Buenos días. Hoy practicamos ${world.spanishName.toLowerCase()}.`,
      `Good morning. Today we are practicing ${world.name.toLowerCase()}.`,
    ),
    turn(
      `${orderId}:turn:2`,
      "Estudiante",
      "Perfecto. ¿Qué expresión usamos primero?",
      "Great. Which expression do we use first?",
      true,
    ),
    turn(
      `${orderId}:turn:3`,
      "Profesora",
      `Empezamos con «${orderWord.es}».`,
      `We begin with “${orderWord.es}.”`,
    ),
    turn(
      `${orderId}:turn:4`,
      "Estudiante",
      "Gracias. La voy a practicar.",
      "Thank you. I am going to practice it.",
      true,
    ),
  ];

  const fillWord = getWord(2);
  const fillId = `dialogue:${world.id}:fill:${fillWord.id}`;
  const fillChoice = choicesForWords(
    fillId,
    fillWord,
    allowedPool,
    true,
    random,
  );

  const listeningWord = getWord(3);
  const listeningId = `dialogue:${world.id}:listening:${listeningWord.id}`;
  const listeningChoice = choicesForWords(
    listeningId,
    listeningWord,
    allowedPool,
    false,
    random,
  );

  const roleWord = getWord(4);
  const roleId = `dialogue:${world.id}:role:${roleWord.id}`;
  const roleCorrectText = `Puedes decir «${roleWord.es}».`;
  const roleChoices = shuffle(
    [
      {
        id: `${roleId}:choice:correct`,
        text: roleCorrectText,
      },
      {
        id: `${roleId}:choice:later`,
        text: "No lo sé. Hablamos otro día.",
      },
      {
        id: `${roleId}:choice:goodbye`,
        text: "Hasta luego. Buen viaje.",
      },
    ],
    random,
  );

  const questions: ActivityQuestion[] = [
    {
      id: bestId,
      semanticKey: `${bestId}:${normalizeText(bestWord.es)}`,
      activityType: "dialogue",
      kind: "dialogue-choice",
      conceptIds: [bestWord.id],
      sourceWordIds: [bestWord.id],
      sourceWorldId: world.id,
      skill: "dialogue",
      prompt: `¿Cómo se dice «${bestWord.en}» en español?`,
      answer: bestWord.es,
      ...bestChoice,
      dialogueTurns: [
        turn(`${bestId}:turn:1`, "Lucía", "Hola, ¿me ayudas a practicar?"),
        turn(`${bestId}:turn:2`, "Diego", "Claro. ¿Qué quieres decir?"),
        turn(
          `${bestId}:turn:3`,
          "Lucía",
          `Quiero decir «${bestWord.en}» en español.`,
          undefined,
          true,
        ),
        turn(`${bestId}:turn:4`, "Diego", "Elige la mejor respuesta."),
      ],
      explanation: `The natural answer is «${bestWord.es}», which means “${bestWord.en}.”`,
    },
    {
      id: orderId,
      semanticKey: `${orderId}:${normalizeText(orderWord.es)}`,
      activityType: "dialogue",
      kind: "dialogue-order",
      conceptIds: [orderWord.id],
      sourceWordIds: [orderWord.id],
      sourceWorldId: world.id,
      skill: "dialogue",
      prompt: "Arrange the conversation from greeting to practice.",
      answer: orderedTurns.map((item) => item.text).join(" "),
      dialogueTurns: shuffle(orderedTurns, random),
      orderedItemIds: orderedTurns.map((item) => item.id),
      explanation:
        "A natural conversation begins with the greeting, asks a question, gives the expression, and closes with thanks.",
    },
    {
      id: fillId,
      semanticKey: `${fillId}:${normalizeText(fillWord.es)}`,
      activityType: "dialogue",
      kind: "dialogue-fill",
      conceptIds: [fillWord.id],
      sourceWordIds: [fillWord.id],
      sourceWorldId: world.id,
      skill: "dialogue",
      prompt: `Complete the missing phrase for “${fillWord.en}.”`,
      answer: fillWord.es,
      ...fillChoice,
      dialogueTurns: [
        turn(`${fillId}:turn:1`, "Guía", "Vamos a practicar otra expresión."),
        turn(`${fillId}:turn:2`, "Viajera", "Muy bien. Estoy lista.", undefined, true),
        turn(
          `${fillId}:turn:3`,
          "Guía",
          `Para decir «${fillWord.en}», usamos _____.`,
        ),
        turn(`${fillId}:turn:4`, "Viajera", "La repetiré en voz alta.", undefined, true),
      ],
      explanation: `The missing Spanish phrase is «${fillWord.es}».`,
    },
    {
      id: listeningId,
      semanticKey: `${listeningId}:${normalizeText(listeningWord.es)}`,
      activityType: "dialogue",
      kind: "dialogue-listening",
      conceptIds: [listeningWord.id],
      sourceWordIds: [listeningWord.id],
      sourceWorldId: world.id,
      skill: "listening",
      prompt: "Listen to Marta. What does her key phrase mean?",
      answer: listeningWord.en,
      audioText: listeningWord.example?.es ?? listeningWord.es,
      ...listeningChoice,
      dialogueTurns: [
        turn(`${listeningId}:turn:1`, "Pablo", "Marta, ¿qué quieres decir?"),
        turn(
          `${listeningId}:turn:2`,
          "Marta",
          listeningWord.example?.es ?? listeningWord.es,
          listeningWord.example?.en,
          true,
        ),
        turn(`${listeningId}:turn:3`, "Pablo", "Escuchemos otra vez."),
        turn(`${listeningId}:turn:4`, "Marta", "Ahora elige el significado."),
      ],
      explanation: listeningWord.example
        ? `Marta said «${listeningWord.example.es}», meaning “${listeningWord.example.en}.”`
        : `The phrase «${listeningWord.es}» means “${listeningWord.en}.”`,
    },
    {
      id: roleId,
      semanticKey: `${roleId}:${normalizeText(roleWord.es)}`,
      activityType: "dialogue",
      kind: "dialogue-role",
      conceptIds: [roleWord.id],
      sourceWordIds: [roleWord.id],
      sourceWorldId: world.id,
      skill: "dialogue",
      prompt: "You are the helper. Choose your most natural line.",
      answer: roleCorrectText,
      choices: roleChoices,
      correctChoiceId: `${roleId}:choice:correct`,
      dialogueTurns: [
        turn(`${roleId}:turn:1`, "Visitante", "¿Me puedes ayudar?"),
        turn(`${roleId}:turn:2`, "Tú", "Claro. ¿Qué necesitas?", undefined, true),
        turn(
          `${roleId}:turn:3`,
          "Visitante",
          `Necesito una expresión para «${roleWord.en}».`,
        ),
        turn(`${roleId}:turn:4`, "Tú", "Elige tu respuesta.", undefined, true),
      ],
      explanation: `A helpful, direct response is «${roleCorrectText}»`,
    },
  ];

  return dedupeQuestions(questions, 5);
};

export const generateStory = (
  world: World,
  previouslyLearnedWords: readonly VocabularyWord[] = [],
  seed = `${world.id}:story`,
) => {
  const random = createSeededRandom(seed);
  const currentWords = shuffle(uniqueWords(world.words), random);
  const priorWords = shuffle(uniqueWords(previouslyLearnedWords), random);
  const selected = uniqueWords([
    ...currentWords.slice(0, 2),
    ...priorWords.slice(0, 1),
    ...currentWords.slice(2, 4),
  ]).slice(0, 3);

  const fallback = currentWords[0];
  if (!fallback) return [];
  while (selected.length < 3) selected.push(fallback);
  const [first, second, third] = selected;
  const storyId = `story:${world.id}:${hashSeed(seed)}`;

  const sentences: StorySentence[] = [
    {
      id: `${storyId}:sentence:1`,
      position: 0,
      es: `Hoy, Elena practica ${world.spanishName.toLowerCase()}.`,
      en: `Today, Elena practices ${world.name.toLowerCase()}.`,
      sourceWordIds: [],
    },
    {
      id: `${storyId}:sentence:2`,
      position: 1,
      es: `Primero aprende «${first.es}», que significa «${first.en}».`,
      en: `First she learns “${first.es},” which means “${first.en}.”`,
      sourceWordIds: [first.id],
    },
    {
      id: `${storyId}:sentence:3`,
      position: 2,
      es: second.example?.es
        ? `Después practica con esta frase: «${second.example.es}»`
        : `Después repite «${second.es}» para recordarlo bien.`,
      en: second.example?.en
        ? `Then she practices with this sentence: “${second.example.en}”`
        : `Then she repeats “${second.es}” to remember it well.`,
      sourceWordIds: [second.id],
    },
    {
      id: `${storyId}:sentence:4`,
      position: 3,
      es: `Al final recuerda «${third.es}» y termina con más confianza.`,
      en: `At the end she remembers “${third.es}” and finishes with more confidence.`,
      sourceWordIds: [third.id],
    },
  ];

  return sentences;
};

export const generateStoryShuffleQuestion = (
  world: World,
  previouslyLearnedWords: readonly VocabularyWord[] = [],
  seed = `${world.id}:story`,
): ActivityQuestion | null => {
  const sentences = generateStory(world, previouslyLearnedWords, seed);
  if (sentences.length === 0) return null;
  const id = `story-shuffle:${world.id}:${hashSeed(seed)}`;
  return {
    id,
    semanticKey: `${id}:${sentences.map((item) => normalizeText(item.es)).join(":")}`,
    activityType: "story-shuffle",
    kind: "story-order",
    conceptIds: [...new Set(sentences.flatMap((item) => item.sourceWordIds))],
    sourceWordIds: [...new Set(sentences.flatMap((item) => item.sourceWordIds))],
    sourceWorldId: world.id,
    skill: "story",
    prompt: "Put Elena's mini-story in its intended order.",
    answer: sentences.map((item) => item.es).join(" "),
    storySentences: shuffle(sentences, createSeededRandom(`${seed}:shuffle`)),
    orderedItemIds: sentences.map((item) => item.id),
    explanation:
      "Sequence words such as primero, después, and al final reveal the intended order.",
  };
};
