// Modified from here: https://dev.to/bespoyasov/text-generation-with-markov-chains-in-javascript-i38

//TODO: number to text for syllables and arpa

// Start and End Strings
export const startString = "¤";
export const endString = "±";
export const lineEnder = "¬";
export const poemEnder = "␡";

// Identify new space and repalce with a specail char
const newlinesRegex = /\n\s*/g;
const NEWLINE_PLACEHOLDER = "§";
3;

// Splits all text into tokens including compound words and punctiation
const punctuation = `[](){}!?.,:;'"\/*&^%$_+-–—=<>@|~±¤,`.split("").join("\\");
const ellipsis = "\\.{3}";

const words = "[a-zA-Zа-яА-ЯёЁ]+";
const compounds = `${words}-${words}`;

const tokenizeRegex = new RegExp(
    `(${ellipsis}|${compounds}|${words}|[${punctuation}])`,
);

// Checks if string is empty
const exists = (entity: string) => {
    return !!entity;
};

// Compile Corpus from JSON
export const compileCorpus = async (file: string, key: string) => {
    try {
        // Import json with data
        // Use scraper.ts to do get fresh data
        const corpusJSON = await import(file, {
            with: { type: "json" },
        });

        // empty string where we store complied data
        let corpusText = "";

        //loop of corpus of data and for each entry add it's value at 'key' to the Corpus Text
        corpusJSON.default.forEach(
            (entry: Record<string | number | symbol, never>) => {
                if (entry[key]) {
                    corpusText += startString;
                    corpusText += entry[key];
                    corpusText += endString;
                }
            },
        );

        // If the corpus is too small, throw error
        if (corpusText.length < 4) {
            throw Error(
                "Corpus Text too small, usally its because the object key is wrong",
            );
        }
        return corpusText;
    } catch (e) {
        console.error(e);
        return;
    }
};

// Tokenise text
// e.g 'hello I'm Dave' -> ['hello', ' ', 'I',''','m',' ','Dave']
export const tokenize = (corpusText: string) => {
    try {
        const corpus = corpusText
            .replaceAll(newlinesRegex, NEWLINE_PLACEHOLDER) // New line replace
            .replaceAll("“", '"') // Replace all “ to "
            .replaceAll("`", "'") // Replace all ` to '
            .split(tokenizeRegex) // Split to tokens
            .filter(exists); // Removes empty items
        return corpus;
    } catch (e) {
        console.error(e);
        return;
    }
};

const PARAGRAPH_CHARACTER = "\n\n";

// Texitify tokens
// e.g ['hello', ' ', 'I',''','m',' ','Dave']  -> 'hello I'm Dave'
export const textify = (
    tokens: string[] | undefined,
    poem: boolean = false,
) => {
    if (tokens) {
        return tokens
            .join("")
            .replaceAll(NEWLINE_PLACEHOLDER, poem ? " " : PARAGRAPH_CHARACTER) // If poem don't respect linebreaks
            .replaceAll(lineEnder, PARAGRAPH_CHARACTER)
            .replaceAll(poemEnder, "")
            .replaceAll(startString, "")
            .replaceAll(endString, "");
    }
    throw Error(`textify didnt receive Tokens, it received ${tokens}`);
};
