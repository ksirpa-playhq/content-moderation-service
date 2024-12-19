import {LanguageServiceClient} from '@google-cloud/language';
import {
    ModerationResult,
    ContentRecommendation,
    RecommendationReason,
    CategoryAnalysis
} from './types';

export class TextModerationService {
    private client: LanguageServiceClient;

    /*
        TODO:
        This list should be updated based on this
        https://cloud.google.com/natural-language/docs/categories
        We could flag some as inappropriate based on the category returned
    * */

    private readonly INAPPROPRIATE_CATEGORIES = [
        '/Adult/',
        '/Violence/',
        '/Drugs/',
        '/Gambling/',
        '/Weapons/',
        '/Explicit/',
        '/Religion/'
    ];

    private readonly REVIEW_CATEGORIES = [
        '/Health/',
        '/Sports/',
        '/Medical/',
        '/Emergency/',
    ];

    constructor(credentialsPath: string) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        this.client = new LanguageServiceClient();
    }

    private async analyzeCategories(text: string): Promise<CategoryAnalysis[]> {
        try {
            const [result] = await this.client.classifyText({
                document: {
                    content: text,
                    type: 'PLAIN_TEXT' as const,
                }
            });

            return result.categories?.map(category => ({
                name: category.name || '',
                confidence: category.confidence || 0
            })) || [];

        } catch (error) {
            console.log('Category analysis skipped:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    private async analyzeSentiment(text: string): Promise<{ score: number; magnitude: number }> {
        const [result] = await this.client.analyzeSentiment({
            document: {
                content: text,
                type: 'PLAIN_TEXT' as const,
            }
        });

        return {
            score: result.documentSentiment?.score ?? 0,
            magnitude: result.documentSentiment?.magnitude ?? 0
        };
    }

    private checkCategories(categories: CategoryAnalysis[]): {
        isAppropriate: boolean;
        reasons: RecommendationReason[];
        warnings: string[];
        flags: string[];
    } {
        const result = {
            isAppropriate: true,
            reasons: [] as RecommendationReason[],
            warnings: [] as string[],
            flags: [] as string[]
        };

        for (const category of categories) {
            // Check for inappropriate categories
            if (this.INAPPROPRIATE_CATEGORIES.some(inappropriate =>
                category.name.includes(inappropriate) && category.confidence > 0.5)) {
                result.isAppropriate = false;
                result.warnings.push(`Detected ${category.name} content (${(category.confidence * 100).toFixed(1)}% confidence)`);

                if (category.name.includes('/Adult/')) {
                    result.reasons.push(RecommendationReason.ADULT_CONTENT);
                } else if (category.name.includes('/Violence/')) {
                    result.reasons.push(RecommendationReason.VIOLENCE_CONTENT);
                } else {
                    result.reasons.push(RecommendationReason.SENSITIVE_CONTENT);
                }
            }

            // Check for categories that need review
            else if (this.REVIEW_CATEGORIES.some(reviewCat =>
                category.name.includes(reviewCat) && category.confidence > 0.5)) {
                result.flags.push(`Contains ${category.name} content (${(category.confidence * 100).toFixed(1)}% confidence)`);

                if (category.name.includes('/Medical/') || category.name.includes('/Health/')) {
                    result.reasons.push(RecommendationReason.MEDICAL_CONTENT);
                }
            }
        }

        return result;
    }

    private checkSentiment(sentiment: { score: number, magnitude: number }): {
        isPositive: boolean;
        reasons: RecommendationReason[];
    } {
        const { score, magnitude } = sentiment;
        const result = {
            isPositive: true,
            reasons: [] as RecommendationReason[]
        };

        // Mixed sentiment: neutral score (close to 0) with high magnitude
        if (Math.abs(score) < 0.2 && magnitude >= 3.0) {
            result.isPositive = false;
            result.reasons.push(RecommendationReason.STRONG_LANGUAGE);
        }
        // Clearly negative: negative score with high magnitude
        else if (score <= -0.5 && magnitude >= 3.0) {
            result.isPositive = false;
            result.reasons.push(RecommendationReason.VERY_NEGATIVE);
        }
        // Clearly positive: positive score with high magnitude
        else if (score >= 0.5 && magnitude >= 3.0) {
            result.reasons.push(RecommendationReason.GENERAL_APPROPRIATE);
        }
        // Neutral: low score and low magnitude
        else if (Math.abs(score) < 0.2 && magnitude < 1.0) {
            result.reasons.push(RecommendationReason.GENERAL_APPROPRIATE);
        }
        // Moderately negative
        else if (score < -0.2) {
            result.isPositive = false;
            result.reasons.push(RecommendationReason.INAPPROPRIATE_LANGUAGE);
        }
        // Default case (moderately positive or borderline cases)
        else {
            result.reasons.push(RecommendationReason.GENERAL_APPROPRIATE);
        }

        return result;
    }

    async moderate(text: string): Promise<ModerationResult> {
        try {
            if (!text?.trim()) {
                throw new Error('Text content cannot be empty');
            }

            // Initialize result
            const result: ModerationResult = {
                text,
                isAppropriate: true,
                warnings: [],
                flags: [],
                sentiment: {
                    score: 0,
                    magnitude: 0,
                },
                categories: [],
                recommendation: ContentRecommendation.APPROPRIATE,
                reasons: []
            };

            const sentiment = await this.analyzeSentiment(text)
            const categories = await this.analyzeCategories(text)

            result.sentiment = sentiment;
            result.categories = categories;

            // Check categories
            const categoryCheck = this.checkCategories(categories);
            const sentimentCheck = this.checkSentiment(sentiment)
            result.isAppropriate = result.isAppropriate && categoryCheck.isAppropriate && sentimentCheck.isPositive;
            result.reasons = [...categoryCheck.reasons, ...sentimentCheck.reasons]

            result.warnings.push(...categoryCheck.warnings);
            result.flags.push(...categoryCheck.flags);
            result.reasons.push(...categoryCheck.reasons);

            // Set final recommendation
            if (!result.isAppropriate) {
                result.recommendation = ContentRecommendation.INAPPROPRIATE;
            } else {
                result.recommendation = ContentRecommendation.APPROPRIATE;
            }

            return result;

        } catch (error) {
            throw new Error(`Moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}