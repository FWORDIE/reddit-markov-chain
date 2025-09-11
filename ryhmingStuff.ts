import { dictionary } from "./dictionary.ts";
import { tokenize } from "./tokeniser.ts";

export const findARPAbet = (string: string) => {
    let tokens = tokenize(string) as string[];
    let returnArray: string[] = [];
    // loop over tokens
    tokens.forEach((token) => {
        let dictionaryEntry = dictionary[token];
        if (dictionaryEntry) {
            // If defined, only look at the string before '#' then split it into it's parts
            const dictionaryArray = dictionaryEntry.split("#")[0].split(" ");
            returnArray = [...returnArray, ...dictionaryArray];
        }
    });
    return returnArray
};
