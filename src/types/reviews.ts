export interface ReviewDetail {
  platform: 'android' | 'ios';
  app: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  thumbs_up: number;
  reply: string;
  country: string;
  lang: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  wait_minutes: number | null;
}

export interface PressureDetails {
  total_reviews: number;
  positive: number;
  negative: number;
  neutral: number;
  neg_pct: number;
  avg_rating: number;
  time_mentions: number;
  avg_wait_min: number;
  wait_score: number;
  rating_score: number;
}

export interface AppReviewNode {
  name: string;
  total_reviews: number;
  pressure: {
    pressure_index: number;
    details: PressureDetails;
  };
  ai_report: string;
  reviews: ReviewDetail[];
}

export interface GigReviewsData {
  generated_at: string;
  country: string;
  platform: string;
  apps: Record<string, AppReviewNode>;
}
