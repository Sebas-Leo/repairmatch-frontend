import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listApplianceTypes } from '../applianceTypes/api';
import { ApiError } from '../../shared/api/http';
import { aRequest } from '../../test/fixtures';
import { renderPage } from '../../test/renderPage';
import { createServiceRequest } from './api';
import { NewRequestPage } from './NewRequestPage';
import { validateNewRequest } from './validation';

vi.mock('./api', () => ({ createServiceRequest: vi.fn() }));
vi.mock('../applianceTypes/api', () => ({ listApplianceTypes: vi.fn() }));

const PATH = '/client/requests/new';

describe('NewRequestPage', () => {
  beforeEach(() => {
    vi.mocked(createServiceRequest).mockReset();
    vi.mocked(listApplianceTypes).mockResolvedValue([
      { id: 1, name: 'Refrigerator', description: null },
      { id: 2, name: 'Washing machine', description: null },
    ]);
  });

  it('validates before sending', async () => {
    const user = userEvent.setup();
    renderPage(<NewRequestPage />, { path: PATH });
    await user.click(screen.getByRole('button', { name: 'Publish request' }));
    expect(
      await screen.findAllByText('Choose the appliance.'),
    ).not.toHaveLength(0);
    expect(createServiceRequest).not.toHaveBeenCalled();
  });

  it('publishes and opens the new request', async () => {
    const user = userEvent.setup();
    vi.mocked(createServiceRequest).mockResolvedValue(aRequest({ id: 42 }));
    const { router } = renderPage(<NewRequestPage />, { path: PATH });
    await user.selectOptions(
      await screen.findByLabelText('Appliance'),
      'Washing machine',
    );
    await user.type(
      screen.getByLabelText('Problem'),
      '  It does not spin at all.  ',
    );
    await user.type(screen.getByLabelText('Brand (optional)'), 'LG');
    await user.click(screen.getByRole('button', { name: 'Publish request' }));

    expect(createServiceRequest).toHaveBeenCalledWith({
      applianceTypeId: 2,
      originalDescription: 'It does not spin at all.',
      brand: 'LG',
      model: null,
    });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/client/requests/42'),
    );
  });

  it('shows the field errors the backend returns', async () => {
    const user = userEvent.setup();
    vi.mocked(createServiceRequest).mockRejectedValue(
      new ApiError(400, 'Bad request', {
        message: 'Revisa los campos enviados',
        errors: { originalDescription: 'La descripción es muy corta' },
      }),
    );
    renderPage(<NewRequestPage />, { path: PATH });
    await user.selectOptions(
      await screen.findByLabelText('Appliance'),
      'Refrigerator',
    );
    await user.type(screen.getByLabelText('Problem'), 'Broken door seal');
    await user.click(screen.getByRole('button', { name: 'Publish request' }));
    expect(
      await screen.findAllByText('La descripción es muy corta'),
    ).not.toHaveLength(0);
  });

  it('says when the appliance list did not load', async () => {
    vi.mocked(listApplianceTypes).mockRejectedValue(
      new ApiError(403, 'Forbidden', {}),
    );
    renderPage(<NewRequestPage />, { path: PATH });
    expect(
      await screen.findByText('The appliance list did not load'),
    ).toBeInTheDocument();
  });
});

describe('validateNewRequest', () => {
  const valid = {
    applianceTypeId: '1',
    originalDescription: 'It leaks water',
    brand: '',
    model: '',
  };

  it('accepts a complete form', () => {
    expect(validateNewRequest(valid)).toEqual({});
  });

  it('applies the backend limits', () => {
    expect(
      validateNewRequest({
        applianceTypeId: '',
        originalDescription: 'short',
        brand: 'x'.repeat(101),
        model: 'y'.repeat(101),
      }),
    ).toEqual({
      applianceTypeId: 'Choose the appliance.',
      originalDescription: 'Add a little more detail (at least 10 characters).',
      brand: 'Use at most 100 characters.',
      model: 'Use at most 100 characters.',
    });
    expect(
      validateNewRequest({ ...valid, originalDescription: 'x'.repeat(5001) })
        .originalDescription,
    ).toBe('Keep it under 5000 characters.');
    expect(
      validateNewRequest({ ...valid, originalDescription: '   ' })
        .originalDescription,
    ).toBe('Describe what is wrong.');
  });
});
