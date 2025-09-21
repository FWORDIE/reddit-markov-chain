// import { textify, tokenize } from "./tokeniser.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
    compileCorpus,
    endString,
    textify,
    tokenize,
    startString,
    poemEnder,
} from "./tokeniser.ts";
import { findARPAbet, findARPAAndSyllables } from "./ryhmingStuff.ts";

// Global Vars
let samples = [];
let transitions: transitionsType = {};
let sampleSize = 2;
let ARPATable: ARPATableType = {};

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

// TS type
export type transitionsType = {
    [key: string]: string[];
};

export type ARPATableType = {
    [key: string]: string[];
};

// Args
// r: turn output into a rhyming poem - default:false
// c: keep generating after reaching an end character - default:false
// f: location json file that has data - required
//    file data must be a array of objects
// k: object key of data e.g. 'title', 'body'
// t: retrain makrov chain - default:false
// n: max number of tokens to generate - default:'1000'
// s: sample size, bigger is more deterministic

const flags = parseArgs(Deno.args, {
    boolean: ["c", "t"],
    string: ["p", "f", "k", "n", "s"],
    default: { r: false, c: false, t: false, n: "1000", s: "3", p: "null" },
    negatable: ["p", "c", "t", "s"],
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

    const textStartString =
        textify(startToken) == "" ? "Start Characters" : textify(startToken);

    console.log(`Starting Text Generation with : ${textStartString}, ${continuous}`);
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

    const possibleTokens = transitions[key];
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
    //   console.log( { nextToken });
};

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
                    ARPATable: ARPATable,
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
        ARPATable = modelData.ARPATable;
        console.log(
            `Old Transitions Loaded: ${Object.keys(transitions).length} Transitions`,
        );
    }
    if (!isPoem(flags.p)) {
        throw Error(
            `Error: Poem type " ${flags.p} " is not valid, must be one of ${JSON.stringify(poemTypes)}`,
        );
    }

    const output = await newGenerator(
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
};

if (import.meta.main) main();
