import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import {
    ModerationResult,
    ContentRecommendation,
    RecommendationReason,
    ImageAnalysis
} from './types';

type Likelihood = protos.google.cloud.vision.v1.Likelihood;
type LikelihoodType = Likelihood | "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY" | null | undefined;

export class ImageModerationService {
    private client: ImageAnnotatorClient;

    private readonly INAPPROPRIATE_LABELS = [
        'Violence',
        'Weapon',
        'Blood',
        'Adult',
        'Explicit',
        'Drug',
        'Gambling',
        'Alcohol',
    ];

    private readonly REVIEW_LABELS = [
        'Medical',
        'Health',
        'Injury',
        'Emergency',
    ];

    constructor(credentialsPath: string) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        this.client = new ImageAnnotatorClient();
    }

    private getLikelihoodString(likelihood: LikelihoodType): string {
        if (likelihood === null || likelihood === undefined) {
            return 'UNKNOWN';
        }

        if (typeof likelihood === 'string') {
            return likelihood;
        }

        return protos.google.cloud.vision.v1.Likelihood[likelihood];
    }

    private async analyzeSafeSearch(imageBuffer: Buffer): Promise<{
        adult: string;
        medical: string;
        spoof: string;
        violence: string;
        racy: string;
    }> {
        const [result] = await this.client.safeSearchDetection(imageBuffer);
        const safeSearch = result.safeSearchAnnotation;

        if (!safeSearch) {
            throw new Error('Safe search analysis failed');
        }

        return {
            adult: this.getLikelihoodString(safeSearch.adult),
            medical: this.getLikelihoodString(safeSearch.medical),
            spoof: this.getLikelihoodString(safeSearch.spoof),
            violence: this.getLikelihoodString(safeSearch.violence),
            racy: this.getLikelihoodString(safeSearch.racy)
        };
    }


    private async analyzeLabels(imageBuffer: Buffer): Promise<ImageAnalysis[]> {
        try {
            const [result] = await this.client.labelDetection(imageBuffer);
            const labels = result.labelAnnotations || [];

            return labels.map(label => ({
                name: label.description || '',
                confidence: label.score || 0
            }));
        } catch (error) {
            console.log('Label analysis skipped:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    private checkSafeSearch(safeSearch: { [key: string]: string }): {
        isAppropriate: boolean;
        reasons: RecommendationReason[];
        warnings: string[];
    } {
        const result = {
            isAppropriate: true,
            reasons: [] as RecommendationReason[],
            warnings: [] as string[]
        };

        const LIKELIHOOD_SEVERITY: { [key: string]: number } = {
            'VERY_LIKELY': 5,
            'LIKELY': 4,
            'POSSIBLE': 3,
            'UNLIKELY': 2,
            'VERY_UNLIKELY': 1,
            'UNKNOWN': 0
        };

        // Check each safe search category
        if (LIKELIHOOD_SEVERITY[safeSearch.adult] >= 3) {
            result.isAppropriate = false;
            result.reasons.push(RecommendationReason.ADULT_CONTENT);
            result.warnings.push(`Detected adult content (${safeSearch.adult})`);
        }

        if (LIKELIHOOD_SEVERITY[safeSearch.violence] >= 3) {
            result.isAppropriate = false;
            result.reasons.push(RecommendationReason.VIOLENCE_CONTENT);
            result.warnings.push(`Detected violent content (${safeSearch.violence})`);
        }

        if (LIKELIHOOD_SEVERITY[safeSearch.medical] >= 3) {
            result.reasons.push(RecommendationReason.MEDICAL_CONTENT);
            result.warnings.push(`Detected medical content (${safeSearch.medical})`);
        }

        if (LIKELIHOOD_SEVERITY[safeSearch.racy] >= 3) {
            result.isAppropriate = false;
            result.reasons.push(RecommendationReason.ADULT_CONTENT);
            result.warnings.push(`Detected racy content (${safeSearch.racy})`);
        }

        return result;
    }

    private checkLabels(labels: ImageAnalysis[]): {
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

        for (const label of labels) {
            // Check for inappropriate labels
            if (this.INAPPROPRIATE_LABELS.some(inappropriate =>
                label.name.toLowerCase().includes(inappropriate.toLowerCase()) &&
                label.confidence > 0.5)) {

                result.isAppropriate = false;
                result.warnings.push(`Detected ${label.name} content (${(label.confidence * 100).toFixed(1)}% confidence)`);
                result.reasons.push(RecommendationReason.SENSITIVE_CONTENT);
            }

            // Check for labels that need review
            else if (this.REVIEW_LABELS.some(reviewLabel =>
                label.name.toLowerCase().includes(reviewLabel.toLowerCase()) &&
                label.confidence > 0.5)) {

                result.flags.push(`Contains ${label.name} content (${(label.confidence * 100).toFixed(1)}% confidence)`);
                result.reasons.push(RecommendationReason.MEDICAL_CONTENT);
            }
        }

        return result;
    }

    async moderate(imageBuffer: Buffer): Promise<ModerationResult> {
        try {
            if (!imageBuffer || imageBuffer.length === 0) {
                throw new Error('Image content cannot be empty');
            }

            // Initialize result
            const result: ModerationResult = {
                isAppropriate: true,
                warnings: [],
                flags: [],
                labels: [],
                safeSearch: {
                    adult: 'UNKNOWN',
                    medical: 'UNKNOWN',
                    spoof: 'UNKNOWN',
                    violence: 'UNKNOWN',
                    racy: 'UNKNOWN'
                },
                recommendation: ContentRecommendation.APPROPRIATE,
                reasons: []
            };

            // Get both safe search and label analysis
            const [safeSearch, labels] = await Promise.all([
                this.analyzeSafeSearch(imageBuffer),
                this.analyzeLabels(imageBuffer)
            ]);

            result.safeSearch = safeSearch;
            result.labels = labels;

            // Check both analyses
            const safeSearchCheck = this.checkSafeSearch(safeSearch);
            const labelCheck = this.checkLabels(labels);

            // Combine results
            result.isAppropriate = result.isAppropriate &&
                safeSearchCheck.isAppropriate &&
                labelCheck.isAppropriate;

            result.warnings.push(...safeSearchCheck.warnings, ...labelCheck.warnings);
            result.flags.push(...labelCheck.flags);
            result.reasons.push(...safeSearchCheck.reasons, ...labelCheck.reasons);

            // Set final recommendation
            if (!result.isAppropriate) {
                result.recommendation = ContentRecommendation.INAPPROPRIATE;
            } else if (result.flags.length > 0) {
                result.recommendation = ContentRecommendation.NEEDS_REVIEW;
            } else {
                result.recommendation = ContentRecommendation.APPROPRIATE;
            }

            return result;

        } catch (error) {
            throw new Error(`Image moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}