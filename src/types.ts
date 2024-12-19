export enum ContentRecommendation {
    APPROPRIATE = 'APPROPRIATE',
    NEEDS_REVIEW = 'NEEDS_REVIEW',
    INAPPROPRIATE = 'INAPPROPRIATE'
}

export enum RecommendationReason {
    // Appropriate reasons
    GENERAL_APPROPRIATE = 'Content appears appropriate',
    SPORTS_APPROPRIATE = 'Contains appropriate sports-related content',

    // Review reasons
    STRONG_LANGUAGE = 'Contains strong competitive language',
    INJURY_REFERENCE = 'Contains injury-related content',
    HEALTH_REFERENCE = 'Contains health-related content',

    // Inappropriate reasons
    VERY_NEGATIVE = 'Contains very negative content',
    INAPPROPRIATE_LANGUAGE = 'Contains inappropriate language',
    UNSAFE_BEHAVIOR = 'Contains references to unsafe behavior',

    // Category-based reasons
    ADULT_CONTENT = 'Contains adult content',
    VIOLENCE_CONTENT = 'Contains violent content',
    SENSITIVE_CONTENT = 'Contains sensitive content',
    MEDICAL_CONTENT = 'Contains medical content'
}

export interface CategoryAnalysis {
    name: string;
    confidence: number;
}

export interface ImageAnalysis {
    name: string;
    confidence: number;
}

export interface SafeSearchAnnotation {
    adult: string;
    medical: string;
    spoof: string;
    violence: string;
    racy: string;
}

export interface SentimentAnalysis {
    score: number;
    magnitude: number;
}

export interface BaseModerationResult {
    isAppropriate: boolean;
    warnings: string[];
    flags: string[];
    recommendation: ContentRecommendation;
    reasons: RecommendationReason[];
}
export interface TextModerationResult extends BaseModerationResult {
    text: string;
    sentiment: SentimentAnalysis;
    categories: CategoryAnalysis[];
    labels?: never;
    safeSearch?: never;
}

// Image-specific moderation result
export interface ImageModerationResult extends BaseModerationResult {
    text?: never;
    sentiment?: never;
    categories?: never;
    labels: ImageAnalysis[];
    safeSearch: SafeSearchAnnotation;
}

// Union type that can be either text or image moderation result
export type ModerationResult = TextModerationResult | ImageModerationResult;