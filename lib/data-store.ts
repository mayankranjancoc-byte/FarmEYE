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
} from '@/types';
import { initializeBaseline } from './baseline-learning';

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
    return `${prefix}-${id.toString().padStart(3, '0')}`;
}

/**
 * Generate UUID-like ID for events and alerts
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

    console.log(`[DataStore] Initialized with ${animals.size} sample animals (${Array.from(animals.values()).filter(a => {
        const baseline = animalBaselines.get(a.id);
        return baseline?.baselineStatus === 'STABLE';
    }).length} with STABLE baselines)`);
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
