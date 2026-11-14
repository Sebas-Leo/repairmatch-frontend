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
      await screen.findByRole('heading', { level: 1, name: 'Profile' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue('5');
    expect(screen.getByLabelText('Phone')).toHaveValue('+51999888777');
    expect(screen.getByLabelText('Bio')).toHaveValue(
      'Specialist in inverter compressors.',
    );
    expect(
      screen.getByRole('checkbox', { name: /Refrigerator/ }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Washing machine/ }),
    ).not.toBeChecked();

    expect(screen.getByLabelText('Latitude')).toHaveValue('-12.0464');
    expect(screen.getByLabelText('Longitude')).toHaveValue('-77.0428');
    expect(screen.getByLabelText('Radius (km)')).toHaveValue('15');
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

    expect(await screen.findByText('Not set')).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue('');
    expect(screen.getByLabelText('Latitude')).toHaveValue('');
  });

  it('validates the profile form before calling the backend', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    const exp = await screen.findByLabelText('Years of experience');
    await user.clear(exp);
    await user.type(exp, '90');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Years of experience: Enter a whole number between 0 and 70.',
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

    const exp = await screen.findByLabelText('Years of experience');
    await user.clear(exp);
    await user.type(exp, '8');

    const phone = screen.getByLabelText('Phone');
    await user.clear(phone);
    await user.type(phone, '  +51911222333  ');

    const bio = screen.getByLabelText('Bio');
    await user.clear(bio);
    await user.type(bio, '  Updated bio  ');

    await user.click(screen.getByRole('checkbox', { name: /Refrigerator/ }));
    await user.click(screen.getByRole('checkbox', { name: /Washing machine/ }));
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(updateOwnTechnicianProfile).toHaveBeenCalledWith({
      experienceYears: 8,
      phone: '+51911222333',
      bio: 'Updated bio',
      applianceTypeIds: [2],
    });
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });

  it('sends null when optional profile fields are left blank', async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue(aProfile());
    vi.mocked(updateOwnTechnicianProfile).mockResolvedValue(aProfile());
    setup();

    await user.clear(await screen.findByLabelText('Years of experience'));
    await user.clear(screen.getByLabelText('Phone'));
    await user.clear(screen.getByLabelText('Bio'));
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

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

    const lat = await screen.findByLabelText('Latitude');
    const lng = screen.getByLabelText('Longitude');
    const radius = screen.getByLabelText('Radius (km)');

    await user.clear(lat);
    await user.type(lat, '95');
    await user.clear(lng);
    await user.type(lng, '-195');
    await user.clear(radius);
    await user.type(radius, '0');
    await user.click(screen.getByRole('button', { name: 'Save service area' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Latitude: Use a latitude between -90 and 90.',
    );
    expect(alert).toHaveTextContent(
      'Longitude: Use a longitude between -180 and 180.',
    );
    expect(alert).toHaveTextContent(
      'Radius (km): Choose a radius between 1 and 300 km.',
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
    expect(screen.getByLabelText('Latitude')).toHaveValue('-12.2125');
    expect(screen.getByLabelText('Longitude')).toHaveValue('-76.9372');

    const radius = screen.getByLabelText('Radius (km)');
    await user.clear(radius);
    await user.type(radius, '25');
    await user.click(screen.getByRole('button', { name: 'Save service area' }));

    expect(updateServiceArea).toHaveBeenCalledWith({
      latitude: -12.2125,
      longitude: -76.9372,
      maxRadiusKm: 25,
    });
    expect(await screen.findByText('Service area saved.')).toBeInTheDocument();
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

    await screen.findByLabelText('Phone');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    const profileCard = screen.getByRole('region', {
      name: 'Professional details',
    });
    expect(await within(profileCard).findByRole('alert')).toHaveTextContent(
      'Phone: Invalid phone',
    );
    expect(
      within(profileCard).getByText('Select at least one appliance'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Save service area' }));
    const areaCard = screen.getByRole('region', { name: 'Service area' });
    expect(await within(areaCard).findByRole('alert')).toHaveTextContent(
      'Invalid coordinates',
    );
  });

  it('shows an error state when initial loading fails', async () => {
    vi.mocked(getOwnTechnicianProfile).mockRejectedValue(
      new ApiError(403, 'Forbidden', { message: 'Access denied' }),
    );
    setup();

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
  });
});

describe('validateProfile and validateServiceArea', () => {
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
      experienceYears: 'Enter a whole number between 0 and 70.',
      phone: 'Use at most 20 characters.',
      bio: 'Keep it under 1000 characters.',
    });
  });

  it('checks required service area fields and numeric formats', () => {
    expect(
      validateServiceArea({ latitude: '', longitude: '', maxRadiusKm: '' }),
    ).toEqual({
      latitude: 'Enter the latitude.',
      longitude: 'Enter the longitude.',
      maxRadiusKm: 'Enter the coverage radius.',
    });

    expect(
      validateServiceArea({
        latitude: 'abc',
        longitude: 'xyz',
        maxRadiusKm: 'none',
      }),
    ).toEqual({
      latitude: 'Use a latitude between -90 and 90.',
      longitude: 'Use a longitude between -180 and 180.',
      maxRadiusKm: 'Choose a radius between 1 and 300 km.',
    });

    expect(parseDecimal(' -12,05 ')).toBe(-12.05);
  });
});
