import { dictionary } from "./dictionary.ts";
import {
  ARPATableType,
  findAStart,
  pickRandom,
  PoemTypes,
  transitionsType,
} from "./generator.ts";
import { convert, countSyllables } from "./otherPeoplesCode.js";
import { lineEnder, poemEnder, tokenize } from "./tokeniser.ts";

let sylableCount = 0;
let lineNum = 0;
let syllableOverflow = 0;

type poemStructure = {
  scheme: string[]; //rhyimng scheme per line
  min: number[]; // min syllables per line
  max: number[]; // max sylables per line
  match: number[]; // repeated lines (0 = unique, number= line to repeat)
  leeway: number[]; // How many extra syllables can we search to find a ryhme
};

type poemStructures = { [Key in PoemTypes]?: poemStructure };

export const poemSchemas: poemStructures = {
  limerick: {
    scheme: ["A", "A", "B", "B", "A"],
    min: [7, 7, 5, 5, 7],
    max: [9, 9, 7, 7, 9],
    match: [0, 0, 0, 0, 1],
    leeway: [4, 4, 4, 4, 4],
  },
  haiku: {
    scheme: ["A", "B", "C"],
    min: [4, 6, 4],
    max: [5, 7, 5],
    match: [0, 0, 0],
    leeway: [1, 1, 1],
  },
  sonnet: {
    scheme: [
      "A",
      "B",
      "A",
      "B",
      "C",
      "D",
      "C",
      "D",
      "E",
      "F",
      "E",
      "F",
      "G",
      "G",
    ],
    min: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    max: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    match: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    leeway: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  petrarchan: {
    scheme: [
      "A",
      "B",
      "B",
      "A",
      "A",
      "B",
      "B",
      "A",
      "C",
      "D",
      "C",
      "D",
      "C",
      "D",
    ],
    min: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    max: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    match: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    leeway: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
};

let randomPoemStruture: undefined | poemStructure = undefined;

const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(min + (max - min + 1) * Math.random());
};

export const randomPoem = () => {
  let possibleletters = "ABCDEFGHIJKLMNOPQRSTUVXYZ";
  let length = getRandomInt(2, 8);
  let lineVary = getRandomInt(0, 4);
  let structure: poemStructure = {
    scheme: [],
    min: [],
    max: [],
    match: [],
    leeway: [],
  };
  let index = 0;
  for (let x = 0; x <= length; x++) {
    // scheme stuff
    if (x == 0) {
      structure.scheme.push("A");
    } else {
      let useNewLetter = Math.random() < 0.5;
      if (useNewLetter) {
        index++;
        structure.scheme.push(possibleletters[index]);
      } else {
        structure.scheme.push(
          pickRandom(possibleletters.slice(0, index + 1).split("")),
        );
      }
    }
    // min stuff
    let min = getRandomInt(2, 7);
    structure.min.push(min);

    //max stuff
    structure.max.push(min + lineVary);

    //repeating
    if (x == 0) {
      structure.match.push(0);
    } else {
      let match = Math.random() < 0.1;
      let matchNumber = getRandomInt(1, x);
      structure.match.push(match ? matchNumber : 0);
    }

    //leeway
    let leeway = getRandomInt(2, min);
    structure.leeway.push(leeway);
  }
  return structure;
};
export const findARPAbet = (string: string) => {
  const tokens = tokenize(string) as string[];
  let returnArray: string[] = [];
  // loop over tokens
  tokens.forEach((token) => {
    let dictionaryEntry = dictionary[token];
    // This is really sloppy way to turn numbers into ARPA stuff
    if (!isNaN(token as any) && token != " ") {
      let refrenceToken = convert(token.replaceAll(" ", ""));
      if (refrenceToken) {
        refrenceToken = refrenceToken
          .split(" ")
          .filter((item: string) => {
            return item != "";
          })
          .slice(-1)[0];
      }
      dictionaryEntry = dictionary[refrenceToken];
    }
    if (!dictionaryEntry) {
      // if word can't be found, try and find the end of it in something else in the dictionary e.g. chatbot -> bot
      for (let x = 0; x < token.length; x++) {
        let thisToken = token.slice(x);
        dictionaryEntry = dictionary[thisToken];
        if (dictionaryEntry) {
          break;
        }
      }
    }
    if (dictionaryEntry) {
      // If defined, only look at the string before '#' then split it into it's parts
      const dictionaryArray = dictionaryEntry.split("#")[0].split(" ");
      returnArray = [...returnArray, ...dictionaryArray];
    }
  });
  return returnArray;
};

export const findARPAAndSyllables = (
  chain: string[],
  ARPATable: ARPATableType,
  possibleTokens: string[],
  transitions: transitionsType,
  poemType: PoemTypes = "random",
) => {
  let poem: poemStructure;
  if (poemType == "random") {
    if (randomPoemStruture == undefined) {
      randomPoemStruture = randomPoem();
    }
    poem = randomPoemStruture;
  } else {
    poem = poemSchemas[poemType] as poemStructure;
  }

  // Check if line is meant to be a copy accoridning to the poem type
  const copyLine = Number(poem.match[lineNum]);
  if (copyLine > 0) {
    // Find line breaks
    const repeatLine = findLine(chain, copyLine - 1);

    // End Line
    lineNum++;
    sylableCount = 0;
    let nextItem = repeatLine;
    return endLine(nextItem, poem);
  }

  // If last item in chain was a line break, find a new start for the line
  if (chain.slice(-1)[0] == lineEnder) {
    // console.log("Starting new Line");
    return [...(tokenize(findAStart(transitions)) as string[])];
  }

  // Start of normal process of adding a word
  // Get recent Syllable count
  // TODO: Syllable count for numbers....
  sylableCount += countSyllables(chain.slice(-1)[0]);

  // start endLine sequence if syllable count is move then the min line length minus the leeway value
  if (
    sylableCount >
      Number(poem.min[lineNum]) - Number(poem.leeway[lineNum])
  ) {
    // console.log("Attempting to End Line");
    // filter down to are less syllables then the max plus the already overflowed syllables
    const possibleEndTokens = possibleTokens.filter((item) => {
      return (
        countSyllables(item) <=
          Number(poem.max[lineNum]) -
            sylableCount +
            syllableOverflow &&
        countSyllables(item) + sylableCount >= Number(poem.min[lineNum])
      );
    });
    // if no found tokens
    if (possibleEndTokens.length > 0) {
      // if we did find fitting matches
      // find the ryhming scheme letter
      const rhyimngScheme = poem.scheme[lineNum];
      // find the last line with this scheme
      const lastMatchLine = poem.scheme
        .slice(0, lineNum)
        .indexOf(rhyimngScheme);
      // if it is a unique line, then end the line with a random token that is within max and min
      if (lastMatchLine < 0) {
        return endLine([pickRandom(possibleEndTokens)], poem);
      }
      // else find the line that this ending is meant to rhyme with

      const ryhmingLine = findLine(chain, lastMatchLine);
      const ryhimingTokens = ryhmingLine.filter((item) => {
        return ARPATable[item] && ARPATable[item].length > 0;
      });
      const lastRyhmableWord = ryhimingTokens[ryhimingTokens.length - 1];
      const lastRyhmableWordARPA = ARPATable[lastRyhmableWord];

      const endTokensWithARPA = possibleEndTokens.filter((item) => {
        if (!ARPATable[item] || ARPATable[item].length < 1) {
          return false;
        }
        return true;
      });
      const bestRyhimingEndTokens = ryhmeZone(
        endTokensWithARPA,
        lastRyhmableWordARPA,
        ARPATable,
      );

      if (bestRyhimingEndTokens.length > 0) {
        return endLine([pickRandom(bestRyhimingEndTokens)], poem);
      }
    }
    // pick a random token
    const nextToken = pickRandom(possibleTokens);
    syllableOverflow += countSyllables(nextToken);
    // if leeway is exceed by syllableOverflow, just end the line anyway (this is the fail safe)
    if (
      syllableOverflow > Number(poem.leeway[lineNum]) &&
      sylableCount + countSyllables(nextToken) >=
        Number(poem.min[lineNum])
    ) {
      return endLine([nextToken], poem);
    }
    // else just add random token and try again next time
    return [nextToken];
  }

  // Just add a word dumb dumb
  const nextToken = pickRandom(possibleTokens);
  return [nextToken];
};

const endLine = (nextItems: string[], poem: poemStructure) => {
  lineNum++;
  sylableCount = 0;
  syllableOverflow = 0;
  // console.log("line end");
  if (lineNum >= poem.scheme.length) {
    lineNum = 0;
    randomPoemStruture = undefined;
    return [...nextItems, poemEnder];
  }
  return [...nextItems, lineEnder];
};

const findLine = (chain: string[], lineNum: number) => {
  const lineEnds = [0];
  for (let i = 0; i < chain.length; i++) {
    if (chain[i] == lineEnder) {
      lineEnds.push(i);
    }
  }
  // chop chain to repaeat a certian line
  const neededLine = chain.slice(lineEnds[lineNum], lineEnds[lineNum + 1]);

  return neededLine;
};

const withNoDigits = (string: string) => {
  return string.replace(/[0-9]/g, "");
};

const ryhmeZone = (
  tokens: string[],
  ARPAToMatch: string[],
  ARPATable: ARPATableType,
) => {
  let bestTokens = tokens;
  for (let x = 1; x <= ARPAToMatch.length; x++) {
    let newTokens = bestTokens.filter((item) => {
      let currentARPA = ARPATable[item];
      return (
        withNoDigits(currentARPA.slice(x * -1)[0]) ==
          withNoDigits(ARPAToMatch.slice(x * -1)[0])
      );
    });
    // console.log(newTokens.length, { x });
    if (newTokens.length > 0) {
      bestTokens = newTokens;
    } else {
      break;
    }
  }
  return bestTokens;
};
