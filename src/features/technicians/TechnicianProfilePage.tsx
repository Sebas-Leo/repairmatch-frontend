import { useState, type FormEvent } from 'react';
import { listApplianceTypes } from '../applianceTypes/api';
import type { ApplianceType, TechnicianProfile } from '../../shared/api/types';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { useToast } from '../../shared/toast/toastContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
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
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { TextAreaField } from '../../shared/ui/TextAreaField';
import { TextField } from '../../shared/ui/TextField';
import {
  getOwnTechnicianProfile,
  updateOwnTechnicianProfile,
  updateServiceArea,
} from './api';
import {
  BIO_MAX,
  PHONE_MAX,
  parseDecimal,
  validateProfile,
  validateServiceArea,
  type ProfileForm,
  type ServiceAreaForm,
} from './validation';

const PROFILE_FIELDS: readonly SummaryField[] = [
  {
    name: 'experienceYears',
    id: 'profile-experience',
    label: 'Years of experience',
  },
  { name: 'phone', id: 'profile-phone', label: 'Phone' },
  { name: 'bio', id: 'profile-bio', label: 'Bio' },
  {
    name: 'applianceTypeIds',
    id: 'profile-appliances',
    label: 'Appliances you repair',
  },
];

const AREA_FIELDS: readonly SummaryField[] = [
  { name: 'latitude', id: 'area-latitude', label: 'Latitude' },
  { name: 'longitude', id: 'area-longitude', label: 'Longitude' },
  { name: 'maxRadiusKm', id: 'area-radius', label: 'Radius (km)' },
];

function matchedTypeIds(
  profile: TechnicianProfile,
  types: readonly ApplianceType[],
): number[] {
  const active = new Set(profile.applianceTypes);
  return types.filter((t) => active.has(t.name)).map((t) => t.id);
}

function ProfileDetailsCard({
  profile,
  types,
  onSaved,
}: {
  profile: TechnicianProfile;
  types: readonly ApplianceType[];
  onSaved: (updated: TechnicianProfile) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ProfileForm>(() => ({
    experienceYears:
      profile.experienceYears !== undefined
        ? String(profile.experienceYears)
        : '',
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
    applianceTypeIds: matchedTypeIds(profile, types),
  }));
  const { feedback, summaryRef, show, clear } = useFormFeedback();

  const { run: save, isSubmitting } = useSubmitGuard(async () => {
    clear();
    const exp = form.experienceYears.trim();
    try {
      const updated = await updateOwnTechnicianProfile({
        experienceYears: exp ? Number(exp) : null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        applianceTypeIds: form.applianceTypeIds,
      });
      onSaved(updated);
      toast.success('Profile saved.');
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof ProfileForm>(name: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleType(id: number) {
    setForm((current) => {
      const has = current.applianceTypeIds.includes(id);
      const next = has
        ? current.applianceTypeIds.filter((item) => item !== id)
        : [...current.applianceTypeIds, id];
      return { ...current, applianceTypeIds: next };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateProfile(form);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void save();
  }

  return (
    <Card as="section" aria-labelledby="profile-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div>
          <h2 id="profile-heading" className="m-0 text-lg">
            Professional details
          </h2>
          <p className="m-0 text-sm text-muted">
            {profile.fullName} · {profile.email}
          </p>
        </div>
        {profile.applianceTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {profile.applianceTypes.map((name) => (
              <Badge key={name} tone="brand">
                {name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={PROFILE_FIELDS}
        />
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSubmitting} className="form-fields">
          <legend className="visually-hidden">Professional details</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              id="profile-experience"
              name="experienceYears"
              label="Years of experience"
              inputMode="numeric"
              placeholder="5"
              value={form.experienceYears}
              onChange={(event) => set('experienceYears', event.target.value)}
              error={feedback?.fieldErrors.experienceYears}
            />
            <TextField
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              label="Phone"
              placeholder="+51 999 888 777"
              maxLength={PHONE_MAX}
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
              error={feedback?.fieldErrors.phone}
            />
          </div>

          <TextAreaField
            id="profile-bio"
            name="bio"
            label="Bio"
            hint="Experience, certifications and the brands you know best."
            maxLength={BIO_MAX}
            value={form.bio}
            onChange={(event) => set('bio', event.target.value)}
            error={feedback?.fieldErrors.bio}
          />

          <div
            id="profile-appliances"
            role="group"
            aria-labelledby="profile-appliances-label"
            tabIndex={-1}
            className="field"
          >
            <span id="profile-appliances-label" className="font-semibold">
              Appliances you repair
            </span>
            <p className="field-hint">
              Only requests for these appliances will appear in your
              opportunities.
            </p>
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              {types.map((type) => {
                const checked = form.applianceTypeIds.includes(type.id);
                return (
                  <label
                    key={type.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-line bg-surface p-3 text-sm hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(type.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span className="grid gap-0.5">
                      <span className="font-medium text-ink">{type.name}</span>
                      {type.description ? (
                        <span className="text-xs text-muted">
                          {type.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {feedback?.fieldErrors.applianceTypeIds ? (
              <p className="field-error">
                {feedback.fieldErrors.applianceTypeIds}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}

function ServiceAreaCard({
  profile,
  onSaved,
}: {
  profile: TechnicianProfile;
  onSaved: (updated: TechnicianProfile) => void;
}) {
  const toast = useToast();
  const [area, setArea] = useState<ServiceAreaForm>(() => ({
    latitude: profile.latitude !== undefined ? String(profile.latitude) : '',
    longitude: profile.longitude !== undefined ? String(profile.longitude) : '',
    maxRadiusKm:
      profile.maxRadiusKm !== undefined ? String(profile.maxRadiusKm) : '',
  }));
  const { feedback, summaryRef, show, clear } = useFormFeedback();

  const { run: save, isSubmitting } = useSubmitGuard(async () => {
    clear();
    try {
      const updated = await updateServiceArea({
        latitude: parseDecimal(area.latitude),
        longitude: parseDecimal(area.longitude),
        maxRadiusKm: parseDecimal(area.maxRadiusKm),
      });
      onSaved(updated);
      toast.success('Service area saved.');
    } catch (error) {
      show(feedbackFromError(error));
    }
  });

  function set<K extends keyof ServiceAreaForm>(name: K, value: string) {
    setArea((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateServiceArea(area);
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void save();
  }

  const areaReady =
    profile.latitude !== undefined &&
    profile.longitude !== undefined &&
    profile.maxRadiusKm !== undefined;

  return (
    <Card as="section" aria-labelledby="area-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div>
          <h2 id="area-heading" className="m-0 text-lg">
            Service area
          </h2>
          <p className="m-0 text-sm text-muted">
            Center point and travel distance for nearby requests.
          </p>
        </div>
        <Badge tone={areaReady ? 'success' : 'warning'}>
          {areaReady ? `${profile.maxRadiusKm} km radius` : 'Not set'}
        </Badge>
      </div>

      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={AREA_FIELDS}
        />
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSubmitting} className="form-fields">
          <legend className="visually-hidden">Service area</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              id="area-latitude"
              name="latitude"
              label="Latitude"
              inputMode="decimal"
              placeholder="-12.0464"
              value={area.latitude}
              onChange={(event) => set('latitude', event.target.value)}
              error={feedback?.fieldErrors.latitude}
            />
            <TextField
              id="area-longitude"
              name="longitude"
              label="Longitude"
              inputMode="decimal"
              placeholder="-77.0428"
              value={area.longitude}
              onChange={(event) => set('longitude', event.target.value)}
              error={feedback?.fieldErrors.longitude}
            />
          </div>
          <TextField
            id="area-radius"
            name="maxRadiusKm"
            label="Radius (km)"
            inputMode="decimal"
            hint="Between 1 and 300 km."
            placeholder="15"
            value={area.maxRadiusKm}
            onChange={(event) => set('maxRadiusKm', event.target.value)}
            error={feedback?.fieldErrors.maxRadiusKm}
          />

          <div className="pt-2">
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save service area'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}

function ProfileEditor({
  initialProfile,
  types,
}: {
  initialProfile: TechnicianProfile;
  types: readonly ApplianceType[];
}) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <ProfileDetailsCard
        profile={profile}
        types={types}
        onSaved={setProfile}
      />
      <ServiceAreaCard profile={profile} onSaved={setProfile} />
    </div>
  );
}

/** /technician/profile: edit experience, specialties and coverage area. */
export function TechnicianProfilePage() {
  const query = useApiQuery(
    ['technician-profile'],
    (signal) =>
      Promise.all([
        getOwnTechnicianProfile({ signal }),
        listApplianceTypes({ signal }),
      ]),
    { keepPreviousData: false },
  );

  return (
    <section aria-labelledby="profile-title">
      <PageHeader
        titleId="profile-title"
        title="Profile"
        description="Set the appliances you repair and where you work so matching requests can reach you."
        breadcrumbs={[
          { label: 'Dashboard', to: '/technician' },
          { label: 'Profile' },
        ]}
      />
      {query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !query.data ? (
        <ListSkeleton rows={2} label="Loading your profile" />
      ) : (
        <ProfileEditor initialProfile={query.data[0]} types={query.data[1]} />
      )}
    </section>
  );
}
