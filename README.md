## Ai Fixed my Relationship

I thought it would be funny to train an AI on reddit posts about people using Ai in their relationships. Not AI girlfriends but AI responiding to your girlfriends.

This faulty ass markov chain generator is the outcome. This is a markov chain generator built in TS and Deno. It can be trained with an array of objects contained in a JSON dataset. It's built by me, Fred Wordie, and is a little bit clunky at times and spleling bad.

In it's standard config it will do my project but here is some code to do what ever you want.

### Key features

 - The Chain can start and stop by 'learning' how the dataset items start and stop
 - Generate poems (bad)
 - Generate text (meh)
 - A scraper that can scrape reddit

### How to use

Step 1: Download and install Deno
    - https://docs.deno.com/runtime/getting_started/installation/

Step 2: Run the scraper
    - Deno -A scraper.ts

Step 3: Run the generator with args listed below

    - Deno -A generator.ts


### The Scraper (scraper.ts)

This scraper scrapes reddit based off a list of subreddits and search terms.
It compiles the data into an JSON array of objects with title, body, date, link, subreddit and search term

For most use cases, just follow the instructions...

```
e.g. Deno run -A scraper.ts -f
```

```
-- Args --

-h: see help info
-f: filename to save to (defualt: redditData)
```

### The Generator (generator.ts)

This generator uses the data set the scraper made to crate a markov chain and then generate text according to rules.

```
e.g. Deno run -A generator.ts
```
```
--- Args ---

-h: list helpful stuff

-p: Turn output into a rhyming poem
Accepts: "null","limerick","random","haiku","sonnet","petrarchan"
Default: "null"

-c: Keep generating after reaching an end character
Accepts: boolean
Default: false

-n: max number of tokens to generate
Accepts: Number as string
Default: '1000'

-o: output to file
Accepts: boolean
Defualt: false

-t: Train makrov chain
Accepts: boolean
Default: false

-f: location of json file that has data -
Required if training (file data must be a array of objects)
Accepts: string
Default: NONE

-k: object key of data
Required if training (e.g. 'body','title)
Accepts: string
Default: NONE

-s: sample size
Only if used if training - (bigger is more deterministic)
Accepts: Number as string
Default: '3'

```
