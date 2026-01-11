import {
    AnimalProfile,
    DetectionEvent,
    HealthMetrics,
    RiskAssessment,
    GeminiAlert,
    HealthBaseline,
    AnimalSpecies,
    AnimalBaseline,
    DailyDeviation,
    EarlyWarningAssessment,
    DetectionSource,
    PersonalizedRiskAssessment,
    RiskLevel,
} from '@/types';
import { initializeBaseline } from './baseline-learning';
import { generateHealthExplanation } from './explainable-health';

/**
 * In-memory data store for FarmEYE
 * Abstracted for easy replacement with actual database (Prisma, etc.)
 */

// Data storage
const animals = new Map<string, AnimalProfile>();
const detectionEvents: DetectionEvent[] = [];
const healthMetrics = new Map<string, HealthMetrics[]>();
const riskAssessments = new Map<string, RiskAssessment>();
const geminiAlerts: GeminiAlert[] = [];
const healthBaselines = new Map<string, HealthBaseline>();
const animalBaselines = new Map<string, AnimalBaseline>();
const dailyDeviations = new Map<string, DailyDeviation[]>();
const earlyWarnings = new Map<string, EarlyWarningAssessment>();

/**
 * Generate deterministic animal ID based on sequence
 */
let animalIdCounter = {
    Cow: 101,
    Buffalo: 201,
    Goat: 301,
    Sheep: 401,
};

function generateAnimalId(species: AnimalSpecies): string {
    const prefix = species.toUpperCase();
    const id = animalIdCounter[species]++;
    return `${prefix} -${id.toString().padStart(3, '0')} `;
}

/**
 * Generate UUID-like ID for events and alerts
 */
function generateId(): string {
    return `${Date.now()} -${Math.random().toString(36).substr(2, 9)} `;
}

/**
 * Initialize seed data for demo purposes
 * Based on real dairy cow statistics from research:
 * - Activity: 900-1200 units/day (healthy Holstein)
 * - Speed: 2.8-4.2 km/h walking speed
 * - Visit frequency: 4-8 times/day to feeding areas
 */
export function initializeSeedData() {
    // Clear existing data
    animals.clear();
    detectionEvents.length = 0;
    healthMetrics.clear();
    riskAssessments.clear();
    geminiAlerts.length = 0;
    healthBaselines.clear();
    animalBaselines.clear();
    dailyDeviations.clear();
    earlyWarnings.clear();

    const now = new Date();

    // Demo Animal 1: HEALTHY COW with STABLE baseline (for comparison)
    const cow1Id = 'COW-101';
    const cow1: AnimalProfile = {
        id: cow1Id,
        species: 'Cow',
        registeredAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
        metadata: {
            breed: 'Holstein',
            age: 4,
            weight: 580,
        },
    };
    animals.set(cow1Id, cow1);

    // Stable baseline (based on research: healthy Holstein cows)
    const cow1Baseline: AnimalBaseline = {
        animalId: cow1Id,
        avgSpeed: 3.8, // km/h (normal walking)
        avgVisitsPerDay: 7, // feeding visits
        avgActivityLevel: 1050, // activity units
        speedStdDev: 0.42,
        activityStdDev: 87,
        baselineStartDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        baselineStatus: 'STABLE',
        dataPointsCollected: 28,
        requiredDataPoints: 20,
    };
    animalBaselines.set(cow1Id, cow1Baseline);

    // Add 7 days of normal deviation history (small fluctuations)
    const cow1Deviations: DailyDeviation[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        cow1Deviations.push({
            date: date.toISOString().split('T')[0],
            activityDeltaPct: -2 + Math.random() * 4, // -2% to +2%
            speedDeltaPct: -1.5 + Math.random() * 3, // -1.5% to +1.5%
            visitDeltaPct: -3 + Math.random() * 6, // -3% to +3%
            flagCount: 0, // All within normal range
        });
    }
    dailyDeviations.set(cow1Id, cow1Deviations);

    // Demo Animal 2: COW WITH EARLY LAMENESS (shows EHDD + XHI features)
    const cow2Id = 'COW-102';
    const cow2: AnimalProfile = {
        id: cow2Id,
        species: 'Cow',
        registeredAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
            breed: 'Holstein',
            age: 3,
            weight: 530,
        },
    };
    animals.set(cow2Id, cow2);

    // Baseline (was healthy)
    const cow2Baseline: AnimalBaseline = {
        animalId: cow2Id,
        avgSpeed: 3.6,
        avgVisitsPerDay: 6.5,
        avgActivityLevel: 980,
        speedStdDev: 0.38,
        activityStdDev: 82,
        baselineStartDate: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        baselineStatus: 'STABLE',
        dataPointsCollected: 25,
        requiredDataPoints: 20,
    };
    animalBaselines.set(cow2Id, cow2Baseline);

    // 7-day deviation showing early lameness pattern (classic early drift)
    const cow2Deviations: DailyDeviation[] = [
        { date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -2.1, speedDeltaPct: -1.8, visitDeltaPct: -3.5, flagCount: 0 },
        { date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -6.2, speedDeltaPct: -5.4, visitDeltaPct: -8.1, flagCount: 2 }, // Drift starts
        { date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -7.8, speedDeltaPct: -6.9, visitDeltaPct: -9.7, flagCount: 2 },
        { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -8.4, speedDeltaPct: -7.2, visitDeltaPct: -11.2, flagCount: 3 },
        { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -9.1, speedDeltaPct: -8.6, visitDeltaPct: -12.8, flagCount: 3 }, // 3 consecutive days
        { date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -10.3, speedDeltaPct: -9.8, visitDeltaPct: -14.1, flagCount: 3 },
        { date: now.toISOString().split('T')[0], activityDeltaPct: -11.7, speedDeltaPct: -10.4, visitDeltaPct: -15.3, flagCount: 3 }, // Today
    ];
    dailyDeviations.set(cow2Id, cow2Deviations);

    // Demo Animal 3: COW WITH MASTITIS PATTERN (shows HIGH risk XHI)
    const cow3Id = 'COW-103';
    const cow3: AnimalProfile = {
        id: cow3Id,
        species: 'Cow',
        registeredAt: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
            breed: 'Jersey',
            age: 5,
            weight: 420,
        },
    };
    animals.set(cow3Id, cow3);

    // Baseline
    const cow3Baseline: AnimalBaseline = {
        animalId: cow3Id,
        avgSpeed: 3.2,
        avgVisitsPerDay: 8,
        avgActivityLevel: 920,
        speedStdDev: 0.35,
        activityStdDev: 75,
        baselineStartDate: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        baselineStatus: 'STABLE',
        dataPointsCollected: 30,
        requiredDataPoints: 20,
    };
    animalBaselines.set(cow3Id, cow3Baseline);

    // Severe deviation pattern (mastitis-like)
    const cow3Deviations: DailyDeviation[] = [
        { date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -18.2, speedDeltaPct: -5.2, visitDeltaPct: -22.4, flagCount: 2 },
        { date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -24.6, speedDeltaPct: -7.8, visitDeltaPct: -28.9, flagCount: 2 },
        { date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -28.3, speedDeltaPct: -9.4, visitDeltaPct: -32.7, flagCount: 2 },
        { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -31.5, speedDeltaPct: -11.2, visitDeltaPct: -38.5, flagCount: 2 },
        { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -33.8, speedDeltaPct: -12.6, visitDeltaPct: -42.3, flagCount: 2 },
        { date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: -35.2, speedDeltaPct: -14.1, visitDeltaPct: -45.6, flagCount: 2 },
        { date: now.toISOString().split('T')[0], activityDeltaPct: -36.8, speedDeltaPct: -15.3, visitDeltaPct: -48.2, flagCount: 2 },
    ];
    dailyDeviations.set(cow3Id, cow3Deviations);

    // Demo Animal 4: BUFFALO still in LEARNING (for comparison)
    const buf1Id = 'BUFFALO-201';
    const buf1: AnimalProfile = {
        id: buf1Id,
        species: 'Buffalo',
        registeredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        metadata: {
            breed: 'Murrah',
            age: 4,
            weight: 650,
        },
    };
    animals.set(buf1Id, buf1);

    // Still learning
    const buf1Baseline: AnimalBaseline = {
        animalId: buf1Id,
        avgSpeed: 2.8,
        avgVisitsPerDay: 5.2,
        avgActivityLevel: 780,
        speedStdDev: 0.3,
        activityStdDev: 65,
        baselineStartDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        baselineStatus: 'LEARNING',
        dataPointsCollected: 5,
        requiredDataPoints: 20,
    };
    animalBaselines.set(buf1Id, buf1Baseline);

    // ========================================
    // POPULATE HEALTH METRICS AND ASSESSMENTS
    // ========================================

    // Helper function to add realistic health metrics over time
    function addHealthMetricsHistory(animalId: string, baseline: AnimalBaseline, deviations: DailyDeviation[], daysBack: number = 7) {
        for (let i = daysBack; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const deviation = deviations.find(d => d.date === date.toISOString().split('T')[0]) || deviations[0];

            const metrics: HealthMetrics = {
                animalId,
                timestamp: date.toISOString(),
                activityLevel: Math.round(baseline.avgActivityLevel * (1 + deviation.activityDeltaPct / 100)),
                visitFrequency24h: Math.round(baseline.avgVisitsPerDay * (1 + deviation.visitDeltaPct / 100)),
                visitFrequency48h: Math.round(baseline.avgVisitsPerDay * 2 * (1 + deviation.visitDeltaPct / 100)),
                averageSpeed: parseFloat((baseline.avgSpeed * (1 + deviation.speedDeltaPct / 100)).toFixed(2)),
                speedDeviation: baseline.speedStdDev,
            };

            if (!healthMetrics.has(animalId)) {
                healthMetrics.set(animalId, []);
            }
            healthMetrics.get(animalId)!.push(metrics);

            // Add detection event
            const event: DetectionEvent = {
                id: generateId(),
                animalId,
                timestamp: date.toISOString(),
                confidence: 0.92 + Math.random() * 0.07, // 0.92-0.99
                source: 'Corridor' as DetectionSource,
            };
            detectionEvents.push(event);
        }
    }

    // COW-101: Healthy - add 7 days of stable metrics
    addHealthMetricsHistory(cow1Id, cow1Baseline, cow1Deviations, 7);

    // Create latest risk assessment for COW-101 (LOW risk)
    const cow1Assessment: PersonalizedRiskAssessment = {
        animalId: cow1Id,
        timestamp: now.toISOString(),
        riskLevel: 'LOW',
        riskScore: 12,
        signals: {
            activityDrop: false,
            speedAnomaly: false,
            visitReduction: false,
        },
        contributingFactors: ['All behavioral metrics within normal range'],
        baselineUsed: true,
        deviationScore: 2.1,
        baselineStatus: 'STABLE',
    };
    riskAssessments.set(cow1Id, cow1Assessment);

    // COW-102: Early Lameness - add 7 days showing progressive decline
    addHealthMetricsHistory(cow2Id, cow2Baseline, cow2Deviations, 7);

    // Create MODERATE risk assessment for COW-102
    const cow2Assessment: PersonalizedRiskAssessment = {
        animalId: cow2Id,
        timestamp: now.toISOString(),
        riskLevel: 'MODERATE',
        riskScore: 38,
        signals: {
            activityDrop: true,
            speedAnomaly: true,
            visitReduction: true,
        },
        contributingFactors: [
            'Activity 11.7% below personal baseline',
            'Visit frequency 15.3% below personal baseline',
            'Speed 10.4% below personal baseline - consistent micro-drift for 5 consecutive days'
        ],
        baselineUsed: true,
        deviationScore: 12.5,
        baselineStatus: 'STABLE',
    };

    // Generate XHI explanation for COW-102
    const cow2CurrentMetrics: HealthMetrics = {
        animalId: cow2Id,
        timestamp: now.toISOString(),
        activityLevel: Math.round(cow2Baseline.avgActivityLevel * (1 + cow2Deviations[6].activityDeltaPct / 100)),
        visitFrequency24h: Math.round(cow2Baseline.avgVisitsPerDay * (1 + cow2Deviations[6].visitDeltaPct / 100)),
        visitFrequency48h: Math.round(cow2Baseline.avgVisitsPerDay * 2 * (1 + cow2Deviations[6].visitDeltaPct / 100)),
        averageSpeed: parseFloat((cow2Baseline.avgSpeed * (1 + cow2Deviations[6].speedDeltaPct / 100)).toFixed(2)),
        speedDeviation: cow2Baseline.speedStdDev,
    };
    cow2Assessment.explanation = generateHealthExplanation(
        cow2Assessment,
        cow2CurrentMetrics,
        cow2Baseline,
        5, // 5 days of consistent drift
        'EARLY_DRIFT'
    );

    riskAssessments.set(cow2Id, cow2Assessment);

    // Create Gemini alert for COW-102
    const cow2Alert: GeminiAlert = {
        id: generateId(),
        animalId: cow2Id,
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        severity: 'MODERATE' as RiskLevel,
        explanation: 'COW-102 has shown consistent behavioral deviations over the past 5 days. Activity decreased by 11.7%, speed by 10.4%, and visit frequency by 15.3% compared to personal baseline. This pattern is consistent with early-stage lameness or hoof discomfort. Based on the behavioral pattern analysis, this animal is showing early signs of mobility issues. The gradual decline in activity and speed over multiple consecutive days, combined with reduced feeding visits, suggests developing lameness. Early intervention with hoof inspection and potential trimming can prevent more serious complications. This is a preventive alert - the condition has not yet reached critical stage.',
        recommendations: [
            'Perform visual hoof inspection',
            'Check for signs of lameness or limping',
            'Monitor walking pattern in corridor',
            'Consider hoof trimming if overgrowth detected',
            'Schedule preventive veterinary check-up within 24-48 hours'
        ],
        signals: cow2Assessment.signals,
        riskScore: cow2Assessment.riskScore,
    };
    geminiAlerts.push(cow2Alert);

    // COW-103: Mastitis pattern - add 7 days showing severe decline
    addHealthMetricsHistory(cow3Id, cow3Baseline, cow3Deviations, 7);

    // Create HIGH risk assessment for COW-103
    const cow3Assessment: PersonalizedRiskAssessment = {
        animalId: cow3Id,
        timestamp: now.toISOString(),
        riskLevel: 'HIGH',
        riskScore: 82,
        signals: {
            activityDrop: true,
            speedAnomaly: true,
            visitReduction: true,
        },
        contributingFactors: [
            'Activity 36.8% below personal baseline - SEVERE',
            'Visit frequency 48.2% below personal baseline - CRITICAL',
            'Speed 15.3% below personal baseline',
            'Sustained severe deviations for 7 consecutive days'
        ],
        baselineUsed: true,
        deviationScore: 33.4,
        baselineStatus: 'STABLE',
    };

    // Generate XHI explanation for COW-103
    const cow3CurrentMetrics: HealthMetrics = {
        animalId: cow3Id,
        timestamp: now.toISOString(),
        activityLevel: Math.round(cow3Baseline.avgActivityLevel * (1 + cow3Deviations[6].activityDeltaPct / 100)),
        visitFrequency24h: Math.round(cow3Baseline.avgVisitsPerDay * (1 + cow3Deviations[6].visitDeltaPct / 100)),
        visitFrequency48h: Math.round(cow3Baseline.avgVisitsPerDay * 2 * (1 + cow3Deviations[6].visitDeltaPct / 100)),
        averageSpeed: parseFloat((cow3Baseline.avgSpeed * (1 + cow3Deviations[6].speedDeltaPct / 100)).toFixed(2)),
        speedDeviation: cow3Baseline.speedStdDev,
    };
    cow3Assessment.explanation = generateHealthExplanation(
        cow3Assessment,
        cow3CurrentMetrics,
        cow3Baseline,
        7, // 7 days of sustained severe deviations
        'ACTION_REQUIRED'
    );

    riskAssessments.set(cow3Id, cow3Assessment);

    // Create Gemini alert for COW-103 (HIGH severity)
    const cow3Alert: GeminiAlert = {
        id: generateId(),
        animalId: cow3Id,
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
        severity: 'HIGH' as RiskLevel,
        explanation: 'URGENT ACTION REQUIRED: COW-103 (Jersey, 5 years) is exhibiting severe behavioral changes indicating a serious health issue. Activity has dropped 36.8% below baseline, with visit frequency down 48.2% over the past week. This pattern is consistent with systemic illness such as mastitis, metritis, or severe metabolic disorder. This animal is showing a severe and sustained decline in all key behavioral indicators over one week. The dramatic reduction in feeding visits (48%) combined with significantly decreased activity suggests the animal is experiencing severe discomfort or systemic illness. The pattern strongly indicates mastitis or a related infectious/inflammatory condition. Immediate veterinary intervention is essential to prevent further deterioration and potential complications.',
        recommendations: [
            '⚠️ IMMEDIATE veterinary examination required',
            'Check body temperature (normal: 38.5°C)',
            'Perform mastitis screening (CMT test)',
            'Inspect udder for heat, swelling, or abnormal milk',
            'Check for signs of fever, lethargy, or reduced appetite',
            'Consider blood work to rule out metabolic issues',
            'Isolate from herd if contagious disease suspected'
        ],
        signals: cow3Assessment.signals,
        riskScore: cow3Assessment.riskScore,
    };
    geminiAlerts.push(cow3Alert);

    // BUFFALO-201: Still learning - add 3 days of initial data
    const buf1Deviations: DailyDeviation[] = [
        { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: 0, speedDeltaPct: 0, visitDeltaPct: 0, flagCount: 0 },
        { date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], activityDeltaPct: 0, speedDeltaPct: 0, visitDeltaPct: 0, flagCount: 0 },
        { date: now.toISOString().split('T')[0], activityDeltaPct: 0, speedDeltaPct: 0, visitDeltaPct: 0, flagCount: 0 },
    ];
    addHealthMetricsHistory(buf1Id, buf1Baseline, buf1Deviations, 3);

    // LOW risk for buffalo (learning phase)
    const buf1Assessment: PersonalizedRiskAssessment = {
        animalId: buf1Id,
        timestamp: now.toISOString(),
        riskLevel: 'LOW',
        riskScore: 0,
        signals: {
            activityDrop: false,
            speedAnomaly: false,
            visitReduction: false,
        },
        contributingFactors: ['Baseline learning in progress - health monitoring will activate once stable'],
        baselineUsed: false,
        deviationScore: 0,
        baselineStatus: 'LEARNING',
        learningProgress: 0.25, // 25% complete
    };
    riskAssessments.set(buf1Id, buf1Assessment);

    console.log(`[DataStore] Initialized with ${animals.size} sample animals(${Array.from(animals.values()).filter(a => {
        const baseline = animalBaselines.get(a.id);
        return baseline?.baselineStatus === 'STABLE';
    }).length
        } with STABLE baselines)`);
}

// Animal CRUD operations
export function createAnimal(species: AnimalSpecies, metadata?: AnimalProfile['metadata']): AnimalProfile {
    const animal: AnimalProfile = {
        id: generateAnimalId(species),
        species,
        registeredAt: new Date().toISOString(),
        metadata,
    };

    animals.set(animal.id, animal);

    // Create baseline
    const baseline: HealthBaseline = {
        animalId: animal.id,
        avgActivityLevel: 1000,
        avgVisitFrequency: 6,
        avgSpeed: 3.5,
        speedStdDev: 0.5,
        calculatedAt: new Date().toISOString(),
    };
    healthBaselines.set(animal.id, baseline);

    // Create personalized baseline
    const personalBaseline = initializeBaseline(animal.id);
    animalBaselines.set(animal.id, personalBaseline);

    return animal;
}

export function getAnimal(animalId: string): AnimalProfile | undefined {
    return animals.get(animalId);
}

export function getAllAnimals(): AnimalProfile[] {
    return Array.from(animals.values());
}

// Detection event operations
export function createDetectionEvent(event: Omit<DetectionEvent, 'id'>): DetectionEvent {
    const fullEvent: DetectionEvent = {
        id: generateId(),
        ...event,
    };

    detectionEvents.push(fullEvent);

    // Limit to last 1000 events
    if (detectionEvents.length > 1000) {
        detectionEvents.shift();
    }

    return fullEvent;
}

export function getDetectionEvents(animalId?: string, limit = 50): DetectionEvent[] {
    let events = animalId
        ? detectionEvents.filter((e) => e.animalId === animalId)
        : detectionEvents;

    return events.slice(-limit).reverse();
}

// Health metrics operations
export function addHealthMetrics(metrics: HealthMetrics): void {
    const animalMetrics = healthMetrics.get(metrics.animalId) || [];
    animalMetrics.push(metrics);

    // Keep only last 100 metrics per animal
    if (animalMetrics.length > 100) {
        animalMetrics.shift();
    }

    healthMetrics.set(metrics.animalId, animalMetrics);
}

export function getHealthMetrics(animalId: string, limit = 20): HealthMetrics[] {
    const metrics = healthMetrics.get(animalId) || [];
    return metrics.slice(-limit);
}

// Risk assessment operations
export function setRiskAssessment(assessment: RiskAssessment): void {
    riskAssessments.set(assessment.animalId, assessment);
}

export function getRiskAssessment(animalId: string): RiskAssessment | undefined {
    return riskAssessments.get(animalId);
}

export function getAllRiskAssessments(): RiskAssessment[] {
    return Array.from(riskAssessments.values());
}

// Gemini alert operations
export function createGeminiAlert(alert: Omit<GeminiAlert, 'id'>): GeminiAlert {
    const fullAlert: GeminiAlert = {
        id: generateId(),
        ...alert,
    };

    geminiAlerts.push(fullAlert);

    // Keep only last 100 alerts
    if (geminiAlerts.length > 100) {
        geminiAlerts.shift();
    }

    return fullAlert;
}

export function getGeminiAlerts(animalId?: string, limit = 50): GeminiAlert[] {
    let alerts = animalId
        ? geminiAlerts.filter((a) => a.animalId === animalId)
        : geminiAlerts;

    return alerts.slice(-limit).reverse();
}

// Baseline operations
export function getHealthBaseline(animalId: string): HealthBaseline | undefined {
    return healthBaselines.get(animalId);
}

export function updateHealthBaseline(baseline: HealthBaseline): void {
    healthBaselines.set(baseline.animalId, baseline);
}

// Personalized baseline operations
export function getAnimalBaseline(animalId: string): AnimalBaseline | undefined {
    return animalBaselines.get(animalId);
}

export function setAnimalBaseline(baseline: AnimalBaseline): void {
    animalBaselines.set(baseline.animalId, baseline);
}

export function getAllAnimalBaselines(): AnimalBaseline[] {
    return Array.from(animalBaselines.values());
}

// Utility: Get animal or create if doesn't exist
export function getOrCreateAnimal(animalId?: string, species: AnimalSpecies = 'Cow'): AnimalProfile {
    if (animalId) {
        const existing = getAnimal(animalId);
        if (existing) return existing;
    }

    return createAnimal(species);
}

// Daily deviation operations
export function storeDeviation(animalId: string, deviation: DailyDeviation): void {
    const history = dailyDeviations.get(animalId) || [];

    // Avoid duplicate entries for the same date
    const existingIndex = history.findIndex(d => d.date === deviation.date);
    if (existingIndex >= 0) {
        history[existingIndex] = deviation;
    } else {
        history.push(deviation);
    }

    // Keep only last 30 days
    if (history.length > 30) {
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        history.length = 30;
    }

    dailyDeviations.set(animalId, history);
}

export function getDeviationHistory(animalId: string, days = 30): DailyDeviation[] {
    const history = dailyDeviations.get(animalId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return history
        .filter(d => new Date(d.date) >= cutoffDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Early warning operations
export function getEarlyWarning(animalId: string): EarlyWarningAssessment | undefined {
    return earlyWarnings.get(animalId);
}

export function setEarlyWarning(warning: EarlyWarningAssessment): void {
    earlyWarnings.set(warning.animalId, warning);
}

export function getAllEarlyWarnings(): EarlyWarningAssessment[] {
    return Array.from(earlyWarnings.values());
}

// Initialize seed data on module load
initializeSeedData();
