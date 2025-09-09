import { posts } from "./redditdata.ts";
let text = posts.map((entry) => {
  return entry.body;
});

import Markov from "npm:js-markov";

var markov = new Markov();

markov.addStates(text);
  // Train the Markov Chain
markov.train(3);
markov.setType('text');

// Generate an output
console.log(markov.generateRandom(200))