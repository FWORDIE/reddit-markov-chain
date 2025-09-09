import { url } from "node:inspector";
import * as cheerio from "npm:cheerio";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms)); //Basic delay func

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

const searchTerms = ["ChatGPT", "ai"]; // List of search Terms
const subReddits = [
    "relationship_advice",
    "dating_advice",
    "offmychest",
    "AmItheAsshole",
    "relationships",
    "confessions",
]; // List of Subreddits

let dataArray: {
    title: string;
    body: string;
    link: string | undefined;
    date: string | undefined;
    subReddit: string;
    searchTerm: string;
}[] = [];

const pageMax = 10;

const main = async () => {
    for (const subReddit of subReddits) {
        for (const searchTerm of searchTerms) {
            await delay(1000);
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

if (import.meta.main) main();
