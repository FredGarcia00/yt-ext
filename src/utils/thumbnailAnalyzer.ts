interface ThumbnailAnalysis {
  colors: string[];
  textIndicators: string[];
  visualPatterns: string[];
  categoryHints: string[];
}

export class ThumbnailAnalyzer {
  
  // Analyze thumbnail URL patterns and visual cues
  static analyzeThumbnail(thumbnailUrl: string, channelName: string): ThumbnailAnalysis {
    const analysis: ThumbnailAnalysis = {
      colors: [],
      textIndicators: [],
      visualPatterns: [],
      categoryHints: []
    };

    // Extract visual cues from thumbnail URL structure
    if (thumbnailUrl.includes('yt3.ggpht.com') || thumbnailUrl.includes('yt4.ggpht.com')) {
      // Profile images tend to be more personal/individual focused
      analysis.visualPatterns.push('profile_image');
      
      // Analyze URL structure for additional hints
      const urlParts = thumbnailUrl.split('/');
      const imageId = urlParts[urlParts.length - 1];
      
      // Different patterns in image IDs can hint at content types
      if (imageId.includes('photo')) {
        analysis.visualPatterns.push('photo_based');
      }
      
      if (imageId.match(/[0-9]{13,}/)) {
        analysis.visualPatterns.push('timestamp_based');
      }
    }

    // Cross-reference with channel name patterns for better accuracy
    const nameLower = channelName.toLowerCase();
    
    // Tech channels often have clean, minimal thumbnails
    if (nameLower.includes('tech') || nameLower.includes('review') || nameLower.includes('unbox')) {
      analysis.categoryHints.push('tech');
    }
    
    // Gaming channels often have bright, colorful thumbnails
    if (nameLower.includes('gaming') || nameLower.includes('game') || nameLower.includes('play')) {
      analysis.categoryHints.push('gaming');
      analysis.colors.push('bright', 'colorful');
    }
    
    // Music channels often have artistic, stylized thumbnails  
    if (nameLower.includes('music') || nameLower.includes('records') || nameLower.includes('sound')) {
      analysis.categoryHints.push('music');
      analysis.visualPatterns.push('artistic');
    }
    
    // Educational channels often have simple, text-heavy thumbnails
    if (nameLower.includes('education') || nameLower.includes('learn') || nameLower.includes('university') || nameLower.includes('academy')) {
      analysis.categoryHints.push('education');
      analysis.textIndicators.push('text_heavy');
    }
    
    // Fitness channels often show people/action shots
    if (nameLower.includes('fitness') || nameLower.includes('workout') || nameLower.includes('gym')) {
      analysis.categoryHints.push('fitness');
      analysis.visualPatterns.push('people_focused');
    }
    
    // Beauty channels often have close-up face shots with good lighting
    if (nameLower.includes('beauty') || nameLower.includes('makeup') || nameLower.includes('cosmetic')) {
      analysis.categoryHints.push('beauty');
      analysis.visualPatterns.push('portrait_focused');
      analysis.colors.push('warm_tones');
    }
    
    // Cooking channels often have food shots
    if (nameLower.includes('cook') || nameLower.includes('recipe') || nameLower.includes('food') || nameLower.includes('kitchen')) {
      analysis.categoryHints.push('cooking');
      analysis.visualPatterns.push('food_focused');
    }
    
    // DIY/Craft channels often show hands/process shots
    if (nameLower.includes('diy') || nameLower.includes('craft') || nameLower.includes('build') || nameLower.includes('make')) {
      analysis.categoryHints.push('diy');
      analysis.visualPatterns.push('process_focused');
    }
    
    // Business/Finance channels often have professional headshots
    if (nameLower.includes('business') || nameLower.includes('finance') || nameLower.includes('money') || nameLower.includes('invest')) {
      analysis.categoryHints.push('finance');
      analysis.visualPatterns.push('professional');
      analysis.colors.push('neutral_tones');
    }

    return analysis;
  }

  // Get category boost based on thumbnail analysis
  static getCategoryBoost(analysis: ThumbnailAnalysis, categoryId: string): number {
    let boost = 0;
    
    // Direct category hints from thumbnail analysis
    if (analysis.categoryHints.includes(categoryId)) {
      boost += 3; // Strong visual indicator
    }
    
    // Visual pattern matching
    switch (categoryId) {
      case 'tech':
        if (analysis.visualPatterns.includes('profile_image') && analysis.colors.includes('neutral_tones')) {
          boost += 2;
        }
        break;
        
      case 'gaming':
        if (analysis.colors.includes('bright') || analysis.colors.includes('colorful')) {
          boost += 2;
        }
        break;
        
      case 'music':
        if (analysis.visualPatterns.includes('artistic')) {
          boost += 2;
        }
        break;
        
      case 'education':
        if (analysis.textIndicators.includes('text_heavy')) {
          boost += 2;
        }
        break;
        
      case 'beauty':
        if (analysis.visualPatterns.includes('portrait_focused') || analysis.colors.includes('warm_tones')) {
          boost += 2;
        }
        break;
        
      case 'fitness':
        if (analysis.visualPatterns.includes('people_focused')) {
          boost += 2;
        }
        break;
        
      case 'cooking':
        if (analysis.visualPatterns.includes('food_focused')) {
          boost += 3; // Very distinctive visual pattern
        }
        break;
        
      case 'diy':
        if (analysis.visualPatterns.includes('process_focused')) {
          boost += 2;
        }
        break;
        
      case 'finance':
        if (analysis.visualPatterns.includes('professional') && analysis.colors.includes('neutral_tones')) {
          boost += 2;
        }
        break;
    }
    
    return boost;
  }
}