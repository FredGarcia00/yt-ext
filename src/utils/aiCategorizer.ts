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

// Enhanced category definitions for sophisticated channel detection
const CATEGORIES: Category[] = [
  // Gaming categories - REQUIRE gaming context
  {id: 'gaming_livestream', name: 'Gaming Livestreams 🎮', keywords: ['gameplay', 'playthrough', 'lets play', 'gaming stream', 'twitch gaming'], topicIds: ['/m/0bzvm2'], icon: '🎮'},
  {id: 'gaming_reviews', name: 'Gaming Reviews 🎯', keywords: ['game review', 'gameplay review', 'video game', 'gaming tips', 'game guide'], topicIds: ['/m/0bzvm2'], icon: '🎯'},
  {id: 'gaming_esports', name: 'Esports & Competitive 🏆', keywords: ['esports', 'tournament', 'competitive gaming', 'pro gaming', 'ranked match'], topicIds: ['/m/0bzvm2'], icon: '🏆'},
  
  // Entertainment categories
  {id: 'podcasts', name: 'Podcasts & Talk Shows 🎙️', keywords: ['podcast', 'episode', 'interview', 'discussion', 'talk'], topicIds: ['/m/01k8wb'], icon: '🎙️'},
  {id: 'horror_paranormal', name: 'Horror & Paranormal 👻', keywords: ['horror', 'scary', 'ghost', 'paranormal', 'haunted', 'creepy'], topicIds: ['/m/03npn'], icon: '👻'},
  {id: 'true_crime', name: 'True Crime 🔍', keywords: ['crime', 'murder', 'investigation', 'detective', 'case'], topicIds: ['/m/02jjt'], icon: '🔍'},
  {id: 'comedy_standup', name: 'Comedy & Stand-up 😂', keywords: ['comedy', 'funny', 'humor', 'standup', 'sketch'], topicIds: ['/m/02jjt'], icon: '😂'},
  {id: 'reaction_commentary', name: 'Reactions & Commentary 💬', keywords: ['reaction', 'reacts', 'commentary', 'response'], topicIds: ['/m/02jjt'], icon: '💬'},
  
  // Music categories
  {id: 'music_production', name: 'Music Production 🎹', keywords: ['producer', 'beat', 'production', 'studio', 'mixing'], topicIds: ['/m/04rlf'], icon: '🎹'},
  {id: 'music_covers', name: 'Music Covers 🎸', keywords: ['cover', 'acoustic', 'remix', 'version'], topicIds: ['/m/04rlf'], icon: '🎸'},
  {id: 'music_official', name: 'Official Artists 🎵', keywords: ['official', 'vevo', 'records', 'label'], topicIds: ['/m/04rlf'], icon: '🎵'},
  
  // Educational categories
  {id: 'science_tech', name: 'Science & Technology 🔬', keywords: ['science', 'experiment', 'research', 'discovery'], topicIds: ['/m/01k8wb'], icon: '🔬'},
  {id: 'tech_reviews', name: 'Tech Reviews & Unboxing 📦', keywords: ['unboxing', 'review', 'tech', 'gadget', 'device'], topicIds: ['/m/07c1v'], icon: '📦'},
  {id: 'programming', name: 'Programming & Coding 💻', keywords: ['coding', 'programming', 'developer', 'software', 'code'], topicIds: ['/m/01k8wb'], icon: '💻'},
  {id: 'tutorials', name: 'Tutorials & How-To 📚', keywords: ['tutorial', 'how to', 'guide', 'learn', 'diy'], topicIds: ['/m/01k8wb'], icon: '📚'},
  {id: 'documentary', name: 'Documentaries 🎬', keywords: ['documentary', 'history', 'story', 'biography'], topicIds: ['/m/01k8wb'], icon: '🎬'},
  
  // Lifestyle categories
  {id: 'cooking_recipes', name: 'Cooking & Recipes 🍳', keywords: ['cooking', 'recipe', 'chef', 'food', 'kitchen'], topicIds: ['/m/02wbm'], icon: '🍳'},
  {id: 'baking', name: 'Baking & Desserts 🧁', keywords: ['baking', 'cake', 'dessert', 'pastry', 'cookies'], topicIds: ['/m/02wbm'], icon: '🧁'},
  {id: 'fitness_workouts', name: 'Fitness & Workouts 💪', keywords: ['workout', 'fitness', 'gym', 'exercise', 'training'], topicIds: ['/m/0kt51'], icon: '💪'},
  {id: 'yoga_wellness', name: 'Yoga & Wellness 🧘', keywords: ['yoga', 'meditation', 'wellness', 'mindfulness', 'pilates'], topicIds: ['/m/0kt51'], icon: '🧘'},
  {id: 'beauty_fashion', name: 'Beauty & Fashion 💄', keywords: ['makeup', 'beauty', 'fashion', 'style', 'skincare'], topicIds: ['/m/02jjt'], icon: '💄'},
  {id: 'travel_adventure', name: 'Travel & Adventure ✈️', keywords: ['travel', 'adventure', 'explore', 'destination', 'trip'], topicIds: ['/m/02jjt'], icon: '✈️'},
  {id: 'daily_vlogs', name: 'Daily Vlogs 📹', keywords: ['vlog', 'daily', 'life', 'routine', 'day'], topicIds: ['/m/02jjt'], icon: '📹'},
  
  // Specialized categories
  {id: 'automotive_reviews', name: 'Car Reviews 🚗', keywords: ['car review', 'test drive', 'automotive'], topicIds: ['/m/0k4j'], icon: '🚗'},
  {id: 'automotive_repair', name: 'Car Repair & Mods 🔧', keywords: ['repair', 'mechanic', 'modification', 'restore'], topicIds: ['/m/0k4j'], icon: '🔧'},
  {id: 'home_improvement', name: 'Home Improvement & DIY 🔨', keywords: ['renovation', 'diy', 'home improvement', 'construction'], topicIds: ['/m/02jjt'], icon: '🔨'},
  {id: 'gardening', name: 'Gardening & Plants 🌱', keywords: ['garden', 'plant', 'grow', 'flower', 'vegetable'], topicIds: ['/m/02jjt'], icon: '🌱'},
  {id: 'pets_animals', name: 'Pets & Animals 🐾', keywords: ['pet', 'dog', 'cat', 'animal', 'rescue'], topicIds: ['/m/068hy'], icon: '🐾'},
  {id: 'asmr', name: 'ASMR & Relaxation 🎧', keywords: ['asmr', 'relax', 'sleep', 'calm', 'whisper'], topicIds: ['/m/02jjt'], icon: '🎧'},
  {id: 'books_literature', name: 'Books & Literature 📖', keywords: ['book', 'reading', 'literature', 'author', 'review'], topicIds: ['/m/01k8wb'], icon: '📖'},
  
  // Professional categories
  {id: 'business_finance', name: 'Business & Finance 💼', keywords: ['business', 'finance', 'investing', 'stock', 'crypto'], topicIds: ['/m/09s1f'], icon: '💼'},
  {id: 'real_estate', name: 'Real Estate 🏡', keywords: ['real estate', 'property', 'house', 'investment'], topicIds: ['/m/09s1f'], icon: '🏡'},
  {id: 'marketing', name: 'Marketing & Growth 📈', keywords: ['marketing', 'seo', 'advertising', 'growth'], topicIds: ['/m/09s1f'], icon: '📈'},
  
  // News & Information
  {id: 'news_politics', name: 'News & Politics 📰', keywords: ['news', 'politics', 'current', 'report', 'analysis'], topicIds: ['/m/05qt0'], icon: '📰'},
  {id: 'sports', name: 'Sports & Athletics ⚽', keywords: ['sports', 'football', 'basketball', 'soccer', 'athlete'], topicIds: ['/m/06ntj'], icon: '⚽'},
  
  // Kids & Family
  {id: 'kids_content', name: 'Kids & Family 👶', keywords: ['kids', 'children', 'family', 'toy', 'cartoon'], topicIds: ['/m/01k8wb'], icon: '👶'},
  
  // NEW UNIVERSAL CATEGORIES
  {id: 'combat_sports', name: 'Combat Sports & MMA 🥊', keywords: ['ufc', 'mma', 'boxing', 'wrestling', 'fight', 'fighter', 'knockout', 'submission', 'martial arts'], topicIds: ['/m/06ntj'], icon: '🥊'},
  {id: 'design_creative', name: 'Design & Creative Arts 🎨', keywords: ['design', 'photoshop', 'illustrator', 'graphic design', 'art', 'drawing', 'creative', 'animation', '3d'], topicIds: ['/m/02jjt'], icon: '🎨'},
  {id: 'crypto_trading', name: 'Crypto & Trading 📊', keywords: ['bitcoin', 'ethereum', 'cryptocurrency', 'trading', 'forex', 'stocks', 'day trading', 'technical analysis'], topicIds: ['/m/09s1f'], icon: '📊'},
  {id: 'health_medical', name: 'Health & Medical 🏥', keywords: ['health', 'medical', 'doctor', 'medicine', 'disease', 'treatment', 'hospital', 'nursing'], topicIds: ['/m/01k8wb'], icon: '🏥'},
  {id: 'education_learning', name: 'Education & Learning 🎓', keywords: ['education', 'learning', 'school', 'university', 'course', 'lecture', 'study', 'exam'], topicIds: ['/m/01k8wb'], icon: '🎓'},
  {id: 'religion_spirituality', name: 'Religion & Spirituality 🙏', keywords: ['religion', 'spiritual', 'church', 'prayer', 'faith', 'god', 'bible', 'worship'], topicIds: ['/m/06bvp'], icon: '🙏'},
  {id: 'movie_tv_reviews', name: 'Movies & TV Reviews 🎭', keywords: ['movie review', 'film review', 'tv show', 'series review', 'netflix', 'cinema', 'movie reaction'], topicIds: ['/m/02jjt'], icon: '🎭'},
  {id: 'photography_film', name: 'Photography & Filmmaking 📷', keywords: ['photography', 'camera', 'lens', 'filmmaking', 'cinematography', 'video production', 'editing'], topicIds: ['/m/05wkw'], icon: '📷'},
  {id: 'language_learning', name: 'Language Learning 🗣️', keywords: ['language', 'spanish', 'french', 'japanese', 'learn language', 'vocabulary', 'grammar', 'pronunciation'], topicIds: ['/m/01k8wb'], icon: '🗣️'},
  {id: 'history_culture', name: 'History & Culture 🏛️', keywords: ['history', 'historical', 'ancient', 'civilization', 'culture', 'heritage', 'archaeology', 'museum'], topicIds: ['/m/01k8wb'], icon: '🏛️'},
  {id: 'crafts_diy', name: 'Crafts & DIY Projects 🎨', keywords: ['crafts', 'craft', 'handmade', 'sewing', 'knitting', 'woodworking', 'diy project'], topicIds: ['/m/02jjt'], icon: '✂️'},
  
  // International - handled separately in detection logic
  {id: 'international', name: 'International Content 🌍', keywords: [], topicIds: [], icon: '🌍'}
];

export class AICategorizer {
  private categories: Category[];
  private contextualPatterns!: Map<string, string[]>;
  private channelNamePatterns!: Map<string, string>;

  constructor(categories: Category[] = CATEGORIES) {
    this.categories = categories;
    this.initializePatterns();
  }

  private initializePatterns() {
    // Enhanced contextual patterns for sophisticated category detection
    this.contextualPatterns = new Map([
      // Horror & Paranormal (Ed & Lorraine Warren type channels)
      ['horror_paranormal', ['ghost', 'haunted', 'supernatural', 'paranormal', 'investigation', 'spirit', 'demon', 'entity', 'evp', 'ouija', 'séance', 'possession', 'warren', 'scary', 'horror', 'creepy', 'spooky', 'poltergeist', 'exorcism', 'curse', 'witch', 'vampire', 'zombie', 'unexplained', 'mystery']],
      
      // Podcast patterns
      ['podcasts', ['podcast', 'episode', 'ep.', 'episode #', 'ep #', 'season', 's1', 's2', 'interview', 'guest', 'discussion', 'talk show', 'conversation', 'speaks with', 'talks about', 'deep dive', 'breakdown']],
      
      // True Crime
      ['true_crime', ['true crime', 'murder', 'killer', 'serial killer', 'investigation', 'case', 'unsolved', 'mystery', 'detective', 'forensic', 'evidence', 'suspect', 'victim', 'crime scene', 'cold case', 'disappeared']],
      
      // Gaming subcategories - MUST have gaming context
      ['gaming_livestream', ['gameplay stream', 'gaming live', 'twitch plays', 'game streaming', 'playing live', 'gaming chat']],
      ['gaming_reviews', ['game review', 'gameplay footage', 'walkthrough', 'lets play', 'playthrough', 'game guide', 'gaming tips', 'video game']],
      ['gaming_esports', ['esports', 'gaming tournament', 'competitive gaming', 'pro gamer', 'ranked gameplay', 'gaming championship', 'esports league']],
      
      // Tech subcategories
      ['tech_reviews', ['unboxing', 'review', 'specs', 'benchmark', 'performance', 'camera test', 'battery life', 'display', 'comparison', 'vs', 'worth buying', 'hands on', 'first impressions']],
      ['programming', ['code', 'coding', 'programming', 'developer', 'javascript', 'python', 'react', 'tutorial', 'algorithm', 'software', 'github', 'api', 'framework', 'debug']],
      
      // Documentary & Educational
      ['documentary', ['documentary', 'history', 'biography', 'story of', 'explained', 'the rise of', 'the fall of', 'behind the scenes', 'untold story', 'timeline']],
      ['science_tech', ['science', 'experiment', 'research', 'discovery', 'physics', 'chemistry', 'biology', 'space', 'nasa', 'quantum', 'theory']],
      
      // Lifestyle subcategories
      ['cooking_recipes', ['recipe', 'cooking', 'ingredients', 'chef', 'kitchen', 'meal', 'dish', 'sauce', 'seasoning', 'gordon ramsay', 'food network']],
      ['baking', ['baking', 'flour', 'sugar', 'oven', 'bake', 'cake', 'cookies', 'bread', 'yeast', 'frosting', 'pastry', 'dessert', 'sweet']],
      ['fitness_workouts', ['workout', 'reps', 'sets', 'muscle', 'strength', 'cardio', 'gains', 'protein', 'gym', 'exercise', 'training', 'bodybuilding']],
      ['yoga_wellness', ['yoga', 'meditation', 'mindfulness', 'wellness', 'pilates', 'breathing', 'relaxation', 'chakra', 'spiritual', 'healing', 'balance']],
      ['beauty_fashion', ['makeup', 'beauty', 'skincare', 'fashion', 'style', 'outfit', 'haul', 'grwm', 'get ready', 'look', 'trend', 'cosmetics']],
      
      // Automotive subcategories
      ['automotive_reviews', ['car review', 'test drive', 'acceleration', 'handling', 'interior', 'features', 'comparison', 'vs', 'worth buying']],
      ['automotive_repair', ['repair', 'fix', 'mechanic', 'engine', 'transmission', 'brake', 'oil change', 'diagnostic', 'troubleshoot', 'restoration']],
      ['car_detailing', ['detail', 'detailing', 'wash', 'wax', 'polish', 'ceramic', 'paint correction', 'interior cleaning', 'foam', 'microfiber']],
      
      // Home & Garden
      ['home_improvement', ['renovation', 'remodel', 'install', 'build', 'construction', 'drywall', 'tile', 'plumbing', 'electrical', 'flooring', 'diy project']],
      ['gardening', ['garden', 'plant', 'grow', 'harvest', 'vegetable', 'flower', 'landscaping', 'lawn care', 'composting', 'organic', 'greenhouse']],
      
      // Entertainment subcategories
      ['reaction_commentary', ['reaction', 'reacts to', 'watching', 'commentary', 'response', 'first time', 'never seen', 'reacting']],
      ['comedy_standup', ['comedy', 'standup', 'stand up', 'comedian', 'funny', 'jokes', 'humor', 'sketch', 'improv', 'roast']],
      ['music_production', ['beat', 'producing', 'fl studio', 'ableton', 'logic pro', 'mixing', 'mastering', 'studio', 'producer', 'beatmaker']],
      ['music_covers', ['cover', 'acoustic', 'remix', 'version', 'rendition', 'tribute', 'mashup', 'medley']],
      
      // Professional content
      ['business_finance', ['business', 'entrepreneur', 'startup', 'investing', 'stock', 'crypto', 'bitcoin', 'trading', 'market', 'analysis', 'portfolio']],
      ['real_estate', ['real estate', 'property', 'house tour', 'apartment', 'luxury home', 'investment property', 'rental', 'flip', 'mortgage']],
      ['marketing', ['marketing', 'seo', 'social media', 'advertising', 'campaign', 'brand', 'strategy', 'growth', 'conversion', 'analytics']],
      
      // Specialized content
      ['asmr', ['asmr', 'whisper', 'tingles', 'relaxing', 'sleep', 'triggers', 'tapping', 'brushing', 'soft spoken', 'roleplay']],
      ['books_literature', ['book review', 'reading', 'booktuber', 'tbr', 'book haul', 'author', 'novel', 'literature', 'bookish', 'currently reading']],
      ['pets_animals', ['pet', 'dog', 'cat', 'puppy', 'kitten', 'animal', 'rescue', 'adoption', 'training', 'vet', 'breed']],
      ['travel_adventure', ['travel', 'trip', 'vacation', 'explore', 'destination', 'hotel', 'flight', 'backpacking', 'adventure', 'tourism']],
      ['daily_vlogs', ['vlog', 'day in my life', 'daily vlog', 'morning routine', 'night routine', 'get ready with me', 'grwm', 'day in the life']],
      
      // Kids content
      ['kids_content', ['kids', 'children', 'toy', 'play', 'nursery rhyme', 'cartoon', 'animation', 'educational', 'learning', 'abc', 'counting']],
      
      // News & Sports
      ['news_politics', ['news', 'breaking', 'politics', 'election', 'president', 'congress', 'policy', 'debate', 'analysis', 'report', 'journalist']],
      ['sports', ['sports', 'game', 'match', 'player', 'team', 'score', 'highlights', 'championship', 'league', 'season', 'draft', 'trade']],
      
      // NEW CATEGORY PATTERNS
      ['combat_sports', ['ufc', 'mma', 'boxing', 'wrestling', 'fight', 'knockout', 'submission', 'octagon', 'ring', 'fighter', 'martial arts', 'bellator', 'one championship', 'boxing match', 'sparring']],
      ['design_creative', ['design', 'photoshop', 'illustrator', 'graphic design', 'ui design', 'ux design', 'adobe', 'creative cloud', 'art', 'drawing', 'digital art', 'animation', '3d modeling', 'blender', 'figma']],
      ['crypto_trading', ['bitcoin', 'ethereum', 'cryptocurrency', 'crypto', 'trading', 'forex', 'day trading', 'technical analysis', 'chart analysis', 'altcoin', 'defi', 'nft', 'blockchain', 'trading strategy']],
      ['health_medical', ['health', 'medical', 'doctor', 'medicine', 'hospital', 'treatment', 'symptoms', 'diagnosis', 'surgery', 'healthcare', 'wellness tips', 'medical advice', 'nutrition']],
      ['movie_tv_reviews', ['movie review', 'film review', 'tv show review', 'series review', 'netflix', 'movie reaction', 'film analysis', 'cinema', 'movie breakdown', 'ending explained', 'trailer reaction']],
      ['photography_film', ['photography', 'camera', 'lens', 'photo', 'filmmaking', 'cinematography', 'video production', 'camera gear', 'photo editing', 'lightroom', 'premiere pro', 'davinci resolve']],
      ['language_learning', ['learn spanish', 'learn french', 'learn japanese', 'language learning', 'vocabulary', 'grammar lesson', 'pronunciation', 'language tips', 'polyglot', 'duolingo']],
      ['history_culture', ['history', 'historical', 'ancient', 'civilization', 'world war', 'historical documentary', 'archaeology', 'museum', 'cultural', 'heritage', 'historical facts']]
    ]);

    // Enhanced channel name patterns for sophisticated detection
    this.channelNamePatterns = new Map([
      // Horror & Paranormal (Ed & Lorraine Warren and similar)
      ['ed and lorraine warren', 'horror_paranormal'], ['warren', 'horror_paranormal'], 
      ['ghost adventures', 'horror_paranormal'], ['paranormal', 'horror_paranormal'],
      ['supernatural', 'horror_paranormal'], ['haunted', 'horror_paranormal'], 
      ['ghost hunt', 'horror_paranormal'], ['zak bagans', 'horror_paranormal'], 
      ['sam and colby', 'horror_paranormal'], ['twin paranormal', 'horror_paranormal'],
      ['nukes top', 'horror_paranormal'], ['slapped ham', 'horror_paranormal'], 
      ['chills', 'horror_paranormal'], ['mr nightmare', 'horror_paranormal'],
      ['corpse husband', 'horror_paranormal'], ['nexpo', 'horror_paranormal'],
      ['scary mysteries', 'horror_paranormal'], ['horror stories', 'horror_paranormal'],
      
      // Combat sports channels
      ['ufc', 'combat_sports'], ['mma', 'combat_sports'], ['boxing', 'combat_sports'],
      ['one championship', 'combat_sports'], ['bellator', 'combat_sports'], ['fight', 'combat_sports'],
      ['knockout', 'combat_sports'], ['wrestling', 'combat_sports'], ['wwe', 'combat_sports'],
      
      // Design & Creative channels
      ['adobe', 'design_creative'], ['photoshop', 'design_creative'], ['illustrator', 'design_creative'],
      ['design', 'design_creative'], ['creative', 'design_creative'], ['art', 'design_creative'],
      ['blender', 'design_creative'], ['figma', 'design_creative'], ['sketch', 'design_creative'],
      
      // Podcast channels
      ['joe rogan', 'podcasts'], ['podcast', 'podcasts'], ['show', 'podcasts'],
      ['h3 podcast', 'podcasts'], ['impaulsive', 'podcasts'], ['flagrant', 'podcasts'],
      ['lex fridman', 'podcasts'], ['tim dillon', 'podcasts'], ['your mom house', 'podcasts'],
      ['tigerbelly', 'podcasts'], ['bad friends', 'podcasts'], ['trash taste', 'podcasts'],
      
      // True Crime
      ['bailey sarian', 'true_crime'], ['kendall rae', 'true_crime'], 
      ['eleanor neale', 'true_crime'], ['true crime', 'true_crime'],
      ['jcs', 'true_crime'], ['that chapter', 'true_crime'],
      ['coffeehouse crime', 'true_crime'], ['explore with us', 'true_crime'],
      
      // Gaming Livestreamers
      ['xqc', 'gaming_livestream'], ['pokimane', 'gaming_livestream'], ['ninja', 'gaming_livestream'],
      ['shroud', 'gaming_livestream'], ['summit1g', 'gaming_livestream'], ['timthetatman', 'gaming_livestream'],
      ['nickmercs', 'gaming_livestream'], ['sykkuno', 'gaming_livestream'], ['valkyrae', 'gaming_livestream'],
      ['twitch', 'gaming_livestream'], ['stream', 'gaming_livestream'], 
      
      // Gaming Review & Content Creators
      ['pewdiepie', 'gaming_reviews'], ['markiplier', 'gaming_reviews'], ['jacksepticeye', 'gaming_reviews'],
      ['gameranx', 'gaming_reviews'], ['ign', 'gaming_reviews'], ['gamespot', 'gaming_reviews'],
      ['dream', 'gaming_reviews'], ['technoblade', 'gaming_reviews'], ['georgenotfound', 'gaming_reviews'],
      ['lets play', 'gaming_reviews'], ['gameplay', 'gaming_reviews'], ['playthrough', 'gaming_reviews'],
      
      // Esports & Competitive Gaming
      ['faze', 'gaming_esports'], ['optic', 'gaming_esports'], ['tsm', 'gaming_esports'],
      ['cloud9', 'gaming_esports'], ['g2', 'gaming_esports'], ['fnatic', 'gaming_esports'],
      ['valorant', 'gaming_esports'], ['csgo', 'gaming_esports'], ['league of legends', 'gaming_esports'],
      
      // Tech Reviewers & Channels
      ['mkbhd', 'tech_reviews'], ['marques brownlee', 'tech_reviews'], ['unbox therapy', 'tech_reviews'],
      ['linus tech', 'tech_reviews'], ['dave2d', 'tech_reviews'], ['mrwhosetheboss', 'tech_reviews'],
      ['austin evans', 'tech_reviews'], ['jonathan morrison', 'tech_reviews'], ['iJustine', 'tech_reviews'],
      ['everythingapplepro', 'tech_reviews'], ['tech', 'tech_reviews'], ['unbox', 'tech_reviews'],
      ['review', 'tech_reviews'], ['geek', 'tech_reviews'], ['gadget', 'tech_reviews'],
      
      // Cooking & Recipe Channels
      ['gordon ramsay', 'cooking_recipes'], ['jamie oliver', 'cooking_recipes'], 
      ['binging with babish', 'cooking_recipes'], ['bon appetit', 'cooking_recipes'], 
      ['tasty', 'cooking_recipes'], ['epicurious', 'cooking_recipes'],
      ['america test kitchen', 'cooking_recipes'], ['food network', 'cooking_recipes'], 
      ['kitchen nightmare', 'cooking_recipes'], ['joshua weissman', 'cooking_recipes'], 
      ['matty matheson', 'cooking_recipes'], ['sam the cooking guy', 'cooking_recipes'],
      ['kenji', 'cooking_recipes'], ['adam ragusea', 'cooking_recipes'],
      ['kitchen', 'cooking_recipes'], ['recipe', 'cooking_recipes'], 
      ['chef', 'cooking_recipes'], ['cook', 'cooking_recipes'],
      
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
      
      // Fitness & Workout Channels
      ['athlean', 'fitness_workouts'], ['jeff nippard', 'fitness_workouts'], 
      ['chris heria', 'fitness_workouts'], ['buff dudes', 'fitness_workouts'],
      ['jeremy ethier', 'fitness_workouts'], ['scott herman', 'fitness_workouts'],
      ['pamela reif', 'fitness_workouts'], ['chloe ting', 'fitness_workouts'],
      ['fitness blender', 'fitness_workouts'], ['hasfit', 'fitness_workouts'],
      
      // Yoga & Wellness
      ['yoga with adriene', 'yoga_wellness'], ['yoga with kassandra', 'yoga_wellness'],
      ['breathe and flow', 'yoga_wellness'], ['sarah beth yoga', 'yoga_wellness'],
      ['boho beautiful', 'yoga_wellness'], ['mady morrison', 'yoga_wellness'],
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
      ['yes theory', 'travel_adventure'], ['lost leblanc', 'travel_adventure'], 
      ['kara and nate', 'travel_adventure'], ['drew binsky', 'travel_adventure'], 
      ['vagabrothers', 'travel_adventure'], ['wolters world', 'travel_adventure'],
      ['travel', 'travel_adventure'], ['adventure', 'travel_adventure'],
      
      // Business & Finance
      ['gary vee', 'business_finance'], ['alex hormozi', 'business_finance'], 
      ['patrick bet david', 'business_finance'], ['valuetainment', 'business_finance'],
      ['graham stephan', 'business_finance'], ['meet kevin', 'business_finance'], 
      ['andrei jikh', 'business_finance'], ['entrepreneur', 'business_finance'],
      
      // Real Estate
      ['graham stephan', 'real_estate'], ['meet kevin', 'real_estate'],
      ['bigger pockets', 'real_estate'], ['property', 'real_estate'],
      
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
      
      // Daily Vlogs
      ['david dobrik', 'daily_vlogs'], ['emma chamberlain', 'daily_vlogs'], 
      ['dolan twins', 'daily_vlogs'], ['vlog squad', 'daily_vlogs'],
      ['vlog', 'daily_vlogs'], ['daily', 'daily_vlogs'], ['routine', 'daily_vlogs'],
      
      // Beauty & Fashion
      ['james charles', 'beauty_fashion'], ['jeffree star', 'beauty_fashion'],
      ['nikkietutorials', 'beauty_fashion'], ['tati', 'beauty_fashion'],
      ['safiya nygaard', 'beauty_fashion'], ['simply nailogical', 'beauty_fashion'],
      
      // ASMR
      ['gibi asmr', 'asmr'], ['asmr darling', 'asmr'], ['gentle whispering', 'asmr'],
      ['asmr zeitgeist', 'asmr'], ['asmr', 'asmr'], ['tingles', 'asmr'],
      
      // Kids Content
      ['ryan toys', 'kids_content'], ['cocomelon', 'kids_content'], ['pinkfong', 'kids_content'],
      ['blippi', 'kids_content'], ['peppa pig', 'kids_content'], ['kids', 'kids_content'],
      
      // Documentary Channels
      ['vice', 'documentary'], ['vox', 'documentary'], ['business insider', 'documentary'],
      ['great big story', 'documentary'], ['documentary', 'documentary']
    ]);
  }

  // Enhanced categorization with video title analysis and contextual intelligence
  categorizeChannelWithVideoTitles(metadata: ChannelMetadata, videoTitles: string[] = []): { categoryId: string | null, confidence: number } {
    const scores = new Map<string, number>();
    const channelName = metadata.name.toLowerCase();
    const description = (metadata.description || '').toLowerCase();
    const allVideoText = videoTitles.join(' ').toLowerCase();
    
    // INTERNATIONAL CONTENT DETECTION - Check first for non-English content
    if (this.isInternationalContent(metadata.name, description, videoTitles)) {
      return { categoryId: 'international', confidence: 95 };
    }
    
    // Series and format detection for enhanced accuracy
    const seriesPatterns = this.detectSeriesPatterns(videoTitles);
    const formatType = this.detectVideoFormat(videoTitles);
    
    // Apply format-based categorization boost
    if (formatType) {
      const currentScore = scores.get(formatType) || 0;
      scores.set(formatType, currentScore + 12); // Strong signal from video format
    }
    
    // Apply series-based boost for appropriate categories
    if (seriesPatterns.isSeriesBased) {
      if (seriesPatterns.seriesType === 'podcast' || seriesPatterns.seriesType === 'interview') {
        const podcastScore = scores.get('podcasts') || 0;
        scores.set('podcasts', podcastScore + 12); // Strong signal for podcast content
      } else if (seriesPatterns.seriesType === 'episode') {
        // Could be gaming or other episodic content
        const gamingScore = scores.get('gaming_reviews') || 0;
        scores.set('gaming_reviews', gamingScore + 8);
      }
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

    // Phase 3: Enhanced keyword matching with compound requirements
    for (const category of this.categories) {
      let traditionalScore = 0;
      let matchedKeywords = 0;
      
      // Special handling for gaming categories - require gaming context
      const isGamingCategory = category.id.startsWith('gaming_');
      if (isGamingCategory) {
        // Check for gaming context first
        const gamingTerms = ['game', 'gaming', 'gameplay', 'gamer', 'video game', 'playthrough', 'lets play', 'xbox', 'playstation', 'nintendo', 'steam', 'pc gaming'];
        let hasGamingContext = false;
        for (const term of gamingTerms) {
          if (channelName.includes(term) || allVideoText.includes(term)) {
            hasGamingContext = true;
            break;
          }
        }
        // Skip this gaming category if no gaming context found
        if (!hasGamingContext) {
          continue;
        }
      }
      
      // Special handling for combat sports - don't mix with gaming
      if (category.id === 'combat_sports') {
        const combatTerms = ['ufc', 'mma', 'boxing', 'fight', 'knockout', 'wrestling', 'wwe', 'martial arts'];
        for (const term of combatTerms) {
          if (channelName.includes(term) || allVideoText.includes(term)) {
            traditionalScore += 10; // Strong boost for combat sports
            break;
          }
        }
      }
      
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
        let keywordMatched = false;
        
        // Check channel name (high weight)
        if (keywordRegex.test(channelName)) {
          traditionalScore += 5;
          keywordMatched = true;
        }
        
        // Check video titles (very high weight for content analysis)
        const videoMatches = allVideoText.match(keywordRegex);
        if (videoMatches) {
          traditionalScore += Math.min(videoMatches.length * 1.5, 6);
          keywordMatched = true;
        }
        
        // Check description (medium weight)
        if (keywordRegex.test(description)) {
          traditionalScore += 2;
          keywordMatched = true;
        }
        
        if (keywordMatched) {
          matchedKeywords++;
        }
      }
      
      // Require at least 2 keyword matches for better accuracy
      if (matchedKeywords < 2 && traditionalScore < 10) {
        traditionalScore = Math.floor(traditionalScore * 0.5); // Reduce score for single matches
      }
      
      if (traditionalScore > 0) {
        const currentScore = scores.get(category.id) || 0;
        scores.set(category.id, currentScore + traditionalScore);
      }
    }

    // Enhanced dominant category selection with confidence scoring
    if (scores.size === 0) {
      return { categoryId: null, confidence: 0 };
    }

    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const [bestCategory, bestScore] = sortedScores[0];
    const [, secondScore] = sortedScores[1] || [null, 0];
    
    // Enhanced confidence calculation based on score and separation
    let confidence = Math.min((bestScore / 8) * 100, 100); // Adjusted for new scoring
    
    // Boost confidence if there's clear separation from second place
    if (secondScore > 0) {
      const separation = (bestScore - secondScore) / bestScore;
      if (separation > 0.5) {
        confidence = Math.min(confidence * 1.2, 100); // 20% boost for clear dominance
      } else if (separation < 0.2) {
        confidence *= 0.8; // Reduce confidence if scores are close
      }
    }
    
    // Special confidence boosts for high-accuracy categories
    const highAccuracyCategories = ['podcasts', 'horror_paranormal', 'tech_reviews', 'international'];
    if (highAccuracyCategories.includes(bestCategory)) {
      confidence = Math.min(confidence * 1.1, 100);
    }
    
    // Only return if confidence is reasonable
    if (confidence < 25) {
      return { categoryId: null, confidence };
    }
    
    return { categoryId: bestCategory, confidence: Math.round(confidence) };
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
    
    // Validation Rule 1: Handle missing channels gracefully
    if (totalCategorized !== allChannels.length) {
      const missingCount = allChannels.length - totalCategorized;
      const missingPercentage = (missingCount / allChannels.length) * 100;
      
      // Find which channels are missing
      const categorizedIds = new Set<string>();
      for (const [_, channelIds] of categorizedChannels) {
        channelIds.forEach(id => categorizedIds.add(id));
      }
      
      const missingChannels = allChannels.filter(c => !categorizedIds.has(c.id));
      
      // Only warn if significant number of channels are missing (more than 20%)
      if (missingPercentage > 20) {
        console.warn(`FolderTube: Significant channel count mismatch. Expected: ${allChannels.length}, Got: ${totalCategorized} (${missingPercentage.toFixed(1)}% missing)`);
        console.warn(`FolderTube: Missing channels:`, missingChannels.map(c => c.name));
      } else {
        console.log(`FolderTube: ${missingCount} channels couldn't be categorized (${missingPercentage.toFixed(1)}% - likely due to API errors)`);
        console.log(`FolderTube: Missing channels:`, missingChannels.map(c => c.name));
      }
      
      // Add missing channels to discoveries to prevent data loss
      if (missingChannels.length > 0) {
        const existingDiscoveries = categorizedChannels.get('discoveries') || [];
        categorizedChannels.set('discoveries', [...existingDiscoveries, ...missingChannels.map(c => c.id)]);
        console.log(`FolderTube: Added ${missingChannels.length} missing channels to discoveries`);
      }
    }
    
    // Validation Rule 2: Ensure minimum categorization quality (at least 70% of channels should be categorized into meaningful categories)
    let meaningfulCategories = 0;
    let channelsInMeaningfulCategories = 0;
    const orphanedChannels: string[] = [];
    
    for (const [categoryId, channelIds] of categorizedChannels) {
      if (channelIds.length >= 1) { // Allow single-channel folders for meaningful categories
        validated.set(categoryId, channelIds);
        
        // Don't count generic fallback categories as "meaningful"
        if (!['discoveries', 'mixed', 'international', 'creators', 'mixed_content'].includes(categoryId)) {
          meaningfulCategories++;
          channelsInMeaningfulCategories += channelIds.length;
        }
      } else {
        // Only orphan truly empty categories
        orphanedChannels.push(...channelIds);
        console.log(`FolderTube: Category "${categoryId}" is empty, moving to discoveries`);
      }
    }
    
    // Add orphaned channels to discoveries to prevent data loss
    if (orphanedChannels.length > 0) {
      const existingDiscoveries = validated.get('discoveries') || [];
      validated.set('discoveries', [...existingDiscoveries, ...orphanedChannels]);
      console.log(`FolderTube: Added ${orphanedChannels.length} orphaned channels to discoveries`);
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
    
    // For remaining channels, try one more aggressive categorization pass
    const remainingChannels: ChannelMetadata[] = [];
    for (let i = 12; i < sortedCategories.length; i++) {
      const [, channelIds] = sortedCategories[i];
      const channelData = channelIds.map(id => _allChannels.find(c => c.id === id)!).filter(Boolean);
      remainingChannels.push(...channelData);
    }
    
    if (remainingChannels.length > 0) {
      // Try ultra-aggressive recategorization for remaining channels
      const ultraCategories = this.ultraAggressiveRecategorization(remainingChannels);
      for (const [categoryId, channelIds] of ultraCategories) {
        if (channelIds.length >= 2) {
          consolidated.set(categoryId, channelIds);
        }
      }
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
    } else if (uncategorized.length > 0) {
      // If we have 1 uncategorized channel, don't lose it - add to discoveries
      console.log(`FolderTube: ${uncategorized.length} channel(s) remaining after aggressive categorization`);
      results.set('discoveries', uncategorized.map(c => c.id));
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
    
    // NO MORE LAZY MIXED CONTENT! Apply ultra-aggressive categorization instead
    console.log(`FolderTube: Applying focused ultra-categorization to ${channels.length} channels (NO MIXED CONTENT!)`);
    
    // Use the ultra-aggressive categorization directly
    const ultraResults = this.ultraAggressiveRecategorization(channels);
    
    // Only keep categories with 2+ channels (no single-channel folders)
    for (const [categoryId, channelIds] of ultraResults) {
      if (channelIds.length >= 2) {
        focusedCategories.set(categoryId, channelIds);
        console.log(`FolderTube: Created focused category "${categoryId}" with ${channelIds.length} channels`);
      }
    }
    
    console.log(`FolderTube: Focused categorization complete. Created ${focusedCategories.size} specific categories (NO mixed content allowed!)`);
    return focusedCategories;
  }

  getCategories(): Category[] {
    return this.categories;
  }

  getCategoryById(id: string): Category | undefined {
    // First check standard categories
    const standardCategory = this.categories.find(cat => cat.id === id);
    if (standardCategory) return standardCategory;
    
    // Handle ultra-specific categories from ultraAggressiveRecategorization
    const ultraCategoryNames = {
      'reaction_content': 'Reactions & Commentary 🎬',
      'shorts_viral': 'Shorts & Viral 📱',
      'interviews_podcasts': 'Interviews & Podcasts 🎙️',
      'asmr_relaxation': 'ASMR & Relaxation 🌙',
      'motivation_selfhelp': 'Motivation & Self Help 💪',
      'history_documentary': 'History & Documentaries 📚',
      'animals_pets': 'Animals & Pets 🐾',
      'kids_family': 'Kids & Family 👨‍👩‍👧‍👦',
      'art_crafts': 'Art & Crafts 🎨',
      'mystery_unsolved': 'Mystery & Unsolved 🔍',
      'product_reviews': 'Product Reviews 📦',
      'life_stories': 'Life Stories & Experiences 📖',
      'challenges_experiments': 'Challenges & Experiments 🧪',
      'language_culture': 'Language & Culture 🌏',
      'restoration_repair': 'Restoration & Repair 🔧',
      'street_interviews': 'Street Interviews & Social 🎤',
      'tips_hacks': 'Tips & Life Hacks 💡',
      'conspiracy_theories': 'Conspiracy & Theories 👁️'
    };
    
    if (ultraCategoryNames[id as keyof typeof ultraCategoryNames]) {
      return { 
        id, 
        name: ultraCategoryNames[id as keyof typeof ultraCategoryNames], 
        keywords: [], 
        topicIds: [] 
      };
    }
    
    // Handle semantic grouping categories
    const semanticCategoryNames = {
      'brands_official': 'Official Brands 🏢',
      'personal_creators': 'Personal Creators 👤',
      'tech_channels': 'Tech Channels 💻',
      'entertainment_channels': 'Entertainment Networks 📺',
      'learning_channels': 'Learning Channels 🎓',
      'international_channels': 'International Channels 🌍',
      'unique_creators': 'Unique Creators ✨'
    };
    
    if (semanticCategoryNames[id as keyof typeof semanticCategoryNames]) {
      return { 
        id, 
        name: semanticCategoryNames[id as keyof typeof semanticCategoryNames], 
        keywords: [], 
        topicIds: [] 
      };
    }
    
    // Handle focused smart categories (legacy support)
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
  
  // Detect series patterns in video titles - enhanced for podcast detection
  private detectSeriesPatterns(videoTitles: string[]): { isSeriesBased: boolean, seriesType: string | null } {
    if (videoTitles.length < 3) return { isSeriesBased: false, seriesType: null };
    
    const seriesIndicators = {
      podcast: /(?:episode|ep\.?|e)\s*\d+|#\d+\s*-|ep\s*\d+/i,
      episode: /(?:episode|ep\.?|e)\s*\d+/i,
      part: /(?:part|pt\.?)\s*\d+/i,
      numbered: /#\d+|^\d+\.|\|\s*\d+/,
      season: /(?:season|s)\s*\d+/i,
      daily: /(?:daily|day)\s*\d+/i,
      weekly: /week\s*\d+/i,
      interview: /(?:with\s+\w+|interview|guest|talks\s+with)/i
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
  
  // Detect video format patterns - enhanced for sophisticated detection
  private detectVideoFormat(videoTitles: string[]): string | null {
    const formatPatterns = {
      podcast: {
        keywords: ['episode', 'ep.', 'ep ', '#', 'interview', 'guest', 'talks', 'podcast', 'discussion'],
        category: 'podcasts'
      },
      tutorial: { 
        keywords: ['how to', 'tutorial', 'guide', 'diy', 'step by step', 'learn', 'explained'],
        category: 'tutorials'
      },
      tech_review: {
        keywords: ['review', 'unboxing', 'first impressions', 'hands on', 'tested', 'comparison', 'vs'],
        category: 'tech_reviews'
      },
      gaming_content: {
        keywords: ['gameplay', 'walkthrough', 'lets play', 'playthrough', 'boss fight', 'stream'],
        category: 'gaming_reviews'
      },
      daily_vlog: {
        keywords: ['vlog', 'day in my life', 'daily', 'routine', 'morning', 'grwm'],
        category: 'daily_vlogs'
      },
      cooking_recipe: {
        keywords: ['recipe', 'cooking', 'how to make', 'ingredients', 'meal prep', 'baking'],
        category: 'cooking_recipes'
      },
      news_content: {
        keywords: ['breaking', 'update', 'news', 'report', 'analysis', 'coverage'],
        category: 'news_politics'
      },
      fitness_content: {
        keywords: ['workout', 'exercise', 'training', 'routine', 'hiit', 'cardio', 'yoga'],
        category: 'fitness_workouts'
      },
      reaction_content: {
        keywords: ['reaction', 'reacts', 'watching', 'first time', 'response'],
        category: 'reaction_commentary'
      },
      horror_content: {
        keywords: ['scary', 'horror', 'ghost', 'haunted', 'investigation', 'paranormal'],
        category: 'horror_paranormal'
      },
      asmr_content: {
        keywords: ['asmr', 'whisper', 'relaxing', 'sleep', 'tingles'],
        category: 'asmr'
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
  
  // Ultra-aggressive recategorization - removes all "mixed content" lazy categorization
  private ultraAggressiveRecategorization(channels: ChannelMetadata[]): Map<string, string[]> {
    const results = new Map<string, string[]>();
    
    console.log(`FolderTube: Ultra-aggressive recategorization for ${channels.length} channels`);
    
    // Define ultra-specific categories for remaining channels
    const ultraCategories = [
      {
        id: 'reaction_content',
        name: 'Reactions & Commentary 🎬',
        patterns: ['react', 'reaction', 'reacting', 'commentary', 'respond', 'response', 'thoughts', 'opinion']
      },
      {
        id: 'shorts_viral',
        name: 'Shorts & Viral 📱', 
        patterns: ['shorts', 'viral', 'trending', 'tiktok', 'quick', 'fast', 'minute', 'compilation', 'clips']
      },
      {
        id: 'interviews_podcasts',
        name: 'Interviews & Podcasts 🎙️',
        patterns: ['interview', 'podcast', 'talk', 'conversation', 'chat', 'discussion', 'guest', 'speaks']
      },
      {
        id: 'asmr_relaxation',
        name: 'ASMR & Relaxation 🌙',
        patterns: ['asmr', 'relax', 'sleep', 'calm', 'peaceful', 'meditation', 'soothing', 'quiet']
      },
      {
        id: 'motivation_selfhelp',
        name: 'Motivation & Self Help 💪',
        patterns: ['motivation', 'inspire', 'success', 'mindset', 'growth', 'self help', 'improve', 'habits', 'goals']
      },
      {
        id: 'history_documentary',
        name: 'History & Documentaries 📚',
        patterns: ['history', 'documentary', 'historical', 'ancient', 'war', 'biography', 'timeline', 'facts']
      },
      {
        id: 'animals_pets',
        name: 'Animals & Pets 🐾',
        patterns: ['animal', 'pet', 'dog', 'cat', 'wildlife', 'zoo', 'rescue', 'cute', 'funny animals']
      },
      {
        id: 'kids_family',
        name: 'Kids & Family 👨‍👩‍👧‍👦',
        patterns: ['kids', 'family', 'children', 'baby', 'parent', 'toy', 'cartoon', 'animation', 'nursery']
      },
      {
        id: 'art_crafts',
        name: 'Art & Crafts 🎨',
        patterns: ['art', 'craft', 'draw', 'paint', 'creative', 'design', 'artist', 'sculpture', 'pottery']
      },
      {
        id: 'mystery_unsolved',
        name: 'Mystery & Unsolved 🔍',
        patterns: ['mystery', 'unsolved', 'disappeared', 'missing', 'strange', 'unexplained', 'bizarre', 'creepy']
      },
      {
        id: 'product_reviews',
        name: 'Product Reviews 📦',
        patterns: ['review', 'product', 'haul', 'unbox', 'test', 'comparison', 'vs', 'worth it', 'honest']
      },
      {
        id: 'life_stories',
        name: 'Life Stories & Experiences 📖',
        patterns: ['story', 'experience', 'life', 'journey', 'personal', 'share', 'real', 'happened', 'truth']
      },
      {
        id: 'challenges_experiments',
        name: 'Challenges & Experiments 🧪',
        patterns: ['challenge', 'experiment', 'test', 'try', 'attempt', 'crazy', 'impossible', '24 hour', 'vs']
      },
      {
        id: 'language_culture',
        name: 'Language & Culture 🌏',
        patterns: ['language', 'culture', 'tradition', 'country', 'international', 'foreign', 'accent', 'translate']
      },
      {
        id: 'restoration_repair',
        name: 'Restoration & Repair 🔧',
        patterns: ['restore', 'repair', 'fix', 'rebuild', 'refurbish', 'vintage', 'old', 'broken', 'before after']
      },
      {
        id: 'street_interviews',
        name: 'Street Interviews & Social 🎤',
        patterns: ['street', 'ask', 'people', 'public', 'social', 'opinion', 'random', 'stranger', 'city']
      },
      {
        id: 'tips_hacks',
        name: 'Tips & Life Hacks 💡',
        patterns: ['tip', 'hack', 'trick', 'secret', 'helpful', 'useful', 'easy', 'simple', 'quick fix']
      },
      {
        id: 'conspiracy_theories',
        name: 'Conspiracy & Theories 👁️',
        patterns: ['conspiracy', 'theory', 'hidden', 'secret', 'government', 'cover up', 'truth', 'expose']
      }
    ];
    
    // Step 1: Categorize using ultra-specific patterns
    const uncategorized: ChannelMetadata[] = [];
    
    for (const channel of channels) {
      const name = channel.name.toLowerCase();
      const description = (channel.description || '').toLowerCase();
      const fullText = `${name} ${description}`;
      
      let categorized = false;
      let bestMatch = '';
      let bestScore = 0;
      
      // Check each ultra category
      for (const category of ultraCategories) {
        let score = 0;
        
        for (const pattern of category.patterns) {
          if (fullText.includes(pattern)) {
            score += 3; // High confidence for direct matches
          }
          
          // Fuzzy matching for variations
          if (this.fuzzyMatch(fullText, pattern)) {
            score += 1;
          }
        }
        
        if (score > bestScore && score >= 2) {
          bestScore = score;
          bestMatch = category.id;
          categorized = true;
        }
      }
      
      if (categorized) {
        if (!results.has(bestMatch)) {
          results.set(bestMatch, []);
        }
        results.get(bestMatch)!.push(channel.id);
        console.log(`FolderTube: Ultra-categorized "${channel.name}" → ${bestMatch} (score: ${bestScore})`);
      } else {
        uncategorized.push(channel);
      }
    }
    
    // Step 2: For remaining channels, use semantic analysis
    if (uncategorized.length > 0) {
      const semanticGroups = this.semanticGrouping(uncategorized);
      for (const [groupId, channelIds] of semanticGroups) {
        results.set(groupId, channelIds);
      }
    }
    
    console.log(`FolderTube: Ultra-aggressive recategorization completed. Created ${results.size} ultra-specific categories.`);
    return results;
  }
  
  // Semantic grouping based on channel naming patterns and content themes
  private semanticGrouping(channels: ChannelMetadata[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const processed = new Set<string>();
    
    // Grouping strategies in order of specificity
    const groupingStrategies = [
      // Professional/Brand naming patterns
      {
        name: 'brands_official',
        test: (name: string) => name.includes('official') || name.includes('studios') || name.includes('media') || name.endsWith('tv'),
        displayName: 'Official Brands 🏢'
      },
      
      // Creator name patterns (first name + last name)
      {
        name: 'personal_creators',
        test: (name: string) => {
          const words = name.split(' ').filter(w => w.length > 2);
          return words.length === 2 && words.every(w => /^[A-Za-z]+$/.test(w));
        },
        displayName: 'Personal Creators 👤'
      },
      
      // Tech-sounding names
      {
        name: 'tech_channels',
        test: (name: string) => {
          const techWords = ['tech', 'digital', 'cyber', 'byte', 'bit', 'code', 'dev', 'lab', 'hub'];
          return techWords.some(word => name.toLowerCase().includes(word));
        },
        displayName: 'Tech Channels 💻'
      },
      
      // Entertainment-focused names
      {
        name: 'entertainment_channels',
        test: (name: string) => {
          const entWords = ['show', 'network', 'tv', 'entertainment', 'comedy', 'fun', 'live'];
          return entWords.some(word => name.toLowerCase().includes(word));
        },
        displayName: 'Entertainment Networks 📺'
      },
      
      // Educational-sounding names
      {
        name: 'learning_channels',
        test: (name: string) => {
          const eduWords = ['academy', 'school', 'learn', 'education', 'university', 'course', 'tutorial'];
          return eduWords.some(word => name.toLowerCase().includes(word));
        },
        displayName: 'Learning Channels 🎓'
      },
      
      // International/Foreign language channels
      {
        name: 'international_channels',
        test: (name: string) => {
          const nonEnglishChars = /[^\x00-\x7F]/;
          const commonNonEnglish = ['español', '中文', '日本', '한국', 'français', 'deutsch', 'русский'];
          return nonEnglishChars.test(name) || commonNonEnglish.some(word => name.toLowerCase().includes(word));
        },
        displayName: 'International Channels 🌍'
      }
    ];
    
    // Apply grouping strategies
    for (const strategy of groupingStrategies) {
      const matchingChannels: string[] = [];
      
      for (const channel of channels) {
        if (!processed.has(channel.id) && strategy.test(channel.name)) {
          matchingChannels.push(channel.id);
          processed.add(channel.id);
        }
      }
      
      if (matchingChannels.length >= 2) {
        groups.set(strategy.name, matchingChannels);
        console.log(`FolderTube: Semantic group "${strategy.displayName}" created with ${matchingChannels.length} channels`);
      }
    }
    
    // For any remaining unprocessed channels, create a "Unique Creators" category
    const remaining = channels.filter(c => !processed.has(c.id));
    if (remaining.length >= 2) {
      groups.set('unique_creators', remaining.map(c => c.id));
      console.log(`FolderTube: Created "Unique Creators" group with ${remaining.length} channels`);
    } else if (remaining.length === 1) {
      // Put single remaining channel into the largest existing group
      const largestGroup = Array.from(groups.entries()).reduce((max, current) => 
        current[1].length > max[1].length ? current : max
      );
      if (largestGroup) {
        largestGroup[1].push(remaining[0].id);
        console.log(`FolderTube: Added remaining channel to "${largestGroup[0]}" group`);
      }
    }
    
    return groups;
  }
  
  // Detect international (non-English) content
  private isInternationalContent(channelName: string, description: string, videoTitles: string[]): boolean {
    // Check for non-ASCII characters (indicates non-English)
    const nonAsciiPattern = /[^\x00-\x7F]/;
    
    // Common non-English language indicators
    const nonEnglishIndicators = [
      // Asian languages
      /[\u4e00-\u9fff]/, // Chinese characters
      /[\u3040-\u309f\u30a0-\u30ff]/, // Japanese hiragana/katakana
      /[\uac00-\ud7af]/, // Korean hangul
      /[\u0600-\u06ff]/, // Arabic
      /[\u0590-\u05ff]/, // Hebrew
      /[\u0e00-\u0e7f]/, // Thai
      /[\u0900-\u097f]/, // Hindi/Devanagari
      
      // European languages with special characters
      /[àáâãäåæçèéêëìíîïðñòóôõöøùúûü]/i, // Latin extended
      /[а-я]/i, // Cyrillic
      /[α-ω]/i, // Greek
    ];
    
    // Language keywords in channel names/descriptions
    const languageKeywords = [
      'español', 'française', 'deutsch', 'italiano', 'português',
      'русский', 'polski', 'türkçe', 'العربية', 'हिन्दी',
      '中文', '日本語', '한국어', 'bahasa', 'tiếng việt'
    ];
    
    // Check channel name for non-English indicators
    if (nonAsciiPattern.test(channelName)) {
      // Count non-ASCII characters
      const nonAsciiCount = (channelName.match(nonAsciiPattern) || []).length;
      const totalChars = channelName.length;
      
      // If more than 30% of characters are non-ASCII, likely international
      if (nonAsciiCount / totalChars > 0.3) {
        return true;
      }
    }
    
    // Check for specific language patterns
    for (const pattern of nonEnglishIndicators) {
      if (pattern.test(channelName) || pattern.test(description)) {
        return true;
      }
    }
    
    // Check for language keywords
    const combinedText = `${channelName} ${description}`.toLowerCase();
    for (const keyword of languageKeywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    // Check video titles - if majority are non-English
    if (videoTitles.length > 0) {
      let nonEnglishTitles = 0;
      for (const title of videoTitles) {
        if (nonAsciiPattern.test(title)) {
          const nonAsciiCount = (title.match(nonAsciiPattern) || []).length;
          if (nonAsciiCount / title.length > 0.3) {
            nonEnglishTitles++;
          }
        }
      }
      
      // If more than 50% of video titles are non-English
      if (nonEnglishTitles / videoTitles.length > 0.5) {
        return true;
      }
    }
    
    return false;
  }
}

// Export singleton instance
export const aiCategorizer = new AICategorizer();