// deno-lint-ignore-file no-explicit-any
// import { textify, tokenize } from "./tokeniser.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { compileCorpus, endString, textify, tokenize } from "./tokeniser.ts";

// Args
// r: turn output into a rhyming poem - default:false
// c: keep generating after reaching an end character - default:false
// f: location json file that has data - required
//    file data must be a array of objects
// k: object key of data e.g. 'title', 'body'
// t: retrain makrov chain - default:true
// n: max number of tokens to generate - default:'100'

const flags = parseArgs(Deno.args, {
  boolean: ["r", "c", "t"],
  string: ["f", "k", "n", "s"],
  default: { r: false, c: false, t: false, n: "100", s: "3" },
  negatable: ["r", "c", "t", "s"],
});

// Return random Number between Min and Max
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// Return random from list
const pickRandom = (list) => list[random(0, list.length - 1)];
//join array of strings to one string
const fromTokens = (tokens) => tokens.join("");

// Slices the text/corpus into chains
const sliceCorpus = (corpus: string[], sampleSize: number) => {
  return corpus
    .map((_, index) => {
      return corpus.slice(index, index + sampleSize);
    })
    .filter((group) => {
      return group.length === sampleSize;
    });
};

const collectTransitions = (samples: string[][]) => {
  return samples.reduce((transitions: any, sample: string[]) => {
    // Split the sample into key tokens and the transition token:
    const lastIndex = sample.length - 1;
    const lastToken = sample[lastIndex];
    const restTokens = sample.slice(0, lastIndex);
    // console.log({sample,lastToken, restTokens})
    // The first tokens constitute the key
    // which we will use to get the list of potential transitions:
    const state = fromTokens(restTokens); // Makes it unquie
    const next = lastToken;

    // e.g. With sampleSize of 3 -> "I'm" goes to "_+I:["'m"]"

    // Check if we already have this start token, copy it or start afresh
    transitions[state] = transitions[state] ?? [];
    // Push new possible coninuatons in it's array
    transitions[state].push(next);
    return transitions;
  }, {});
};

// Predict next based on random
const predictNext = (chain, transitions, sampleSize) => {
  const lastState = fromTokens(chain.slice(-(sampleSize - 1)));
  const nextWords = transitions[lastState] ?? [];
  return pickRandom(nextWords);
};

const createChain = (startText: string | undefined, transitions: {}) => {
  const head = startText ?? pickRandom(Object.keys(transitions));
  return tokenize(head);
};

function* generateChain(startText: string | undefined, transitions: {}) {
  const chain = createChain(startText, transitions);

  while (true) {
    const state = predictNext(chain, transitions, sampleSize);
    yield state;

    if (state) chain.push(state);
    else chain.pop();
  }
}

export const generate = ({
  source = corpusText,
  start = startString,
  wordsCount = 100,
} = {}) => {
  const corpus = tokenize(String(source));
  const samples = sliceCorpus(corpus, sampleSize);
  const transitions = collectTransitions(samples);

  const generator = generateChain(start, transitions);
  const generatedTokens: string[] = [];

  for (let i = 0; i < wordsCount; i++) {
    if (generatedTokens[generatedTokens.length - 1] != endString) {
      generatedTokens.push(generator.next().value);
    }
  }

  return textify(generatedTokens);
};

const newGenerater = (
  transitions: any,
  startString: string | undefined,
  wordsCount: number,
  continuous: boolean,
) => {
  const startToken = tokenize(
    startString ?? pickRandom(Object.keys(transitions)),
  );
  console.log({ startToken });
  var chain: string[] = [...startToken];
  var x = 0;
  while (true) {
    console.log(chain.length);
    chain = [...chain, ...findNextToken(chain, transitions)];

    // Break if end token is found and not in continouus mode
    // Or if words count has reached max
    if (
      chain.length > wordsCount ||
      (chain[chain.length - 1] == endString && !continuous)
    ) {
      break;
    }
  }
  return textify(chain);
};

const findNextToken = (chain: string[], transitions: {}) => {
  const lastTokens = chain.slice(-(sampleSize - 1));

  const key = fromTokens(lastTokens);

  const possibleTokens = transitions[key];
  console.log({ key }, { possibleTokens });
  const nextToken = pickRandom(possibleTokens);
//   console.log( { nextToken });
  return [nextToken];
};

// Global Vars
var samples = [];
var transitions = {};
var sampleSize = 2;

const main = async () => {
  if (!flags.f) {
    throw Error("Error: No Source File defined [--f]");
  }
  if (!flags.k) {
    throw Error("Error: No Object Key defined [--k]");
  }
  if (flags.t) {
    sampleSize = Number(flags.s);
    try {
      const compliedCorpus = await compileCorpus(flags.f, flags.k);
      if (!compliedCorpus) {
        throw Error("Couldnt load corpus text");
      }
      const corpus = await tokenize(compliedCorpus);

      if (corpus) {
        console.log(`New Corpus Loaded: ${corpus.length} Tokens`);
        samples = sliceCorpus(corpus, sampleSize);
        // console.log(samples);
        transitions = collectTransitions(samples);
        // console.log({ transitions });
        console.log(
          `New Transitions Created: ${Object.keys(transitions).length} Transitions`,
        );
        await Deno.writeTextFile("model.txt", JSON.stringify(transitions));
        console.log(`Saving Transitions Chain`);
      }
    } catch (e) {
      console.error(e);
      return;
    }
  } else {
    transitions = JSON.parse(await Deno.readTextFile("model.txt"));
    console.log(
      `Old Transitions Loaded: ${Object.keys(transitions).length} Transitions`,
    );
  }

  console.log("Starting Generation");

  const output = newGenerater(transitions, undefined, Number(flags.n), flags.c);
  console.log(output);
};

if (import.meta.main) main();
