import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  parseDecimal,
  validateProfile,
  validateServiceArea,
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
    bio: 'Specialist in inverter compressors.',
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
  });

  it('loads the current profile, specialties and service area', async () => {
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Perfil' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Años de experiencia')).toHaveValue('5');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('+51999888777');
    expect(screen.getByLabelText('Biografía')).toHaveValue(
      'Specialist in inverter compressors.',
    );
    expect(
      screen.getByRole('checkbox', { name: /Refrigerator/ }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Washing machine/ }),
    ).not.toBeChecked();

    expect(screen.getByLabelText('Latitud')).toHaveValue('-12.0464');
    expect(screen.getByLabelText('Longitud')).toHaveValue('-77.0428');
    expect(screen.getByLabelText('Radio (km)')).toHaveValue('15');
    expect(screen.getByText('15 km radius')).toBeInTheDocument();
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
    expect(screen.getByLabelText('Latitud')).toHaveValue('');
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
        bio: 'Updated bio',
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
    await user.type(bio, '  Updated bio  ');

    await user.click(screen.getByRole('checkbox', { name: /Refrigerator/ }));
    await user.click(screen.getByRole('checkbox', { name: /Washing machine/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(updateOwnTechnicianProfile).toHaveBeenCalledWith({
      experienceYears: 8,
      phone: '+51911222333',
      bio: 'Updated bio',
      applianceTypeIds: [2],
    });
    expect(await screen.findByText('Perfil guardado.')).toBeInTheDocument();
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

  it('validates the service area before calling the backend', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    const lat = await screen.findByLabelText('Latitud');
    const lng = screen.getByLabelText('Longitud');
    const radius = screen.getByLabelText('Radio (km)');

    await user.clear(lat);
    await user.type(lat, '95');
    await user.clear(lng);
    await user.type(lng, '-195');
    await user.clear(radius);
    await user.type(radius, '0');
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Latitud: La latitud debe estar entre -90 y 90.',
    );
    expect(alert).toHaveTextContent(
      'Longitud: La longitud debe estar entre -180 y 180.',
    );
    expect(alert).toHaveTextContent(
      'Radio (km): Elige un radio entre 1 and 300 km.',
    );
    expect(updateServiceArea).not.toHaveBeenCalled();
  });

  it('fills coordinates from a Lima sector preset and saves the service area', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateServiceArea).mockResolvedValue(
      aProfile({ latitude: -12.2125, longitude: -76.9372, maxRadiusKm: 25 }),
    );
    setup();

    await user.click(await screen.findByRole('button', { name: /Lima Sur/ }));
    expect(screen.getByLabelText('Latitud')).toHaveValue('-12.2125');
    expect(screen.getByLabelText('Longitud')).toHaveValue('-76.9372');

    const radius = screen.getByLabelText('Radio (km)');
    await user.clear(radius);
    await user.type(radius, '25');
    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );

    expect(updateServiceArea).toHaveBeenCalledWith({
      latitude: -12.2125,
      longitude: -76.9372,
      maxRadiusKm: 25,
    });
    expect(
      await screen.findByText('Zona de servicio guardada.'),
    ).toBeInTheDocument();
    expect(screen.getByText('25 km radius')).toBeInTheDocument();
  });

  it('shows server validation errors in the corresponding form', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateOwnTechnicianProfile).mockRejectedValue(
      new ApiError(400, 'Bad request', {
        message: 'Invalid profile data',
        errors: {
          phone: 'Invalid phone',
          applianceTypeIds: 'Select at least one appliance',
        },
      }),
    );
    vi.mocked(updateServiceArea).mockRejectedValue(
      new ApiError(400, 'Bad request', {
        message: 'Invalid coordinates',
      }),
    );
    setup();

    await screen.findByLabelText('Teléfono');
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    const profileCard = screen.getByRole('region', {
      name: 'Datos profesionales',
    });
    expect(await within(profileCard).findByRole('alert')).toHaveTextContent(
      'Teléfono: Invalid phone',
    );
    expect(
      within(profileCard).getByText('Select at least one appliance'),
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Guardar zona de servicio' }),
    );
    const areaCard = screen.getByRole('region', { name: 'Zona de servicio' });
    expect(await within(areaCard).findByRole('alert')).toHaveTextContent(
      'Invalid coordinates',
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

describe('validatePerfil and validateServicioArea', () => {
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
      phone: 'Use at most 20 caracteres.',
      bio: 'Usa menos de 1000 caracteres.',
    });
  });

  it('checks required service area fields and numeric formats', () => {
    expect(
      validateServiceArea({ latitude: '', longitude: '', maxRadiusKm: '' }),
    ).toEqual({
      latitude: 'Ingresa la latitud.',
      longitude: 'Ingresa la longitud.',
      maxRadiusKm: 'Ingresa el radio de cobertura.',
    });

    expect(
      validateServiceArea({
        latitude: 'abc',
        longitude: 'xyz',
        maxRadiusKm: 'none',
      }),
    ).toEqual({
      latitude: 'La latitud debe estar entre -90 y 90.',
      longitude: 'La longitud debe estar entre -180 y 180.',
      maxRadiusKm: 'Elige un radio entre 1 and 300 km.',
    });

    expect(parseDecimal(' -12,05 ')).toBe(-12.05);
  });
});
