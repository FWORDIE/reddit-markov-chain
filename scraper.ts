import * as cheerio from "npm:cheerio";
import { parseArgs } from "jsr:@std/cli/parse-args";

// Args for commandLine
// h: see help info
// f: file name to save
const flags = parseArgs(Deno.args, {
    boolean: ["h"],
    string: ["f"],
    default: { f: "redditData", h: false },
    negatable: ["h"],
});

// Basic delay func
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// List of search Terms
const searchTerms = ["ChatGPT", "ai"];

// List of Subreddits
const subReddits = [
    "relationship_advice",
    "dating_advice",
    "offmychest",
    "AmItheAsshole",
    "relationships",
    "confessions",
];

// Max Number of pages to scrape
const pageMax = 10;

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
let dataArray: {
    title: string;
    body: string;
    link: string | undefined;
    date: string | undefined;
    subReddit: string;
    searchTerm: string;
}[] = [];

// main function
const main = async (filename: string, help: boolean) => {
    if (help) {
        console.log("-- Scraper Help --");
        console.log("-- Basic Info -- ");
        console.log(
            "This scraper scrapes reddit based off a list of subreddits and search terms.",
        );
        return;
    }

    const subRedditsUser = prompt(
        "Which subreddits should we scrape? (list with commas seprating)",
        subReddits.join(),
    )
        ?.replaceAll(" ", "")
        .split(",");
    console.log(subRedditsUser);

    if (!subRedditsUser || subRedditsUser.length < 1) {
        console.log("Your list of");
        return;
    }

    for (const subReddit of subRedditsUser) {
        for (const searchTerm of searchTerms) {
            await delay(1000); // delay so we don't get blocked for by the rate limit
            await scrape(
                0,
                URLFunc(subReddit, searchTerm),
                subReddit,
                searchTerm,
            );
        }
    }

    if (dataArray.length > 1) {
        await Deno.writeTextFile("redditData.json", JSON.stringify(dataArray));
    }
};

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
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);

        const posts = $("body").find(".search-result");

        posts.each((i, post) => {
            const object = {
                title: $(post).find(".search-title").text(),
                body: $(post).find(".search-result-body").text(),
                link: $(post).find(".search-title").attr("href"),
                date: $(post).find(".search-time time").attr("datetime"),
                subReddit: subReddit,
                searchTerm: searchTerm,
            };
            dataArray.push(object);
        });

        page++;

        if (page <= pageMax) {
            const nextButton = $(".nextprev a:contains(next)")[0];
            if (nextButton) {
                const nextUrl = $(nextButton).attr("href");
                console.log("NEXT URL: ", nextUrl);
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
