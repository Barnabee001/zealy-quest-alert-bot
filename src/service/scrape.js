import axios from 'axios';
import {
  Readability
} from '@mozilla/readability';
import {
  JSDOM
} from 'jsdom';
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
    // Method 1: Jina AI Reader (Recommended - No API key needed!)
    // Just prefix any URL with r.jina.ai/
    console.log('Scraping with Jina AI:', url);
    const jinaUrl = `https://r.jina.ai/${url}`;

    const response = await axios.get(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown' // Get markdown format
      },
      // timeout: 30000 // 30 second timeout
    });

    const res = response

    // Jina returns clean markdown content
    return {
      url,
      data: res.data,
      scrapedAt: new Date().toISOString(),
      method: 'jina'
    };

  } catch (error) {
    console.warn('Jina scraping failed, trying fallback method...', error.message);

    // Method 2: Fallback using cheerio + readability
    return await scrapePageFallback(url);
  }
}

/**
 * Fallback scraping method using Mozilla Readability
 * This extracts the main content from HTML
 */
async function scrapePageFallback(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const dom = new JSDOM(response.data, {
      url
    });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Could not extract article content');
    }

    return {
      url,
      title: article.title || 'No title',
      content: article.textContent,
      excerpt: article.excerpt,
      byline: article.byline,
      length: article.length,
      scrapedAt: new Date().toISOString(),
      method: 'readability'
    };

  } catch (error) {
    console.error('Fallback scraping failed:', error);
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}