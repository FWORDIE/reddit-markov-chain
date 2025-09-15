import { dictionary } from "./dictionary.ts";
import { ARPATableType, pickRandom } from "./generator.ts";
import { lineEnder, poemEnder, textify, tokenize } from "./tokeniser.ts";

let sylableCount = 0;
let lineNum = 0;

// Really rough and not accurate way to count syllables
// stolen from:
// https://github.com/EndaHallahan/syllabificate/blob/master/index.js

export const countSyllables = (inString: string) => {
    let syllablesTotal = 0;
    const wordList = inString.match(/(?:(?:\w-\w)|[\wÀ-ÿ'’])+/g);
    if (wordList) {
        wordList.forEach((word) => {
            if (word === "'" || word === "’") {
                return;
            } //bandaid solution.
            if (word.length <= 2) {
                syllablesTotal += 1;
                return;
            } //quick return on short words
            let syllables = 0;
            if (word.endsWith("s'") || word.endsWith("s’")) {
                word.slice(-1);
            } //ending with s'
            if (word.endsWith("s's") || word.endsWith("s’s")) {
                word.slice(-1, -3);
            } //ending with s's
            const cEndings = word.match(
                /(?<=\w{3})(side|\wess|(?<!ed)ly|ment|ship|board|ground|(?<![^u]de)ville|port|ful(ly)?|berry|box|nesse?|such|m[ae]n|wom[ae]n|anne)s?$/im,
            );
            if (cEndings) {
                word = word.replace(cEndings[0], "\n" + cEndings[0]);
            } //Splits into two words and evaluates them as such
            const cBeginnings = word.match(
                /^(ware|side(?![sd]$)|p?re(?!ach|agan|al|au)|[rf]ace(?!([sd]|tte)$)|place[^nsd])/im,
            );
            if (cBeginnings) {
                word = word.replace(cBeginnings[0], "");
                syllables++;
            }
            const esylp = word.match(
                /ie($|l|t|rg)|([cb]|tt|pp)le$|phe$|kle(s|$)|[^n]scien|sue|aybe$|[^aeiou]shed|[^lsoai]les$|([^e]r|g)ge$|(gg|ck|yw|etch)ed$|(sc|o)he$|seer|^re[eiuy]/gim,
            );
            if (esylp) {
                syllables += esylp.length;
            } //E clustered positive
            const esylm = word.match(
                /every|some([^aeiouyr]|$)|[^trb]ere(?!d|$|o|r|t|a[^v]|n|s|x)|[^g]eous|niet/gim,
            );
            if (esylm) {
                syllables -= esylm.length;
            } //E clustered negative
            const isylp = word.match(
                /rie[^sndfvtl]|(?<=^|[^tcs]|st)ia|siai|[^ct]ious|quie|[lk]ier|settli|[^cn]ien[^d]|[aeio]ing$|dei[tf]|isms?$/gim,
            );
            if (isylp) {
                syllables += isylp.length;
            } //I clustered positive
            const osylp = word.match(
                /nyo|osm(s$|$)|oinc|ored(?!$)|(^|[^ts])io|oale|[aeiou]yoe|^m[ia]cro([aiouy]|e)|roe(v|$)|ouel|^proa|oolog/gim,
            );
            if (osylp) {
                syllables += osylp.length;
            } //O clustered positive
            const osylm = word.match(
                /[^f]ore(?!$|[vcaot]|d$|tte)|fore|llio/gim,
            );
            if (osylm) {
                syllables -= osylm.length;
            } //O clustered negative
            const asylp = word.match(
                /asm(s$|$)|ausea|oa$|anti[aeiou]|raor|intra[ou]|iae|ahe$|dais|(?<!p)ea(l(?!m)|$)|(?<!j)ean|(?<!il)eage/gim,
            );
            if (asylp) {
                syllables += asylp.length;
            } //A clustered positive
            const asylm = word.match(/aste(?!$|ful|s$|r)|[^r]ared$/gim);
            if (asylm) {
                syllables -= asylm.length;
            } //A clustered negative
            const usylp = word.match(
                /uo[^y]|[^gq]ua(?!r)|uen|[^g]iu|uis(?![aeiou]|se)|ou(et|ille)|eu(ing|er)|uye[dh]|nuine|ucle[aeiuy]/gim,
            );
            if (usylp) {
                syllables += usylp.length;
            } //U clustered positive
            const usylm = word.match(/geous|busi|logu(?!e|i)/gim);
            if (usylm) {
                syllables -= usylm.length;
            } //U clustered negative
            const ysylp = word.match(
                /[ibcmrluhp]ya|nyac|[^e]yo|[aiou]y[aiou]|[aoruhm]ye(tt|l|n|v|z)|pye|dy[ae]|oye[exu]|lye[nlrs]|olye|aye(k|r|$|u[xr]|da)|saye\w|iye|wy[ae]|[^aiou]ying/gim,
            );
            if (ysylp) {
                syllables += ysylp.length;
            } //Y clustered positive
            const ysylm = word.match(/arley|key|ney$/gim);
            if (ysylm) {
                syllables -= ysylm.length;
            }
            const essuffix = word.match(
                /((?<!c[hrl]|sh|[iszxgej]|[niauery]c|do)es$)/gim,
            );
            if (essuffix) {
                syllables--;
            } //es suffix
            const edsuffix = word.match(
                /([aeiouy][^aeiouyrdt]|[^aeiouy][^laeiouyrdtbm]|ll|bb|ield|[ou]rb)ed$|[^cbda]red$/gim,
            );
            if (edsuffix) {
                syllables--;
            }
            const csylp = word.match(/chn[^eai]|mc|thm/gim);
            if (csylp) {
                syllables += csylp.length;
            } //Consonant clustered negative
            const eVowels = word.match(
                /[aiouy](?![aeiouy])|ee|e(?!$|-|[iua])/gim,
            );
            if (eVowels) {
                syllables += eVowels.length;
            } //Applicable vowel count (all but e at end of word)
            if (syllables <= 0) {
                syllables = 1;
            } //catch-all
            if (word.match(/[^aeiou]n['’]t$/i)) {
                syllables++;
            } //ending in n't, but not en't
            if (word.match(/en['’]t$/i)) {
                syllables--;
            } //ending in en't
            syllablesTotal += syllables;
        });
    }
    return syllablesTotal;
};

export const poemTypes = {
    limerick: {
        scheme: "AABBA", //rhyimng scheme per line
        min: "77557", // min syllables per line
        max: "99779", // max sylables per line
        match: "00001", // repeated lines (0 = unique, number= line to repeat)
    },
};

export const findARPAbet = (string: string) => {
    const tokens = tokenize(string) as string[];
    let returnArray: string[] = [];
    // loop over tokens
    tokens.forEach((token) => {
        const dictionaryEntry = dictionary[token];
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
    poemType = "limerick",
) => {
    sylableCount += countSyllables(chain.slice(-1)[0]);

    const type = poemTypes[poemType];
    // let currentLine: string[] = [];
    // if (chain.indexOf(lineEnder)) {
    //     currentLine = chain.slice(chain.indexOf(lineEnder), chain.length);
    // }
    // currentLine = chain.slice(0, chain.length);

    // currentLine.map((item) => {
    //     const wordARPA = ARPATable[item];
    //     sylableCount += countSyllables(item);
    // });

    const maxRemainingSyllables = type.max[lineNum] - sylableCount;
    const minRemainingSyllables = type.min[lineNum] - sylableCount;

    const fittingPossibleTokens = possibleTokens.filter((item) => {
        return countSyllables(item) <= maxRemainingSyllables;
    });

    if (fittingPossibleTokens.length > 0) {
        let endingTokens = fittingPossibleTokens.filter((item) => {
            return countSyllables(item) >= minRemainingSyllables;
        });

        if (endingTokens.length > 0) {
            let nextItem = pickRandom(endingTokens);
            lineNum++;
            console.log(textify([...chain, nextItem]));
            console.log(sylableCount + countSyllables(nextItem));
            sylableCount = 0;
            console.log("endedLine");
            if (lineNum >= type.scheme.length) {
                return [nextItem, poemEnder];
            }
            return [nextItem, lineEnder];
        }
    }

    // console.log(textify(chain), fittingPossibleTokens, possibleTokens);

    const nextToken = pickRandom(possibleTokens);
    return [nextToken];
};
