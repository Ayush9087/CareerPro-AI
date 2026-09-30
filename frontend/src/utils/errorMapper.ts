export function mapErrorToStudentMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('401') || message.includes('unauthorized')) {
    return "Your session has expired. Please sign in again to continue.";
  }
  if (message.includes('403') || message.includes('forbidden')) {
    return "You don't have permission to access this feature right now.";
  }
  if (message.includes('404') || message.includes('not found')) {
    return "We couldn't find the information you're looking for.";
  }
  if (message.includes('500') || message.includes('internal server error')) {
    return "Our AI coach is taking a quick break. Please try again in a moment.";
  }
  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
    return "It looks like your internet connection is unstable. Let's try again.";
  }

  return "Something went wrong on our end. We're on it!";
}
