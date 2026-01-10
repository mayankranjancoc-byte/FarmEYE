import { NextRequest, NextResponse } from 'next/server';
import {
    createDetectionEvent,
    getOrCreateAnimal,
    getAnimal,
} from '@/lib/data-store';
import { DetectionEvent, AnimalSpecies, DetectionSource } from '@/types';

/**
 * POST /api/detection
 * Create a new animal detection event
 *
 * Body (optional):
 * {
 *   animalId?: string,  // If not provided, creates new animal
 *   species?: string,   // Default: 'Cow'
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { animalId, species = 'Cow' } = body;

        // Get or create animal
        const animal = getOrCreateAnimal(animalId, species as AnimalSpecies);

        // Generate deterministic confidence score based on animal ID
        // This ensures same animal gets consistent confidence scores
        const hash = animal.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const confidenceVariation = (hash % 13) / 100; // 0-0.12 variation
        const confidence = parseFloat((0.86 + confidenceVariation).toFixed(2));

        // Determine detection source (varies by animal for realism)
        const sources: DetectionSource[] = ['Vision + RFID', 'Vision Only', 'RFID Only'];
        const sourceIndex = hash % sources.length;
        const source = sources[sourceIndex];

        // Create detection event
        const event: Omit<DetectionEvent, 'id'> = {
            animalId: animal.id,
            timestamp: new Date().toISOString(),
            confidence,
            source,
            metadata: {
                entrySpeed: parseFloat((2.5 + (hash % 20) / 10).toFixed(1)),
                exitSpeed: parseFloat((2.8 + (hash % 15) / 10).toFixed(1)),
                durationSeconds: 3 + (hash % 5),
            },
        };

        const detectionEvent = createDetectionEvent(event);

        return NextResponse.json({
            success: true,
            data: {
                event: detectionEvent,
                animal: {
                    id: animal.id,
                    species: animal.species,
                },
            },
        });
    } catch (error) {
        console.error('[API] Detection error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create detection event',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/detection
 * Get detection events
 *
 * Query params:
 * - animalId?: string
 * - limit?: number (default: 50)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const animalId = searchParams.get('animalId') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');

        const events = require('@/lib/data-store').getDetectionEvents(animalId, limit);

        return NextResponse.json({
            success: true,
            data: events,
            count: events.length,
        });
    } catch (error) {
        console.error('[API] Get detection events error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch detection events',
            },
            { status: 500 }
        );
    }
}
