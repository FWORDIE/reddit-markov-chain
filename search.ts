import { parseArgs } from "jsr:@std/cli/parse-args";
import * as cheerio from "npm:cheerio";
import { compileCorpus, tokenize } from "./tokeniser.ts";
import {
  ARPATableType,
  collectTransitions,
  newGenerator,
  PoemTypes,
  sliceCorpus,
  transitionsType,
} from "./generator.ts";
import { delay } from "./scraper.ts";

const dataArray: string[] = [];

// scraper Vars
type answerArrayType = { ans: string }[];
let answerCorpus: answerArrayType = [];
let commentsMax = 1000;

// generator vars
let samples = [];
let transitions: transitionsType = {};
let sampleSize = 2;
let ARPATable: ARPATableType = {};
let generate = true;
let poem: PoemTypes = "null";
let continious: boolean = false;
let num: number = 1000;

const flags = parseArgs(Deno.args, {
  boolean: ["t", "d"],
  default: {
    d: true,
    t: true,
  },
  negatable: ["t", "d"],
});

const main = async () => {
  const searchTerm = "Recipes for shortbread";
  const url = "https://old.reddit.com/search?q=" + searchTerm +
    "%3F&include_over_18=on";
  answerCorpus = await scrapePage(url, []);
  console.log(answerCorpus);
  if (answerCorpus.length < 1) {
    throw Error("Scrape failed");
  }
  await Deno.writeTextFile(
    `data/search.json`,
    JSON.stringify(answerCorpus),
  );
  try {
    const compliedCorpus = await compileCorpus("./data/search.json", "ans");
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
        "searchModel.json",
        JSON.stringify(modelFile),
      );

      console.log(`Saving Transitions Chain`);
    }
  } catch (e) {
    console.error(e);
    return;
  }
  while (generate === true) {
    const output = newGenerator(
      transitions,
      undefined,
      1000,
      false,
    );

    // run the generator with params
    console.log("\n");
    console.log("---OUTPUT START---");
    console.log("\n");
    console.log(output);
    console.log("\n");
    console.log("---OUTPUT END---");
    console.log("\n");

    // prompt to do ongoing prompts
    generate = prompt("Would you like to generate again? [y/n]", "y") == "y";
  }
};

const scrapePage = async (url: string, answerArray: answerArrayType) => {
  console.log("starting");
  const res = await fetch(url); // fetch webpage
  const html = await res.text(); // get webpage text (html)
  const $ = cheerio.load(html); // load the cheerio
  const posts = $(".listing.search-result-listing").find(".search-result");
  if (!res.ok) {
    throw Error(res.statusText);
  } // loop over all posts returned
  let itemsToSearch: string[] = [];
  posts.each((_i, post) => {
    let url = $(post).find(".search-title").attr("href");
    if (url && url.includes("/r/")) { // filters only links that are of posts not users
      itemsToSearch.push(url); // add to links to serach
    }
  });
  console.log(itemsToSearch);

  for (let x = 0; x < itemsToSearch.length; x++) {
    await delay(2000);

    let url = itemsToSearch[x];
    const res = await fetch(url); // fetch webpage
    const html = await res.text(); // get webpage text (html)
    const $ = cheerio.load(html); // load the cheerio
    if (!res.ok) {
      throw Error(res.statusText);
    } // loop over all posts
    let comments = $(".nestedlisting").children();
    console.log(comments.length);
    comments.each((_i, comment) => {
      let commentText = $(comment).find(".usertext-body").first().text();
      if (commentText) {
        answerArray.push({
          ans: commentText,
        });
      }
    });
  }
  console.log("current corpus text: ", answerArray.length);

  if (answerArray.length <= commentsMax) {
    await delay(2000);
    console.log("here");
    const nextButton = $(".nextprev a:contains(next)")[1] ||
      $(".nextprev a:contains(next)")[0];
    if (nextButton) {
      const nextUrl = $(nextButton).attr("href");
      console.log(nextUrl);
      if (nextUrl) {
        console.log("Moving to Next Page");
        return scrapePage(nextUrl, answerArray);
      }
    }
  }
  return answerArray;
};

if (import.meta.main) main();
