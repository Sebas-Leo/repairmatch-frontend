import type {
  MatchingRequest,
  Proposal,
  ServiceRequest,
} from '../shared/api/types';

export function aRequest(
  overrides: Partial<ServiceRequest> = {},
): ServiceRequest {
  return {
    id: 7,
    clientId: 'c1',
    applianceTypeId: 1,
    applianceTypeName: 'Refrigerator',
    originalDescription: 'It stopped cooling yesterday.',
    brand: 'Samsung',
    model: 'RT38',
    status: 'PUBLICADA',
    latitude: -12.04,
    longitude: -77.04,
    createdAt: '2026-11-10T10:30:00',
    ...overrides,
  };
}

export function aProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 31,
    requestId: 7,
    technicianId: 't1',
    technicianName: 'Tito Tech',
    diagnosticCost: 45.5,
    availableAt: '2026-11-13T09:00:00',
    conditions: 'Diagnosis at home, parts quoted separately.',
    createdAt: '2026-11-10T12:00:00',
    status: 'PENDING',
    ...overrides,
  };
}

export function anOpportunity(
  overrides: Partial<MatchingRequest> = {},
): MatchingRequest {
  return {
    requestId: 7,
    applianceTypeName: 'Washing machine',
    brand: 'LG',
    model: null,
    description: 'It does not spin.',
    status: 'PUBLICADA',
    distanceKm: 2.345,
    ...overrides,
  };
}
