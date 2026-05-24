export interface User {
  id: string;
  email: string;
  name: string;
  credits_used: number; // in words
  total_credits: number; // e.g., 50000
  subscription_tier?: 'Free' | 'Premium';
}

export interface Comment {
  id: string;
  doc_id: string;
  user_id: string;
  user_name: string;
  range_start: number;
  range_end: number;
  text: string;
  selectedText: string;
  created_at: string;
}

export interface VersionSnapshot {
  id: string;
  doc_id: string;
  content: string;
  version: number;
  created_at: string;
  author_name: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  team_id: string | null;
  created_at: string;
  version: number;
  comments: Comment[];
  snapshots: VersionSnapshot[];
  branch_name?: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  members: {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'member';
  }[];
}

// Paraphrasing types
export type ParaphraseMode =
  | 'Standard'
  | 'Formal'
  | 'Academic'
  | 'Creative'
  | 'Expand'
  | 'Shorten'
  | 'Legal'
  | 'Persuasive'
  | 'Humanize'
  | 'SEO';

export interface ParaphraseRequest {
  text: string;
  mode: ParaphraseMode;
  synonym_level: number; // 0 to 1
  frozen_words: string[];
  language: string;
}

export interface ParaphraseResponse {
  original: string;
  paraphrased: string;
  diff: {
    type: 'equal' | 'delete' | 'insert';
    text: string;
  }[];
}

// Detection suite types
export interface SentenceScore {
  sentence: string;
  score: number; // 0 to 100
  isAI: boolean;
}

export interface AIDetectionResponse {
  overall_score: number; // 0 to 100 AI probability
  classification: 'Human-Written' | 'Mixed Content' | 'AI-Generated';
  sentences: SentenceScore[];
}

export interface PlagiarismMatch {
  source_title: string;
  source_url: string;
  similarity_score: number; // 0 to 100
  matched_text: string;
}

export interface PlagiarismDetectionResponse {
  overall_similarity: number; // 0 to 100
  matches: PlagiarismMatch[];
}

export interface HybridDetectionResponse {
  score: number; // 0 to 100 spun likelihood
  is_spun: boolean;
  n_grams_overlap: number;
}

// Assistant types
export interface GrammarIssue {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  replacements: { value: string }[];
  rule: {
    id: string;
    description: string;
    category: { name: string };
  };
}

export interface WritingAnalysis {
  grammar_issues: GrammarIssue[];
  seo: {
    keyword_density: { word: string; count: number; density: number }[];
    readability_score: number; // Flesch-Kincaid index
    readability_label: string;
    word_count: number;
    sentence_count: number;
  };
  audience: {
    predicted_grade: string;
    suitability: string;
  };
  style_suggestions: {
    type: 'cliche' | 'passive-voice' | 'long-sentence' | 'redundancy';
    sentence: string;
    suggestion: string;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface UserWritingDNA {
  userId: string;
  styleDescriptor: string;
  traits: Record<string, number>;
  signaturePhrases: string[];
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  trigger: 'new_doc' | 'doc_save' | 'high_ai_score';
  action: 'send_email' | 'post_slack' | 'run_paraphrase' | 'notify_team';
  triggerDetails?: string;
  actionDetails?: string;
  active: boolean;
}

