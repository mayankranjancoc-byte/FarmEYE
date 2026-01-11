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

/**
 * Baseline learning status
 */
export type BaselineStatus = 'LEARNING' | 'STABLE';

/**
 * Personalized baseline for individual animal behavior tracking
 */
export interface AnimalBaseline {
  animalId: string;
  avgSpeed: number;
  avgVisitsPerDay: number;
  avgActivityLevel: number;
  speedStdDev: number;
  activityStdDev: number;
  baselineStartDate: string; // ISO-8601
  baselineStatus: BaselineStatus;
  dataPointsCollected: number;
  requiredDataPoints: number; // Minimum data points needed for stable baseline
}

/**
 * Personalized risk assessment using individual baseline
 */
export interface PersonalizedRiskAssessment extends RiskAssessment {
  baselineUsed: boolean;
  deviationScore: number; // % deviation from personal baseline
  baselineStatus: BaselineStatus;
  learningProgress?: number; // 0-1 range, only present during LEARNING
  explanation?: HealthExplanation; // XHI: Full explanation of the assessment
}

/**
 * Daily deviation snapshot for Early Health Drift Detection (EHDD)
 */
export interface DailyDeviation {
  date: string; // ISO-8601 date string (YYYY-MM-DD)
  activityDeltaPct: number; // % change from personal baseline
  speedDeltaPct: number; // % change from personal baseline
  visitDeltaPct: number; // % change from personal baseline
  flagCount: number; // Number of signals exceeding 5-15% threshold
}

/**
 * Drift detection states for early warning system
 */
export type DriftState = 'STABLE' | 'EARLY_DRIFT' | 'ACTION_REQUIRED';

/**
 * Early warning assessment from drift detection
 */
export interface EarlyWarningAssessment {
  animalId: string;
  driftState: DriftState;
  consecutiveDaysWithDrift: number;
  recentDeviations: DailyDeviation[]; // Last 7 days
  triggeredSignals: string[]; // Which metrics are drifting (activity, speed, visits)
  earlyWarningMessage?: string;
}

/**
 * Confidence level for health assessments (XHI)
 */
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Individual signal contributor to health score (XHI)
 */
export interface SignalContributor {
  signal: string; // Human-readable signal name
  impact: number; // Negative contribution to health (always ≥ 0)
  detail: string; // Specific measurement that triggered it
}

/**
 * Complete health explanation for transparency and auditability (XHI)
 */
export interface HealthExplanation {
  healthScore: number; // 0-100, where 100 = perfect health
  contributors: SignalContributor[];
  confidenceLevel: ConfidenceLevel;
  consistencyDays: number; // How many days pattern has persisted
  baselineReference: string; // What baseline was used
  recommendation: string; // Clear action recommendation
}
