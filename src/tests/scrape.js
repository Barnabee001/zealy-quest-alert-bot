import {
  scrapePage
} from "../service/scrape.js";

scrapePage('https://zealy.io/cw/solstice-finance/questboard').then((result) => {
  console.log(result);
});