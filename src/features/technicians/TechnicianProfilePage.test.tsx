import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listApplianceTypes } from '../applianceTypes/api';
import { ApiError } from '../../shared/api/http';
import type { ApplianceType, TechnicianProfile } from '../../shared/api/types';
import { renderPage } from '../../test/renderPage';
import {
  getOwnTechnicianProfile,
  updateOwnTechnicianProfile,
  updateServiceArea,
} from './api';
import { TechnicianProfilePage } from './TechnicianProfilePage';
import {
  extractCoordsFromText,
  formatGeocodedItem,
  latLngToWorldPx,
  parseDecimal,
  reverseGeocodeMapPin,
  searchMapAddresses,
  validateProfile,
  validateServiceArea,
  worldPxToLatLng,
} from './validation';

vi.mock('../applianceTypes/api', () => ({ listApplianceTypes: vi.fn() }));
vi.mock('./api', () => ({
  getOwnTechnicianProfile: vi.fn(),
  updateOwnTechnicianProfile: vi.fn(),
  updateServiceArea: vi.fn(),
}));

const PATH = '/technician/profile';

const TYPES: ApplianceType[] = [
  { id: 1, name: 'Refrigerator', description: 'Cooling and freezer units' },
  { id: 2, name: 'Washing machine', description: null },
];

function aProfile(
  overrides: Partial<TechnicianProfile> = {},
): TechnicianProfile {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    fullName: 'Tito Tech',
    email: 'technician@example.test',
    experienceYears: 5,
    phone: '+51999888777',
    bio: 'Especialista en compresores inverter.',
    latitude: -12.0464,
    longitude: -77.0428,
    maxRadiusKm: 15,
    applianceTypes: ['Refrigerator'],
    ...overrides,
  };
}

function setup() {
  return renderPage(<TechnicianProfilePage />, {
    path: PATH,
    role: 'TECHNICIAN',
  });
}

describe('TechnicianProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getOwnTechnicianProfile).mockReset();
    vi.mocked(updateOwnTechnicianProfile).mockReset();
    vi.mocked(updateServiceArea).mockReset();
    vi.mocked(listApplianceTypes).mockReset();
    vi.mocked(listApplianceTypes).mockResolvedValue(TYPES);

    // Simulador dinámico de geocodificación para pruebas offline en Vitest
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const parsedUrl = new URL(String(input));
        if (parsedUrl.pathname.includes('/reverse')) {
          const lat = parsedUrl.searchParams.get('lat') ?? '-12.1219';
          const lon = parsedUrl.searchParams.get('lon') ?? '-77.0297';
          return Response.json({
            place_id: 500,
            lat,
            lon,
            display_name: 'Av. José Larco, Miraflores, Lima, Perú',
            address: {
              road: 'Av. José Larco',
              city_district: 'Miraflores',
              city: 'Lima',
              country: 'Perú',
            },
          });
        }

        const q = parsedUrl.searchParams.get('q') ?? 'Lima';
        return Response.json([
          {
            place_id: 201,
            lat: '-12.1219',
            lon: '-77.0297',
            name: q,
            display_name: `${q}, Miraflores, Lima, Perú`,
            address: {
              road: q,
              city_district: 'Miraflores',
              city: 'Lima',
              country: 'Perú',
            },
          },
          {
            place_id: 202,
            lat: '-12.0972',
            lon: '-77.0325',
            name: q,
            display_name: `${q}, San Isidro, Lima, Perú`,
            address: {
              road: q,
              city_district: 'San Isidro',
              city: 'Lima',
              country: 'Perú',
            },
          },
        ]);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the current profile, specialties and interactive Google Maps canvas', async () => {
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Perfil' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Años de experiencia')).toHaveValue('5');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('+51999888777');
    expect(screen.getByLabelText('Biografía')).toHaveValue(
      'Especialista en compresores inverter.',
    );
    expect(
      screen.getByRole('checkbox', { name: /Refrigeradora/ }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Lavadora/ }),
    ).not.toBeChecked();

    expect(
      screen.getByRole('application', {
        name: 'Mapa interactivo de Google Maps',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Radio (km)')).toHaveValue('15');
    expect(screen.getByText('Radio de 15 km')).toBeInTheDocument();
  });

  it('toggles progressive disclosure details in specialties', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    await user.click(await screen.findByRole('button', { name: 'Saber más' }));
    expect(
      screen.getByText('Filtro inteligente de compatibilidad'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cooling and freezer units')).toBeInTheDocument();
  });

  it('starts with blank fields when the profile has not been set up yet', async () => {
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'New Tech',
      email: 'new@example.test',
      applianceTypes: [],
    });
    setup();

    expect(await screen.findByText('Sin configurar')).toBeInTheDocument();
    expect(screen.getByLabelText('Años de experiencia')).toHaveValue('');
    expect(screen.getByText('Ubicación en Google Maps')).toBeInTheDocument();
  });

  it('validates the profile form before calling the backend', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    const exp = await screen.findByLabelText('Años de experiencia');
    await user.clear(exp);
    await user.type(exp, '90');
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Años de experiencia: Ingresa un número entero entre 0 y 70.',
    );
    expect(updateOwnTechnicianProfile).not.toHaveBeenCalled();
  });

  it('saves the profile and toggles appliance specialties', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateOwnTechnicianProfile).mockResolvedValue(
      aProfile({
        experienceYears: 8,
        phone: '+51911222333',
        bio: 'Biografía actualizada',
        applianceTypes: ['Washing machine'],
      }),
    );
    setup();

    const exp = await screen.findByLabelText('Años de experiencia');
    await user.clear(exp);
    await user.type(exp, '8');

    const phone = screen.getByLabelText('Teléfono');
    await user.clear(phone);
    await user.type(phone, '  +51911222333  ');

    const bio = screen.getByLabelText('Biografía');
    await user.clear(bio);
    await user.type(bio, '  Biografía actualizada  ');

    await user.click(screen.getByRole('checkbox', { name: /Refrigeradora/ }));
    await user.click(screen.getByRole('checkbox', { name: /Lavadora/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(updateOwnTechnicianProfile).toHaveBeenCalledWith({
      experienceYears: 8,
      phone: '+51911222333',
      bio: 'Biografía actualizada',
      applianceTypeIds: [2],
    });
    expect(await screen.findByText('Perfil actualizado.')).toBeInTheDocument();
  });

  it('sends null when optional profile fields are left blank', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    await user.clear(await screen.findByLabelText('Años de experiencia'));
    await user.clear(screen.getByLabelText('Teléfono'));
    await user.clear(screen.getByLabelText('Biografía'));
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(updateOwnTechnicianProfile).toHaveBeenCalledWith({
      experienceYears: null,
      phone: null,
      bio: null,
      applianceTypeIds: [1],
    });
  });

  it('queries real geocoded addresses for any place and selects a suggestion', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateServiceArea).mockResolvedValue(
      aProfile({ latitude: -12.1219, longitude: -77.0297, maxRadiusKm: 25 }),
    );
    setup();

    const search = await screen.findByLabelText('Dirección');
    await user.type(search, 'Av. Larco 450');

    const listbox = await screen.findByRole('listbox', {
      name: 'Sugerencias de dirección',
    });
    const option = within(listbox).getByRole('button', {
      name: /Av\. Larco 450, Miraflores, Lima, Perú/i,
    });
    await user.click(option);

    await user.click(screen.getByRole('button', { name: 'Mi casa' }));
    await user.click(screen.getByRole('button', { name: '25 km' }));
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );

    expect(updateServiceArea).toHaveBeenCalledWith({
      latitude: -12.1219,
      longitude: -77.0297,
      maxRadiusKm: 25,
    });
    expect(
      await screen.findByText('Zona de servicio actualizada.'),
    ).toBeInTheDocument();
  });

  it('pans the map, zooms in/out and drags the pin in sync with the current zoom', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateServiceArea).mockResolvedValue(
      aProfile({ latitude: -12.0464, longitude: -77.0428, maxRadiusKm: 10 }),
    );
    setup();

    const mapSurface = await screen.findByRole('application', {
      name: 'Mapa interactivo de Google Maps',
    });

    await user.click(screen.getByRole('button', { name: 'Acercar mapa' }));
    await user.click(screen.getByRole('button', { name: 'Alejar mapa' }));

    fireEvent.mouseDown(mapSurface, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(mapSurface, { clientX: 240, clientY: 220 });
    fireEvent.mouseUp(mapSurface);

    await user.click(
      screen.getByRole('button', { name: 'Traer pin al centro' }),
    );

    const pinBtn = screen.getByRole('button', {
      name: 'Arrastrar pin de ubicación exacta',
    });
    fireEvent.mouseDown(pinBtn, { clientX: 300, clientY: 190 });
    fireEvent.mouseMove(mapSurface, { clientX: 330, clientY: 210 });
    fireEvent.mouseUp(mapSurface);

    await user.click(screen.getByRole('button', { name: '10 km' }));
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );
    expect(updateServiceArea).toHaveBeenCalled();
  });

  it('extracts coordinates when pasting a Google Maps URL in the address box', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateServiceArea).mockResolvedValue(
      aProfile({ latitude: -12.1219, longitude: -77.0297, maxRadiusKm: 5 }),
    );
    setup();

    const search = await screen.findByLabelText('Dirección');
    await user.clear(search);
    await user.type(
      search,
      'https://www.google.com/maps/@-12.1219,-77.0297,15z',
    );
    await user.click(screen.getByRole('button', { name: '5 km' }));
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );

    expect(updateServiceArea).toHaveBeenCalledWith({
      latitude: -12.1219,
      longitude: -77.0297,
      maxRadiusKm: 5,
    });
  });

  it('detects current location via browser geolocation GPS', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateServiceArea).mockResolvedValue(
      aProfile({ latitude: -12.1072, longitude: -76.9992, maxRadiusKm: 15 }),
    );

    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: -12.1072, longitude: -76.9992 },
      } as GeolocationPosition);
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition },
    });

    setup();
    await user.click(
      await screen.findByRole('button', { name: 'Usar mi ubicación actual' }),
    );

    expect(
      await screen.findByText('Ubicación actual detectada en Google Maps.'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );
    expect(updateServiceArea).toHaveBeenCalledWith({
      latitude: -12.1072,
      longitude: -76.9992,
      maxRadiusKm: 15,
    });
  });

  it('keeps the coordinates when the reverse geocoder fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateServiceArea).mockResolvedValue(aProfile());
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: { latitude: -12.1072, longitude: -76.9992 },
          } as GeolocationPosition);
        },
      },
    });

    setup();
    await user.click(
      await screen.findByRole('button', { name: 'Usar mi ubicación actual' }),
    );
    expect(
      await screen.findByText('Ubicación actual detectada en Google Maps.'),
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Dirección')).toHaveValue(
      'San Borja, Lima, Perú',
    );
  });

  it('notifies when GPS geolocation permission is denied', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());

    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.({ code: 1, message: 'Denied' } as GeolocationPositionError);
      },
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition },
    });

    setup();
    await user.click(
      await screen.findByRole('button', { name: 'Usar mi ubicación actual' }),
    );

    expect(
      await screen.findByText(
        'No se pudo obtener tu ubicación actual. Búscala en el mapa.',
      ),
    ).toBeInTheDocument();
  });

  it('validates manual coordinates before calling the backend', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    await user.click(
      await screen.findByRole('button', { name: 'Ajustar pin' }),
    );
    const lat = screen.getByLabelText('Latitud');
    const lng = screen.getByLabelText('Longitud');
    const radius = screen.getByLabelText('Radio (km)');

    await user.clear(lat);
    await user.type(lat, '95');
    await user.clear(lng);
    await user.type(lng, '-195');
    await user.clear(radius);
    await user.type(radius, '40');
    await user.clear(radius);
    await user.type(radius, '0');
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Ubicación en el mapa: Usa una latitud entre -90 y 90.',
    );
    expect(alert).toHaveTextContent(
      'Longitud: Usa una longitud entre -180 y 180.',
    );
    expect(alert).toHaveTextContent(
      'Radio (km): Elige un radio entre 1 y 300 km.',
    );
    expect(updateServiceArea).not.toHaveBeenCalled();
  });

  it('shows server validation errors in the corresponding form', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateOwnTechnicianProfile).mockRejectedValue(
      new ApiError(400, 'Bad request', {
        message: 'Datos inválidos',
        errors: {
          phone: 'Teléfono inválido',
          applianceTypeIds: 'Selecciona al menos un equipo',
        },
      }),
    );
    vi.mocked(updateServiceArea).mockRejectedValue(
      new ApiError(400, 'Bad request', {
        message: 'Coordenadas inválidas',
      }),
    );
    setup();

    await screen.findByLabelText('Teléfono');
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    const profileCard = screen.getByRole('region', {
      name: 'Datos profesionales',
    });
    expect(await within(profileCard).findByRole('alert')).toHaveTextContent(
      'Teléfono: Teléfono inválido',
    );
    expect(
      within(profileCard).getByText('Selecciona al menos un equipo'),
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );
    const areaCard = screen.getByRole('region', { name: 'Zona de servicio' });
    expect(await within(areaCard).findByRole('alert')).toHaveTextContent(
      'Coordenadas inválidas',
    );
  });

  it('shows an error state when initial loading fails', async () => {
    vi.mocked(getOwnTechnicianProfile).mockRejectedValue(
      new ApiError(403, 'Forbidden', { message: 'Acceso denegado' }),
    );
    setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Acceso denegado',
    );
  });
});

describe('validateProfile, validateServiceArea, Web Mercator and geocoding helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('checks profile field bounds', () => {
    expect(
      validateProfile({
        experienceYears: '',
        phone: '',
        bio: '',
        applianceTypeIds: [],
      }),
    ).toEqual({});

    expect(
      validateProfile({
        experienceYears: '4.5',
        phone: '1'.repeat(21),
        bio: 'x'.repeat(1001),
        applianceTypeIds: [],
      }),
    ).toEqual({
      experienceYears: 'Ingresa un número entero entre 0 y 70.',
      phone: 'Usa como máximo 20 caracteres.',
      bio: 'Usa menos de 1000 caracteres.',
    });
  });

  it('converts lat/lng to Web Mercator world pixels and back accurately at any zoom', () => {
    const px = latLngToWorldPx(-12.0464, -77.0428, 16);
    const roundtrip = worldPxToLatLng(px.x, px.y, 16);
    expect(roundtrip.latitude).toBeCloseTo(-12.0464, 4);
    expect(roundtrip.longitude).toBeCloseTo(-77.0428, 4);
  });

  it('checks required service area fields, coordinate parsing and geocoder formatting', async () => {
    expect(
      validateServiceArea({ latitude: '', longitude: '', maxRadiusKm: '' }),
    ).toEqual({
      latitude: 'Busca tu dirección en Google Maps o usa tu ubicación actual.',
      longitude: 'Selecciona un punto en el mapa para fijar la longitud.',
      maxRadiusKm: 'Ingresa el radio de cobertura.',
    });

    expect(
      validateServiceArea({
        latitude: 'abc',
        longitude: 'xyz',
        maxRadiusKm: 'none',
      }),
    ).toEqual({
      latitude: 'Usa una latitud entre -90 y 90.',
      longitude: 'Usa una longitud entre -180 y 180.',
      maxRadiusKm: 'Elige un radio entre 1 y 300 km.',
    });

    expect(parseDecimal(' -12,05 ')).toBe(-12.05);
    expect(extractCoordsFromText('sin coordenadas')).toBeNull();
    expect(extractCoordsFromText('95.1234, -77.0428')).toBeNull();
    expect(
      extractCoordsFromText('https://maps.google.com/?q=-12.1219,-77.0297'),
    ).toEqual({ latitude: -12.1219, longitude: -77.0297 });

    expect(await searchMapAddresses('a')).toEqual([]);
    expect(
      formatGeocodedItem({
        place_id: 9,
        lat: '-12.1',
        lon: '-77.0',
        display_name: 'Av. Arequipa 1200, Lince, Lima, 15046, Perú',
      }).primary,
    ).toBe('Av. Arequipa 1200, Lince, Lima, Perú');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    expect(await searchMapAddresses('Miraflores')).toEqual([]);
    expect(await reverseGeocodeMapPin(-12.1, -77.0)).toBeNull();
  });
});
