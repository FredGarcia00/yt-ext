# FolderTube AI Categorization - Test Instructions

## Overview
Test the new AI-driven categorization feature that automatically organizes YouTube subscriptions into folders using rule-based classification.

## Test Setup

### Prerequisites
1. Load the extension in Chrome Developer Mode
2. Navigate to `https://www.youtube.com/*`
3. Ensure you have YouTube subscriptions visible in the sidebar
4. Have a YouTube API key configured (in `.env` file as `VITE_YOUTUBE_API_KEY`)

### Test Environment
- **Extension Version**: FolderTube v1.0.0
- **Chrome Version**: Latest stable
- **YouTube Data API v3**: Required for channel metadata

## Test Cases

### 1. Basic AI Categorization Test

**Objective**: Verify auto-categorization creates appropriate folders

**Steps**:
1. Go to YouTube.com and ensure subscriptions are visible in sidebar
2. Click the "Collections" button (purple folder icon)
3. Click the "AI Sort" button (green button with AI icon)
4. Wait for processing (should show "AI Sorting..." with spinner)
5. Verify folders are created with appropriate categories

**Expected Results**:
- Folders created with emojis and category names (e.g., "🎮 Gaming", "💻 Technology")
- Channels properly distributed into relevant categories
- Processing completes without errors
- New folders appear in dropdown list

### 2. Free vs Premium Plan Test

**Objective**: Test freemium limitations

**Steps**:
1. Set user plan to 'free' in chrome.storage.sync
2. Run AI categorization
3. Verify only 3 categories are created
4. Change plan to 'premium'
5. Run categorization again
6. Verify all 10 categories are available

**Expected Results**:
- Free users: Maximum 3 category folders
- Premium users: All 10 category folders available
- No API quota exceeded errors

### 3. Caching Test

**Objective**: Verify 30-day metadata caching works

**Steps**:
1. Run AI categorization first time
2. Check browser developer tools Network tab
3. Run categorization again immediately
4. Verify no new API calls for same channels
5. Check chrome.storage.local for cached metadata

**Expected Results**:
- First run: API calls to channels.list endpoint
- Second run: No API calls, uses cached data
- Cache entries have 30-day expiration
- Cached data includes topicIds and keywords

### 4. Drag-and-Drop Integration Test

**Objective**: Ensure drag-drop still works with AI folders

**Steps**:
1. Create AI-generated folders
2. Drag a channel from YouTube sidebar into an AI folder
3. Drag a channel between AI folders
4. Verify channels can be moved/removed normally

**Expected Results**:
- Drag-drop functionality remains intact
- Channels can be added to AI-generated folders
- Manual organization overrides AI categorization
- Folder contents update correctly

### 5. Avatar Display Test

**Objective**: Verify avatar display with AI folders

**Steps**:
1. Create AI folders with categorization
2. Open folder preview for each category
3. Verify channel avatars display correctly
4. Check for SVG fallbacks when DOM avatars fail

**Expected Results**:
- Avatars load from YouTube sidebar DOM
- SVG circle fallbacks with channel initials when needed
- No broken image placeholders
- Consistent avatar sizing

### 6. API Quota Logging Test

**Objective**: Test quota tracking functionality

**Steps**:
1. Open browser developer tools console
2. Run AI categorization
3. Check console for API call logging
4. Verify chrome.storage.local for quota tracking
5. Check daily usage limits

**Expected Results**:
- Console shows API call logs with timestamps
- Storage contains daily usage tracking
- Quota stays under 10,000 units/day limit
- Batch API calls for efficiency (50 channels per request)

### 7. Error Handling Test

**Objective**: Test graceful error handling

**Steps**:
1. Disconnect internet and run categorization
2. Use invalid API key and run categorization  
3. Test with channels that have no metadata
4. Test with empty subscription list

**Expected Results**:
- Graceful degradation with network errors
- Clear error messages for API issues
- Handles missing metadata gracefully
- No crashes with edge cases

### 8. Performance Test

**Objective**: Verify performance with large channel lists

**Steps**:
1. Test with 100+ subscribed channels
2. Monitor categorization processing time
3. Check memory usage during processing
4. Verify UI remains responsive

**Expected Results**:
- Processes 100+ channels in <30 seconds
- UI remains responsive during processing
- Memory usage stays reasonable
- No browser freezing

## Validation Criteria

### Functional Requirements
- ✅ AI categorization creates relevant folders
- ✅ Freemium model enforced (3 vs 10 categories)
- ✅ 30-day metadata caching works
- ✅ Drag-drop integration maintained
- ✅ Avatar display functional
- ✅ API quota logging active
- ✅ Error handling graceful

### Technical Requirements
- ✅ API usage under 10,000 units/day
- ✅ Batch API calls (50 channels max)
- ✅ chrome.storage.sync for folders
- ✅ chrome.storage.local for cache
- ✅ Topic IDs and keywords used for classification
- ✅ Rule-based categorization logic

### User Experience
- ✅ One-click categorization
- ✅ Visual feedback during processing
- ✅ Clear category names with emojis
- ✅ Integration with existing UI
- ✅ Non-destructive to existing folders

## Troubleshooting

### Common Issues
1. **API Key Missing**: Set `VITE_YOUTUBE_API_KEY` in `.env`
2. **No Subscriptions**: Ensure YouTube sidebar shows subscriptions
3. **Storage Quota**: Clear chrome.storage if full
4. **Network Errors**: Check internet connection and API quotas

### Debug Commands
```javascript
// Check stored folders
chrome.storage.sync.get(['folderTube_folders'], console.log);

// Check cached metadata
chrome.storage.local.get(null, (data) => {
  const metadata = Object.keys(data).filter(k => k.startsWith('folderTube_metadata_'));
  console.log('Cached metadata entries:', metadata.length);
});

// Check API usage
chrome.storage.local.get(['apiUsage'], console.log);

// Clear cache
chrome.storage.local.clear();
```

## Success Metrics
- ✅ 95%+ channels categorized correctly
- ✅ <10 API units per channel processed
- ✅ <30 second processing time for 100 channels
- ✅ Zero crashes during normal operation
- ✅ Seamless integration with existing features