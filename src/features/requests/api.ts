import { api } from '../../shared/api/client';
export interface Appliance {
  id: number;
  name: string;
  category: string;
  brand: string;
  model: string;
}

export interface ServiceRequest {
  id: number;
  applianceId: number;
  applianceName?: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface CreateRequestInput {
  applianceId: number;
  description: string;
}

// Obtener catálogo de electrodomésticos
export const getAppliances = () =>
  api.request<Appliance[]>('/appliances');

// Obtener las solicitudes del cliente autenticado
export const getMyRequests = () =>
  api.request<ServiceRequest[]>('/requests');

// Crear una nueva solicitud
export const createRequest = (data: CreateRequestInput) =>
  api.request<ServiceRequest>('/requests', {
    method: 'POST',
    body: data,
  });