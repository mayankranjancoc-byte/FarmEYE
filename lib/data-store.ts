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

    // Create sample animals
    const sampleSpecies: AnimalSpecies[] = ['Cow', 'Cow', 'Buffalo', 'Goat'];
    const now = new Date();

    sampleSpecies.forEach((species, index) => {
        const animalId = generateAnimalId(species);
        const registeredAt = new Date(now.getTime() - (30 - index * 7) * 24 * 60 * 60 * 1000).toISOString();

        const animal: AnimalProfile = {
            id: animalId,
            species,
            registeredAt,
            metadata: {
                breed: species === 'Cow' ? 'Holstein' : species === 'Buffalo' ? 'Murrah' : 'Jamunapari',
                age: 2 + index,
                weight: species === 'Cow' ? 450 + index * 20 : species === 'Buffalo' ? 550 + index * 15 : 40 + index * 5,
            },
        };

        animals.set(animalId, animal);

        // Create baseline metrics
        const baseline: HealthBaseline = {
            animalId,
            avgActivityLevel: 1000 + index * 100,
            avgVisitFrequency: 6 + index,
            avgSpeed: 3.5 + index * 0.3,
            speedStdDev: 0.5,
            calculatedAt: now.toISOString(),
        };
        healthBaselines.set(animalId, baseline);

        // Create personalized baseline for new learning system
        const personalBaseline = initializeBaseline(animalId);
        animalBaselines.set(animalId, personalBaseline);
    });

    console.log(`[DataStore] Initialized with ${animals.size} sample animals`);
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
