import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

let pages = 8;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
let URLFunc = (subreddit, term) => {
  return (
    "https://old.reddit.com/r/" +
    subreddit +
    "/search?q=%27" +
    term +
    "%27&restrict_sr=on&include_over_18=on&sort=new&t=all"
  );
};

let searchTerms = ["ChatGPT","ai"];
let subReddits = [
  "relationship_advice",
  "dating_advice",
  "offmychest",
  "AmItheAsshole",
  "relationships",
  "confessions",
];
let searchTermsAI = [
  "relationship",
  "friendships",
  "dating",
  "wife",
  "husband",
];
let subRedditsAI = ["chatGPT"];
// let subReddits = ["relationship_advice"]
let data = [];

const scrape = async (page, url, subReddit, searchTerm) => {
  console.log(
    "STARTING ON PAGE " + page + " for " + subReddit + "/" + searchTerm,
  );

  let PAGEBODY = await fetch(url)
    .then((response) => {
      if (response.status >= 400 && response.status < 600) {
        console.log(response);
        return 0;
      }
      return response;
    })
    .then((returnedResponse) => {
      if (returnedResponse) {
        // Your response to manipulate
        return returnedResponse.text();
      } else {
        console.log("fail");
      }
    });
  if (PAGEBODY) {
    const $ = await cheerio.load(PAGEBODY);
    const numOfPosts = $(".search-title").length;

    for (let index = 0; index < numOfPosts; index++) {
      let titleElement = $(".search-title")[index];
      let bodyElement = $(".search-result-body")[index];
      let timeElement = $(".search-time time")[index];

      let object = {
        subReddit: subReddit,
        searchTerm: searchTerm,
        title: $(titleElement).text(),
        body: $(bodyElement).text(),
        link: $(titleElement).attr("href"),
        date: $(timeElement).attr("datetime"),
      };
      data.push(object);
    }

    page++;
    console.log("DATA SO FAR, LENGTH: ", data.length);

    if (page < pages) {
      await delay(1000);

      const nextButton = $(".nextprev a:contains(next)")[0];
      if (nextButton) {
        const next = $(nextButton).attr("href");
        console.log("NEXT URL: ", next);
        return scrape(page, next, subReddit, searchTerm);
      }
      console.log("Finished: " + searchTerm);
      return "finished";
    } else {
      console.log("Finished: " + searchTerm);
      return "finished";
    }
  }
};

const scrapeAll = async () => {
  let promises = [];

  //Relationship Subreddits
  for (const subReddit of subReddits) {
    for (const searchTerm of searchTerms) {
      scrape(0, URLFunc(subReddit, searchTerm), subReddit, searchTerm);
      await delay(1000);
    }
  }

  // AI Subreddits
  for (const subReddit of subRedditsAI) {
    for (const searchTerm of searchTermsAI) {
      scrape(0, URLFunc(subReddit, searchTerm), subReddit, searchTerm);
      await delay(1000);
    }
  }

  // Wait for all scrape operations to finish
  await Promise.all(promises);

  // Possible filter logic here
  let filteredData = await filter(data); // Add your filter logic

  let stringTxt = await formatter(filteredData);

  fs.writeFile("redditdataRaw.json", JSON.stringify(data), (err) => {
    if (err) throw err;
    console.log("complete");
  });

  fs.writeFile("redditdata.json", JSON.stringify(filteredData), (err) => {
    if (err) throw err;
    console.log("complete");
  });

  fs.writeFile("redditdata.txt", JSON.stringify(stringTxt), (err) => {
    if (err) throw err;
    console.log("complete");
  });
};

const filter = async (arr) => {
  console.log("Initial Length: " + arr.length);
  const filteredArray = arr.filter(
    (obj, index) => arr.findIndex((item) => item.link === obj.link) === index,
  );
  console.log("End Length: " + filteredArray.length);
  return arr;
};

const formatter = async (arr) => {
  let outPutString = "";

  arr.map((obj) => {
    outPutString += "Title: ";
    outPutString += obj.title;
    outPutString += " Post: ";
    outPutString += obj.body;
    outPutString += " "

  });

  return outPutString;
};

scrapeAll();
