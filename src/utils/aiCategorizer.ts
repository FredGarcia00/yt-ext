// import { ThumbnailAnalyzer } from './thumbnailAnalyzer';

export interface Category {
  id: string;
  name: string;
  keywords: string[];
  topicIds: string[];
  icon?: string;
}

export interface ChannelMetadata {
  id: string;
  name: string;
  description?: string;
  topicIds?: string[];
  keywords?: string[];
  thumbnail?: string;
}

export const ENHANCED_CATEGORIES: Category[] = [
  // Home & Garden
  {
    id: 'lawn_care',
    name: 'Lawn Care & Landscaping 🌱',
    keywords: ['lawn', 'grass', 'mow', 'mowing', 'fertilizer', 'weed', 'landscape', 'yard', 'garden', 'turf', 'irrigation', 'sprinkler', 'edging', 'mulch', 'seed', 'sod'],
    topicIds: [],
    icon: '🌱'
  },
  {
    id: 'home_improvement',
    name: 'Home Improvement & DIY 🔨',
    keywords: ['diy', 'home improvement', 'renovation', 'repair', 'build', 'construction', 'woodworking', 'tools', 'project', 'install', 'fix', 'remodel', 'handyman'],
    topicIds: ['/m/02lbcm', '/m/01k8wb'],
    icon: '🔨'
  },
  
  // Automotive
  {
    id: 'car_detailing',
    name: 'Car Care & Detailing 🚗',
    keywords: ['car wash', 'detail', 'detailing', 'wax', 'polish', 'ceramic coating', 'paint correction', 'interior cleaning', 'car care', 'auto detailing'],
    topicIds: [],
    icon: '🚗'
  },
  {
    id: 'automotive',
    name: 'Cars & Automotive 🏎️',
    keywords: ['car', 'cars', 'auto', 'automotive', 'vehicle', 'driving', 'racing', 'motor', 'engine', 'review', 'test drive', 'motorcycle', 'truck', 'restoration'],
    topicIds: ['/m/0k4j', '/m/012x34', '/m/012f08'],
    icon: '🏎️'
  },

  // Entertainment & Media
  {
    id: 'paranormal',
    name: 'Paranormal & Mystery 👻',
    keywords: ['paranormal', 'ghost', 'haunted', 'supernatural', 'mystery', 'unexplained', 'warren', 'investigation', 'spirit', 'demon', 'psychic', 'occult', 'creepy'],
    topicIds: [],
    icon: '👻'
  },
  {
    id: 'true_crime',
    name: 'True Crime & Investigation 🔍',
    keywords: ['true crime', 'murder', 'investigation', 'detective', 'criminal', 'case', 'solve', 'mystery', 'forensic', 'police', 'serial killer', 'unsolved'],
    topicIds: [],
    icon: '🔍'
  },

  // Gaming Specific
  {
    id: 'gaming_fps',
    name: 'FPS Gaming 🎯',
    keywords: ['fps', 'first person shooter', 'call of duty', 'battlefield', 'counter strike', 'valorant', 'apex legends', 'warzone', 'shooter'],
    topicIds: ['/m/0bzvm2'],
    icon: '🎯'
  },
  {
    id: 'gaming_general',
    name: 'Gaming 🎮',
    keywords: ['gaming', 'gameplay', 'gamer', 'games', 'playthrough', 'walkthrough', 'lets play', 'stream', 'twitch', 'esports', 'speedrun'],
    topicIds: ['/m/0bzvm2', '/m/025zzc', '/m/02ntfj'],
    icon: '🎮'
  },

  // Cooking Specific  
  {
    id: 'baking',
    name: 'Baking & Desserts 🍰',
    keywords: ['baking', 'cake', 'cookies', 'bread', 'pastry', 'dessert', 'oven', 'recipe', 'flour', 'sugar', 'frosting', 'cupcake'],
    topicIds: [],
    icon: '🍰'
  },
  {
    id: 'bbq_grilling',
    name: 'BBQ & Grilling 🔥',
    keywords: ['bbq', 'barbecue', 'grill', 'grilling', 'smoke', 'smoker', 'meat', 'ribs', 'brisket', 'steak', 'outdoor cooking'],
    topicIds: [],
    icon: '🔥'
  },
  {
    id: 'cooking',
    name: 'Cooking & Recipes 🍳',
    keywords: ['cooking', 'recipe', 'kitchen', 'cook', 'chef', 'meal', 'dish', 'food', 'culinary'],
    topicIds: ['/m/02wbm', '/m/01z1m6x'],
    icon: '🍳'
  },

  // Technology
  {
    id: 'tech_reviews',
    name: 'Tech Reviews & Unboxing 📱',
    keywords: ['tech review', 'unboxing', 'gadget', 'phone', 'laptop', 'smartphone', 'tablet', 'review', 'test'],
    topicIds: ['/m/07c1v'],
    icon: '📱'
  },
  {
    id: 'programming',
    name: 'Programming & Development 💻',
    keywords: ['programming', 'coding', 'developer', 'software', 'code', 'python', 'javascript', 'tutorial', 'web development'],
    topicIds: ['/m/019sc'],
    icon: '💻'
  },

  // Education & Learning
  {
    id: 'education',
    name: 'Education & Learning 📚',
    keywords: ['education', 'learn', 'tutorial', 'course', 'lesson', 'teach', 'explained', 'how to', 'guide', 'lecture', 'academy', 'university', 'school', 'study'],
    topicIds: ['/m/01k8wb', '/m/0289g'],
    icon: '📚'
  },

  // Health & Fitness
  {
    id: 'fitness',
    name: 'Fitness & Workouts 💪',
    keywords: ['fitness', 'workout', 'exercise', 'gym', 'training', 'bodybuilding', 'muscle', 'strength', 'cardio', 'weight'],
    topicIds: ['/m/0kt51'],
    icon: '💪'
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Health 🥗',
    keywords: ['nutrition', 'diet', 'healthy', 'wellness', 'health', 'vitamins', 'supplements', 'meal prep', 'weight loss'],
    topicIds: [],
    icon: '🥗'
  },

  // Entertainment
  {
    id: 'music',
    name: 'Music & Artists 🎵',
    keywords: ['music', 'song', 'songs', 'album', 'artist', 'band', 'concert', 'live', 'cover', 'remix', 'official', 'lyrics', 'producer', 'beat'],
    topicIds: ['/m/04rlf'],
    icon: '🎵'
  },
  {
    id: 'comedy',
    name: 'Comedy & Entertainment 😂',
    keywords: ['comedy', 'funny', 'humor', 'sketch', 'parody', 'meme', 'reaction', 'challenge', 'prank', 'standup', 'roast', 'compilation'],
    topicIds: ['/m/02jjt', '/m/09kqc'],
    icon: '😂'
  },

  // Business & Finance
  {
    id: 'business',
    name: 'Business & Entrepreneurship 💼',
    keywords: ['business', 'entrepreneur', 'startup', 'marketing', 'sales', 'strategy', 'leadership', 'management', 'company'],
    topicIds: [],
    icon: '💼'
  },
  {
    id: 'finance',
    name: 'Finance & Investing 💰',
    keywords: ['finance', 'investment', 'stock', 'crypto', 'bitcoin', 'money', 'trading', 'wealth', 'passive income', 'real estate', 'market'],
    topicIds: ['/m/09s1f'],
    icon: '💰'
  },

  // Lifestyle & Personal
  {
    id: 'fashion',
    name: 'Fashion & Beauty 💄',
    keywords: ['fashion', 'style', 'beauty', 'makeup', 'skincare', 'cosmetics', 'haul', 'outfit', 'trends', 'wardrobe'],
    topicIds: ['/m/032tl', '/m/03glg'],
    icon: '💄'
  },
  {
    id: 'travel',
    name: 'Travel & Adventure ✈️',
    keywords: ['travel', 'adventure', 'explore', 'trip', 'journey', 'destination', 'tourism', 'vacation', 'wanderlust', 'backpacking'],
    topicIds: ['/m/07bxq'],
    icon: '✈️'
  },

  // News & Information
  {
    id: 'news',
    name: 'News & Current Events 📰',
    keywords: ['news', 'politics', 'political', 'analysis', 'report', 'journalism', 'current', 'events', 'breaking', 'opinion', 'debate'],
    topicIds: ['/m/05qt0', '/m/05qjc'],
    icon: '📰'
  },

  // Science & Nature
  {
    id: 'science',
    name: 'Science & Nature 🔬',
    keywords: ['science', 'space', 'physics', 'chemistry', 'biology', 'nature', 'documentary', 'research', 'discovery', 'experiment', 'astronomy', 'wildlife'],
    topicIds: ['/m/01h7lh', '/m/05qjt'],
    icon: '🔬'
  },

  // Sports
  {
    id: 'sports',
    name: 'Sports & Athletics ⚽',
    keywords: ['sport', 'sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis', 'golf', 'match', 'highlights', 'championship', 'league', 'team', 'athlete'],
    topicIds: ['/m/06ntj', '/m/0jm_'],
    icon: '⚽'
  },

  // General fallbacks
  {
    id: 'lifestyle',
    name: 'Lifestyle & Vlogs 🏠',
    keywords: ['vlog', 'lifestyle', 'daily', 'life', 'routine', 'day in the life', 'morning', 'organization', 'productivity'],
    topicIds: ['/m/02jjt'],
    icon: '🏠'
  }
];

export class AICategorizer {
  private categories: Category[];
  private contextualPatterns!: Map<string, string[]>;
  private channelNamePatterns!: Map<string, string>;

  constructor(categories: Category[] = ENHANCED_CATEGORIES) {
    this.categories = categories;
    this.initializePatterns();
  }

  private initializePatterns() {
    // Contextual patterns that help identify categories from video content
    this.contextualPatterns = new Map([
      // Lawn Care specific patterns
      ['lawn_care', ['mow', 'mowing', 'grass', 'lawn', 'fertilizer', 'weed', 'edging', 'trimmer', 'yard', 'turf', 'seed', 'sod', 'mulch', 'irrigation']],
      
      // Car Detailing specific
      ['car_detailing', ['detail', 'detailing', 'wash', 'wax', 'polish', 'ceramic', 'paint correction', 'interior cleaning', 'foam', 'microfiber']],
      
      // Paranormal specific (for Ed & Lorraine Warren example)
      ['paranormal', ['ghost', 'haunted', 'supernatural', 'paranormal', 'investigation', 'spirit', 'demon', 'entity', 'evp', 'ouija', 'séance', 'possession']],
      
      // BBQ/Grilling specific
      ['bbq_grilling', ['bbq', 'grill', 'smoke', 'smoker', 'ribs', 'brisket', 'pulled pork', 'charcoal', 'pellet', 'low and slow']],
      
      // Home improvement
      ['home_improvement', ['renovation', 'remodel', 'install', 'build', 'construction', 'drywall', 'tile', 'plumbing', 'electrical', 'flooring']],
      
      // Gaming FPS
      ['gaming_fps', ['headshot', 'frag', 'killstreak', 'map', 'loadout', 'operator', 'round', 'clutch', 'ace', 'ranked']],
      
      // Tech reviews
      ['tech_reviews', ['unboxing', 'review', 'specs', 'benchmark', 'performance', 'camera test', 'battery life', 'display', 'comparison']],
      
      // Fitness
      ['fitness', ['workout', 'reps', 'sets', 'muscle', 'strength', 'cardio', 'gains', 'protein', 'gym', 'exercise']],
      
      // Cooking/Baking
      ['baking', ['recipe', 'flour', 'sugar', 'oven', 'bake', 'cake', 'cookies', 'bread', 'yeast', 'frosting']],
      ['cooking', ['recipe', 'ingredients', 'cook', 'chef', 'kitchen', 'meal', 'dish', 'sauce', 'seasoning']],
    ]);

    // Channel name patterns - recognizable names/brands that immediately indicate category
    this.channelNamePatterns = new Map([
      // Paranormal & Mystery
      ['warren', 'paranormal'], ['ghost adventures', 'paranormal'], ['paranormal', 'paranormal'],
      ['supernatural', 'paranormal'], ['haunted', 'paranormal'], ['ghost hunt', 'paranormal'],
      ['zak bagans', 'paranormal'], ['sam and colby', 'paranormal'], ['twin paranormal', 'paranormal'],
      ['nukes top', 'paranormal'], ['slapped ham', 'paranormal'], ['chills', 'paranormal'],
      
      // Famous Gaming YouTubers & Channels
      ['pewdiepie', 'gaming_general'], ['markiplier', 'gaming_general'], ['jacksepticeye', 'gaming_general'],
      ['dream', 'gaming_general'], ['technoblade', 'gaming_general'], ['georgenotfound', 'gaming_general'],
      ['tommyinnit', 'gaming_general'], ['wilbur soot', 'gaming_general'], ['philza', 'gaming_general'],
      ['gaming', 'gaming_general'], ['gamer', 'gaming_general'], ['esports', 'gaming_general'],
      ['lets play', 'gaming_general'], ['gameplay', 'gaming_general'], ['playthrough', 'gaming_general'],
      ['minecraft', 'gaming_general'], ['fortnite', 'gaming_general'], ['valorant', 'gaming_fps'],
      ['call of duty', 'gaming_fps'], ['apex legends', 'gaming_fps'], ['csgo', 'gaming_fps'],
      
      // Tech Reviewers & Channels
      ['mkbhd', 'tech_reviews'], ['marques brownlee', 'tech_reviews'], ['unbox therapy', 'tech_reviews'],
      ['linus tech', 'tech_reviews'], ['dave2d', 'tech_reviews'], ['mrwhosetheboss', 'tech_reviews'],
      ['austin evans', 'tech_reviews'], ['jonathan morrison', 'tech_reviews'], ['iJustine', 'tech_reviews'],
      ['everythingapplepro', 'tech_reviews'], ['tech', 'tech_reviews'], ['unbox', 'tech_reviews'],
      ['review', 'tech_reviews'], ['geek', 'tech_reviews'], ['gadget', 'tech_reviews'],
      
      // Cooking & Food Channels
      ['gordon ramsay', 'cooking'], ['jamie oliver', 'cooking'], ['binging with babish', 'cooking'],
      ['bon appetit', 'cooking'], ['tasty', 'cooking'], ['epicurious', 'cooking'],
      ['america test kitchen', 'cooking'], ['food network', 'cooking'], ['kitchen nightmare', 'cooking'],
      ['joshua weissman', 'cooking'], ['matty matheson', 'cooking'], ['sam the cooking', 'cooking'],
      ['kitchen', 'cooking'], ['recipe', 'cooking'], ['chef', 'cooking'], ['cook', 'cooking'],
      ['food', 'cooking'], ['meal', 'cooking'], ['cuisine', 'cooking'],
      
      // Baking Specific
      ['claire saffitz', 'baking'], ['preppy kitchen', 'baking'], ['rosanna pansino', 'baking'],
      ['cupcake jemma', 'baking'], ['baking', 'baking'], ['bakery', 'baking'], ['cake', 'baking'],
      ['pastry', 'baking'], ['bread', 'baking'], ['dessert', 'baking'],
      
      // Lawn Care & Landscaping
      ['lawn care', 'lawn_care'], ['grass', 'lawn_care'], ['turf', 'lawn_care'],
      ['lawn tips', 'lawn_care'], ['ryan knorr', 'lawn_care'], ['connor ward', 'lawn_care'],
      ['silver cymbal', 'lawn_care'], ['pest and lawn', 'lawn_care'], ['lawn rebel', 'lawn_care'],
      ['mow', 'lawn_care'], ['yard', 'lawn_care'], ['landscape', 'lawn_care'],
      
      // Car Detailing & Automotive
      ['detail geek', 'car_detailing'], ['ammo nyc', 'car_detailing'], ['car cleaning', 'car_detailing'],
      ['detail', 'car_detailing'], ['car wash', 'car_detailing'], ['auto detail', 'car_detailing'],
      ['stauffer garage', 'car_detailing'], ['wilson auto', 'car_detailing'], ['wd detail', 'car_detailing'],
      
      // General Automotive
      ['donut media', 'automotive'], ['car throttle', 'automotive'], ['motor trend', 'automotive'],
      ['top gear', 'automotive'], ['carwow', 'automotive'], ['doug demuro', 'automotive'],
      ['scotty kilmer', 'automotive'], ['chrisfix', 'automotive'], ['engineering explained', 'automotive'],
      ['car', 'automotive'], ['auto', 'automotive'], ['vehicle', 'automotive'], ['motor', 'automotive'],
      
      // Fitness & Health
      ['athlean', 'fitness'], ['jeff nippard', 'fitness'], ['calisthenics', 'fitness'],
      ['fitness', 'fitness'], ['workout', 'fitness'], ['gym', 'fitness'], ['muscle', 'fitness'],
      ['yoga with', 'fitness'], ['pamela reif', 'fitness'], ['chloe ting', 'fitness'],
      ['body project', 'fitness'], ['hasfit', 'fitness'], ['fitnessblender', 'fitness'],
      
      // Music & Artists
      ['vevo', 'music'], ['official artist', 'music'], ['records', 'music'], ['music', 'music'],
      ['song', 'music'], ['band', 'music'], ['singer', 'music'], ['musician', 'music'],
      ['cover', 'music'], ['acoustic', 'music'], ['live performance', 'music'], ['concert', 'music'],
      
      // News & Politics
      ['cnn', 'news'], ['fox news', 'news'], ['bbc', 'news'], ['msnbc', 'news'],
      ['news', 'news'], ['politics', 'news'], ['reporter', 'news'], ['journalist', 'news'],
      ['breaking', 'news'], ['daily wire', 'news'], ['young turks', 'news'],
      
      // Comedy & Entertainment
      ['comedy central', 'comedy'], ['saturday night live', 'comedy'], ['snl', 'comedy'],
      ['comedy', 'comedy'], ['funny', 'comedy'], ['humor', 'comedy'], ['stand up', 'comedy'],
      ['sketch', 'comedy'], ['parody', 'comedy'], ['meme', 'comedy'], ['vine', 'comedy'],
      
      // Education & Learning
      ['crash course', 'education'], ['ted', 'education'], ['khan academy', 'education'],
      ['veritasium', 'education'], ['vsauce', 'education'], ['kurzgesagt', 'education'],
      ['education', 'education'], ['learn', 'education'], ['tutorial', 'education'],
      ['explained', 'education'], ['how to', 'education'], ['course', 'education'],
      
      // Science & Discovery
      ['discovery', 'science'], ['national geographic', 'science'], ['science channel', 'science'],
      ['mark rober', 'science'], ['michael reeves', 'science'], ['william osman', 'science'],
      ['backyard scientist', 'science'], ['science', 'science'], ['experiment', 'science'],
      
      // True Crime
      ['true crime', 'true_crime'], ['crime', 'true_crime'], ['murder', 'true_crime'],
      ['bailey sarian', 'true_crime'], ['kendall rae', 'true_crime'], ['eleanor neale', 'true_crime'],
      ['jcs', 'true_crime'], ['explore with us', 'true_crime'], ['that chapter', 'true_crime'],
      
      // Fashion & Beauty
      ['fashion', 'fashion'], ['style', 'fashion'], ['outfit', 'fashion'], ['haul', 'fashion'],
      ['james charles', 'fashion'], ['jeffree star', 'fashion'], ['nikkietutorials', 'fashion'],
      ['makeup', 'fashion'], ['beauty', 'fashion'], ['skincare', 'fashion'], ['cosmetic', 'fashion'],
      
      // Travel & Adventure
      ['travel', 'travel'], ['adventure', 'travel'], ['explore', 'travel'], ['trip', 'travel'],
      ['yes theory', 'travel'], ['lost leblanc', 'travel'], ['kara and nate', 'travel'],
      ['drew binsky', 'travel'], ['vagabrothers', 'travel'], ['wolters world', 'travel'],
      
      // Business & Entrepreneurship
      ['gary vee', 'business'], ['entrepreneur', 'business'], ['business', 'business'],
      ['startup', 'business'], ['hustle', 'business'], ['grind', 'business'], ['ceo', 'business'],
      ['alex hormozi', 'business'], ['patrick bet david', 'business'], ['valuetainment', 'business'],
      
      // Finance & Investing
      ['graham stephan', 'finance'], ['meet kevin', 'finance'], ['andrei jikh', 'finance'],
      ['finance', 'finance'], ['invest', 'finance'], ['money', 'finance'], ['stock', 'finance'],
      ['crypto', 'finance'], ['bitcoin', 'finance'], ['trading', 'finance'], ['market', 'finance'],
      
      // Programming & Development
      ['traversy media', 'programming'], ['web dev', 'programming'], ['code with', 'programming'],
      ['programming', 'programming'], ['coding', 'programming'], ['developer', 'programming'],
      ['javascript', 'programming'], ['python', 'programming'], ['tutorial', 'programming'],
      ['freecodecamp', 'programming'], ['code', 'programming'], ['dev ed', 'programming'],
      
      // Home Improvement & DIY
      ['home depot', 'home_improvement'], ['lowes', 'home_improvement'], ['this old house', 'home_improvement'],
      ['diy', 'home_improvement'], ['handyman', 'home_improvement'], ['renovation', 'home_improvement'],
      ['home repair', 'home_improvement'], ['fix', 'home_improvement'], ['build', 'home_improvement'],
      
      // Sports
      ['espn', 'sports'], ['sports center', 'sports'], ['sport', 'sports'], ['nfl', 'sports'],
      ['nba', 'sports'], ['mlb', 'sports'], ['fifa', 'sports'], ['football', 'sports'],
      ['basketball', 'sports'], ['baseball', 'sports'], ['soccer', 'sports'], ['hockey', 'sports'],
      
      // Lifestyle & Vlogs
      ['david dobrik', 'lifestyle'], ['emma chamberlain', 'lifestyle'], ['vlog', 'lifestyle'],
      ['day in my life', 'lifestyle'], ['daily', 'lifestyle'], ['routine', 'lifestyle'],
      ['lifestyle', 'lifestyle'], ['life', 'lifestyle'], ['blog', 'lifestyle']
    ]);
  }

  // Enhanced categorization with video title analysis and contextual intelligence
  categorizeChannelWithVideoTitles(metadata: ChannelMetadata, videoTitles: string[] = []): { categoryId: string | null, confidence: number } {
    const scores = new Map<string, number>();
    const channelName = metadata.name.toLowerCase();
    const description = (metadata.description || '').toLowerCase();
    const allVideoText = videoTitles.join(' ').toLowerCase();
    
    // Series and format detection
    const seriesPatterns = this.detectSeriesPatterns(videoTitles);
    const formatType = this.detectVideoFormat(videoTitles);
    
    // Apply format-based categorization boost
    if (formatType) {
      const currentScore = scores.get(formatType) || 0;
      scores.set(formatType, currentScore + 12); // Strong signal from video format
    }
    
    // Apply series-based boost for gaming channels
    if (seriesPatterns.isSeriesBased && seriesPatterns.seriesType === 'episode') {
      const gamingScore = scores.get('gaming_general') || 0;
      scores.set('gaming_general', gamingScore + 8); // Gaming channels often have episodic content
    }

    // Phase 1: Direct channel name pattern matching (highest confidence)
    for (const [pattern, categoryId] of this.channelNamePatterns) {
      if (channelName.includes(pattern)) {
        const currentScore = scores.get(categoryId) || 0;
        scores.set(categoryId, currentScore + 15); // Even higher score for direct name matches
      }
    }

    // Phase 2: Contextual pattern analysis using video titles
    for (const [categoryId, patterns] of this.contextualPatterns) {
      let contextScore = 0;
      
      // Check video titles for contextual patterns
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
        const titleMatches = allVideoText.match(regex);
        if (titleMatches) {
          contextScore += titleMatches.length * 2; // Video content is very indicative
        }
        
        // Also check channel name and description
        if (channelName.includes(pattern)) {
          contextScore += 5; // Increased from 3
        }
        if (description.includes(pattern)) {
          contextScore += 2; // Increased from 1
        }
      }
      
      if (contextScore > 0) {
        const currentScore = scores.get(categoryId) || 0;
        scores.set(categoryId, currentScore + contextScore);
      }
    }

    // Phase 3: Traditional keyword matching (enhanced)
    for (const category of this.categories) {
      let traditionalScore = 0;
      
      // YouTube topic IDs (still valuable)
      if (metadata.topicIds) {
        for (const topicId of metadata.topicIds) {
          if (category.topicIds.includes(topicId)) {
            traditionalScore += 4;
          }
        }
      }
      
      // Enhanced keyword matching
      for (const keyword of category.keywords) {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        
        // Check channel name (high weight)
        if (keywordRegex.test(channelName)) {
          traditionalScore += 5; // Increased from 3
        }
        
        // Check video titles (very high weight for content analysis)
        const videoMatches = allVideoText.match(keywordRegex);
        if (videoMatches) {
          traditionalScore += Math.min(videoMatches.length * 1.5, 6); // Cap to prevent over-weighting
        }
        
        // Check description (medium weight)
        if (keywordRegex.test(description)) {
          traditionalScore += 2; // Increased from 1
        }
      }
      
      if (traditionalScore > 0) {
        const currentScore = scores.get(category.id) || 0;
        scores.set(category.id, currentScore + traditionalScore);
      }
    }

    // Find the best match
    if (scores.size === 0) {
      return { categoryId: null, confidence: 0 };
    }

    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const [bestCategory, bestScore] = sortedScores[0];
    
    // Calculate confidence percentage  
    const confidence = Math.min((bestScore / 6) * 100, 100); // Lowered denominator from 10 to 6
    
    // Only return if confidence is high enough for accuracy
    if (confidence < 40) {
      return { categoryId: null, confidence };
    }
    
    return { categoryId: bestCategory, confidence };
  }

  // Backward compatibility method
  categorizeChannel(metadata: ChannelMetadata): string | null {
    const result = this.categorizeChannelWithVideoTitles(metadata);
    return result.categoryId;
  }

  // Enhanced categorization method with video title analysis support
  categorizeChannelsWithVideoTitles(channels: ChannelMetadata[], videoTitlesMap: Map<string, string[]> = new Map()): Map<string, string[]> {
    const categorizedChannels = new Map<string, string[]>();

    // Initialize all categories
    for (const category of this.categories) {
      categorizedChannels.set(category.id, []);
    }

    // Step 1: Enhanced categorization using video title analysis
    const uncategorized: ChannelMetadata[] = [];
    let categorizedCount = 0;
    
    for (const channel of channels) {
      const videoTitles = videoTitlesMap.get(channel.id) || [];
      const result = this.categorizeChannelWithVideoTitles(channel, videoTitles);
      
      console.log(`FolderTube: Channel "${channel.name}" - Category: ${result.categoryId}, Confidence: ${result.confidence}%`);
      
      if (result.categoryId && result.confidence >= 40 && categorizedChannels.has(result.categoryId)) {
        categorizedChannels.get(result.categoryId)!.push(channel.id);
        categorizedCount++;
      } else {
        uncategorized.push(channel);
      }
    }
    
    console.log(`FolderTube: Step 1 - Categorized ${categorizedCount}/${channels.length} channels, ${uncategorized.length} uncategorized`);

    // Step 2: For remaining channels, try advanced pattern matching
    const stillUncategorized: ChannelMetadata[] = [];
    for (const channel of uncategorized) {
      const advancedCategoryId = this.advancedCategorization(channel);
      
      if (advancedCategoryId && categorizedChannels.has(advancedCategoryId)) {
        categorizedChannels.get(advancedCategoryId)!.push(channel.id);
      } else {
        stillUncategorized.push(channel);
      }
    }

    // Step 3: Create focused smart categories only if we have 5+ channels left
    if (stillUncategorized.length >= 5) {
      const smartCategories = this.createFocusedCategories(stillUncategorized);
      for (const [categoryId, channelIds] of smartCategories) {
        categorizedChannels.set(categoryId, channelIds);
      }
    } else if (stillUncategorized.length > 0) {
      // Put remaining few channels into "Discoveries" category
      categorizedChannels.set('discoveries', stillUncategorized.map(c => c.id));
    }

    // Collect channels from small categories before removing them (back to 2-channel minimum)
    const orphanedChannels: string[] = [];
    const categoriesToRemove: string[] = [];
    
    for (const [categoryId, channelIds] of categorizedChannels) {
      if (channelIds.length < 2) { // Collect channels from categories with fewer than 2 channels
        orphanedChannels.push(...channelIds);
        categoriesToRemove.push(categoryId);
      }
    }
    
    // Remove small categories
    for (const categoryId of categoriesToRemove) {
      categorizedChannels.delete(categoryId);
    }
    
    // Put orphaned channels back for aggressive re-categorization
    if (orphanedChannels.length > 0) {
      console.log(`FolderTube: Processing ${orphanedChannels.length} orphaned channels`);
      
      // Try aggressive re-categorization on orphaned channels
      const orphanedChannelData = orphanedChannels.map(id => channels.find((c: ChannelMetadata) => c.id === id)!).filter(Boolean);
      const reCategorized = this.aggressiveRecategorization(orphanedChannelData);
      
      let processedOrphans: string[] = [];
      for (const [categoryId, channelIds] of reCategorized) {
        const existing = categorizedChannels.get(categoryId) || [];
        categorizedChannels.set(categoryId, [...existing, ...channelIds]);
        processedOrphans.push(...channelIds);
      }
      
      // Ensure any remaining orphaned channels are not lost - put them in discoveries
      const stillOrphaned = orphanedChannels.filter(id => !processedOrphans.includes(id));
      if (stillOrphaned.length > 0) {
        console.log(`FolderTube: ${stillOrphaned.length} channels still orphaned, adding to discoveries`);
        const existingDiscoveries = categorizedChannels.get('discoveries') || [];
        categorizedChannels.set('discoveries', [...existingDiscoveries, ...stillOrphaned]);
      }
    }

    // Quality assurance - validate categorization results
    const validatedResults = this.validateCategorizationResults(categorizedChannels, channels);
    
    return validatedResults;
  }

  // Backward compatibility method - uses old approach
  categorizeChannels(channels: ChannelMetadata[]): Map<string, string[]> {
    return this.categorizeChannelsWithVideoTitles(channels, new Map());
  }

  // Quality assurance validation method
  private validateCategorizationResults(categorizedChannels: Map<string, string[]>, allChannels: ChannelMetadata[]): Map<string, string[]> {
    const validated = new Map<string, string[]>();
    let totalCategorized = 0;
    
    // Count total categorized channels
    for (const [_, channelIds] of categorizedChannels) {
      totalCategorized += channelIds.length;
    }
    
    // Validation Rule 1: Ensure we didn't lose any channels
    if (totalCategorized !== allChannels.length) {
      console.warn(`FolderTube: Categorization validation failed - channel count mismatch. Expected: ${allChannels.length}, Got: ${totalCategorized}`);
      
      // Find which channels are missing
      const categorizedIds = new Set<string>();
      for (const [_, channelIds] of categorizedChannels) {
        channelIds.forEach(id => categorizedIds.add(id));
      }
      
      const missingChannels = allChannels.filter(c => !categorizedIds.has(c.id));
      console.warn(`FolderTube: Missing channels:`, missingChannels.map(c => c.name));
      
      // Add missing channels to discoveries to prevent data loss
      if (missingChannels.length > 0) {
        const existingDiscoveries = validated.get('discoveries') || [];
        validated.set('discoveries', [...existingDiscoveries, ...missingChannels.map(c => c.id)]);
        console.log(`FolderTube: Added ${missingChannels.length} missing channels to discoveries`);
      }
    }
    
    // Validation Rule 2: Ensure minimum categorization quality (at least 70% of channels should be categorized into meaningful categories)
    let meaningfulCategories = 0;
    let channelsInMeaningfulCategories = 0;
    
    for (const [categoryId, channelIds] of categorizedChannels) {
      if (channelIds.length >= 2) { // Back to 2-channel minimum - no single-channel folders
        validated.set(categoryId, channelIds);
        
        // Don't count generic fallback categories as "meaningful"
        if (!['discoveries', 'mixed', 'international', 'creators', 'mixed_content'].includes(categoryId)) {
          meaningfulCategories++;
          channelsInMeaningfulCategories += channelIds.length;
        }
      }
    }
    
    const meaningfulPercentage = (channelsInMeaningfulCategories / allChannels.length) * 100;
    console.log(`FolderTube: Categorization quality report:
      - Total channels: ${allChannels.length}
      - Meaningful categories: ${meaningfulCategories}
      - Channels in meaningful categories: ${channelsInMeaningfulCategories} (${meaningfulPercentage.toFixed(1)}%)
      - Total categories created: ${validated.size}`);
    
    // Validation Rule 3: Allow more categories now (max 25 categories total)
    if (validated.size > 25) {
      console.warn(`FolderTube: Too many categories created (${validated.size}), consolidating...`);
      return this.consolidateCategories(validated, allChannels);
    }
    
    // Validation Rule 4: If meaningful categorization is below 25%, fallback to more generic grouping
    if (meaningfulPercentage < 25 && meaningfulCategories < 2) {
      console.warn(`FolderTube: Very low categorization quality (${meaningfulPercentage.toFixed(1)}%), using fallback strategy`);
      return this.createFallbackCategories(allChannels);
    }
    
    return validated;
  }
  
  // Consolidate categories if too many were created
  private consolidateCategories(categories: Map<string, string[]>, _allChannels: ChannelMetadata[]): Map<string, string[]> {
    const consolidated = new Map<string, string[]>();
    const sortedCategories = Array.from(categories.entries()).sort((a, b) => b[1].length - a[1].length);
    
    // Keep top 12 categories by size
    for (let i = 0; i < Math.min(12, sortedCategories.length); i++) {
      const [categoryId, channelIds] = sortedCategories[i];
      consolidated.set(categoryId, channelIds);
    }
    
    // Put remaining channels into "Mixed Content" category
    const remainingChannels: string[] = [];
    for (let i = 12; i < sortedCategories.length; i++) {
      const [_, channelIds] = sortedCategories[i];
      remainingChannels.push(...channelIds);
    }
    
    if (remainingChannels.length > 0) {
      consolidated.set('mixed_content', remainingChannels);
    }
    
    return consolidated;
  }
  
  // Create fallback categories when primary categorization fails
  private createFallbackCategories(channels: ChannelMetadata[]): Map<string, string[]> {
    const fallback = new Map<string, string[]>();
    
    // Simple keyword-based grouping for fallback
    const basicGroups = {
      'entertainment': ['music', 'song', 'artist', 'comedy', 'funny', 'movie', 'film', 'tv'],
      'education': ['tutorial', 'learn', 'how to', 'guide', 'course', 'lesson', 'explained'],
      'gaming': ['game', 'gaming', 'play', 'gameplay', 'twitch', 'stream'],
      'tech': ['tech', 'review', 'phone', 'computer', 'laptop', 'unboxing'],
      'lifestyle': ['vlog', 'daily', 'lifestyle', 'routine', 'travel', 'food'],
      'news': ['news', 'politics', 'current', 'analysis', 'report']
    };
    
    for (const [groupName, keywords] of Object.entries(basicGroups)) {
      const groupChannels: string[] = [];
      
      for (const channel of channels) {
        const searchText = `${channel.name} ${channel.description || ''}`.toLowerCase();
        if (keywords.some(keyword => searchText.includes(keyword))) {
          groupChannels.push(channel.id);
        }
      }
      
      if (groupChannels.length >= 2) {
        fallback.set(groupName, groupChannels);
      }
    }
    
    // Put uncategorized channels into discoveries
    const categorizedIds = new Set();
    for (const [_, channelIds] of fallback) {
      channelIds.forEach(id => categorizedIds.add(id));
    }
    
    const uncategorized = channels.filter(c => !categorizedIds.has(c.id)).map(c => c.id);
    if (uncategorized.length > 0) {
      fallback.set('discoveries', uncategorized);
    }
    
    return fallback;
  }

  // Aggressive re-categorization for orphaned channels
  private aggressiveRecategorization(channels: ChannelMetadata[]): Map<string, string[]> {
    const results = new Map<string, string[]>();
    const uncategorized: ChannelMetadata[] = [];
    
    console.log(`FolderTube: Aggressive re-categorization for ${channels.length} orphaned channels`);
    
    for (const channel of channels) {
      const name = channel.name.toLowerCase();
      const description = (channel.description || '').toLowerCase();
      const fullText = `${name} ${description}`;
      
      // Super aggressive pattern matching - partial word matching
      let bestMatch: string | null = null;
      let bestScore = 0;
      
      // Check all categories for partial matches
      for (const category of this.categories) {
        let score = 0;
        
        for (const keyword of category.keywords) {
          // Full word match (highest score)
          if (fullText.includes(keyword.toLowerCase())) {
            score += 10;
          }
          // Partial word match (medium score)  
          else if (this.fuzzyMatch(fullText, keyword.toLowerCase())) {
            score += 5;
          }
          // Character sequence match (low score)
          else if (this.characterSequenceMatch(name, keyword.toLowerCase())) {
            score += 2;
          }
        }
        
        // Semantic similarity based on common words
        score += this.semanticSimilarity(name, category.id) * 3;
        
        if (score > bestScore && score >= 8) { // Lower threshold for aggressive matching
          bestScore = score;
          bestMatch = category.id;
        }
      }
      
      if (bestMatch) {
        console.log(`FolderTube: Aggressive match - "${channel.name}" → ${bestMatch} (score: ${bestScore})`);
        if (!results.has(bestMatch)) {
          results.set(bestMatch, []);
        }
        results.get(bestMatch)!.push(channel.id);
      } else {
        uncategorized.push(channel);
      }
    }
    
    // For remaining uncategorized, try content-based grouping
    if (uncategorized.length >= 2) {
      const contentGroups = this.contentBasedGrouping(uncategorized);
      for (const [groupId, channelIds] of contentGroups) {
        results.set(groupId, channelIds);
      }
    }
    
    console.log(`FolderTube: Aggressive re-categorization completed. Created ${results.size} new groups.`);
    return results;
  }
  
  // Fuzzy matching for similar words
  private fuzzyMatch(text: string, keyword: string): boolean {
    if (keyword.length < 4) return false;
    
    // Check for substring matches with small character differences
    const threshold = Math.max(1, Math.floor(keyword.length * 0.2));
    
    for (let i = 0; i <= text.length - keyword.length + threshold; i++) {
      const substring = text.substring(i, i + keyword.length);
      if (this.levenshteinDistance(substring, keyword) <= threshold) {
        return true;
      }
    }
    return false;
  }
  
  // Character sequence matching
  private characterSequenceMatch(name: string, keyword: string): boolean {
    if (keyword.length < 3) return false;
    
    // Check for 3+ character sequences
    for (let i = 0; i <= keyword.length - 3; i++) {
      const sequence = keyword.substring(i, i + 3);
      if (name.includes(sequence)) {
        return true;
      }
    }
    return false;
  }
  
  // Simple Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // Semantic similarity based on category themes
  private semanticSimilarity(channelName: string, categoryId: string): number {
    const name = channelName.toLowerCase();
    
    // Define semantic groups
    const semanticGroups = {
      'gaming_general': ['play', 'gamer', 'stream', 'live', 'pro', 'clan', 'guild'],
      'music': ['sound', 'audio', 'beat', 'tune', 'melody', 'rhythm'],
      'cooking': ['kitchen', 'taste', 'flavor', 'recipe', 'meal'],
      'tech_reviews': ['review', 'unbox', 'test', 'specs', 'tech'],
      'fitness': ['fit', 'strong', 'power', 'health', 'body'],
      'education': ['learn', 'teach', 'know', 'study', 'school'],
      'automotive': ['speed', 'drive', 'wheel', 'engine', 'motor']
    };
    
    const group = semanticGroups[categoryId as keyof typeof semanticGroups];
    if (!group) return 0;
    
    let matches = 0;
    for (const word of group) {
      if (name.includes(word)) matches++;
    }
    
    return matches;
  }
  
  // Content-based grouping for remaining channels
  private contentBasedGrouping(inputChannels: ChannelMetadata[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    let remainingChannels = [...inputChannels]; // Create a copy to avoid modifying original
    
    // Group by common words in channel names
    const commonWords = this.findCommonWords(remainingChannels.map(c => c.name));
    
    for (const commonWord of commonWords) {
      const matchingChannels = remainingChannels.filter(c => 
        c.name.toLowerCase().includes(commonWord.toLowerCase())
      );
      
      if (matchingChannels.length >= 2) {
        const groupId = `content_${commonWord.toLowerCase()}`;
        groups.set(groupId, matchingChannels.map(c => c.id));
        
        // Remove matched channels from remaining pool
        remainingChannels = remainingChannels.filter(c => 
          !matchingChannels.includes(c)
        );
      }
    }
    
    return groups;
  }
  
  // Find common words in channel names
  private findCommonWords(names: string[]): string[] {
    const wordCount = new Map<string, number>();
    
    for (const name of names) {
      const words = name.toLowerCase().split(/\s+/).filter(word => 
        word.length > 3 && !['the', 'and', 'with', 'channel'].includes(word)
      );
      
      for (const word of words) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }
    
    return Array.from(wordCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 5);
  }

  private advancedCategorization(channel: ChannelMetadata): string | null {
    const name = channel.name.toLowerCase();
    const description = channel.description?.toLowerCase() || '';
    const fullText = `${name} ${description}`;
    
    // Professional terminology detection first (most specific)
    const professionalMatch = this.detectProfessionalTerminology(fullText);
    if (professionalMatch) {
      return professionalMatch;
    }
    
    // More comprehensive advanced patterns
    const advancedPatterns = [
      // Gaming variants
      { category: 'gaming_general', patterns: ['esport', 'twitch', 'stream', 'fps', 'mmo', 'indie', 'console', 'pc gaming', 'minecraft', 'fortnite', 'cod', 'valorant', 'apex', 'csgo', 'league', 'overwatch', 'wow', 'gta', 'fifa'] },
      
      // Tech & Programming
      { category: 'tech_reviews', patterns: ['software', 'app', 'silicon valley', 'startup', 'developer', 'engineer', 'iphone', 'android', 'apple', 'google', 'microsoft', 'samsung'] },
      { category: 'programming', patterns: ['code', 'programming', 'python', 'javascript', 'react', 'nodejs', 'java', 'cpp', 'web dev', 'coding', 'algorithm'] },
      
      // Education & Learning
      { category: 'education', patterns: ['university', 'professor', 'lecture', 'course', 'tutorial', 'explained', 'science', 'mathematics', 'physics', 'chemistry', 'biology', 'history', 'learn', 'study'] },
      
      // Entertainment
      { category: 'music', patterns: ['album', 'single', 'tour', 'concert', 'musician', 'singer', 'producer', 'record', 'band', 'artist', 'song', 'lyrics', 'cover', 'remix'] },
      { category: 'comedy', patterns: ['comedian', 'standup', 'sketch', 'funny', 'humor', 'satire', 'parody', 'meme', 'joke', 'laugh', 'prank'] },
      
      // News & Politics
      { category: 'news', patterns: ['network', 'journalist', 'reporter', 'breaking', 'analysis', 'politics', 'current events', 'cnn', 'fox', 'bbc', 'npr', 'election', 'government'] },
      
      // Lifestyle & Personal
      { category: 'lifestyle', patterns: ['vlog', 'daily', 'morning routine', 'day in my life', 'lifestyle', 'personal', 'diary', 'journal', 'family', 'relationship'] },
      { category: 'fashion', patterns: ['fashion', 'style', 'outfit', 'makeup', 'beauty', 'skincare', 'haul', 'clothing', 'trend', 'model'] },
      { category: 'travel', patterns: ['travel', 'trip', 'vacation', 'explore', 'adventure', 'backpack', 'journey', 'destination', 'visit', 'tour guide'] },
      
      // Health & Fitness
      { category: 'fitness', patterns: ['workout', 'gym', 'fitness', 'exercise', 'training', 'muscle', 'strength', 'cardio', 'bodybuilding', 'yoga', 'pilates'] },
      { category: 'nutrition', patterns: ['diet', 'nutrition', 'healthy', 'meal prep', 'weight loss', 'protein', 'vitamin', 'supplement', 'keto', 'vegan'] },
      
      // Food & Cooking
      { category: 'cooking', patterns: ['recipe', 'cooking', 'chef', 'kitchen', 'food', 'meal', 'dish', 'restaurant', 'culinary', 'ingredient'] },
      { category: 'baking', patterns: ['baking', 'cake', 'bread', 'cookie', 'pastry', 'dessert', 'oven', 'flour', 'sugar', 'bakery'] },
      
      // Business & Finance
      { category: 'business', patterns: ['business', 'entrepreneur', 'startup', 'marketing', 'sales', 'ceo', 'company', 'corporate', 'strategy', 'leadership'] },
      { category: 'finance', patterns: ['finance', 'money', 'invest', 'stock', 'crypto', 'bitcoin', 'trading', 'wealth', 'economy', 'market'] },
      
      // Home & DIY
      { category: 'home_improvement', patterns: ['diy', 'home', 'house', 'renovation', 'repair', 'build', 'construction', 'woodworking', 'tools', 'project'] },
      { category: 'lawn_care', patterns: ['lawn', 'garden', 'yard', 'landscape', 'mow', 'grass', 'plant', 'tree', 'flower', 'outdoor'] },
      
      // Automotive
      { category: 'automotive', patterns: ['car', 'auto', 'vehicle', 'driving', 'motor', 'engine', 'truck', 'motorcycle', 'racing', 'mechanic'] },
      { category: 'car_detailing', patterns: ['detail', 'wash', 'clean', 'wax', 'polish', 'ceramic', 'paint correction', 'interior'] },
      
      // Science & Nature
      { category: 'science', patterns: ['science', 'research', 'experiment', 'discovery', 'space', 'nasa', 'astronomy', 'physics', 'nature', 'wildlife'] }
    ];
    
    for (const pattern of advancedPatterns) {
      if (pattern.patterns.some(p => fullText.includes(p))) {
        // Additional confidence check - require multiple matches for some categories
        const matchCount = pattern.patterns.filter(p => fullText.includes(p)).length;
        if (matchCount >= 1 || pattern.category === 'gaming_general' || pattern.category === 'music' || pattern.category === 'cooking') {
          return pattern.category;
        }
      }
    }
    
    return null;
  }

  private detectProfessionalTerminology(text: string): string | null {
    // Professional role-based detection for highly accurate categorization
    const professionalTerms = [
      // Tech & Software
      { category: 'tech_tutorials', patterns: [
        'software engineer', 'developer', 'programmer', 'coder', 'architect', 'devops',
        'full stack', 'frontend', 'backend', 'mobile developer', 'web developer',
        'data scientist', 'machine learning engineer', 'ai researcher', 'cybersecurity',
        'system administrator', 'database administrator', 'cloud engineer'
      ]},
      
      // Medical & Health
      { category: 'health_medical', patterns: [
        'doctor', 'physician', 'nurse', 'surgeon', 'dentist', 'veterinarian', 'therapist',
        'psychologist', 'psychiatrist', 'pharmacist', 'medical student', 'med school',
        'paramedic', 'physical therapist', 'nutritionist', 'dietitian'
      ]},
      
      // Legal & Finance
      { category: 'business', patterns: [
        'lawyer', 'attorney', 'legal counsel', 'paralegal', 'judge', 'law student',
        'financial advisor', 'accountant', 'cpa', 'investment banker', 'actuary',
        'real estate agent', 'broker', 'consultant', 'analyst'
      ]},
      
      // Education
      { category: 'educational', patterns: [
        'teacher', 'professor', 'educator', 'tutor', 'instructor', 'lecturer',
        'principal', 'dean', 'academic', 'researcher', 'phd student', 'graduate student',
        'librarian', 'school counselor'
      ]},
      
      // Creative & Media
      { category: 'entertainment', patterns: [
        'filmmaker', 'director', 'producer', 'cinematographer', 'editor', 'screenwriter',
        'photographer', 'graphic designer', 'animator', 'illustrator', 'artist',
        'musician', 'composer', 'sound engineer', 'voice actor', 'actor'
      ]},
      
      // Culinary
      { category: 'cooking', patterns: [
        'chef', 'sous chef', 'pastry chef', 'baker', 'culinary student', 'sommelier',
        'food critic', 'restaurateur', 'caterer', 'food scientist', 'nutritionist'
      ]},
      
      // Trades & Crafts
      { category: 'home_improvement', patterns: [
        'electrician', 'plumber', 'carpenter', 'contractor', 'handyman', 'mechanic',
        'welder', 'mason', 'roofer', 'hvac technician', 'locksmith', 'landscaper'
      ]},
      
      // Sports & Fitness
      { category: 'sports', patterns: [
        'personal trainer', 'fitness coach', 'yoga instructor', 'pilates instructor',
        'athletic trainer', 'sports medicine', 'kinesiologist', 'strength coach',
        'nutritionist', 'former athlete', 'professional athlete'
      ]},
      
      // Science & Research
      { category: 'science', patterns: [
        'scientist', 'researcher', 'biologist', 'chemist', 'physicist', 'engineer',
        'environmental scientist', 'geologist', 'astronomer', 'botanist', 'zoologist',
        'laboratory technician', 'research assistant'
      ]}
    ];
    
    for (const category of professionalTerms) {
      for (const pattern of category.patterns) {
        if (text.includes(pattern)) {
          console.log(`FolderTube: Professional term detected: "${pattern}" -> ${category.category}`);
          return category.category;
        }
      }
    }
    
    return null;
  }

  private createFocusedCategories(channels: ChannelMetadata[]): Map<string, string[]> {
    const focusedCategories = new Map<string, string[]>();
    
    // Only create categories if we have meaningful groupings
    const groups = new Map<string, ChannelMetadata[]>();
    
    // Group by meaningful patterns (require at least 3 channels per group)
    for (const channel of channels) {
      const name = channel.name.toLowerCase();
      let grouped = false;
      
      // Language-based grouping
      const languages = [
        { key: 'international', patterns: ['español', 'français', 'deutsch', 'русский', 'japanese', '日本', 'korean', '한국'], name: 'Global Voices 🌍' },
        { key: 'creators', patterns: ['official', 'studios', 'media', 'production', 'entertainment'], name: 'Creators Hub 🎬' },
      ];
      
      for (const lang of languages) {
        if (lang.patterns.some(p => name.includes(p))) {
          if (!groups.has(lang.key)) groups.set(lang.key, []);
          groups.get(lang.key)!.push(channel);
          grouped = true;
          break;
        }
      }
      
      // If still not grouped, put into "Mixed Content"
      if (!grouped) {
        if (!groups.has('mixed')) groups.set('mixed', []);
        groups.get('mixed')!.push(channel);
      }
    }
    
    // Keep groups with 3+ channels, and put remaining channels into mixed category
    const remainingChannels: ChannelMetadata[] = [];
    
    for (const [key, channelList] of groups) {
      if (channelList.length >= 3) {
        focusedCategories.set(key, channelList.map(c => c.id));
      } else {
        // Collect channels from small groups
        remainingChannels.push(...channelList);
      }
    }
    
    // Ensure no channels are lost by putting remaining ones in mixed category
    if (remainingChannels.length > 0) {
      focusedCategories.set('mixed_content', remainingChannels.map(c => c.id));
    }
    
    return focusedCategories;
  }

  getCategories(): Category[] {
    return this.categories;
  }

  getCategoryById(id: string): Category | undefined {
    // First check standard categories
    const standardCategory = this.categories.find(cat => cat.id === id);
    if (standardCategory) return standardCategory;
    
    // Handle focused smart categories
    const smartCategoryNames = {
      'international': 'Global Voices 🌍',
      'creators': 'Creators Hub 🎬',
      'mixed': 'Mixed Content 📺',
      'mixed_content': 'Mixed Content 📺',
      'discoveries': 'Discoveries 💫'
    };
    
    if (smartCategoryNames[id as keyof typeof smartCategoryNames]) {
      return { 
        id, 
        name: smartCategoryNames[id as keyof typeof smartCategoryNames], 
        keywords: [], 
        topicIds: [] 
      };
    }
    
    // Handle dynamic content-based categories
    if (id.startsWith('content_')) {
      const word = id.replace('content_', '');
      return {
        id,
        name: `${word.charAt(0).toUpperCase() + word.slice(1)} Content 📝`,
        keywords: [],
        topicIds: []
      };
    }
    
    return undefined;
  }
  
  // Detect series patterns in video titles
  private detectSeriesPatterns(videoTitles: string[]): { isSeriesBased: boolean, seriesType: string | null } {
    if (videoTitles.length < 3) return { isSeriesBased: false, seriesType: null };
    
    const seriesIndicators = {
      episode: /(?:episode|ep\.?|e)\s*\d+/i,
      part: /(?:part|pt\.?)\s*\d+/i,
      numbered: /#\d+|^\d+\./,
      season: /(?:season|s)\s*\d+/i,
      daily: /(?:daily|day)\s*\d+/i,
      weekly: /week\s*\d+/i
    };
    
    let matchCounts: Record<string, number> = {};
    
    for (const title of videoTitles) {
      for (const [type, pattern] of Object.entries(seriesIndicators)) {
        if (pattern.test(title)) {
          matchCounts[type] = (matchCounts[type] || 0) + 1;
        }
      }
    }
    
    // If >50% of videos match a series pattern, it's series-based
    for (const [type, count] of Object.entries(matchCounts)) {
      if (count / videoTitles.length > 0.5) {
        return { isSeriesBased: true, seriesType: type };
      }
    }
    
    return { isSeriesBased: false, seriesType: null };
  }
  
  // Detect video format patterns
  private detectVideoFormat(videoTitles: string[]): string | null {
    const formatPatterns = {
      tutorial: { 
        keywords: ['how to', 'tutorial', 'guide', 'diy', 'step by step', 'learn'],
        category: 'education'
      },
      review: {
        keywords: ['review', 'unboxing', 'first impressions', 'hands on', 'tested', 'comparison'],
        category: 'tech_reviews'
      },
      gameplay: {
        keywords: ['gameplay', 'walkthrough', 'lets play', 'playthrough', 'boss fight', 'episode'],
        category: 'gaming_general'
      },
      vlog: {
        keywords: ['vlog', 'day in my life', 'daily', 'routine', 'morning', 'night'],
        category: 'lifestyle'
      },
      recipe: {
        keywords: ['recipe', 'cooking', 'how to make', 'ingredients', 'meal prep'],
        category: 'cooking'
      },
      news: {
        keywords: ['breaking', 'update', 'news', 'report', 'analysis', 'coverage'],
        category: 'news'
      },
      workout: {
        keywords: ['workout', 'exercise', 'training', 'routine', 'hiit', 'cardio'],
        category: 'fitness'
      }
    };
    
    const formatScores: Record<string, number> = {};
    
    for (const title of videoTitles) {
      const lowerTitle = title.toLowerCase();
      
      for (const [format, config] of Object.entries(formatPatterns)) {
        for (const keyword of config.keywords) {
          if (lowerTitle.includes(keyword)) {
            formatScores[format] = (formatScores[format] || 0) + 1;
          }
        }
      }
    }
    
    // Find dominant format
    let bestFormat = null;
    let bestScore = 0;
    
    for (const [format, score] of Object.entries(formatScores)) {
      const percentage = score / videoTitles.length;
      if (percentage > 0.3 && score > bestScore) { // At least 30% of videos
        bestScore = score;
        bestFormat = format;
      }
    }
    
    return bestFormat ? formatPatterns[bestFormat as keyof typeof formatPatterns].category : null;
  }
}

// Export singleton instance
export const aiCategorizer = new AICategorizer();