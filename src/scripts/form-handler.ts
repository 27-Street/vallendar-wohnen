/**
 * Form handler for InquiryForm components.
 * Handles client-side validation, submission via fetch, and success/error states.
 * Loaded as a <script> module on pages with forms.
 */

interface ValidationMessages {
  required: string;
  email: string;
}

const FIRST_LANDING_KEY = 'vw_first_landing_path';
const FIRST_REFERRER_KEY = 'vw_first_referrer';

const validationMessages: Record<string, ValidationMessages> = {
  de: {
    required: 'Bitte füllen Sie dieses Feld aus.',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  },
  en: {
    required: 'Please fill out this field.',
    email: 'Please enter a valid email address.',
  },
};

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll('.form-error').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  form.querySelectorAll('input, textarea').forEach((el) => {
    el.classList.remove('border-red-500', 'ring-red-500/20');
  });
}

function showFieldError(
  field: HTMLInputElement | HTMLTextAreaElement,
  message: string,
): void {
  field.classList.add('border-red-500', 'ring-red-500/20');
  const errorEl = field.parentElement?.querySelector('.form-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function validateForm(form: HTMLFormElement, messages: ValidationMessages): boolean {
  clearErrors(form);
  let isValid = true;

  const requiredFields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[required], textarea[required]',
  );

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      showFieldError(field, messages.required);
      isValid = false;
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      showFieldError(field, messages.email);
      isValid = false;
    }
  });

  return isValid;
}

function isLocalDev(): boolean {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

function setHiddenValue(form: HTMLFormElement, name: string, value: string): void {
  const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (input) {
    input.value = value;
  }
}

function getSessionValue(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSessionValue(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode, restrictive settings)
  }
}

function detectTrafficChannel(utmSource: string, utmMedium: string, referrer: string): string {
  const source = utmSource.toLowerCase();
  const medium = utmMedium.toLowerCase();

  if (medium.includes('cpc') || medium.includes('ppc') || medium.includes('paid')) {
    return 'paid-search';
  }
  if (medium.includes('email')) return 'email';
  if (medium.includes('social')) return 'paid-social';
  if (source || medium) return 'campaign';

  if (!referrer) return 'direct';

  const ref = referrer.toLowerCase();
  if (
    ref.includes('google.') ||
    ref.includes('bing.com') ||
    ref.includes('duckduckgo.com') ||
    ref.includes('search.yahoo.com')
  ) {
    return 'organic-search';
  }

  if (
    ref.includes('facebook.com') ||
    ref.includes('instagram.com') ||
    ref.includes('linkedin.com') ||
    ref.includes('t.co')
  ) {
    return 'social';
  }

  return 'referral';
}

function populateAttributionFields(form: HTMLFormElement, lang: string): void {
  const currentPath = window.location.pathname;
  const referrer = document.referrer || '';
  const urlParams = new URLSearchParams(window.location.search);

  const firstLanding = getSessionValue(FIRST_LANDING_KEY) ?? currentPath;
  const firstReferrer = getSessionValue(FIRST_REFERRER_KEY) ?? referrer;

  if (!getSessionValue(FIRST_LANDING_KEY)) {
    setSessionValue(FIRST_LANDING_KEY, firstLanding);
  }
  if (!getSessionValue(FIRST_REFERRER_KEY) && referrer) {
    setSessionValue(FIRST_REFERRER_KEY, firstReferrer);
  }

  const utmSource = urlParams.get('utm_source') ?? '';
  const utmMedium = urlParams.get('utm_medium') ?? '';
  const utmCampaign = urlParams.get('utm_campaign') ?? '';
  const utmTerm = urlParams.get('utm_term') ?? '';
  const utmContent = urlParams.get('utm_content') ?? '';
  const trafficChannel = detectTrafficChannel(utmSource, utmMedium, referrer);

  setHiddenValue(form, 'page_path', currentPath);
  setHiddenValue(form, 'landing_path', currentPath);
  setHiddenValue(form, 'first_landing_path', firstLanding);
  setHiddenValue(form, 'referrer', referrer);
  setHiddenValue(form, 'first_referrer', firstReferrer);
  setHiddenValue(form, 'utm_source', utmSource);
  setHiddenValue(form, 'utm_medium', utmMedium);
  setHiddenValue(form, 'utm_campaign', utmCampaign);
  setHiddenValue(form, 'utm_term', utmTerm);
  setHiddenValue(form, 'utm_content', utmContent);
  setHiddenValue(form, 'traffic_channel', trafficChannel);
  setHiddenValue(form, 'language', lang);
}

function encodeFormData(formData: FormData): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    params.append(key, String(value));
  }
  return params;
}

function trackInquiryConversion(form: HTMLFormElement, lang: string): void {
  const payload = JSON.stringify({
    type: 'inquiry_submit',
    timestamp: new Date().toISOString(),
    formName: form.dataset.formName ?? 'unknown',
    formType: form.dataset.formType ?? 'unknown',
    apartmentName: form.dataset.apartmentName ?? '',
    lang,
    pagePath: (form.querySelector<HTMLInputElement>('input[name="page_path"]')?.value) || window.location.pathname,
    landingPath: form.querySelector<HTMLInputElement>('input[name="landing_path"]')?.value || '',
    firstLandingPath: form.querySelector<HTMLInputElement>('input[name="first_landing_path"]')?.value || '',
    referrer: form.querySelector<HTMLInputElement>('input[name="referrer"]')?.value || '',
    firstReferrer: form.querySelector<HTMLInputElement>('input[name="first_referrer"]')?.value || '',
    utmSource: form.querySelector<HTMLInputElement>('input[name="utm_source"]')?.value || '',
    utmMedium: form.querySelector<HTMLInputElement>('input[name="utm_medium"]')?.value || '',
    utmCampaign: form.querySelector<HTMLInputElement>('input[name="utm_campaign"]')?.value || '',
    trafficChannel: form.querySelector<HTMLInputElement>('input[name="traffic_channel"]')?.value || '',
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/.netlify/functions/pageview', payload);
    return;
  }

  fetch('/.netlify/functions/pageview', {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    // Ignore analytics transport errors
  });
}

function initForm(wrapper: HTMLDivElement): void {
  if (wrapper.dataset.formReady === 'true') return;

  const form = wrapper.querySelector<HTMLFormElement>('.inquiry-form');
  const successEl = wrapper.querySelector<HTMLDivElement>('.form-success');
  const errorEl = wrapper.querySelector<HTMLDivElement>('.form-error-banner');
  const retryBtn = wrapper.querySelector<HTMLButtonElement>('.form-retry');
  const lang = wrapper.dataset.lang || 'de';

  if (!form || !successEl || !errorEl) return;

  const messages = validationMessages[lang] || validationMessages.de;
  populateAttributionFields(form, lang);

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    if (!validateForm(form, messages)) return;

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    if (isLocalDev()) {
      form.classList.add('hidden');
      successEl.classList.remove('hidden');
      return;
    }

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action || '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormData(formData).toString(),
      });

      if (response.ok) {
        form.classList.add('hidden');
        successEl.classList.remove('hidden');
        trackInquiryConversion(form, lang);
      } else {
        throw new Error('Submission failed');
      }
    } catch {
      form.classList.add('hidden');
      errorEl.classList.remove('hidden');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });

  retryBtn?.addEventListener('click', () => {
    errorEl.classList.add('hidden');
    form.classList.remove('hidden');
  });

  wrapper.dataset.formReady = 'true';
}

function initAllForms(): void {
  document.querySelectorAll<HTMLDivElement>('.inquiry-form-wrapper').forEach(initForm);
}

document.addEventListener('astro:page-load', initAllForms);
