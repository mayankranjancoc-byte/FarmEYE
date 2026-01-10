// Core type definitions for FarmEYE

/**
 * Risk levels for animal health assessment
 */
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

/**
 * Detection sources for animal identification
 */
export type DetectionSource = 'Vision + RFID' | 'Vision Only' | 'RFID Only';

/**
 * Animal species supported by the system
 */
export type AnimalSpecies = 'Cow' | 'Buffalo' | 'Goat' | 'Sheep';

/**
 * Animal profile with registration and identification data
 */
export interface AnimalProfile {
  id: string; // Format: COW-102, BUFFALO-045, etc.
  species: AnimalSpecies;
  registeredAt: string; // ISO-8601 timestamp
  metadata?: {
    breed?: string;
    age?: number;
    weight?: number;
  };
}

/**
 * Detection event when an animal passes through the smart corridor
 */
export interface DetectionEvent {
  id: string;
  animalId: string;
  timestamp: string; // ISO-8601
  confidence: number; // 0-1 range
  source: DetectionSource;
  metadata?: {
    entrySpeed?: number; // km/h
    exitSpeed?: number; // km/h
    durationSeconds?: number;
  };
}

/**
 * Health metrics tracked over time for behavioral analysis
 */
export interface HealthMetrics {
  animalId: string;
  timestamp: string;
  activityLevel: number; // Steps or movement score
  visitFrequency24h: number; // Corridor visits in last 24 hours
  visitFrequency48h: number; // Corridor visits in last 48 hours
  averageSpeed: number; // km/h
  speedDeviation: number; // Standard deviation from baseline
}

/**
 * Individual health risk signals
 */
export interface RiskSignals {
  activityDrop: boolean; // Activity reduced significantly
  speedAnomaly: boolean; // Speed deviation detected
  visitReduction: boolean; // Visit frequency dropped
}

/**
 * Complete risk assessment for an animal
 */
export interface RiskAssessment {
  animalId: string;
  timestamp: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  signals: RiskSignals;
  contributingFactors: string[]; // Human-readable factors
}

/**
 * Livestock Gemini alert with explainable AI reasoning
 */
export interface GeminiAlert {
  id: string;
  animalId: string;
  severity: RiskLevel;
  timestamp: string;
  explanation: string; // Human-readable explanation
  recommendations: string[]; // Actionable advice
  signals: RiskSignals;
  riskScore: number;
}

/**
 * Dashboard summary statistics
 */
export interface DashboardStats {
  totalAnimals: number;
  activeAlerts: number;
  averageHealthScore: number;
  riskDistribution: {
    low: number;
    moderate: number;
    high: number;
  };
  recentDetections: number; // Last 24 hours
}

/**
 * Historical baseline for comparison
 */
export interface HealthBaseline {
  animalId: string;
  avgActivityLevel: number;
  avgVisitFrequency: number;
  avgSpeed: number;
  speedStdDev: number;
  calculatedAt: string;
}
