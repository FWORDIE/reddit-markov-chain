import * as cheerio from "npm:cheerio";
import { parseArgs } from "jsr:@std/cli/parse-args";

// Args for commandLine
// -h: see help info
// -f: file name to save
const flags = parseArgs(Deno.args, {
    boolean: ["h"],
    string: ["f"],
    default: { f: "redditData", h: false },
    negatable: ["h"],
});

// Basic delay func
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// List of search Terms
const searchTermsDefaults = ["ChatGPT", "ai"];

// List of Subreddits
const subRedditsDefualts = [
    "relationship_advice",
    "dating_advice",
    "offmychest",
    "AmItheAsshole",
    "relationships",
    "confessions",
];

// Max Number of pages to scrape
const pageMaxDefault = 10;
let pageMax = 10;

// constructing URL to scrape
const URLFunc = (subreddit: string, searchTerm: string) => {
    return (
        "https://old.reddit.com/r/" +
        subreddit +
        "/search?q=%27" +
        searchTerm +
        "%27&restrict_sr=on&include_over_18=on&sort=new&t=all"
    );
};

// object array we add data to
const dataArray: {
    title: string;
    body: string;
    link: string | undefined;
    date: string | undefined;
    subReddit: string;
    searchTerm: string;
}[] = [];

const helpFunction = () => {
    console.log(`

-- SCRAPER HELP --

-- Basic Info -- 
This scraper scrapes reddit based off a list of subreddits and search terms.
It compiles the data into an JSON array of objects with title, body, date, link, subreddit and search term
For most use cases, just follow the instructions...

-- Options --
-h: see help info
-f: filename to save to (defualt: redditData)

e.g. Deno run -A scraper.ts -f
    
        `);
};

// main function
const main = async (filename: string, help: boolean) => {
    if (help) {
        helpFunction();
        return;
    }
    // Get Subreddits to serach
    const subRedditsUser = prompt(
        "Which subreddits should we scrape? (list with commas seprating)",
        subRedditsDefualts.join(", "),
    )
        ?.replaceAll(" ", "") // Remove spaces
        .split(",") // split on commas to an array
        .filter(Boolean); //  remove blank items in array
    console.log(subRedditsUser);
    if (!subRedditsUser || subRedditsUser.length < 1) {
        throw Error("No Subreddits Listed");
    }
    // Get Search terms to search
    const searchTermsUser = prompt(
        "Which search terms should we scrape for? (list with commas seprating)",
        searchTermsDefaults.join(", "),
    )
        ?.replaceAll(" ", "") // Remove spaces
        .split(",") // split on commas to an array
        .filter(Boolean); //  remove blank items in array

    if (!searchTermsUser || searchTermsUser.length < 1) {
        throw Error("No search terms Listed");
    }

    // Get max pages to scrape
    const userPageMax = prompt(
        "How many pages should we scrape?",
        pageMaxDefault.toString(),
    );

    if (
        Number(userPageMax) &&
        Number(userPageMax) < 50 &&
        Number(userPageMax) > 0
    ) {
        pageMax = Number(userPageMax);
    } else {
        throw Error("Page number not valid (must be between 0 and 50");
    }
    try {
        // Loop over all subreddits and search terms to scrape
        for (const subReddit of subRedditsUser) {
            for (const searchTerm of searchTermsUser) {
                await delay(1000); // delay so we don't get blocked for by the rate limit
                await scrape(
                    0,
                    URLFunc(subReddit, searchTerm),
                    subReddit,
                    searchTerm,
                );
            }
        }
    } catch (e) {
        console.error(e);
    }

    // If data Array has elements, then save it to a file
    if (dataArray.length > 1) {
        await Deno.writeTextFile(`${filename}.json`, JSON.stringify(dataArray));
    }
};

// Scraping function
const scrape = async (
    page: number,
    url: string,
    subReddit: string,
    searchTerm: string,
) => {
    console.log(
        "STARTING ON PAGE " + page + " for " + subReddit + "/" + searchTerm,
    );

    try {
        // See cheerio docs: https://cheerio.js.org/
        const res = await fetch(url); // fetch webpage
        const html = await res.text(); // get webpage text (html)
        const $ = cheerio.load(html); // load the cheerio

        // in the body, find all the elements element with class .search-result
        const posts = $("body").find(".search-result");

        // loop over all posts returned
        posts.each((_i, post) => {
            const object = {
                title: $(post).find(".search-title").text(),
                body: $(post).find(".search-result-body").text(),
                link: $(post).find(".search-title").attr("href"),
                date: $(post).find(".search-time time").attr("datetime"),
                subReddit: subReddit,
                searchTerm: searchTerm,
            };
            dataArray.push(object); // add to dataArray
        });

        page++; // increment page

        // If page number is less then page max
        // Find the next button (if it exists)
        // Grab its href and go run this scrape function on it
        if (page <= pageMax) {
            const nextButton = $(".nextprev a:contains(next)")[0];
            if (nextButton) {
                const nextUrl = $(nextButton).attr("href");
                if (nextUrl) {
                    return scrape(page, nextUrl, subReddit, searchTerm);
                }
            }
            console.log("Finished: " + subReddit + "/" + searchTerm);
        }
    } catch (error) {
        console.log(error);
    }
};

if (import.meta.main) main(flags.f, flags.h);
