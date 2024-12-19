import { ImageModerationService } from './ImageModerationService';
import dotenv from "dotenv";
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

async function main() {
    try {
        const credentialsPath = path.join(__dirname, '..', 'keys', 'google-cloud-key.json');
        const moderator = new ImageModerationService(credentialsPath);

        // Define test cases with image paths and descriptions
        const testCases = [
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'download.jpeg'),
                description: "Sports game - appropriate content"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'alcohol.png'),
                description: "Alcohol"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'disturbing.jpg'),
                description: "disturbing"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'drugs.jpg'),
                description: "drugs"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'hate_speech.png'),
                description: "hate_speech"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'hate_symbols.png'),
                description: "hate_symbols"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'profanity.png'),
                description: "profanity"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'violence.png'),
                description: "violence"
            },
            {
                imagePath: path.join(__dirname, '..', 'test-images', 'weapons.png'),
                description: "weapons"
            },
        ];

        // Process each test case
        for (const testCase of testCases) {
            try {
                console.log('\nTesting:', testCase.description);
                console.log('Image Path:', testCase.imagePath);

                // Read image file
                const imageBuffer = await fs.readFile(testCase.imagePath);

                // Perform moderation
                const result = await moderator.moderate(imageBuffer);

                // Log results
                console.log('Moderation Result:');
                console.log(JSON.stringify({
                    isAppropriate: result.isAppropriate,
                    recommendation: result.recommendation,
                    reasons: result.reasons,
                    warnings: result.warnings,
                    flags: result.flags,
                    safeSearch: result.safeSearch,
                    labels: result.labels?.map(label => ({
                        name: label.name,
                        confidence: Math.round(label.confidence * 100) + '%'
                    }))
                }, null, 2));

            } catch (error) {
                console.error(`Error moderating "${testCase.description}":`, error);
            }
        }

    } catch (error) {
        console.error('Initialization error:', error);
    }
}

main();