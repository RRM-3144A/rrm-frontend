import {mockAvailability} from '@/lib/mock/availability';
import type {AvailabilitySlot, Resource} from '@/lib/types';

/** Slots of a resource between two days (inclusive), like GET /resources/{id}/availability. */
export function getAvailability(resource: Resource, from: Date, to: Date): AvailabilitySlot[] {
  return mockAvailability(resource, from, to);
}
