# Update Channel Scraping to Include Thumbnail Data for AI Categorization

## Problem Analysis
After analyzing the codebase, I found:

1. **YouTubeScraper** (`src/utils/youtube-scraper.ts`) already scrapes channel avatars from the YouTube sidebar and stores them as `avatarUrl` in the `YouTubeChannel` interface
2. **AI Categorizer** (`src/utils/aiCategorizer.ts`) expects `ChannelMetadata` interface with a `thumbnail` property for thumbnail analysis
3. **Gap**: The scraped channel data (with `avatarUrl`) needs to be mapped to the AI categorizer's expected format (with `thumbnail`)
4. **Current flow**: HeaderAISort calls `scraper.scrapeChannels()` but then calls `aiCategorizer.categorizeChannels(channels, cacheService)` without proper data mapping

## Todo Items

- [ ] **Update ChannelMetadata interface** - Ensure it has thumbnail property populated from scraped avatar data
- [ ] **Fix data mapping in HeaderAISort** - Map YouTubeChannel.avatarUrl to ChannelMetadata.thumbnail
- [ ] **Update thumbnail analyzer** - Make sure it can handle the avatar URLs from YouTube scraping
- [ ] **Test the integration** - Verify that thumbnail data flows correctly from scraper to AI categorizer

## Implementation Plan

The changes should be minimal and focused on data mapping rather than major refactoring. The scraping already works, we just need to ensure the AI categorizer receives the thumbnail data it expects.