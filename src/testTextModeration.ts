import { TextModerationService } from './TextModerationService';
import dotenv from "dotenv";
import path from 'path';

dotenv.config();
async function main() {
    try {

        const credentialsPath = path.join(__dirname, '..', 'keys', 'google-cloud-key.json');
        const moderator = new TextModerationService(credentialsPath);

        const testCases = [
            // Typical Game Announcements
            {
                text: "Match cancelled due to heavy rain. Stay safe everyone! Match cancelled due to heavy rain. Stay safe everyone! Please check our website for updates on the rescheduled date.",
                description: "Weather cancellation"
            },
            {
                text: "Big game this Saturday! Tigers vs Lions at 3PM. Bring your support! Big game this Saturday! Tigers vs Lions at 3PM. Bring your support! Don't miss this exciting match.",
                description: "Game announcement - positive"
            },

            // Team Updates
            {
                text: "Team practice cancelled tonight due to coach's illness. Team practice cancelled tonight due to coach's illness. We will notify everyone once the coach recovers.",
                description: "Practice cancellation - neutral"
            },
            {
                text: "Disappointing loss today against Lions (2-3). We'll bounce back stronger next week! Disappointing loss today against Lions (2-3). We'll bounce back stronger next week!",
                description: "Loss announcement - mixed sentiment"
            },

            // Member Communications
            {
                text: "Players fighting in changing room will face immediate suspension. Zero tolerance for violence. Players fighting in changing room will face immediate suspension. Zero tolerance for violence.",
                description: "Disciplinary warning - should flag for negative content"
            },
            {
                text: "All members must pay fees by Friday or will be suspended from next match. All members must pay fees by Friday or will be suspended from next match. This is your final reminder.",
                description: "Payment reminder - slightly negative"
            },

            // Injury Updates
            {
                text: "Smith injured his leg during practice. Wishing him a speedy recovery! Smith injured his leg during practice. Wishing him a speedy recovery! Medical team is monitoring his condition.",
                description: "Injury update - mixed sentiment"
            },
            {
                text: "Blood test required for all players before next match due to recent infection concerns. Blood test required for all players before next match due to recent infection concerns.",
                description: "Medical requirement - should flag medical content"
            },

            // Training Updates
            {
                text: "Great intensity at practice today! Keep pushing hard team! 💪 Great intensity at practice today! Keep pushing hard team! 💪 Your dedication is showing in our performance.",
                description: "Training positive"
            },
            {
                text: "Poor attendance at training. Remember this is mandatory for match selection. Poor attendance at training. Remember this is mandatory for match selection.",
                description: "Training warning - negative"
            },

            // Competition Updates
            {
                text: "Congratulations team! League champions 2024! Celebration at clubhouse tonight! 🏆 Congratulations team! League champions 2024! Celebration at clubhouse tonight! 🏆",
                description: "Victory celebration - very positive"
            },
            {
                text: "Knocked out of cup. Terrible referee decisions. Team played like garbage. Knocked out of cup. Terrible referee decisions. Team played like garbage.",
                description: "Bad loss - very negative"
            },

            // Administrative
            {
                text: "New player registration fees: $200. Contact membership@sportsclub.com or call 555-0123. New player registration fees: $200. Contact membership@sportsclub.com or call 555-0123.",
                description: "Admin with contact info - should flag personal info"
            },
            {
                text: "Changing room lockers broken into. Report any missing items to security. Changing room lockers broken into. Report any missing items to security. Investigation is ongoing.",
                description: "Security incident - negative"
            },

            // Youth Team Specific
            {
                text: "U16s training session tomorrow. Parents must sign consent forms. U16s training session tomorrow. Parents must sign consent forms. Please arrive 15 minutes early.",
                description: "Youth announcement - neutral"
            },
            {
                text: "Bullying reported in junior team. This behavior will result in immediate expulsion. Bullying reported in junior team. This behavior will result in immediate expulsion.",
                description: "Youth incident - should flag negative"
            },

            // Social Events
            {
                text: "Team BBQ this Sunday! Family welcome. $10 entry, drinks included! Team BBQ this Sunday! Family welcome. $10 entry, drinks included! Don't forget to RSVP.",
                description: "Social event - positive"
            },
            {
                text: "Due to drunk behavior at last event, alcohol now banned at club functions. Due to drunk behavior at last event, alcohol now banned at club functions.",
                description: "Policy change - should flag mature content"
            },

            // Mixed Content
            {
                text: "Great win today! Visit club.com/photos for match pictures. Contact coach@club.com for feedback. Great win today! Visit club.com/photos for match pictures. Contact coach@club.com for feedback.",
                description: "Mixed content with URLs and email"
            },
            {
                text: "Player threw punches during the match resulting in a serious fight. Multiple injuries reported. Security had to intervene. Player threw punches during the match resulting in a serious fight. Multiple injuries reported. Security had to intervene.",
                description: "Violence - physical altercation"
            },
            {
                text: "Rival team supporters vandalized our facilities with serious damage to equipment. Police reports filed for property destruction. Rival team supporters vandalized our facilities with serious damage to equipment. Police reports filed for property destruction.",
                description: "Violence - vandalism"
            },

            // Substance-Related
            {
                text: "Player suspended after testing positive for performance enhancing substances. Full investigation underway. Player suspended after testing positive for performance enhancing substances. Full investigation underway. Zero tolerance policy enforced.",
                description: "Drug reference - doping"
            },
            {
                text: "Multiple players caught smoking illegal substances in locker room. Immediate disciplinary action taken. Multiple players caught smoking illegal substances in locker room. Immediate disciplinary action taken.",
                description: "Drug reference - illegal substances"
            },

            // Harassment/Bullying
            {
                text: "Coach dismissed for sending inappropriate messages to junior team members. Legal action pending. Coach dismissed for sending inappropriate messages to junior team members. Legal action pending. Parents have been notified.",
                description: "Harassment - inappropriate conduct"
            },
            {
                text: "Serious allegations of systematic bullying in youth teams revealed. Multiple staff members implicated. Serious allegations of systematic bullying in youth teams revealed. Multiple staff members implicated.",
                description: "Harassment - bullying"
            },

            // Betting/Gambling
            {
                text: "Investigation launched into match-fixing allegations. Several players suspected of betting on own matches. Investigation launched into match-fixing allegations. Several players suspected of betting on own matches.",
                description: "Gambling - match fixing"
            },
            {
                text: "Players found operating illegal betting ring from club premises. All involved suspended pending investigation. Players found operating illegal betting ring from club premises. All involved suspended pending investigation.",
                description: "Gambling - illegal betting"
            },

            // Discrimination
            {
                text: "Player suspended for making discriminatory remarks about opponent's ethnicity during match. Mandatory sensitivity training ordered. Player suspended for making discriminatory remarks about opponent's ethnicity during match. Mandatory sensitivity training ordered.",
                description: "Discrimination - racial"
            },
            {
                text: "Team under investigation for systematic discrimination in player selection process. Legal counsel engaged. Team under investigation for systematic discrimination in player selection process. Legal counsel engaged.",
                description: "Discrimination - systematic"
            }
        ];
        const offensive = [
            {
                text: "Some people make good serpents. does it start with n and end with igger? does it start with n and end with igger? does it start with n and end with igger? mokey face murderers",
                description: "offensive people content"
            },
            {
                text: "Match cancelled due to heavy rain. Stay safe everyone! Match cancelled due to heavy rain. Stay safe everyone! Please check our website for updates on the rescheduled date.",
                description: "Weather cancellation"
            },
            {
                text: "Big game this Saturday! Tigers vs Lions at 3PM. Bring your support! Big game this Saturday! Tigers vs Lions at 3PM. Bring your support! Don't miss this exciting match.",
                description: "Game announcement - positive"
            },
        ]
        for (const testCase of offensive) {
            try {
                console.log('\nTesting:', testCase.description);
                const result = await moderator.moderate(testCase.text);
                console.log('Result:', JSON.stringify(result, null, 2));
            } catch (error) {
                console.error(`Error moderating "${testCase.description}":`, error);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();