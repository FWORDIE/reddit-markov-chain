// In part inspired by https://dev.to/bespoyasov/text-generation-with-markov-chains-in-javascript-i38

// import { textify, tokenize } from "./tokeniser.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
  compileCorpus,
  endString,
  poemEnder,
  startString,
  textify,
  tokenize,
} from "./tokeniser.ts";
import { findARPAAndSyllables, findARPAbet } from "./ryhmingStuff.ts";

// Global Vars
let samples = [];
let transitions: transitionsType = {};
let sampleSize = 2;
let ARPATable: ARPATableType = {};
let generate = true;

// Poem Types
const poemTypes = [
  "null",
  "limerick",
  "random",
  "haiku",
  "sonnet",
  "petrarchan",
] as const;

export type PoemTypes = (typeof poemTypes)[number];
const isPoem = (x: any): x is PoemTypes => poemTypes.includes(x);

const debugMode = false;

type CloserType = [
  string,
  string,
  number,
];

const closureNeediness = 0.2;

const needsClosure: CloserType[] = [
  [`(`, `)`, closureNeediness],
  [`{`, `}`, closureNeediness],
  [`[`, `]`, closureNeediness],
  [
    `"`,
    `"`,
    closureNeediness,
  ],
];

// TS type
export type transitionsType = {
  [key: string]: string[];
};

export type ARPATableType = {
  [key: string]: string[];
};

const help = () => {
  console.log(
    `
--- Basic Info ---
This is a markov chain generator built in TS and Deno.
It can be trained with an array of objects contained in a JSON dataset.
It's built by me, Fred Wordie, and is a little bit clunky at times and spleling bad.

--- Key features ---

- The Chain can start and stop by 'learning' how the dataset items start and stop
- Generate poems (bad)
- Generate text
- A scraper that can scrape reddit

--- How to use ---

Step 1: Download and install Deno
- https://docs.deno.com/runtime/getting_started/installation/
Step 2: Run the scraper
- Deno -A scraper.ts
Step 3: Run the generator with args listed below
- Deno -A generator.ts

--- Args ---

-h: list helpful stuff

-p: Turn output into a rhyming poem
Accepts: "null","limerick","random","haiku","sonnet","petrarchan"
Default: "null"

-c: Keep generating after reaching an end character
Accepts: boolean
Default: false

-n: max number of tokens to generate
Accepts: Number as string
Default: '1000'

-o: output to file
Accepts: boolean
Defualt: false

-t: Train makrov chain
Accepts: boolean
Default: false

-f: location of json file that has data -
Required if training (file data must be a array of objects)
Accepts: string
Default: NONE

-k: object key of data
Required if training (e.g. 'body','title)
Accepts: string
Default: NONE

-s: sample size
Only if used if training - (bigger is more deterministic)
Accepts: Number as string
Default: '3'

-d: debug mode
does some console logging of stuff, WIP
Accepts: boolean
Default: false
    `,
  );
};

const flags = parseArgs(Deno.args, {
  boolean: ["c", "t", "h", "d"],
  string: ["p", "f", "k", "n", "s"],
  default: {
    r: false,
    c: false,
    t: false,
    n: "1000",
    s: "3",
    p: "null",
    h: false,
    d: false,
  },
  negatable: ["p", "c", "t", "s", "h", "d"],
});

// Return random Number between Min and Max
const random = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
// Return random from list
export const pickRandom = (list: string[]) => list[random(0, list.length - 1)];
//join array of strings to one string
const fromTokens = (tokens: string[]) => tokens.join("");

// Slices the text/corpus into chains and generate ARPATable
const sliceCorpus = (corpus: string[], sampleSize: number) => {
  return corpus
    .map((_, index) => {
      // get this word
      const thisToken = corpus[index];
      // get its ARPA from big table
      const ARPAInfo = findARPAbet(thisToken.toLowerCase());
      // Add this info to table
      //TODO: Commpound word e.g. chatbot (should serach for 't','ot','bot' etc)
      ARPATable[thisToken] = ARPAInfo;
      // Return the normal slice info for the transtion Table
      return corpus.slice(index, index + sampleSize);
    })
    .filter((group) => {
      return group.length === sampleSize;
    });
};

const collectTransitions = (samples: string[][]) => {
  return samples.reduce((transitions: transitionsType, sample: string[]) => {
    // Split the sample into key tokens and the transition token:
    const lastIndex = sample.length - 1;
    const lastToken = sample[lastIndex];
    const restTokens = sample.slice(0, lastIndex);
    // console.log({sample,lastToken, restTokens})
    // The first tokens constitute the key
    // which we will use to get the list of potential transitions:
    const state = fromTokens(restTokens); // Makes it unquie
    const next = lastToken;

    // Check if we already have this start token, copy it or start afresh
    transitions[state] = transitions[state] ?? [];
    // Push new possible coninuatons in it's array
    transitions[state].push(next);
    return transitions;
  }, {});
};

// Returns a random token that starts with the startString
export const findAStart = (transitions: transitionsType) => {
  const possibleStartArray: string[] = [];
  for (const key in transitions) {
    // Checks if this transition key starts with the startString
    if (key[0] == startString) {
      possibleStartArray.push(key);
    }
  }
  //returns a random one
  return pickRandom(possibleStartArray);
};

// generator
const newGenerator = (
  transitions: transitionsType,
  startingString: string | undefined,
  wordsCount: number,
  continuous: boolean,
) => {
  const startToken = tokenize(startingString ?? findAStart(transitions));

  if (debugMode) {
    const textStartString = textify(startToken) == ""
      ? "Start Characters"
      : textify(startToken);

    console.log(
      `Starting Text Generation with : ${textStartString}`,
    );
  }

  let chain = [...(startToken as string[])];

  while (true) {
    chain = [...chain, ...findNextToken(chain, transitions)];

    if (chain.slice(-1)[0] == poemEnder) {
      console.log("poem end");
      break;
    }
    // Break if end token is found and not in continouus mode
    // Or if words count has reached max
    if (
      chain.length > wordsCount ||
      (chain[chain.length - 1] == endString && !continuous)
    ) {
      break;
    }
  }
  return textify(chain, flags.p != "null");
};

const findNextToken = (chain: string[], transitions: transitionsType) => {
  const lastTokens = chain.slice(-(sampleSize - 1));

  const key = fromTokens(lastTokens);
  let possibleTokens = transitions[key];

  // close open tokens e.g. '(','[','"'
  // loop over all closure tokens
  needsClosure.map((closer) => {
    //check if they exist in the string so far
    let openerOccurances = chain.filter((string) => {
      return string.includes(closer[0]);
    }).length;
    let closerOccurances = chain.filter((string) => {
      return string.includes(closer[1]);
    }).length;

    // if there are more open then close tokens
    if (openerOccurances > closerOccurances) {
      // caculate how much we need to close the open
      const forceClose = Math.random() < closer[2];
      if (forceClose) {
        // filter possibles for tokens that would close the open
        let newPossibleTokens = possibleTokens.filter((string) => {
          return string.includes(closer[1]);
        });
        // if there are possibles use these as possible tokens
        if (newPossibleTokens.length > 0) {
          possibleTokens = newPossibleTokens;
          // reset the need
          closer[2] = closureNeediness;
        } else {
          // make the need greater
          closer[2] += closureNeediness;
        }
      } else {
        // make the need greater
        closer[2] += closureNeediness;
      }
    }
  });

  if (flags.p == "null") {
    //check if its a poem
    const nextToken = pickRandom(possibleTokens);
    return [nextToken];
  } else {
    return findARPAAndSyllables(
      chain,
      ARPATable,
      possibleTokens,
      transitions,
      flags.p as PoemTypes,
    );
  }
};

const main = async () => {
  //if help, then help obvs
  if (flags.h) {
    help();
    return;
  }

  // If Training flag is true
  if (flags.t) {
    if (!flags.f) {
      throw Error("Error: No Source File defined [--f]");
    }
    if (!flags.k) {
      throw Error("Error: No Object Key defined [--k]");
    }

    // Assign Sample Size
    sampleSize = Number(flags.s);

    try {
      const compliedCorpus = await compileCorpus(flags.f, flags.k);
      if (!compliedCorpus) {
        throw Error("Couldnt load corpus text");
      }

      //break up corpus into text
      const corpus = tokenize(compliedCorpus);

      if (corpus) {
        // create model
        console.log(`New Corpus Loaded: ${corpus.length} Tokens`);
        samples = sliceCorpus(corpus, sampleSize);
        // console.log(samples);
        transitions = collectTransitions(samples);
        console.log(
          `New Transitions Created: ${
            Object.keys(transitions).length
          } Transitions`,
        );

        const modelFile = {
          sampleSize: sampleSize,
          transitions: transitions,
          ARPATable: ARPATable,
        };

        // Save model to folder
        await Deno.writeTextFile(
          "model.json",
          JSON.stringify(modelFile),
        );

        console.log(`Saving Transitions Chain`);
      }
    } catch (e) {
      console.error(e);
      return;
    }
  } else {
    const modelData = JSON.parse(await Deno.readTextFile("model.json"));
    sampleSize = modelData.sampleSize;
    transitions = modelData.transitions;
    ARPATable = modelData.ARPATable;
    console.log(
      `Old Transitions Loaded: ${Object.keys(transitions).length} Transitions`,
    );
  }
  if (!isPoem(flags.p)) {
    throw Error(
      `Error: Poem type " ${flags.p} " is not valid, must be one of ${
        JSON.stringify(poemTypes)
      }`,
    );
  }
  while (generate === true) {
    if (debugMode) {
      console.log("FLAGS:");
      console.log({ flags });
    }
    const output = newGenerator(
      transitions,
      undefined,
      Number(flags.n),
      flags.c || flags.p != "null",
    );

    // run the generator with params
    console.log("\n");
    console.log("---OUTPUT START---");
    console.log("\n");
    console.log(output);
    console.log("\n");
    console.log("---OUTPUT END---");
    console.log("\n");

    // outputs to file if wanted
    if (flags.o) {
      const fileName = "output" + Date.now();
      Deno.writeTextFile(`./outputs/${fileName}.txt`, output);
    }

    // prompt to do ongoing prompts
    generate = prompt("Would you like to generate again? [y/n]", "y") == "y";
  }
};

if (import.meta.main) main();
