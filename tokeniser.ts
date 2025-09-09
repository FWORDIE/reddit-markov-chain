// Modified from here: https://dev.to/bespoyasov/text-generation-with-markov-chains-in-javascript-i38

// Start and End Strings
export const startString ="¤";
export const endString = "±";

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
const exists = (entity) => {
    return !!entity;
};

// Compile Corpus from JSON
export const compileCorpus = async (file: string, key: string) => {
    try {
        const corpusJSON = await import(file, {
            with: { type: "json" },
        });

        let corpusText = "";

        corpusJSON.default.forEach((entry) => {
            if (entry[key]) {
                corpusText += startString;
                corpusText += entry[key];
                corpusText += endString;
            }
        });
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
export const tokenize = (corpusText: string) => {
    try {
        let corpus = corpusText
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

export const textify = (tokens) => {
    return tokens
        .join("")
        .replaceAll(NEWLINE_PLACEHOLDER, PARAGRAPH_CHARACTER)
        .replaceAll(startString, "")
        .replaceAll(endString, "");
};
