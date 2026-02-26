/**
 * Form handler for InquiryForm components.
 * Handles client-side validation, submission via fetch, and success/error states.
 * Loaded as a <script> module on pages with forms.
 */

interface ValidationMessages {
  required: string;
  email: string;
}

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

function initForm(wrapper: HTMLDivElement): void {
  const form = wrapper.querySelector<HTMLFormElement>('.inquiry-form');
  const successEl = wrapper.querySelector<HTMLDivElement>('.form-success');
  const errorEl = wrapper.querySelector<HTMLDivElement>('.form-error-banner');
  const retryBtn = wrapper.querySelector<HTMLButtonElement>('.form-retry');
  const lang = wrapper.dataset.lang || 'de';

  if (!form || !successEl || !errorEl) return;

  const messages = validationMessages[lang] || validationMessages.de;

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
        body: new URLSearchParams(formData as unknown as Record<string, string>).toString(),
      });

      if (response.ok) {
        form.classList.add('hidden');
        successEl.classList.remove('hidden');
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
}

function initAllForms(): void {
  document.querySelectorAll<HTMLDivElement>('.inquiry-form-wrapper').forEach(initForm);
}

document.addEventListener('astro:page-load', initAllForms);
