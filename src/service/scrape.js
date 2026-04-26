import axios from 'axios';
import dotenv from "dotenv"
import path from "path";
import {
  fileURLToPath
} from "url";

const __filename = fileURLToPath(
  import.meta.url);
const __dirname = path.dirname(__filename);

// Go up one level from src to reach root
dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

/**
 * Scrape a web page using Jina AI's Reader API
 * Jina AI provides clean, LLM-ready content extraction
 * 
 * @param {string} url - URL to scrape
 * @returns {Object} Extracted content with title, text, and metadata
 */
export async function scrapePage(url) {
  try {
    console.log('Scraping with Jina AI:', url);
    const jinaUrl = `https://r.jina.ai/${url}`;

    const response = await axios.get(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      },
      timeout: 30000
    });

    return {
      url,
      data: response.data,
      scrapedAt: new Date().toISOString(),
      method: 'jina'
    };

  } catch (error) {
    console.error('Scraping failed:', error);
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}