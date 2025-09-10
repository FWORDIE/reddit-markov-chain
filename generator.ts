// import { textify, tokenize } from "./tokeniser.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
    compileCorpus,
    endString,
    textify,
    tokenize,
    startString,
} from "./tokeniser.ts";

// TS type
type transitionType = {
    [key: string]: string[];
};

// Args
// r: turn output into a rhyming poem - default:false
// c: keep generating after reaching an end character - default:false
// f: location json file that has data - required
//    file data must be a array of objects
// k: object key of data e.g. 'title', 'body'
// t: retrain makrov chain - default:false
// n: max number of tokens to generate - default:'100'
// s: sample size, bigger is more deterministic

const flags = parseArgs(Deno.args, {
    boolean: ["r", "c", "t"],
    string: ["f", "k", "n", "s"],
    default: { r: false, c: false, t: false, n: "100", s: "3" },
    negatable: ["r", "c", "t", "s"],
});

// Return random Number between Min and Max
const random = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
// Return random from list
const pickRandom = (list: string[]) => list[random(0, list.length - 1)];
//join array of strings to one string
const fromTokens = (tokens: string[]) => tokens.join("");

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
    return samples.reduce((transitions: transitionType, sample: string[]) => {
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

// Returns a random token that starts with the startString
const findAStart = (transitions: transitionType) => {
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
    transitions: transitionType,
    startingString: string | undefined,
    wordsCount: number,
    continuous: boolean,
) => {
    const startToken = tokenize(startingString ?? findAStart(transitions));

    const textStartString =
        textify(startToken) == "" ? "Start Characters" : textify(startToken);

    console.log(`Starting Generation with : ${textStartString}`);
    let chain = [...(startToken as string[])];
    while (true) {
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

const findNextToken = (chain: string[], transitions: transitionType) => {
    const lastTokens = chain.slice(-(sampleSize - 1));

    const key = fromTokens(lastTokens);

    const possibleTokens = transitions[key];

    const nextToken = pickRandom(possibleTokens);
    //   console.log( { nextToken });
    return [nextToken];
};

// Global Vars
let samples = [];
let transitions: transitionType = {};
let sampleSize = 2;

const main = async () => {
    if (flags.t) {
        if (!flags.f) {
            throw Error("Error: No Source File defined [--f]");
        }
        if (!flags.k) {
            throw Error("Error: No Object Key defined [--k]");
        }

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
                console.log(
                    `New Transitions Created: ${Object.keys(transitions).length} Transitions`,
                );
                const modelFile = {
                    sampleSize: sampleSize,
                    transitions: transitions,
                };
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
        console.log(
            `Old Transitions Loaded: ${Object.keys(transitions).length} Transitions`,
        );
    }

    const output = await newGenerator(
        transitions,
        undefined,
        Number(flags.n),
        flags.c,
    );

    // run the generator with params
    console.log("\n");
    console.log("---OUTPUT START---");
    console.log("\n");
    console.log(output);
    console.log("\n");
    console.log("---OUTPUT END---");
    console.log("\n");
};

if (import.meta.main) main();
