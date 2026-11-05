export interface DiaryAIFeedback {
  mood_analysis?: string;
  comfort?: string;
  life_advice?: string;
  social_advice?: string;
  generated_at?: string;
}

export interface Diary {
  id: string;
  diary_date: string; // YYYY-MM-DD (unique)
  content: string;
  image_keys: string[];
  images: string[]; // 签名后的可访问 URL（GET 时动态生成）
  mood: string | null;
  weather: string | null;
  location: string | null;
  ai_feedback: DiaryAIFeedback | null;
  created_at: string;
  updated_at: string;
}

export const MOOD_OPTIONS = ["😄", "😊", "🥰", "😌", "😴", "🤔", "😢", "😡", "💪", "✨", "🌈", "🎉"];

export const WEATHER_OPTIONS = ["☀️ 晴", "⛅ 多云", "☁️ 阴", "🌧️ 雨", "⛈️ 雷雨", "🌨️ 雪", "🌫️ 雾", "💨 大风"];
