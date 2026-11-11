import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { listApplianceTypes } from '../applianceTypes/api';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ErrorState } from '../../shared/ui/ErrorState';
import {
  FormErrorSummary,
  type SummaryField,
} from '../../shared/ui/FormErrorSummary';
import {
  feedbackFromError,
  hasFeedback,
  useFormFeedback,
} from '../../shared/ui/formFeedback';
import { PageHeader } from '../../shared/ui/PageHeader';
import { SelectField } from '../../shared/ui/SelectField';
import { TextAreaField } from '../../shared/ui/TextAreaField';
import { TextField } from '../../shared/ui/TextField';
import { createServiceRequest } from './api';
import {
  BRAND_MAX,
  DESCRIPTION_MAX,
  validateNewRequest,
  type NewRequestForm,
} from './validation';

const FIELDS: readonly SummaryField[] = [
  { name: 'applianceTypeId', id: 'new-request-type', label: 'Appliance' },
  {
    name: 'originalDescription',
    id: 'new-request-description',
    label: 'Problem',
  },
  { name: 'brand', id: 'new-request-brand', label: 'Brand' },
  { name: 'model', id: 'new-request-model', label: 'Model' },
];

const EMPTY: NewRequestForm = {
  applianceTypeId: '',
  originalDescription: '',
  brand: '',
  model: '',
};

/** /client/requests/new: publish a repair request. */
export function NewRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const { feedback, summaryRef, show, clear } = useFormFeedback();
  const types = useApiQuery(['appliance-types'], (signal) =>
    listApplianceTypes({ signal }),
  );

  const { run: submit, isSubmitting } = useSubmitGuard(async () => {
    clear();
    try {
      const created = await createServiceRequest({
        applianceTypeId: Number(form.applianceTypeId),
        originalDescription: form.originalDescription.trim(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
      });
      toast.success('Request published. Nearby technicians can see it now.');
      navigate(`/client/requests/${created.id}`);
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof NewRequestForm>(name: K, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateNewRequest(form);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void submit();
  }

  return (
    <section aria-labelledby="new-request-title">
      <PageHeader
        titleId="new-request-title"
        title="New repair request"
        description="Tell technicians what is broken. Clear details bring better offers."
        breadcrumbs={[
          { label: 'Dashboard', to: '/client' },
          { label: 'My requests', to: '/client/requests' },
          { label: 'New request' },
        ]}
      />
      <Card className="max-w-2xl">
        {feedback && hasFeedback(feedback) ? (
          <FormErrorSummary
            ref={summaryRef}
            feedback={feedback}
            fields={FIELDS}
          />
        ) : null}
        {types.status === 'error' ? (
          <ErrorState
            error={types.error}
            title="The appliance list did not load"
            onRetry={types.reload}
          />
        ) : null}
        <form onSubmit={handleSubmit} noValidate>
          <fieldset disabled={isSubmitting} className="form-fields">
            <legend className="visually-hidden">Request details</legend>
            <SelectField
              id="new-request-type"
              name="applianceTypeId"
              label="Appliance"
              placeholder={
                types.data ? 'Choose an appliance' : 'Loading appliances…'
              }
              options={(types.data ?? []).map((type) => ({
                value: String(type.id),
                label: type.name,
              }))}
              value={form.applianceTypeId}
              onChange={(event) => set('applianceTypeId', event.target.value)}
              error={feedback?.fieldErrors.applianceTypeId}
            />
            <TextAreaField
              id="new-request-description"
              name="originalDescription"
              label="Problem"
              hint="What happens, since when, and anything you already tried."
              placeholder="The fridge stopped cooling yesterday; the light still turns on."
              maxLength={DESCRIPTION_MAX}
              rows={5}
              value={form.originalDescription}
              onChange={(event) =>
                set('originalDescription', event.target.value)
              }
              error={feedback?.fieldErrors.originalDescription}
            />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <TextField
                id="new-request-brand"
                name="brand"
                label="Brand (optional)"
                placeholder="Samsung"
                maxLength={BRAND_MAX}
                value={form.brand}
                onChange={(event) => set('brand', event.target.value)}
                error={feedback?.fieldErrors.brand}
              />
              <TextField
                id="new-request-model"
                name="model"
                label="Model (optional)"
                placeholder="RT38K5930SL"
                maxLength={BRAND_MAX}
                value={form.model}
                onChange={(event) => set('model', event.target.value)}
                error={feedback?.fieldErrors.model}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? 'Publishing…' : 'Publish request'}
              </Button>
              <ButtonLink to="/client/requests" variant="ghost">
                Cancel
              </ButtonLink>
            </div>
          </fieldset>
        </form>
      </Card>
    </section>
  );
}
