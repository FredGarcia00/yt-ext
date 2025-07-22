export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

export function formatViewCount(viewCount: string | undefined): string {
  if (!viewCount) return 'No views';
  
  const count = parseInt(viewCount, 10);
  if (isNaN(count)) return 'No views';
  
  if (count < 1000) {
    return `${count} views`;
  }
  
  if (count < 1000000) {
    const k = Math.floor(count / 1000);
    const decimal = Math.floor((count % 1000) / 100);
    return decimal > 0 ? `${k}.${decimal}K views` : `${k}K views`;
  }
  
  if (count < 1000000000) {
    const m = Math.floor(count / 1000000);
    const decimal = Math.floor((count % 1000000) / 100000);
    return decimal > 0 ? `${m}.${decimal}M views` : `${m}M views`;
  }
  
  const b = Math.floor(count / 1000000000);
  const decimal = Math.floor((count % 1000000000) / 100000000);
  return decimal > 0 ? `${b}.${decimal}B views` : `${b}B views`;
}

export function isNewVideo(publishedAt: string, lastWatchedTimestamp?: number): boolean {
  const publishedDate = new Date(publishedAt);
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  // Video is "new" if it was published within the last 24 hours
  // and hasn't been watched (if we're tracking watch status)
  const isRecent = publishedDate >= oneDayAgo;
  const isUnwatched = !lastWatchedTimestamp || publishedDate.getTime() > lastWatchedTimestamp;
  
  return isRecent && isUnwatched;
}