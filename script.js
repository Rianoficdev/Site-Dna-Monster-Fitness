/* ==========================================================================
   DNA Monster Fitness - Interactions
   ========================================================================== */

/* ==========================================================================
   Base selectors
   ========================================================================== */
const revealItems = document.querySelectorAll('.reveal');
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
const gymStatus = document.querySelector('[data-gym-status]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const contactForm = document.querySelector('.contact-form');
const siteWhatsappLinks = document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]');
const THEME_KEY = 'dna_theme_mode';
const STUDENT_WEEK_LOG_KEY = 'dna_student_week_log';
const STUDENT_WORKOUT_HISTORY_KEY = 'dna_student_workout_history';
const STUDENT_BODY_METRICS_KEY = 'dna_student_body_metrics';
const STUDENT_AREA_STATE_KEY = 'dna_student_area_state';
const STUDENT_AUTH_PROFILE_KEY = 'dna_student_auth_profile';
const STUDENT_AUTH_TOKEN_KEY = 'dna_student_auth_token';
const STUDENT_REMEMBER_LOGIN_KEY = 'dna_student_remember_login';
const STUDENT_FORGOT_RESET_REQUEST_KEY = 'dna_student_forgot_reset_request';
const TRAINER_HIDDEN_WORKOUT_IDS_KEY = 'dna_trainer_hidden_workout_ids';
const TRAINER_HIDDEN_WORKOUTS_INITIALIZED_KEY = 'dna_trainer_hidden_workouts_initialized';
const TRAINER_TEMPLATE_CREATE_PANEL_COLLAPSED_KEY = 'dna_trainer_template_create_panel_collapsed';
const TRAINER_WORKOUT_CREATE_PANEL_COLLAPSED_KEY = 'dna_trainer_workout_create_panel_collapsed';
const TRAINER_MANAGED_WORKOUTS_PANEL_COLLAPSED_KEY = 'dna_trainer_managed_workouts_panel_collapsed';
const ADMIN_WORKOUTS_PANEL_COLLAPSED_KEY = 'dna_admin_workouts_panel_collapsed';
const ADMIN_EXERCISES_PANEL_COLLAPSED_KEY = 'dna_admin_exercises_panel_collapsed';
const ADMIN_SUPPORT_PANEL_COLLAPSED_KEY = 'dna_admin_support_panel_collapsed';
const ADMIN_TEAM_PANEL_COLLAPSED_KEY = 'dna_admin_team_panel_collapsed';
const STUDENT_API_REQUEST_TIMEOUT_MS = 12000;
const STUDENT_API_UPLOAD_TIMEOUT_MS = 120000;
const STUDENT_API_MAX_RETRIES = 3;
const STUDENT_API_RETRY_DELAY_MS = 350;
const STUDENT_FORGOT_STATUS_POLL_MS = 12000;
const STUDENT_WORKOUTS_REVISION_CHECK_INTERVAL_MS = 5000;
const TRAINER_MANAGED_WORKOUTS_PREVIEW_LIMIT = 3;
const ADMIN_TEAM_MIN_MEMBERS = 1;
const ADMIN_TEAM_MAX_MEMBERS = 8;
(() => {
  if (typeof window === 'undefined' || typeof window.WebSocket !== 'function') return;
  if (window.__dnaLiveReloadGuardInstalled) return;

  const host = String(window.location.hostname || '').trim().toLowerCase();
  const isPrivateIpHost =
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
  const isSingleLabelLanHost = Boolean(host) && !host.includes('.');
  const isLiveServerPort = /^(55\d{2}|8080|8081)$/.test(String(window.location.port || '').trim());
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    isPrivateIpHost ||
    isSingleLabelLanHost ||
    /\.local$/i.test(host);
  if (!isLocalHost && !isLiveServerPort) return;

  const NativeWebSocket = window.WebSocket;
  const currentHost = String(window.location.host || '').trim().toLowerCase();
  const isLiveReloadSocketUrl = (url) => {
    const normalizedUrl = String(url || '').trim().toLowerCase();
    if (!normalizedUrl) return false;
    if (!/\/ws(\?|$)/.test(normalizedUrl)) return false;
    return currentHost ? normalizedUrl.includes(currentHost) : true;
  };

  window.WebSocket = function PatchedWebSocket(url, protocols) {
    if (isLiveReloadSocketUrl(url)) {
      return {
        url: String(url || ''),
        readyState: 1,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        close() {},
        send() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; }
      };
    }

    if (typeof protocols === 'undefined') {
      return new NativeWebSocket(url);
    }
    return new NativeWebSocket(url, protocols);
  };

  window.__dnaLiveReloadGuardInstalled = true;
})();

const isPrivateNetworkHost = (hostname) => {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return false;
  if (['localhost', '127.0.0.1', '::1'].includes(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/\.local$/i.test(host)) return true;
  return false;
};
const isLocalDevHost = isPrivateNetworkHost(window.location.hostname);
const getConfiguredApiBaseUrl = () => {
  const byWindow =
    typeof window.DNA_API_BASE_URL === 'string' ? window.DNA_API_BASE_URL.trim() : '';
  if (byWindow) return byWindow;

  const byMeta = document
    .querySelector('meta[name="dna-api-base-url"]')
    ?.getAttribute('content');
  return String(byMeta || '').trim();
};

const createStudentApiBaseCandidates = () => {
  const explicitBaseUrl = getConfiguredApiBaseUrl();
  const candidates = [];
  const host = String(window.location.hostname || '').trim();
  const originBaseUrl = `${window.location.origin}/api`.replace(/\/+$/, '');

  if (window.location.protocol === 'file:' || isLocalDevHost) {
    const currentPort = String(window.location.port || '').trim();
    const runningOnApiPort = currentPort === '3000';

    if (window.location.protocol !== 'file:' && runningOnApiPort) candidates.push(originBaseUrl);
    if (host) candidates.push(`http://${host}:3000/api`);
    candidates.push('http://localhost:3000/api', 'http://127.0.0.1:3000/api');
  }

  if (explicitBaseUrl) {
    candidates.push(explicitBaseUrl.replace(/\/+$/, ''));
  } else if (!isLocalDevHost && window.location.protocol !== 'file:') {
    candidates.push(originBaseUrl);
  }

  return Array.from(
    new Set(
      candidates
        .map((value) => String(value || '').trim().replace(/\/+$/, ''))
        .filter(Boolean)
    )
  );
};
const STUDENT_API_BASE_URL_CANDIDATES = createStudentApiBaseCandidates();
let activeStudentApiBaseUrl =
  STUDENT_API_BASE_URL_CANDIDATES[0] || `${window.location.origin}/api`.replace(/\/+$/, '');
const getActiveStudentApiHostUrl = () => activeStudentApiBaseUrl.replace(/\/api$/, '');
const getApiHostFromBase = (baseUrl) =>
  String(baseUrl || activeStudentApiBaseUrl || '')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
const shouldIgnoreLocalOriginApiResponse = (status, baseUrl) => {
  const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
  const currentOriginApiBase = `${window.location.origin}/api`.replace(/\/+$/, '');
  const runningOnApiPort = String(window.location.port || '').trim() === '3000';
  return (
    isLocalDevHost &&
    !runningOnApiPort &&
    normalizedBase === currentOriginApiBase &&
    (status === 404 || status === 405)
  );
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = STUDENT_API_REQUEST_TIMEOUT_MS) => {
  if (typeof AbortController !== 'function') {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const safeTimeoutMs = Math.max(1000, Number(timeoutMs) || STUDENT_API_REQUEST_TIMEOUT_MS);
  const timeoutId = window.setTimeout(() => controller.abort(), safeTimeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const waitMs = (value) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(value) || 0));
  });

const externalScriptLoadCache = new Map();
const loadExternalScript = (src) => {
  const normalizedSrc = String(src || '').trim();
  if (!normalizedSrc) {
    return Promise.reject(new Error('URL do script externo inválida.'));
  }

  const cachedPromise = externalScriptLoadCache.get(normalizedSrc);
  if (cachedPromise) return cachedPromise;

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${normalizedSrc}"]`);
    if (existing) {
      if (existing.dataset.dnaLoaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          externalScriptLoadCache.delete(normalizedSrc);
          reject(new Error(`Falha ao carregar ${normalizedSrc}`));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = normalizedSrc;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.addEventListener(
      'load',
      () => {
        script.dataset.dnaLoaded = 'true';
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      'error',
      () => {
        externalScriptLoadCache.delete(normalizedSrc);
        reject(new Error(`Falha ao carregar ${normalizedSrc}`));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });

  externalScriptLoadCache.set(normalizedSrc, promise);
  return promise;
};

let adminPdfLibrariesPromise = null;
const ensureAdminPdfLibraries = async () => {
  const hasJsPdf = Boolean(window.jspdf && typeof window.jspdf.jsPDF === 'function');
  if (hasJsPdf) return;

  if (!adminPdfLibrariesPromise) {
    adminPdfLibrariesPromise = (async () => {
      await loadExternalScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      await loadExternalScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
    })().catch((error) => {
      adminPdfLibrariesPromise = null;
      throw error;
    });
  }

  await adminPdfLibrariesPromise;
};

const performStudentApiFetchWithFallback = async ({
  path,
  method,
  headers,
  body,
  timeoutMs
}) => {
  let response = null;
  let responseBaseUrl = '';
  let lastHttpErrorResponse = null;
  let lastHttpErrorBaseUrl = '';
  let lastNetworkError = null;
  const attemptedBases = [];
  const apiCandidates = Array.from(
    new Set([activeStudentApiBaseUrl, ...STUDENT_API_BASE_URL_CANDIDATES].filter(Boolean))
  );
  const normalizedMethod = String(method || 'GET').trim().toUpperCase();
  const isMutationRequest =
    normalizedMethod !== 'GET' &&
    normalizedMethod !== 'HEAD' &&
    normalizedMethod !== 'OPTIONS';
  const totalAttempts = isMutationRequest
    ? 1
    : Math.max(1, Number(STUDENT_API_MAX_RETRIES) || 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const isLastAttempt = attempt === totalAttempts;
    let stopAfterCurrentAttempt = false;

    for (const baseUrl of apiCandidates) {
      const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
      if (!normalizedBaseUrl) continue;

      attemptedBases.push(normalizedBaseUrl);
      const mixedContentBlocked =
        window.location.protocol === 'https:' && normalizedBaseUrl.startsWith('http://');
      if (mixedContentBlocked) continue;

      try {
        const candidateResponse = await fetchWithTimeout(
          `${normalizedBaseUrl}${path}`,
          {
            method,
            headers,
            body
          },
          timeoutMs
        );

        if (shouldIgnoreLocalOriginApiResponse(candidateResponse.status, normalizedBaseUrl)) {
          continue;
        }

        if (candidateResponse.ok) {
          response = candidateResponse;
          responseBaseUrl = normalizedBaseUrl;
          activeStudentApiBaseUrl = normalizedBaseUrl;
          break;
        }

        lastHttpErrorResponse = candidateResponse;
        lastHttpErrorBaseUrl = normalizedBaseUrl;
        const statusCode = Number(candidateResponse.status) || 0;
        const isRouteMissingStatus = statusCode === 404 || statusCode === 405;
        if (isMutationRequest && !isRouteMissingStatus) {
          stopAfterCurrentAttempt = true;
          break;
        }
      } catch (error) {
        lastNetworkError = error || null;
        if (isMutationRequest) {
          stopAfterCurrentAttempt = true;
          break;
        }
      }
    }

    if (response) break;

    if (lastHttpErrorResponse) {
      response = lastHttpErrorResponse;
      responseBaseUrl = lastHttpErrorBaseUrl;
      break;
    }

    if (stopAfterCurrentAttempt) {
      break;
    }

    if (!isLastAttempt) {
      await waitMs(STUDENT_API_RETRY_DELAY_MS * attempt);
    }
  }

  const uniqueAttemptedBases = Array.from(new Set(attemptedBases));
  const mixedContentOnly =
    window.location.protocol === 'https:' &&
    uniqueAttemptedBases.length > 0 &&
    uniqueAttemptedBases.every((url) => String(url).startsWith('http://'));

  return {
    response,
    responseBaseUrl,
    attemptedBases: uniqueAttemptedBases,
    mixedContentOnly,
    lastNetworkError
  };
};

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

/* ==========================================================================
   1) Mobile menu
   ========================================================================== */
const initMobileMenu = () => {
  if (!menuToggle || !menu) return;

  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
};

/* ==========================================================================
   2) Reveal on scroll
   ========================================================================== */
const initRevealAnimations = () => {
  if (!revealItems.length) return;
  if (typeof IntersectionObserver !== 'function') {
    revealItems.forEach((item) => item.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        currentObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
};

/* ==========================================================================
   3) Gym status
   ========================================================================== */
const toMinutes = (h, m) => h * 60 + m;

const isGymOpenNow = (now) => {
  const day = now.getDay();
  const current = toMinutes(now.getHours(), now.getMinutes());

  if (day >= 1 && day <= 5) return current >= toMinutes(5, 30) && current <= toMinutes(22, 0);
  if (day === 6) return current >= toMinutes(6, 0) && current <= toMinutes(17, 0);
  return current >= toMinutes(6, 0) && current <= toMinutes(11, 0);
};

const updateGymStatus = () => {
  if (!gymStatus) return;
  const label = gymStatus.querySelector('.status-text');
  const open = isGymOpenNow(new Date());

  gymStatus.classList.remove('is-open', 'is-closed');
  gymStatus.classList.add(open ? 'is-open' : 'is-closed');
  if (label) label.textContent = open ? 'Academia Aberta' : 'Academia Fechada';

  requestAnimationFrame(() => gymStatus.classList.add('is-ready'));
};

const initGymStatus = () => {
  updateGymStatus();
  setInterval(updateGymStatus, 60000);
};

/* ==========================================================================
   4) Theme
   ========================================================================== */
const applyTheme = (theme, savePreference = false) => {
  const isDark = theme === 'dark';
  document.body.classList.toggle('theme-dark', isDark);

  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo noturno');
    themeToggle.setAttribute('title', isDark ? 'Ativar modo claro' : 'Ativar modo noturno');
  }

  if (studentThemeToggle) {
    studentThemeToggle.setAttribute('aria-pressed', String(isDark));
    studentThemeToggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo noturno');
    studentThemeToggle.setAttribute('title', isDark ? 'Ativar modo claro' : 'Ativar modo noturno');
  }

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? '#0f1712' : '#1CBF5C');
  }

  refreshPrepVideoForCurrentTheme();

  if (savePreference) localStorage.setItem(THEME_KEY, theme);
};

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  return 'light';
};

const initThemeToggle = () => {
  applyTheme(getInitialTheme(), false);
  if (!themeToggle) return;

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    applyTheme(isDark ? 'light' : 'dark', true);
    themeToggle.classList.remove('is-clicked');
    void themeToggle.offsetWidth;
    themeToggle.classList.add('is-clicked');
  });
};

const normalizeWhatsappPhone = (value) => String(value || '').replace(/\D+/g, '').trim();

const extractWhatsappPhoneFromHref = (href) => {
  const rawHref = String(href || '').trim();
  if (!rawHref) return '';

  try {
    const parsed = new URL(rawHref, window.location.href);
    const hostname = String(parsed.hostname || '').toLowerCase();

    if (hostname.includes('wa.me')) {
      const pathSegment = String(parsed.pathname || '').replace(/^\/+/, '').split('/')[0] || '';
      return normalizeWhatsappPhone(pathSegment);
    }

    if (hostname.includes('whatsapp.com')) {
      const phoneParam = parsed.searchParams.get('phone') || parsed.searchParams.get('phone_number') || '';
      return normalizeWhatsappPhone(phoneParam);
    }
  } catch (_) {
    const waMatch = rawHref.match(/wa\.me\/([+\d]+)/i);
    if (waMatch && waMatch[1]) return normalizeWhatsappPhone(waMatch[1]);

    const queryMatch = rawHref.match(/[?&]phone=([+\d]+)/i);
    if (queryMatch && queryMatch[1]) return normalizeWhatsappPhone(queryMatch[1]);
  }

  return '';
};

const resolveContactWhatsappPhone = () => {
  const links = Array.from(siteWhatsappLinks || []);
  for (const link of links) {
    if (!(link instanceof HTMLAnchorElement)) continue;
    const parsedPhone = extractWhatsappPhoneFromHref(link.getAttribute('href') || '');
    if (parsedPhone) return parsedPhone;
  }
  return '';
};

const buildContactLeadWhatsappMessage = ({
  name = '',
  phone = '',
  objective = ''
} = {}) => {
  const safeName = String(name || '').trim() || '-';
  const safePhone = String(phone || '').trim() || '-';
  const safeObjective = String(objective || '').trim() || '-';

  return [
    'Quero mais informações sobre a Academia',
    `Nome: ${safeName}`,
    `Telefone: ${safePhone}`,
    `Objetivo: ${safeObjective}`
  ].join('\n');
};

const initContactLeadForm = () => {
  if (!(contactForm instanceof HTMLFormElement)) return;

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    const targetPhone = resolveContactWhatsappPhone();
    if (!targetPhone) {
      showSiteTopNotice('Número de WhatsApp não configurado para receber contatos.', false);
      return;
    }

    const formData = new FormData(contactForm);
    const message = buildContactLeadWhatsappMessage({
      name: formData.get('nome'),
      phone: formData.get('telefone'),
      objective: formData.get('objetivo')
    });

    const whatsappUrl = `https://wa.me/${encodeURIComponent(targetPhone)}?text=${encodeURIComponent(message)}`;
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = whatsappUrl;
    }

    contactForm.reset();
    showSiteTopNotice('Mensagem preparada no WhatsApp. Confirme o envio para finalizar.', true);
  });
};

/* ==========================================================================
   5) Student Area - selectors
   ========================================================================== */
const studentAreaTrigger = document.querySelector('[data-student-open]');
const studentArea = document.querySelector('[data-student-area]');
const studentLoading = document.querySelector('[data-student-loading]');
const studentLogin = document.querySelector('[data-student-login]');
const studentApp = document.querySelector('[data-student-app]');
const studentVideo = document.querySelector('[data-student-video]');
let studentVideoSourceResolved = false;
const studentCloseTargets = document.querySelectorAll('[data-student-close]');

const studentAuthTabs = document.querySelectorAll('[data-student-auth-tab]');
const studentAuthPanels = document.querySelectorAll('[data-student-panel]');
const studentGoRegister = document.querySelector('[data-student-go-register]');
const studentGoLoginButtons = document.querySelectorAll('[data-student-go-login]');

const studentLoginForm = document.querySelector('[data-student-login-form]');
const studentUserInput = document.querySelector('[data-student-user]');
const studentPassInput = document.querySelector('[data-student-pass]');
const studentRememberInput = document.querySelector('[data-student-remember]');
const studentShowPassInput = document.querySelector('[data-student-show-pass]');
const studentFormError = document.querySelector('[data-student-form-error]');
const studentSubmitButton = document.querySelector('[data-student-submit]');
const studentForgotLink = document.querySelector('[data-student-forgot]');

const studentRegisterForm = document.querySelector('[data-student-register-form]');
const studentRegisterName = document.querySelector('[data-student-register-name]');
const studentRegisterEmail = document.querySelector('[data-student-register-email]');
const studentRegisterPhone = document.querySelector('[data-student-register-phone]');
const studentRegisterPass = document.querySelector('[data-student-register-pass]');
const studentRegisterPassConfirm = document.querySelector('[data-student-register-pass-confirm]');
const studentRegisterError = document.querySelector('[data-student-register-error]');
const studentRegisterSubmit = document.querySelector('[data-student-register-submit]');

const studentForgotRequestForm = document.querySelector('[data-student-forgot-request-form]');
const studentForgotEmail = document.querySelector('[data-student-forgot-email]');
const studentForgotType = document.querySelector('[data-student-forgot-type]');
const studentForgotDescription = document.querySelector('[data-student-forgot-description]');
const studentForgotRequestError = document.querySelector('[data-student-forgot-request-error]');
const studentForgotRequestSubmit = document.querySelector('[data-student-forgot-request-submit]');
const studentForgotGoReset = document.querySelector('[data-student-forgot-go-reset]');
const studentForgotResetForm = document.querySelector('[data-student-forgot-reset-form]');
const studentForgotToken = document.querySelector('[data-student-forgot-token]');
const studentForgotNewPass = document.querySelector('[data-student-forgot-new-pass]');
const studentForgotConfirmPass = document.querySelector('[data-student-forgot-confirm-pass]');
const studentForgotResetError = document.querySelector('[data-student-forgot-reset-error]');
const studentForgotResetSubmit = document.querySelector('[data-student-forgot-reset-submit]');
const studentForgotBackRequest = document.querySelector('[data-student-forgot-back-request]');

const studentAppTabs = document.querySelectorAll('[data-student-app-tab]');
const studentAppPanels = document.querySelectorAll('[data-student-app-panel]');
const studentAppMain = document.querySelector('.student-app-main');
const studentAppShell = document.querySelector('.student-app-shell');
const studentTabLoading = document.querySelector('[data-student-tab-loading]');
const studentThemeToggle = document.querySelector('[data-student-theme-toggle]');
const studentLogoutButton = document.querySelector('[data-student-logout]');
const studentNameDisplay = document.querySelector('[data-student-name-display]');
const studentPlanDisplay = document.querySelector('[data-student-plan-display]');
const studentGreetingName = document.querySelector('[data-student-greeting-name]');
const studentDateDisplay = document.querySelector('[data-student-date-display]');
const studentHomeButton = document.querySelector('[data-student-home-btn]');
const siteTopNotice = document.querySelector('[data-site-notice]');
const siteTopNoticeText = document.querySelector('[data-site-notice-text]');
const siteTeamGrid = document.querySelector('[data-site-team-grid]');
const adminTeamForm = document.querySelector('[data-admin-team-form]');
const adminTeamFeedback = document.querySelector('[data-admin-team-feedback]');
const adminTeamSubmitButton = document.querySelector('[data-admin-team-submit]');
const adminTeamResetButton = document.querySelector('[data-admin-team-reset]');
const adminTeamAddButton = document.querySelector('[data-admin-team-add]');
const adminTeamList = document.querySelector('[data-admin-team-list]');
const adminTeamCard = document.querySelector('[data-admin-team-card]');
const adminTeamBody = document.querySelector('[data-admin-team-body]');
const adminTeamToggleButton = document.querySelector('[data-admin-team-toggle]');

const dashboardGreeting = document.querySelector('[data-student-dashboard-greeting]');
const dashboardCurrent = document.querySelector('[data-student-dashboard-current]');
const dashboardNext = document.querySelector('[data-student-dashboard-next]');
const dashboardCurrentMeta = document.querySelector('[data-student-dashboard-current-meta]');
const dashboardNextMeta = document.querySelector('[data-student-dashboard-next-meta]');
const dashboardUpcomingDayCurrent = document.querySelector('[data-student-upcoming-day-current]');
const dashboardUpcomingDayNext = document.querySelector('[data-student-upcoming-day-next]');
const dashboardStatus = document.querySelector('[data-student-dashboard-status]');
const dashboardStatusLevel = document.querySelector('[data-student-dashboard-level]');
const dashboardCompletedPercent = document.querySelector('[data-student-dashboard-completed-percent]');
const dashboardCompletedText = document.querySelector('[data-student-dashboard-completed-text]');
const dashboardCompletedFill = document.querySelector('[data-student-dashboard-completed-fill]');
const dashboardWeekGrid = document.querySelector('[data-student-week-grid]');
const dashboardWeekTotal = document.querySelector('[data-student-week-total]');
const dashboardGoalTitle = document.querySelector(
  '.student-dashboard-secondary-grid [data-student-goal-title], .student-dashboard-secondary-grid .student-goal-title, [data-student-goal-title]'
);
const dashboardGoalFill = document.querySelector('[data-student-goal-fill]');
const dashboardGoalPercent = document.querySelector('[data-student-goal-percent]');
const dashboardPerformance = document.querySelector('[data-student-performance]');
const adminOverviewPanel = document.querySelector('[data-admin-overview-panel]');
const adminOverviewError = document.querySelector('[data-admin-overview-error]');
const adminOverviewRefreshButton = document.querySelector('[data-admin-overview-refresh]');
const adminOverviewReportButton = document.querySelector('[data-admin-overview-report]');
const adminOverviewTabButtons = document.querySelectorAll('[data-admin-overview-tab]');
const adminOverviewTabPanes = document.querySelectorAll('[data-admin-overview-pane]');
const adminUsersTableBody = document.querySelector('[data-admin-users-table-body]');
const adminWorkoutsTableBody = document.querySelector('[data-admin-workouts-table-body]');
const adminWorkoutsCard = document.querySelector('[data-admin-workouts-card]');
const adminWorkoutsBody = document.querySelector('[data-admin-workouts-body]');
const adminWorkoutsToggleButton = document.querySelector('[data-admin-workouts-toggle]');
const adminWorkoutsSearchInput = document.querySelector('[data-admin-workouts-search]');
const adminExercisesTableBody = document.querySelector('[data-admin-exercises-table-body]');
const adminSupportTableBody = document.querySelector('[data-admin-support-table-body]');
const adminSupportCard = document.querySelector('[data-admin-support-card]');
const adminSupportBody = document.querySelector('[data-admin-support-body]');
const adminSupportToggleButton = document.querySelector('[data-admin-support-toggle]');
const adminSupportViewButtons = document.querySelectorAll('[data-admin-support-view]');
const adminExercisesSearchInput = document.querySelector('[data-admin-exercises-search]');
const adminExercisesGroupFilter = document.querySelector('[data-admin-exercises-group-filter]');
const adminExercisesCard = document.querySelector('[data-admin-exercises-card]');
const adminExercisesBody = document.querySelector('[data-admin-exercises-body]');
const adminExercisesToggleButton = document.querySelector('[data-admin-exercises-toggle]');
const adminExerciseModal = document.querySelector('[data-admin-exercise-modal]');
const adminExerciseModalCloseButtons = document.querySelectorAll('[data-admin-exercise-modal-close]');
const adminExerciseForm = document.querySelector('[data-admin-exercise-form]');
const adminExerciseModalTitle = document.querySelector('[data-admin-exercise-modal-title]');
const adminExerciseModalCancelButton = document.querySelector('[data-admin-exercise-modal-cancel]');
const adminExerciseModalIdentification = document.querySelector('[data-admin-exercise-modal-identification]');
const adminExerciseFormFeedback = document.querySelector('[data-admin-exercise-form-feedback]');
const adminExerciseFieldName = document.querySelector('[data-admin-exercise-field-name]');
const adminExerciseFieldDescription = document.querySelector('[data-admin-exercise-field-description]');
const adminExerciseFieldGroup = document.querySelector('[data-admin-exercise-field-group]');
const adminExerciseFieldStatus = document.querySelector('[data-admin-exercise-field-status]');
const adminExerciseFieldImageFile = document.querySelector('[data-admin-exercise-field-image-file]');
const adminExerciseFieldVideoFile = document.querySelector('[data-admin-exercise-field-video-file]');
const adminExerciseCurrentImageLink = document.querySelector('[data-admin-exercise-current-image-link]');
const adminExerciseCurrentImageEmpty = document.querySelector('[data-admin-exercise-current-image-empty]');
const adminExerciseCurrentVideoLink = document.querySelector('[data-admin-exercise-current-video-link]');
const adminExerciseCurrentVideoEmpty = document.querySelector('[data-admin-exercise-current-video-empty]');
const adminExerciseFieldSeries = document.querySelector('[data-admin-exercise-field-series]');
const adminExerciseFieldRepetitions = document.querySelector('[data-admin-exercise-field-repetitions]');
const adminExerciseFieldDuration = document.querySelector('[data-admin-exercise-field-duration]');
const adminExerciseFieldRest = document.querySelector('[data-admin-exercise-field-rest]');
const adminExerciseFieldCalories = document.querySelector('[data-admin-exercise-field-calories]');
const adminExerciseSubmitButton = document.querySelector('[data-admin-exercise-submit]');
const adminExerciseEditControls = document.querySelectorAll('[data-admin-exercise-edit-control]');
const adminExerciseEditUploadFields = document.querySelectorAll('[data-admin-exercise-edit-upload]');
const adminUserDeleteModal = document.querySelector('[data-admin-user-delete-modal]');
const adminUserDeleteModalCloseButtons = document.querySelectorAll('[data-admin-user-delete-modal-close]');
const adminUserDeleteForm = document.querySelector('[data-admin-user-delete-form]');
const adminUserDeleteIdentification = document.querySelector('[data-admin-user-delete-identification]');
const adminUserDeleteWarning = document.querySelector('[data-admin-user-delete-warning]');
const adminUserDeletePasswordInput = document.querySelector('[data-admin-user-delete-password]');
const adminUserDeleteSubmitButton = document.querySelector('[data-admin-user-delete-submit]');
const adminUserDeleteFeedback = document.querySelector('[data-admin-user-delete-feedback]');
const siteConfirmModal = document.querySelector('[data-site-confirm-modal]');
const siteConfirmCloseButtons = document.querySelectorAll('[data-site-confirm-close]');
const siteConfirmTitle = document.querySelector('[data-site-confirm-title]');
const siteConfirmIdentification = document.querySelector('[data-site-confirm-identification]');
const siteConfirmMessage = document.querySelector('[data-site-confirm-message]');
const siteConfirmCancelButton = document.querySelector('[data-site-confirm-cancel]');
const siteConfirmConfirmButton = document.querySelector('[data-site-confirm-confirm]');
const trainerWorkoutQuickCreateModal = document.querySelector('[data-trainer-workout-quick-create-modal]');
const trainerWorkoutQuickCreateCloseButtons = document.querySelectorAll('[data-trainer-workout-quick-create-close]');
const trainerWorkoutQuickCreateForm = document.querySelector('[data-trainer-workout-quick-create-form]');
const trainerWorkoutQuickCreateFeedback = document.querySelector('[data-trainer-workout-quick-create-feedback]');
const trainerWorkoutQuickCreateNameInput = document.querySelector('[data-trainer-workout-quick-create-name]');
const trainerWorkoutQuickCreateSubmitButton = document.querySelector('[data-trainer-workout-quick-create-submit]');
const adminStatTotalUsers = document.querySelector('[data-admin-stat-total-users]');
const adminStatTotalWorkouts = document.querySelector('[data-admin-stat-total-workouts]');
const adminStatTotalExercises = document.querySelector('[data-admin-stat-total-exercises]');
const adminStatAlunos = document.querySelector('[data-admin-stat-alunos]');
const adminStatInstrutores = document.querySelector('[data-admin-stat-instrutores]');
const adminStatAdmins = document.querySelector('[data-admin-stat-admins]');
const adminStatAdminGeral = document.querySelector('[data-admin-stat-admin-geral]');
const adminStatAlunosAtivos = document.querySelector('[data-admin-stat-alunos-ativos]');
const adminStatAlunosDesabilitados = document.querySelector('[data-admin-stat-alunos-desabilitados]');
const adminStatOnlineAgora = document.querySelector('[data-admin-stat-online-agora]');
const adminStatTotalUsersMeta = document.querySelector('[data-admin-stat-total-users-meta]');
const adminStatTotalWorkoutsMeta = document.querySelector('[data-admin-stat-total-workouts-meta]');
const adminStatTotalExercisesMeta = document.querySelector('[data-admin-stat-total-exercises-meta]');
const adminStatAlunosMeta = document.querySelector('[data-admin-stat-alunos-meta]');
const adminStatInstrutoresMeta = document.querySelector('[data-admin-stat-instrutores-meta]');
const adminStatAdminsMeta = document.querySelector('[data-admin-stat-admins-meta]');
const adminStatAdminGeralMeta = document.querySelector('[data-admin-stat-admin-geral-meta]');
const adminStatAlunosAtivosMeta = document.querySelector('[data-admin-stat-alunos-ativos-meta]');
const adminStatAlunosDesabilitadosMeta = document.querySelector('[data-admin-stat-alunos-desabilitados-meta]');
const adminStatOnlineAgoraMeta = document.querySelector('[data-admin-stat-online-agora-meta]');
const adminRoleChart = document.querySelector('[data-admin-role-chart]');
const adminRoleLegend = document.querySelector('[data-admin-role-legend]');
const adminActivityChart = document.querySelector('[data-admin-activity-chart]');
const adminGrowthChart = document.querySelector('[data-admin-growth-chart]');
const adminGrowthPercent = document.querySelector('[data-admin-growth-percent]');
const adminGrowthTotal = document.querySelector('[data-admin-growth-total]');
const adminStudentStatusChart = document.querySelector('[data-admin-student-status-chart]');
const trainerWorkoutPanel = document.querySelector('[data-trainer-workout-panel]');
const trainerWorkoutError = document.querySelector('[data-trainer-workout-error]');
const trainerWorkoutRefreshButton = document.querySelector('[data-trainer-workout-refresh]');
const trainerOpenLibraryManagerButton = document.querySelector('[data-trainer-open-library-manager]');
const trainerTemplateWorkoutForm = document.querySelector('[data-trainer-template-workout-form]');
const trainerTemplateSelect = document.querySelector('[data-trainer-template-select]');
const trainerTemplateStudentSelect = document.querySelector('[data-trainer-template-student]');
const trainerTemplateInstructorWrap = document.querySelector('[data-trainer-template-instructor-wrap]');
const trainerTemplateInstructorSelect = document.querySelector('[data-trainer-template-instructor]');
const trainerTemplateNameInput = document.querySelector('input[data-trainer-template-name]');
const trainerTemplateStartDateInput = document.querySelector('[data-trainer-template-start-date]');
const trainerTemplateEndDateInput = document.querySelector('[data-trainer-template-end-date]');
const trainerTemplateWeekdayInputs = document.querySelectorAll('[data-trainer-template-weekday]');
const trainerTemplateSubmitButton = document.querySelector('[data-trainer-template-submit]');
const trainerTemplateForm = document.querySelector('[data-trainer-template-form]');
const trainerTemplateFormNameInput = document.querySelector('[data-trainer-template-form-name]');
const trainerTemplateFormDescriptionInput = document.querySelector('[data-trainer-template-form-description]');
const trainerTemplateFormActiveSelect = document.querySelector('[data-trainer-template-form-active]');
const trainerTemplateFormSubmitButton = document.querySelector('[data-trainer-template-form-submit]');
const trainerTemplateEditorForm = document.querySelector('[data-trainer-template-editor-form]');
const trainerTemplateEditorSelect = document.querySelector('[data-trainer-template-editor-select]');
const trainerTemplateEditorNameInput = document.querySelector('[data-trainer-template-editor-name]');
const trainerTemplateEditorDescriptionInput = document.querySelector('[data-trainer-template-editor-description]');
const trainerTemplateEditorActiveSelect = document.querySelector('[data-trainer-template-editor-active]');
const trainerTemplateEditorSubmitButton = document.querySelector('[data-trainer-template-editor-submit]');
const trainerTemplateExerciseForm = document.querySelector('[data-trainer-template-exercise-form]');
const trainerTemplateExerciseTemplateSelect = document.querySelector('[data-trainer-template-exercise-template]');
const trainerTemplateExerciseLibrarySelect = document.querySelector('[data-trainer-template-exercise-library]');
const trainerTemplateExerciseOrderInput = document.querySelector('[data-trainer-template-exercise-order]');
const trainerTemplateExerciseSeriesInput = document.querySelector('[data-trainer-template-exercise-series]');
const trainerTemplateExerciseRepsInput = document.querySelector('[data-trainer-template-exercise-reps]');
const trainerTemplateExerciseLoadInput = document.querySelector('[data-trainer-template-exercise-load]');
const trainerTemplateExerciseRestInput = document.querySelector('[data-trainer-template-exercise-rest]');
const trainerTemplateExerciseSubmitButton = document.querySelector('[data-trainer-template-exercise-submit]');
const trainerTemplateExercisesFilterSelect = document.querySelector('[data-trainer-template-exercises-filter]');
const trainerTemplateExercisesTable = document.querySelector('[data-trainer-template-exercises-table]');
const trainerTemplateExercisesTableBody = document.querySelector('[data-trainer-template-exercises-table-body]');
const trainerTemplateCreateCard = document.querySelector('[data-trainer-template-create-card]');
const trainerTemplateCreateBody = document.querySelector('[data-trainer-template-create-body]');
const trainerTemplateCreateToggleButton = document.querySelector('[data-trainer-template-create-toggle]');
const trainerWorkoutForm = document.querySelector('[data-trainer-workout-form]');
const trainerWorkoutCreateCard = document.querySelector('.trainer-workout-create-card');
const trainerWorkoutCreateBody = document.querySelector('[data-trainer-workout-create-body]');
const trainerWorkoutCreateToggleButton = document.querySelector('[data-trainer-workout-create-toggle]');
const trainerWorkoutObjectiveSelect = document.querySelector('[data-trainer-workout-objective]');
const trainerWorkoutStatusSelect = document.querySelector('[data-trainer-workout-status]');
const trainerWorkoutDescriptionInput = document.querySelector('[data-trainer-workout-description]');
const trainerWorkoutCoverBuilder = document.querySelector('[data-trainer-workout-cover-builder]');
const trainerWorkoutCoverStage = document.querySelector('[data-trainer-workout-cover-stage]');
const trainerWorkoutCoverStageImage = document.querySelector('[data-trainer-workout-cover-image]');
const trainerWorkoutCoverEyebrow = document.querySelector('[data-trainer-workout-cover-eyebrow]');
const trainerWorkoutCoverTitle = document.querySelector('[data-trainer-workout-cover-title]');
const trainerWorkoutCoverMeta = document.querySelector('[data-trainer-workout-cover-meta]');
const trainerWorkoutCoverFileInput = document.querySelector('[data-trainer-workout-cover-file]');
const trainerWorkoutCoverUploadPreview = document.querySelector('[data-trainer-workout-cover-upload-preview]');
const trainerWorkoutCoverFilename = document.querySelector('[data-trainer-workout-cover-filename]');
const trainerWorkoutCoverFeedback = document.querySelector('[data-trainer-workout-cover-feedback]');
const trainerWorkoutPredefinedSelect = document.querySelector('[data-trainer-workout-predefined]');
const trainerWorkoutStudentSelect = document.querySelector('[data-trainer-workout-student]');
const trainerWorkoutStudentSearchInput = document.querySelector('[data-trainer-workout-student-search]');
const trainerWorkoutInstructorSearchInput = document.querySelector('[data-trainer-workout-instructor-search]');
const trainerWorkoutInstructorSelect = document.querySelector('[data-trainer-workout-instructor]');
const trainerWorkoutInstructorWrap = document.querySelector('[data-trainer-workout-instructor-wrap]');
const trainerWeekdayInputs = document.querySelectorAll('[data-trainer-weekday]');
const trainerWorkoutSubmitButton = document.querySelector('[data-trainer-workout-submit]');
const trainerLibraryForm = document.querySelector('[data-trainer-library-form]');
const trainerLinkedExercisesCard =
  document.querySelector('[data-trainer-linked-exercises-card]') ||
  document.querySelector('.trainer-linked-exercises');
const trainerLinkedExercisesSummary = document.querySelector('[data-trainer-linked-exercises-summary]');
const trainerLinkedExercisesSummaryName = document.querySelector('[data-trainer-linked-exercises-summary-name]');
const trainerLinkedExercisesToggleButton = document.querySelector('[data-trainer-linked-exercises-toggle]');
const trainerLinkedExercisesList = document.querySelector('[data-trainer-linked-exercises-list]');
const trainerWeekdayAssignmentWrap = document.querySelector('[data-trainer-weekday-assignment-wrap]');
const trainerWeekdayAssignmentList = document.querySelector('[data-trainer-weekday-assignment-list]');
const trainerLibraryNameInput = document.querySelector('[data-trainer-library-name]');
const trainerLibraryGroupSelect = document.querySelector('[data-trainer-library-group]');
const trainerLibraryDescriptionInput = document.querySelector('[data-trainer-library-description]');
const trainerLibraryMusclesInput = document.querySelector('[data-trainer-library-muscles]');
const trainerLibraryIntensitySelect = document.querySelector('[data-trainer-library-intensity]');
const trainerLibraryTutorialInput = document.querySelector('[data-trainer-library-tutorial]');
const trainerLibraryImageFileInput = document.querySelector('[data-trainer-library-image-file]');
const trainerLibraryVideoFileInput = document.querySelector('[data-trainer-library-video-file]');
const trainerLibraryImagePreview = document.querySelector('[data-trainer-library-image-preview]');
const trainerLibraryVideoPreview = document.querySelector('[data-trainer-library-video-preview]');
const trainerLibraryImageFilename = document.querySelector('[data-trainer-library-image-filename]');
const trainerLibraryVideoFilename = document.querySelector('[data-trainer-library-video-filename]');
const trainerLibrarySeriesInput = document.querySelector('[data-trainer-library-series]');
const trainerLibraryRepetitionsInput = document.querySelector('[data-trainer-library-repetitions]');
const trainerLibraryDurationInput = document.querySelector('[data-trainer-library-duration]');
const trainerLibraryRestInput = document.querySelector('[data-trainer-library-rest]');
const trainerLibraryCaloriesInput = document.querySelector('[data-trainer-library-calories]');
const trainerLibrarySubmitButton = document.querySelector('[data-trainer-library-submit]');
const libraryManagerSection = document.querySelector('[data-library-manager]');
const libraryManagerToggleButton = document.querySelector('[data-library-manager-toggle]');
const libraryManagerFeedback = document.querySelector('[data-library-manager-feedback]');
const libraryManagerFormWrap = document.querySelector('[data-library-manager-form-wrap]');
const libraryManagerCloseButton = document.querySelector('[data-library-manager-close]');
const libraryManagerCancelButton = document.querySelector('[data-library-manager-cancel]');
const trainerExerciseForm = document.querySelector('[data-trainer-exercise-form]');
const trainerExerciseFocusButton = document.querySelector('[data-trainer-exercise-focus]');
const trainerExerciseCreateCard = document.querySelector('.trainer-exercise-create-card');
const trainerExerciseGroupSelect = document.querySelector('[data-trainer-exercise-group]');
const trainerExerciseSearchInput = document.querySelector('[data-trainer-exercise-search]');
const trainerExerciseLibrarySelect = document.querySelector('[data-trainer-exercise-library]');
const trainerExerciseLibraryPicker = document.querySelector('[data-trainer-exercise-library-picker]');
const trainerExerciseLibraryPickerSearchInput = document.querySelector('[data-trainer-exercise-library-picker-search]');
const trainerExerciseLibraryPickerEmpty = document.querySelector('[data-trainer-exercise-library-picker-empty]');
const trainerExerciseLibraryPickerList = document.querySelector('[data-trainer-exercise-library-picker-list]');
const trainerExerciseLibraryPickerGroupLabel = document.querySelector('[data-trainer-exercise-library-picker-group]');
const trainerExerciseLibraryPickerPendingLabel = document.querySelector('[data-trainer-exercise-library-picker-pending]');
const trainerExerciseLibraryPickerCloseButton = document.querySelector('[data-trainer-exercise-library-picker-close]');
const trainerExerciseLibraryPickerScrim = document.querySelector('[data-trainer-exercise-library-picker-scrim]');
const trainerExerciseWorkoutSelect = document.querySelector('[data-trainer-exercise-workout]');
const trainerExerciseWorkoutViewButton = document.querySelector('[data-trainer-exercise-workout-view]');
const trainerExerciseGroupHint = document.querySelector('[data-trainer-exercise-group-hint]');
const trainerExerciseDetailsWrap = document.querySelector('[data-trainer-exercise-details]');
const trainerExerciseNameInput = document.querySelector('[data-trainer-exercise-name]');
const trainerExerciseDescriptionInput = document.querySelector('[data-trainer-exercise-description]');
const trainerExerciseMusclesInput = document.querySelector('[data-trainer-exercise-muscles]');
const trainerExerciseIntensitySelect = document.querySelector('[data-trainer-exercise-intensity]');
const trainerExerciseTutorialInput = document.querySelector('[data-trainer-exercise-tutorial]');
const trainerExerciseImageFileInput = document.querySelector('[data-trainer-exercise-image-file]');
const trainerExerciseVideoFileInput = document.querySelector('[data-trainer-exercise-video-file]');
const trainerExerciseSeriesInput = document.querySelector('[data-trainer-exercise-series]');
const trainerExerciseRepetitionsInput = document.querySelector('[data-trainer-exercise-repetitions]');
const trainerExerciseLoadInput = document.querySelector('[data-trainer-exercise-load]');
const trainerExerciseDurationInput = document.querySelector('[data-trainer-exercise-duration]');
const trainerExerciseRestInput = document.querySelector('[data-trainer-exercise-rest]');
const trainerExerciseObservationInput = document.querySelector('[data-trainer-exercise-observation]');
const trainerExerciseOrderInput = document.querySelector('[data-trainer-exercise-order]');
const trainerExerciseSubmitButton = document.querySelector('[data-trainer-exercise-submit]');
const trainerExerciseFeedback = document.querySelector('[data-trainer-exercise-feedback]');
const trainerManagedWorkoutsCard = document.querySelector('[data-trainer-managed-workouts-card]');
const trainerManagedWorkoutsBody = document.querySelector('[data-trainer-managed-workouts-body]');
const trainerManagedWorkoutsToggleButton = document.querySelector('[data-trainer-managed-workouts-toggle]');
const trainerManagedWorkoutsViewButtons = document.querySelectorAll('[data-trainer-managed-workouts-view]');
const trainerWorkoutsTableBody = document.querySelector('[data-trainer-workouts-table-body]');
const trainerLibraryTableBody = document.querySelector('[data-trainer-library-table-body]');
const trainerExercisesFilterSelect = document.querySelector('[data-trainer-exercises-filter]');
const trainerExercisesTable = document.querySelector('[data-trainer-exercises-table]');
const trainerExercisesTableBody = document.querySelector('[data-trainer-exercises-table-body]');
const trainerWorkoutModal = document.querySelector('[data-trainer-workout-modal]');
const trainerWorkoutModalCloseButtons = document.querySelectorAll('[data-trainer-workout-modal-close]');
const trainerWorkoutModalForm = document.querySelector('[data-trainer-workout-modal-form]');
const trainerWorkoutModalTitle = document.querySelector('#trainer-workout-modal-title');
const trainerWorkoutModalIdentification = document.querySelector('[data-trainer-workout-modal-identification]');
const trainerWorkoutModalFeedback = document.querySelector('[data-trainer-workout-modal-feedback]');
const trainerWorkoutModalNameInput = document.querySelector('[data-trainer-workout-modal-name]');
const trainerWorkoutModalObjectiveSelect = document.querySelector('[data-trainer-workout-modal-objective]');
const trainerWorkoutModalStatusSelect = document.querySelector('[data-trainer-workout-modal-status]');
const trainerWorkoutModalStatusField = document.querySelector('[data-trainer-workout-modal-status-field]');
const trainerWorkoutModalMuscleGroupSelect = document.querySelector('[data-trainer-workout-modal-muscle-group]');
const trainerWorkoutModalLibraryWrap = document.querySelector('[data-trainer-workout-modal-library]');
const trainerWorkoutModalLibraryHeadTitle = trainerWorkoutModal
  ? trainerWorkoutModal.querySelector('.trainer-workout-modal-library-head strong')
  : null;
const trainerWorkoutModalLibraryHeadSubtitle = trainerWorkoutModal
  ? trainerWorkoutModal.querySelector('.trainer-workout-modal-library-head small')
  : null;
const trainerWorkoutModalLibraryEmpty = document.querySelector('[data-trainer-workout-modal-library-empty]');
const trainerWorkoutModalLibraryList = document.querySelector('[data-trainer-workout-modal-library-list]');
const trainerWorkoutModalSubmitButton = document.querySelector('[data-trainer-workout-modal-submit]');
const trainerWorkoutModalCancelButton = trainerWorkoutModal
  ? trainerWorkoutModal.querySelector('.admin-exercise-edit-actions .admin-exercise-edit-cancel[data-trainer-workout-modal-close]')
  : null;
let trainerWorkoutModalCoverSection = null;
let trainerWorkoutModalCoverStage = null;
let trainerWorkoutModalCoverStageImage = null;
let trainerWorkoutModalCoverEyebrow = null;
let trainerWorkoutModalCoverTitle = null;
let trainerWorkoutModalCoverMeta = null;
let trainerWorkoutModalCoverFileInput = null;
let trainerWorkoutModalCoverUploadPreview = null;
let trainerWorkoutModalCoverFilename = null;
let trainerWorkoutModalCoverFeedback = null;
const trainerWorkoutExerciseModal = document.querySelector('[data-trainer-workout-exercise-modal]');
const trainerWorkoutExerciseModalCloseButtons = document.querySelectorAll('[data-trainer-workout-exercise-modal-close]');
const trainerWorkoutExerciseModalForm = document.querySelector('[data-trainer-workout-exercise-modal-form]');
const trainerWorkoutExerciseModalIdentification = document.querySelector('[data-trainer-workout-exercise-modal-identification]');
const trainerWorkoutExerciseModalFeedback = document.querySelector('[data-trainer-workout-exercise-modal-feedback]');
const trainerWorkoutExerciseModalSeriesInput = document.querySelector('[data-trainer-workout-exercise-modal-series]');
const trainerWorkoutExerciseModalRepetitionsInput = document.querySelector('[data-trainer-workout-exercise-modal-repetitions]');
const trainerWorkoutExerciseModalLoadInput = document.querySelector('[data-trainer-workout-exercise-modal-load]');
const trainerWorkoutExerciseModalRestInput = document.querySelector('[data-trainer-workout-exercise-modal-rest]');
const trainerWorkoutExerciseModalObservationInput = document.querySelector('[data-trainer-workout-exercise-modal-observation]');
const trainerWorkoutExerciseModalSubmitButton = document.querySelector('[data-trainer-workout-exercise-modal-submit]');
const trainerExerciseVideoModal = document.querySelector('[data-trainer-exercise-video-modal]');
const trainerExerciseVideoModalCloseButtons = document.querySelectorAll('[data-trainer-exercise-video-modal-close]');
const trainerExerciseVideoModalIdentification = document.querySelector('[data-trainer-exercise-video-modal-identification]');
const trainerExerciseVideoModalEmbed = document.querySelector('[data-trainer-exercise-video-modal-embed]');
const trainerExerciseVideoModalFile = document.querySelector('[data-trainer-exercise-video-modal-file]');
const trainerExerciseVideoModalEmpty = document.querySelector('[data-trainer-exercise-video-modal-empty]');
const studentProgressReport = document.querySelector('[data-student-progress-report]');
const trainerProgressReport = document.querySelector('[data-trainer-progress-report]');
const trainerProgressRefreshButton = document.querySelector('[data-trainer-progress-refresh]');
const trainerProgressError = document.querySelector('[data-trainer-progress-error]');
const trainerProgressStudentSelect = document.querySelector('[data-trainer-progress-student]');
const trainerProgressExportPdfButton = document.querySelector('[data-trainer-progress-export-pdf]');
const trainerProgressEmptyState = document.querySelector('[data-trainer-progress-empty]');
const trainerProgressDetailBlocks = document.querySelectorAll('[data-trainer-progress-details]');
const trainerProgressRange = document.querySelector('[data-trainer-progress-range]');
const trainerProgressTotalStudents = document.querySelector('[data-trainer-progress-total-students]');
const trainerProgressTotalWorkouts = document.querySelector('[data-trainer-progress-total-workouts]');
const trainerProgressTotalCompleted = document.querySelector('[data-trainer-progress-total-completed]');
const trainerProgressWeight = document.querySelector('[data-trainer-progress-weight]');
const trainerProgressHeight = document.querySelector('[data-trainer-progress-height]');
const trainerProgressPlanned = document.querySelector('[data-trainer-progress-planned]');
const trainerProgressCompleted = document.querySelector('[data-trainer-progress-completed]');
const trainerProgressMinutes = document.querySelector('[data-trainer-progress-minutes]');
const trainerProgressKcal = document.querySelector('[data-trainer-progress-kcal]');
const trainerProgressAdherence = document.querySelector('[data-trainer-progress-adherence]');
const trainerProgressStatus = document.querySelector('[data-trainer-progress-status]');
const trainerProgressHistoryBody = document.querySelector('[data-trainer-progress-history-body]');
const openWorkoutsButton = document.querySelector('[data-student-open-workouts]');
const openWorkoutsListButton = document.querySelector('[data-student-open-workouts-list]');
const allWorkoutsList = document.querySelector('[data-student-all-workouts-list]');
const workoutsStartButton = document.querySelector('[data-student-workout-start]');
const workoutsBackButton = document.querySelector('[data-student-workouts-back]');
const libraryBackButton = document.querySelector('[data-student-library-back]');

const workoutList = document.querySelector('[data-student-workout-list]');
const workoutDetailTitle = document.querySelector('[data-student-workout-detail-title]');
const workoutDetailDay = document.querySelector('[data-student-workout-detail-day]');
const workoutExerciseList = document.querySelector('[data-student-workout-exercises]');
const workoutCompleteButton = document.querySelector('[data-student-complete-workout]');
const workoutProgress = document.querySelector('[data-student-workout-progress]');
const activeWorkoutTitle = document.querySelector('[data-student-active-title]');
const activeWorkoutSubtitle = document.querySelector('[data-student-active-subtitle]');
const activeWorkoutExercises = document.querySelector('[data-student-active-workout-exercises]');
const activeWorkoutFinishButton = document.querySelector('[data-student-finish-active-workout]');
const activeWorkoutBackButton = document.querySelector('[data-student-active-back]');
const activeWorkoutHero = document.querySelector('[data-student-active-hero]');
const activeWorkoutDuration = document.querySelector('[data-student-active-duration]');
const activeWorkoutExercisesTotal = document.querySelector('[data-student-active-exercises-total]');
const activeWorkoutProgressLabel = document.querySelector('[data-student-active-progress-label]');
const activeWorkoutProgressFill = document.querySelector('[data-student-active-progress-fill]');
const prepBackButton = document.querySelector('[data-student-prep-back]');
const prepNextButton = document.querySelector('[data-student-prep-next]');
const prepMedia = document.querySelector('.student-prep-media');
const prepFigure = document.querySelector('[data-student-prep-figure]');
const prepVideo = document.querySelector('[data-student-prep-video]');
const prepVideoFile = document.querySelector('[data-student-prep-video-file]');
const prepExerciseName = document.querySelector('[data-student-prep-exercise]');
const prepSeconds = document.querySelector('[data-student-prep-seconds]');
const prepRing = document.querySelector('[data-student-prep-ring]');
const runBackButton = document.querySelector('[data-student-run-back]');
const runPrevButton = document.querySelector('[data-student-run-prev]');
const runPauseButton = document.querySelector('[data-student-run-pause]');
const runNextButton = document.querySelector('[data-student-run-next]');
const runMedia = document.querySelector('.student-run-media');
const runFigure = document.querySelector('[data-student-run-figure]');
const runVideo = document.querySelector('[data-student-run-video]');
const runVideoFile = document.querySelector('[data-student-run-video-file]');
const runExerciseName = document.querySelector('[data-student-run-exercise]');
const runHelpToggle = document.querySelector('[data-student-run-help-toggle]');
const runHelpModal = document.querySelector('[data-student-run-help-modal]');
const runHelpText = document.querySelector('[data-student-run-help-text]');
const runHelpCloseButtons = Array.from(document.querySelectorAll('[data-student-run-help-close]'));
const runClock = document.querySelector('[data-student-run-clock]');
const runCounter = document.querySelector('[data-student-run-counter]');
const runEquipmentBusyCheckbox = document.querySelector('[data-student-run-equipment-busy]');
const restMedia = document.querySelector('.student-rest-media');
const restFigure = document.querySelector('[data-student-rest-figure]');
const restVideo = document.querySelector('[data-student-rest-video]');
const restVideoFile = document.querySelector('[data-student-rest-video-file]');
const restNextCounter = document.querySelector('[data-student-rest-next-counter]');
const restNextName = document.querySelector('[data-student-rest-next-name]');
const restNextReps = document.querySelector('[data-student-rest-next-reps]');
const restClock = document.querySelector('[data-student-rest-clock]');
const restAddTimeButton = document.querySelector('[data-student-rest-add-time]');
const restSkipButton = document.querySelector('[data-student-rest-skip]');
const exerciseDetailTitle = document.querySelector('[data-student-exercise-detail-title]');
const exerciseDetailFigure = document.querySelector('[data-student-exercise-detail-figure]');
const exerciseDetailVideo = document.querySelector('[data-student-exercise-detail-video]');
const exerciseDetailVideoFile = document.querySelector('[data-student-exercise-detail-video-file]');
const exerciseDetailImage = document.querySelector('[data-student-exercise-detail-image]');
const exerciseDetailFallback = document.querySelector('[data-student-exercise-detail-fallback]');
const exerciseDetailDuration = document.querySelector('[data-student-exercise-detail-duration]');
const exerciseDetailTabButtons = Array.from(document.querySelectorAll('[data-student-exercise-detail-tab]'));
const exerciseDetailContentTitle = document.querySelector('[data-student-exercise-detail-content-title]');
const exerciseDetailInstructions = document.querySelector('[data-student-exercise-detail-instructions]');
const exerciseDetailCounter = document.querySelector('[data-student-exercise-counter]');
const exerciseDetailPrev = document.querySelector('[data-student-exercise-prev]');
const exerciseDetailNext = document.querySelector('[data-student-exercise-next]');
const exerciseDetailClose = document.querySelector('[data-student-exercise-detail-close]');
const exerciseDetailBack = document.querySelector('[data-student-exercise-detail-back]');
const exerciseDurationMinus = document.querySelector('[data-student-exercise-duration-minus]');
const exerciseDurationPlus = document.querySelector('[data-student-exercise-duration-plus]');

const progressStats = document.querySelector('[data-student-progress-stats]');
const weightChart = document.querySelector('[data-student-weight-chart]');
const measureChart = document.querySelector('[data-student-measure-chart]');
const evolutionChart = document.querySelector('[data-student-evolution-chart]');
const progressCompare = document.querySelector('[data-student-progress-compare]');
const progressSummaryWorkouts = document.querySelector('[data-progress-summary-workouts]');
const progressSummaryKcal = document.querySelector('[data-progress-summary-kcal]');
const progressSummaryMinutes = document.querySelector('[data-progress-summary-minutes]');
const progressHistoryDays = document.querySelector('[data-progress-history-days]');
const progressHistoryOpen = document.querySelector('[data-progress-history-open]');
const progressHistorySheet = document.querySelector('[data-progress-history-sheet]');
const progressHistoryClose = document.querySelector('[data-progress-history-close]');
const progressHistoryPrevMonth = document.querySelector('[data-progress-history-prev-month]');
const progressHistoryNextMonth = document.querySelector('[data-progress-history-next-month]');
const progressHistoryMonth = document.querySelector('[data-progress-history-month]');
const progressHistoryCalendar = document.querySelector('[data-progress-history-calendar]');
const progressHistoryRange = document.querySelector('[data-progress-history-range]');
const progressHistoryTotalTime = document.querySelector('[data-progress-history-total-time]');
const progressHistoryTotalKcal = document.querySelector('[data-progress-history-total-kcal]');
const progressHistoryCount = document.querySelector('[data-progress-history-count]');
const progressHistoryList = document.querySelector('[data-progress-history-list]');
const progressWeightOpen = document.querySelector('[data-progress-weight-open]');
const progressWeightModal = document.querySelector('[data-progress-weight-modal]');
const progressWeightCloseButtons = document.querySelectorAll('[data-progress-weight-close]');
const progressWeightSave = document.querySelector('[data-progress-weight-save]');
const progressWeightDate = document.querySelector('[data-progress-weight-date]');
const progressWeightLiveValue = document.querySelector('[data-progress-weight-live-value]');
const progressWeightLiveUnit = document.querySelector('[data-progress-weight-live-unit]');
const progressWeightRuler = document.querySelector('[data-progress-weight-ruler]');
const progressBmiOpen = document.querySelector('[data-progress-bmi-open]');
const progressBmiModal = document.querySelector('[data-progress-bmi-modal]');
const progressBmiCloseButtons = document.querySelectorAll('[data-progress-bmi-close]');
const progressBmiSave = document.querySelector('[data-progress-bmi-save]');
const progressBmiWeightUnitButtons = document.querySelectorAll('[data-progress-bmi-weight-unit]');
const progressBmiHeightUnitButtons = document.querySelectorAll('[data-progress-bmi-height-unit]');
const progressBmiLiveWeight = document.querySelector('[data-progress-bmi-live-weight]');
const progressBmiLiveWeightUnit = document.querySelector('[data-progress-bmi-live-weight-unit]');
const progressBmiLiveHeight = document.querySelector('[data-progress-bmi-live-height]');
const progressBmiLiveHeightUnit = document.querySelector('[data-progress-bmi-live-height-unit]');
const progressBmiWeightRuler = document.querySelector('[data-progress-bmi-weight-ruler]');
const progressBmiHeightRuler = document.querySelector('[data-progress-bmi-height-ruler]');
const progressStreak = document.querySelector('[data-progress-streak]');
const progressRecord = document.querySelector('[data-progress-record]');
const progressCurrentWeight = document.querySelector('[data-progress-current-weight]');
const progressMaxWeight = document.querySelector('[data-progress-max-weight]');
const progressMinWeight = document.querySelector('[data-progress-min-weight]');
const progressWeightPlot = document.querySelector('[data-progress-weight-plot]');
const progressBmi = document.querySelector('[data-progress-bmi]');
const progressBmiLabel = document.querySelector('[data-progress-bmi-label]');
const progressHeight = document.querySelector('[data-progress-height]');
const progressBmiDot = document.querySelector('.student-progress-bmi-dot');

const libraryGrid = document.querySelector('[data-student-library-grid]');
const librarySearchInput = document.querySelector('[data-student-library-search]');
const libraryFilterButtons = document.querySelectorAll('[data-student-library-filter]');
const groupGuideSheet = document.querySelector('[data-group-guide-sheet]');
const groupDetailSheet = document.querySelector('[data-group-detail-sheet]');
const groupCreateSheet = document.querySelector('[data-group-create-sheet]');
const profileAvatar = document.querySelector('[data-student-profile-avatar]');
const profileAvatarImage = document.querySelector('[data-student-profile-avatar-image]');
const profileAvatarFallbackIcon = document.querySelector('[data-student-profile-avatar-fallback]');
const profileAvatarEditButton = document.querySelector('[data-student-profile-avatar-edit]');
const profileAvatarInput = document.querySelector('[data-student-profile-avatar-input]');
const profileName = document.querySelector('[data-student-profile-name]');
const profileEmail = document.querySelector('[data-student-profile-email]');
const profileMemberSince = document.querySelector('[data-student-profile-member-since]');
const profileLevel = document.querySelector('[data-student-profile-level]');
const profilePersonalInfo = document.querySelector('[data-student-profile-personal-info]');
const profileSettings = document.querySelector('[data-student-profile-settings]');
const profileActionModal = document.querySelector('[data-profile-action-modal]');
const profileActionTitle = document.querySelector('[data-profile-action-title]');
const profileActionText = document.querySelector('[data-profile-action-text]');
const profileActionPrimary = document.querySelector('[data-profile-action-primary]');
const profileActionCloseButtons = document.querySelectorAll('[data-profile-action-close]');
const profileSupportWrap = document.querySelector('[data-profile-support-wrap]');
const profileSupportForm = document.querySelector('[data-profile-support-form]');
const profileSupportType = document.querySelector('[data-profile-support-type]');
const profileSupportSubject = document.querySelector('[data-profile-support-subject]');
const profileSupportDescription = document.querySelector('[data-profile-support-description]');
const profileSupportFeedback = document.querySelector('[data-profile-support-feedback]');
const profileSupportSubmit = document.querySelector('[data-profile-support-submit]');
const profileSupportList = document.querySelector('[data-profile-support-list]');
const profileSupportRefresh = document.querySelector('[data-profile-support-refresh]');

const exerciseModal = document.querySelector('[data-student-exercise-modal]');
const exerciseTitle = document.querySelector('[data-student-exercise-title]');
const exerciseMuscle = document.querySelector('[data-student-exercise-muscle]');
const exerciseVideo = document.querySelector('[data-student-exercise-video]');
const exerciseInstructions = document.querySelector('[data-student-exercise-instructions]');
const exerciseTips = document.querySelector('[data-student-exercise-tips]');
const exerciseCloseButtons = document.querySelectorAll('[data-student-exercise-close]');

let studentLoadingTimer = null;
let studentInLoginStage = false;
let forgotSupportStatusPollTimer = null;
let forgotSupportStatusPollInFlight = false;
let forgotSupportPendingEmail = '';
let forgotSupportPendingTicketId = 0;
let selectedWorkoutId = null;
let activeLibraryFilter = 'todos';
let librarySearchTerm = '';
let isLibraryManagerFormOpen = false;
let isTrainerExerciseComposerOpen = true;
let isTrainerExerciseLibraryPickerOpen = false;
let isTrainerLinkedExercisesExpanded = false;
const trainerManagedWorkoutExpandedIds = new Set();
const trainerManagedWorkoutBaselineIds = new Set();
let trainerManagedWorkoutBaselineCaptured = false;
let trainerWorkoutDayAssignments = {};
let trainerExerciseLibraryPickerSearchTerm = '';
let trainerExercisePendingWorkoutId = 0;
let trainerExercisePendingLibraryIds = [];
let trainerExerciseTargetWorkoutId = 0;
let activeExerciseDetailIndex = 0;
let activeExerciseDetailSeconds = 20;
let activeExerciseDetailTab = 'description';
let activeExerciseDetailContent = {
  description: '',
  instructions: ''
};
let prepCountdownTimer = null;
let prepSecondsLeft = 20;
let prepExerciseIndex = 0;
let runCountdownTimer = null;
let runSecondsLeft = 60;
let runExerciseIndex = 0;
let runExerciseSeriesIndex = 0;
let runTimerPaused = false;
let runWorkoutMediaSignature = '';
let restCountdownTimer = null;
let restSecondsLeft = 0;
let restNextExerciseIndex = -1;
let restNextSeriesIndex = 0;
let restWorkoutMediaSignature = '';
let currentStudentTab = 'dashboard';
let currentStudentPanel = 'dashboard';
let activeCheckPulseIndex = -1;
let progressHistoryMonthCursor = new Date();
let progressHistorySelectedDateKey = '';
let progressWeightDraftKg = 80;
let progressWeightRulerBuilt = false;
let progressWeightRulerTickSpacing = 8;
let progressBmiDraftWeightKg = 80;
let progressBmiDraftHeightCm = 170;
let progressBmiWeightUnit = 'kg';
let progressBmiHeightUnit = 'cm';
let progressBmiWeightRulerBuilt = false;
let progressBmiHeightRulerBuilt = false;
let progressBmiWeightRulerTickSpacing = 6;
let progressBmiHeightRulerTickSpacing = 6;
let mobileSelectPickerRoot = null;
let mobileSelectPickerTitle = null;
let mobileSelectPickerList = null;
let mobileSelectPickerCloseButton = null;
let mobileSelectPickerActiveSelect = null;
let mobileSelectPickerFocusOrigin = null;
let mobileSelectPickerTapIntent = null;
let mobileSelectPickerSuppressClickUntil = 0;
let mobileSelectPickerIgnoreCloseUntil = 0;
let activeProfileAction = '';
let trainerStudentSearchTerm = '';
let trainerInstructorSearchTerm = '';
let trainerExerciseSearchTerm = '';
let trainerWorkoutStudentConfirmed = false;
let trainerTemplateEditorSelectedId = '';
let trainerTemplateExerciseSelectedId = '';
let trainerExerciseComposerSelectedId = '';
let trainerWorkoutEditingId = 0;
let trainerWorkoutTemplateEditingId = 0;
let trainerWorkoutEditTriggerButton = null;
let trainerWorkoutModalReadOnly = false;
let trainerWorkoutCoverPreviewObjectUrl = '';
let trainerWorkoutPendingCoverFile = null;
let trainerWorkoutCoverSaveInFlight = false;
let trainerWorkoutModalCoverPreviewObjectUrl = '';
let trainerWorkoutModalPendingCoverFile = null;
let trainerWorkoutExerciseEditingState = null;
let trainerWorkoutExerciseEditTriggerButton = null;
let trainerExerciseVideoModalTriggerButton = null;
let trainerExerciseLibrarySelectSuppressClickUntil = 0;
let sessionHeartbeatTimer = null;
let studentWorkoutsRefreshTimer = null;
let studentWorkoutsRefreshInFlight = false;
let studentLatestWorkoutsRevision = '';
let adminOverviewWorkoutsSearchTerm = '';
let adminOverviewExercisesSearchTerm = '';
let adminOverviewExercisesGroupFilterValue = 'todos';
let trainerTemplateCreatePanelCollapsed = false;
let trainerWorkoutCreatePanelCollapsed = false;
let trainerManagedWorkoutsPanelCollapsed = false;
let adminWorkoutsPanelCollapsed = false;
let adminExercisesPanelCollapsed = false;
let adminSupportPanelCollapsed = false;
let adminSupportView = 'active';
let trainerManagedWorkoutsView = 'assigned';
let adminTeamPanelCollapsed = false;
let siteTeamMembersCache = [];
let siteTeamSyncInFlight = false;
let adminTeamSavingInFlight = false;
const TRAINER_TEMPLATE_PREVIEW_ID_OFFSET = 900000000;
let adminExerciseEditingId = 0;
let adminExerciseEditTriggerButton = null;
let adminExerciseModalReadOnly = false;
let adminUserDeleteTargetId = 0;
let adminUserDeleteTargetName = '';
let adminUserDeleteTriggerButton = null;
let siteConfirmResolve = null;
let siteConfirmTriggerButton = null;
let trainerWorkoutQuickCreateResolve = null;
let trainerWorkoutQuickCreateTriggerButton = null;
let trainerLibraryImagePreviewObjectUrl = '';
let trainerLibraryVideoPreviewObjectUrl = '';
let trainerWorkoutDefinitionsCatalog = [];
let trainerWorkoutPredefinedLastAppliedLabel = '';
let siteTopNoticeHideTimer = null;
let siteTopNoticeCleanupTimer = null;
let siteTopNoticeLastMessage = '';
let siteTopNoticeLastIsSuccess = false;
let siteTopNoticeLastShownAt = 0;
let trainerExerciseQuickCreateInFlight = false;
let trainerWorkoutCreateInFlight = false;
let trainerHiddenWorkoutIds = new Set();
let trainerHiddenWorkoutsInitialized = false;
let trainerHiddenWorkoutsStateLoaded = false;
const PROFILE_AVATAR_MAX_FILE_BYTES = 6 * 1024 * 1024;
const TRAINER_WORKOUT_CREATE_OPTION_VALUE = '__create_workout__';

const LIBRARY_TOPIC_GROUPS = {
  todos: [],
  superiores: ['peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco'],
  core: ['abdomen', 'lombar'],
  inferiores: ['gluteos', 'quadriceps', 'posterior', 'adutores', 'abdutores', 'panturrilhas']
};

const LIBRARY_GROUP_LABELS = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Biceps',
  triceps: 'Triceps',
  antebraco: 'Antebraco',
  abdomen: 'Abdomen',
  lombar: 'Lombar',
  gluteos: 'Gluteos',
  quadriceps: 'Quadriceps',
  posterior: 'Posterior de coxa',
  adutores: 'Adutores',
  abdutores: 'Abdutores',
  panturrilhas: 'Panturrilhas'
};

const DEFAULT_TRAINER_WORKOUT_DEFINITIONS = [
  'Treino A - Peito e Triceps',
  'Treino B - Costas e Biceps',
  'Treino C - Pernas completas',
  'Treino D - Ombros e Core',
  'Treino E - Full Body',
  'Treino F - HIIT e Cardio',
  'Treino G - Mobilidade e Alongamento',
  'Hipertrofia - Iniciante',
  'Hipertrofia - Intermediario',
  'Emagrecimento - Circuito',
  'Resistencia - Funcional',
  'Forca - Base'
];

const LIBRARY_GROUP_ICONS = {
  peito: '💪',
  costas: '🏋️',
  ombros: '🤸',
  biceps: '💥',
  triceps: '🏹',
  antebraco: '✊',
  abdomen: '🧠',
  lombar: '🛡️',
  gluteos: '🍑',
  quadriceps: '🦵',
  posterior: '⚡',
  adutores: '🔗',
  abdutores: '🧭',
  panturrilhas: '🏃'
};

const LIBRARY_GROUP_IMAGES = {
  peito: 'Foto do grupo muscular/logo dna (4)/Peitoral.png',
  costas: 'Foto do grupo muscular/logo dna (4)/Costas.png',
  abdomen: 'img/Abdomem.svg',
  ombros: 'img/capa ombro.svg',
  biceps: 'Foto do grupo muscular/logo dna (4)/Bíceps.png',
  triceps: 'Foto do grupo muscular/logo dna (4)/Tríceps.png',
  gluteos: 'img/Glueteo.svg',
  quadriceps: 'img/capa quadriceps.svg',
  posterior: 'img/posterior coxa.svg',
  adutores: 'img/adutor.svg',
  abdutores: 'img/abdutor.svg',
  panturrilhas: 'img/panturrilha.svg'
};

const getLibraryGroupImageSrc = (groupKey) => {
  const normalizedGroup = String(groupKey || '').trim().toLowerCase();
  const rawPath = LIBRARY_GROUP_IMAGES[normalizedGroup];
  if (!rawPath) return '';
  return encodeURI(rawPath);
};

const getLibraryGroupLabel = (groupKey, fallbackLabel = 'Grupo') => {
  const normalizedGroup = String(groupKey || '').trim().toLowerCase();
  if (!normalizedGroup) return fallbackLabel;
  if (LIBRARY_GROUP_LABELS[normalizedGroup]) return LIBRARY_GROUP_LABELS[normalizedGroup];
  return normalizedGroup
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getAvailableLibraryGroupKeys = (
  exercises = [],
  { includeKnownWhenEmpty = false } = {}
) => {
  const knownOrder = Object.keys(LIBRARY_GROUP_LABELS);
  const groupKeys = Array.isArray(exercises)
    ? Array.from(
      new Set(
        exercises
          .map((exercise) =>
            String(
              (exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group)) || ''
            )
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      )
    )
    : [];

  if (!groupKeys.length && includeKnownWhenEmpty) {
    return knownOrder;
  }

  const orderedKnown = knownOrder.filter((groupKey) => groupKeys.includes(groupKey));
  const extraGroups = groupKeys
    .filter((groupKey) => !knownOrder.includes(groupKey))
    .sort((first, second) => first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }));

  return [...orderedKnown, ...extraGroups];
};

const LIBRARY_GROUP_MUSCLES = {
  peito: ['Peitoral Maior', 'Deltoide Anterior', 'Triceps'],
  costas: ['Latissimo do Dorso', 'Romboides', 'Trapezio'],
  ombros: ['Deltoide Anterior', 'Deltoide Lateral', 'Deltoide Posterior'],
  biceps: ['Biceps Braquial', 'Braquial', 'Braquiorradial'],
  triceps: ['Triceps Longo', 'Triceps Lateral', 'Triceps Medial'],
  antebraco: ['Flexores do Punho', 'Extensores do Punho', 'Braquiorradial'],
  abdomen: ['Reto Abdominal', 'Obliquos', 'Transverso'],
  lombar: ['Eretor da Espinha', 'Multifidos', 'Quadrado Lombar'],
  gluteos: ['Gluteo Maximo', 'Gluteo Medio', 'Gluteo Minimo'],
  quadriceps: ['Reto Femoral', 'Vasto Medial', 'Vasto Lateral'],
  posterior: ['Biceps Femoral', 'Semitendinoso', 'Semimembranoso'],
  adutores: ['Adutor Longo', 'Adutor Magno', 'Pectineo'],
  abdutores: ['Gluteo Medio', 'Tensor da Fascia Lata', 'Gluteo Minimo'],
  panturrilhas: ['Gastrocnemio', 'Soleo', 'Tibial Posterior']
};

const studentData = {
  userId: null,
  userName: 'Rian',
  plan: 'Plano Monster',
  userRole: 'ALUNO',
  userEnabled: true,
  status: 'Ativo',
  objective: 'Hipertrofia com condicionamento',
  profileEmail: 'rianaraujo170606@gmail.com',
  profileStatus: 'Ativo',
  profileAvatarUrl: '',
  memberSince: '15/03/2023',
  level: 'Intermediario',
  notificationsEnabled: true,
  profilePersonalInfo: [],
  profileSettings: [],
  workouts: [],
  progress: { stats: [], weight: [], measures: [], evolution: [] },
  library: []
};

const adminOverviewState = {
  loading: false,
  loaded: false,
  activeTab: 'distribution',
  error: '',
  stats: {
    totalUsers: 0,
    totalUsersEnabled: 0,
    totalWorkouts: 0,
    totalWorkoutsAtivos: 0,
    totalWorkoutsInativos: 0,
    totalExercises: 0,
    totalExercisesAtivos: 0,
    totalExercisesInativos: 0,
    alunos: 0,
    instrutores: 0,
    instrutoresAtivos: 0,
    administradores: 0,
    administradoresAtivos: 0,
    administradoresGerais: 0,
    administradoresGeraisAtivos: 0,
    alunosOnlineAgora: 0,
    janelaOnlineMinutos: 5,
    alunosAtivos: 0,
    alunosDesabilitados: 0,
    onlineAgora: 0,
    supportTicketsPendentes: 0,
    supportResetPendentes: 0
  },
  charts: {
    roleDistribution: [],
    studentsStatus: []
  },
  users: [],
  workouts: [],
  exercises: [],
  supportTickets: []
};

const trainerManagementState = {
  loading: false,
  loaded: false,
  error: '',
  students: [],
  instructors: [],
  templates: [],
  workouts: [],
  library: [],
  exercisesByWorkoutId: {},
  templateExercisesByTemplateId: {}
};

const trainerProgressState = {
  loading: false,
  loaded: false,
  error: '',
  weekStartKey: '',
  weekEndKey: '',
  referenceDateKey: '',
  stats: {
    totalStudents: 0,
    totalAssignedWorkouts: 0,
    totalCompletedSessions: 0
  },
  students: [],
  selectedStudentId: 0
};

const profileSupportState = {
  loading: false,
  loaded: false,
  error: '',
  tickets: []
};

/* Ajuste de dados para o app full-screen */
studentData.status = 'Ativo';
studentData.goalProgress = 68;
studentData.performance = 84;
studentData.weeklyLabels = WEEKDAY_LABELS.slice();

studentData.profilePersonalInfo = [
  { icon: 'mail', label: 'E-mail', value: 'rianaraujo170606@gmail.com' },
  { icon: 'phone', label: 'Telefone', value: '(11) 98765-4321' }
];

studentData.profileSettings = [
  { id: 'support', icon: 'help', label: 'Ajuda e Suporte' }
];

const workoutSeed = [
  { id: 'a', code: 'Treino A', name: 'Peito e triceps', day: 'Segunda e quinta', duration: '60 min' },
  { id: 'b', code: 'Treino B', name: 'Costas e biceps', day: 'Terca e sexta', duration: '55 min' },
  { id: 'c', code: 'Treino C', name: 'Pernas', day: 'Quarta e sabado', duration: '70 min' },
  { id: 'd', code: 'Treino D', name: 'Ombros', day: 'Segunda e quarta', duration: '48 min' },
  { id: 'e', code: 'Treino E', name: 'Abdomen', day: 'Terca e quinta', duration: '40 min' },
  { id: 'f', code: 'Treino F', name: 'Funcional', day: 'Quarta e sexta', duration: '45 min' },
  { id: 'g', code: 'Treino G', name: 'Gluteo', day: 'Segunda e sexta', duration: '52 min' },
  { id: 'h', code: 'Treino H', name: 'Full body', day: 'Sabado', duration: '65 min' },
  { id: 'i', code: 'Treino I', name: 'Cardio', day: 'Terca e sabado', duration: '35 min' },
  { id: 'j', code: 'Treino J', name: 'Mobilidade', day: 'Domingo', duration: '30 min' }
];

const exercisePool = [
  { name: 'Supino reto', series: '4x', reps: '10', load: '50kg' },
  { name: 'Supino inclinado', series: '3x', reps: '12', load: '40kg' },
  { name: 'Triceps corda', series: '3x', reps: '12', load: '25kg' },
  { name: 'Puxada frontal', series: '4x', reps: '10', load: '55kg' },
  { name: 'Remada baixa', series: '3x', reps: '12', load: '45kg' },
  { name: 'Rosca direta', series: '3x', reps: '12', load: '20kg' },
  { name: 'Agachamento livre', series: '4x', reps: '10', load: '60kg' },
  { name: 'Leg press', series: '4x', reps: '12', load: '180kg' },
  { name: 'Extensora', series: '3x', reps: '15', load: '50kg' },
  { name: 'Prancha abdominal', series: '3x', reps: '40', load: '0kg' }
];

const buildWorkoutExercises = (offset = 0) =>
  Array.from({ length: 10 }, (_, index) => ({ ...exercisePool[(index + offset) % exercisePool.length] }));

studentData.workouts = workoutSeed.map((item, index) => ({
  ...item,
  done: false,
  exercises: buildWorkoutExercises(index)
}));


const workoutHeroMap = {
  a: 'aba de img/botao-treino-hoje-1.png',
  b: 'aba de img/treino funcional.png',
  c: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=1400&q=80',
  d: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?auto=format&fit=crop&w=1400&q=80',
  e: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=80',
  f: 'https://images.unsplash.com/photo-1517838277536-f5f99be501d9?auto=format&fit=crop&w=1400&q=80',
  g: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1400&q=80',
  h: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80',
  i: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?auto=format&fit=crop&w=1400&q=80',
  j: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80'
};

const workoutExerciseChecks = {};
const workoutExerciseDeferredQueue = {};
const exerciseDetailMap = {
  'supino reto': {
    duration: 20,
    figure: '',
    instructions: 'Deite no banco com os pés firmes no chão e a escápula encaixada. Desça a barra com controle até a linha do peito e empurre de volta sem perder a postura.'
  },
  'supino inclinado': {
    duration: 20,
    figure: '',
    instructions: 'No banco inclinado, mantenha o core ativo e os ombros estáveis. Desça os halteres em arco controlado e suba sem estender demais os cotovelos.'
  },
  'triceps corda': {
    duration: 20,
    figure: '',
    instructions: 'Mantenha os cotovelos próximos ao corpo. Empurre a corda para baixo até a extensão completa e retorne devagar mantendo tensão no tríceps.'
  },
  'puxada frontal': {
    duration: 20,
    figure: '',
    instructions: 'Segure a barra com pegada confortável e puxe em direção ao peito, conduzindo com os cotovelos. Retorne com controle sem relaxar totalmente.'
  },
  'remada baixa': {
    duration: 20,
    figure: '',
    instructions: 'Sente-se com coluna neutra e peito aberto. Puxe o triângulo até a linha do abdômen e retorne controlando a fase excêntrica.'
  },
  'rosca direta': {
    duration: 20,
    figure: '',
    instructions: 'Mantenha os cotovelos fixos ao lado do tronco. Eleve a barra contraindo o bíceps e desça lentamente sem balançar o corpo.'
  },
  'agachamento livre': {
    duration: 20,
    figure: '',
    instructions: 'Pés alinhados à largura dos ombros, coluna neutra e core ativo. Desça com controle e suba empurrando o chão com os pés.'
  },
  'leg press': {
    duration: 20,
    figure: '',
    instructions: 'Apoie completamente a lombar no encosto. Flexione os joelhos com controle e estenda sem travar totalmente a articulação.'
  },
  extensora: {
    duration: 20,
    figure: '',
    instructions: 'Ajuste o banco para alinhar o eixo do joelho. Estenda as pernas com contração no quadríceps e retorne lentamente.'
  }
};

studentData.progress = {
  stats: [
    { label: 'Treinos no mes', value: '12' },
    { label: 'Sequencia atual', value: '4 dias' },
    { label: 'Evolucao geral', value: '+11%' }
  ],
  weight: [
    { label: 'Jan', value: 84 },
    { label: 'Fev', value: 82.7 },
    { label: 'Mar', value: 81.5 },
    { label: 'Abr', value: 80.4 },
    { label: 'Mai', value: 79.8 }
  ],
  measures: [
    { label: 'Braco', value: 38 },
    { label: 'Peito', value: 104 },
    { label: 'Cintura', value: 84 },
    { label: 'Coxa', value: 61 }
  ],
  evolution: [
    { label: 'Forca', value: 82 },
    { label: 'Resistencia', value: 74 },
    { label: 'Mobilidade', value: 68 },
    { label: 'Constancia', value: 90 }
  ]
};
studentData.progress.heightCm = 170;
const DEFAULT_STUDENT_PROGRESS_WEIGHT_SERIES = studentData.progress.weight.map((item) => ({ ...item }));
const DEFAULT_STUDENT_PROGRESS_HEIGHT_CM = Number(studentData.progress.heightCm) || 170;

studentData.library = [
  {
    name: 'Supino reto',
    muscle: 'Peito',
    group: 'peito',
    video: '',
    instructions: 'Mantenha escapulas encaixadas e desca a barra com controle.',
    tips: ['Pescoco neutro', 'Punhos firmes', 'Respiracao ritmada']
  },
  {
    name: 'Puxada frontal',
    muscle: 'Costas',
    group: 'costas',
    video: '',
    instructions: 'Puxe com os cotovelos e mantenha o tronco estavel.',
    tips: ['Evite balanco', 'Ative dorsais', 'Controle a volta']
  },
  {
    name: 'Desenvolvimento halteres',
    muscle: 'Ombros',
    group: 'ombros',
    video: '',
    instructions: 'Suba os halteres sem perder postura e alinhamento.',
    tips: ['Punho neutro', 'Core firme', 'Sem arquear lombar']
  },
  {
    name: 'Rosca direta',
    muscle: 'Biceps',
    group: 'biceps',
    video: '',
    instructions: 'Flexione os cotovelos sem balancar o tronco.',
    tips: ['Cotovelos fixos', 'Subida controlada', 'Não roube no movimento']
  },
  {
    name: 'Triceps testa',
    muscle: 'Triceps',
    group: 'triceps',
    video: '',
    instructions: 'Desca a barra na direcao da testa com controle e retorne.',
    tips: ['Bracos estaveis', 'Amplitude completa', 'Sem abrir os cotovelos']
  },
  {
    name: 'Rosca punho',
    muscle: 'Antebraco',
    group: 'antebraco',
    video: '',
    instructions: 'Flexione os punhos mantendo o antebraco apoiado.',
    tips: ['Cadencia lenta', 'Controle na descida', 'Não compensar com ombros']
  },
  {
    name: 'Abdominal infra',
    muscle: 'Abdomen',
    group: 'abdomen',
    video: '',
    instructions: 'Eleve as pernas contraindo o abdomen sem tirar a lombar do banco.',
    tips: ['Core ativo', 'Respire no ritmo', 'Evite embalo']
  },
  {
    name: 'Hiperextensao',
    muscle: 'Lombar',
    group: 'lombar',
    video: '',
    instructions: 'Estenda o tronco com controle sem hiperestender a coluna.',
    tips: ['Movimento curto', 'Controle total', 'Core firme']
  },
  {
    name: 'Elevacao pelvica',
    muscle: 'Gluteos',
    group: 'gluteos',
    video: '',
    instructions: 'Empurre o quadril para cima contraindo gluteos no topo.',
    tips: ['Pes firmes', 'Suba sem pressa', 'Pausa no topo']
  },
  {
    name: 'Cadeira extensora',
    muscle: 'Quadriceps',
    group: 'quadriceps',
    video: '',
    instructions: 'Estenda os joelhos com controle e retorne devagar.',
    tips: ['Sem tranco', 'Amplitude completa', 'Controle da carga']
  },
  {
    name: 'Mesa flexora',
    muscle: 'Posterior de coxa',
    group: 'posterior',
    video: '',
    instructions: 'Flexione os joelhos focando em contrair o posterior.',
    tips: ['Evite elevar quadril', 'Cadencia lenta', 'Amplitude completa']
  },
  {
    name: 'Cadeira adutora',
    muscle: 'Adutores',
    group: 'adutores',
    video: '',
    instructions: 'Aproxime as pernas com controle sem bater os apoios.',
    tips: ['Movimento continuo', 'Controle total', 'Respiracao ritmada']
  },
  {
    name: 'Cadeira abdutora',
    muscle: 'Abdutores',
    group: 'abdutores',
    video: '',
    instructions: 'Afaste as pernas contraindo gluteo medio e lateral do quadril.',
    tips: ['Sem impulso', 'Controle na volta', 'Postura neutra']
  },
  {
    name: 'Panturrilha em pe',
    muscle: 'Panturrilhas',
    group: 'panturrilhas',
    video: '',
    instructions: 'Eleve os calcanhares ao maximo e retorne alongando.',
    tips: ['Pico de contracao', 'Controle na descida', 'Amplitude total']
  }
];

/* ==========================================================================
   6) Student Area - helpers
   ========================================================================== */
const clearInvalidState = (...inputs) => inputs.forEach((i) => i && i.classList.remove('is-invalid'));

const setButtonLoading = (button, text) => {
  if (!button) return;
  button.disabled = true;
  button.classList.add('is-loading');
  const span = button.querySelector('span');
  if (span) span.textContent = text;
};

const clearButtonLoading = (button, text) => {
  if (!button) return;
  button.disabled = false;
  button.classList.remove('is-loading');
  const span = button.querySelector('span');
  if (span) span.textContent = text;
};

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  return email.includes('@') && email.includes('.');
};

const hasStrongPassword = (value) => {
  const password = String(value || '').trim();
  return password.length >= 6;
};

const loadForgotResetRequestState = () => {
  try {
    const raw = localStorage.getItem(STUDENT_FORGOT_RESET_REQUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const email = String(parsed.email || '').trim().toLowerCase();
    const ticketId = Number(parsed.ticketId || 0) || 0;
    if (!email) return null;
    return {
      email,
      ticketId,
      requestedAt: String(parsed.requestedAt || '').trim(),
      lastStatus: String(parsed.lastStatus || '').trim().toUpperCase()
    };
  } catch (_) {
    return null;
  }
};

const saveForgotResetRequestState = ({ email, ticketId = 0, requestedAt = '', lastStatus = '' } = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return;
  try {
    localStorage.setItem(
      STUDENT_FORGOT_RESET_REQUEST_KEY,
      JSON.stringify({
        email: normalizedEmail,
        ticketId: Number(ticketId || 0) || 0,
        requestedAt: String(requestedAt || '').trim() || new Date().toISOString(),
        lastStatus: String(lastStatus || '').trim().toUpperCase()
      })
    );
  } catch (_) {}
};

const clearForgotResetRequestState = () => {
  try {
    localStorage.removeItem(STUDENT_FORGOT_RESET_REQUEST_KEY);
  } catch (_) {}
};

const stopForgotSupportStatusWatcher = () => {
  if (forgotSupportStatusPollTimer) {
    clearInterval(forgotSupportStatusPollTimer);
    forgotSupportStatusPollTimer = null;
  }
  forgotSupportStatusPollInFlight = false;
};

const isForgotAuthViewVisible = () => {
  const forgotPanel = studentForgotRequestForm
    ? studentForgotRequestForm.closest('[data-student-panel]')
    : null;
  return Boolean(forgotPanel && forgotPanel.classList.contains('is-active') && !forgotPanel.hidden);
};

const setForgotStep = (step = 'request') => {
  const isRequestStep = step === 'request';
  if (studentForgotRequestForm) studentForgotRequestForm.hidden = !isRequestStep;
  if (studentForgotResetForm) studentForgotResetForm.hidden = isRequestStep;
};

const setAuthView = (view) => {
  if (view !== 'forgot') {
    stopForgotSupportStatusWatcher();
  }
  studentAuthTabs.forEach((tab) => {
    const active = tab.dataset.studentAuthTab === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  studentAuthPanels.forEach((panel) => {
    const active = panel.dataset.studentPanel === view;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
};

const ensureStudentLoadingVideoSource = () => {
  if (!studentVideo || studentVideoSourceResolved) return;

  const sourceNode = studentVideo.querySelector('source[data-src]');
  if (!(sourceNode instanceof HTMLSourceElement)) {
    studentVideoSourceResolved = true;
    return;
  }

  const sourceUrl = String(sourceNode.dataset.src || '').trim();
  if (!sourceUrl) {
    studentVideoSourceResolved = true;
    return;
  }

  if (!sourceNode.getAttribute('src')) {
    sourceNode.setAttribute('src', sourceUrl);
    studentVideo.load();
  }

  studentVideoSourceResolved = true;
};

const playStudentLoadingVideo = ({ reset = false } = {}) => {
  if (!studentVideo || !studentLoading || !studentArea) return;
  ensureStudentLoadingVideoSource();

  const isLoadingVisible = studentLoading.classList.contains('is-visible');
  const isAreaOpen = !studentArea.hidden;
  if (!isLoadingVisible || !isAreaOpen) return;

  studentVideo.muted = true;
  studentVideo.defaultMuted = true;
  studentVideo.autoplay = true;
  studentVideo.loop = true;
  studentVideo.playsInline = true;
  if (reset) studentVideo.currentTime = 0;

  const attempt = studentVideo.play();
  if (attempt && typeof attempt.catch === 'function') {
    attempt.catch(() => {});
  }
};

const setOverlayView = (view) => {
  if (!studentLoading || !studentLogin || !studentApp || !studentArea) return;
  studentLoading.classList.toggle('is-visible', view === 'loading');
  studentLogin.classList.toggle('is-visible', view === 'login');
  studentApp.classList.toggle('is-visible', view === 'app');
  if (view !== 'app') hideSiteTopNotice({ immediate: true });
  studentArea.classList.remove('view-loading', 'view-login', 'view-app');
  studentArea.classList.add(`view-${view}`);

  if (view === 'loading') {
    playStudentLoadingVideo();
  } else if (studentVideo) {
    studentVideo.pause();
  }

  if (view === 'app') {
    startStudentWorkoutsRefresh();
  } else {
    stopStudentWorkoutsRefresh();
  }

  if (view === 'login') {
    resumeForgotSupportStatusWatcher({ autoOpenForgotView: true });
  }

  const isOpen = !studentArea.hidden;
  if (isOpen) {
    saveStudentAreaState({
      isOpen: true,
      overlay: view,
      tab: currentStudentTab,
      panel: currentStudentPanel
    });
  }
};

const clearStudentTimer = () => {
  if (!studentLoadingTimer) return;
  clearTimeout(studentLoadingTimer);
  studentLoadingTimer = null;
};

const saveStudentAreaState = (state) => {
  try {
    localStorage.setItem(STUDENT_AREA_STATE_KEY, JSON.stringify(state));
  } catch (_) {}
};

const loadStudentAreaState = () => {
  try {
    const raw = localStorage.getItem(STUDENT_AREA_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_) {
    return null;
  }
};

const clearStudentAreaState = () => {
  try {
    localStorage.removeItem(STUDENT_AREA_STATE_KEY);
  } catch (_) {}
};

const ensureTrainerHiddenWorkoutsStateLoaded = () => {
  if (trainerHiddenWorkoutsStateLoaded) return;
  trainerHiddenWorkoutsStateLoaded = true;

  try {
    const rawIds = localStorage.getItem(TRAINER_HIDDEN_WORKOUT_IDS_KEY);
    const parsedIds = rawIds ? JSON.parse(rawIds) : [];
    if (Array.isArray(parsedIds)) {
      trainerHiddenWorkoutIds = new Set(
        parsedIds
          .map((value) => Number(value) || 0)
          .filter((value) => value > 0)
      );
    } else {
      trainerHiddenWorkoutIds = new Set();
    }
  } catch (_) {
    trainerHiddenWorkoutIds = new Set();
  }

  try {
    trainerHiddenWorkoutsInitialized =
      localStorage.getItem(TRAINER_HIDDEN_WORKOUTS_INITIALIZED_KEY) === 'true';
  } catch (_) {
    trainerHiddenWorkoutsInitialized = false;
  }
};

const persistTrainerHiddenWorkoutState = () => {
  ensureTrainerHiddenWorkoutsStateLoaded();
  try {
    localStorage.setItem(
      TRAINER_HIDDEN_WORKOUT_IDS_KEY,
      JSON.stringify(Array.from(trainerHiddenWorkoutIds))
    );
    localStorage.setItem(
      TRAINER_HIDDEN_WORKOUTS_INITIALIZED_KEY,
      trainerHiddenWorkoutsInitialized ? 'true' : 'false'
    );
  } catch (_) {}
};

const hideTrainerInitialWorkoutsOnce = (workouts = []) => {
  ensureTrainerHiddenWorkoutsStateLoaded();
  if (trainerHiddenWorkoutsInitialized) return;

  const resolvedWorkoutIds = (Array.isArray(workouts) ? workouts : [])
    .map((workout) => Number(workout && workout.id) || 0)
    .filter((workoutId) => workoutId > 0);
  if (!resolvedWorkoutIds.length) return;

  resolvedWorkoutIds.forEach((workoutId) => trainerHiddenWorkoutIds.add(workoutId));

  trainerHiddenWorkoutsInitialized = true;
  persistTrainerHiddenWorkoutState();
};

const unhideTrainerWorkoutById = (workoutId) => {
  const resolvedWorkoutId = Number(workoutId) || 0;
  if (!resolvedWorkoutId) return;
  ensureTrainerHiddenWorkoutsStateLoaded();
  if (!trainerHiddenWorkoutIds.has(resolvedWorkoutId)) return;
  trainerHiddenWorkoutIds.delete(resolvedWorkoutId);
  persistTrainerHiddenWorkoutState();
};

const getTrainerVisibleWorkouts = (workouts = []) => {
  ensureTrainerHiddenWorkoutsStateLoaded();
  const list = (Array.isArray(workouts) ? workouts : []).filter((workout) => {
    const workoutId = Number(workout && workout.id) || 0;
    return workoutId > 0;
  });

  if (isGeneralAdminUser()) return list;

  const visibleWorkouts = list.filter((workout) => {
    const workoutId = Number(workout && workout.id) || 0;
    return !trainerHiddenWorkoutIds.has(workoutId);
  });

  if (visibleWorkouts.length) return visibleWorkouts;

  // Recupera a listagem quando um estado antigo acabou ocultando todos os treinos.
  if (list.length && trainerHiddenWorkoutIds.size) {
    trainerHiddenWorkoutIds.clear();
    trainerHiddenWorkoutsInitialized = true;
    persistTrainerHiddenWorkoutState();
  }
  return list;
};

const closeGroupLibrarySheets = () => {
  if (groupGuideSheet) groupGuideSheet.hidden = true;
  if (groupDetailSheet) groupDetailSheet.hidden = true;
  if (groupCreateSheet) groupCreateSheet.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-library-guide-mode');
};

const resetStudentForms = () => {
  if (studentLoginForm) studentLoginForm.reset();
  if (studentRegisterForm) studentRegisterForm.reset();
  if (studentForgotRequestForm) studentForgotRequestForm.reset();
  if (studentForgotResetForm) studentForgotResetForm.reset();
  if (profileSupportForm) profileSupportForm.reset();
  clearInvalidState(
    studentUserInput,
    studentPassInput,
    studentRegisterName,
    studentRegisterEmail,
    studentRegisterPhone,
    studentRegisterPass,
    studentRegisterPassConfirm,
    studentForgotEmail,
    studentForgotType,
    studentForgotDescription,
    studentForgotToken,
    studentForgotNewPass,
    studentForgotConfirmPass
  );
  if (studentFormError) { studentFormError.textContent = ''; studentFormError.classList.remove('is-success'); }
  if (studentRegisterError) { studentRegisterError.textContent = ''; studentRegisterError.classList.remove('is-success'); }
  if (studentForgotRequestError) { studentForgotRequestError.textContent = ''; studentForgotRequestError.classList.remove('is-success'); }
  if (studentForgotResetError) { studentForgotResetError.textContent = ''; studentForgotResetError.classList.remove('is-success'); }
  if (profileSupportFeedback) { profileSupportFeedback.textContent = ''; profileSupportFeedback.classList.remove('is-success'); }
  if (profileSupportList) profileSupportList.innerHTML = '';
  profileSupportState.loading = false;
  profileSupportState.loaded = false;
  profileSupportState.error = '';
  profileSupportState.tickets = [];
  clearButtonLoading(studentSubmitButton, 'Entrar');
  clearButtonLoading(studentRegisterSubmit, 'Cadastrar');
  clearButtonLoading(studentForgotRequestSubmit, 'Enviar solicitação');
  clearButtonLoading(studentForgotResetSubmit, 'Redefinir senha');
  if (studentShowPassInput) studentShowPassInput.checked = false;
  if (studentPassInput) studentPassInput.type = 'password';
  setForgotStep('request');
  setAuthView('login');
  applyRememberedLoginDefaults();
};

const syncLoginPasswordVisibility = () => {
  if (!studentPassInput) return;
  const shouldShowPassword = Boolean(studentShowPassInput && studentShowPassInput.checked);
  studentPassInput.type = shouldShowPassword ? 'text' : 'password';
};

const displayNameFromLogin = (value) => {
  if (!value) return 'Aluno';
  const base = value.includes('@') ? value.split('@')[0] : value;
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
};

const formatPhoneFromDigits = (digits) => {
  const clean = String(digits || '').replace(/\D/g, '');
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return clean;
};

const saveRememberPreference = (remember) => {
  try {
    localStorage.setItem(STUDENT_REMEMBER_LOGIN_KEY, remember ? 'true' : 'false');
  } catch (_) {}
};

const loadRememberPreference = () => {
  try {
    return localStorage.getItem(STUDENT_REMEMBER_LOGIN_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const storageByRemember = (remember) => (remember ? localStorage : sessionStorage);

const saveStudentAuthProfile = (profile, remember = true) => {
  const target = storageByRemember(remember);
  const fallback = remember ? sessionStorage : localStorage;
  try {
    target.setItem(STUDENT_AUTH_PROFILE_KEY, JSON.stringify(profile));
    fallback.removeItem(STUDENT_AUTH_PROFILE_KEY);
  } catch (_) {}
};

const clearStudentAuthProfile = () => {
  try {
    localStorage.removeItem(STUDENT_AUTH_PROFILE_KEY);
    sessionStorage.removeItem(STUDENT_AUTH_PROFILE_KEY);
  } catch (_) {}
};

const saveStudentAuthToken = (token, remember = true) => {
  const target = storageByRemember(remember);
  const fallback = remember ? sessionStorage : localStorage;
  try {
    target.setItem(STUDENT_AUTH_TOKEN_KEY, String(token || ''));
    fallback.removeItem(STUDENT_AUTH_TOKEN_KEY);
  } catch (_) {
    // noop
  }
};

const loadStudentAuthToken = () => {
  try {
    const sessionToken = sessionStorage.getItem(STUDENT_AUTH_TOKEN_KEY);
    if (sessionToken && typeof sessionToken === 'string' && sessionToken.trim()) return sessionToken.trim();

    const localToken = localStorage.getItem(STUDENT_AUTH_TOKEN_KEY);
    if (localToken && typeof localToken === 'string' && localToken.trim()) return localToken.trim();
    return '';
  } catch (_) {
    return '';
  }
};

const clearStudentAuthToken = () => {
  try {
    localStorage.removeItem(STUDENT_AUTH_TOKEN_KEY);
    sessionStorage.removeItem(STUDENT_AUTH_TOKEN_KEY);
  } catch (_) {}
};

const loadStudentAuthProfile = () => {
  try {
    const sessionRaw = sessionStorage.getItem(STUDENT_AUTH_PROFILE_KEY);
    if (sessionRaw) {
      const parsedSession = JSON.parse(sessionRaw);
      if (parsedSession && typeof parsedSession === 'object') return parsedSession;
    }

    const localRaw = localStorage.getItem(STUDENT_AUTH_PROFILE_KEY);
    if (!localRaw) return null;
    const parsed = JSON.parse(localRaw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_) {
    return null;
  }
};

const getStudentBodyMetricsStorageKey = (emailHint = '') => {
  const hintedEmail = String(emailHint || '').trim().toLowerCase();
  const profile = loadStudentAuthProfile();
  const resolvedEmail =
    hintedEmail ||
    String((profile && profile.email) || studentData.profileEmail || '')
      .trim()
      .toLowerCase();
  return resolvedEmail ? `${STUDENT_BODY_METRICS_KEY}:${resolvedEmail}` : STUDENT_BODY_METRICS_KEY;
};

const normalizeBodyMetricsSnapshot = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const rawWeight = Number(source.weightKg);
  const rawHeight = Number(source.heightCm);
  const weightKg = Number.isFinite(rawWeight) ? Number(rawWeight.toFixed(1)) : null;
  const heightCm = Number.isFinite(rawHeight) ? Math.round(rawHeight) : null;
  const dateKeyValue = String(source.dateKey || '').trim();
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateKeyValue) ? dateKeyValue : '';
  const updatedAt = String(source.updatedAt || '').trim();

  return {
    weightKg,
    heightCm,
    dateKey,
    updatedAt
  };
};

const resetStudentBodyMetricsToDefault = () => {
  studentData.progress.weight = DEFAULT_STUDENT_PROGRESS_WEIGHT_SERIES.map((item) => ({ ...item }));
  studentData.progress.heightCm = DEFAULT_STUDENT_PROGRESS_HEIGHT_CM;
};

const applyStudentBodyMetricsToUiState = (snapshot) => {
  const metrics = normalizeBodyMetricsSnapshot(snapshot);
  if (metrics.weightKg !== null) {
    if (Array.isArray(studentData.progress.weight) && studentData.progress.weight.length) {
      studentData.progress.weight[studentData.progress.weight.length - 1].value = metrics.weightKg;
    } else {
      const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(new Date())
        .replace('.', '');
      studentData.progress.weight = [{ label: monthLabel, value: metrics.weightKg }];
    }
  }

  if (metrics.heightCm !== null) {
    studentData.progress.heightCm = metrics.heightCm;
  }

  return metrics;
};

const loadStudentBodyMetricsCache = (emailHint = '') => {
  try {
    const raw = localStorage.getItem(getStudentBodyMetricsStorageKey(emailHint));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizeBodyMetricsSnapshot(parsed);
    if (normalized.weightKg === null && normalized.heightCm === null) return null;
    return normalized;
  } catch (_) {
    return null;
  }
};

const saveStudentBodyMetricsCache = (snapshot, emailHint = '') => {
  const normalized = normalizeBodyMetricsSnapshot(snapshot);
  if (normalized.weightKg === null && normalized.heightCm === null) return false;
  try {
    localStorage.setItem(getStudentBodyMetricsStorageKey(emailHint), JSON.stringify(normalized));
    return true;
  } catch (_) {
    return false;
  }
};

const getDeviceName = () => {
  const platform = String(navigator.platform || 'unknown').trim();
  const agent = String(navigator.userAgent || '').trim();
  return `${platform} | ${agent}`.slice(0, 80);
};

const ROLE_LABEL_MAP = {
  ALUNO: 'Aluno',
  INSTRUTOR: 'Instrutor',
  ADMIN: 'Administrador',
  ADMIN_GERAL: 'Administrador Geral'
};
const ADMIN_ROLE_OPTIONS = ['ALUNO', 'INSTRUTOR', 'ADMIN', 'ADMIN_GERAL'];

const normalizeRole = (role) => String(role || '').trim().toUpperCase();
const isOfflineFallbackIdentity = (profileLike) => {
  const email = String(profileLike && profileLike.email ? profileLike.email : '').trim().toLowerCase();
  const name = String(profileLike && profileLike.name ? profileLike.name : '').trim().toLowerCase();
  return email === 'offline@local.dev' || name === 'usuario local' || name === 'usuário local';
};
const normalizeRoleSafely = (profileLike, roleValue, fallbackRole = 'ALUNO') => {
  if (isOfflineFallbackIdentity(profileLike)) return 'ALUNO';
  const normalized = normalizeRole(roleValue || fallbackRole);
  return normalized || fallbackRole;
};
const hasActiveStudentSession = () => Boolean(loadStudentAuthToken());

const isGeneralAdminRole = (role) => normalizeRole(role) === 'ADMIN_GERAL';

const isGeneralAdminUser = () => hasActiveStudentSession() && isGeneralAdminRole(studentData.userRole);

const isTrainerManagerRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'ADMIN_GERAL' || normalizedRole === 'INSTRUTOR';
};

const isInstructorRole = (role) => normalizeRole(role) === 'INSTRUTOR';

const isTrainerManagerUser = () =>
  hasActiveStudentSession() && isTrainerManagerRole(studentData.userRole);

const isInstructorUser = () =>
  hasActiveStudentSession() && isInstructorRole(studentData.userRole);

const isLibraryManagerRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'ADMIN_GERAL' || normalizedRole === 'ADMIN';
};

const isLibraryManagerUser = () =>
  hasActiveStudentSession() && isLibraryManagerRole(studentData.userRole);

const getDefaultMainTabForCurrentRole = () => {
  if (isGeneralAdminUser()) return 'admin-geral';
  if (isTrainerManagerUser()) return 'admin-treinos';
  return 'dashboard';
};

const getRoleLabel = (role) => ROLE_LABEL_MAP[normalizeRole(role)] || 'Não definido';

function formatMemberSinceDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
}

const ensureProfileRoleLine = () => {
  let roleLine = studentData.profilePersonalInfo.find((item) => item.label === 'Função');
  if (!roleLine) {
    roleLine = { icon: 'shield', label: 'Função', value: getRoleLabel(studentData.userRole) };
    studentData.profilePersonalInfo.push(roleLine);
  }
  return roleLine;
};

const ensureProfileAccountStatusLine = () => {
  let statusLine = studentData.profilePersonalInfo.find((item) => item.label === 'Status da conta');
  if (!statusLine) {
    statusLine = { icon: 'shield', label: 'Status da conta', value: studentData.userEnabled ? 'Habilitada' : 'Desabilitada' };
    studentData.profilePersonalInfo.push(statusLine);
  }
  return statusLine;
};

const isLikelyAvatarUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(raw)) return true;
  if (/^[a-z0-9._-]+\/[a-z0-9._\-/%]+$/i.test(raw)) return true;
  if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(raw)) return true;
  return false;
};

const getProfileAvatarFromSource = (source, fallback = '') => {
  const candidates = [
    source && source.avatarUrl,
    source && source.avatar_url,
    source && source.profilePhotoUrl,
    source && source.profile_photo_url,
    source && source.photoUrl,
    source && source.photo_url,
    source && source.imageUrl,
    source && source.image_url,
    source && source.avatar,
    source && source.photo,
    source && source.image,
    fallback
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;
    if (isLikelyAvatarUrl(value)) return value;
  }
  return '';
};

const getWorkoutCoverFromSource = (source, fallback = '') => {
  const candidates = [
    source && source.coverImageUrl,
    source && source.cover_image_url,
    source && source.coverUrl,
    source && source.cover_url,
    fallback
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;
    return value;
  }
  return '';
};

const isWorkoutInactive = (workout) => {
  if (!workout || typeof workout !== 'object') return false;

  const booleanLikeCandidates = [
    workout.isActive,
    workout.is_active,
    workout.active,
    workout.enabled
  ];

  for (const candidate of booleanLikeCandidates) {
    if (candidate === false) return true;
    const normalizedCandidate = String(candidate || '').trim().toLowerCase();
    if (!normalizedCandidate) continue;
    if (
      normalizedCandidate === 'false' ||
      normalizedCandidate === '0' ||
      normalizedCandidate === 'inativo' ||
      normalizedCandidate === 'inactive' ||
      normalizedCandidate === 'desativado' ||
      normalizedCandidate === 'disabled'
    ) {
      return true;
    }
  }

  const statusCandidates = [
    workout.status,
    workout.workoutStatus,
    workout.state,
    workout.situation,
    workout.situacao
  ];

  for (const candidate of statusCandidates) {
    const normalizedStatus = String(candidate || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (!normalizedStatus) continue;
    if (
      normalizedStatus === 'INATIVO' ||
      normalizedStatus === 'INACTIVE' ||
      normalizedStatus === 'DESATIVADO' ||
      normalizedStatus === 'DISABLED'
    ) {
      return true;
    }
  }

  return false;
};

const isWorkoutActive = (workout) => !isWorkoutInactive(workout);

const resolveWorkoutCoverImageUrl = (source, fallback = '') => {
  const value = getWorkoutCoverFromSource(source, fallback);
  if (!value) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(value)) return value;
  return resolveApiMediaUrl(value);
};

const resolveProfileAvatarUrl = (rawUrl) => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (!isLikelyAvatarUrl(value)) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(value)) return value;
  return resolveApiMediaUrl(value);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '').trim();
      if (!result) {
        reject(new Error('Não foi possível ler a imagem selecionada.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });

const persistProfileAvatarToStoredSession = (avatarUrl) => {
  const remember = loadRememberPreference();
  const currentProfile = loadStudentAuthProfile();
  const baseProfile = currentProfile && typeof currentProfile === 'object'
    ? currentProfile
    : {
      id: Number(studentData.userId) || null,
      name: studentData.userName || '',
      email: studentData.profileEmail || '',
      role: normalizeRole(studentData.userRole || 'ALUNO'),
      isEnabled: studentData.userEnabled !== false
    };
  saveStudentAuthProfile(
    {
      ...baseProfile,
      avatarUrl: String(avatarUrl || '').trim()
    },
    remember
  );
};

const handleProfileAvatarFileSelection = async (file) => {
  if (!file) return;
  const fileType = String(file.type || '').trim().toLowerCase();
  if (!fileType.startsWith('image/')) {
    showSiteTopNotice('Selecione apenas arquivo de imagem para a foto de perfil.', false);
    return;
  }
  const fileSize = Number(file.size) || 0;
  if (fileSize <= 0) {
    showSiteTopNotice('Arquivo inválido. Escolha outra imagem.', false);
    return;
  }
  if (fileSize > PROFILE_AVATAR_MAX_FILE_BYTES) {
    showSiteTopNotice('A foto deve ter no máximo 6 MB.', false);
    return;
  }

  let finalAvatarUrl = '';
  let persistableAvatarUrl = '';
  try {
    if (profileAvatarEditButton) profileAvatarEditButton.disabled = true;

    try {
      const uploadedMedia = await uploadStudentMediaFile(file);
      finalAvatarUrl = String(
        (uploadedMedia && (uploadedMedia.absoluteUrl || uploadedMedia.url)) || ''
      ).trim();
      persistableAvatarUrl = String(
        (uploadedMedia && (uploadedMedia.url || uploadedMedia.absoluteUrl)) || ''
      ).trim();
    } catch (_) {
      finalAvatarUrl = '';
      persistableAvatarUrl = '';
    }

    if (!finalAvatarUrl) {
      finalAvatarUrl = await readFileAsDataUrl(file);
    }

    if (!finalAvatarUrl) {
      throw new Error('Não foi possível atualizar a foto de perfil.');
    }

    const shouldPersistOnBackend =
      Boolean(persistableAvatarUrl) &&
      !/^(data:image\/|blob:)/i.test(String(persistableAvatarUrl || '').trim());
    if (shouldPersistOnBackend) {
      const profileResponse = await requestStudentApi('/auth/profile/avatar', {
        method: 'PATCH',
        body: {
          avatarUrl: persistableAvatarUrl
        }
      });
      const backendAvatarUrl = getProfileAvatarFromSource(
        profileResponse && profileResponse.user,
        persistableAvatarUrl
      );
      if (backendAvatarUrl) {
        finalAvatarUrl = resolveProfileAvatarUrl(backendAvatarUrl);
      }
    }

    studentData.profileAvatarUrl = finalAvatarUrl;
    persistProfileAvatarToStoredSession(finalAvatarUrl);
    renderProfile();
    showSiteTopNotice('Foto de perfil atualizada com sucesso.', true);
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : 'Não foi possível atualizar a foto de perfil.';
    showSiteTopNotice(message, false);
  } finally {
    if (profileAvatarEditButton) profileAvatarEditButton.disabled = false;
    if (profileAvatarInput) profileAvatarInput.value = '';
  }
};

function syncLibraryManagerUi() {
  const canManageLibrary = isLibraryManagerUser();
  if (libraryManagerSection) libraryManagerSection.hidden = !canManageLibrary;

  if (!canManageLibrary) {
    isLibraryManagerFormOpen = false;
    if (libraryManagerFormWrap) libraryManagerFormWrap.hidden = true;
    if (trainerLibraryForm) trainerLibraryForm.reset();
    resetTrainerLibraryMediaPreviews();
    if (libraryManagerFeedback) {
      libraryManagerFeedback.textContent = '';
      libraryManagerFeedback.classList.remove('is-success');
    }
    return;
  }

  if (libraryManagerFormWrap) libraryManagerFormWrap.hidden = !isLibraryManagerFormOpen;
  if (!isLibraryManagerFormOpen) {
    if (trainerLibraryForm) trainerLibraryForm.reset();
    resetTrainerLibraryMediaPreviews();
  }

  if (libraryManagerToggleButton) {
    const label = isLibraryManagerFormOpen ? 'Fechar cadastro de exercício' : 'Adicionar à biblioteca';
    libraryManagerToggleButton.innerHTML = `<span>${label}</span>`;
  }
}

function syncTrainerExerciseComposerUi({ focus = false, scroll = false } = {}) {
  const canManageExercises = isTrainerManagerUser();

  if (canManageExercises && !trainerExerciseFocusButton) {
    isTrainerExerciseComposerOpen = true;
  }

  if (!canManageExercises) {
    isTrainerExerciseComposerOpen = false;
    closeTrainerExerciseLibraryPicker({ clearSearch: true });
  }

  if (trainerExerciseForm) {
    trainerExerciseForm.hidden = !isTrainerExerciseComposerOpen;
  }

  if (!isTrainerExerciseComposerOpen) {
    closeTrainerExerciseLibraryPicker({ clearSearch: true });
  }

  syncTrainerExerciseGroupDrivenUi();
  renderTrainerExerciseLibraryPicker();

  if (trainerExerciseFocusButton) {
    const buttonLabel = isTrainerExerciseComposerOpen ? 'Fechar formulário' : 'Adicionar ao treino';
    trainerExerciseFocusButton.innerHTML = `<span aria-hidden="true">${isTrainerExerciseComposerOpen ? '-' : '+'}</span><span>${buttonLabel}</span>`;
    trainerExerciseFocusButton.disabled = trainerManagementState.loading;
  }

  if (trainerExerciseWorkoutSelect) {
    const targetValue = String(trainerExerciseComposerSelectedId || '').trim();
    if (targetValue && Array.from(trainerExerciseWorkoutSelect.options).some((option) => option.value === targetValue)) {
      trainerExerciseWorkoutSelect.value = targetValue;
    }
  }
  syncTrainerExerciseWorkoutQuickActions();
  renderTrainerWorkoutCoverBuilder();

  if (isTrainerExerciseComposerOpen && scroll) {
    const target = trainerExerciseForm;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (isTrainerExerciseComposerOpen && focus) {
    if (trainerExerciseGroupSelect) {
      trainerExerciseGroupSelect.focus({ preventScroll: true });
    } else if (trainerExerciseNameInput) {
      trainerExerciseNameInput.focus({ preventScroll: true });
    }
  }
}

function openTrainerWorkoutCreateFromExerciseField() {
  if (!isTrainerManagerUser()) return false;

  const infoMessage = 'Crie e salve o treino antes de adicionar exercícios.';
  setTrainerManagementFeedback(infoMessage, true);
  setTrainerExerciseFeedback(infoMessage, true);
  if (typeof setTrainerTemplateCreatePanelCollapsed === 'function') {
    setTrainerTemplateCreatePanelCollapsed(false);
  }

  const scrollTarget =
    (trainerTemplateForm && trainerTemplateForm.closest('article')) ||
    trainerWorkoutCreateCard ||
    trainerWorkoutForm;
  if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const focusTarget =
    trainerTemplateFormNameInput ||
    trainerTemplateFormDescriptionInput ||
    trainerTemplateFormActiveSelect ||
    trainerTemplateSelect;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    window.requestAnimationFrame(() => {
      focusTarget.focus({ preventScroll: true });
    });
  }

  return true;
}

async function createTrainerWorkoutFromExerciseField() {
  if (!isTrainerManagerUser()) return false;
  if (trainerExerciseQuickCreateInFlight) return false;

  const selectedGroups = getSelectedTrainerExerciseGroups();
  const selectedGroupsLabel = getTrainerExerciseGroupsLabel(selectedGroups, 'Geral');
  const suggestedWorkoutName = selectedGroups.length
    ? `Treino A - ${selectedGroupsLabel}`
    : 'Treino A - Peito e triceps';
  if (trainerTemplateFormNameInput && !String(trainerTemplateFormNameInput.value || '').trim()) {
    trainerTemplateFormNameInput.value = suggestedWorkoutName;
  }
  trainerExerciseTargetWorkoutId = 0;
  trainerExerciseComposerSelectedId = '';
  if (trainerExerciseWorkoutSelect) trainerExerciseWorkoutSelect.value = '';
  openTrainerWorkoutCreateFromExerciseField();
  return false;
}

const applyRoleBasedUiMode = () => {
  const isGeneralAdmin = isGeneralAdminUser();
  const isTrainerManager = isTrainerManagerUser();
  if (studentAppShell) {
    studentAppShell.classList.toggle('is-admin-geral-mode', isGeneralAdmin);
    studentAppShell.classList.toggle('is-trainer-mode', isTrainerManager);
  }
  if (trainerOpenLibraryManagerButton) {
    const canOpenLibraryManagerFromTraining = isTrainerManager && isLibraryManagerUser();
    trainerOpenLibraryManagerButton.hidden = !canOpenLibraryManagerFromTraining;
  }
  const canManageTrainerWorkouts = isTrainerManager;
  if (trainerExerciseCreateCard) {
    trainerExerciseCreateCard.hidden = !canManageTrainerWorkouts;
    if (!canManageTrainerWorkouts) {
      isTrainerExerciseComposerOpen = false;
    }
  }
  if (trainerLinkedExercisesCard) {
    trainerLinkedExercisesCard.hidden = !canManageTrainerWorkouts;
  }
  if (studentProgressReport) studentProgressReport.hidden = isTrainerManager;
  if (trainerProgressReport) trainerProgressReport.hidden = !isTrainerManager;
  syncLibraryManagerUi();
  syncTrainerExerciseComposerUi();
};

const applyStudentAuthProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return;
  const previousUserId = Number(studentData.userId || 0);
  const previousEmail = String(studentData.profileEmail || '').trim().toLowerCase();
  const nextUserId = Number(profile.id || studentData.userId || 0);
  const nextName = String(profile.name || '').trim();
  const nextEmail = String(profile.email || '').trim().toLowerCase();
  const nextPhoneDigits = String(profile.phoneDigits || '').replace(/\D/g, '');
  const nextCreatedAt = String(profile.createdAt || '').trim();
  const nextRole = normalizeRoleSafely(profile, profile.role || studentData.userRole || 'ALUNO');
  const nextAvatarUrl = getProfileAvatarFromSource(profile, studentData.profileAvatarUrl || '');
  const nextIsEnabled =
    profile.isEnabled === undefined || profile.isEnabled === null
      ? Boolean(studentData.userEnabled)
      : Boolean(profile.isEnabled);
  const identityChanged =
    (Number.isFinite(nextUserId) && nextUserId > 0 && nextUserId !== previousUserId) ||
    (Boolean(nextEmail) && nextEmail !== previousEmail);
  const resolvedIdentityEmail = nextEmail || previousEmail;

  if (Number.isFinite(nextUserId) && nextUserId > 0) studentData.userId = nextUserId;
  if (nextName) studentData.userName = nextName;
  if (nextEmail) studentData.profileEmail = nextEmail;
  studentData.profileAvatarUrl = nextAvatarUrl;
  if (nextCreatedAt) {
    const formattedMemberSince = formatMemberSinceDate(nextCreatedAt);
    if (formattedMemberSince) studentData.memberSince = formattedMemberSince;
  }
  if (nextRole) studentData.userRole = nextRole;
  studentData.userEnabled = nextIsEnabled;

  const emailLine = studentData.profilePersonalInfo.find((item) => item.label === 'E-mail');
  if (emailLine && nextEmail) emailLine.value = nextEmail;

  const phoneLine = studentData.profilePersonalInfo.find((item) => item.label === 'Telefone');
  if (phoneLine && nextPhoneDigits) phoneLine.value = formatPhoneFromDigits(nextPhoneDigits);

  const roleLine = ensureProfileRoleLine();
  if (roleLine) roleLine.value = getRoleLabel(nextRole);

  const accountStatusLine = ensureProfileAccountStatusLine();
  if (accountStatusLine) accountStatusLine.value = nextIsEnabled ? 'Habilitada' : 'Desabilitada';

  if (identityChanged) {
    resetStudentBodyMetricsToDefault();
    profileSupportState.loading = false;
    profileSupportState.loaded = false;
    profileSupportState.error = '';
    profileSupportState.tickets = [];
    const cachedBodyMetrics = loadStudentBodyMetricsCache(resolvedIdentityEmail);
    if (cachedBodyMetrics) {
      applyStudentBodyMetricsToUiState(cachedBodyMetrics);
    }
  }

  applyRoleBasedUiMode();
};

const resetAuthIdentityToDefault = ({ clearStoredToken = false, clearStoredProfile = false } = {}) => {
  if (clearStoredToken) clearStudentAuthToken();
  if (clearStoredProfile) clearStudentAuthProfile();

  studentData.userRole = 'ALUNO';
  studentData.userId = null;
  studentData.userEnabled = true;
  studentData.profileAvatarUrl = '';
  studentLatestWorkoutsRevision = '';
  resetStudentBodyMetricsToDefault();
  profileSupportState.loading = false;
  profileSupportState.loaded = false;
  profileSupportState.error = '';
  profileSupportState.tickets = [];
  applyRoleBasedUiMode();
};

const applyRememberedLoginDefaults = () => {
  const remember = loadRememberPreference();
  if (studentRememberInput) studentRememberInput.checked = remember;

  if (!remember) return;
  const profile = loadStudentAuthProfile();
  if (studentUserInput && profile && profile.email) {
    studentUserInput.value = String(profile.email).trim().toLowerCase();
  }
};

const cachedAuthTokenAtBoot = loadStudentAuthToken();
const cachedAuthProfile = loadStudentAuthProfile();
if (cachedAuthTokenAtBoot && cachedAuthProfile) {
  applyStudentAuthProfile(cachedAuthProfile);
} else {
  resetAuthIdentityToDefault({
    clearStoredToken: !cachedAuthTokenAtBoot,
  });
}
applyRememberedLoginDefaults();

const getApiErrorMessage = (payload, fallbackMessage) => {
  if (payload && payload.error && typeof payload.error.message === 'string' && payload.error.message.trim()) {
    return payload.error.message.trim();
  }
  if (payload && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  return fallbackMessage;
};

const extractWorkoutsFromResponse = (payload) => {
  if (Array.isArray(payload && payload.workouts)) return payload.workouts;
  if (Array.isArray(payload && payload.data && payload.data.workouts)) return payload.data.workouts;
  if (Array.isArray(payload && payload.result && payload.result.workouts)) return payload.result.workouts;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeStudentWorkoutsRevision = (value) => String(value || '').trim();

const computeStudentWorkoutsRevisionFromList = (workouts = []) => {
  const list = Array.isArray(workouts) ? workouts : [];
  if (!list.length) return '0:0:none';

  let activeCount = 0;
  let latestTimestamp = 0;
  list.forEach((workout) => {
    if (workout && workout.isActive !== false && workout.is_active !== false) activeCount += 1;
    const rawTimestamp = String(
      (workout && (workout.updatedAt || workout.updated_at || workout.createdAt || workout.created_at)) || ''
    ).trim();
    if (!rawTimestamp) return;
    const parsed = new Date(rawTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      latestTimestamp = Math.max(latestTimestamp, parsed.getTime());
    }
  });

  const latestUpdatedAt = latestTimestamp ? new Date(latestTimestamp).toISOString() : 'none';
  return `${list.length}:${activeCount}:${latestUpdatedAt}`;
};

const requestStudentApi = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {};
  const authToken = String(token || loadStudentAuthToken() || '').trim();

  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const {
    response,
    responseBaseUrl,
    attemptedBases,
    mixedContentOnly,
    lastNetworkError
  } = await performStudentApiFetchWithFallback({
    path,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    timeoutMs: STUDENT_API_REQUEST_TIMEOUT_MS
  });

  if (!response) {
    if (mixedContentOnly) {
      throw new Error('Conexao bloqueada por HTTPS. Use frontend e backend no mesmo protocolo.');
    }

    const attemptedHosts = attemptedBases
      .map((url) => String(url).replace(/\/api$/, ''))
      .filter(Boolean);
    const timeoutDetected =
      Boolean(lastNetworkError) && String(lastNetworkError.name || '').toLowerCase() === 'aborterror';
    const reasonHint = timeoutDetected
      ? 'A API demorou para responder.'
      : 'A API pode estar desligada ou reiniciando.';
    throw new Error(
      `Sistema com erro. ${reasonHint} Tente novamente em instantes.`
    );
  }

  let payload = null;
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch (_) {}
  }

  if (!response.ok) {
    if (responseBaseUrl && response.status !== 404 && response.status !== 405) {
      activeStudentApiBaseUrl = responseBaseUrl;
    }
    const apiHostHint = getApiHostFromBase(responseBaseUrl);
    const fallbackMessage =
      response.status === 404
        ? `API não encontrada. Verifique se o backend está rodando em ${apiHostHint}.`
        : `Erro ${response.status} ao processar sua solicitação (API: ${apiHostHint}).`;
    throw new Error(getApiErrorMessage(payload, fallbackMessage));
  }

  return payload;
};

const isApiRouteNotFoundError = (error) => {
  const message = String(error && error.message ? error.message : '').trim().toLowerCase();
  return (
    message.includes('rota não encontrada') ||
    message.includes('route not found') ||
    message.includes('api não encontrada') ||
    message.includes('api nao encontrada') ||
    message.includes('erro 404') ||
    message.includes('error 404') ||
    message.includes('erro 405') ||
    message.includes('error 405')
  );
};

const resolveApiMediaUrl = (rawUrl) => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const apiHost = getApiHostFromBase(activeStudentApiBaseUrl) || getActiveStudentApiHostUrl();
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${apiHost}${normalizedPath}`;
};

const requestStudentApiMultipart = async (path, { method = 'POST', formData, token } = {}) => {
  const headers = {};
  const authToken = String(token || loadStudentAuthToken() || '').trim();

  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const {
    response,
    responseBaseUrl,
    attemptedBases,
    mixedContentOnly
  } = await performStudentApiFetchWithFallback({
    path,
    method,
    headers,
    body: formData,
    timeoutMs: STUDENT_API_UPLOAD_TIMEOUT_MS
  });

  if (!response) {
    if (mixedContentOnly) {
      throw new Error('Conexao bloqueada por HTTPS. Use frontend e backend no mesmo protocolo.');
    }
    const attemptedHosts = attemptedBases
      .map((url) => String(url).replace(/\/api$/, ''))
      .filter(Boolean);
    throw new Error(
      'Sistema com erro. Tente novamente em instantes.'
    );
  }

  let payload = null;
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch (_) {}
  }

  if (!response.ok) {
    if (responseBaseUrl && response.status !== 404 && response.status !== 405) {
      activeStudentApiBaseUrl = responseBaseUrl;
    }
    const apiHostHint = getApiHostFromBase(responseBaseUrl);
    const fallbackMessage =
      response.status === 404
        ? `API não encontrada. Verifique se o backend está rodando em ${apiHostHint}.`
        : `Erro ${response.status} ao processar seu upload (API: ${apiHostHint}).`;
    throw new Error(getApiErrorMessage(payload, fallbackMessage));
  }

  return payload;
};

const uploadStudentMediaFile = async (file) => {
  if (!file) return null;
  const uploadData = new FormData();
  uploadData.append('file', file);

  const payload = await requestStudentApiMultipart('/uploads/media', {
    method: 'POST',
    formData: uploadData
  });

  const media = payload && payload.media ? payload.media : null;
  if (!media || !media.url) {
    throw new Error('Upload concluído sem URL de mídia válida.');
  }

  return {
    ...media,
    absoluteUrl: resolveApiMediaUrl(media.url)
  };
};

const getSiteTeamCards = () => (
  siteTeamGrid instanceof HTMLElement
    ? Array.from(siteTeamGrid.querySelectorAll('[data-site-team-card]'))
    : []
);

const getAdminTeamItems = () => (
  adminTeamList instanceof HTMLElement
    ? Array.from(adminTeamList.querySelectorAll('[data-admin-team-item]'))
    : []
);

const SITE_TEAM_PHOTO_POSITION_MIN = 0;
const SITE_TEAM_PHOTO_POSITION_MAX = 100;
const SITE_TEAM_PHOTO_POSITION_DEFAULT = 50;
const SITE_TEAM_PHOTO_ZOOM_MIN = 1;
const SITE_TEAM_PHOTO_ZOOM_MAX = 2.5;
const SITE_TEAM_PHOTO_ZOOM_DEFAULT = 1;

const normalizeSiteTeamPhotoPositionY = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return SITE_TEAM_PHOTO_POSITION_DEFAULT;
  return Math.min(
    SITE_TEAM_PHOTO_POSITION_MAX,
    Math.max(SITE_TEAM_PHOTO_POSITION_MIN, Math.round(numericValue))
  );
};

const normalizeSiteTeamPhotoZoom = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return SITE_TEAM_PHOTO_ZOOM_DEFAULT;
  const clampedValue = Math.min(SITE_TEAM_PHOTO_ZOOM_MAX, Math.max(SITE_TEAM_PHOTO_ZOOM_MIN, numericValue));
  return Math.round(clampedValue * 100) / 100;
};

const formatAdminTeamPhotoPositionValue = (value) => (
  `${normalizeSiteTeamPhotoPositionY(value)}%`
);

const formatAdminTeamPhotoZoomValue = (value) => (
  `${Math.round(normalizeSiteTeamPhotoZoom(value) * 100)}%`
);

const setTeamPhotoFrame = (node, {
  photoUrl = '',
  photoPositionY = SITE_TEAM_PHOTO_POSITION_DEFAULT,
  photoZoom = SITE_TEAM_PHOTO_ZOOM_DEFAULT,
  alt = ''
} = {}) => {
  if (!(node instanceof HTMLElement)) return;
  const safePhotoPositionY = normalizeSiteTeamPhotoPositionY(photoPositionY);
  const safePhotoZoom = normalizeSiteTeamPhotoZoom(photoZoom);
  const finalPhotoUrl = resolveApiMediaUrl(photoUrl) || String(photoUrl || '').trim();
  let image = node.querySelector('img');
  if (!(image instanceof HTMLImageElement)) {
    image = document.createElement('img');
    image.decoding = 'async';
    node.appendChild(image);
  }
  image.alt = String(alt || '').trim();
  image.loading = 'lazy';
  node.style.setProperty('--team-photo-position-y', `${safePhotoPositionY}%`);
  node.style.setProperty('--team-photo-zoom', String(safePhotoZoom));
  node.style.removeProperty('background-image');
  if (finalPhotoUrl) {
    image.src = finalPhotoUrl;
    image.hidden = false;
  } else {
    image.removeAttribute('src');
    image.hidden = true;
  }
};

const ensureAdminTeamPhotoControls = (item) => {
  if (!(item instanceof HTMLElement)) return;
  let controlsWrap = item.querySelector('[data-admin-team-photo-adjustments]');
  let hintNode = item.querySelector('[data-admin-team-photo-adjustments-hint]');
  if (controlsWrap instanceof HTMLElement && hintNode instanceof HTMLElement) return;

  controlsWrap = document.createElement('div');
  controlsWrap.className = 'admin-overview-exercises-toolbar admin-site-team-toolbar';
  controlsWrap.setAttribute('data-admin-team-photo-adjustments', '');
  controlsWrap.innerHTML = `
    <label class="admin-overview-filter-field admin-site-team-range-field">
      <span>Posição vertical <strong data-admin-team-photo-position-y-value>${formatAdminTeamPhotoPositionValue(SITE_TEAM_PHOTO_POSITION_DEFAULT)}</strong></span>
      <input
        type="range"
        min="${SITE_TEAM_PHOTO_POSITION_MIN}"
        max="${SITE_TEAM_PHOTO_POSITION_MAX}"
        step="1"
        value="${SITE_TEAM_PHOTO_POSITION_DEFAULT}"
        data-admin-team-photo-position-y
      />
    </label>
    <label class="admin-overview-filter-field admin-site-team-range-field">
      <span>Zoom <strong data-admin-team-photo-zoom-value>${formatAdminTeamPhotoZoomValue(SITE_TEAM_PHOTO_ZOOM_DEFAULT)}</strong></span>
      <input
        type="range"
        min="${SITE_TEAM_PHOTO_ZOOM_MIN}"
        max="${SITE_TEAM_PHOTO_ZOOM_MAX}"
        step="0.05"
        value="${SITE_TEAM_PHOTO_ZOOM_DEFAULT}"
        data-admin-team-photo-zoom
      />
    </label>
  `;

  hintNode = document.createElement('p');
  hintNode.className = 'admin-overview-action-muted admin-site-team-photo-hint';
  hintNode.setAttribute('data-admin-team-photo-adjustments-hint', '');
  hintNode.textContent = 'Use os controles para subir, descer ou aproximar a foto.';

  const uploadToolbar = item.querySelector('.admin-site-team-toolbar--single');
  if (uploadToolbar instanceof HTMLElement) {
    uploadToolbar.insertAdjacentElement('afterend', controlsWrap);
    controlsWrap.insertAdjacentElement('afterend', hintNode);
  } else {
    item.append(controlsWrap, hintNode);
  }
};

const syncAdminTeamPhotoControlValues = (item, {
  photoPositionY = SITE_TEAM_PHOTO_POSITION_DEFAULT,
  photoZoom = SITE_TEAM_PHOTO_ZOOM_DEFAULT
} = {}) => {
  if (!(item instanceof HTMLElement)) {
    return {
      photoPositionY: normalizeSiteTeamPhotoPositionY(photoPositionY),
      photoZoom: normalizeSiteTeamPhotoZoom(photoZoom)
    };
  }
  ensureAdminTeamPhotoControls(item);
  const safePhotoPositionY = normalizeSiteTeamPhotoPositionY(photoPositionY);
  const safePhotoZoom = normalizeSiteTeamPhotoZoom(photoZoom);
  const positionInput = item.querySelector('[data-admin-team-photo-position-y]');
  const zoomInput = item.querySelector('[data-admin-team-photo-zoom]');
  const positionValueNode = item.querySelector('[data-admin-team-photo-position-y-value]');
  const zoomValueNode = item.querySelector('[data-admin-team-photo-zoom-value]');

  if (positionInput instanceof HTMLInputElement) positionInput.value = String(safePhotoPositionY);
  if (zoomInput instanceof HTMLInputElement) zoomInput.value = String(safePhotoZoom);
  if (positionValueNode instanceof HTMLElement) {
    positionValueNode.textContent = formatAdminTeamPhotoPositionValue(safePhotoPositionY);
  }
  if (zoomValueNode instanceof HTMLElement) {
    zoomValueNode.textContent = formatAdminTeamPhotoZoomValue(safePhotoZoom);
  }

  return {
    photoPositionY: safePhotoPositionY,
    photoZoom: safePhotoZoom
  };
};

const getAdminTeamPhotoAdjustments = (item, fallbackMember = {}) => {
  if (!(item instanceof HTMLElement)) {
    return {
      photoPositionY: normalizeSiteTeamPhotoPositionY(fallbackMember && fallbackMember.photoPositionY),
      photoZoom: normalizeSiteTeamPhotoZoom(fallbackMember && fallbackMember.photoZoom)
    };
  }
  ensureAdminTeamPhotoControls(item);
  const positionInput = item.querySelector('[data-admin-team-photo-position-y]');
  const zoomInput = item.querySelector('[data-admin-team-photo-zoom]');
  return syncAdminTeamPhotoControlValues(item, {
    photoPositionY:
      positionInput instanceof HTMLInputElement && positionInput.value
        ? positionInput.value
        : fallbackMember && fallbackMember.photoPositionY,
    photoZoom:
      zoomInput instanceof HTMLInputElement && zoomInput.value
        ? zoomInput.value
        : fallbackMember && fallbackMember.photoZoom
  });
};

const buildFallbackSiteTeamMembers = () => {
  const membersFromDom = getSiteTeamCards().map((card, index) => {
    if (!(card instanceof Element)) return null;
    const nameNode = card.querySelector('[data-site-team-name]');
    const roleNode = card.querySelector('[data-site-team-role]');
    const descNode = card.querySelector('[data-site-team-desc]');
    const photoNode = card.querySelector('[data-site-team-photo]');
    const stylePhoto = photoNode && photoNode.style ? String(photoNode.style.backgroundImage || '').trim() : '';
    let computedPhoto = '';
    if (
      !stylePhoto &&
      photoNode instanceof HTMLElement &&
      typeof window !== 'undefined' &&
      typeof window.getComputedStyle === 'function'
    ) {
      computedPhoto = String(window.getComputedStyle(photoNode).backgroundImage || '').trim();
    }
    const rawPhoto = stylePhoto || computedPhoto;
    let photoUrl = '';
    if (rawPhoto && rawPhoto !== 'none') {
      const matched = rawPhoto.match(/url\((['"]?)(.*?)\1\)/i);
      photoUrl = matched ? String(matched[2] || '').trim() : '';
    }
    if (!photoUrl) {
      const photoImage = photoNode && typeof photoNode.querySelector === 'function'
        ? photoNode.querySelector('img')
        : null;
      if (photoImage instanceof HTMLImageElement) {
        photoUrl = String(photoImage.currentSrc || photoImage.getAttribute('src') || '').trim();
      }
    }
    const rawPhotoPositionY = photoNode instanceof HTMLElement
      ? String(
        photoNode.style.getPropertyValue('--team-photo-position-y') ||
        (
          typeof window !== 'undefined' &&
          typeof window.getComputedStyle === 'function'
            ? window.getComputedStyle(photoNode).getPropertyValue('--team-photo-position-y')
            : ''
        ) ||
        ''
      ).trim()
      : '';
    const rawPhotoZoom = photoNode instanceof HTMLElement
      ? String(
        photoNode.style.getPropertyValue('--team-photo-zoom') ||
        (
          typeof window !== 'undefined' &&
          typeof window.getComputedStyle === 'function'
            ? window.getComputedStyle(photoNode).getPropertyValue('--team-photo-zoom')
            : ''
        ) ||
        ''
      ).trim()
      : '';
    return {
      id: index + 1,
      name: String(nameNode && nameNode.textContent ? nameNode.textContent : '').trim() || `Membro ${index + 1}`,
      role: String(roleNode && roleNode.textContent ? roleNode.textContent : '').trim() || 'Personal Trainer',
      description:
        String(descNode && descNode.textContent ? descNode.textContent : '').trim() ||
        'Profissional qualificado para acompanhar sua evolucao.',
      photoUrl,
      photoPositionY: normalizeSiteTeamPhotoPositionY(parseFloat(rawPhotoPositionY)),
      photoZoom: normalizeSiteTeamPhotoZoom(parseFloat(rawPhotoZoom))
    };
  }).filter(Boolean);

  if (membersFromDom.length) return membersFromDom;

  return [
    {
      id: 1,
      name: 'Ailton',
      role: 'Educador Fisico',
      description:
        'Especialista em hipertrofia e condicionamento, com atendimento individual e foco total na execucao correta.',
      photoUrl:
        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80',
      photoPositionY: SITE_TEAM_PHOTO_POSITION_DEFAULT,
      photoZoom: SITE_TEAM_PHOTO_ZOOM_DEFAULT
    },
    {
      id: 2,
      name: 'Rogerio Filho',
      role: 'Personal Trainer',
      description:
        'Treinos de forca e periodizacao estrategica para ganho de performance, evolucao consistente e seguranca.',
      photoUrl:
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
      photoPositionY: SITE_TEAM_PHOTO_POSITION_DEFAULT,
      photoZoom: SITE_TEAM_PHOTO_ZOOM_DEFAULT
    },
    {
      id: 3,
      name: 'Hanne',
      role: 'Personal Trainer',
      description:
        'Acompanhamento dinamico com foco em mobilidade, resistencia e melhoria da capacidade fisica no dia a dia.',
      photoUrl:
        'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=900&q=80',
      photoPositionY: SITE_TEAM_PHOTO_POSITION_DEFAULT,
      photoZoom: SITE_TEAM_PHOTO_ZOOM_DEFAULT
    },
    {
      id: 4,
      name: 'Jessica',
      role: 'Personal Trainer',
      description:
        'Aulas energeticas e acessiveis para todos os niveis, com atencao ao ritmo, motivacao e gasto calorico.',
      photoUrl:
        'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=900&q=80',
      photoPositionY: SITE_TEAM_PHOTO_POSITION_DEFAULT,
      photoZoom: SITE_TEAM_PHOTO_ZOOM_DEFAULT
    }
  ];
};

const sanitizeSiteTeamMember = (member, index = 0) => {
  const source = member && typeof member === 'object' ? member : {};
  return {
    id: Number(source.id) || index + 1,
    name: String(source.name || `Membro ${index + 1}`).trim(),
    role: String(source.role || 'Personal Trainer').trim(),
    description:
      String(source.description || 'Profissional qualificado para acompanhar sua evolucao.').trim(),
    photoUrl: String(source.photoUrl || '').trim(),
    photoPositionY: normalizeSiteTeamPhotoPositionY(source.photoPositionY ?? source.photo_position_y),
    photoZoom: normalizeSiteTeamPhotoZoom(source.photoZoom ?? source.photo_zoom)
  };
};

const normalizeSiteTeamMembers = (members) => {
  const fallback = buildFallbackSiteTeamMembers();
  const hasProvidedMembers = Array.isArray(members);
  const source = hasProvidedMembers ? members : fallback;
  const targetLength = hasProvidedMembers
    ? Math.min(ADMIN_TEAM_MAX_MEMBERS, Math.max(source.length, ADMIN_TEAM_MIN_MEMBERS))
    : Math.min(ADMIN_TEAM_MAX_MEMBERS, Math.max(fallback.length, ADMIN_TEAM_MIN_MEMBERS));

  return Array.from({ length: targetLength }, (_, index) => {
    const fromSource = source[index] || {};
    const fromFallback = fallback[index] || fallback[fallback.length - 1] || {};
    return sanitizeSiteTeamMember(
      {
        ...fromFallback,
        ...fromSource
      },
      index
    );
  });
};

const setAdminTeamFeedback = (message = '', isSuccess = false) => {
  if (!adminTeamFeedback) return;
  adminTeamFeedback.textContent = String(message || '');
  adminTeamFeedback.classList.toggle('is-success', Boolean(isSuccess && message));
};

const createSiteTeamCardElement = (member, index = 0) => {
  const article = document.createElement('article');
  article.className = 'team-card';
  article.setAttribute('data-site-team-card', '');
  article.setAttribute('data-site-team-index', String(index));

  const topWeight = document.createElement('div');
  topWeight.className = 'team-top-weight';
  topWeight.setAttribute('aria-hidden', 'true');

  const photo = document.createElement('div');
  photo.className = 'team-photo';
  photo.setAttribute('data-site-team-photo', '');

  const name = document.createElement('h3');
  name.setAttribute('data-site-team-name', '');
  name.textContent = String(member && member.name ? member.name : '').trim();

  const role = document.createElement('p');
  role.className = 'team-role';
  role.setAttribute('data-site-team-role', '');
  role.textContent = String(member && member.role ? member.role : '').trim();

  const description = document.createElement('p');
  description.className = 'team-desc';
  description.setAttribute('data-site-team-desc', '');
  description.textContent = String(member && member.description ? member.description : '').trim();

  setTeamPhotoFrame(photo, {
    photoUrl: member && member.photoUrl ? member.photoUrl : '',
    photoPositionY: member && member.photoPositionY,
    photoZoom: member && member.photoZoom,
    alt: name.textContent ? `Foto de ${name.textContent}` : 'Foto do integrante'
  });

  article.append(topWeight, photo, name, role, description);
  return article;
};

const applySiteTeamMembers = (members) => {
  const normalizedMembers = normalizeSiteTeamMembers(members);
  siteTeamMembersCache = normalizedMembers.map((member, index) => sanitizeSiteTeamMember(member, index));

  if (!(siteTeamGrid instanceof HTMLElement)) return;
  siteTeamGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  siteTeamMembersCache.forEach((member, index) => {
    fragment.appendChild(createSiteTeamCardElement(member, index));
  });
  siteTeamGrid.appendChild(fragment);
};

const setAdminTeamItemPreview = (
  item,
  photoUrl = '',
  photoPositionY = SITE_TEAM_PHOTO_POSITION_DEFAULT,
  photoZoom = SITE_TEAM_PHOTO_ZOOM_DEFAULT
) => {
  if (!(item instanceof Element)) return;
  const previewNode = item.querySelector('[data-admin-team-photo-preview]');
  if (!(previewNode instanceof HTMLElement)) return;
  const safeAdjustments = syncAdminTeamPhotoControlValues(item, { photoPositionY, photoZoom });
  setTeamPhotoFrame(previewNode, {
    photoUrl,
    photoPositionY: safeAdjustments.photoPositionY,
    photoZoom: safeAdjustments.photoZoom,
    alt: ''
  });
};

const readImageFileAsDataUrl = (file) => (
  new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nao foi possivel carregar a imagem selecionada.'));
    reader.readAsDataURL(file);
  })
);

const refreshAdminTeamItemsUi = () => {
  const items = getAdminTeamItems();
  const canRemove = items.length > ADMIN_TEAM_MIN_MEMBERS;

  items.forEach((item, index) => {
    if (!(item instanceof HTMLElement)) return;
    item.setAttribute('data-admin-team-index', String(index));

    const originalTitle = item.querySelector('h6');
    let head = item.querySelector('[data-admin-team-item-head]');
    if (!(head instanceof HTMLElement)) {
      head = document.createElement('div');
      head.className = 'admin-site-team-item-head';
      head.setAttribute('data-admin-team-item-head', '');

      if (originalTitle) {
        originalTitle.parentElement && originalTitle.parentElement.insertBefore(head, originalTitle);
        head.appendChild(originalTitle);
      } else {
        const generatedTitle = document.createElement('h6');
        generatedTitle.textContent = `Card ${index + 1}`;
        head.appendChild(generatedTitle);
        item.prepend(head);
      }
    }

    const titleNode = head.querySelector('h6') || originalTitle;
    if (titleNode) titleNode.textContent = `Card ${index + 1}`;

    let removeButton = head.querySelector('[data-admin-team-remove]');
    if (!(removeButton instanceof HTMLButtonElement)) {
      removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'admin-overview-action-btn is-danger admin-site-team-remove-btn';
      removeButton.setAttribute('data-admin-team-remove', '');
      removeButton.textContent = 'Remover';
      head.appendChild(removeButton);
    }

    removeButton.disabled = !canRemove;
    removeButton.hidden = !canRemove;
  });

  if (adminTeamAddButton instanceof HTMLButtonElement) {
    adminTeamAddButton.disabled = items.length >= ADMIN_TEAM_MAX_MEMBERS;
  }
};

const createAdminTeamItemElement = () => {
  const items = getAdminTeamItems();
  const template = items[0];
  if (!(template instanceof HTMLElement)) return null;

  const clone = template.cloneNode(true);
  clone.removeAttribute('data-team-bound');
  clone.removeAttribute('data-admin-team-index');
  clone.removeAttribute('data-current-photo-url');

  clone.querySelectorAll('input').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type === 'file') {
      input.value = '';
      return;
    }
    if (input.type === 'range') {
      input.value = input.defaultValue || input.getAttribute('value') || '';
      return;
    }
    input.value = '';
  });

  clone.querySelectorAll('textarea').forEach((textarea) => {
    if (textarea instanceof HTMLTextAreaElement) textarea.value = '';
  });

  const previewNode = clone.querySelector('[data-admin-team-photo-preview]');
  if (previewNode instanceof HTMLElement) {
    previewNode.style.removeProperty('background-image');
    previewNode.style.removeProperty('--team-photo-position-y');
    previewNode.style.removeProperty('--team-photo-zoom');
    const previewImage = previewNode.querySelector('img');
    if (previewImage instanceof HTMLImageElement) {
      previewImage.removeAttribute('src');
      previewImage.hidden = true;
    }
  }
  syncAdminTeamPhotoControlValues(clone, {
    photoPositionY: SITE_TEAM_PHOTO_POSITION_DEFAULT,
    photoZoom: SITE_TEAM_PHOTO_ZOOM_DEFAULT
  });

  return clone;
};

const setAdminTeamItemsCount = (targetCount) => {
  if (!(adminTeamList instanceof HTMLElement)) return;
  const safeTarget = Math.min(
    ADMIN_TEAM_MAX_MEMBERS,
    Math.max(ADMIN_TEAM_MIN_MEMBERS, Number(targetCount) || ADMIN_TEAM_MIN_MEMBERS)
  );

  let items = getAdminTeamItems();
  while (items.length < safeTarget) {
    const newItem = createAdminTeamItemElement();
    if (!(newItem instanceof HTMLElement)) break;
    adminTeamList.appendChild(newItem);
    bindAdminTeamItemInputs(newItem, items.length);
    items = getAdminTeamItems();
  }

  while (items.length > safeTarget) {
    const lastItem = items[items.length - 1];
    if (!(lastItem instanceof HTMLElement)) break;
    lastItem.remove();
    items = getAdminTeamItems();
  }

  refreshAdminTeamItemsUi();
};

const applyAdminTeamFormMembers = (members) => {
  const normalizedMembers = normalizeSiteTeamMembers(members);
  if (!normalizedMembers.length) return;
  setAdminTeamItemsCount(normalizedMembers.length);
  const items = getAdminTeamItems();

  items.forEach((item, index) => {
    if (!(item instanceof Element)) return;
    ensureAdminTeamPhotoControls(item);
    const member = normalizedMembers[index];
    if (!member) return;

    const nameInput = item.querySelector('[data-admin-team-name]');
    const roleInput = item.querySelector('[data-admin-team-role]');
    const descInput = item.querySelector('[data-admin-team-desc]');
    const photoFileInput = item.querySelector('[data-admin-team-photo-file]');

    if (nameInput instanceof HTMLInputElement) nameInput.value = member.name;
    if (roleInput instanceof HTMLInputElement) roleInput.value = member.role;
    if (descInput instanceof HTMLTextAreaElement) descInput.value = member.description;
    if (photoFileInput instanceof HTMLInputElement) photoFileInput.value = '';
    clearInvalidState(nameInput, roleInput, descInput);
    setAdminTeamItemPreview(item, member.photoUrl, member.photoPositionY, member.photoZoom);
    item.setAttribute('data-current-photo-url', String(member.photoUrl || '').trim());
    bindAdminTeamItemInputs(item, index);
  });

  refreshAdminTeamItemsUi();
};

const bindAdminTeamItemInputs = (item, index = 0) => {
  if (!(item instanceof HTMLElement)) return;
  if (item.dataset.teamBound === 'true') return;
  item.dataset.teamBound = 'true';
  ensureAdminTeamPhotoControls(item);

  const nameInput = item.querySelector('[data-admin-team-name]');
  const roleInput = item.querySelector('[data-admin-team-role]');
  const descInput = item.querySelector('[data-admin-team-desc]');
  const photoFileInput = item.querySelector('[data-admin-team-photo-file]');
  const photoPositionInput = item.querySelector('[data-admin-team-photo-position-y]');
  const photoZoomInput = item.querySelector('[data-admin-team-photo-zoom]');
  const refreshPreviewFromCurrentState = () => {
    const currentIndex = Number(item.getAttribute('data-admin-team-index'));
    const safeIndex = Number.isFinite(currentIndex) ? currentIndex : index;
    const fallbackMember = siteTeamMembersCache[safeIndex] || buildFallbackSiteTeamMembers()[safeIndex] || {};
    const previewNode = item.querySelector('[data-admin-team-photo-preview]');
    const previewImage = previewNode instanceof HTMLElement ? previewNode.querySelector('img') : null;
    const currentPreviewUrl = previewImage instanceof HTMLImageElement
      ? String(previewImage.currentSrc || previewImage.getAttribute('src') || '').trim()
      : '';
    const adjustments = getAdminTeamPhotoAdjustments(item, fallbackMember);
    const fallbackUrl = String(item.getAttribute('data-current-photo-url') || fallbackMember.photoUrl || '').trim();
    setAdminTeamItemPreview(
      item,
      currentPreviewUrl || fallbackUrl,
      adjustments.photoPositionY,
      adjustments.photoZoom
    );
  };

  if (nameInput instanceof HTMLElement) {
    nameInput.addEventListener('input', () => clearInvalidState(nameInput));
  }
  if (roleInput instanceof HTMLElement) {
    roleInput.addEventListener('input', () => clearInvalidState(roleInput));
  }
  if (descInput instanceof HTMLElement) {
    descInput.addEventListener('input', () => clearInvalidState(descInput));
  }
  if (photoPositionInput instanceof HTMLInputElement) {
    photoPositionInput.addEventListener('input', refreshPreviewFromCurrentState);
  }
  if (photoZoomInput instanceof HTMLInputElement) {
    photoZoomInput.addEventListener('input', refreshPreviewFromCurrentState);
  }

  if (photoFileInput instanceof HTMLInputElement) {
    photoFileInput.addEventListener('change', () => {
      const selectedFile = photoFileInput.files && photoFileInput.files[0] ? photoFileInput.files[0] : null;
      const currentIndex = Number(item.getAttribute('data-admin-team-index'));
      const safeIndex = Number.isFinite(currentIndex) ? currentIndex : index;
      const fallbackMember = siteTeamMembersCache[safeIndex] || buildFallbackSiteTeamMembers()[safeIndex] || {};
      const adjustments = getAdminTeamPhotoAdjustments(item, fallbackMember);
      if (!selectedFile) {
        const fallbackUrl = String(
          (siteTeamMembersCache[safeIndex] && siteTeamMembersCache[safeIndex].photoUrl) || ''
        ).trim();
        setAdminTeamItemPreview(item, fallbackUrl, adjustments.photoPositionY, adjustments.photoZoom);
        return;
      }

      void (async () => {
        try {
          const previewDataUrl = await readImageFileAsDataUrl(selectedFile);
          if (previewDataUrl) {
            setAdminTeamItemPreview(item, previewDataUrl, adjustments.photoPositionY, adjustments.photoZoom);
          }
        } catch (_) {}
      })();
    });
  }
};

const bindAdminTeamFormEvents = () => {
  if (adminTeamForm) {
    adminTeamForm.addEventListener('submit', (event) => {
      void handleAdminTeamFormSubmit(event);
    });
  }

  if (adminTeamAddButton) {
    adminTeamAddButton.addEventListener('click', () => {
      const items = getAdminTeamItems();
      if (items.length >= ADMIN_TEAM_MAX_MEMBERS) {
        setAdminTeamFeedback(`Limite maximo de ${ADMIN_TEAM_MAX_MEMBERS} instrutores atingido.`, false);
        return;
      }
      setAdminTeamFeedback('');
      setAdminTeamItemsCount(items.length + 1);
    });
  }

  if (adminTeamList) {
    adminTeamList.addEventListener('click', (event) => {
      const trigger = event && event.target instanceof Element
        ? event.target.closest('[data-admin-team-remove]')
        : null;
      if (!(trigger instanceof HTMLButtonElement)) return;

      const item = trigger.closest('[data-admin-team-item]');
      if (!(item instanceof HTMLElement)) return;
      const items = getAdminTeamItems();
      if (items.length <= ADMIN_TEAM_MIN_MEMBERS) {
        setAdminTeamFeedback('Mantenha ao menos um instrutor na secao.', false);
        return;
      }

      item.remove();
      refreshAdminTeamItemsUi();
      setAdminTeamFeedback('');
    });
  }

  if (adminTeamResetButton) {
    adminTeamResetButton.addEventListener('click', handleAdminTeamFormReset);
  }
  getAdminTeamItems().forEach((item, index) => {
    bindAdminTeamItemInputs(item, index);
  });
  refreshAdminTeamItemsUi();
};

const syncSiteTeamMembersFromApi = async ({ silent = true, syncAdminForm = false } = {}) => {
  if (siteTeamSyncInFlight) return siteTeamMembersCache;
  siteTeamSyncInFlight = true;
  try {
    const members = await fetchPublicSiteTeamMembers();
    applySiteTeamMembers(members);
    if (syncAdminForm) applyAdminTeamFormMembers(siteTeamMembersCache);
    return siteTeamMembersCache;
  } catch (error) {
    if (!siteTeamMembersCache.length) {
      applySiteTeamMembers(buildFallbackSiteTeamMembers());
      if (syncAdminForm) applyAdminTeamFormMembers(siteTeamMembersCache);
    }
    if (!silent && isGeneralAdminUser()) {
      setAdminTeamFeedback(
        error && error.message ? error.message : 'Nao foi possivel carregar a secao do time agora.',
        false
      );
    }
    return siteTeamMembersCache;
  } finally {
    siteTeamSyncInFlight = false;
  }
};

const collectAdminTeamMembersFromForm = async () => {
  const items = getAdminTeamItems();
  if (!items.length) {
    throw new Error('Adicione ao menos um instrutor para salvar.');
  }

  const collectedMembers = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!(item instanceof Element)) continue;

    const nameInput = item.querySelector('[data-admin-team-name]');
    const roleInput = item.querySelector('[data-admin-team-role]');
    const descInput = item.querySelector('[data-admin-team-desc]');
    const photoFileInput = item.querySelector('[data-admin-team-photo-file]');
    const fallbackMember = siteTeamMembersCache[index] || buildFallbackSiteTeamMembers()[index] || {};
    let nextPhotoUrl = String(item.getAttribute('data-current-photo-url') || fallbackMember.photoUrl || '').trim();
    const adjustments = getAdminTeamPhotoAdjustments(item, fallbackMember);

    const nextName = String(nameInput && nameInput.value ? nameInput.value : '').trim();
    const nextRole = String(roleInput && roleInput.value ? roleInput.value : '').trim();
    const nextDescription = String(descInput && descInput.value ? descInput.value : '').trim();

    if (!nextName || !nextRole || !nextDescription) {
      if (nameInput instanceof HTMLElement && !nextName) nameInput.classList.add('is-invalid');
      if (roleInput instanceof HTMLElement && !nextRole) roleInput.classList.add('is-invalid');
      if (descInput instanceof HTMLElement && !nextDescription) descInput.classList.add('is-invalid');
      throw new Error('Preencha nome, funcao e descricao em todos os cards do time.');
    }

    if (photoFileInput instanceof HTMLInputElement && photoFileInput.files && photoFileInput.files[0]) {
      const uploadedMedia = await uploadStudentMediaFile(photoFileInput.files[0]);
      nextPhotoUrl = String((uploadedMedia && uploadedMedia.url) || '').trim();
    }

    collectedMembers.push(
      sanitizeSiteTeamMember(
        {
          id: Number(fallbackMember.id) || index + 1,
          name: nextName,
          role: nextRole,
          description: nextDescription,
          photoUrl: nextPhotoUrl || String(fallbackMember.photoUrl || '').trim(),
          photoPositionY: adjustments.photoPositionY,
          photoZoom: adjustments.photoZoom
        },
        index
      )
    );
  }

  return collectedMembers;
};

const handleAdminTeamFormSubmit = async (event) => {
  if (event) event.preventDefault();
  if (!adminTeamForm || adminTeamSavingInFlight) return;
  if (!isGeneralAdminUser()) {
    setAdminTeamFeedback('Acesso exclusivo do Administrador Geral.', false);
    return;
  }

  adminTeamSavingInFlight = true;
  setAdminTeamFeedback('');
  clearInvalidState(...getAdminTeamItems().flatMap((item) => {
    if (!(item instanceof Element)) return [];
    return [
      item.querySelector('[data-admin-team-name]'),
      item.querySelector('[data-admin-team-role]'),
      item.querySelector('[data-admin-team-desc]')
    ];
  }));
  setButtonLoading(adminTeamSubmitButton, 'Salvando...');

  try {
    const membersPayload = await collectAdminTeamMembersFromForm();
    const updatedMembers = await updateAdminSiteTeamMembers(membersPayload);
    applySiteTeamMembers(updatedMembers);
    applyAdminTeamFormMembers(siteTeamMembersCache);
    setAdminTeamFeedback('Sessao do time atualizada com sucesso.', true);
  } catch (error) {
    setAdminTeamFeedback(
      error && error.message ? error.message : 'Nao foi possivel salvar a secao do time agora.',
      false
    );
  } finally {
    adminTeamSavingInFlight = false;
    clearButtonLoading(adminTeamSubmitButton, 'Salvar seção do time');
  }
};

const handleAdminTeamFormReset = () => {
  applyAdminTeamFormMembers(siteTeamMembersCache.length ? siteTeamMembersCache : buildFallbackSiteTeamMembers());
  setAdminTeamFeedback('');
};

const createAuthProfileFromApiUser = (authUser, fallbackEmail = '', fallbackAvatarUrl = '') => {
  if (!authUser || typeof authUser !== 'object') return null;

  const resolvedName = String(authUser.name || displayNameFromLogin(fallbackEmail || '')).trim();
  const resolvedEmail = String(authUser.email || fallbackEmail || '').trim().toLowerCase();
  const resolvedAvatarUrl = getProfileAvatarFromSource(authUser, fallbackAvatarUrl);
  const safeRole = normalizeRoleSafely(
    {
      name: resolvedName,
      email: resolvedEmail,
    },
    authUser.role || 'ALUNO'
  );

  return {
    id: Number(authUser.id) || null,
    name: resolvedName,
    email: resolvedEmail,
    phoneDigits: String(authUser.phone || '').replace(/\D/g, ''),
    createdAt: String(authUser.createdAt || '').trim(),
    avatarUrl: resolvedAvatarUrl,
    role: safeRole,
    isEnabled: authUser.isEnabled !== false
  };
};

const syncSessionProfileFromServer = async ({ token, remember, refreshUi = false } = {}) => {
  const authToken = String(token || loadStudentAuthToken() || '').trim();
  if (!authToken) return null;

  const profileResponse = await requestStudentApi('/auth/profile', { token: authToken });
  const authUser = profileResponse && profileResponse.user ? profileResponse.user : null;
  const persistedProfile = loadStudentAuthProfile();
  const authUserEmail = String((authUser && authUser.email) || studentData.profileEmail || '')
    .trim()
    .toLowerCase();
  const persistedEmail = String((persistedProfile && persistedProfile.email) || '')
    .trim()
    .toLowerCase();
  const fallbackAvatarUrl = persistedEmail && authUserEmail && persistedEmail === authUserEmail
    ? getProfileAvatarFromSource(persistedProfile, studentData.profileAvatarUrl || '')
    : '';
  const authProfile = createAuthProfileFromApiUser(
    authUser,
    studentData.profileEmail || '',
    fallbackAvatarUrl
  );
  if (!authProfile) return null;

  const previousRole = normalizeRole(studentData.userRole || 'ALUNO');
  const previousEnabled = Boolean(studentData.userEnabled);
  const nextRole = normalizeRole(authProfile.role || 'ALUNO');
  const nextEnabled = Boolean(authProfile.isEnabled);
  const roleChanged = nextRole !== previousRole;
  const enabledChanged = nextEnabled !== previousEnabled;
  const shouldRemember = remember === undefined ? loadRememberPreference() : Boolean(remember);

  saveStudentAuthProfile(authProfile, shouldRemember);
  applyStudentAuthProfile(authProfile);

  if (refreshUi && (roleChanged || enabledChanged)) {
    resetTrainerManagementState();
    resetTrainerProgressState();
    resetAdminOverviewState();
    renderStudentApp();

    const currentTab = String(currentStudentTab || '');
    const canKeepAdminGeral = currentTab === 'admin-geral' && isGeneralAdminUser();
    const canKeepAdminTreinos = currentTab === 'admin-treinos' && isTrainerManagerUser();
    const canKeepCurrentTab =
      currentTab !== 'admin-geral' &&
      currentTab !== 'admin-treinos' ||
      canKeepAdminGeral ||
      canKeepAdminTreinos;

    if (!canKeepCurrentTab) {
      const fallbackTab = getDefaultMainTabForCurrentRole();
      setStudentAppTab(fallbackTab, true);
    }
  }

  return authProfile;
};

const stopSessionHeartbeat = () => {
  if (!sessionHeartbeatTimer) return;
  clearInterval(sessionHeartbeatTimer);
  sessionHeartbeatTimer = null;
};

const STUDENT_WORKOUTS_REFRESH_BLOCKED_PANELS = new Set([
  'pre-treino',
  'treino-ativo',
  'treino-execucao',
  'treino-descanso',
  'exercicio-detalhe'
]);

const canRefreshStudentWorkoutsInBackground = ({ force = false } = {}) => {
  if (normalizeRole(studentData.userRole) !== 'ALUNO') return false;
  if (!loadStudentAuthToken()) return false;
  if (!studentArea || studentArea.hidden || !studentApp || !studentApp.classList.contains('is-visible')) {
    return false;
  }
  if (document.visibilityState !== 'visible') return false;
  if (!force && STUDENT_WORKOUTS_REFRESH_BLOCKED_PANELS.has(String(currentStudentPanel || '').trim())) {
    return false;
  }
  return true;
};

const stopStudentWorkoutsRefresh = () => {
  if (studentWorkoutsRefreshTimer) {
    clearInterval(studentWorkoutsRefreshTimer);
    studentWorkoutsRefreshTimer = null;
  }
  studentWorkoutsRefreshInFlight = false;
};

const refreshStudentWorkoutsInBackground = async ({ force = false } = {}) => {
  if (!canRefreshStudentWorkoutsInBackground({ force })) return false;
  if (studentWorkoutsRefreshInFlight) return false;

  studentWorkoutsRefreshInFlight = true;
  try {
    await syncWorkoutsFromBackend({ silent: true });
    renderStudentApp();
    return true;
  } catch (_) {
    return false;
  } finally {
    studentWorkoutsRefreshInFlight = false;
  }
};

const checkStudentWorkoutsRevisionInBackground = async ({ force = false } = {}) => {
  if (!canRefreshStudentWorkoutsInBackground({ force })) return false;
  if (studentWorkoutsRefreshInFlight) return false;

  studentWorkoutsRefreshInFlight = true;
  try {
    const response = await requestStudentApi('/student/workouts/revision');
    const nextRevision = normalizeStudentWorkoutsRevision(
      response && response.revision && response.revision.revision
    );
    if (!nextRevision) return false;

    const previousRevision = normalizeStudentWorkoutsRevision(studentLatestWorkoutsRevision);
    studentLatestWorkoutsRevision = nextRevision;
    if (!previousRevision || previousRevision === nextRevision) return false;

    await syncWorkoutsFromBackend({ silent: true });
    renderStudentApp();
    return true;
  } catch (_) {
    return false;
  } finally {
    studentWorkoutsRefreshInFlight = false;
  }
};

const startStudentWorkoutsRefresh = () => {
  stopStudentWorkoutsRefresh();
  if (!canRefreshStudentWorkoutsInBackground()) return;
  studentWorkoutsRefreshTimer = window.setInterval(() => {
    void checkStudentWorkoutsRevisionInBackground();
  }, STUDENT_WORKOUTS_REVISION_CHECK_INTERVAL_MS);
};

const sendSessionHeartbeat = async () => {
  const token = loadStudentAuthToken();
  if (!token) return;

  try {
    await requestStudentApi('/auth/heartbeat', {
      method: 'POST',
      token
    });
    await syncSessionProfileFromServer({
      token,
      remember: loadRememberPreference(),
      refreshUi: true
    });
  } catch (_) {}
};

const startSessionHeartbeat = () => {
  stopSessionHeartbeat();
  void sendSessionHeartbeat();
  sessionHeartbeatTimer = window.setInterval(() => {
    void sendSessionHeartbeat();
  }, 20000);
};

const normalizeText = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getCurrentDateLabel = () => {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(now);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const mondayIndex = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - mondayIndex);
  return d;
};

const getWeekDateKeys = (date = new Date()) => {
  const start = startOfWeekMonday(date);
  return studentData.weeklyLabels.map((_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return toDateKey(day);
  });
};

const getCurrentWeekStartKey = (referenceDate = new Date()) => {
  return toDateKey(startOfWeekMonday(referenceDate));
};

const getWeekLogStorageKey = () => {
  const profile = loadStudentAuthProfile();
  const email = String((profile && profile.email) || studentData.profileEmail || '').trim().toLowerCase();
  return email ? `${STUDENT_WEEK_LOG_KEY}:${email}` : STUDENT_WEEK_LOG_KEY;
};

const getWorkoutHistoryStorageKey = () => {
  const profile = loadStudentAuthProfile();
  const email = String((profile && profile.email) || studentData.profileEmail || '').trim().toLowerCase();
  return email ? `${STUDENT_WORKOUT_HISTORY_KEY}:${email}` : STUDENT_WORKOUT_HISTORY_KEY;
};

const sanitizeWeekDays = (items) => {
  if (!Array.isArray(items)) return [];
  return [
    ...new Set(
      items.filter((item) => typeof item === 'string' && isDateKey(item))
    )
  ];
};

const loadStudentWeekLog = (referenceDate = new Date()) => {
  const storageKey = getWeekLogStorageKey();
  const weekStart = getCurrentWeekStartKey(referenceDate);

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // Legacy format: array of date keys.
    if (Array.isArray(parsed)) return pruneStudentWeekLog(sanitizeWeekDays(parsed), referenceDate);

    if (!parsed || typeof parsed !== 'object') return [];
    if (String(parsed.weekStart || '') !== weekStart) return [];

    return pruneStudentWeekLog(sanitizeWeekDays(parsed.days), referenceDate);
  } catch (_) {
    return [];
  }
};

const saveStudentWeekLog = (log, referenceDate = new Date()) => {
  const storageKey = getWeekLogStorageKey();
  const payload = {
    weekStart: getCurrentWeekStartKey(referenceDate),
    days: pruneStudentWeekLog(sanitizeWeekDays(log), referenceDate)
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
};

const pruneStudentWeekLog = (log, referenceDate = new Date()) => {
  const weekSet = new Set(getWeekDateKeys(referenceDate));
  return log.filter((dateKey) => weekSet.has(dateKey));
};

const applyWeekSummaryToLocalCache = (summary, referenceDate = new Date()) => {
  if (!summary || !Array.isArray(summary.days)) return false;

  const doneDays = sanitizeWeekDays(
    summary.days
      .filter((day) => day && day.done && isDateKey(day.dateKey))
      .map((day) => String(day.dateKey).trim())
  );

  const weekStartFromSummary = isDateKey(summary.weekStartKey)
    ? String(summary.weekStartKey).trim()
    : getCurrentWeekStartKey(referenceDate);

  const payload = {
    weekStart: weekStartFromSummary,
    days: pruneStudentWeekLog(doneDays, referenceDate)
  };

  try {
    localStorage.setItem(getWeekLogStorageKey(), JSON.stringify(payload));
    return true;
  } catch (_) {
    return false;
  }
};

const syncWeeklySummaryFromBackend = async (referenceDate = new Date()) => {
  const token = loadStudentAuthToken();
  if (!token) return null;

  const referenceDateKey = toDateKey(referenceDate);
  const response = await requestStudentApi(
    `/progress/week?referenceDateKey=${encodeURIComponent(referenceDateKey)}`,
    { token }
  );

  const summary = response && response.summary ? response.summary : null;
  if (!summary || !Array.isArray(summary.days)) return null;

  applyWeekSummaryToLocalCache(summary, referenceDate);
  return summary;
};

const persistWeeklyDayStatus = async ({ dateKey, done, referenceDate = new Date() }) => {
  if (!isDateKey(dateKey)) return null;

  const token = loadStudentAuthToken();
  if (!token) return null;

  const response = await requestStudentApi('/progress/week/day', {
    method: 'PUT',
    token,
    body: {
      dateKey: String(dateKey).trim(),
      done: Boolean(done),
      referenceDateKey: toDateKey(referenceDate)
    }
  });

  const summary = response && response.summary ? response.summary : null;
  if (!summary || !Array.isArray(summary.days)) return null;

  applyWeekSummaryToLocalCache(summary, referenceDate);
  return summary;
};

const selectLatestStudentBodyMetricsRecord = (records = []) => {
  const list = Array.isArray(records) ? records : [];
  let latestWeight = null;
  let latestHeight = null;
  let latestWeightDateKey = '';
  let latestWeightUpdatedAt = '';
  let latestHeightDateKey = '';
  let latestHeightUpdatedAt = '';

  const isMoreRecent = (currentDateKey, currentUpdatedAt, nextDateKey, nextUpdatedAt) => {
    const safeCurrentDateKey = String(currentDateKey || '').trim();
    const safeNextDateKey = String(nextDateKey || '').trim();
    if (safeNextDateKey !== safeCurrentDateKey) return safeNextDateKey > safeCurrentDateKey;

    const currentTimestamp = currentUpdatedAt ? new Date(currentUpdatedAt).getTime() : 0;
    const nextTimestamp = nextUpdatedAt ? new Date(nextUpdatedAt).getTime() : 0;
    return nextTimestamp > currentTimestamp;
  };

  list.forEach((record) => {
    const recordType = String(
      (record && (record.recordType || record.metricType || record.type)) || ''
    )
      .trim()
      .toUpperCase();
    if (recordType !== 'BODY_METRICS') return;

    const dateKey = isDateKey(record && record.dateKey) ? String(record.dateKey).trim() : '';
    const updatedAt = String((record && record.updatedAt) || (record && record.createdAt) || '').trim();
    const weightKg = Number(record && record.weightKg);
    const heightCm = Number(record && record.heightCm);

    if (Number.isFinite(weightKg) && isMoreRecent(latestWeightDateKey, latestWeightUpdatedAt, dateKey, updatedAt)) {
      latestWeight = Number(weightKg.toFixed(1));
      latestWeightDateKey = dateKey;
      latestWeightUpdatedAt = updatedAt;
    }
    if (Number.isFinite(heightCm) && isMoreRecent(latestHeightDateKey, latestHeightUpdatedAt, dateKey, updatedAt)) {
      latestHeight = Math.round(heightCm);
      latestHeightDateKey = dateKey;
      latestHeightUpdatedAt = updatedAt;
    }
  });

  if (latestWeight === null && latestHeight === null) return null;
  const latestDateKey = latestWeightDateKey || latestHeightDateKey || '';
  const latestUpdatedAt = latestWeightUpdatedAt || latestHeightUpdatedAt || '';

  return normalizeBodyMetricsSnapshot({
    weightKg: latestWeight,
    heightCm: latestHeight,
    dateKey: latestDateKey,
    updatedAt: latestUpdatedAt
  });
};

const syncStudentBodyMetricsFromBackend = async ({ silent = true } = {}) => {
  const token = loadStudentAuthToken();
  if (!token) return null;

  try {
    const response = await requestStudentApi('/progress/my', { token });
    const records = Array.isArray(response && response.records) ? response.records : [];
    const latestMetrics = selectLatestStudentBodyMetricsRecord(records);
    if (!latestMetrics) return null;
    applyStudentBodyMetricsToUiState(latestMetrics);
    saveStudentBodyMetricsCache(latestMetrics);
    return latestMetrics;
  } catch (error) {
    if (!silent) {
      showSiteTopNotice(
        error && error.message
          ? error.message
          : 'Não foi possível carregar peso/altura da conta.',
        false
      );
    }
    const cached = loadStudentBodyMetricsCache();
    if (cached) applyStudentBodyMetricsToUiState(cached);
    return cached || null;
  }
};

const persistStudentBodyMetrics = async ({
  weightKg = null,
  heightCm = null,
  date = new Date(),
  silent = true
} = {}) => {
  const token = loadStudentAuthToken();
  if (!token) return null;

  const normalizedWeight = Number(weightKg);
  const normalizedHeight = Number(heightCm);
  const payload = {
    metricType: 'BODY_METRICS',
    dateKey: toDateKey(date)
  };

  if (Number.isFinite(normalizedWeight)) {
    payload.weightKg = Number(normalizedWeight.toFixed(1));
  }
  if (Number.isFinite(normalizedHeight)) {
    payload.heightCm = Math.round(normalizedHeight);
  }

  if (payload.weightKg === undefined && payload.heightCm === undefined) {
    return null;
  }

  try {
    const response = await requestStudentApi('/progress', {
      method: 'POST',
      token,
      body: payload
    });
    const record = response && response.record ? response.record : null;
    saveStudentBodyMetricsCache({
      weightKg: Number.isFinite(Number(record && record.weightKg)) ? Number(record.weightKg) : payload.weightKg,
      heightCm: Number.isFinite(Number(record && record.heightCm)) ? Number(record.heightCm) : payload.heightCm,
      dateKey: isDateKey(record && record.dateKey) ? String(record.dateKey).trim() : payload.dateKey,
      updatedAt: String((record && record.updatedAt) || '').trim()
    });
    return response;
  } catch (error) {
    if (!silent) {
      showSiteTopNotice(
        error && error.message
          ? error.message
          : 'Não foi possível salvar peso/altura no servidor agora.',
        false
      );
    }
    return null;
  }
};

const getWeeklySummaryState = (referenceDate = new Date()) => {
  const weekKeys = getWeekDateKeys(referenceDate);
  const weekKeySet = new Set(weekKeys);
  const storedLog = pruneStudentWeekLog(loadStudentWeekLog(referenceDate), referenceDate);
  saveStudentWeekLog(storedLog, referenceDate);

  const doneSet = new Set(storedLog.filter((dateKey) => weekKeySet.has(dateKey)));
  const todayKey = toDateKey(referenceDate);
  const todayIndex = weekKeys.indexOf(todayKey);

  const days = studentData.weeklyLabels.map((label, index) => {
    const dateKey = weekKeys[index];
    const done = doneSet.has(dateKey);
    return {
      label,
      dateKey,
      done,
      isCurrent: index === todayIndex && !done
    };
  });

  return {
    days,
    doneCount: days.filter((day) => day.done).length
  };
};

const normalizeStoredWorkoutHistory = (records) => {
  if (!Array.isArray(records)) return [];

  return records
    .map((record, index) => {
      const completedAt = String(
        (record && (record.completedAt || record.date || record.createdAt)) || ''
      ).trim();
      const completedDate = completedAt ? new Date(completedAt) : null;
      if (!completedDate || Number.isNaN(completedDate.getTime())) return null;

      const durationMinutes = Math.max(1, Math.round(Number(record && record.durationMinutes) || 0));
      const kcal = Math.max(0, Number(record && record.kcal) || 0);
      const title = String((record && record.title) || 'Treino').trim() || 'Treino';
      const completedDateKey = isDateKey(record && record.completedDateKey)
        ? String(record.completedDateKey).trim()
        : toDateKey(completedDate);
      const thumbnail = String(
        (record && (record.thumbnail || record.thumbnailUrl || record.coverImageUrl)) || ''
      ).trim();
      const group = normalizeLibraryGroupKey(record && (record.group || record.groupKey), '');
      const workoutId = Number(record && record.workoutId) || 0;
      const snapshot = record && typeof record.snapshot === 'object' ? record.snapshot : null;

      return {
        id: String((record && record.id) || `${workoutId || 'workout'}-${completedAt}-${index}`),
        workoutId,
        completedAt: completedDate.toISOString(),
        completedDateKey,
        title,
        durationMinutes,
        kcal: Number(kcal.toFixed(1)),
        thumbnail,
        group,
        snapshot
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
};

const loadStudentWorkoutHistory = () => {
  try {
    const raw = localStorage.getItem(getWorkoutHistoryStorageKey());
    if (!raw) return [];
    return normalizeStoredWorkoutHistory(JSON.parse(raw));
  } catch (_) {
    return [];
  }
};

const saveStudentWorkoutHistory = (records) => {
  try {
    localStorage.setItem(
      getWorkoutHistoryStorageKey(),
      JSON.stringify(normalizeStoredWorkoutHistory(records))
    );
  } catch (_) {}
};

const syncWorkoutHistoryFromBackend = async ({ silent = false, limit = 180 } = {}) => {
  const token = loadStudentAuthToken();
  if (!token) return loadStudentWorkoutHistory();

  try {
    const response = await requestStudentApi(
      `/progress/workouts/history?limit=${encodeURIComponent(String(Math.max(1, Number(limit) || 180)))}`,
      { token }
    );
    const history = Array.isArray(response && response.history) ? response.history : [];
    saveStudentWorkoutHistory(history);
    return loadStudentWorkoutHistory();
  } catch (error) {
    if (!silent) throw error;
    return loadStudentWorkoutHistory();
  }
};

const getCompletedWorkoutIdsFromHistory = (referenceDate = new Date()) => {
  const currentWeekDateKeys = new Set(getWeekDateKeys(referenceDate));
  return new Set(
    loadStudentWorkoutHistory()
      .filter((record) => {
        const completedDateKey = isDateKey(record && record.completedDateKey)
          ? String(record.completedDateKey).trim()
          : '';
        if (completedDateKey) return currentWeekDateKeys.has(completedDateKey);

        const completedAt = String((record && record.completedAt) || '').trim();
        if (!completedAt) return false;
        const parsed = new Date(completedAt);
        if (Number.isNaN(parsed.getTime())) return false;
        return currentWeekDateKeys.has(toDateKey(parsed));
      })
      .map((record) => String(record && record.workoutId ? record.workoutId : '').trim())
      .filter(Boolean)
  );
};

const getWorkoutDisplayName = (workout) =>
  String((workout && (workout._displayName || workout.name || workout.code)) || 'Treino').trim();

const getWorkoutPrimaryGroup = (workout) => {
  const exercises = Array.isArray(workout && workout.exercises) ? workout.exercises : [];
  const groupsCounter = new Map();

  exercises.forEach((exercise) => {
    const groupKey = normalizeLibraryGroupKey(
      exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group),
      ''
    );
    if (!groupKey) return;
    groupsCounter.set(groupKey, (groupsCounter.get(groupKey) || 0) + 1);
  });

  if (!groupsCounter.size) {
    return normalizeLibraryGroupKey(
      workout && (workout.group || workout.muscleGroup || workout.muscle_group),
      ''
    );
  }

  return Array.from(groupsCounter.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    })[0][0];
};

const getWorkoutHistoryThumbnail = (workout) => {
  const workoutCover = resolveWorkoutCoverImageUrl(workout);
  if (workoutCover) return workoutCover;

  const primaryGroup = getWorkoutPrimaryGroup(workout);
  const groupImage = getLibraryGroupImageSrc(primaryGroup);
  if (groupImage) return groupImage;

  const exercises = Array.isArray(workout && workout.exercises) ? workout.exercises : [];
  const firstImageExercise = exercises.find((exercise) =>
    Boolean(resolveApiMediaUrl(String((exercise && exercise.imageUrl) || '').trim()))
  );
  if (firstImageExercise) {
    return resolveApiMediaUrl(String((firstImageExercise && firstImageExercise.imageUrl) || '').trim());
  }

  return workoutHeroMap[workout && workout.id] || 'aba de img/nova logo.png';
};

const getWorkoutHistoryDurationMinutes = (workout) => {
  const exercises = Array.isArray(workout && workout.exercises) ? workout.exercises : [];
  const totalExerciseSeconds = exercises.reduce(
    (sum, exercise) =>
      sum +
      Math.max(0, Number(exercise && exercise.durationSeconds) || 0) +
      Math.max(0, Number(exercise && exercise.restSeconds) || 0),
    0
  );

  if (totalExerciseSeconds > 0) {
    return Math.max(1, Math.round(totalExerciseSeconds / 60));
  }

  return Math.max(1, parseDurationMinutes(workout && workout.duration));
};

const getWorkoutHistoryCalories = (workout) => {
  const exercises = Array.isArray(workout && workout.exercises) ? workout.exercises : [];
  if (!exercises.length) {
    return Number((getWorkoutHistoryDurationMinutes(workout) * 0.28).toFixed(1));
  }

  const total = exercises.reduce((sum, exercise) => {
    const persistedKcal = Number(exercise && exercise.caloriesEstimate);
    const exerciseKcal =
      Number.isFinite(persistedKcal) && persistedKcal > 0
        ? persistedKcal
        : estimateExerciseCalories({
            durationSeconds: Math.max(0, Number(exercise && exercise.durationSeconds) || 0),
            repetitions: Math.max(1, Number(exercise && exercise.repetitions) || 10),
            restSeconds: Math.max(0, Number(exercise && exercise.restSeconds) || 0),
            loadKg: Math.max(0, Number(exercise && exercise.loadKg) || 0)
          });
    return sum + exerciseKcal;
  }, 0);

  return Number(total.toFixed(1));
};

const persistCompletedWorkoutHistory = async (workout, completedAt = new Date()) => {
  if (!workout) {
    throw new Error('Treino não encontrado para conclusão.');
  }

  const safeCompletedAt = completedAt instanceof Date ? completedAt : new Date(completedAt);
  if (Number.isNaN(safeCompletedAt.getTime())) {
    throw new Error('Horário inválido para registrar a conclusão do treino.');
  }

  const token = loadStudentAuthToken();
  if (!token) {
    throw new Error('Faça login novamente para salvar o histórico do treino.');
  }

  const response = await requestStudentApi(
    `/progress/workouts/${encodeURIComponent(String(workout.id))}/complete`,
    {
      method: 'POST',
      token,
      body: {
        completedAt: safeCompletedAt.toISOString(),
        completedDateKey: toDateKey(safeCompletedAt)
      }
    }
  );

  const history = Array.isArray(response && response.history) ? response.history : [];
  if (history.length) {
    saveStudentWorkoutHistory(history);
  } else {
    const fallbackRecords = loadStudentWorkoutHistory();
    const completion = response && response.completion ? response.completion : null;
    saveStudentWorkoutHistory(completion ? [completion, ...fallbackRecords] : fallbackRecords);
  }

  const summary = response && response.summary ? response.summary : null;
  if (summary) {
    applyWeekSummaryToLocalCache(summary, safeCompletedAt);
  }

  return response;
};

const getWorkoutHistoryDayStats = (records) => {
  const uniqueDayKeys = Array.from(
    new Set(
      (Array.isArray(records) ? records : [])
        .map((record) => {
          const completedAt = String((record && record.completedAt) || '').trim();
          if (!completedAt) return '';
          const parsed = new Date(completedAt);
          return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
        })
        .filter(Boolean)
    )
  ).sort();

  if (!uniqueDayKeys.length) {
    return {
      streakDays: 0,
      recordDays: 0
    };
  }

  let recordDays = 1;
  let runningRecord = 1;
  for (let index = 1; index < uniqueDayKeys.length; index += 1) {
    const previous = new Date(`${uniqueDayKeys[index - 1]}T00:00:00`);
    const current = new Date(`${uniqueDayKeys[index]}T00:00:00`);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);
    if (diffDays === 1) {
      runningRecord += 1;
      recordDays = Math.max(recordDays, runningRecord);
    } else if (diffDays > 1) {
      runningRecord = 1;
    }
  }

  const todayKey = toDateKey(new Date());
  let streakDays = 0;
  let cursor = new Date(`${todayKey}T00:00:00`);
  const daySet = new Set(uniqueDayKeys);
  while (daySet.has(toDateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    streakDays,
    recordDays
  };
};

const markTodayWorkoutAsDone = () => {
  const now = new Date();
  const todayKey = toDateKey(now);
  const current = loadStudentWeekLog(now);
  if (!current.includes(todayKey)) {
    const next = pruneStudentWeekLog([...current, todayKey], now);
    saveStudentWeekLog(next, now);
  }
  showSiteTopNotice('Checagem diária atualizada para hoje.', true, { durationMs: 2400 });

  void persistWeeklyDayStatus({
    dateKey: todayKey,
    done: true,
    referenceDate: now
  })
    .then((summary) => {
      if (summary) renderDashboard();
    })
    .catch(() => {});
};

const toggleWeekDayDone = (dateKey) => {
  if (!isDateKey(dateKey)) return null;

  const now = new Date();
  const weekKeys = new Set(getWeekDateKeys(now));
  if (!weekKeys.has(dateKey)) return null;

  const current = loadStudentWeekLog(now);
  const exists = current.includes(dateKey);
  const next = exists ? current.filter((item) => item !== dateKey) : [...current, dateKey];
  saveStudentWeekLog(pruneStudentWeekLog(next, now), now);

  return {
    dateKey,
    done: !exists,
    referenceDate: now,
  };
};

const handleWeekDayToggle = async (event) => {
  const trigger = event.target instanceof Element
    ? event.target.closest('[data-student-week-date]')
    : null;
  if (!trigger) return;

  const dateKey = String(trigger.getAttribute('data-student-week-date') || '').trim();
  const result = toggleWeekDayDone(dateKey);
  if (!result) return;

  renderDashboard();
  const formattedDate = formatDateKeyPtBr(result.dateKey);
  const toggleMessage = result.done
    ? `Checagem diária de ${formattedDate} marcada.`
    : `Checagem diária de ${formattedDate} desmarcada.`;
  showSiteTopNotice(toggleMessage, true, { durationMs: 2400 });

  try {
    const summary = await persistWeeklyDayStatus(result);
    if (summary) renderDashboard();
  } catch (_) {}
};

const LOOP_CHECK_ICON =
  '<svg class="student-week-col-check loop-check-icon" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path pathLength="1" d="M18 6 7 17l-5-5"></path>' +
  '<path class="loop-check-path-2" pathLength="1" d="m22 10-7.5 7.5L13 16"></path>' +
  '</svg>';

const CURRENT_DAY_ICON =
  '<svg class="student-week-col-current-icon" viewBox="0 0 24 24" aria-hidden="true">' +
  '<g class="student-week-col-current-spin">' +
  '<path d="M10.1 2.18a9.93 9.93 0 0 1 3.8 0"></path>' +
  '<path d="M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7"></path>' +
  '<path d="M21.82 10.1a9.93 9.93 0 0 1 0 3.8"></path>' +
  '<path d="M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69"></path>' +
  '<path d="M13.9 21.82a9.94 9.94 0 0 1-3.8 0"></path>' +
  '<path d="M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7"></path>' +
  '<path d="M2.18 13.9a9.93 9.93 0 0 1 0-3.8"></path>' +
  '<path d="M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69"></path>' +
  '</g>' +
  '<circle cx="12" cy="12" r="1.6"></circle>' +
  '</svg>';

const hydrateLoopCheckIcons = (scope = document) => {
  scope.querySelectorAll('.loop-check-icon path').forEach((path) => {
    try {
      const len = path.getTotalLength();
      path.style.setProperty('--path-len', String(len));
    } catch (_) {
      path.style.setProperty('--path-len', '20');
    }
  });
};

const STUDENT_WEEKDAY_ORDER = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const STUDENT_WEEKDAY_LABELS = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sab',
  dom: 'Dom'
};

const normalizeStudentWeekdayKey = (value) => {
  const normalized = normalizeText(String(value || '').trim());
  if (!normalized) return '';
  if (normalized === 'seg' || normalized.startsWith('segunda')) return 'seg';
  if (normalized === 'ter' || normalized.startsWith('terca') || normalized.startsWith('terça')) return 'ter';
  if (normalized === 'qua' || normalized.startsWith('quarta')) return 'qua';
  if (normalized === 'qui' || normalized === 'quin' || normalized.startsWith('quinta')) return 'qui';
  if (normalized === 'sex' || normalized.startsWith('sexta')) return 'sex';
  if (normalized === 'sab' || normalized.startsWith('sabado') || normalized.startsWith('sábado')) return 'sab';
  if (normalized === 'dom' || normalized.startsWith('domingo')) return 'dom';
  return '';
};

const getStudentWorkoutTimestamp = (workout) => {
  const updatedRaw = String((workout && (workout.updatedAt || workout.createdAt)) || '').trim();
  if (updatedRaw) {
    const updatedDate = new Date(updatedRaw);
    if (!Number.isNaN(updatedDate.getTime())) return updatedDate.getTime();
  }
  const numericId = Number(workout && workout.id);
  if (Number.isFinite(numericId)) return numericId;
  return 0;
};

const getStudentWorkoutWeekdayKeys = (workout) => {
  const rawWeekDays = Array.isArray(workout && workout.weekDays)
    ? workout.weekDays
    : [];
  const parsedWeekDays = rawWeekDays
    .map((day) => normalizeStudentWeekdayKey(day))
    .filter(Boolean);
  if (parsedWeekDays.length) return Array.from(new Set(parsedWeekDays));

  const dayLabel = String((workout && workout.day) || '').trim();
  if (!dayLabel) return [];
  return Array.from(
    new Set(
      dayLabel
        .split(/[,/|]| e /i)
        .map((token) => normalizeStudentWeekdayKey(token))
        .filter(Boolean)
    )
  );
};

const getStudentWorkoutDisplayName = (workout) => {
  const rawName = String((workout && (workout.name || workout.title || workout.code)) || '').trim();
  if (!rawName) return 'Treino';
  const workoutCode = String((workout && workout.code) || '').trim();
  let normalizedName = rawName;
  if (workoutCode) {
    const escapedCode = workoutCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalizedName = normalizedName.replace(new RegExp(`^${escapedCode}\\s*-\\s*`, 'i'), '').trim();
  }
  normalizedName = normalizedName.replace(/\s*-\s*(seg|ter|qua|qui|sex|sab|dom)\s*$/i, '').trim();
  return normalizedName || rawName;
};

const getVisibleStudentWorkouts = () => {
  const workouts = Array.isArray(studentData.workouts) ? studentData.workouts : [];
  if (!workouts.length) return [];

  return workouts
    .map((workout) => {
      const dayKeys = getStudentWorkoutWeekdayKeys(workout);
      const visibleDayLabel = dayKeys.length
        ? dayKeys.map((dayKey) => STUDENT_WEEKDAY_LABELS[dayKey] || dayKey).join(', ')
        : String((workout && workout.day) || 'Plano ativo').trim() || 'Plano ativo';
      return {
        ...workout,
        _visibleDayKeys: dayKeys,
        _visibleDayLabel: visibleDayLabel,
        _displayName: getStudentWorkoutDisplayName(workout)
      };
    })
    .sort((first, second) => {
      const firstIndex = first._visibleDayKeys.length
        ? Math.min(
            ...first._visibleDayKeys
              .map((dayKey) => STUDENT_WEEKDAY_ORDER.indexOf(dayKey))
              .filter((index) => index >= 0)
          )
        : 99;
      const secondIndex = second._visibleDayKeys.length
        ? Math.min(
            ...second._visibleDayKeys
              .map((dayKey) => STUDENT_WEEKDAY_ORDER.indexOf(dayKey))
              .filter((index) => index >= 0)
          )
        : 99;
      if (firstIndex !== secondIndex) return firstIndex - secondIndex;
      return getStudentWorkoutTimestamp(second) - getStudentWorkoutTimestamp(first);
    });
};

/* ==========================================================================
   7) Student app content render
   ========================================================================== */
const getWorkoutSummary = () => {
  const visibleWorkouts = getVisibleStudentWorkouts();
  const total = visibleWorkouts.length;
  if (!total) {
    const emptyWorkout = {
      id: null,
      code: 'Treino',
      name: 'Nenhum treino cadastrado',
      duration: '0 min',
      exercises: []
    };
    return { total: 0, done: 0, current: emptyWorkout, next: emptyWorkout };
  }

  const done = visibleWorkouts.filter((w) => w.done).length;
  const current = visibleWorkouts.find((w) => !w.done) || visibleWorkouts[0];
  const next = visibleWorkouts.find((w) => w.id !== current.id) || current;
  return { total, done, current, next };
};

const getWorkoutObjectiveLabel = (workout) =>
  String(
    workout && (workout.objective || workout.objetivo || workout.goal || workout.objectiveLabel) || ''
  ).trim();

const getDashboardObjectiveTitle = () => {
  const currentWorkout = studentData.workouts.find((workout) => !workout.done);
  const workoutWithObjective = currentWorkout && getWorkoutObjectiveLabel(currentWorkout)
    ? currentWorkout
    : studentData.workouts.find((workout) => getWorkoutObjectiveLabel(workout));
  const objective = String(
    (workoutWithObjective && getWorkoutObjectiveLabel(workoutWithObjective)) || studentData.objective || ''
  ).trim();
  return objective || 'Objetivo definido pelo instrutor';
};

const renderDashboard = () => {
  const summary = getWorkoutSummary();
  const completionPercent = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
  const objectiveTitle = getDashboardObjectiveTitle();
  if (studentNameDisplay) studentNameDisplay.textContent = studentData.userName;
  if (studentPlanDisplay) studentPlanDisplay.textContent = studentData.plan;
  if (studentGreetingName) studentGreetingName.textContent = studentData.userName;
  if (studentDateDisplay) studentDateDisplay.textContent = getCurrentDateLabel();
  if (dashboardGreeting) dashboardGreeting.textContent = 'Plano atualizado para esta semana';
  const currentWorkoutLabel = String(summary.current._displayName || summary.current.name || summary.current.code || 'Treino').trim();
  const nextWorkoutLabel = String(summary.next._displayName || summary.next.name || summary.next.code || 'Treino').trim();
  if (dashboardCurrent) dashboardCurrent.textContent = currentWorkoutLabel;
  if (dashboardNext) dashboardNext.textContent = nextWorkoutLabel;
  if (dashboardCurrentMeta) dashboardCurrentMeta.textContent = `${summary.current.exercises.length} exercícios - ${summary.current.duration}`;
  if (dashboardNextMeta) dashboardNextMeta.textContent = `${summary.next.exercises.length} exercícios - ${summary.next.duration}`;
  if (dashboardUpcomingDayCurrent || dashboardUpcomingDayNext) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (dashboardUpcomingDayCurrent) dashboardUpcomingDayCurrent.textContent = String(today.getDate());
    if (dashboardUpcomingDayNext) dashboardUpcomingDayNext.textContent = String(tomorrow.getDate());
  }
  if (dashboardStatus) dashboardStatus.textContent = studentData.status;
  if (dashboardStatusLevel) dashboardStatusLevel.textContent = 'Nível: Iniciante';
  if (dashboardCompletedPercent) dashboardCompletedPercent.textContent = `${completionPercent}%`;
  if (dashboardCompletedText) dashboardCompletedText.textContent = `${summary.done} de ${summary.total} concluídos`;
  if (dashboardCompletedFill) dashboardCompletedFill.style.width = `${completionPercent}%`;
  if (dashboardGoalTitle) dashboardGoalTitle.textContent = objectiveTitle;

  if (dashboardWeekGrid) {
    const weeklyState = getWeeklySummaryState(new Date());
    const doneInWeek = weeklyState.doneCount;

    dashboardWeekGrid.innerHTML = weeklyState.days
      .map((day, index) => {
        const isDone = Boolean(day && day.done);
        const isCurrent = Boolean(day && day.isCurrent);
        const boxClass = isDone ? 'is-done' : isCurrent ? 'is-current' : '';
        const icon = isDone ? LOOP_CHECK_ICON : isCurrent ? CURRENT_DAY_ICON : '';
        const ariaLabel = `Checagem diária de ${day.label}`;
        const isPressed = isDone ? 'true' : 'false';

        return `
          <div class="student-week-col">
            <span class="student-week-col-label">${day.label}</span>
            <button
              type="button"
              class="student-week-col-box ${boxClass}"
              data-student-week-date="${day.dateKey}"
              aria-label="${ariaLabel}"
              aria-pressed="${isPressed}"
            >${icon}</button>
          </div>
        `;
      })
      .join('');

    if (dashboardWeekTotal) {
      const target = 5;
      dashboardWeekTotal.textContent = `${Math.min(doneInWeek, target)}/${target} treinos`;
    }
  }

  studentData.goalProgress = completionPercent;
  if (dashboardGoalFill) dashboardGoalFill.style.width = `${completionPercent}%`;
  if (dashboardGoalPercent) {
    dashboardGoalPercent.innerHTML = `<span class="student-goal-percent-number">${completionPercent}%</span> concluído`;
  }
  if (dashboardPerformance) dashboardPerformance.textContent = `${studentData.performance}%`;
  hydrateLoopCheckIcons();
};

const renderAllWorkoutsCards = () => {
  if (!allWorkoutsList) return;

  const visibleWorkouts = getVisibleStudentWorkouts();
  const currentWorkout = visibleWorkouts.find((w) => !w.done) || visibleWorkouts[0];
  allWorkoutsList.innerHTML = '';

  if (!visibleWorkouts.length) {
    allWorkoutsList.innerHTML = '<p class="student-workout-empty">Nenhum treino atribuído ainda.</p>';
    return;
  }

  visibleWorkouts.slice(0, 3).forEach((workout) => {
    const shortcut = document.createElement('button');
    shortcut.type = 'button';
    shortcut.className = `student-all-workout-item${currentWorkout && workout.id === currentWorkout.id ? ' is-active' : ''}`;
    shortcut.dataset.workoutId = workout.id;

    const badgeText = workout.code.replace(/Treino\s*/i, '').trim() || workout.code;
    shortcut.innerHTML = `
      <span class="student-all-workout-badge">${badgeText}</span>
      <span class="student-all-workout-copy">
        <strong>${String(workout._displayName || workout.code || '').trim()}</strong>
        <small>${String(workout._visibleDayLabel || workout.day || '').trim()}</small>
      </span>
      <span class="student-all-workout-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
      </span>
    `;

    shortcut.addEventListener('click', () => {
      selectedWorkoutId = workout.id;
      renderWorkoutList();
      renderWorkoutDetail();
      setStudentAppTab('treinos');
    });

    allWorkoutsList.appendChild(shortcut);
  });
};

const renderWorkoutDetail = () => {
  const visibleWorkouts = getVisibleStudentWorkouts();
  const workout = visibleWorkouts.find((item) => item.id === selectedWorkoutId)
    || studentData.workouts.find((item) => item.id === selectedWorkoutId);
  if (!workoutDetailTitle || !workoutDetailDay || !workoutExerciseList || !workoutCompleteButton) return;

  if (!workout) {
    workoutDetailTitle.textContent = 'Selecione um treino';
    workoutDetailDay.textContent = 'Escolha um card para ver detalhes.';
    workoutExerciseList.innerHTML = '';
    workoutCompleteButton.disabled = true;
    return;
  }

  const displayName = String(workout._displayName || workout.name || workout.code || 'Treino').trim();
  const dayLabel = String(workout._visibleDayLabel || workout.day || 'Plano ativo').trim();
  workoutDetailTitle.textContent = displayName;
  workoutDetailDay.textContent = `Dias: ${dayLabel} | Duração média: ${workout.duration}`;
  workoutExerciseList.innerHTML = workout.exercises
    .map((e) => `<li><strong>${e.name}</strong><span>${e.series} séries - ${e.reps} repetições - Carga: ${e.load}</span></li>`)
    .join('');

  workoutCompleteButton.disabled = workout.done;
  const span = workoutCompleteButton.querySelector('span');
  if (span) span.textContent = workout.done ? 'Treino concluído' : 'Marcar treino como concluído';
};

const ensureWorkoutCheckState = (workout) => {
  if (!workout) return [];
  const current = workoutExerciseChecks[workout.id];
  if (Array.isArray(current) && current.length === workout.exercises.length) return current;
  const next = workout.exercises.map(() => Boolean(workout.done));
  workoutExerciseChecks[workout.id] = next;
  return next;
};

const ensureWorkoutDeferredQueue = (workout) => {
  if (!workout) return [];
  const checks = ensureWorkoutCheckState(workout);
  const current = workoutExerciseDeferredQueue[workout.id];
  const next = Array.isArray(current)
    ? current.filter((index, position, array) =>
      Number.isInteger(index) &&
      index >= 0 &&
      index < workout.exercises.length &&
      !checks[index] &&
      array.indexOf(index) === position
    )
    : [];
  workoutExerciseDeferredQueue[workout.id] = next;
  return next;
};

const removeDeferredWorkoutExercise = (workout, index) => {
  if (!workout) return;
  const queue = ensureWorkoutDeferredQueue(workout);
  const nextQueue = queue.filter((queueIndex) => queueIndex !== index);
  workoutExerciseDeferredQueue[workout.id] = nextQueue;
};

const deferWorkoutExercise = (workout, index) => {
  if (!workout) return [];
  const checks = ensureWorkoutCheckState(workout);
  if (checks[index]) return ensureWorkoutDeferredQueue(workout);
  const queue = ensureWorkoutDeferredQueue(workout);
  if (!queue.includes(index)) {
    queue.push(index);
  }
  workoutExerciseDeferredQueue[workout.id] = queue;
  return queue;
};

const getPendingWorkoutExerciseOrder = (workout, { excludeIndex = -1 } = {}) => {
  if (!workout || !Array.isArray(workout.exercises) || !workout.exercises.length) return [];
  const checks = ensureWorkoutCheckState(workout);
  const deferredQueue = ensureWorkoutDeferredQueue(workout);
  const deferredSet = new Set(deferredQueue);
  const pendingIndices = workout.exercises
    .map((_, index) => index)
    .filter((index) => !checks[index] && index !== excludeIndex);
  const nonDeferredPending = pendingIndices.filter((index) => !deferredSet.has(index));
  const deferredPending = deferredQueue.filter((index) => pendingIndices.includes(index));
  return [...nonDeferredPending, ...deferredPending];
};

const getNextPendingWorkoutExerciseIndex = (workout, { excludeIndex = -1 } = {}) => {
  const orderedPendingIndices = getPendingWorkoutExerciseOrder(workout, { excludeIndex });
  return orderedPendingIndices.length ? orderedPendingIndices[0] : -1;
};

const getWorkoutChecksDoneCount = (workout) => {
  const checks = ensureWorkoutCheckState(workout);
  return checks.filter(Boolean).length;
};

const getExerciseLoadPresentation = (exercise) => {
  const rawLoad = String((exercise && exercise.load) || '').trim();
  const loadMatch = rawLoad.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  const explicitLoadKg = Number(exercise && exercise.loadKg);
  const parsedLoadKg = loadMatch ? Number(String(loadMatch[1]).replace(',', '.')) : 0;
  const safeLoadKg = explicitLoadKg > 0 ? explicitLoadKg : parsedLoadKg;

  if (safeLoadKg > 0) {
    const value = Number.isInteger(safeLoadKg)
      ? `${safeLoadKg}kg`
      : `${safeLoadKg.toFixed(1)}kg`;
    return {
      summary: value,
      metricLabel: 'Carga',
      metricValue: value
    };
  }

  const rawRestMatch = rawLoad.match(/(\d+)\s*s/i);
  const parsedRestSeconds = rawRestMatch ? Number(rawRestMatch[1]) : 0;
  const restSeconds = Math.max(0, Number(exercise && exercise.restSeconds) || parsedRestSeconds);
  const restLabel = restSeconds > 0 ? formatSecondsLabel(restSeconds) : '-';

  return {
    summary: `desc ${restLabel}`,
    metricLabel: 'Descanso',
    metricValue: restLabel
  };
};

const getWorkoutHero = (workout) =>
  resolveWorkoutCoverImageUrl(workout) ||
  workoutHeroMap[workout.id] ||
  workoutHeroMap.a;

const getExerciseDetailConfig = (exerciseLike) => {
  const exerciseName =
    typeof exerciseLike === 'string'
      ? exerciseLike
      : String((exerciseLike && exerciseLike.name) || '').trim();
  const key = normalizeText(exerciseName);
  const mapped = exerciseDetailMap[key] || {};
  const defaultDescription =
    'Descrição do exercício não informada.';
  const defaultInstructions =
    'Execute o movimento com controle, mantendo postura correta e respiração constante durante toda a série.';
  const normalizeDetailLines = (value, { splitCommas = false } = {}) => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          String(item || '')
            .replace(/^[\-\*]\s*/, '')
            .replace(/^\d+[\.\)\-:]\s*/, '')
            .trim()
        )
        .filter(Boolean);
    }

    const raw = String(value || '').trim();
    if (!raw) return [];
    const pattern = splitCommas ? /\r?\n|[,;]+/ : /\r?\n+/;
    return raw
      .split(pattern)
      .map((item) =>
        String(item || '')
          .replace(/^[\-\*]\s*/, '')
          .replace(/^\d+[\.\)\-:]\s*/, '')
          .trim()
      )
      .filter(Boolean);
  };
  const formatInstructionLines = (lines) => {
    const normalizedLines = normalizeDetailLines(lines, { splitCommas: false });
    if (!normalizedLines.length) return '';
    if (normalizedLines.length === 1) return normalizedLines[0];
    return normalizedLines
      .map((line, index) => `${index + 1}. ${line}`)
      .join('\n');
  };
  const linkedLibraryExercise = (() => {
    if (!exerciseLike || typeof exerciseLike !== 'object') return null;
    const libraryItems = Array.isArray(studentData && studentData.library) ? studentData.library : [];
    if (!libraryItems.length) return null;
    const candidateIds = [
      exerciseLike.exerciseId,
      exerciseLike.exercise_id,
      exerciseLike.libraryExerciseId,
      exerciseLike.library_exercise_id
    ]
      .map((value) => Number(value) || 0)
      .filter((value) => value > 0);
    for (const id of candidateIds) {
      const byId = libraryItems.find((item) => Number(item && item.id) === id);
      if (byId) return byId;
    }
    const normalizedName = normalizeText(String((exerciseLike && exerciseLike.name) || '').trim());
    if (!normalizedName) return null;
    return (
      libraryItems.find((item) => normalizeText(String((item && item.name) || '')) === normalizedName) ||
      null
    );
  })();
  const directDescriptionLines =
    exerciseLike && typeof exerciseLike === 'object'
      ? normalizeDetailLines(
          exerciseLike.description !== undefined
            ? exerciseLike.description
            : exerciseLike.observation !== undefined
              ? exerciseLike.observation
              : exerciseLike.observacao !== undefined
                ? exerciseLike.observacao
                : mapped.description,
          { splitCommas: false }
        )
      : [];
  const directTutorialLines =
    exerciseLike && typeof exerciseLike === 'object'
      ? normalizeDetailLines(
          exerciseLike.tutorialSteps !== undefined
            ? exerciseLike.tutorialSteps
            : exerciseLike.tutorial_steps !== undefined
              ? exerciseLike.tutorial_steps
              : exerciseLike.instructionsList !== undefined
                ? exerciseLike.instructionsList
                : exerciseLike.instructions_list !== undefined
                  ? exerciseLike.instructions_list
                  : exerciseLike.tutorialText !== undefined
                    ? exerciseLike.tutorialText
                    : exerciseLike.tutorial_text !== undefined
                      ? exerciseLike.tutorial_text
                      : exerciseLike.instructions !== undefined
                        ? exerciseLike.instructions
                        : exerciseLike.observation !== undefined
                          ? exerciseLike.observation
                          : exerciseLike.observacao,
          { splitCommas: false }
        )
      : [];
  const linkedDescriptionLines = linkedLibraryExercise
    ? normalizeDetailLines(
        linkedLibraryExercise.instructions !== undefined
          ? linkedLibraryExercise.instructions
          : linkedLibraryExercise.description,
        { splitCommas: false }
      )
    : [];
  const linkedTutorialLines = linkedLibraryExercise
    ? normalizeDetailLines(
        linkedLibraryExercise.tutorialSteps !== undefined
          ? linkedLibraryExercise.tutorialSteps
          : linkedLibraryExercise.tutorial_steps !== undefined
            ? linkedLibraryExercise.tutorial_steps
            : linkedLibraryExercise.instructionsList !== undefined
              ? linkedLibraryExercise.instructionsList
              : linkedLibraryExercise.instructions_list !== undefined
                ? linkedLibraryExercise.instructions_list
                : linkedLibraryExercise.instructions !== undefined
                  ? linkedLibraryExercise.instructions
                  : linkedLibraryExercise.description,
        { splitCommas: false }
      )
    : [];
  const resolvedDescriptionLines = directDescriptionLines.length
    ? directDescriptionLines
    : linkedDescriptionLines;
  const resolvedTutorialLines = directTutorialLines.length
    ? directTutorialLines
    : linkedTutorialLines;
  const directDescription = resolvedDescriptionLines.join('\n').trim();
  const directInstructions = formatInstructionLines(resolvedTutorialLines).trim();
  const rawDuration =
    exerciseLike &&
    typeof exerciseLike === 'object' &&
    (exerciseLike.durationSeconds !== undefined || exerciseLike.duration !== undefined)
      ? Number(exerciseLike.durationSeconds !== undefined ? exerciseLike.durationSeconds : exerciseLike.duration)
      : Number(mapped.duration || 20);
  const safeDuration = Number.isFinite(rawDuration) ? Math.round(rawDuration) : 20;

  return {
    duration: Math.max(10, Math.min(180, safeDuration)),
    figure: String(mapped.figure || '').trim(),
    description: directDescription || String(mapped.description || directInstructions || defaultDescription).trim(),
    instructions: directInstructions || String(mapped.instructions || directDescription || defaultInstructions).trim()
  };
};

const renderExerciseDetailContent = () => {
  const activeTab = activeExerciseDetailTab === 'instruction' ? 'instruction' : 'description';
  const content =
    activeTab === 'instruction'
      ? activeExerciseDetailContent.instructions
      : activeExerciseDetailContent.description;

  exerciseDetailTabButtons.forEach((button) => {
    const isActive = button.dataset.studentExerciseDetailTab === activeTab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (exerciseDetailContentTitle) {
    exerciseDetailContentTitle.textContent = activeTab === 'instruction' ? 'Instrução' : 'Descrição';
  }

  if (exerciseDetailInstructions) {
    exerciseDetailInstructions.textContent = content || '';
  }
};

const setExerciseDetailTab = (tabId = 'description') => {
  activeExerciseDetailTab = tabId === 'instruction' ? 'instruction' : 'description';
  renderExerciseDetailContent();
};

const WORKOUT_FALLBACK_SYMBOL = String.fromCodePoint(0x1F4AA);
const WORKOUT_FALLBACK_SVG = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 10h3v4H2zM19 10h3v4h-3zM7 8h2v8H7zM15 8h2v8h-2zM9 9h6v6H9z"></path>
  </svg>
`;
const PREP_SCREEN_DEFAULT_VIDEO_LIGHT_CANDIDATES = [
  '/img/video_pre_treino_tema_claro.mp4',
  '/videos do site/vídeo pre treino tema claro.mp4',
  '/videos do site/video_pre_treino_tema_claro.mp4'
];
const PREP_SCREEN_DEFAULT_VIDEO_DARK_CANDIDATES = [
  '/img/video_pre_treino_tema_escuro.mp4',
  '/videos do site/video pre treino tema preto.mp4',
  '/videos do site/video_pre_treino_tema_escuro.mp4'
];
const PREP_SCREEN_DEFAULT_VIDEO_FALLBACK = '/img/carregamento.mp4';

const setWorkoutFigure = (target, figureValue) => {
  if (!target) return;
  const rawFigure = String(figureValue || '').trim();
  const shouldUseFallback = !rawFigure || /^\?+$/.test(rawFigure);
  if (shouldUseFallback) {
    target.classList.add('is-fallback-icon');
    target.innerHTML = WORKOUT_FALLBACK_SVG;
    return;
  }

  target.classList.remove('is-fallback-icon');
  target.textContent = rawFigure;
};

const isEmbeddableVideoUrl = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('youtube.com') ||
    normalized.includes('youtu.be') ||
    normalized.includes('vimeo.com')
  );
};

const resolveExerciseMedia = (exercise) => {
  const nestedExercise =
    (exercise && (
      exercise.libraryExercise ||
      exercise.exercise ||
      exercise.library ||
      exercise.exerciseData
    )) || null;
  const normalizedExerciseName = normalizeText(
    (exercise && exercise.name) ||
    (nestedExercise && nestedExercise.name) ||
    ''
  );
  const linkedLibraryExerciseByName =
    !normalizedExerciseName
      ? null
      : (
        (Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [])
          .find((item) => normalizeText(item && item.name) === normalizedExerciseName) || null
      );
  const linkedStudentLibraryExerciseByName =
    !normalizedExerciseName
      ? null
      : (
        (Array.isArray(studentData.library) ? studentData.library : [])
          .find((item) => normalizeText(item && item.name) === normalizedExerciseName) || null
      );
  const linkedLibraryExerciseId = Math.max(
    0,
    Number(
      (exercise && (
        exercise.exerciseId ??
        exercise.exercise_id ??
        exercise.libraryExerciseId ??
        exercise.library_exercise_id
      )) ||
      (nestedExercise && (
        nestedExercise.exerciseId ??
        nestedExercise.exercise_id ??
        nestedExercise.libraryExerciseId ??
        nestedExercise.library_exercise_id
      ))
    ) || 0
  );
  const linkedLibraryExercise = linkedLibraryExerciseId
    ? (
      (Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [])
        .find((item) => Number(item && item.id) === linkedLibraryExerciseId) || null
    )
    : linkedLibraryExerciseByName;
  const linkedStudentLibraryExercise = linkedLibraryExerciseId
    ? (
      (Array.isArray(studentData.library) ? studentData.library : [])
        .find((item) => Number(item && item.id) === linkedLibraryExerciseId) || null
    )
    : linkedStudentLibraryExerciseByName;
  const linkedMediaType = String(
    (linkedLibraryExercise && (linkedLibraryExercise.mediaType ?? linkedLibraryExercise.media_type)) ||
    (linkedStudentLibraryExercise && linkedStudentLibraryExercise.mediaType) ||
    ''
  ).trim().toLowerCase();
  const linkedMediaUrl = String(
    (linkedLibraryExercise && (linkedLibraryExercise.mediaUrl ?? linkedLibraryExercise.media_url)) ||
    (linkedStudentLibraryExercise && linkedStudentLibraryExercise.mediaUrl) ||
    ''
  ).trim();
  const linkedAnimationUrl = String(
    (linkedLibraryExercise && (linkedLibraryExercise.animationUrl ?? linkedLibraryExercise.animation_url)) ||
    ''
  ).trim();
  const linkedVideoUrl = String(
    (linkedLibraryExercise && (
      linkedLibraryExercise.videoUrl ??
      linkedLibraryExercise.video_url ??
      linkedLibraryExercise.video
    )) ||
    (linkedStudentLibraryExercise && (
      linkedStudentLibraryExercise.video ||
      (linkedStudentLibraryExercise.mediaType === 'video' ? linkedStudentLibraryExercise.mediaUrl : '')
    )) ||
    linkedAnimationUrl
  ).trim();
  const linkedImageUrl = String(
    (linkedLibraryExercise && (
      linkedLibraryExercise.imageUrl ??
      linkedLibraryExercise.image_url ??
      linkedLibraryExercise.image
    )) ||
    (linkedStudentLibraryExercise && (
      linkedStudentLibraryExercise.imageUrl ||
      (linkedStudentLibraryExercise.mediaType === 'image' ? linkedStudentLibraryExercise.mediaUrl : '')
    )) ||
    ''
  ).trim();
  const rawMediaType = String(
    (exercise && (exercise.mediaType ?? exercise.media_type)) ||
    (nestedExercise && (nestedExercise.mediaType ?? nestedExercise.media_type)) ||
    linkedMediaType ||
    ''
  ).trim().toLowerCase();
  const rawMediaUrl = String(
    (exercise && (exercise.mediaUrl ?? exercise.media_url)) ||
    (nestedExercise && (nestedExercise.mediaUrl ?? nestedExercise.media_url)) ||
    linkedMediaUrl ||
    ''
  ).trim();
  const rawAnimationUrlCandidate = String(
    (exercise && (exercise.animationUrl ?? exercise.animation_url)) ||
    (nestedExercise && (nestedExercise.animationUrl ?? nestedExercise.animation_url)) ||
    linkedAnimationUrl ||
    (linkedMediaType === 'video' ? linkedMediaUrl : '') ||
    ''
  ).trim();
  const rawVideoUrlCandidate = String(
    rawMediaType === 'video' && rawMediaUrl
      ? rawMediaUrl
      : (
        (exercise && (exercise.videoUrl ?? exercise.video_url ?? exercise.video)) ||
        (nestedExercise && (nestedExercise.videoUrl ?? nestedExercise.video_url ?? nestedExercise.video)) ||
        linkedVideoUrl ||
        rawAnimationUrlCandidate
      )
  ).trim();
  const rawImageUrlCandidate = String(
    rawMediaType === 'image' && rawMediaUrl
      ? rawMediaUrl
      : (
        (exercise && (exercise.imageUrl ?? exercise.image_url ?? exercise.image)) ||
        (nestedExercise && (nestedExercise.imageUrl ?? nestedExercise.image_url ?? nestedExercise.image)) ||
        linkedImageUrl ||
        (linkedMediaType === 'image' ? linkedMediaUrl : '') ||
        ''
      )
  ).trim();

  const videoUrl = resolveApiMediaUrl(rawVideoUrlCandidate);
  const imageUrl = resolveApiMediaUrl(rawImageUrlCandidate);
  const resolvedMediaUrl = resolveApiMediaUrl(rawMediaUrl);
  const looksLikeVideoByPath = (() => {
    const candidate = String(videoUrl || resolvedMediaUrl || rawAnimationUrlCandidate || '').trim().toLowerCase();
    if (!candidate) return false;
    return /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/.test(candidate);
  })();
  const mediaType =
    rawMediaType ||
    (videoUrl || looksLikeVideoByPath ? 'video' : imageUrl ? 'image' : '');
  const mediaUrl = mediaType === 'video'
    ? (videoUrl || resolvedMediaUrl || resolveApiMediaUrl(rawAnimationUrlCandidate))
    : mediaType === 'image'
      ? (imageUrl || resolvedMediaUrl)
      : resolvedMediaUrl;

  return {
    mediaType,
    mediaUrl,
    videoUrl,
    imageUrl
  };
};

const syncExerciseDetailMedia = (exercise, fallbackFigure = '') => {
  if (!exerciseDetailFigure) return;

  if (exerciseDetailVideo) {
    exerciseDetailVideo.src = '';
    exerciseDetailVideo.classList.remove('is-visible');
  }

  if (exerciseDetailVideoFile) {
    exerciseDetailVideoFile.pause();
    exerciseDetailVideoFile.removeAttribute('src');
    exerciseDetailVideoFile.src = '';
    exerciseDetailVideoFile.classList.remove('is-visible');
  }

  if (exerciseDetailImage) {
    exerciseDetailImage.removeAttribute('src');
    exerciseDetailImage.src = '';
    exerciseDetailImage.classList.remove('is-visible');
  }

  if (exerciseDetailFallback) {
    const rawFallback = String(fallbackFigure || '').trim();
    exerciseDetailFallback.textContent = rawFallback && !/^\?+$/.test(rawFallback)
      ? rawFallback
      : WORKOUT_FALLBACK_SYMBOL;
    exerciseDetailFallback.hidden = false;
  }

  const media = resolveExerciseMedia(exercise);
  const videoUrl = media.videoUrl || (media.mediaType === 'video' ? media.mediaUrl : '');
  const imageUrl = media.imageUrl;

  if (videoUrl && isEmbeddableVideoUrl(videoUrl) && exerciseDetailVideo) {
    exerciseDetailVideo.src = videoUrl;
    exerciseDetailVideo.classList.add('is-visible');
    if (exerciseDetailFallback) exerciseDetailFallback.hidden = true;
    return;
  }

  if (videoUrl && exerciseDetailVideoFile) {
    exerciseDetailVideoFile.muted = true;
    exerciseDetailVideoFile.defaultMuted = true;
    exerciseDetailVideoFile.autoplay = true;
    exerciseDetailVideoFile.loop = true;
    exerciseDetailVideoFile.playsInline = true;
    exerciseDetailVideoFile.controls = false;
    exerciseDetailVideoFile.setAttribute('autoplay', '');
    exerciseDetailVideoFile.setAttribute('muted', '');
    exerciseDetailVideoFile.setAttribute('loop', '');
    exerciseDetailVideoFile.setAttribute('playsinline', '');
    exerciseDetailVideoFile.setAttribute('preload', 'auto');
    exerciseDetailVideoFile.removeAttribute('controls');
    exerciseDetailVideoFile.src = videoUrl;
    exerciseDetailVideoFile.classList.add('is-visible');
    const playAttempt = exerciseDetailVideoFile.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
    if (exerciseDetailFallback) exerciseDetailFallback.hidden = true;
    return;
  }

  if (imageUrl && exerciseDetailImage) {
    exerciseDetailImage.src = imageUrl;
    exerciseDetailImage.classList.add('is-visible');
    if (exerciseDetailFallback) exerciseDetailFallback.hidden = true;
  }
};

const resetPrepWorkoutMedia = () => {
  if (prepVideo) {
    prepVideo.src = '';
    prepVideo.classList.remove('is-visible');
  }

  if (prepVideoFile) {
    prepVideoFile.pause();
    prepVideoFile.onerror = null;
    prepVideoFile.removeAttribute('src');
    prepVideoFile.src = '';
    prepVideoFile.classList.remove('is-visible');
  }

  if (prepMedia) {
    prepMedia.classList.remove('has-video');
  }
};

const syncPrepWorkoutMedia = (exercise, fallbackFigure = '') => {
  setWorkoutFigure(prepFigure, fallbackFigure);
  resetPrepWorkoutMedia();

  const isDarkTheme = document.body.classList.contains('theme-dark');
  const themedPrepVideoCandidates = isDarkTheme
    ? PREP_SCREEN_DEFAULT_VIDEO_DARK_CANDIDATES
    : PREP_SCREEN_DEFAULT_VIDEO_LIGHT_CANDIDATES;
  const defaultPrepVideoCandidates = [
    ...themedPrepVideoCandidates,
    PREP_SCREEN_DEFAULT_VIDEO_FALLBACK
  ].map((value) => String(value || '').trim()).filter(Boolean);
  const videoUrl = defaultPrepVideoCandidates[0] || '';

  if (!videoUrl) return;

  if (prepVideoFile) {
    prepVideoFile.muted = true;
    prepVideoFile.defaultMuted = true;
    prepVideoFile.autoplay = true;
    prepVideoFile.loop = true;
    prepVideoFile.playsInline = true;
    prepVideoFile.controls = false;
    prepVideoFile.setAttribute('autoplay', '');
    prepVideoFile.setAttribute('muted', '');
    prepVideoFile.setAttribute('loop', '');
    prepVideoFile.setAttribute('playsinline', '');
    prepVideoFile.setAttribute('webkit-playsinline', '');
    prepVideoFile.setAttribute('preload', 'auto');
    prepVideoFile.removeAttribute('controls');

    prepVideoFile.onerror = null;
    const fallbackQueue = defaultPrepVideoCandidates.slice(1);
    prepVideoFile.onerror = () => {
      const nextVideoUrl = fallbackQueue.shift();
      if (!nextVideoUrl) {
        prepVideoFile.onerror = null;
        prepVideoFile.classList.remove('is-visible');
        if (prepMedia) prepMedia.classList.remove('has-video');
        return;
      }
      prepVideoFile.src = nextVideoUrl;
      prepVideoFile.load();
      const fallbackPlayAttempt = prepVideoFile.play();
      if (fallbackPlayAttempt && typeof fallbackPlayAttempt.catch === 'function') {
        fallbackPlayAttempt.catch(() => {});
      }
    };

    prepVideoFile.src = videoUrl;
    prepVideoFile.load();
    prepVideoFile.classList.add('is-visible');
    if (prepMedia) prepMedia.classList.add('has-video');
    const playAttempt = prepVideoFile.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }
};

const getWorkoutMediaSignature = (exercise, fallbackFigure = '') => {
  const exerciseId = exercise && exercise.id !== undefined && exercise.id !== null
    ? String(exercise.id)
    : '';
  const media = resolveExerciseMedia(exercise);
  return [
    exerciseId,
    media.mediaType,
    media.mediaUrl,
    media.videoUrl,
    media.imageUrl,
    String(fallbackFigure || '').trim()
  ].join('::');
};

const resetRunWorkoutMedia = () => {
  if (runVideo) {
    runVideo.src = '';
    runVideo.classList.remove('is-visible');
  }

  if (runVideoFile) {
    runVideoFile.pause();
    runVideoFile.removeAttribute('src');
    runVideoFile.src = '';
    runVideoFile.classList.remove('is-visible');
  }

  if (runMedia) {
    runMedia.classList.remove('has-video');
  }
  runWorkoutMediaSignature = '';
};

const syncRunWorkoutMedia = (exercise, fallbackFigure = '') => {
  setWorkoutFigure(runFigure, fallbackFigure);
  resetRunWorkoutMedia();

  const media = resolveExerciseMedia(exercise);
  const videoUrl = media.videoUrl || (media.mediaType === 'video' ? media.mediaUrl : '');

  if (!videoUrl) return;

  if (videoUrl && isEmbeddableVideoUrl(videoUrl) && runVideo) {
    runVideo.src = videoUrl;
    runVideo.classList.add('is-visible');
    if (runMedia) runMedia.classList.add('has-video');
    return;
  }

  if (runVideoFile) {
    runVideoFile.muted = true;
    runVideoFile.defaultMuted = true;
    runVideoFile.autoplay = true;
    runVideoFile.loop = true;
    runVideoFile.playsInline = true;
    runVideoFile.controls = false;
    runVideoFile.setAttribute('autoplay', '');
    runVideoFile.setAttribute('muted', '');
    runVideoFile.setAttribute('loop', '');
    runVideoFile.setAttribute('playsinline', '');
    runVideoFile.setAttribute('preload', 'auto');
    runVideoFile.removeAttribute('controls');
    runVideoFile.src = videoUrl;
    runVideoFile.classList.add('is-visible');
    if (runMedia) runMedia.classList.add('has-video');
    const playAttempt = runVideoFile.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }
};

const resetRestWorkoutMedia = () => {
  if (restVideo) {
    restVideo.src = '';
    restVideo.classList.remove('is-visible');
  }

  if (restVideoFile) {
    restVideoFile.pause();
    restVideoFile.removeAttribute('src');
    restVideoFile.src = '';
    restVideoFile.classList.remove('is-visible');
  }

  if (restMedia) {
    restMedia.classList.remove('has-video');
  }
  restWorkoutMediaSignature = '';
};

const syncRestWorkoutMedia = (exercise, fallbackFigure = '') => {
  setWorkoutFigure(restFigure, fallbackFigure);
  resetRestWorkoutMedia();

  const media = resolveExerciseMedia(exercise);
  const videoUrl = media.videoUrl || (media.mediaType === 'video' ? media.mediaUrl : '');

  if (!videoUrl) return;

  if (videoUrl && isEmbeddableVideoUrl(videoUrl) && restVideo) {
    restVideo.src = videoUrl;
    restVideo.classList.add('is-visible');
    if (restMedia) restMedia.classList.add('has-video');
    return;
  }

  if (restVideoFile) {
    restVideoFile.muted = true;
    restVideoFile.defaultMuted = true;
    restVideoFile.autoplay = true;
    restVideoFile.loop = true;
    restVideoFile.playsInline = true;
    restVideoFile.controls = false;
    restVideoFile.setAttribute('autoplay', '');
    restVideoFile.setAttribute('muted', '');
    restVideoFile.setAttribute('loop', '');
    restVideoFile.setAttribute('playsinline', '');
    restVideoFile.setAttribute('preload', 'auto');
    restVideoFile.removeAttribute('controls');
    restVideoFile.src = videoUrl;
    restVideoFile.classList.add('is-visible');
    if (restMedia) restMedia.classList.add('has-video');
    const playAttempt = restVideoFile.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }
};

const getExerciseRestDurationSeconds = (exerciseLike, fallbackLike = null) => {
  const fromExercise = Math.round(
    Number(
      exerciseLike && (
        exerciseLike.restSeconds !== undefined
          ? exerciseLike.restSeconds
          : exerciseLike.restTime !== undefined
            ? exerciseLike.restTime
            : exerciseLike.descanso
      )
    ) || 0
  );
  const fromFallback = Math.round(
    Number(
      fallbackLike && (
        fallbackLike.restSeconds !== undefined
          ? fallbackLike.restSeconds
          : fallbackLike.restTime !== undefined
            ? fallbackLike.restTime
            : fallbackLike.descanso
      )
    ) || 0
  );

  const base = fromExercise > 0 ? fromExercise : fromFallback > 0 ? fromFallback : 20;
  return Math.max(5, Math.min(600, base));
};

const clearRestCountdown = ({ resetMedia = true, resetState = true } = {}) => {
  if (restCountdownTimer) {
    window.clearInterval(restCountdownTimer);
    restCountdownTimer = null;
  }
  if (resetMedia) resetRestWorkoutMedia();
  if (resetState) {
    restNextExerciseIndex = -1;
    restNextSeriesIndex = 0;
    restSecondsLeft = 0;
  }
};

const formatExerciseNameForDisplay = (rawName = '') => {
  const normalized = String(rawName || '').trim();
  if (!normalized) return 'Exercício';
  const match = normalized.match(/^(.*?)(\s*\(.*\))$/);
  if (!match) return normalized;
  const mainPart = String(match[1] || '').trim();
  const parentheticalPart = String(match[2] || '').trim();
  if (!mainPart || !parentheticalPart) return normalized;
  return `${mainPart}\n${parentheticalPart}`;
};

const renderRestWorkoutView = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length || restNextExerciseIndex < 0) return;

  restNextExerciseIndex = Math.max(0, Math.min(workout.exercises.length - 1, restNextExerciseIndex));
  const nextExercise = workout.exercises[restNextExerciseIndex];
  const nextSeriesTotal = getRunExerciseSeriesCount(nextExercise);
  restNextSeriesIndex = Math.max(0, Math.min(nextSeriesTotal - 1, Number(restNextSeriesIndex) || 0));
  const detail = getExerciseDetailConfig(nextExercise);
  const nextMediaSignature = getWorkoutMediaSignature(nextExercise, detail.figure);
  if (nextMediaSignature !== restWorkoutMediaSignature) {
    syncRestWorkoutMedia(nextExercise, detail.figure);
    restWorkoutMediaSignature = nextMediaSignature;
  }

  if (restNextCounter) {
    restNextCounter.textContent =
      `EX ${restNextExerciseIndex + 1}/${workout.exercises.length} • ` +
      `SÉRIE ${restNextSeriesIndex + 1}/${nextSeriesTotal}`;
  }

  if (restNextName) {
    const nextName = String((nextExercise && nextExercise.name) || '').trim();
    restNextName.textContent = nextName || 'Exercício';
  }

  if (restNextReps) {
    const reps = Math.max(
      0,
      Number(
        nextExercise && (
          nextExercise.repetitions !== undefined
            ? nextExercise.repetitions
            : nextExercise.reps
        )
      ) || 0
    );
    restNextReps.textContent = `x ${reps}`;
  }

  if (restClock) {
    restClock.textContent = formatRunSecondsClock(restSecondsLeft);
  }
};

const skipRestToNextExercise = () => {
  if (restNextExerciseIndex < 0) return;
  const nextIndex = restNextExerciseIndex;
  const nextSeriesIndex = restNextSeriesIndex;
  clearRestCountdown({ resetMedia: false, resetState: false });
  openRunWorkoutView(nextIndex, { seriesIndex: nextSeriesIndex, resetTime: true });
};

const startRestCountdown = () => {
  clearRestCountdown({ resetMedia: false, resetState: false });
  restCountdownTimer = window.setInterval(() => {
    restSecondsLeft -= 1;
    if (restSecondsLeft <= 0) {
      restSecondsLeft = 0;
      renderRestWorkoutView();
      skipRestToNextExercise();
      return;
    }
    renderRestWorkoutView();
  }, 1000);
};

const openRestBetweenExercises = (fromExerciseIndex, nextExerciseIndex, { nextSeriesIndex = 0 } = {}) => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  if (nextExerciseIndex < 0 || nextExerciseIndex >= workout.exercises.length) return;

  const currentExercise = workout.exercises[Math.max(0, Math.min(workout.exercises.length - 1, fromExerciseIndex))];
  const nextExercise = workout.exercises[nextExerciseIndex];

  restNextExerciseIndex = nextExerciseIndex;
  restNextSeriesIndex = Math.max(0, Number(nextSeriesIndex) || 0);
  restSecondsLeft = getExerciseRestDurationSeconds(currentExercise, nextExercise);
  setStudentDirectPanel('treino-descanso', 'treinos');
  renderRestWorkoutView();
  startRestCountdown();
};

const formatSecondsClock = (seconds) => {
  const safe = Math.max(10, Math.min(180, seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const formatRunSecondsClock = (seconds) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const getRunExerciseDurationSeconds = (exercise) => {
  const detail = getExerciseDetailConfig(exercise);
  return Math.max(10, Math.min(180, Number(detail && detail.duration) || 60));
};

const getRunExerciseSeriesCount = (exerciseLike) => {
  const rawSeries = Number(
    exerciseLike && (
      exerciseLike.seriesCount !== undefined
        ? exerciseLike.seriesCount
        : exerciseLike.series !== undefined
          ? exerciseLike.series
          : exerciseLike.series_count
    )
  );
  return Math.max(1, Math.round(rawSeries) || 1);
};

const clearPrepCountdown = ({ resetMedia = true } = {}) => {
  if (prepCountdownTimer) {
    window.clearInterval(prepCountdownTimer);
    prepCountdownTimer = null;
  }
  if (resetMedia) {
    resetPrepWorkoutMedia();
  }
};

const clearRunCountdown = ({ resetMedia = true } = {}) => {
  if (runCountdownTimer) {
    window.clearInterval(runCountdownTimer);
    runCountdownTimer = null;
  }
  if (resetMedia) {
    resetRunWorkoutMedia();
  }
};

const setRunHelpModalOpen = (isOpen = false) => {
  if (!runHelpModal) return;
  runHelpModal.hidden = !isOpen;
};

const renderPrepCountdown = () => {
  if (prepSeconds) prepSeconds.textContent = String(prepSecondsLeft);
  if (prepRing) {
    const pct = Math.max(0, Math.min(100, (prepSecondsLeft / 20) * 100));
    prepRing.style.setProperty('--prep-progress', `${pct}%`);
  }
};

const getNextExerciseIndex = (workout) => {
  if (!workout || !workout.exercises.length) return 0;
  const pendingIndex = getNextPendingWorkoutExerciseIndex(workout);
  return pendingIndex >= 0 ? pendingIndex : 0;
};

const hasExerciseVideoMedia = (exercise) => {
  const media = resolveExerciseMedia(exercise);
  const videoUrl = String(media && (media.videoUrl || (media.mediaType === 'video' ? media.mediaUrl : '')) || '').trim();
  return Boolean(videoUrl);
};

const getPrepPreviewExercise = (workout, targetExerciseIndex) => {
  if (!workout || !Array.isArray(workout.exercises) || !workout.exercises.length) return null;
  const safeIndex = Math.max(0, Math.min(workout.exercises.length - 1, Number(targetExerciseIndex) || 0));
  const targetExercise = workout.exercises[safeIndex] || null;
  if (targetExercise && hasExerciseVideoMedia(targetExercise)) return targetExercise;

  const firstExerciseWithVideo = workout.exercises.find((exercise) => hasExerciseVideoMedia(exercise));
  return firstExerciseWithVideo || targetExercise;
};

function refreshPrepVideoForCurrentTheme() {
  const prepPanel = document.querySelector('[data-student-app-panel="pre-treino"]');
  const isPrepActive = Boolean(
    (prepPanel && prepPanel.classList.contains('is-active')) ||
    currentStudentPanel === 'pre-treino'
  );
  if (!isPrepActive) return;

  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !Array.isArray(workout.exercises) || !workout.exercises.length) return;

  const safeIndex = Math.max(0, Math.min(workout.exercises.length - 1, Number(prepExerciseIndex) || 0));
  const exercise = workout.exercises[safeIndex] || workout.exercises[0];
  const previewExercise = getPrepPreviewExercise(workout, safeIndex) || exercise;
  if (!previewExercise) return;

  const detail = getExerciseDetailConfig(previewExercise);
  syncPrepWorkoutMedia(previewExercise, detail.figure);
}

const finishPrepAndOpenExercise = () => {
  clearPrepCountdown();
  openRunWorkoutView(prepExerciseIndex);
};

const startPrepCountdown = () => {
  clearPrepCountdown({ resetMedia: false });
  prepSecondsLeft = 20;
  renderPrepCountdown();
  prepCountdownTimer = window.setInterval(() => {
    prepSecondsLeft -= 1;
    if (prepSecondsLeft <= 0) {
      prepSecondsLeft = 0;
      renderPrepCountdown();
      finishPrepAndOpenExercise();
      return;
    }
    renderPrepCountdown();
  }, 1000);
};

const openPrepWorkoutView = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  prepExerciseIndex = getNextExerciseIndex(workout);
  const exercise = workout.exercises[prepExerciseIndex];
  const previewExercise = getPrepPreviewExercise(workout, prepExerciseIndex) || exercise;
  const detail = getExerciseDetailConfig(previewExercise);
  syncPrepWorkoutMedia(previewExercise, detail.figure);
  if (prepExerciseName) prepExerciseName.textContent = formatExerciseNameForDisplay(exercise.name);
  setStudentDirectPanel('pre-treino', 'treinos');
  startPrepCountdown();
};

const markRunExerciseAsDone = (index) => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  const checks = ensureWorkoutCheckState(workout);
  if (index >= 0 && index < checks.length) {
    checks[index] = true;
    removeDeferredWorkoutExercise(workout, index);
  }
};

const deferCurrentRunExerciseBecauseEquipmentIsBusy = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return false;

  runExerciseIndex = Math.max(0, Math.min(workout.exercises.length - 1, runExerciseIndex));
  const checks = ensureWorkoutCheckState(workout);
  if (checks[runExerciseIndex]) return false;

  deferWorkoutExercise(workout, runExerciseIndex);
  const nextExerciseIndex = getNextPendingWorkoutExerciseIndex(workout, {
    excludeIndex: runExerciseIndex
  });

  if (nextExerciseIndex < 0) {
    removeDeferredWorkoutExercise(workout, runExerciseIndex);
    if (runEquipmentBusyCheckbox) runEquipmentBusyCheckbox.checked = false;
    showSiteTopNotice('Não existe outro exercício pendente para avançar agora.', false, { durationMs: 2200 });
    return false;
  }

  if (runEquipmentBusyCheckbox) runEquipmentBusyCheckbox.checked = false;
  showSiteTopNotice('Exercício adiado. Seguindo para o próximo da sequência.', true, { durationMs: 2200 });
  openRunWorkoutView(nextExerciseIndex, { resetTime: true, seriesIndex: 0 });
  return true;
};

const confirmRunExerciseSkipBecauseEquipmentIsBusy = async () => {
  const confirmed = await requestSiteConfirm({
    title: 'Equipamento ocupado',
    identification: 'Treino em execução',
    message: 'Pular esse exercício por enquanto?',
    confirmLabel: 'Pular',
    cancelLabel: 'Cancelar',
    triggerButton: runEquipmentBusyCheckbox
  });
  if (!confirmed && runEquipmentBusyCheckbox) runEquipmentBusyCheckbox.checked = false;
  return confirmed;
};

const renderRunWorkoutView = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  runExerciseIndex = Math.max(0, Math.min(workout.exercises.length - 1, runExerciseIndex));
  const exercise = workout.exercises[runExerciseIndex];
  const seriesTotal = getRunExerciseSeriesCount(exercise);
  runExerciseSeriesIndex = Math.max(0, Math.min(seriesTotal - 1, Number(runExerciseSeriesIndex) || 0));
  const detail = getExerciseDetailConfig(exercise);
  const nextMediaSignature = getWorkoutMediaSignature(exercise, detail.figure);
  if (nextMediaSignature !== runWorkoutMediaSignature) {
    syncRunWorkoutMedia(exercise, detail.figure);
    runWorkoutMediaSignature = nextMediaSignature;
  }
  if (runExerciseName) runExerciseName.textContent = formatExerciseNameForDisplay(exercise.name);
  if (runHelpToggle) {
    runHelpToggle.setAttribute('aria-label', `Ver instruções de ${exercise.name}`);
  }
  if (runHelpText) {
    const instructionText = String(detail.instructions || detail.description || '').trim();
    runHelpText.textContent = instructionText || 'Sem instruções para este exercício.';
  }
  if (runClock) runClock.textContent = formatRunSecondsClock(runSecondsLeft);
  if (runCounter) {
    runCounter.textContent =
      `EX ${runExerciseIndex + 1}/${workout.exercises.length} • ` +
      `SÉRIE ${runExerciseSeriesIndex + 1}/${seriesTotal}`;
  }
  if (runEquipmentBusyCheckbox) {
    runEquipmentBusyCheckbox.checked = false;
  }
  if (runPauseButton) {
    runPauseButton.innerHTML = runTimerPaused
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 6 10 6-10 6z"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6h2v12h-2zM14 6h2v12h-2z"></path></svg>';
    runPauseButton.classList.toggle('is-paused', runTimerPaused);
    runPauseButton.setAttribute('aria-label', runTimerPaused ? 'Retomar' : 'Pausar');
  }
};

const goToRunExercise = (index, { resetTime = true, seriesIndex = 0 } = {}) => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return false;
  if (index < 0 || index >= workout.exercises.length) return false;
  runExerciseIndex = index;
  const seriesTotal = getRunExerciseSeriesCount(workout.exercises[runExerciseIndex]);
  runExerciseSeriesIndex = Math.max(0, Math.min(seriesTotal - 1, Number(seriesIndex) || 0));
  if (resetTime) runSecondsLeft = getRunExerciseDurationSeconds(workout.exercises[runExerciseIndex]);
  runTimerPaused = false;
  renderRunWorkoutView();
  return true;
};

const startRunCountdown = () => {
  clearRunCountdown({ resetMedia: false });
  runCountdownTimer = window.setInterval(() => {
    if (runTimerPaused) return;
    runSecondsLeft -= 1;
    if (runSecondsLeft <= 0) {
      runSecondsLeft = 0;
      runTimerPaused = true;
      renderRunWorkoutView();
      return;
    }
    renderRunWorkoutView();
  }, 1000);
};

const openRunWorkoutView = (exerciseIndex = 0, { seriesIndex = 0, resetTime = true } = {}) => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  runExerciseIndex = Math.max(0, Math.min(workout.exercises.length - 1, exerciseIndex));
  const seriesTotal = getRunExerciseSeriesCount(workout.exercises[runExerciseIndex]);
  runExerciseSeriesIndex = Math.max(0, Math.min(seriesTotal - 1, Number(seriesIndex) || 0));
  if (resetTime) runSecondsLeft = getRunExerciseDurationSeconds(workout.exercises[runExerciseIndex]);
  runTimerPaused = false;
  setRunHelpModalOpen(false);
  setStudentDirectPanel('treino-execucao', 'treinos');
  renderRunWorkoutView();
  startRunCountdown();
};

const advanceRunAfterCurrentSeries = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  runExerciseIndex = Math.max(0, Math.min(workout.exercises.length - 1, runExerciseIndex));
  const currentExercise = workout.exercises[runExerciseIndex];
  const seriesTotal = getRunExerciseSeriesCount(currentExercise);
  runExerciseSeriesIndex = Math.max(0, Math.min(seriesTotal - 1, Number(runExerciseSeriesIndex) || 0));

  const isLastSeries = runExerciseSeriesIndex >= seriesTotal - 1;
  if (!isLastSeries) {
    openRestBetweenExercises(runExerciseIndex, runExerciseIndex, {
      nextSeriesIndex: runExerciseSeriesIndex + 1
    });
    return;
  }

  markRunExerciseAsDone(runExerciseIndex);
  const nextExerciseIndex = getNextPendingWorkoutExerciseIndex(workout);
  if (nextExerciseIndex >= 0) {
    openRestBetweenExercises(runExerciseIndex, nextExerciseIndex, { nextSeriesIndex: 0 });
    return;
  }

  clearRunCountdown();
  renderActiveWorkout();
  setStudentDirectPanel('treino-ativo', 'treinos');
};

const renderExerciseDetailView = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  const maxIndex = workout.exercises.length - 1;
  activeExerciseDetailIndex = Math.max(0, Math.min(maxIndex, activeExerciseDetailIndex));
  const exercise = workout.exercises[activeExerciseDetailIndex];
  if (!exercise) return;

  const detail = getExerciseDetailConfig(exercise);
  if (exerciseDetailTitle) {
    exerciseDetailTitle.textContent = String(exercise.name || 'Exercício').trim();
  }
  syncExerciseDetailMedia(exercise, detail.figure);
  activeExerciseDetailContent = {
    description: detail.description,
    instructions: detail.instructions
  };
  renderExerciseDetailContent();
  if (exerciseDetailCounter) exerciseDetailCounter.textContent = `${activeExerciseDetailIndex + 1}/${workout.exercises.length}`;
  if (exerciseDetailDuration) exerciseDetailDuration.textContent = formatSecondsClock(activeExerciseDetailSeconds);
};

const openExerciseDetailFromActiveWorkout = (index) => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !workout.exercises.length) return;
  activeExerciseDetailIndex = Math.max(0, Math.min(workout.exercises.length - 1, index));
  const detail = getExerciseDetailConfig(workout.exercises[activeExerciseDetailIndex]);
  activeExerciseDetailSeconds = detail.duration;
  activeExerciseDetailTab = 'description';
  renderExerciseDetailView();
  setStudentDirectPanel('exercicio-detalhe', 'treinos');
};

const closeExerciseDetailView = () => {
  setStudentDirectPanel('treino-ativo', 'treinos');
};

const renderActiveWorkout = () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
  if (!workout || !activeWorkoutExercises) return;
  const checks = ensureWorkoutCheckState(workout);
  const doneCount = checks.filter(Boolean).length;
  const totalCount = workout.exercises.length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const workoutDisplayName = getStudentWorkoutDisplayName(workout);
  if (activeWorkoutTitle) activeWorkoutTitle.textContent = workoutDisplayName;
  if (activeWorkoutSubtitle) activeWorkoutSubtitle.textContent = String(workout.day || '').trim();
  if (activeWorkoutDuration) activeWorkoutDuration.textContent = workout.duration;
  if (activeWorkoutExercisesTotal) activeWorkoutExercisesTotal.textContent = String(totalCount);
  if (activeWorkoutProgressLabel) activeWorkoutProgressLabel.textContent = `${progressPct}% concluído`;
  if (activeWorkoutProgressFill) activeWorkoutProgressFill.style.width = `${progressPct}%`;
  if (activeWorkoutHero) {
    const heroUrl = getWorkoutHero(workout);
    activeWorkoutHero.style.setProperty('--active-workout-hero', `url("${heroUrl}")`);
    activeWorkoutHero.classList.toggle('is-svg-hero', /\.svg($|\?)/i.test(heroUrl));
  }

  activeWorkoutExercises.innerHTML = workout.exercises
    .map((exercise, index) => {
      const loadInfo = getExerciseLoadPresentation(exercise);
      return `
        <article class="student-active-exercise-card" data-student-active-open-detail="${index}">
          <div class="student-active-exercise-thumb" aria-hidden="true">
            <span class="student-active-thumb-lines">=</span>
          </div>
          <div class="student-active-exercise-copy">
            <h5>${exercise.name}</h5>
            <small>${exercise.series} séries • ${exercise.reps} reps • ${loadInfo.summary}</small>
          </div>
          <button class="student-active-exercise-check${checks[index] ? ' is-done' : ''}${checks[index] && activeCheckPulseIndex === index ? ' is-animating' : ''}" type="button" data-student-active-check="${index}" aria-label="Marcar ${exercise.name}">
            <span class="student-active-check-id" aria-hidden="true">
              <svg class="student-active-check-icon" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </span>
          </button>
          <div class="student-active-exercise-metrics">
            <div>
              <small>Séries</small>
              <strong>${exercise.series}</strong>
            </div>
            <div>
              <small>Repetições</small>
              <strong>${exercise.reps}</strong>
            </div>
            <div>
              <small>${loadInfo.metricLabel}</small>
              <strong>${loadInfo.metricValue}</strong>
            </div>
          </div>
        </article>
      `
    })
    .join('');

  activeWorkoutExercises.querySelectorAll('[data-student-active-check]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const index = Number(button.getAttribute('data-student-active-check'));
      if (!Number.isInteger(index) || index < 0 || index >= checks.length) return;
      checks[index] = !checks[index];
      if (checks[index]) {
        removeDeferredWorkoutExercise(workout, index);
      }
      activeCheckPulseIndex = checks[index] ? index : -1;
      renderActiveWorkout();
    });
  });

  if (activeCheckPulseIndex >= 0) {
    window.setTimeout(() => {
      activeCheckPulseIndex = -1;
    }, 0);
  }

  activeWorkoutExercises.querySelectorAll('[data-student-active-open-detail]').forEach((card) => {
    card.addEventListener('click', () => {
      const index = Number(card.getAttribute('data-student-active-open-detail'));
      if (!Number.isInteger(index)) return;
      openExerciseDetailFromActiveWorkout(index);
    });
  });

  if (activeWorkoutFinishButton) {
    activeWorkoutFinishButton.disabled = workout.done;
    const btnLabel = activeWorkoutFinishButton.querySelector('span');
    if (btnLabel) {
      if (workout.done) btnLabel.textContent = 'Treino concluído';
      else if (progressPct <= 0) btnLabel.textContent = 'Iniciar treino';
      else if (progressPct < 100) btnLabel.textContent = 'Continuar treino';
      else btnLabel.textContent = 'Concluir treino';
    }
  }
};

const renderWorkoutList = () => {
  if (!workoutList) return;

  const visibleWorkouts = getVisibleStudentWorkouts();
  const total = visibleWorkouts.length;
  const done = visibleWorkouts.filter((workout) => workout.done).length;
  if (workoutProgress) {
    workoutProgress.innerHTML = `<span class="student-workout-progress-num">${done}</span> de <span class="student-workout-progress-num">${total}</span> concluídos`;
  }

  workoutList.innerHTML = '';

  if (!visibleWorkouts.length) {
    workoutList.innerHTML = '<p class="student-workout-empty">Nenhum treino definido pelo instrutor para os dias selecionados.</p>';
    if (workoutsStartButton) {
      workoutsStartButton.disabled = true;
      const emptyLabel = workoutsStartButton.querySelector('span');
      if (emptyLabel) emptyLabel.textContent = 'Iniciar treino';
    }
    return;
  }

  if (!visibleWorkouts.some((workout) => workout.id === selectedWorkoutId)) {
    selectedWorkoutId = visibleWorkouts[0].id;
  }

  visibleWorkouts.forEach((w, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `student-workout-item is-entering${selectedWorkoutId === w.id ? ' is-active' : ''}`;
    btn.style.animationDelay = `${index * 40}ms`;
    const displayName = String(w._displayName || w.name || w.code || 'Treino').trim();
    const dayLabel = String(w._visibleDayLabel || w.day || 'Plano ativo').trim();
    btn.innerHTML = `
      <div class="student-workout-item-head">
        <strong>${displayName}</strong>
        <span class="student-workout-badge ${w.done ? 'is-done' : 'is-pending'}">${w.done ? 'FEITO' : 'NÃO FEITO'}</span>
      </div>
      <p>${dayLabel} • ${w.duration}</p>
    `;

    btn.addEventListener('click', () => {
      selectedWorkoutId = w.id;
      renderWorkoutList();
      renderWorkoutDetail();
    });

    workoutList.appendChild(btn);
  });

  if (workoutsStartButton) {
    const selected = visibleWorkouts.find((item) => item.id === selectedWorkoutId);
    workoutsStartButton.disabled = !selected;
    const label = workoutsStartButton.querySelector('span');
    if (label) {
      const selectedName = selected
        ? String(selected._displayName || selected.name || selected.code || 'Treino').trim()
        : '';
      label.textContent = selected ? `Iniciar treino (${selectedName})` : 'Iniciar treino';
    }
  }
};

const renderBarChart = (container, items) => {
  if (!container) return;
  const max = Math.max(...items.map((i) => i.value), 1);
  container.innerHTML = '';
  items.forEach((item) => {
    const pct = Math.max(10, Math.round((item.value / max) * 100));
    const row = document.createElement('div');
    row.className = 'student-chart-row';
    row.innerHTML = `<div class="student-chart-row-head"><span>${item.label}</span><span>${item.value}</span></div><div class="student-chart-bar" style="--bar-size:${pct}%"><span></span></div>`;
    container.appendChild(row);
  });
  window.setTimeout(() => {
    container.querySelectorAll('.student-chart-bar').forEach((bar) => bar.classList.add('is-animated'));
  }, 80);
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDurationMinutes = (value) => {
  const match = String(value || '').match(/\d+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));
const kgToLbs = (kg) => kg * 2.20462;
const lbsToKg = (lbs) => lbs / 2.20462;
const cmToFt = (cm) => cm / 30.48;
const ftToCm = (ft) => ft * 30.48;

const formatMinutesClock = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const monthShortFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

const formatDayMonthLabel = (date) => {
  const monthText = monthShortFormatter.format(date).toLowerCase();
  return `${date.getDate()} de ${monthText}`;
};

const buildProgressHistoryRecords = () => {
  return loadStudentWorkoutHistory()
    .map((record, index) => {
      const date = new Date(record.completedAt);
      if (Number.isNaN(date.getTime())) return null;
      const groupKey = normalizeLibraryGroupKey(record.group || record.groupKey, '');
      const rawThumbnail = String(record.thumbnail || record.thumbnailUrl || '').trim();
      const thumbnail = rawThumbnail
        ? /^(https?:|data:|blob:|\/uploads\/|uploads\/)/i.test(rawThumbnail)
          ? resolveApiMediaUrl(rawThumbnail)
          : rawThumbnail
        : getLibraryGroupImageSrc(groupKey) || 'aba de img/nova logo.png';
      return {
        id: String(record.id || `${record.workoutId || 'workout'}-${index}`),
        workoutId: Number(record.workoutId) || 0,
        date,
        title: String(record.title || 'Treino').trim() || 'Treino',
        durationMinutes: Math.max(1, Math.round(Number(record.durationMinutes) || 0)),
        kcal: Math.max(0, Number(record.kcal) || 0),
        thumbnail,
        group: groupKey
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const getCalendarCells = (cursor) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const leading = firstDay.getDay();
  const cells = [];

  for (let index = leading; index > 0; index -= 1) {
    const day = prevMonthDays - index + 1;
    const date = new Date(year, month - 1, day);
    cells.push({ date, outside: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }

  while (cells.length % 7 !== 0 || cells.length < 35) {
    const nextDay = cells.length - (leading + daysInMonth) + 1;
    const date = new Date(year, month + 1, nextDay);
    cells.push({ date, outside: true });
  }

  return cells;
};

const getWeekRange = (selectedDate) => {
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const renderProgressHistorySheet = () => {
  if (!progressHistorySheet || !progressHistoryCalendar) return;

  const records = buildProgressHistoryRecords();
  const selectedDate = progressHistorySelectedDateKey
    ? new Date(`${progressHistorySelectedDateKey}T00:00:00`)
    : new Date();
  const selectedKey = formatDateKey(selectedDate);
  const dayWithRecord = new Set(records.map((record) => formatDateKey(record.date)));
  const monthLabel = `${progressHistoryMonthCursor.getFullYear()}/${String(progressHistoryMonthCursor.getMonth() + 1).padStart(2, '0')}`;
  if (progressHistoryMonth) progressHistoryMonth.textContent = monthLabel;

  const calendarCells = getCalendarCells(progressHistoryMonthCursor);
  progressHistoryCalendar.innerHTML = '';
  calendarCells.forEach((cell) => {
    const cellKey = formatDateKey(cell.date);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(cell.date.getDate());
    button.classList.toggle('is-outside', cell.outside);
    button.classList.toggle('is-selected', cellKey === selectedKey);
    button.classList.toggle('has-record', dayWithRecord.has(cellKey));
    button.addEventListener('click', () => {
      progressHistorySelectedDateKey = cellKey;
      progressHistoryMonthCursor = new Date(cell.date.getFullYear(), cell.date.getMonth(), 1);
      renderProgressHistorySheet();
    });
    progressHistoryCalendar.appendChild(button);
  });

  const week = getWeekRange(selectedDate);
  const weekRecords = records.filter((record) => record.date >= week.start && record.date <= week.end);
  const totalMinutes = weekRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const totalKcal = weekRecords.reduce((sum, record) => sum + record.kcal, 0);
  const rangeText = `${formatDayMonthLabel(week.start)} - ${formatDayMonthLabel(week.end)}`;
  if (progressHistoryRange) progressHistoryRange.textContent = rangeText;
  if (progressHistoryTotalTime) progressHistoryTotalTime.textContent = formatMinutesClock(totalMinutes);
  if (progressHistoryTotalKcal) progressHistoryTotalKcal.textContent = totalKcal.toFixed(1);
  if (progressHistoryCount) progressHistoryCount.textContent = `${weekRecords.length} ${weekRecords.length === 1 ? 'treino' : 'treinos'}`;

  if (progressHistoryList) {
    if (!weekRecords.length) {
      progressHistoryList.innerHTML = '<div class="student-progress-history-empty">Nenhum treino registrado nesta semana.</div>';
    } else {
      progressHistoryList.innerHTML = weekRecords
        .map((record) => {
          const timeStamp = `${formatDayMonthLabel(record.date)}, ${record.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          return `
            <article class="student-progress-history-item">
              <img src="${record.thumbnail}" alt="" loading="lazy" />
              <div class="student-progress-history-item-body">
                <small>${timeStamp}</small>
                <strong>${record.title}</strong>
                <div class="student-progress-history-item-metas">
                  <span>⏱ ${formatMinutesClock(record.durationMinutes)}</span>
                  <span>🔥 ${record.kcal.toFixed(1)} kcal</span>
                </div>
              </div>
            </article>
          `;
        })
        .join('');
    }
  }
};

const openProgressHistorySheet = () => {
  if (!progressHistorySheet) return;
  const today = new Date();
  progressHistorySelectedDateKey = formatDateKey(today);
  progressHistoryMonthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  renderProgressHistorySheet();
  progressHistorySheet.hidden = false;
};

const closeProgressHistorySheet = () => {
  if (!progressHistorySheet) return;
  progressHistorySheet.hidden = true;
};

const WEIGHT_RULER_MIN_KG = 40;
const WEIGHT_RULER_MAX_KG = 180;
const WEIGHT_RULER_STEP_KG = 0.1;

const getCurrentWeightKg = () => {
  const weightValues = studentData.progress.weight
    .map((item) => Number(item.value))
    .filter((value) => Number.isFinite(value));
  if (!weightValues.length) return 80;
  return Number(weightValues[weightValues.length - 1]);
};

const setWeightRulerPadding = () => {
  if (!progressWeightRuler) return;
  const track = progressWeightRuler.querySelector('.student-progress-weight-ruler-track');
  if (!track) return;
  track.style.setProperty('--side-pad', `${progressWeightRuler.clientWidth / 2}px`);
};

const renderWeightLiveValue = () => {
  if (!progressWeightLiveValue || !progressWeightLiveUnit) return;
  progressWeightLiveValue.textContent = progressWeightDraftKg.toFixed(1);
  progressWeightLiveUnit.textContent = 'kg';
};

const getRulerIndexFromKg = (kg) => {
  const clamped = clampNumber(kg, WEIGHT_RULER_MIN_KG, WEIGHT_RULER_MAX_KG);
  return Math.round((clamped - WEIGHT_RULER_MIN_KG) / WEIGHT_RULER_STEP_KG);
};

const getKgFromRulerIndex = (index) => {
  const maxIndex = Math.round((WEIGHT_RULER_MAX_KG - WEIGHT_RULER_MIN_KG) / WEIGHT_RULER_STEP_KG);
  const safeIndex = clampNumber(index, 0, maxIndex);
  return Number((WEIGHT_RULER_MIN_KG + safeIndex * WEIGHT_RULER_STEP_KG).toFixed(1));
};

const scrollWeightRulerToKg = (kg, behavior = 'auto') => {
  if (!progressWeightRuler) return;
  const index = getRulerIndexFromKg(kg);
  const left = index * progressWeightRulerTickSpacing;
  progressWeightRuler.scrollTo({ left, behavior });
};

const buildWeightRuler = () => {
  if (!progressWeightRuler || progressWeightRulerBuilt) return;
  const track = document.createElement('div');
  track.className = 'student-progress-weight-ruler-track';
  const totalTicks = Math.round((WEIGHT_RULER_MAX_KG - WEIGHT_RULER_MIN_KG) / WEIGHT_RULER_STEP_KG);
  const fragment = document.createDocumentFragment();

  for (let index = 0; index <= totalTicks; index += 1) {
    const value = WEIGHT_RULER_MIN_KG + index * WEIGHT_RULER_STEP_KG;
    const tick = document.createElement('div');
    tick.className = 'student-progress-weight-ruler-tick';

    if (index % 10 === 0) {
      tick.classList.add('is-major');
      const label = document.createElement('span');
      label.textContent = String(Math.round(value));
      tick.appendChild(label);
    } else if (index % 5 === 0) {
      tick.classList.add('is-mid');
    }

    fragment.appendChild(tick);
  }

  track.appendChild(fragment);
  progressWeightRuler.innerHTML = '';
  progressWeightRuler.appendChild(track);
  progressWeightRulerBuilt = true;
  setWeightRulerPadding();
  progressWeightRulerTickSpacing = Number.parseFloat(getComputedStyle(track).getPropertyValue('--tick-space')) || 8;

  progressWeightRuler.addEventListener('scroll', () => {
    const index = Math.round(progressWeightRuler.scrollLeft / progressWeightRulerTickSpacing);
    progressWeightDraftKg = getKgFromRulerIndex(index);
    renderWeightLiveValue();
  });
};

const openWeightModal = () => {
  if (!progressWeightModal) return;
  closeBmiModal();
  buildWeightRuler();
  progressWeightDraftKg = getCurrentWeightKg();
  renderWeightLiveValue();

  if (progressWeightDate) {
    progressWeightDate.textContent = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date());
  }

  progressWeightModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-weight-modal-open');
  requestAnimationFrame(() => {
    setWeightRulerPadding();
    scrollWeightRulerToKg(progressWeightDraftKg, 'auto');
  });
};

const closeWeightModal = () => {
  if (!progressWeightModal) return;
  progressWeightModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-weight-modal-open');
};

const saveWeightFromModal = () => {
  const normalizedKg = clampNumber(progressWeightDraftKg, WEIGHT_RULER_MIN_KG, WEIGHT_RULER_MAX_KG);
  const safeWeightKg = Number(normalizedKg.toFixed(1));
  if (Array.isArray(studentData.progress.weight) && studentData.progress.weight.length) {
    studentData.progress.weight[studentData.progress.weight.length - 1].value = safeWeightKg;
  } else {
    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date()).replace('.', '');
    studentData.progress.weight = [{ label: monthLabel, value: safeWeightKg }];
  }
  renderProgress();
  closeWeightModal();
  void persistStudentBodyMetrics({
    weightKg: safeWeightKg,
    silent: false
  });
};

const BMI_MODAL_WEIGHT_MIN_KG = 40;
const BMI_MODAL_WEIGHT_MAX_KG = 180;
const BMI_MODAL_WEIGHT_STEP = 0.1;
const BMI_MODAL_HEIGHT_MIN_CM = 130;
const BMI_MODAL_HEIGHT_MAX_CM = 220;
const BMI_MODAL_HEIGHT_STEP = 1;

const getCurrentHeightCm = () => {
  const raw = Number(studentData.progress.heightCm);
  if (!Number.isFinite(raw)) return 170;
  return clampNumber(raw, BMI_MODAL_HEIGHT_MIN_CM, BMI_MODAL_HEIGHT_MAX_CM);
};

const setBmiRulerPadding = (container) => {
  if (!container) return;
  const track = container.querySelector('.student-progress-bmi-ruler-track');
  if (!track) return;
  track.style.setProperty('--side-pad', `${container.clientWidth / 2}px`);
};

const updateBmiWeightLive = () => {
  if (!progressBmiLiveWeight || !progressBmiLiveWeightUnit) return;
  progressBmiWeightUnit = 'kg';
  progressBmiLiveWeight.textContent = progressBmiDraftWeightKg.toFixed(1);
  progressBmiLiveWeightUnit.textContent = 'kg';
  progressBmiWeightUnitButtons.forEach((button) => {
    const active = button.dataset.progressBmiWeightUnit === 'kg';
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
};

const updateBmiHeightLive = () => {
  if (!progressBmiLiveHeight || !progressBmiLiveHeightUnit) return;
  progressBmiHeightUnit = 'cm';
  progressBmiLiveHeight.textContent = progressBmiDraftHeightCm.toFixed(0);
  progressBmiLiveHeightUnit.textContent = 'cm';
  progressBmiHeightUnitButtons.forEach((button) => {
    const active = button.dataset.progressBmiHeightUnit === 'cm';
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
};

const buildBmiWeightRuler = () => {
  if (!progressBmiWeightRuler || progressBmiWeightRulerBuilt) return;
  const track = document.createElement('div');
  track.className = 'student-progress-bmi-ruler-track';
  const totalTicks = Math.round((BMI_MODAL_WEIGHT_MAX_KG - BMI_MODAL_WEIGHT_MIN_KG) / BMI_MODAL_WEIGHT_STEP);
  const fragment = document.createDocumentFragment();

  for (let index = 0; index <= totalTicks; index += 1) {
    const value = BMI_MODAL_WEIGHT_MIN_KG + index * BMI_MODAL_WEIGHT_STEP;
    const tick = document.createElement('div');
    tick.className = 'student-progress-bmi-ruler-tick';
    if (index % 10 === 0) {
      tick.classList.add('is-major');
      const label = document.createElement('span');
      label.textContent = String(Math.round(value));
      tick.appendChild(label);
    } else if (index % 5 === 0) {
      tick.classList.add('is-mid');
    }
    fragment.appendChild(tick);
  }

  track.appendChild(fragment);
  progressBmiWeightRuler.innerHTML = '';
  progressBmiWeightRuler.appendChild(track);
  progressBmiWeightRulerBuilt = true;
  setBmiRulerPadding(progressBmiWeightRuler);
  progressBmiWeightRulerTickSpacing = Number.parseFloat(getComputedStyle(track).getPropertyValue('--tick-space')) || 6;

  progressBmiWeightRuler.addEventListener('scroll', () => {
    const index = Math.round(progressBmiWeightRuler.scrollLeft / progressBmiWeightRulerTickSpacing);
    const maxIndex = Math.round((BMI_MODAL_WEIGHT_MAX_KG - BMI_MODAL_WEIGHT_MIN_KG) / BMI_MODAL_WEIGHT_STEP);
    const safeIndex = clampNumber(index, 0, maxIndex);
    progressBmiDraftWeightKg = Number((BMI_MODAL_WEIGHT_MIN_KG + safeIndex * BMI_MODAL_WEIGHT_STEP).toFixed(1));
    updateBmiWeightLive();
  });
};

const buildBmiHeightRuler = () => {
  if (!progressBmiHeightRuler || progressBmiHeightRulerBuilt) return;
  const track = document.createElement('div');
  track.className = 'student-progress-bmi-ruler-track';
  const totalTicks = Math.round((BMI_MODAL_HEIGHT_MAX_CM - BMI_MODAL_HEIGHT_MIN_CM) / BMI_MODAL_HEIGHT_STEP);
  const fragment = document.createDocumentFragment();

  for (let index = 0; index <= totalTicks; index += 1) {
    const value = BMI_MODAL_HEIGHT_MIN_CM + index * BMI_MODAL_HEIGHT_STEP;
    const tick = document.createElement('div');
    tick.className = 'student-progress-bmi-ruler-tick';
    if (index % 10 === 0) {
      tick.classList.add('is-major');
      const label = document.createElement('span');
      label.textContent = String(Math.round(value));
      tick.appendChild(label);
    } else if (index % 5 === 0) {
      tick.classList.add('is-mid');
    }
    fragment.appendChild(tick);
  }

  track.appendChild(fragment);
  progressBmiHeightRuler.innerHTML = '';
  progressBmiHeightRuler.appendChild(track);
  progressBmiHeightRulerBuilt = true;
  setBmiRulerPadding(progressBmiHeightRuler);
  progressBmiHeightRulerTickSpacing = Number.parseFloat(getComputedStyle(track).getPropertyValue('--tick-space')) || 6;

  progressBmiHeightRuler.addEventListener('scroll', () => {
    const index = Math.round(progressBmiHeightRuler.scrollLeft / progressBmiHeightRulerTickSpacing);
    const maxIndex = Math.round((BMI_MODAL_HEIGHT_MAX_CM - BMI_MODAL_HEIGHT_MIN_CM) / BMI_MODAL_HEIGHT_STEP);
    const safeIndex = clampNumber(index, 0, maxIndex);
    progressBmiDraftHeightCm = Number((BMI_MODAL_HEIGHT_MIN_CM + safeIndex * BMI_MODAL_HEIGHT_STEP).toFixed(0));
    updateBmiHeightLive();
  });
};

const scrollBmiWeightRulerToKg = (kg, behavior = 'auto') => {
  if (!progressBmiWeightRuler) return;
  const clamped = clampNumber(kg, BMI_MODAL_WEIGHT_MIN_KG, BMI_MODAL_WEIGHT_MAX_KG);
  const index = Math.round((clamped - BMI_MODAL_WEIGHT_MIN_KG) / BMI_MODAL_WEIGHT_STEP);
  progressBmiWeightRuler.scrollTo({ left: index * progressBmiWeightRulerTickSpacing, behavior });
};

const scrollBmiHeightRulerToCm = (cm, behavior = 'auto') => {
  if (!progressBmiHeightRuler) return;
  const clamped = clampNumber(cm, BMI_MODAL_HEIGHT_MIN_CM, BMI_MODAL_HEIGHT_MAX_CM);
  const index = Math.round((clamped - BMI_MODAL_HEIGHT_MIN_CM) / BMI_MODAL_HEIGHT_STEP);
  progressBmiHeightRuler.scrollTo({ left: index * progressBmiHeightRulerTickSpacing, behavior });
};

const openBmiModal = () => {
  if (!progressBmiModal) return;
  closeWeightModal();
  buildBmiWeightRuler();
  buildBmiHeightRuler();
  progressBmiDraftWeightKg = getCurrentWeightKg();
  progressBmiDraftHeightCm = getCurrentHeightCm();
  progressBmiWeightUnit = 'kg';
  progressBmiHeightUnit = 'cm';
  updateBmiWeightLive();
  updateBmiHeightLive();
  progressBmiModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-bmi-modal-open');
  const card = progressBmiModal.querySelector('.student-progress-bmi-modal-card');
  if (card) card.scrollTop = 0;
  requestAnimationFrame(() => {
    setBmiRulerPadding(progressBmiWeightRuler);
    setBmiRulerPadding(progressBmiHeightRuler);
    scrollBmiWeightRulerToKg(progressBmiDraftWeightKg, 'auto');
    scrollBmiHeightRulerToCm(progressBmiDraftHeightCm, 'auto');
  });
};

const closeBmiModal = () => {
  if (!progressBmiModal) return;
  progressBmiModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-bmi-modal-open');
};

const saveBmiFromModal = () => {
  const nextWeight = clampNumber(progressBmiDraftWeightKg, BMI_MODAL_WEIGHT_MIN_KG, BMI_MODAL_WEIGHT_MAX_KG);
  const nextHeight = clampNumber(progressBmiDraftHeightCm, BMI_MODAL_HEIGHT_MIN_CM, BMI_MODAL_HEIGHT_MAX_CM);
  const safeWeightKg = Number(nextWeight.toFixed(1));
  const safeHeightCm = Number(nextHeight.toFixed(0));
  if (Array.isArray(studentData.progress.weight) && studentData.progress.weight.length) {
    studentData.progress.weight[studentData.progress.weight.length - 1].value = safeWeightKg;
  }
  studentData.progress.heightCm = safeHeightCm;
  renderProgress();
  closeBmiModal();
  void persistStudentBodyMetrics({
    weightKg: safeWeightKg,
    heightCm: safeHeightCm,
    silent: false
  });
};

const formatProgressWeightValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0';
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
};

const renderProgress = () => {
  if (isTrainerManagerUser()) {
    renderTrainerProgressPanel();
    return;
  }

  if (studentProgressReport) studentProgressReport.hidden = false;
  if (trainerProgressReport) trainerProgressReport.hidden = true;

  const records = buildProgressHistoryRecords();
  const doneCount = records.length;
  const kcalCount = Number(records.reduce((sum, record) => sum + Number(record.kcal || 0), 0).toFixed(1));
  const minutesCount = records.reduce((sum, record) => sum + Math.max(0, Number(record.durationMinutes) || 0), 0);
  const { streakDays, recordDays } = getWorkoutHistoryDayStats(records);

  if (progressSummaryWorkouts) progressSummaryWorkouts.textContent = String(doneCount);
  if (progressSummaryKcal) progressSummaryKcal.textContent = String(kcalCount);
  if (progressSummaryMinutes) progressSummaryMinutes.textContent = String(minutesCount);
  if (progressStreak) progressStreak.textContent = String(streakDays);
  if (progressRecord) {
    const recordUnit = recordDays === 1 ? 'dia' : 'dias';
    progressRecord.textContent = `${recordDays} ${recordUnit}`;
  }

  if (progressHistoryDays) {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - index));
      return day;
    });
    progressHistoryDays.innerHTML = days
      .map((day) => `<span class="${day.getDate() === now.getDate() ? 'is-today' : ''}">${day.getDate()}</span>`)
      .join('');
  }

  const weightValues = studentData.progress.weight
    .map((item) => Number(item.value))
    .filter((value) => Number.isFinite(value));

  const currentWeight = weightValues.length ? weightValues[weightValues.length - 1] : 0;
  const maxWeight = weightValues.length ? Math.max(...weightValues) : 0;
  const minWeight = weightValues.length ? Math.min(...weightValues) : 0;

  if (progressCurrentWeight) progressCurrentWeight.textContent = formatProgressWeightValue(currentWeight);
  if (progressMaxWeight) progressMaxWeight.textContent = formatProgressWeightValue(maxWeight);
  if (progressMinWeight) progressMinWeight.textContent = formatProgressWeightValue(minWeight);

  if (progressWeightPlot) {
    const topValue = Math.ceil((maxWeight + 0.8) * 10) / 10;
    const bottomValue = Math.floor((minWeight - 0.8) * 10) / 10;
    const range = Math.max(0.1, topValue - bottomValue);
    const dotTop = Math.max(6, Math.min(94, ((topValue - currentWeight) / range) * 100));
    const xLabels = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      return String(day.getDate());
    });
    const yLabels = Array.from({ length: 7 }, (_, index) => (topValue - (range / 6) * index).toFixed(1));

    progressWeightPlot.innerHTML = `
      <div class="student-progress-plot">
        <div class="student-progress-plot-y">${yLabels.map((value) => `<span>${value}</span>`).join('')}</div>
        <div class="student-progress-plot-canvas">
          <div class="student-progress-plot-point" style="top:${dotTop}%;">
            <span class="student-progress-plot-label">${formatProgressWeightValue(currentWeight)}</span>
            <span class="student-progress-plot-dot" aria-hidden="true"></span>
          </div>
        </div>
      </div>
      <div class="student-progress-plot-x">${xLabels.map((value) => `<span>${value}</span>`).join('')}</div>
    `;
  }

  const heightCm = getCurrentHeightCm();
  const heightMeters = heightCm / 100;
  const bmiValue = heightMeters > 0 ? currentWeight / (heightMeters * heightMeters) : 0;
  let bmiLabel = 'Normal';
  let bmiColor = '#19b856';

  if (bmiValue < 18.5) {
    bmiLabel = 'Abaixo do peso';
    bmiColor = '#5fcf8e';
  } else if (bmiValue >= 25 && bmiValue < 30) {
    bmiLabel = 'Sobrepeso';
    bmiColor = '#e8c84b';
  } else if (bmiValue >= 30 && bmiValue < 35) {
    bmiLabel = 'Obesidade I';
    bmiColor = '#e59a44';
  } else if (bmiValue >= 35) {
    bmiLabel = 'Obesidade II';
    bmiColor = '#e74b5b';
  }

  if (progressBmi) progressBmi.textContent = bmiValue.toFixed(1);
  if (progressBmiLabel) progressBmiLabel.textContent = bmiLabel;
  if (progressHeight) progressHeight.textContent = String(heightCm);
  if (progressBmiDot) progressBmiDot.style.background = bmiColor;

  if (progressStats) {
    progressStats.innerHTML = studentData.progress.stats
      .map((s) => `<article class="student-app-card"><h5>${s.label}</h5><p>${s.value}</p></article>`)
      .join('');
  }

  if (progressCompare) {
    progressCompare.textContent = `Comparativo semanal: +${studentData.performance - 70}% de desempenho acima da media inicial.`;
  }

  renderBarChart(weightChart, studentData.progress.weight);
  renderBarChart(measureChart, studentData.progress.measures);
  renderBarChart(evolutionChart, studentData.progress.evolution);
  if (progressHistorySheet && !progressHistorySheet.hidden) renderProgressHistorySheet();
};

const openExerciseModal = (exercise) => {
  if (!exerciseModal || !exerciseTitle || !exerciseMuscle || !exerciseVideo || !exerciseInstructions || !exerciseTips) return;
  exerciseTitle.textContent = exercise.name;
  exerciseMuscle.textContent = `Grupo muscular: ${exercise.muscle}`;
  exerciseVideo.src = exercise.video;
  exerciseInstructions.textContent = exercise.instructions;
  exerciseTips.innerHTML = exercise.tips.map((tip) => `<li>${tip}</li>`).join('');
  exerciseModal.hidden = false;
};

const closeExerciseModal = () => {
  if (!exerciseModal) return;
  exerciseModal.hidden = true;
  if (exerciseVideo) exerciseVideo.src = '';
};

const getFilteredLibraryItems = () => {
  const search = normalizeText(librarySearchTerm);
  const availableGroupKeys = getAvailableLibraryGroupKeys(studentData.library, {
    includeKnownWhenEmpty: true
  });
  const allowedGroups = activeLibraryFilter === 'todos'
    ? availableGroupKeys
    : (LIBRARY_TOPIC_GROUPS[activeLibraryFilter] || []);
  const visibleGroups = new Set(
    studentData.library
      .map((exercise) => normalizeLibraryGroupKey(exercise && exercise.group, ''))
      .filter((group) => allowedGroups.includes(group))
  );

  return allowedGroups
    .filter((group) => visibleGroups.has(group))
    .map((group) => ({
      group,
      label: getLibraryGroupLabel(group, group),
      icon: LIBRARY_GROUP_ICONS[group] || '🏋️',
      image: getLibraryGroupImageSrc(group),
      count: studentData.library.filter(
        (exercise) => normalizeLibraryGroupKey(exercise && exercise.group, '') === group
      ).length
    }))
    .filter((category) => {
      if (!search) return true;
      return normalizeText(category.label).includes(search);
    });
};

const renderLibrary = () => {
  syncLibraryManagerUi();
  if (!libraryGrid) return;

  const items = getFilteredLibraryItems();
  libraryGrid.innerHTML = '';

  items.forEach((exercise) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'student-library-item';
    card.setAttribute('data-library-group', exercise.group);
    const countLabel = `${exercise.count} ${exercise.count === 1 ? 'exercício' : 'exercícios'}`;
    const mediaClassName = exercise.image
      ? 'student-library-item-media is-group-image'
      : 'student-library-item-media';
    const mediaMarkup = exercise.image
      ? `<img class="student-library-item-group-image" src="${exercise.image}" alt="" loading="lazy" decoding="async" />`
      : `<span class="student-library-item-emoji">${exercise.icon}</span>`;
    card.innerHTML = `
      <span class="${mediaClassName}" aria-hidden="true">
        ${mediaMarkup}
      </span>
      <span class="student-library-item-copy">
        <strong>${exercise.label}</strong>
        <small>${countLabel}</small>
      </span>
      <span class="student-library-item-arrow" aria-hidden="true">›</span>
    `;
    libraryGrid.appendChild(card);
  });

  if (!items.length) {
    libraryGrid.innerHTML = '<article class="student-app-card"><p>Nenhum exercício encontrado com esse filtro.</p></article>';
  }
};

const getProfileItemIcon = (icon) => {
  if (icon === 'mail') return '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>';
  if (icon === 'phone') return '<svg viewBox="0 0 24 24"><path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4 1h2a2 2 0 0 1 2 1.7c.1.8.3 1.5.6 2.2a2 2 0 0 1-.4 2.1L7.2 8a16 16 0 0 0 8.8 8.8l1-.9a2 2 0 0 1 2.1-.4c.7.3 1.5.5 2.2.6A2 2 0 0 1 22 16.9z"></path></svg>';
  if (icon === 'calendar') return '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg>';
  if (icon === 'shield') return '<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5.3 3.4 8.9 8 10 4.6-1.1 8-4.7 8-10V7z"></path><path d="m9.5 12.2 1.9 1.9 3.1-3.2"></path></svg>';
  if (icon === 'settings') return '<svg viewBox="0 0 24 24"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z"></path><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z"></path></svg>';
  if (icon === 'bell') return '<svg viewBox="0 0 24 24"><path d="M15 17H5a2 2 0 0 0 2-2V11a5 5 0 1 1 10 0v4a2 2 0 0 0 2 2h-4z"></path><path d="M9 17a3 3 0 0 0 6 0"></path></svg>';
  return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 8.5h.01M11 12h1v4"></path></svg>';
};

const getProfileActionConfig = (actionId) => {
  if (actionId === 'account') {
    return {
      title: 'Configuracoes da Conta',
      text: 'Aqui voce podera atualizar nome, e-mail e dados da conta quando o backend estiver conectado.',
      primaryLabel: 'Entendi',
      showPrimary: true
    };
  }
  if (actionId === 'notifications') {
    const enabled = Boolean(studentData.notificationsEnabled);
    return {
      title: 'Notificacoes',
      text: enabled
        ? 'As notificacoes estao ativadas. Toque no botao para desativar alertas de treino.'
        : 'As notificacoes estao desativadas. Toque no botao para ativar alertas de treino.',
      primaryLabel: enabled ? 'Desativar' : 'Ativar',
      showPrimary: true
    };
  }
  return {
    title: 'Ajuda e Suporte',
    text: 'Abra uma solicitação para o Administrador Geral e acompanhe o histórico abaixo.',
    primaryLabel: 'Continuar',
    showPrimary: false
  };
};

const setProfileSupportFeedback = (message, isSuccess = false) => {
  setInlineFeedback(profileSupportFeedback, message, isSuccess);
};

const renderProfileSupportTickets = () => {
  if (!profileSupportList) return;
  if (profileSupportState.loading) {
    profileSupportList.innerHTML = '<p class="student-profile-support-empty">Carregando solicitações...</p>';
    return;
  }
  if (profileSupportState.error) {
    profileSupportList.innerHTML = `<p class="student-profile-support-empty">${escapeAdminCell(profileSupportState.error)}</p>`;
    return;
  }

  const tickets = Array.isArray(profileSupportState.tickets) ? profileSupportState.tickets : [];
  if (!tickets.length) {
    profileSupportList.innerHTML = '<p class="student-profile-support-empty">Nenhuma solicitação encontrada.</p>';
    return;
  }

  profileSupportList.innerHTML = tickets
    .map((ticket) => {
      const statusClass = getSupportTicketStatusClass(ticket && ticket.status);
      const createdAt = formatAdminDate(ticket && ticket.createdAt);
      const subject = String((ticket && ticket.subject) || '-').trim() || '-';
      const typeLabel = getSupportTicketTypeLabel(ticket && ticket.type);
      const statusLabel = getSupportTicketStatusLabel(ticket && ticket.status);
      const adminResponse = String((ticket && ticket.adminResponse) || '').trim();
      return `
        <article class="student-profile-support-item">
          <header>
            <strong>#${escapeAdminCell(ticket && ticket.id)}</strong>
            <span class="admin-overview-status-badge ${statusClass}">${escapeAdminCell(statusLabel)}</span>
          </header>
          <p class="student-profile-support-subject">${escapeAdminCell(subject)}</p>
          <small>${escapeAdminCell(typeLabel)} • ${escapeAdminCell(createdAt)}</small>
          ${adminResponse ? `<p class="student-profile-support-response">${escapeAdminCell(adminResponse)}</p>` : ''}
        </article>
      `;
    })
    .join('');
};

const fetchProfileSupportTickets = async (forceReload = false) => {
  if (!hasActiveStudentSession()) return [];
  if (profileSupportState.loading) return profileSupportState.tickets;
  if (profileSupportState.loaded && !forceReload) {
    renderProfileSupportTickets();
    return profileSupportState.tickets;
  }

  profileSupportState.loading = true;
  profileSupportState.error = '';
  renderProfileSupportTickets();

  try {
    const response = await requestStudentApi('/support/tickets/my');
    profileSupportState.tickets = Array.isArray(response && response.tickets) ? response.tickets : [];
    profileSupportState.loaded = true;
  } catch (error) {
    profileSupportState.error = error && error.message
      ? error.message
      : 'Não foi possível carregar suas solicitações.';
  } finally {
    profileSupportState.loading = false;
    renderProfileSupportTickets();
  }

  return profileSupportState.tickets;
};

const syncProfileActionModal = () => {
  if (!profileActionModal || !profileActionTitle || !profileActionText || !profileActionPrimary) return;
  const config = getProfileActionConfig(activeProfileAction);
  profileActionTitle.textContent = config.title;
  profileActionText.textContent = config.text;
  profileActionPrimary.textContent = config.primaryLabel;
  profileActionPrimary.hidden = !config.showPrimary;
  const isSupportAction = activeProfileAction === 'support';
  if (profileActionModal) profileActionModal.classList.toggle('is-support-mode', isSupportAction);
  if (profileSupportWrap) profileSupportWrap.hidden = !isSupportAction;
  if (profileActionText) profileActionText.hidden = isSupportAction;
};

const openProfileActionModal = (actionId) => {
  if (!profileActionModal) return;
  activeProfileAction = actionId || '';
  syncProfileActionModal();
  profileActionModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-profile-modal-open');
  if (activeProfileAction === 'support') {
    setProfileSupportFeedback('', false);
    if (profileSupportType && profileSupportSubject && !String(profileSupportSubject.value || '').trim()) {
      profileSupportSubject.value = buildSupportDefaultSubject(profileSupportType.value);
    }
    void fetchProfileSupportTickets(false);
  }
};

const closeProfileActionModal = () => {
  if (!profileActionModal) return;
  profileActionModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-profile-modal-open');
  setProfileSupportFeedback('', false);
};

const runProfilePrimaryAction = () => {
  if (activeProfileAction === 'notifications') {
    studentData.notificationsEnabled = !studentData.notificationsEnabled;
    renderProfile();
    syncProfileActionModal();
    return;
  }

  closeProfileActionModal();
};

const renderProfile = () => {
  if (profileName) profileName.textContent = studentData.userName;
  if (profileEmail) profileEmail.textContent = studentData.profileEmail || '-';
  if (profileMemberSince) profileMemberSince.textContent = studentData.memberSince || '--/--/----';
  if (profileLevel) profileLevel.textContent = studentData.level || 'Iniciante';
  if (profileAvatar) {
    profileAvatar.setAttribute('title', studentData.userName);
    const avatarUrl = resolveProfileAvatarUrl(studentData.profileAvatarUrl || '');
    const hasAvatarImage = Boolean(avatarUrl);
    profileAvatar.classList.toggle('has-image', hasAvatarImage);
    profileAvatar.classList.toggle('is-fallback-visible', !hasAvatarImage);

    if (profileAvatarImage) {
      profileAvatarImage.hidden = !hasAvatarImage;
      if (hasAvatarImage) {
        profileAvatarImage.dataset.expectedSrc = avatarUrl;
        profileAvatarImage.src = avatarUrl;
        profileAvatarImage.alt = '';
      } else {
        profileAvatarImage.dataset.expectedSrc = '';
        profileAvatarImage.removeAttribute('src');
        profileAvatarImage.alt = '';
      }
    }

    if (profileAvatarFallbackIcon) {
      profileAvatarFallbackIcon.hidden = hasAvatarImage;
    }
  }

  if (profilePersonalInfo) {
    profilePersonalInfo.innerHTML = (studentData.profilePersonalInfo || [])
      .map((item) => `
        <article class="student-profile-list-item">
          <span class="student-profile-list-icon" aria-hidden="true">${getProfileItemIcon(item.icon)}</span>
          <div class="student-profile-list-copy">
            <small>${item.label}</small>
            <strong>${item.value}</strong>
          </div>
        </article>
      `)
      .join('');
  }

  if (profileSettings) {
    profileSettings.innerHTML = (studentData.profileSettings || [])
      .map((item) => {
        const subline = item.id === 'notifications'
          ? (studentData.notificationsEnabled ? 'Ativadas' : 'Desativadas')
          : '';
        return `
        <button class="student-profile-list-item student-profile-settings-btn" type="button" data-profile-setting-action="${item.id}">
          <span class="student-profile-list-icon" aria-hidden="true">${getProfileItemIcon(item.icon)}</span>
          <div class="student-profile-list-copy">
            <strong>${item.label}</strong>
            <small>${subline}</small>
          </div>
          <span class="student-profile-list-chevron" aria-hidden="true">></span>
        </button>
      `;
      })
      .join('');
  }
};

const escapeAdminCell = (value) =>
  String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatAdminDate = (isoDate) => {
  if (!isoDate) return '-';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
};

const normalizeSupportTicketType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PASSWORD_RESET') return 'PASSWORD_RESET';
  if (normalized === 'LOGIN_ISSUE') return 'LOGIN_ISSUE';
  if (normalized === 'APP_ERROR') return 'APP_ERROR';
  if (normalized === 'WORKOUT_ISSUE') return 'WORKOUT_ISSUE';
  if (normalized === 'PROFILE_UPDATE') return 'PROFILE_UPDATE';
  if (normalized === 'PAYMENT_PLAN_ISSUE') return 'PAYMENT_PLAN_ISSUE';
  if (normalized === 'IMPROVEMENT_SUGGESTION') return 'IMPROVEMENT_SUGGESTION';
  if (normalized === 'EXERCISE_REPORT') return 'EXERCISE_REPORT';
  if (normalized === 'OTHER') return 'OTHER';
  return 'GENERAL_SUPPORT';
};

const normalizeSupportTicketStatus = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'RESOLVED') return 'RESOLVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return 'OPEN';
};

const normalizeAdminSupportView = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'archived') return 'archived';
  return 'active';
};

const normalizeTrainerManagedWorkoutsView = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'definition') return 'definition';
  return 'assigned';
};

const isSupportTicketArchived = (ticket) => {
  if (!ticket || typeof ticket !== 'object') return false;
  if (ticket.isArchived === true) return true;
  const metadata = ticket.metadata;
  if (!metadata || typeof metadata !== 'object') return false;
  const archive = metadata.archive;
  if (!archive || typeof archive !== 'object') return false;
  return archive.isArchived === true || archive.archived === true;
};

const getSupportRequesterNameFromEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) return '';
  const localPart = normalizedEmail
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!localPart) return '';
  return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
};

const getSupportTicketRequesterName = (ticket) => {
  const requesterNameFromRelation = String(
    (ticket && ticket.requester && ticket.requester.name) || ''
  ).trim();
  if (requesterNameFromRelation) return requesterNameFromRelation;

  const requesterNameFromField = String((ticket && ticket.requesterName) || '').trim();
  if (requesterNameFromField) return requesterNameFromField;

  const requesterEmail = String(
    (ticket && ticket.requesterEmail) ||
    (ticket && ticket.requester && ticket.requester.email) ||
    ''
  ).trim();
  const derivedName = getSupportRequesterNameFromEmail(requesterEmail);
  if (derivedName) return derivedName;

  return 'Não informado';
};

const getSupportTicketTypeLabel = (type) =>
  ({
    GENERAL_SUPPORT: 'Ajuda e suporte',
    PASSWORD_RESET: 'Reset de senha',
    LOGIN_ISSUE: 'Problema com login',
    APP_ERROR: 'Erro no aplicativo',
    WORKOUT_ISSUE: 'Problema com treino',
    PROFILE_UPDATE: 'Atualização de dados cadastrais',
    PAYMENT_PLAN_ISSUE: 'Problema com pagamento / plano',
    IMPROVEMENT_SUGGESTION: 'Sugestão de melhoria',
    EXERCISE_REPORT: 'Relatar exercício incorreto',
    OTHER: 'Outros'
  }[normalizeSupportTicketType(type)] || 'Ajuda e suporte');

const getSupportTicketStatusLabel = (status) => {
  const normalized = normalizeSupportTicketStatus(status);
  if (normalized === 'APPROVED') return 'Liberado';
  if (normalized === 'RESOLVED') return 'Resolvido';
  if (normalized === 'REJECTED') return 'Rejeitado';
  return 'Aberto';
};

const getSupportTicketStatusClass = (status) => {
  const normalized = normalizeSupportTicketStatus(status);
  if (normalized === 'APPROVED' || normalized === 'RESOLVED') return 'is-enabled';
  if (normalized === 'REJECTED') return 'is-disabled';
  return 'is-warning';
};

const formatDateKeyPtBr = (dateKey) => {
  const raw = String(dateKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '-';
  const [yearRaw, monthRaw, dayRaw] = raw.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
};

const getLibraryGroupKeyForAdmin = (exercise) => {
  const normalized = String(
    (exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group)) || ''
  )
    .trim()
    .toLowerCase();
  if (normalized && LIBRARY_GROUP_LABELS[normalized]) return normalized;
  if (normalized) return normalized;
  return 'geral';
};

const getLibraryGroupLabelForAdmin = (groupKey) => {
  const normalized = String(groupKey || '').trim().toLowerCase();
  if (!normalized) return 'Geral';
  if (LIBRARY_GROUP_LABELS[normalized]) return LIBRARY_GROUP_LABELS[normalized];
  if (normalized === 'geral') return 'Geral';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const buildAdminExerciseIdentification = (exerciseId) => {
  const safeId = Math.max(0, Number(exerciseId) || 0);
  return `EX-${String(safeId).padStart(4, '0')}`;
};

const getAdminOverviewExerciseById = (exerciseId) => {
  const safeId = Number(exerciseId) || 0;
  if (!safeId) return null;
  if (!Array.isArray(adminOverviewState.exercises)) return null;
  return adminOverviewState.exercises.find((item) => Number(item && item.id) === safeId) || null;
};

const getAdminOverviewWorkoutById = (workoutId) => {
  const safeId = Number(workoutId) || 0;
  if (!safeId) return null;
  if (!Array.isArray(adminOverviewState.workouts)) return null;
  return adminOverviewState.workouts.find((item) => Number(item && item.id) === safeId) || null;
};

const getAdminExerciseEditGroupKeys = (exercise = null) => {
  const groupKeysSet = new Set(Object.keys(LIBRARY_GROUP_LABELS));
  groupKeysSet.add('geral');

  if (Array.isArray(adminOverviewState.exercises)) {
    adminOverviewState.exercises.forEach((item) => {
      const key = getLibraryGroupKeyForAdmin(item);
      if (key) groupKeysSet.add(key);
    });
  }

  const currentKey = getLibraryGroupKeyForAdmin(exercise);
  if (currentKey) groupKeysSet.add(currentKey);

  const knownOrder = Object.keys(LIBRARY_GROUP_LABELS);
  const orderedKnown = knownOrder.filter((key) => groupKeysSet.has(key));
  const extraKeys = Array.from(groupKeysSet)
    .filter((key) => key !== 'geral' && !knownOrder.includes(key))
    .sort((first, second) => first.localeCompare(second));
  const options = [...orderedKnown, ...extraKeys];
  if (groupKeysSet.has('geral')) options.push('geral');
  return options;
};

const SITE_TOP_NOTICE_ANIMATION_MS = 260;
const SITE_TOP_NOTICE_DEFAULT_DURATION_MS = 4200;
const INLINE_FEEDBACK_MIN_VISIBLE_MS = 2600;

const getInlineFeedbackHoldUntil = (target) => {
  if (!target || !(target instanceof HTMLElement)) return 0;
  return Math.max(0, Number(target.dataset.feedbackHoldUntil) || 0);
};

const setInlineFeedbackHoldUntil = (target, holdUntil) => {
  if (!target || !(target instanceof HTMLElement)) return;
  const normalized = Math.max(0, Number(holdUntil) || 0);
  if (!normalized) {
    delete target.dataset.feedbackHoldUntil;
    return;
  }
  target.dataset.feedbackHoldUntil = String(normalized);
};

const shouldKeepInlineFeedback = (target) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Date.now() < getInlineFeedbackHoldUntil(target);
};

const clearSiteTopNoticeTimers = () => {
  if (siteTopNoticeHideTimer) {
    window.clearTimeout(siteTopNoticeHideTimer);
    siteTopNoticeHideTimer = null;
  }
  if (siteTopNoticeCleanupTimer) {
    window.clearTimeout(siteTopNoticeCleanupTimer);
    siteTopNoticeCleanupTimer = null;
  }
};

const hideSiteTopNotice = ({ immediate = false } = {}) => {
  if (!siteTopNotice) return;
  clearSiteTopNoticeTimers();

  if (immediate) {
    siteTopNotice.classList.remove('is-visible', 'is-success');
    siteTopNotice.hidden = true;
    if (siteTopNoticeText) siteTopNoticeText.textContent = '';
    return;
  }

  siteTopNotice.classList.remove('is-visible');
  siteTopNoticeCleanupTimer = window.setTimeout(() => {
    if (!siteTopNotice) return;
    siteTopNotice.hidden = true;
    siteTopNotice.classList.remove('is-success');
    if (siteTopNoticeText) siteTopNoticeText.textContent = '';
  }, SITE_TOP_NOTICE_ANIMATION_MS + 40);
};

const showSiteTopNotice = (message, isSuccess = false, { durationMs = SITE_TOP_NOTICE_DEFAULT_DURATION_MS } = {}) => {
  if (!siteTopNotice || !siteTopNoticeText) return;
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage) {
    hideSiteTopNotice();
    return;
  }

  const now = Date.now();
  const normalizedIsSuccess = Boolean(isSuccess);
  const isDuplicatedBurst =
    normalizedMessage === siteTopNoticeLastMessage &&
    normalizedIsSuccess === siteTopNoticeLastIsSuccess &&
    now - siteTopNoticeLastShownAt < 320;

  if (isDuplicatedBurst) return;

  siteTopNoticeLastMessage = normalizedMessage;
  siteTopNoticeLastIsSuccess = normalizedIsSuccess;
  siteTopNoticeLastShownAt = now;

  clearSiteTopNoticeTimers();
  siteTopNotice.hidden = false;
  siteTopNoticeText.textContent = normalizedMessage;
  siteTopNotice.classList.toggle('is-success', normalizedIsSuccess);
  siteTopNotice.classList.remove('is-visible');
  void siteTopNotice.offsetWidth;
  window.requestAnimationFrame(() => {
    if (!siteTopNotice) return;
    siteTopNotice.classList.add('is-visible');
  });

  const safeDuration = Math.max(1600, Number(durationMs) || SITE_TOP_NOTICE_DEFAULT_DURATION_MS);
  siteTopNoticeHideTimer = window.setTimeout(() => {
    hideSiteTopNotice();
  }, safeDuration);
};

const setInlineFeedback = (
  target,
  message,
  isSuccess = false,
  { notice = true, minVisibleMs = INLINE_FEEDBACK_MIN_VISIBLE_MS, forceClear = false } = {}
) => {
  const normalizedMessage = String(message || '').trim();
  if (target) {
    if (!normalizedMessage && !forceClear && shouldKeepInlineFeedback(target)) {
      return;
    }
    target.classList.toggle('is-success', Boolean(isSuccess));
    target.textContent = normalizedMessage;
    if (normalizedMessage) {
      const visibleForMs = Math.max(1200, Number(minVisibleMs) || INLINE_FEEDBACK_MIN_VISIBLE_MS);
      setInlineFeedbackHoldUntil(target, Date.now() + visibleForMs);
    } else {
      setInlineFeedbackHoldUntil(target, 0);
    }
  }
  if (notice && normalizedMessage) {
    showSiteTopNotice(normalizedMessage, isSuccess);
  }
};

const setAdminExerciseFormFeedback = (message, isSuccess = false) => {
  setInlineFeedback(adminExerciseFormFeedback, message, isSuccess);
};

const setAdminUserDeleteFeedback = (message, isSuccess = false) => {
  setInlineFeedback(adminUserDeleteFeedback, message, isSuccess);
};

const setTrainerWorkoutQuickCreateFeedback = (message, isSuccess = false) => {
  setInlineFeedback(
    trainerWorkoutQuickCreateFeedback,
    message,
    isSuccess,
    { notice: false, minVisibleMs: 0, forceClear: true }
  );
};

const setTrainerWorkoutCoverFeedback = (message, isSuccess = false) => {
  setInlineFeedback(
    trainerWorkoutCoverFeedback,
    message,
    isSuccess,
    { notice: false, minVisibleMs: 0, forceClear: true }
  );
};

const closeTrainerWorkoutQuickCreateModal = ({ keepFocus = true, value = '' } = {}) => {
  if (trainerWorkoutQuickCreateModal) trainerWorkoutQuickCreateModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-admin-exercise-modal-open');

  const triggerButton = trainerWorkoutQuickCreateTriggerButton;
  trainerWorkoutQuickCreateTriggerButton = null;
  if (keepFocus && triggerButton instanceof HTMLElement && document.contains(triggerButton)) {
    try {
      triggerButton.focus({ preventScroll: true });
    } catch (_) {
      triggerButton.focus();
    }
  }

  if (trainerWorkoutQuickCreateForm) trainerWorkoutQuickCreateForm.reset();
  setTrainerWorkoutQuickCreateFeedback('', false);
  if (trainerWorkoutQuickCreateSubmitButton) trainerWorkoutQuickCreateSubmitButton.disabled = false;

  const resolver = trainerWorkoutQuickCreateResolve;
  trainerWorkoutQuickCreateResolve = null;
  if (typeof resolver === 'function') {
    resolver(String(value || '').trim());
  }
};

const requestTrainerWorkoutQuickCreate = ({
  defaultName = '',
  triggerButton = null
} = {}) => {
  if (
    !trainerWorkoutQuickCreateModal ||
    !trainerWorkoutQuickCreateForm ||
    !trainerWorkoutQuickCreateNameInput
  ) {
    return Promise.resolve('');
  }

  if (typeof trainerWorkoutQuickCreateResolve === 'function') {
    closeTrainerWorkoutQuickCreateModal({ keepFocus: false, value: '' });
  }

  if (
    trainerWorkoutQuickCreateModal &&
    trainerWorkoutQuickCreateModal.parentElement !== document.body
  ) {
    document.body.appendChild(trainerWorkoutQuickCreateModal);
  }

  trainerWorkoutQuickCreateTriggerButton =
    triggerButton instanceof HTMLElement ? triggerButton : null;

  trainerWorkoutQuickCreateForm.reset();
  setTrainerWorkoutQuickCreateFeedback('', false);
  trainerWorkoutQuickCreateNameInput.value = String(defaultName || '').trim();
  if (trainerWorkoutQuickCreateSubmitButton) trainerWorkoutQuickCreateSubmitButton.disabled = false;
  trainerWorkoutQuickCreateModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-admin-exercise-modal-open');

  window.requestAnimationFrame(() => {
    try {
      trainerWorkoutQuickCreateNameInput.focus({ preventScroll: true });
    } catch (_) {
      trainerWorkoutQuickCreateNameInput.focus();
    }
    trainerWorkoutQuickCreateNameInput.select();
  });

  return new Promise((resolve) => {
    trainerWorkoutQuickCreateResolve = resolve;
  });
};

const closeSiteConfirmModal = ({ keepFocus = true, result = false } = {}) => {
  if (siteConfirmModal) siteConfirmModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-admin-exercise-modal-open');

  const triggerButton = siteConfirmTriggerButton;
  siteConfirmTriggerButton = null;
  if (keepFocus && triggerButton instanceof HTMLElement && document.contains(triggerButton)) {
    try {
      triggerButton.focus({ preventScroll: true });
    } catch (_) {
      triggerButton.focus();
    }
  }

  const resolver = siteConfirmResolve;
  siteConfirmResolve = null;
  if (typeof resolver === 'function') {
    resolver(Boolean(result));
  }
};

const isElementInsideCompatSelectorBridge = (element) =>
  element instanceof Element && Boolean(element.closest('[data-compat-selector-bridge]'));

const canUseSiteConfirmModalUi = () =>
  siteConfirmModal instanceof HTMLElement &&
  siteConfirmTitle instanceof HTMLElement &&
  siteConfirmIdentification instanceof HTMLElement &&
  siteConfirmMessage instanceof HTMLElement &&
  siteConfirmConfirmButton instanceof HTMLButtonElement &&
  siteConfirmCancelButton instanceof HTMLButtonElement &&
  !isElementInsideCompatSelectorBridge(siteConfirmModal) &&
  !isElementInsideCompatSelectorBridge(siteConfirmTitle) &&
  !isElementInsideCompatSelectorBridge(siteConfirmIdentification) &&
  !isElementInsideCompatSelectorBridge(siteConfirmMessage) &&
  !isElementInsideCompatSelectorBridge(siteConfirmConfirmButton) &&
  !isElementInsideCompatSelectorBridge(siteConfirmCancelButton);

const requestSiteConfirm = ({
  title = 'Confirmar ação',
  identification = 'Sistema',
  message = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  triggerButton = null
} = {}) => {
  const resolvedTitle = String(title || 'Confirmar ação').trim() || 'Confirmar ação';
  const resolvedIdentification = String(identification || 'Sistema').trim() || 'Sistema';
  const resolvedMessage = String(message || '').trim();
  const resolvedConfirmLabel = String(confirmLabel || 'Confirmar').trim() || 'Confirmar';
  const resolvedCancelLabel = String(cancelLabel || 'Cancelar').trim() || 'Cancelar';

  if (!canUseSiteConfirmModalUi()) {
    const nativeDialogText = [
      resolvedTitle,
      [resolvedIdentification, resolvedMessage].filter(Boolean).join('\n')
    ]
      .filter(Boolean)
      .join('\n\n');
    try {
      return Promise.resolve(window.confirm(nativeDialogText));
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  if (typeof siteConfirmResolve === 'function') {
    closeSiteConfirmModal({ keepFocus: false, result: false });
  }

  if (siteConfirmModal && siteConfirmModal.parentElement !== document.body) {
    document.body.appendChild(siteConfirmModal);
  }

  siteConfirmTriggerButton = triggerButton instanceof HTMLElement ? triggerButton : null;
  siteConfirmTitle.textContent = resolvedTitle;
  siteConfirmIdentification.textContent = resolvedIdentification;
  siteConfirmMessage.textContent = resolvedMessage;
  siteConfirmConfirmButton.textContent = resolvedConfirmLabel;
  siteConfirmCancelButton.textContent = resolvedCancelLabel;

  siteConfirmModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-admin-exercise-modal-open');
  window.requestAnimationFrame(() => {
    try {
      siteConfirmCancelButton.focus({ preventScroll: true });
    } catch (_) {
      siteConfirmCancelButton.focus();
    }
  });

  return new Promise((resolve) => {
    siteConfirmResolve = resolve;
  });
};

const syncAdminExerciseCurrentMediaLinks = (exercise = null) => {
  const imageUrl = resolveApiMediaUrl(String((exercise && exercise.imageUrl) || '').trim());
  const videoUrl = resolveApiMediaUrl(String((exercise && exercise.videoUrl) || '').trim());

  if (adminExerciseCurrentImageLink) {
    adminExerciseCurrentImageLink.hidden = !imageUrl;
    if (imageUrl) {
      adminExerciseCurrentImageLink.href = imageUrl;
    } else {
      adminExerciseCurrentImageLink.removeAttribute('href');
    }
  }
  if (adminExerciseCurrentImageEmpty) {
    adminExerciseCurrentImageEmpty.hidden = Boolean(imageUrl);
  }

  if (adminExerciseCurrentVideoLink) {
    adminExerciseCurrentVideoLink.hidden = !videoUrl;
    if (videoUrl) {
      adminExerciseCurrentVideoLink.href = videoUrl;
    } else {
      adminExerciseCurrentVideoLink.removeAttribute('href');
    }
  }
  if (adminExerciseCurrentVideoEmpty) {
    adminExerciseCurrentVideoEmpty.hidden = Boolean(videoUrl);
  }
};

const setAdminExerciseModalMode = ({ readOnly = false } = {}) => {
  adminExerciseModalReadOnly = Boolean(readOnly);

  if (adminExerciseModalTitle) {
    adminExerciseModalTitle.textContent = adminExerciseModalReadOnly
      ? 'Visualizar exercício da biblioteca'
      : 'Editar exercício da biblioteca';
  }

  if (adminExerciseModalCancelButton) {
    adminExerciseModalCancelButton.textContent = adminExerciseModalReadOnly ? 'Fechar' : 'Cancelar';
  }

  if (adminExerciseSubmitButton) {
    adminExerciseSubmitButton.hidden = adminExerciseModalReadOnly;
  }

  if (adminExerciseForm) {
    adminExerciseForm.classList.toggle('is-readonly', adminExerciseModalReadOnly);
  }

  adminExerciseEditControls.forEach((control) => {
    if (
      !(control instanceof HTMLInputElement) &&
      !(control instanceof HTMLTextAreaElement) &&
      !(control instanceof HTMLSelectElement)
    ) {
      return;
    }

    control.disabled = adminExerciseModalReadOnly;
    if (control instanceof HTMLTextAreaElement) {
      control.readOnly = adminExerciseModalReadOnly;
    }
  });

  adminExerciseEditUploadFields.forEach((field) => {
    if (!(field instanceof HTMLElement)) return;
    field.hidden = adminExerciseModalReadOnly;
  });
};

const closeAdminExerciseEditModal = ({ keepFocus = true, force = false } = {}) => {
  if (!force && !adminExerciseModalReadOnly && adminExerciseSubmitButton && adminExerciseSubmitButton.disabled) return;
  if (adminExerciseModal) adminExerciseModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-admin-exercise-modal-open');
  adminExerciseEditingId = 0;
  setAdminExerciseFormFeedback('', false);

  if (adminExerciseForm) adminExerciseForm.reset();
  setAdminExerciseModalMode({ readOnly: false });
  if (adminExerciseModalIdentification) {
    adminExerciseModalIdentification.textContent = 'EX-0000';
  }
  if (adminExerciseFieldGroup) {
    adminExerciseFieldGroup.innerHTML = '';
  }
  syncAdminExerciseCurrentMediaLinks(null);

  const triggerButton = adminExerciseEditTriggerButton;
  adminExerciseEditTriggerButton = null;
  if (keepFocus && triggerButton instanceof HTMLElement && document.contains(triggerButton)) {
    triggerButton.focus();
  }
};

const closeAdminUserDeleteModal = ({ keepFocus = true, force = false } = {}) => {
  if (!force && adminUserDeleteSubmitButton && adminUserDeleteSubmitButton.disabled) return;
  if (adminUserDeleteModal) adminUserDeleteModal.hidden = true;

  if (adminUserDeleteForm) adminUserDeleteForm.reset();
  if (adminUserDeleteIdentification) adminUserDeleteIdentification.textContent = '';
  if (adminUserDeleteWarning) adminUserDeleteWarning.textContent = '';
  setAdminUserDeleteFeedback('', false);
  adminUserDeleteTargetId = 0;
  adminUserDeleteTargetName = '';

  const triggerButton = adminUserDeleteTriggerButton;
  adminUserDeleteTriggerButton = null;
  if (keepFocus && triggerButton instanceof HTMLElement && document.contains(triggerButton)) {
    triggerButton.focus();
  }
};

const openAdminUserDeleteModal = (userId, userName = '', triggerButton = null) => {
  if (!adminUserDeleteModal || !adminUserDeletePasswordInput) return false;
  const safeUserId = Number(userId) || 0;
  if (!safeUserId) return false;

  const safeUserName = String(userName || `ID ${safeUserId}`).trim() || `ID ${safeUserId}`;
  adminUserDeleteTargetId = safeUserId;
  adminUserDeleteTargetName = safeUserName;
  adminUserDeleteTriggerButton = triggerButton instanceof HTMLElement ? triggerButton : null;

  if (adminUserDeleteIdentification) {
    adminUserDeleteIdentification.textContent = `Usuário #${safeUserId}`;
  }
  if (adminUserDeleteWarning) {
    adminUserDeleteWarning.textContent = `Tem certeza que deseja excluir permanentemente o usuário ${safeUserName}? Essa ação não pode ser desfeita.`;
  }
  if (adminUserDeleteSubmitButton) adminUserDeleteSubmitButton.disabled = false;
  if (adminUserDeleteForm) adminUserDeleteForm.reset();
  setAdminUserDeleteFeedback('', false);

  adminUserDeleteModal.hidden = false;
  window.requestAnimationFrame(() => {
    try {
      adminUserDeletePasswordInput.focus({ preventScroll: true });
    } catch (_) {
      adminUserDeletePasswordInput.focus();
    }
  });
  return true;
};

const openAdminExerciseEditModal = (exercise, triggerButton = null, { readOnly = false } = {}) => {
  if (
    !adminExerciseModal ||
    !adminExerciseForm ||
    !adminExerciseFieldName ||
    !adminExerciseFieldDescription ||
    !adminExerciseFieldGroup ||
    !adminExerciseFieldStatus ||
    !adminExerciseFieldSeries ||
    !adminExerciseFieldRepetitions ||
    !adminExerciseFieldDuration ||
    !adminExerciseFieldRest ||
    !adminExerciseFieldCalories
  ) {
    return false;
  }

  const exerciseId = Number(exercise && exercise.id) || 0;
  if (!exerciseId) return false;
  const isReadOnly = Boolean(readOnly);

  const groupKey = getLibraryGroupKeyForAdmin(exercise);
  const groupKeys = getAdminExerciseEditGroupKeys(exercise);
  adminExerciseFieldGroup.innerHTML = groupKeys
    .map(
      (key) =>
        `<option value="${escapeAdminCell(key)}">${escapeAdminCell(getLibraryGroupLabelForAdmin(key))}</option>`
    )
    .join('');

  adminExerciseEditingId = exerciseId;
  adminExerciseEditTriggerButton = triggerButton instanceof HTMLButtonElement ? triggerButton : null;
  setAdminExerciseModalMode({ readOnly: isReadOnly });
  if (adminExerciseModalIdentification) {
    adminExerciseModalIdentification.textContent = buildAdminExerciseIdentification(exerciseId);
  }
  if (adminExerciseSubmitButton) adminExerciseSubmitButton.disabled = false;
  setAdminExerciseFormFeedback('', false);

  adminExerciseFieldName.value = String((exercise && exercise.name) || '').trim();
  adminExerciseFieldDescription.value = String((exercise && exercise.description) || '').trim();
  adminExerciseFieldGroup.value = groupKeys.includes(groupKey) ? groupKey : groupKeys[0] || 'geral';
  adminExerciseFieldStatus.value = exercise && exercise.isActive !== false ? 'ativo' : 'inativo';
  const seriesCount = Math.max(
    1,
    Number(
      exercise &&
      (
        exercise.seriesCount !== undefined
          ? exercise.seriesCount
          : exercise.series !== undefined
            ? exercise.series
            : exercise.series_count
      )
    ) || 3
  );
  adminExerciseFieldSeries.value = String(seriesCount);
  adminExerciseFieldRepetitions.value = String(Math.max(1, Number(exercise && exercise.repetitions) || 10));
  adminExerciseFieldDuration.value = String(Math.max(10, Number(exercise && exercise.durationSeconds) || 60));
  adminExerciseFieldRest.value = String(Math.max(0, Number(exercise && exercise.restSeconds) || 30));
  const fallbackCaloriesEstimate = estimateExerciseCalories({
    durationSeconds: Number(exercise && exercise.durationSeconds) || 60,
    repetitions: Number(exercise && exercise.repetitions) || 10,
    restSeconds: Number(exercise && exercise.restSeconds) || 30,
    loadKg: Number(exercise && exercise.loadKg) || 0
  });
  const persistedCaloriesEstimate = Number(
    exercise && (
      exercise.caloriesEstimate !== undefined
        ? exercise.caloriesEstimate
        : exercise.calories_estimate !== undefined
          ? exercise.calories_estimate
          : exercise.calories
    )
  );
  const effectiveCaloriesEstimate =
    Number.isFinite(persistedCaloriesEstimate) && persistedCaloriesEstimate > 0
      ? Math.max(0, Math.round(persistedCaloriesEstimate))
      : fallbackCaloriesEstimate;
  adminExerciseFieldCalories.value = String(effectiveCaloriesEstimate);
  syncAdminExerciseCurrentMediaLinks(exercise);

  adminExerciseModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-admin-exercise-modal-open');
  const modalCard = adminExerciseModal.querySelector('.admin-exercise-edit-modal-card');
  if (modalCard) modalCard.scrollTop = 0;
  window.requestAnimationFrame(() => {
    if (isReadOnly) {
      const focusTarget = adminExerciseModalCancelButton || adminExerciseModal.querySelector('[data-admin-exercise-modal-close]');
      if (focusTarget instanceof HTMLElement) {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (_) {
          focusTarget.focus();
        }
      }
      return;
    }

    try {
      adminExerciseFieldName.focus({ preventScroll: true });
    } catch (_) {
      adminExerciseFieldName.focus();
    }
    adminExerciseFieldName.select();
  });

  return true;
};

const resetAdminOverviewState = () => {
  closeAdminExerciseEditModal({ keepFocus: false, force: true });
  closeAdminUserDeleteModal({ keepFocus: false, force: true });
  adminSupportView = 'active';
  syncAdminSupportViewUi();
  adminOverviewWorkoutsSearchTerm = '';
  adminOverviewState.loading = false;
  adminOverviewState.loaded = false;
  adminOverviewState.activeTab = 'distribution';
  adminOverviewState.error = '';
  adminOverviewState.stats = {
    totalUsers: 0,
    totalUsersEnabled: 0,
    totalWorkouts: 0,
    totalWorkoutsAtivos: 0,
    totalWorkoutsInativos: 0,
    totalExercises: 0,
    totalExercisesAtivos: 0,
    totalExercisesInativos: 0,
    alunos: 0,
    instrutores: 0,
    instrutoresAtivos: 0,
    administradores: 0,
    administradoresAtivos: 0,
    administradoresGerais: 0,
    administradoresGeraisAtivos: 0,
    alunosOnlineAgora: 0,
    janelaOnlineMinutos: 5,
    alunosAtivos: 0,
    alunosDesabilitados: 0,
    onlineAgora: 0,
    supportTicketsPendentes: 0,
    supportResetPendentes: 0
  };
  adminOverviewState.charts = {
    roleDistribution: [],
    studentsStatus: []
  };
  adminOverviewState.users = [];
  adminOverviewState.workouts = [];
  adminOverviewState.exercises = [];
  adminOverviewState.supportTickets = [];
};

const setAdminOverviewFeedback = (message, isSuccess = false) => {
  setInlineFeedback(adminOverviewError, message, isSuccess);
};

const runChartContainerAnimation = (container, replay = false) => {
  if (!(container instanceof HTMLElement)) return;
  if (replay) {
    container.classList.remove('active');
    void container.offsetWidth;
  }
  window.requestAnimationFrame(() => {
    container.classList.add('active');
  });
};

const animateVisibleAdminActivityBars = (replay = false) => {
  if (!adminOverviewPanel) return;
  const bars = adminOverviewPanel.querySelectorAll('.admin-overview-activity-bar');
  bars.forEach((bar) => {
    if (!(bar instanceof HTMLElement)) return;
    if (bar.closest('[hidden]')) return;
    if (replay) {
      bar.classList.remove('is-active');
      void bar.offsetWidth;
    }
    window.requestAnimationFrame(() => {
      bar.classList.add('is-active');
    });
  });
};

const animateVisibleAdminRoleChart = (replay = false) => {
  if (!adminRoleChart || adminRoleChart.closest('[hidden]')) return;
  const segments = Array.from(adminRoleChart.querySelectorAll('.admin-overview-pie-segment'));
  if (!segments.length) return;

  segments.forEach((segment) => {
    if (!(segment instanceof SVGPathElement || segment instanceof SVGCircleElement)) return;
    const length = typeof segment.getTotalLength === 'function' ? segment.getTotalLength() : 0;
    if (length <= 0) return;
    segment.style.strokeDasharray = `${length}`;
    segment.style.strokeDashoffset = `${length}`;
    segment.style.opacity = '1';
  });

  const gsapInstance = window.gsap;
  if (gsapInstance && typeof gsapInstance.to === 'function') {
    if (typeof gsapInstance.killTweensOf === 'function') {
      gsapInstance.killTweensOf(segments);
      gsapInstance.killTweensOf(adminRoleChart);
    }
    gsapInstance.set(adminRoleChart, { x: replay ? -8 : -4, opacity: 0.98 });
    gsapInstance.to(adminRoleChart, {
      duration: 0.36,
      x: 0,
      opacity: 1,
      ease: 'power2.out'
    });
    gsapInstance.to(segments, {
      duration: 0.62,
      strokeDashoffset: 0,
      stagger: 0.14,
      ease: 'power2.out'
    });
    return;
  }

  segments.forEach((segment, index) => {
    if (!(segment instanceof SVGPathElement || segment instanceof SVGCircleElement)) return;
    segment.classList.remove('is-active');
    segment.style.transitionDelay = `${index * 120}ms`;
  });
  if (replay) void adminRoleChart.offsetWidth;
  window.requestAnimationFrame(() => {
    segments.forEach((segment) => segment.classList.add('is-active'));
  });
};

const animateVisibleAdminGrowthChart = (replay = false) => {
  if (!adminGrowthChart || adminGrowthChart.closest('[hidden]')) return;
  const line = adminGrowthChart.querySelector('.admin-overview-growth-line');
  const nodes = Array.from(adminGrowthChart.querySelectorAll('.admin-overview-growth-node'));
  if (!line || typeof line.getTotalLength !== 'function') return;

  const totalLength = line.getTotalLength();
  line.style.strokeDasharray = `${totalLength}`;
  line.style.strokeDashoffset = `${totalLength}`;

  const gsapInstance = window.gsap;
  if (gsapInstance && typeof gsapInstance.to === 'function') {
    if (typeof gsapInstance.killTweensOf === 'function') {
      gsapInstance.killTweensOf(line);
      gsapInstance.killTweensOf(nodes);
    }
    gsapInstance.set(nodes, { opacity: 0, y: 10 });
    gsapInstance.to(line, {
      duration: 1.2,
      strokeDashoffset: 0,
      ease: 'power2.out'
    });
    gsapInstance.to(nodes, {
      duration: 0.5,
      opacity: 1,
      y: 0,
      stagger: 0.12,
      delay: 0.34,
      ease: 'power2.out'
    });
    return;
  }

  if (replay) {
    line.classList.remove('is-active');
    nodes.forEach((node) => node.classList.remove('is-active'));
    void line.getBoundingClientRect();
  }
  window.requestAnimationFrame(() => {
    line.classList.add('is-active');
    nodes.forEach((node, index) => {
      window.setTimeout(() => node.classList.add('is-active'), index * 110);
    });
  });
};

const activateVisibleAdminCharts = (replay = false) => {
  if (!adminOverviewPanel) return;
  const chartContainers = adminOverviewPanel.querySelectorAll('.chart-container');
  chartContainers.forEach((container) => {
    if (container.closest('[hidden]')) return;
    runChartContainerAnimation(container, replay);
  });
  animateVisibleAdminRoleChart(replay);
  animateVisibleAdminActivityBars(replay);
  animateVisibleAdminGrowthChart(replay);
};

const ADMIN_OVERVIEW_PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#06b6d4'];
const ADMIN_OVERVIEW_ACTIVITY_FALLBACK = [4, 3, 5, 2, 4, 1, 1];
const ADMIN_OVERVIEW_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const polarToCartesian = (centerX, centerY, radius, angleDeg) => {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  };
};

const buildDonutArcPath = (centerX, centerY, radius, startDeg, endDeg) => {
  const start = polarToCartesian(centerX, centerY, radius, startDeg);
  const end = polarToCartesian(centerX, centerY, radius, endDeg);
  const delta = Math.abs(endDeg - startDeg);
  const largeArcFlag = delta > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
};

const parseAdminChartDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getMondayFromDate = (baseDate = new Date()) => {
  const reference = new Date(baseDate);
  reference.setHours(0, 0, 0, 0);
  const jsDay = reference.getDay();
  const offset = jsDay === 0 ? -6 : 1 - jsDay;
  reference.setDate(reference.getDate() + offset);
  return reference;
};

const getWeekdayIndex = (date) => {
  const jsDay = Number(date.getDay()) || 0;
  return jsDay === 0 ? 6 : jsDay - 1;
};

const buildAdminWeeklyActivity = (users, workouts, totalUsers = 0) => {
  const rows = WEEKDAY_LABELS.map((label) => ({
    label,
    activeUsers: 0,
    workouts: 0
  }));

  const weekStart = getMondayFromDate(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  (Array.isArray(users) ? users : []).forEach((user) => {
    const date = parseAdminChartDate(user && (user.lastSeenAt || user.updatedAt || user.createdAt));
    if (!date || date < weekStart || date >= weekEnd) return;
    rows[getWeekdayIndex(date)].activeUsers += 1;
  });

  (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
    const date = parseAdminChartDate(workout && workout.createdAt);
    if (!date || date < weekStart || date >= weekEnd) return;
    rows[getWeekdayIndex(date)].workouts += 1;
  });

  const hasValues = rows.some((item) => item.activeUsers > 0 || item.workouts > 0);
  if (hasValues || Number(totalUsers) <= 0) return rows;

  return rows.map((item, index) => ({
    ...item,
    activeUsers: ADMIN_OVERVIEW_ACTIVITY_FALLBACK[index] || 0,
    workouts: Math.max(0, (ADMIN_OVERVIEW_ACTIVITY_FALLBACK[index] || 0) - 1)
  }));
};

const buildAdminGrowthSeries = (users, totalUsers = 0) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let previousTotal = 0;
  let currentTotal = 0;

  (Array.isArray(users) ? users : []).forEach((user) => {
    const createdAt = parseAdminChartDate(user && user.createdAt);
    if (!createdAt) return;
    if (createdAt <= previousMonthEnd) previousTotal += 1;
    if (createdAt <= currentMonthEnd) currentTotal += 1;
  });

  if (!currentTotal) currentTotal = Math.max(0, Number(totalUsers) || 0);
  if (!previousTotal && currentTotal > 0) previousTotal = Math.max(0, currentTotal - 1);

  const growthPercent = previousTotal <= 0
    ? currentTotal > 0
      ? 100
      : 0
    : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

  return {
    labels: [
      ADMIN_OVERVIEW_MONTHS[previousMonthStart.getMonth()],
      ADMIN_OVERVIEW_MONTHS[currentMonthStart.getMonth()]
    ],
    values: [previousTotal, currentTotal],
    growthPercent,
    totalCurrent: currentTotal
  };
};

const setAdminOverviewTab = (tabName, replayCharts = false) => {
  const normalized = ['distribution', 'activity', 'growth'].includes(tabName)
    ? tabName
    : 'distribution';
  adminOverviewState.activeTab = normalized;
  adminOverviewTabButtons.forEach((button) => {
    const isActive = button.dataset.adminOverviewTab === normalized;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  adminOverviewTabPanes.forEach((pane) => {
    const isVisible = pane.dataset.adminOverviewPane === normalized;
    pane.hidden = !isVisible;
    if (replayCharts) {
      const paneCharts = pane.querySelectorAll('.chart-container');
      paneCharts.forEach((chartElement) => {
        if (isVisible) {
          runChartContainerAnimation(chartElement, true);
        } else {
          chartElement.classList.remove('active');
        }
      });
    }
  });
  if (replayCharts) {
    animateVisibleAdminRoleChart(true);
    animateVisibleAdminActivityBars(true);
    animateVisibleAdminGrowthChart(true);
  } else {
    activateVisibleAdminCharts(false);
  }
};

const renderAdminPieChart = (container, legend, items) => {
  if (!container) return;
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      label: String((item && item.label) || 'Item'),
      value: Math.max(0, Number(item && item.value) || 0)
    }))
    .filter((item) => item.value >= 0);
  const total = normalizedItems.reduce((sum, item) => sum + item.value, 0);
  const nonZeroItems = normalizedItems.filter((item) => item.value > 0);

  if (!normalizedItems.length || total <= 0 || !nonZeroItems.length) {
    container.innerHTML = '<p class="admin-overview-chart-empty">Sem dados para exibir.</p>';
    if (legend) legend.innerHTML = '';
    return;
  }

  const svgSize = 260;
  const center = 130;
  const radius = 92;
  const ringWidth = 56;
  let cumulativeAngle = 180;

  const segmentsMarkup = nonZeroItems
    .map((item, index) => {
      const sliceAngle = (item.value / total) * 360;
      const color = ADMIN_OVERVIEW_PIE_COLORS[index % ADMIN_OVERVIEW_PIE_COLORS.length];
      if (sliceAngle >= 359.8) {
        cumulativeAngle += sliceAngle;
        return `
          <circle
            class="admin-overview-pie-segment"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            stroke="${color}"
            stroke-width="${ringWidth}"
            fill="none"
          ></circle>
        `;
      }

      const endAngle = cumulativeAngle + sliceAngle;
      const arcPath = buildDonutArcPath(center, center, radius, cumulativeAngle, endAngle);
      cumulativeAngle = endAngle;
      return `
        <path
          class="admin-overview-pie-segment"
          d="${arcPath}"
          stroke="${color}"
          stroke-width="${ringWidth}"
          fill="none"
        ></path>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="admin-overview-pie-circle">
      <svg viewBox="0 0 ${svgSize} ${svgSize}" class="admin-overview-pie-svg" role="img" aria-label="Distribuição por função">
        <circle cx="${center}" cy="${center}" r="${radius}" class="admin-overview-pie-track" stroke-width="${ringWidth}" fill="none"></circle>
        ${segmentsMarkup}
      </svg>
      <span class="admin-overview-pie-center">
        <strong>${escapeAdminCell(total)}</strong>
        <small>Total</small>
      </span>
    </div>
  `;

  if (legend) {
    legend.innerHTML = normalizedItems
      .map(
        (item, index) => `
          <article class="admin-overview-legend-item">
            <span class="admin-overview-legend-dot" style="background:${ADMIN_OVERVIEW_PIE_COLORS[index % ADMIN_OVERVIEW_PIE_COLORS.length]};"></span>
            <small>${escapeAdminCell(item.label)}</small>
            <strong>${escapeAdminCell(item.value)}</strong>
          </article>
        `
      )
      .join('');
  }
};

const renderAdminActivityChart = (container, rows) => {
  if (!container) return;
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) {
    container.innerHTML = '<p class="admin-overview-chart-empty">Sem dados para exibir.</p>';
    return;
  }

  const maxValue = Math.max(
    ...items.map((item) => Math.max(Number(item.activeUsers) || 0, Number(item.workouts) || 0)),
    1
  );

  container.innerHTML = `
    <div class="admin-overview-activity-bars">
      ${items
        .map((item) => {
          const active = Math.max(0, Number(item.activeUsers) || 0);
          const workouts = Math.max(0, Number(item.workouts) || 0);
          const activeHeight = Math.max(8, Math.round((active / maxValue) * 100));
          const workoutsHeight = Math.max(8, Math.round((workouts / maxValue) * 100));
          return `
            <article class="admin-overview-activity-day">
              <div class="admin-overview-activity-columns">
                <span class="admin-overview-activity-bar bar is-users" style="height:${activeHeight}%;" title="Usuários ativos: ${escapeAdminCell(active)}"></span>
                <span class="admin-overview-activity-bar bar is-workouts" style="height:${workoutsHeight}%;" title="Treinos realizados: ${escapeAdminCell(workouts)}"></span>
              </div>
              <small>${escapeAdminCell(item.label)}</small>
            </article>
          `;
        })
        .join('')}
    </div>
    <div class="admin-overview-activity-legend">
      <span><i class="is-users"></i>Usuários ativos</span>
      <span><i class="is-workouts"></i>Treinos realizados</span>
    </div>
  `;
};

const renderAdminGrowthChart = (container, series) => {
  if (!container) return;
  const labels = Array.isArray(series && series.labels) ? series.labels : [];
  const values = Array.isArray(series && series.values) ? series.values : [];
  if (labels.length < 2 || values.length < 2) {
    container.innerHTML = '<p class="admin-overview-chart-empty">Sem dados para exibir.</p>';
    return;
  }

  const maxValue = Math.max(...values, 1);
  const svgWidth = 680;
  const svgHeight = 220;
  const paddingX = 52;
  const topY = 24;
  const bottomY = 180;
  const chartHeight = bottomY - topY;
  const points = values.map((value, index) => {
    const x = index === 0 ? paddingX : svgWidth - paddingX;
    const y = topY + chartHeight - ((Math.max(0, Number(value) || 0) / maxValue) * chartHeight);
    return { x, y, value: Math.max(0, Number(value) || 0), label: labels[index] || '' };
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="admin-overview-growth-svg" role="img" aria-label="Crescimento mensal de usuários">
      <line x1="${paddingX}" y1="${bottomY}" x2="${svgWidth - paddingX}" y2="${bottomY}" class="admin-overview-growth-axis"></line>
      <polyline points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" class="admin-overview-growth-line"></polyline>
      ${points
        .map(
          (point) => `
            <g class="admin-overview-growth-node">
              <circle cx="${point.x}" cy="${point.y}" r="5.5" class="admin-overview-growth-point"></circle>
              <text x="${point.x}" y="${point.y - 12}" class="admin-overview-growth-value">${escapeAdminCell(point.value)}</text>
              <text x="${point.x}" y="${svgHeight - 12}" class="admin-overview-growth-label">${escapeAdminCell(point.label)}</text>
            </g>
          `
        )
        .join('')}
    </svg>
  `;
};

const renderAdminStatusBars = (container, items) => {
  if (!container) return;
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    container.innerHTML = '<p class="admin-overview-chart-empty">Sem dados para exibir.</p>';
    return;
  }

  const paletteByLabel = {
    ativos: '#22c55e',
    desabilitados: '#ef4444',
    'online agora': '#eab308'
  };
  const normalizedItems = safeItems.map((item) => ({
    label: String((item && item.label) || 'Item'),
    value: Math.max(0, Number(item && item.value) || 0)
  }));
  const maxValue = Math.max(...normalizedItems.map((item) => item.value), 1);

  container.innerHTML = normalizedItems
    .map((item) => {
      const color = paletteByLabel[String(item.label).trim().toLowerCase()] || '#3b82f6';
      const width = Math.max(0, Math.round((item.value / maxValue) * 100));
      return `
        <article class="admin-overview-status-row">
          <div class="admin-overview-status-label">
            <span class="admin-overview-status-dot" style="background:${color};"></span>
            <small>${escapeAdminCell(item.label)}</small>
            <strong>${escapeAdminCell(item.value)}</strong>
          </div>
          <div class="admin-overview-status-track">
            <span style="width:${width}%; background:${color};"></span>
          </div>
        </article>
      `;
    })
    .join('');
};

const setAdminOverviewMetaBadge = (target, text, tone = 'neutral') => {
  if (!(target instanceof HTMLElement)) return;
  target.textContent = String(text || '').trim();
  target.classList.remove('is-positive', 'is-negative', 'is-neutral');
  target.classList.add(
    tone === 'positive' ? 'is-positive' : tone === 'negative' ? 'is-negative' : 'is-neutral'
  );
};

const loadAdminWorkoutsPanelCollapsed = () => {
  try {
    return localStorage.getItem(ADMIN_WORKOUTS_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistAdminWorkoutsPanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(ADMIN_WORKOUTS_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncAdminWorkoutsPanelCollapseUi = () => {
  const isCollapsed = Boolean(adminWorkoutsPanelCollapsed);
  if (adminWorkoutsCard) adminWorkoutsCard.classList.toggle('is-collapsed', isCollapsed);
  if (adminWorkoutsBody) adminWorkoutsBody.hidden = isCollapsed;
  if (adminWorkoutsToggleButton) {
    adminWorkoutsToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    adminWorkoutsToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setAdminWorkoutsPanelCollapsed = (collapsed, { persist = true } = {}) => {
  adminWorkoutsPanelCollapsed = Boolean(collapsed);
  syncAdminWorkoutsPanelCollapseUi();
  if (persist) persistAdminWorkoutsPanelCollapsed(adminWorkoutsPanelCollapsed);
};

const toggleAdminWorkoutsPanelCollapsed = () => {
  setAdminWorkoutsPanelCollapsed(!adminWorkoutsPanelCollapsed);
};

const loadAdminExercisesPanelCollapsed = () => {
  try {
    return localStorage.getItem(ADMIN_EXERCISES_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistAdminExercisesPanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(ADMIN_EXERCISES_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncAdminExercisesPanelCollapseUi = () => {
  const isCollapsed = Boolean(adminExercisesPanelCollapsed);
  if (adminExercisesCard) adminExercisesCard.classList.toggle('is-collapsed', isCollapsed);
  if (adminExercisesBody) adminExercisesBody.hidden = isCollapsed;
  if (adminExercisesToggleButton) {
    adminExercisesToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    adminExercisesToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setAdminExercisesPanelCollapsed = (collapsed, { persist = true } = {}) => {
  adminExercisesPanelCollapsed = Boolean(collapsed);
  syncAdminExercisesPanelCollapseUi();
  if (persist) persistAdminExercisesPanelCollapsed(adminExercisesPanelCollapsed);
};

const toggleAdminExercisesPanelCollapsed = () => {
  setAdminExercisesPanelCollapsed(!adminExercisesPanelCollapsed);
};

const loadAdminSupportPanelCollapsed = () => {
  try {
    return localStorage.getItem(ADMIN_SUPPORT_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistAdminSupportPanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(ADMIN_SUPPORT_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncAdminSupportPanelCollapseUi = () => {
  const isCollapsed = Boolean(adminSupportPanelCollapsed);
  if (adminSupportCard) adminSupportCard.classList.toggle('is-collapsed', isCollapsed);
  if (adminSupportBody) adminSupportBody.hidden = isCollapsed;
  if (adminSupportToggleButton) {
    adminSupportToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    adminSupportToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setAdminSupportPanelCollapsed = (collapsed, { persist = true } = {}) => {
  adminSupportPanelCollapsed = Boolean(collapsed);
  syncAdminSupportPanelCollapseUi();
  if (persist) persistAdminSupportPanelCollapsed(adminSupportPanelCollapsed);
};

const toggleAdminSupportPanelCollapsed = () => {
  setAdminSupportPanelCollapsed(!adminSupportPanelCollapsed);
};

const syncAdminSupportViewUi = () => {
  adminSupportViewButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const buttonView = normalizeAdminSupportView(button.dataset.adminSupportView || '');
    const isActive = buttonView === adminSupportView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
};

const setAdminSupportView = (view, { rerender = true } = {}) => {
  adminSupportView = normalizeAdminSupportView(view);
  syncAdminSupportViewUi();
  if (rerender) renderAdminOverviewPanel();
};

const syncTrainerManagedWorkoutsViewUi = () => {
  trainerManagedWorkoutsViewButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const buttonView = normalizeTrainerManagedWorkoutsView(button.dataset.trainerManagedWorkoutsView || '');
    const isActive = buttonView === trainerManagedWorkoutsView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
};

const setTrainerManagedWorkoutsView = (view, { rerender = true } = {}) => {
  trainerManagedWorkoutsView = normalizeTrainerManagedWorkoutsView(view);
  syncTrainerManagedWorkoutsViewUi();
  if (rerender) renderTrainerManagementPanel();
};

const loadAdminTeamPanelCollapsed = () => {
  try {
    return localStorage.getItem(ADMIN_TEAM_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistAdminTeamPanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(ADMIN_TEAM_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncAdminTeamPanelCollapseUi = () => {
  const isCollapsed = Boolean(adminTeamPanelCollapsed);
  if (adminTeamCard) adminTeamCard.classList.toggle('is-collapsed', isCollapsed);
  if (adminTeamBody) adminTeamBody.hidden = isCollapsed;
  if (adminTeamToggleButton) {
    adminTeamToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    adminTeamToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setAdminTeamPanelCollapsed = (collapsed, { persist = true } = {}) => {
  adminTeamPanelCollapsed = Boolean(collapsed);
  syncAdminTeamPanelCollapseUi();
  if (persist) persistAdminTeamPanelCollapsed(adminTeamPanelCollapsed);
};

const toggleAdminTeamPanelCollapsed = () => {
  setAdminTeamPanelCollapsed(!adminTeamPanelCollapsed);
};

const loadTrainerTemplateCreatePanelCollapsed = () => {
  try {
    return localStorage.getItem(TRAINER_TEMPLATE_CREATE_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistTrainerTemplateCreatePanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(TRAINER_TEMPLATE_CREATE_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncTrainerTemplateCreatePanelCollapseUi = () => {
  const isCollapsed = Boolean(trainerTemplateCreatePanelCollapsed);
  if (trainerTemplateCreateCard) trainerTemplateCreateCard.classList.toggle('is-collapsed', isCollapsed);
  if (trainerTemplateCreateBody) trainerTemplateCreateBody.hidden = isCollapsed;
  if (trainerTemplateCreateToggleButton) {
    trainerTemplateCreateToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    trainerTemplateCreateToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setTrainerTemplateCreatePanelCollapsed = (collapsed, { persist = true } = {}) => {
  trainerTemplateCreatePanelCollapsed = Boolean(collapsed);
  syncTrainerTemplateCreatePanelCollapseUi();
  if (persist) persistTrainerTemplateCreatePanelCollapsed(trainerTemplateCreatePanelCollapsed);
};

const toggleTrainerTemplateCreatePanelCollapsed = () => {
  setTrainerTemplateCreatePanelCollapsed(!trainerTemplateCreatePanelCollapsed);
};

const loadTrainerWorkoutCreatePanelCollapsed = () => {
  try {
    return localStorage.getItem(TRAINER_WORKOUT_CREATE_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistTrainerWorkoutCreatePanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(TRAINER_WORKOUT_CREATE_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncTrainerWorkoutCreatePanelCollapseUi = () => {
  const isCollapsed = Boolean(trainerWorkoutCreatePanelCollapsed);
  if (trainerWorkoutCreateCard) trainerWorkoutCreateCard.classList.toggle('is-collapsed', isCollapsed);
  if (trainerWorkoutCreateBody) trainerWorkoutCreateBody.hidden = isCollapsed;
  if (trainerWorkoutCreateToggleButton) {
    trainerWorkoutCreateToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    trainerWorkoutCreateToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setTrainerWorkoutCreatePanelCollapsed = (collapsed, { persist = true } = {}) => {
  trainerWorkoutCreatePanelCollapsed = Boolean(collapsed);
  syncTrainerWorkoutCreatePanelCollapseUi();
  if (persist) persistTrainerWorkoutCreatePanelCollapsed(trainerWorkoutCreatePanelCollapsed);
};

const toggleTrainerWorkoutCreatePanelCollapsed = () => {
  setTrainerWorkoutCreatePanelCollapsed(!trainerWorkoutCreatePanelCollapsed);
};

const loadTrainerManagedWorkoutsPanelCollapsed = () => {
  try {
    return localStorage.getItem(TRAINER_MANAGED_WORKOUTS_PANEL_COLLAPSED_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

const persistTrainerManagedWorkoutsPanelCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(TRAINER_MANAGED_WORKOUTS_PANEL_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
  } catch (_) {}
};

const syncTrainerManagedWorkoutsPanelCollapseUi = () => {
  const isCollapsed = Boolean(trainerManagedWorkoutsPanelCollapsed);
  if (trainerManagedWorkoutsCard) trainerManagedWorkoutsCard.classList.toggle('is-collapsed', isCollapsed);
  if (trainerManagedWorkoutsBody) trainerManagedWorkoutsBody.hidden = isCollapsed;
  if (trainerManagedWorkoutsToggleButton) {
    trainerManagedWorkoutsToggleButton.textContent = isCollapsed ? 'Expandir caixa' : 'Minimizar caixa';
    trainerManagedWorkoutsToggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  }
};

const setTrainerManagedWorkoutsPanelCollapsed = (collapsed, { persist = true } = {}) => {
  trainerManagedWorkoutsPanelCollapsed = Boolean(collapsed);
  syncTrainerManagedWorkoutsPanelCollapseUi();
  if (persist) persistTrainerManagedWorkoutsPanelCollapsed(trainerManagedWorkoutsPanelCollapsed);
};

const toggleTrainerManagedWorkoutsPanelCollapsed = () => {
  setTrainerManagedWorkoutsPanelCollapsed(!trainerManagedWorkoutsPanelCollapsed);
};

const renderAdminOverviewPanel = () => {
  if (!adminOverviewPanel) return;
  syncTrainerWorkoutCreatePanelCollapseUi();
  syncAdminWorkoutsPanelCollapseUi();
  syncAdminExercisesPanelCollapseUi();
  syncAdminSupportPanelCollapseUi();
  syncAdminTeamPanelCollapseUi();

  const showPanelData = isGeneralAdminUser();
  applyRoleBasedUiMode();

  const stats = adminOverviewState.stats || {};
  const totalStudents = Math.max(0, Number(stats.alunos) || 0);
  const activeStudents = Math.max(0, Number(stats.alunosAtivos) || 0);
  const disabledStudents = Math.max(0, Number(stats.alunosDesabilitados) || 0);
  const activeStudentsPercent = totalStudents ? Math.round((activeStudents / totalStudents) * 100) : 0;
  const disabledStudentsPercent = totalStudents ? Math.round((disabledStudents / totalStudents) * 100) : 0;
  if (adminStatTotalUsers) adminStatTotalUsers.textContent = String(stats.totalUsers || 0);
  if (adminStatTotalWorkouts) adminStatTotalWorkouts.textContent = String(stats.totalWorkouts || 0);
  if (adminStatTotalExercises) adminStatTotalExercises.textContent = String(stats.totalExercises || 0);
  if (adminStatAlunos) adminStatAlunos.textContent = String(stats.alunos || 0);
  if (adminStatInstrutores) adminStatInstrutores.textContent = String(stats.instrutoresAtivos || 0);
  if (adminStatAdmins) adminStatAdmins.textContent = String(stats.administradores || 0);
  if (adminStatAdminGeral) adminStatAdminGeral.textContent = String(stats.administradoresGerais || 0);
  if (adminStatAlunosAtivos) adminStatAlunosAtivos.textContent = String(stats.alunosAtivos || 0);
  if (adminStatAlunosDesabilitados) {
    adminStatAlunosDesabilitados.textContent = String(stats.alunosDesabilitados || 0);
  }
  if (adminStatOnlineAgora) adminStatOnlineAgora.textContent = String(stats.onlineAgora || 0);
  setAdminOverviewMetaBadge(
    adminStatTotalUsersMeta,
    `${Math.max(0, Number(stats.totalUsersEnabled) || 0)} habilitados`,
    Number(stats.totalUsersEnabled) > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatTotalWorkoutsMeta,
    `${Math.max(0, Number(stats.totalWorkoutsAtivos) || 0)} ativos`,
    Number(stats.totalWorkoutsAtivos) > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatTotalExercisesMeta,
    `${Math.max(0, Number(stats.totalExercisesAtivos) || 0)} ativos`,
    Number(stats.totalExercisesAtivos) > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatAlunosMeta,
    `${activeStudents} ativos`,
    activeStudents > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatInstrutoresMeta,
    `${Math.max(0, Number(stats.instrutores) || 0)} cadastrados`,
    Number(stats.instrutoresAtivos) > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatAdminsMeta,
    `${Math.max(0, Number(stats.administradoresAtivos) || 0)} habilitados`,
    Number(stats.administradoresAtivos) > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatAdminGeralMeta,
    `${Math.max(0, Number(stats.administradoresGeraisAtivos) || 0)} habilitados`,
    Number(stats.administradoresGeraisAtivos) > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatAlunosAtivosMeta,
    `${activeStudentsPercent}% dos alunos`,
    activeStudentsPercent > 0 ? 'positive' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatAlunosDesabilitadosMeta,
    `${disabledStudentsPercent}% dos alunos`,
    disabledStudents > 0 ? 'negative' : 'neutral'
  );
  setAdminOverviewMetaBadge(
    adminStatOnlineAgoraMeta,
    `janela ${Math.max(1, Number(stats.janelaOnlineMinutos) || 5)} min`,
    Number(stats.onlineAgora) > 0 ? 'positive' : 'neutral'
  );

  if (showPanelData) {
    renderAdminPieChart(adminRoleChart, adminRoleLegend, adminOverviewState.charts.roleDistribution);
    renderAdminStatusBars(adminStudentStatusChart, adminOverviewState.charts.studentsStatus);

    const weeklyActivity = buildAdminWeeklyActivity(
      adminOverviewState.users,
      adminOverviewState.workouts,
      Number(stats.totalUsers) || 0
    );
    renderAdminActivityChart(adminActivityChart, weeklyActivity);

    const growthSeries = buildAdminGrowthSeries(adminOverviewState.users, Number(stats.totalUsers) || 0);
    renderAdminGrowthChart(adminGrowthChart, growthSeries);
    animateVisibleAdminGrowthChart(false);
    if (adminGrowthPercent) {
      const rawGrowth = Number(growthSeries.growthPercent) || 0;
      adminGrowthPercent.textContent = `${rawGrowth > 0 ? '+' : ''}${rawGrowth}%`;
    }
    if (adminGrowthTotal) {
      adminGrowthTotal.textContent = String(Math.max(0, Number(growthSeries.totalCurrent) || 0));
    }
  } else {
    renderAdminPieChart(adminRoleChart, adminRoleLegend, []);
    renderAdminStatusBars(adminStudentStatusChart, []);
    renderAdminActivityChart(adminActivityChart, []);
    renderAdminGrowthChart(adminGrowthChart, null);
    if (adminGrowthPercent) adminGrowthPercent.textContent = '0%';
    if (adminGrowthTotal) adminGrowthTotal.textContent = '0';
  }

  setAdminOverviewTab(adminOverviewState.activeTab || 'distribution');

  if (adminOverviewRefreshButton) {
    adminOverviewRefreshButton.disabled = adminOverviewState.loading;
    const buttonLabel = adminOverviewRefreshButton.querySelector('span');
    if (buttonLabel) {
      buttonLabel.textContent = adminOverviewState.loading ? 'Atualizando...' : 'Atualizar dados';
    } else {
      adminOverviewRefreshButton.textContent = adminOverviewState.loading ? 'Atualizando...' : 'Atualizar dados';
    }
  }

  setAdminOverviewFeedback(showPanelData ? adminOverviewState.error : '', false);

  if (adminUsersTableBody) {
    if (!showPanelData) {
      adminUsersTableBody.innerHTML = '<tr><td colspan="7">Acesso exclusivo do Administrador Geral.</td></tr>';
    } else if (!adminOverviewState.users.length) {
      adminUsersTableBody.innerHTML = '<tr><td colspan="7">Nenhum usuário encontrado.</td></tr>';
    } else {
      adminUsersTableBody.innerHTML = adminOverviewState.users
        .map((user) => `
          <tr>
            <td data-label="Nome">${escapeAdminCell(user.name || '-')}</td>
            <td data-label="E-mail">${escapeAdminCell(user.email || '-')}</td>
            <td data-label="Telefone">${escapeAdminCell(user.phone || '-')}</td>
            <td data-label="Função">
              <select
                class="admin-overview-role-select"
                data-admin-user-role-select
                data-user-id="${escapeAdminCell(user.id)}"
                data-current-role="${escapeAdminCell(normalizeRole(user.role))}"
                ${Number(user.id) === Number(studentData.userId) ? 'disabled' : ''}
              >
                ${ADMIN_ROLE_OPTIONS.map((role) => `
                  <option value="${escapeAdminCell(role)}" ${normalizeRole(user.role) === role ? 'selected' : ''}>
                    ${escapeAdminCell(getRoleLabel(role))}
                  </option>
                `).join('')}
              </select>
            </td>
            <td data-label="Status">
              <span class="admin-overview-status-badge ${user.isEnabled ? 'is-enabled' : 'is-disabled'}">
                ${user.isEnabled ? 'Habilitado' : 'Desabilitado'}
              </span>
            </td>
            <td data-label="Ações">
              ${normalizeRole(user.role) === 'ALUNO'
                ? `
                    <div class="admin-overview-actions-group">
                      <button
                        class="admin-overview-action-btn"
                        type="button"
                        data-admin-user-status-toggle
                        data-user-id="${escapeAdminCell(user.id)}"
                        data-next-enabled="${user.isEnabled ? 'false' : 'true'}"
                        ${Number(user.id) === Number(studentData.userId) ? 'disabled' : ''}
                      >
                        ${user.isEnabled ? 'Desabilitar' : 'Habilitar'}
                      </button>
                      ${!user.isEnabled
                        ? `
                            <button
                              class="admin-overview-action-btn admin-overview-action-icon-btn is-danger"
                              type="button"
                              data-admin-user-delete
                              data-user-id="${escapeAdminCell(user.id)}"
                              data-user-name="${escapeAdminCell(user.name || 'Usuário')}"
                              title="Excluir usuário"
                              aria-label="Excluir usuário ${escapeAdminCell(user.name || '')}"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-1 7h2v8H8v-8zm6 0h2v8h-2v-8zm-3 0h2v8h-2v-8zM6 20h12l1-12H5l1 12z"></path>
                              </svg>
                            </button>
                          `
                        : ''}
                    </div>
                  `
                : '<span class="admin-overview-action-muted">Somente aluno</span>'}
            </td>
            <td data-label="Criado em">${escapeAdminCell(formatAdminDate(user.createdAt))}</td>
          </tr>
        `)
        .join('');
    }
  }

  if (adminWorkoutsSearchInput) {
    const currentInputValue = String(adminWorkoutsSearchInput.value || '');
    if (currentInputValue !== String(adminOverviewWorkoutsSearchTerm || '')) {
      adminWorkoutsSearchInput.value = String(adminOverviewWorkoutsSearchTerm || '');
    }
  }

  const normalizedWorkoutsSearchRaw = normalizeText(adminOverviewWorkoutsSearchTerm || '').trim();
  const hasTodayKeywordInWorkoutSearch = normalizedWorkoutsSearchRaw.includes('hoje');
  const normalizedWorkoutsSearch = normalizedWorkoutsSearchRaw
    .replace(/\bhoje\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const todayDateKey = toDateKey(new Date());

  const resolveAdminWorkoutUserLabel = (rawName, rawId) => {
    const parsedName = String(rawName || '').trim();
    if (!parsedName) return `ID ${rawId || '-'}`;
    const collapsedName = normalizeText(parsedName).replace(/\s+/g, '');
    if (collapsedName === 'naoencontrado') return `ID ${rawId || '-'}`;
    return parsedName;
  };

  const workoutsForDisplay = (Array.isArray(adminOverviewState.workouts) ? adminOverviewState.workouts : [])
    .filter((workout) => (Number(workout && workout.id) || 0) > 0);

  const sortedAdminWorkouts = workoutsForDisplay
    .slice()
    .sort((first, second) => {
      const firstTitle = String((first && first.title) || '').trim();
      const secondTitle = String((second && second.title) || '').trim();
      const titleCompare = firstTitle.localeCompare(secondTitle, 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      });
      if (titleCompare !== 0) return titleCompare;

      const firstId = Number(first && first.id) || 0;
      const secondId = Number(second && second.id) || 0;
      if (firstId !== secondId) return firstId - secondId;

      const firstDate = parseAdminChartDate(first && first.createdAt);
      const secondDate = parseAdminChartDate(second && second.createdAt);
      const firstTime = firstDate ? firstDate.getTime() : 0;
      const secondTime = secondDate ? secondDate.getTime() : 0;
      return firstTime - secondTime;
    })
    .filter((workout) => {
      const createdAtDate = parseAdminChartDate(workout && workout.createdAt);
      const isTodayWorkout = createdAtDate
        ? toDateKey(createdAtDate) === todayDateKey
        : false;
      if (hasTodayKeywordInWorkoutSearch && !isTodayWorkout) return false;
      if (!normalizedWorkoutsSearch) return true;

      const studentLabel = resolveAdminWorkoutUserLabel(
        workout && workout.studentName,
        workout && workout.studentId
      );
      const instructorLabel = resolveAdminWorkoutUserLabel(
        workout && workout.instructorName,
        workout && workout.instructorId
      );
      const searchIndex = normalizeText([
        Number(workout && workout.id) || 0,
        String(workout && workout.title || ''),
        studentLabel,
        instructorLabel,
        formatAdminDate(workout && workout.createdAt)
      ].join(' '));
      return searchIndex.includes(normalizedWorkoutsSearch);
    });

  if (adminWorkoutsTableBody) {
    if (!showPanelData) {
      adminWorkoutsTableBody.innerHTML = '<tr><td colspan="6">Acesso exclusivo do Administrador Geral.</td></tr>';
    } else if (!workoutsForDisplay.length) {
      adminWorkoutsTableBody.innerHTML = '<tr><td colspan="6">Nenhum treino cadastrado.</td></tr>';
    } else if (!sortedAdminWorkouts.length) {
      adminWorkoutsTableBody.innerHTML = normalizedWorkoutsSearchRaw
        ? `<tr><td colspan="6">Nenhum treino encontrado para "${escapeAdminCell(adminOverviewWorkoutsSearchTerm)}".</td></tr>`
        : '<tr><td colspan="6">Nenhum treino encontrado com esse filtro.</td></tr>';
    } else {
      adminWorkoutsTableBody.innerHTML = sortedAdminWorkouts
        .map((workout) => {
          const studentLabel = resolveAdminWorkoutUserLabel(
            workout && workout.studentName,
            workout && workout.studentId
          );
          const instructorLabel = resolveAdminWorkoutUserLabel(
            workout && workout.instructorName,
            workout && workout.instructorId
          );
          const workoutId = Number(workout && workout.id) || 0;
          return `
            <tr>
              <td data-label="ID">${escapeAdminCell(workoutId)}</td>
              <td data-label="Título">${escapeAdminCell(workout.title || '-')}</td>
              <td data-label="Aluno">${escapeAdminCell(studentLabel)}</td>
              <td data-label="Instrutor">${escapeAdminCell(instructorLabel)}</td>
              <td data-label="Criado em">${escapeAdminCell(formatAdminDate(workout.createdAt))}</td>
              <td data-label="Ações">
                <div class="admin-overview-actions-group">
                  <button
                    class="admin-overview-action-btn"
                    type="button"
                    data-admin-workout-edit
                    data-workout-id="${escapeAdminCell(workoutId)}"
                    ${workoutId > 0 ? '' : 'disabled'}
                  >
                    Editar
                  </button>
                  <button
                    class="admin-overview-action-btn is-danger"
                    type="button"
                    data-admin-workout-delete
                    data-workout-id="${escapeAdminCell(workoutId)}"
                    ${workoutId > 0 ? '' : 'disabled'}
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  const allLibraryExercises = Array.isArray(adminOverviewState.exercises)
    ? adminOverviewState.exercises
    : [];

  if (adminExercisesSearchInput) {
    const currentInputValue = String(adminExercisesSearchInput.value || '');
    if (currentInputValue !== String(adminOverviewExercisesSearchTerm || '')) {
      adminExercisesSearchInput.value = String(adminOverviewExercisesSearchTerm || '');
    }
  }

  const availableGroupKeys = Array.from(
    new Set(
      allLibraryExercises
        .map((exercise) => getLibraryGroupKeyForAdmin(exercise))
        .filter(Boolean)
    )
  );
  const orderedKnownGroups = Object.keys(LIBRARY_GROUP_LABELS).filter((groupKey) =>
    availableGroupKeys.includes(groupKey)
  );
  const extraGroups = availableGroupKeys
    .filter((groupKey) => !orderedKnownGroups.includes(groupKey))
    .sort((a, b) => a.localeCompare(b));
  const groupOptions = [...orderedKnownGroups, ...extraGroups];

  if (adminExercisesGroupFilter) {
    const currentValue = String(adminOverviewExercisesGroupFilterValue || 'todos').trim().toLowerCase() || 'todos';
    const hasCurrentValue = currentValue === 'todos' || groupOptions.includes(currentValue);
    const safeValue = hasCurrentValue ? currentValue : 'todos';
    if (!hasCurrentValue) adminOverviewExercisesGroupFilterValue = 'todos';

    adminExercisesGroupFilter.innerHTML = [
      '<option value="todos">Todos os grupos</option>',
      ...groupOptions.map(
        (groupKey) =>
          `<option value="${escapeAdminCell(groupKey)}">${escapeAdminCell(
            getLibraryGroupLabelForAdmin(groupKey)
          )}</option>`
      ),
    ].join('');
    adminExercisesGroupFilter.value = safeValue;
  }

  const normalizedExerciseSearch = normalizeText(adminOverviewExercisesSearchTerm || '');
  const normalizedExerciseGroupFilter =
    String(adminOverviewExercisesGroupFilterValue || 'todos').trim().toLowerCase() || 'todos';

  const filteredLibraryExercises = allLibraryExercises
    .filter((exercise) => {
      const groupKey = getLibraryGroupKeyForAdmin(exercise);
      if (normalizedExerciseGroupFilter !== 'todos' && groupKey !== normalizedExerciseGroupFilter) {
        return false;
      }
      if (!normalizedExerciseSearch) return true;

      const exerciseId = Number(exercise && exercise.id) || 0;
      const exerciseName = String((exercise && exercise.name) || '').trim();
      const exerciseGroupLabel = getLibraryGroupLabelForAdmin(groupKey);
      const exerciseIdentification = buildAdminExerciseIdentification(exerciseId);
      const searchBlob = normalizeText(
        `${exerciseName} ${exerciseGroupLabel} ${groupKey} ${exerciseIdentification} ${exerciseId}`
      );
      return searchBlob.includes(normalizedExerciseSearch);
    })
    .sort((first, second) => (Number(second && second.id) || 0) - (Number(first && first.id) || 0));

  if (adminExercisesTableBody) {
    if (!showPanelData) {
      adminExercisesTableBody.innerHTML = '<tr><td colspan="8">Acesso exclusivo do Administrador Geral.</td></tr>';
    } else if (!allLibraryExercises.length) {
      adminExercisesTableBody.innerHTML = '<tr><td colspan="8">Nenhum exercício cadastrado na biblioteca.</td></tr>';
    } else if (!filteredLibraryExercises.length) {
      adminExercisesTableBody.innerHTML = '<tr><td colspan="8">Nenhum exercício encontrado para esse filtro.</td></tr>';
    } else {
      adminExercisesTableBody.innerHTML = filteredLibraryExercises
        .map((exercise) => {
          const exerciseId = Number(exercise && exercise.id) || 0;
          const exerciseName = String((exercise && exercise.name) || '').trim() || '-';
          const groupKey = getLibraryGroupKeyForAdmin(exercise);
          const groupLabel = getLibraryGroupLabelForAdmin(groupKey);
          const identification = buildAdminExerciseIdentification(exerciseId);
          const seriesCount = Math.max(
            1,
            Number(
              exercise &&
              (
                exercise.seriesCount !== undefined
                  ? exercise.seriesCount
                  : exercise.series !== undefined
                    ? exercise.series
                    : exercise.series_count
              )
            ) || 3
          );
          const repetitions = Math.max(1, Number(exercise && exercise.repetitions) || 10);
          const durationSeconds = Math.max(10, Number(exercise && exercise.durationSeconds) || 60);
          const restSeconds = Math.max(0, Number(exercise && exercise.restSeconds) || 30);
          const persistedCaloriesEstimate = Number(
            exercise &&
              (
                exercise.caloriesEstimate !== undefined
                  ? exercise.caloriesEstimate
                  : exercise.calories_estimate !== undefined
                    ? exercise.calories_estimate
                    : exercise.calories
              )
          );
          const caloriesEstimate =
            Number.isFinite(persistedCaloriesEstimate) && persistedCaloriesEstimate > 0
              ? Math.max(0, Math.round(persistedCaloriesEstimate))
              : estimateExerciseCalories({
                durationSeconds,
                repetitions,
                restSeconds,
                loadKg: Number(exercise && exercise.loadKg) || 0
              });
          const isActive = exercise && exercise.isActive !== false;
          const defaultsLabel = `${seriesCount} séries | ${repetitions} reps | ${formatSecondsLabel(durationSeconds)} | desc ${formatSecondsLabel(restSeconds)} | ${caloriesEstimate} kcal`;
          const statusActionMarkup = `
                <button
                  class="admin-overview-action-btn"
                  type="button"
                  data-admin-exercise-status-toggle
                  data-exercise-id="${escapeAdminCell(exerciseId)}"
                  data-next-active="${isActive ? 'false' : 'true'}"
                >
                  ${isActive ? 'Desabilitar' : 'Habilitar'}
                </button>
            `;
          const deleteActionMarkup = !isActive
            ? `
                  <button
                    class="admin-overview-action-btn admin-overview-action-icon-btn is-danger"
                    type="button"
                    data-admin-exercise-delete
                    data-exercise-id="${escapeAdminCell(exerciseId)}"
                    aria-label="Excluir exercício inativo"
                    title="Excluir exercício inativo"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-1 7h2v8H8v-8zm6 0h2v8h-2v-8zm-3 0h2v8h-2v-8zM6 20h12l1-12H5l1 12z"></path>
                    </svg>
                  </button>
              `
            : '';

          return `
            <tr>
              <td data-label="ID">${escapeAdminCell(exerciseId || '-')}</td>
              <td data-label="Exercício">${escapeAdminCell(exerciseName)}</td>
              <td data-label="Grupo">${escapeAdminCell(groupLabel)}</td>
              <td data-label="Identificação">
                <span class="admin-overview-identification-chip">${escapeAdminCell(identification)}</span>
              </td>
              <td data-label="Status">
                <span class="admin-overview-status-badge ${isActive ? 'is-enabled' : 'is-disabled'}">
                  ${isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td data-label="Padrão">${escapeAdminCell(defaultsLabel)}</td>
              <td data-label="Ações">
                <div class="admin-overview-actions-group">
                  <button
                    class="admin-overview-action-btn admin-overview-action-icon-btn"
                    type="button"
                    data-admin-exercise-view
                    data-exercise-id="${escapeAdminCell(exerciseId)}"
                    aria-label="Visualizar exercício ${escapeAdminCell(exerciseName)}"
                    title="Visualizar exercício"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"></circle>
                    </svg>
                  </button>
                  <button
                    class="admin-overview-action-btn admin-overview-action-icon-btn"
                    type="button"
                    data-admin-exercise-edit
                    data-exercise-id="${escapeAdminCell(exerciseId)}"
                    aria-label="Editar exercício ${escapeAdminCell(exerciseName)}"
                    title="Editar exercício"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m4 20 4.5-1 9.7-9.7a2.1 2.1 0 0 0 0-3L17.7 3.8a2.1 2.1 0 0 0-3 0L5 13.5 4 18Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                      <path d="M13.5 6.5 17.5 10.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                  </button>
                  ${statusActionMarkup}
                  ${deleteActionMarkup}
                </div>
              </td>
              <td data-label="Criado em">${escapeAdminCell(formatAdminDate(exercise && exercise.createdAt))}</td>
            </tr>
          `;
        })
        .join('');
    }
  }

  syncAdminSupportViewUi();
  if (adminSupportTableBody) {
    const supportTickets = Array.isArray(adminOverviewState.supportTickets)
      ? adminOverviewState.supportTickets
      : [];
    const showArchivedTickets = adminSupportView === 'archived';
    const filteredSupportTickets = supportTickets.filter((ticket) =>
      isSupportTicketArchived(ticket) === showArchivedTickets
    );

    if (!showPanelData) {
      adminSupportTableBody.innerHTML = '<tr><td colspan="7">Acesso exclusivo do Administrador Geral.</td></tr>';
    } else if (!filteredSupportTickets.length) {
      adminSupportTableBody.innerHTML = showArchivedTickets
        ? '<tr><td colspan="7">Nenhuma solicitação arquivada.</td></tr>'
        : '<tr><td colspan="7">Nenhuma solicitação encontrada.</td></tr>';
    } else {
      adminSupportTableBody.innerHTML = filteredSupportTickets
        .map((ticket) => {
          const ticketId = Number(ticket && ticket.id) || 0;
          const requesterName = getSupportTicketRequesterName(ticket);
          const requesterEmail = String((ticket && ticket.requesterEmail) || '-').trim() || '-';
          const subject = String((ticket && ticket.subject) || '-').trim() || '-';
          const status = normalizeSupportTicketStatus(ticket && ticket.status);
          const type = normalizeSupportTicketType(ticket && ticket.type);
          const isArchivedTicket = isSupportTicketArchived(ticket);
          const canApproveReset =
            !isArchivedTicket &&
            type === 'PASSWORD_RESET' &&
            (status === 'OPEN' || status === 'APPROVED');
          const canResolveOrReject =
            !isArchivedTicket &&
            (status === 'OPEN' || status === 'APPROVED');
          const canArchive =
            !isArchivedTicket &&
            (status === 'RESOLVED' || status === 'REJECTED');

          return `
            <tr>
              <td data-label="ID">#${escapeAdminCell(ticketId || '-')}</td>
              <td data-label="Tipo">${escapeAdminCell(getSupportTicketTypeLabel(type))}</td>
              <td data-label="Solicitante">
                ${escapeAdminCell(requesterName)}
                <small>${escapeAdminCell(requesterEmail)}</small>
              </td>
              <td data-label="Assunto">${escapeAdminCell(subject)}</td>
              <td data-label="Status">
                <span class="admin-overview-status-badge ${getSupportTicketStatusClass(status)}">
                  ${escapeAdminCell(getSupportTicketStatusLabel(status))}
                </span>
              </td>
              <td data-label="Criado em">${escapeAdminCell(formatAdminDate(ticket && ticket.createdAt))}</td>
              <td data-label="Ações">
                <div class="admin-overview-actions-group">
                  ${canApproveReset
                    ? `
                        <button
                          class="admin-overview-action-btn"
                          type="button"
                          data-admin-support-approve-reset
                          data-ticket-id="${escapeAdminCell(ticketId)}"
                          data-ticket-subject="${escapeAdminCell(subject)}"
                        >
                          Liberar reset
                        </button>
                      `
                    : ''}
                  ${canResolveOrReject
                    ? `
                        <button
                          class="admin-overview-action-btn"
                          type="button"
                          data-admin-support-resolve
                          data-ticket-id="${escapeAdminCell(ticketId)}"
                        >
                          Resolver
                        </button>
                        <button
                          class="admin-overview-action-btn is-danger"
                          type="button"
                          data-admin-support-reject
                          data-ticket-id="${escapeAdminCell(ticketId)}"
                        >
                          Rejeitar
                        </button>
                      `
                    : ''}
                  ${canArchive
                    ? `
                        <button
                          class="admin-overview-action-btn"
                          type="button"
                          data-admin-support-archive
                          data-ticket-id="${escapeAdminCell(ticketId)}"
                        >
                          Arquivar
                        </button>
                      `
                    : ''}
                  ${!canApproveReset && !canResolveOrReject && !canArchive
                    ? `<span class="admin-overview-action-muted">${isArchivedTicket ? 'Arquivado' : 'Sem ações'}</span>`
                    : ''}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }
};

const fetchAdminOverview = async (forceReload = false) => {
  if (!isGeneralAdminUser()) {
    resetAdminOverviewState();
    renderAdminOverviewPanel();
    return null;
  }

  if (adminOverviewState.loading) return null;
  if (adminOverviewState.loaded && !forceReload) {
    renderAdminOverviewPanel();
    return adminOverviewState;
  }

  adminOverviewState.loading = true;
  adminOverviewState.error = '';
  renderAdminOverviewPanel();

  try {
    const response = await requestStudentApi('/admin/overview');
    const overview = response && response.overview ? response.overview : {};
    let libraryExercises = [];
    let libraryLoadError = '';
    let supportTickets = Array.isArray(overview && overview.supportTickets)
      ? overview.supportTickets
      : [];

    try {
      const libraryResponse = await requestStudentApi('/library/exercises?includeInactive=true');
      libraryExercises = Array.isArray(libraryResponse && libraryResponse.exercises)
        ? libraryResponse.exercises
        : [];
    } catch (libraryError) {
      libraryLoadError = libraryError && libraryError.message
        ? libraryError.message
        : 'Não foi possível carregar os exercícios da biblioteca.';
      libraryExercises = [];
    }

    try {
      const supportResponse = await requestStudentApi('/admin/support-tickets?archived=all&limit=500');
      supportTickets = Array.isArray(supportResponse && supportResponse.tickets)
        ? supportResponse.tickets
        : supportTickets;
    } catch (_) {
      supportTickets = Array.isArray(supportTickets) ? supportTickets : [];
    }

    adminOverviewState.stats = {
      totalUsers: Number(overview.stats && overview.stats.totalUsers) || 0,
      totalUsersEnabled: Number(overview.stats && overview.stats.totalUsersEnabled) || 0,
      totalWorkouts: Number(overview.stats && overview.stats.totalWorkouts) || 0,
      totalWorkoutsAtivos: Number(overview.stats && overview.stats.totalWorkoutsAtivos) || 0,
      totalWorkoutsInativos: Number(overview.stats && overview.stats.totalWorkoutsInativos) || 0,
      totalExercises:
        Number(overview.stats && (
          overview.stats.totalExercises !== undefined
            ? overview.stats.totalExercises
            : overview.stats.totalLibraryExercises
        )) || libraryExercises.length,
      totalExercisesAtivos:
        Number(overview.stats && overview.stats.totalExercisesAtivos) ||
        libraryExercises.filter((exercise) => exercise && exercise.isActive !== false).length,
      totalExercisesInativos:
        Number(overview.stats && overview.stats.totalExercisesInativos) ||
        libraryExercises.filter((exercise) => exercise && exercise.isActive === false).length,
      alunos: Number(overview.stats && overview.stats.alunos) || 0,
      instrutores: Number(overview.stats && overview.stats.instrutores) || 0,
      instrutoresAtivos:
        Number(overview.stats && overview.stats.instrutoresAtivos) ||
        (Array.isArray(overview.users)
          ? overview.users.filter((user) => normalizeRole(user && user.role) === 'INSTRUTOR' && user.isEnabled).length
          : 0),
      administradores: Number(overview.stats && overview.stats.administradores) || 0,
      administradoresAtivos:
        Number(overview.stats && overview.stats.administradoresAtivos) ||
        (Array.isArray(overview.users)
          ? overview.users.filter((user) => normalizeRole(user && user.role) === 'ADMIN' && user.isEnabled).length
          : 0),
      administradoresGerais: Number(overview.stats && overview.stats.administradoresGerais) || 0,
      administradoresGeraisAtivos:
        Number(overview.stats && overview.stats.administradoresGeraisAtivos) ||
        (Array.isArray(overview.users)
          ? overview.users.filter((user) => normalizeRole(user && user.role) === 'ADMIN_GERAL' && user.isEnabled).length
          : 0),
      alunosAtivos: Number(overview.stats && overview.stats.alunosAtivos) || 0,
      alunosDesabilitados: Number(overview.stats && overview.stats.alunosDesabilitados) || 0,
      onlineAgora: Number(overview.stats && overview.stats.onlineAgora) || 0,
      alunosOnlineAgora: Number(overview.stats && overview.stats.alunosOnlineAgora) || 0,
      janelaOnlineMinutos: Number(overview.stats && overview.stats.janelaOnlineMinutos) || 5,
      supportTicketsPendentes:
        Number(overview.stats && overview.stats.supportTicketsPendentes) ||
        supportTickets.filter((ticket) => normalizeSupportTicketStatus(ticket && ticket.status) === 'OPEN').length,
      supportResetPendentes:
        Number(overview.stats && overview.stats.supportResetPendentes) ||
        supportTickets.filter(
          (ticket) =>
            normalizeSupportTicketStatus(ticket && ticket.status) === 'OPEN' &&
            normalizeSupportTicketType(ticket && ticket.type) === 'PASSWORD_RESET'
        ).length
    };
    adminOverviewState.charts = {
      roleDistribution: Array.isArray(overview.charts && overview.charts.roleDistribution)
        ? overview.charts.roleDistribution
        : [],
      studentsStatus: Array.isArray(overview.charts && overview.charts.studentsStatus)
        ? overview.charts.studentsStatus
        : []
    };
    adminOverviewState.users = Array.isArray(overview.users) ? overview.users : [];
    adminOverviewState.workouts = Array.isArray(overview.workouts) ? overview.workouts : [];
    adminOverviewState.exercises = libraryExercises;
    adminOverviewState.supportTickets = Array.isArray(supportTickets) ? supportTickets : [];
    adminOverviewState.loaded = true;
    adminOverviewState.error = libraryLoadError;
  } catch (error) {
    adminOverviewState.error = error && error.message
      ? error.message
      : 'Não foi possível carregar os dados administrativos.';
    adminOverviewState.exercises = [];
    adminOverviewState.supportTickets = [];
  } finally {
    adminOverviewState.loading = false;
    renderAdminOverviewPanel();
  }

  return adminOverviewState;
};

const updateAdminUserRole = async (userId, role) => {
  const response = await requestStudentApi(`/admin/users/${encodeURIComponent(String(userId))}/role`, {
    method: 'PATCH',
    body: { role }
  });

  return response;
};

const updateAdminUserStatus = async (userId, isEnabled) => {
  const response = await requestStudentApi(`/admin/users/${encodeURIComponent(String(userId))}/status`, {
    method: 'PATCH',
    body: { isEnabled: Boolean(isEnabled) }
  });

  return response;
};

const deleteAdminDisabledUser = async (userId, adminPassword) => {
  const response = await requestStudentApi(`/admin/users/${encodeURIComponent(String(userId))}`, {
    method: 'DELETE',
    body: { adminPassword: String(adminPassword || '') }
  });

  return response;
};

const approveAdminSupportReset = async (ticketId, adminResponse = '') => {
  const response = await requestStudentApi(
    `/admin/support-tickets/${encodeURIComponent(String(ticketId))}/approve-password-reset`,
    {
      method: 'POST',
      body: { adminResponse: String(adminResponse || '').trim() }
    }
  );
  return response;
};

const updateAdminSupportTicketStatus = async (ticketId, status, adminResponse = '') => {
  const response = await requestStudentApi(
    `/admin/support-tickets/${encodeURIComponent(String(ticketId))}/status`,
    {
      method: 'PATCH',
      body: {
        status: String(status || '').trim().toUpperCase(),
        adminResponse: String(adminResponse || '').trim()
      }
    }
  );
  return response;
};

const archiveAdminSupportTicket = async (ticketId) => {
  const response = await requestStudentApi(
    `/admin/support-tickets/${encodeURIComponent(String(ticketId))}/archive`,
    {
      method: 'PATCH'
    }
  );
  return response;
};

const fetchPublicSiteTeamMembers = async () => {
  const response = await requestStudentApi('/site-content/team');
  return Array.isArray(response && response.members) ? response.members : [];
};

const updateAdminSiteTeamMembers = async (members = []) => {
  const response = await requestStudentApi('/admin/site-content/team', {
    method: 'PATCH',
    body: {
      members: Array.isArray(members) ? members : []
    }
  });
  return Array.isArray(response && response.members) ? response.members : [];
};

const deleteAdminLibraryExercise = async (exerciseId) => {
  const response = await requestStudentApi(
    `/library/exercises/${encodeURIComponent(String(exerciseId))}`,
    { method: 'DELETE' }
  );

  return response;
};

const updateAdminLibraryExercise = async (exerciseId, payload = {}) => {
  const response = await requestStudentApi(`/library/exercises/${encodeURIComponent(String(exerciseId))}`, {
    method: 'PUT',
    body: payload
  });

  return response;
};

const setAdminLibraryExerciseStatus = async (exerciseId, isActive) => {
  const response = await requestStudentApi(
    `/library/exercises/${encodeURIComponent(String(exerciseId))}/status`,
    {
      method: 'PATCH',
      body: { isActive: Boolean(isActive) }
    }
  );

  return response;
};

const exportAdminOverviewPdf = async () => {
  if (!isGeneralAdminUser()) return;

  try {
    await ensureAdminPdfLibraries();
  } catch (_) {
    setAdminOverviewFeedback('Não foi possível carregar o gerador de PDF.', false);
    return;
  }

  const jsPdfLib = window.jspdf;
  if (!jsPdfLib || typeof jsPdfLib.jsPDF !== 'function') {
    setAdminOverviewFeedback('Não foi possível carregar o gerador de PDF.', false);
    return;
  }

  const stats = adminOverviewState.stats || {};
  const users = Array.isArray(adminOverviewState.users) ? adminOverviewState.users : [];
  const workouts = Array.isArray(adminOverviewState.workouts) ? adminOverviewState.workouts : [];
  const supportTickets = Array.isArray(adminOverviewState.supportTickets)
    ? adminOverviewState.supportTickets
    : [];
  const generatedAt = new Date();
  const fileNameDate = generatedAt.toISOString().slice(0, 10);

  try {
    const { jsPDF } = jsPdfLib;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let cursorY = 44;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatorio - Painel do Administrador Geral', marginX, cursorY);
    cursorY += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(82, 92, 114);
    doc.text(`Gerado em: ${generatedAt.toLocaleString('pt-BR')}`, marginX, cursorY);
    doc.setTextColor(20, 24, 35);
    cursorY += 22;

    const statsLines = [
      ['Total de usuarios', stats.totalUsers || 0],
      ['Treinos criados', stats.totalWorkouts || 0],
      ['Exercicios cadastrados', stats.totalExercises || 0],
      ['Alunos cadastrados', stats.alunos || 0],
      ['Instrutores ativos', stats.instrutoresAtivos || 0],
      ['Administradores', stats.administradores || 0],
      ['Admin geral', stats.administradoresGerais || 0],
      ['Alunos ativos', stats.alunosAtivos || 0],
      ['Alunos desabilitados', stats.alunosDesabilitados || 0],
      ['Online agora', stats.onlineAgora || 0]
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumo geral', marginX, cursorY);
    cursorY += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const colGap = 260;
    statsLines.forEach((item, index) => {
      const column = index < 5 ? 0 : 1;
      const row = column === 0 ? index : index - 5;
      const x = marginX + column * colGap;
      const y = cursorY + row * 14;
      doc.text(`${item[0]}: ${item[1]}`, x, y);
    });
    cursorY += 84;

    const supportStatusCounts = {
      open: supportTickets.filter((ticket) => normalizeSupportTicketStatus(ticket && ticket.status) === 'OPEN').length,
      resolved: supportTickets.filter((ticket) => {
        const status = normalizeSupportTicketStatus(ticket && ticket.status);
        return status === 'RESOLVED' || status === 'APPROVED';
      }).length,
      rejected: supportTickets.filter((ticket) => normalizeSupportTicketStatus(ticket && ticket.status) === 'REJECTED').length,
      archived: supportTickets.filter((ticket) => isSupportTicketArchived(ticket)).length
    };
    const supportTypeCounts = Array.from(
      supportTickets.reduce((accumulator, ticket) => {
        const typeLabel = getSupportTicketTypeLabel(ticket && ticket.type);
        accumulator.set(typeLabel, (accumulator.get(typeLabel) || 0) + 1);
        return accumulator;
      }, new Map())
    )
      .sort((first, second) => {
        if (second[1] !== first[1]) return second[1] - first[1];
        return String(first[0]).localeCompare(String(second[0]), 'pt-BR', { sensitivity: 'base' });
      })
      .slice(0, 6);
    const supportSummaryLines = [
      ['Total de chamados', supportTickets.length],
      ['Chamados em aberto', supportStatusCounts.open],
      ['Resolvidos / liberados', supportStatusCounts.resolved],
      ['Rejeitados', supportStatusCounts.rejected],
      ['Arquivados', supportStatusCounts.archived]
    ];
    const supportTypeLines = supportTypeCounts.length
      ? supportTypeCounts.map(([label, total]) => [`Tipo: ${label}`, total])
      : [['Tipos de chamado', 0]];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Chamados de suporte', marginX, cursorY);
    cursorY += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const supportRows = Math.max(supportSummaryLines.length, supportTypeLines.length);
    for (let index = 0; index < supportRows; index += 1) {
      const leftItem = supportSummaryLines[index] || null;
      const rightItem = supportTypeLines[index] || null;
      const y = cursorY + index * 14;
      if (leftItem) {
        doc.text(`${leftItem[0]}: ${leftItem[1]}`, marginX, y);
      }
      if (rightItem) {
        doc.text(`${rightItem[0]}: ${rightItem[1]}`, marginX + colGap, y);
      }
    }
    cursorY += supportRows * 14 + 18;

    const hasAutoTable = typeof doc.autoTable === 'function';
    if (hasAutoTable) {
      doc.autoTable({
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['Nome', 'E-mail', 'Telefone', 'Funcao', 'Status', 'Criado em']],
        body: users.length
          ? users.map((user) => [
              user.name || '-',
              user.email || '-',
              user.phone || '-',
              getRoleLabel(user.role),
              user.isEnabled ? 'Habilitado' : 'Desabilitado',
              formatAdminDate(user.createdAt)
            ])
          : [['Nenhum usuario encontrado.', '', '', '', '', '']],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [25, 50, 98], textColor: 255 },
        didDrawPage: () => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('Usuarios cadastrados', marginX, cursorY - 6);
        }
      });

      const usersEndY = Number(doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY + 120;
      cursorY = usersEndY + 26;

      doc.autoTable({
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['ID', 'Titulo', 'Aluno', 'Instrutor', 'Criado em']],
        body: workouts.length
          ? workouts.map((workout) => [
              workout.id || '-',
              workout.title || '-',
              workout.studentName || '-',
              workout.instructorName || '-',
              formatAdminDate(workout.createdAt)
            ])
          : [['Nenhum treino cadastrado.', '', '', '', '']],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [16, 130, 72], textColor: 255 },
        didDrawPage: () => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('Treinos cadastrados', marginX, cursorY - 6);
        }
      });

      const workoutsEndY = Number(doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY + 120;
      cursorY = workoutsEndY + 26;

      doc.autoTable({
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['ID', 'Tipo', 'Solicitante', 'Status', 'Arquivado', 'Criado em']],
        body: supportTickets.length
          ? supportTickets.map((ticket) => [
              `#${Number(ticket && ticket.id) || '-'}`,
              getSupportTicketTypeLabel(ticket && ticket.type),
              getSupportTicketRequesterName(ticket),
              getSupportTicketStatusLabel(ticket && ticket.status),
              isSupportTicketArchived(ticket) ? 'Sim' : 'Nao',
              formatAdminDate(ticket && ticket.createdAt)
            ])
          : [['Nenhum chamado encontrado.', '', '', '', '', '']],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [176, 117, 10], textColor: 255 },
        didDrawPage: () => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('Chamados de suporte', marginX, cursorY - 6);
        }
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Usuarios cadastrados', marginX, cursorY);
      cursorY += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const userPreview = users.slice(0, 18);
      userPreview.forEach((user) => {
        if (cursorY > 760) {
          doc.addPage();
          cursorY = 44;
        }
        doc.text(
          `${user.name || '-'} | ${user.email || '-'} | ${getRoleLabel(user.role)} | ${
            user.isEnabled ? 'Habilitado' : 'Desabilitado'
          }`,
          marginX,
          cursorY
        );
        cursorY += 12;
      });
      cursorY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Treinos cadastrados', marginX, cursorY);
      cursorY += 14;
      doc.setFont('helvetica', 'normal');
      const workoutPreview = workouts.slice(0, 22);
      workoutPreview.forEach((workout) => {
        if (cursorY > 760) {
          doc.addPage();
          cursorY = 44;
        }
        doc.text(
          `${workout.id || '-'} | ${workout.title || '-'} | ${workout.studentName || '-'} | ${
            workout.instructorName || '-'
          }`,
          marginX,
          cursorY
        );
        cursorY += 12;
      });
      cursorY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Chamados de suporte', marginX, cursorY);
      cursorY += 14;
      doc.setFont('helvetica', 'normal');
      const supportPreview = supportTickets.slice(0, 22);
      supportPreview.forEach((ticket) => {
        if (cursorY > 760) {
          doc.addPage();
          cursorY = 44;
        }
        doc.text(
          `#${Number(ticket && ticket.id) || '-'} | ${getSupportTicketTypeLabel(ticket && ticket.type)} | ${
            getSupportTicketRequesterName(ticket)
          } | ${getSupportTicketStatusLabel(ticket && ticket.status)} | ${
            isSupportTicketArchived(ticket) ? 'Arquivado' : 'Ativo'
          }`,
          marginX,
          cursorY
        );
        cursorY += 12;
      });
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(106, 114, 136);
    doc.text('DNA Monster Fitness', pageWidth - marginX, 810, { align: 'right' });
    doc.save(`relatorio-admin-geral-${fileNameDate}.pdf`);
    setAdminOverviewFeedback('Relatório PDF gerado com sucesso.', true);
  } catch (error) {
    setAdminOverviewFeedback('Falha ao gerar o relatório em PDF.', false);
  }
};

const resetTrainerManagementState = () => {
  trainerManagementState.loading = false;
  trainerManagementState.loaded = false;
  trainerManagementState.error = '';
  trainerManagementState.students = [];
  trainerManagementState.instructors = [];
  trainerManagementState.templates = [];
  trainerManagementState.workouts = [];
  trainerManagementState.library = [];
  trainerManagementState.exercisesByWorkoutId = {};
  trainerManagementState.templateExercisesByTemplateId = {};
  trainerExerciseSearchTerm = '';
  trainerTemplateEditorSelectedId = '';
  trainerTemplateExerciseSelectedId = '';
  trainerExerciseComposerSelectedId = '';
  trainerWorkoutStudentConfirmed = false;
  trainerWorkoutEditingId = 0;
  trainerWorkoutExerciseEditingState = null;
  trainerManagedWorkoutsView = 'assigned';
  syncTrainerManagedWorkoutsViewUi();
  trainerManagedWorkoutBaselineIds.clear();
  trainerManagedWorkoutBaselineCaptured = false;
};

const resetTrainerProgressState = () => {
  trainerProgressState.loading = false;
  trainerProgressState.loaded = false;
  trainerProgressState.error = '';
  trainerProgressState.weekStartKey = '';
  trainerProgressState.weekEndKey = '';
  trainerProgressState.referenceDateKey = '';
  trainerProgressState.stats = {
    totalStudents: 0,
    totalAssignedWorkouts: 0,
    totalCompletedSessions: 0
  };
  trainerProgressState.students = [];
  trainerProgressState.selectedStudentId = 0;
};

const requestInstructorWorkoutsList = async ({ includeInactive = true } = {}) => {
  const querySuffix = includeInactive ? '?includeInactive=true' : '';
  const fallbackPaths = [
    `/instructor/workouts${querySuffix}`,
    '/workouts/my'
  ];

  const collectedWorkouts = [];
  let hasSuccessfulResponse = false;
  let lastError = null;
  for (const path of fallbackPaths) {
    try {
      const response = await requestStudentApi(path);
      hasSuccessfulResponse = true;
      const workouts = extractWorkoutsFromResponse(response);
      if (workouts.length) {
        collectedWorkouts.push(...workouts);
      }
    } catch (error) {
      if (isApiRouteNotFoundError(error)) {
        continue;
      }
      lastError = error;
    }
  }

  if (collectedWorkouts.length) {
    const uniqueWorkoutsById = new Map();
    collectedWorkouts.forEach((workout, index) => {
      const workoutId = Number(workout && workout.id) || Number(workout && workout.workoutId) || 0;
      const key = workoutId > 0 ? `id:${workoutId}` : `idx:${index}`;
      if (!uniqueWorkoutsById.has(key)) {
        uniqueWorkoutsById.set(key, workout);
      }
    });
    return { workouts: Array.from(uniqueWorkoutsById.values()) };
  }

  if (hasSuccessfulResponse) {
    return { workouts: [] };
  }

  throw lastError || new Error('Não foi possível carregar a lista de treinos.');
};

const resolveCreatedWorkoutIdFromResponse = (response) => {
  const candidateIds = [
    response && response.workout && response.workout.id,
    response && response.workoutId,
    response && response.id,
    response && response.data && response.data.workout && response.data.workout.id,
    response && response.data && response.data.workoutId,
    response && response.data && response.data.id,
    response && response.result && response.result.workout && response.result.workout.id,
    response && response.result && response.result.workoutId,
    response && response.result && response.result.id
  ];

  for (const candidate of candidateIds) {
    const parsed = Number(candidate) || 0;
    if (parsed > 0) return parsed;
  }

  return 0;
};

const findTrainerWorkoutIdByTitle = (title, { studentId = 0 } = {}) => {
  const normalizedTitle = normalizeText(String(title || '').trim());
  if (!normalizedTitle) return 0;

  const workouts = Array.isArray(trainerManagementState.workouts)
    ? trainerManagementState.workouts
    : [];

  const matchedWorkouts = getTrainerVisibleWorkouts(workouts)
    .filter((workout) => {
      const workoutName = normalizeText(
        String((workout && (workout.title || workout.name)) || '').trim()
      );
      if (!workoutName || workoutName !== normalizedTitle) return false;
      if (!studentId) return true;
      return Number(workout && workout.studentId) === Number(studentId);
    })
    .sort((first, second) => (Number(first && first.id) || 0) - (Number(second && second.id) || 0));

  const lastMatch = matchedWorkouts[matchedWorkouts.length - 1] || null;
  return Number(lastMatch && lastMatch.id) || 0;
};

const requestInstructorWorkoutCreate = async (body) => {
  try {
    return await requestStudentApi('/instructor/workouts', {
      method: 'POST',
      body
    });
  } catch (error) {
    if (!isApiRouteNotFoundError(error)) throw error;
    return requestStudentApi('/workouts', {
      method: 'POST',
      body
    });
  }
};

const requestInstructorWorkoutUpdate = async ({ workoutId, body }) => {
  const normalizedWorkoutId = Number(workoutId) || 0;
  if (!normalizedWorkoutId) {
    throw new Error('Treino inválido para atualização.');
  }

  try {
    return await requestStudentApi(
      `/instructor/workouts/${encodeURIComponent(String(normalizedWorkoutId))}`,
      {
        method: 'PATCH',
        body
      }
    );
  } catch (error) {
    if (!isApiRouteNotFoundError(error)) throw error;
    return requestStudentApi(
      `/workouts/${encodeURIComponent(String(normalizedWorkoutId))}`,
      {
        method: 'PATCH',
        body
      }
    );
  }
};

const requestInstructorWorkoutDeactivate = async (workoutId, { workout = null } = {}) => {
  const normalizedWorkoutId = Number(workoutId) || 0;
  if (!normalizedWorkoutId) {
    throw new Error('Treino inválido para desativação.');
  }

  const encodedWorkoutId = encodeURIComponent(String(normalizedWorkoutId));
  const workoutTitle = String(
    (workout && (workout.title || workout.name)) || `Treino ${normalizedWorkoutId}`
  ).trim() || `Treino ${normalizedWorkoutId}`;
  const workoutObjective = String(
    (workout && (workout.objective || workout.objetivo)) || 'Hipertrofia'
  ).trim() || 'Hipertrofia';

  const deactivateBodies = [
    { isActive: false, status: 'INATIVO' },
    { status: 'INATIVO' },
    { isActive: false },
    {
      title: workoutTitle,
      objective: workoutObjective,
      status: 'INATIVO',
      isActive: false
    },
    {
      title: workoutTitle,
      objective: workoutObjective,
      status: 'INATIVO'
    }
  ];

  const attempts = [
    () =>
      requestStudentApi(
        `/instructor/workouts/${encodedWorkoutId}/deactivate`,
        { method: 'PATCH' }
      ),
    () =>
      requestStudentApi(
        `/instructor/workouts/${encodedWorkoutId}/deactivate`,
        { method: 'POST' }
      ),
    () =>
      requestStudentApi(
        `/workouts/${encodedWorkoutId}/deactivate`,
        { method: 'PATCH' }
      ),
    () =>
      requestStudentApi(
        `/workouts/${encodedWorkoutId}/deactivate`,
        { method: 'POST' }
      ),
    () => requestInstructorWorkoutUpdate({ workoutId: normalizedWorkoutId, body: deactivateBodies[0] }),
    () => requestInstructorWorkoutUpdate({ workoutId: normalizedWorkoutId, body: deactivateBodies[1] }),
    () => requestInstructorWorkoutUpdate({ workoutId: normalizedWorkoutId, body: deactivateBodies[2] }),
    () => requestInstructorWorkoutUpdate({ workoutId: normalizedWorkoutId, body: deactivateBodies[3] }),
    () => requestInstructorWorkoutUpdate({ workoutId: normalizedWorkoutId, body: deactivateBodies[4] }),
    () =>
      requestStudentApi(
        `/instructor/workouts/${encodedWorkoutId}`,
        {
          method: 'PATCH',
          body: { isActive: false, status: 'INATIVO' }
        }
      ),
    () =>
      requestStudentApi(
        `/workouts/${encodedWorkoutId}`,
        {
          method: 'PATCH',
          body: { isActive: false, status: 'INATIVO' }
        }
      )
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Falha ao desativar treino.');
};

const requestInstructorWorkoutDelete = async (workoutId) => {
  const normalizedWorkoutId = Number(workoutId) || 0;
  if (!normalizedWorkoutId) {
    throw new Error('Treino inválido para exclusão.');
  }

  try {
    return await requestStudentApi(
      `/instructor/workouts/${encodeURIComponent(String(normalizedWorkoutId))}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    if (!isApiRouteNotFoundError(error)) throw error;
    return requestStudentApi(
      `/workouts/${encodeURIComponent(String(normalizedWorkoutId))}`,
      { method: 'DELETE' }
    );
  }
};

const requestWorkoutTemplateUpdate = async ({ templateId, body }) => {
  const normalizedTemplateId = Number(templateId) || 0;
  if (!normalizedTemplateId) {
    throw new Error('Nomeclatura de treino inválida para atualização.');
  }

  return requestStudentApi(
    `/workouts/templates/${encodeURIComponent(String(normalizedTemplateId))}`,
    {
      method: 'PATCH',
      body
    }
  );
};

const requestWorkoutTemplateDeactivate = async (templateId) => {
  return requestWorkoutTemplateUpdate({
    templateId,
    body: { isActive: false }
  });
};

const requestWorkoutTemplateDelete = async (templateId) => {
  const normalizedTemplateId = Number(templateId) || 0;
  if (!normalizedTemplateId) {
    throw new Error('Nomeclatura de treino inválida para exclusão.');
  }

  return requestStudentApi(
    `/workouts/templates/${encodeURIComponent(String(normalizedTemplateId))}`,
    { method: 'DELETE' }
  );
};

const requestWorkoutTemplateExerciseUpdate = async ({ templateId, templateExerciseId, body }) => {
  const normalizedTemplateId = Number(templateId) || 0;
  const normalizedTemplateExerciseId = Number(templateExerciseId) || 0;
  if (!normalizedTemplateId || !normalizedTemplateExerciseId) {
    throw new Error('Exercício da nomeclatura inválido para atualização.');
  }

  return requestStudentApi(
    `/workouts/templates/${encodeURIComponent(String(normalizedTemplateId))}/exercises/${encodeURIComponent(String(normalizedTemplateExerciseId))}`,
    {
      method: 'PATCH',
      body
    }
  );
};

const requestWorkoutTemplateExerciseDelete = async ({ templateId, templateExerciseId }) => {
  const normalizedTemplateId = Number(templateId) || 0;
  const normalizedTemplateExerciseId = Number(templateExerciseId) || 0;
  if (!normalizedTemplateId || !normalizedTemplateExerciseId) {
    throw new Error('Exercício da nomeclatura inválido para exclusão.');
  }

  return requestStudentApi(
    `/workouts/templates/${encodeURIComponent(String(normalizedTemplateId))}/exercises/${encodeURIComponent(String(normalizedTemplateExerciseId))}`,
    {
      method: 'DELETE'
    }
  );
};

const setTrainerManagementFeedback = (message, isSuccess = false) => {
  setInlineFeedback(trainerWorkoutError, message, isSuccess);
};

const setTrainerExerciseFeedback = (message, isSuccess = false) => {
  setInlineFeedback(trainerExerciseFeedback, message, isSuccess);
};

const setTrainerWorkoutModalFeedback = (message, isSuccess = false) => {
  setInlineFeedback(trainerWorkoutModalFeedback, message, isSuccess);
};

const getTrainerWorkoutModalRecord = () => {
  const templateId = Number(trainerWorkoutTemplateEditingId) || 0;
  if (templateId) {
    return getTrainerTemplateById(templateId) || buildTrainerTemplatePreviewWorkout(templateId);
  }

  const workoutId = Number(trainerWorkoutEditingId) || 0;
  return workoutId ? getTrainerWorkoutById(workoutId) : null;
};

const renderTrainerWorkoutModalCoverSection = (workout = null) => {
  if (!ensureTrainerWorkoutModalCoverSection()) return;

  const isTemplateMode = Number(trainerWorkoutTemplateEditingId) > 0;
  const currentRecord = workout || getTrainerWorkoutModalRecord();
  const previewUrl = trainerWorkoutModalCoverPreviewObjectUrl || resolveWorkoutCoverImageUrl(currentRecord);
  const hasPreview = Boolean(previewUrl);

  if (trainerWorkoutModalCoverEyebrow) {
    trainerWorkoutModalCoverEyebrow.textContent = isTemplateMode
      ? (trainerWorkoutModalPendingCoverFile ? 'Nova capa da nomeclatura' : 'Capa da nomeclatura')
      : (trainerWorkoutModalPendingCoverFile ? 'Nova capa do treino' : 'Capa do treino');
  }

  if (trainerWorkoutModalCoverTitle) {
    trainerWorkoutModalCoverTitle.textContent = String(
      (currentRecord && (currentRecord.title || currentRecord.name)) ||
      (isTemplateMode ? 'Nomeclatura' : 'Treino')
    ).trim() || (isTemplateMode ? 'Nomeclatura' : 'Treino');
  }

  if (trainerWorkoutModalCoverMeta) {
    if (trainerWorkoutModalReadOnly) {
      trainerWorkoutModalCoverMeta.textContent = hasPreview
        ? 'Visualização da capa vinculada a esse registro.'
        : 'Nenhuma capa vinculada a esse registro.';
    } else if (trainerWorkoutModalPendingCoverFile) {
      trainerWorkoutModalCoverMeta.textContent = 'Clique em salvar para atualizar a capa.';
    } else if (hasPreview) {
      trainerWorkoutModalCoverMeta.textContent = 'Selecione outra imagem se quiser trocar a foto da capa.';
    } else {
      trainerWorkoutModalCoverMeta.textContent = 'Adicione uma foto de capa para esse registro.';
    }
  }

  if (trainerWorkoutModalCoverStageImage) {
    if (hasPreview) {
      trainerWorkoutModalCoverStageImage.src = previewUrl;
      trainerWorkoutModalCoverStageImage.hidden = false;
    } else {
      trainerWorkoutModalCoverStageImage.hidden = true;
      trainerWorkoutModalCoverStageImage.removeAttribute('src');
    }
  }

  if (trainerWorkoutModalCoverStage) {
    trainerWorkoutModalCoverStage.classList.toggle('has-image', hasPreview);
    trainerWorkoutModalCoverStage.classList.toggle('has-pending-cover', Boolean(trainerWorkoutModalCoverPreviewObjectUrl));
  }

  if (trainerWorkoutModalCoverFileInput) {
    trainerWorkoutModalCoverFileInput.disabled = trainerWorkoutModalReadOnly;
  }
};

const hydrateTrainerWorkoutExercises = async (workoutId, { silent = true } = {}) => {
  const normalizedWorkoutId = Number(workoutId) || 0;
  if (!normalizedWorkoutId) return [];

  const response = await requestStudentApi(`/workouts/${encodeURIComponent(String(normalizedWorkoutId))}/exercises`);
  const exercises = Array.isArray(response && response.exercises) ? response.exercises : [];
  trainerManagementState.exercisesByWorkoutId[String(normalizedWorkoutId)] = exercises
    .slice()
    .sort((first, second) => (Number(first && first.order) || 0) - (Number(second && second.order) || 0));

  return exercises;
};

const setTrainerWorkoutModalMode = ({ readOnly = false } = {}) => {
  trainerWorkoutModalReadOnly = Boolean(readOnly);
  const isTemplateMode = Number(trainerWorkoutTemplateEditingId) > 0;
  const showStatusControl = isTemplateMode;

  if (trainerWorkoutModalTitle) {
    if (trainerWorkoutModalReadOnly) {
      trainerWorkoutModalTitle.textContent = isTemplateMode ? 'Visualizar nomeclatura' : 'Visualizar treino';
    } else {
      trainerWorkoutModalTitle.textContent = isTemplateMode ? 'Editar nomeclatura' : 'Editar treino';
    }
  }

  if (trainerWorkoutModalCancelButton) {
    trainerWorkoutModalCancelButton.textContent = trainerWorkoutModalReadOnly ? 'Fechar' : 'Cancelar';
  }

  if (trainerWorkoutModalSubmitButton) {
    trainerWorkoutModalSubmitButton.hidden = trainerWorkoutModalReadOnly;
  }

  if (trainerWorkoutModalForm) {
    trainerWorkoutModalForm.classList.toggle('is-readonly', trainerWorkoutModalReadOnly);
  }

  if (trainerWorkoutModalStatusField) {
    trainerWorkoutModalStatusField.hidden = !showStatusControl;
  }
  if (trainerWorkoutModalStatusSelect && !showStatusControl) {
    trainerWorkoutModalStatusSelect.value = 'ATIVO';
  }

  if (trainerWorkoutModalLibraryHeadTitle) {
    trainerWorkoutModalLibraryHeadTitle.textContent = trainerWorkoutModalReadOnly
      ? (isTemplateMode ? 'Exercícios da nomeclatura' : 'Exercícios do treino')
      : 'Gerenciar exercícios';
  }

  if (trainerWorkoutModalLibraryHeadSubtitle) {
    if (trainerWorkoutModalReadOnly) {
      trainerWorkoutModalLibraryHeadSubtitle.textContent = isTemplateMode
        ? 'Visualização dos exercícios vinculados à nomeclatura.'
        : 'Visualização dos exercícios vinculados ao treino.';
    } else {
      trainerWorkoutModalLibraryHeadSubtitle.textContent = isTemplateMode
        ? 'Edite, remova ou adicione exercícios na nomeclatura.'
        : 'Edite, remova ou adicione exercícios no treino.';
    }
  }

  [
    trainerWorkoutModalNameInput,
    trainerWorkoutModalObjectiveSelect,
    trainerWorkoutModalStatusSelect,
    trainerWorkoutModalMuscleGroupSelect
  ].forEach((control) => {
    if (
      !(control instanceof HTMLInputElement) &&
      !(control instanceof HTMLTextAreaElement) &&
      !(control instanceof HTMLSelectElement)
    ) {
      return;
    }
    control.disabled =
      trainerWorkoutModalReadOnly ||
      (control === trainerWorkoutModalStatusSelect && !showStatusControl) ||
      (isTemplateMode && control === trainerWorkoutModalObjectiveSelect);
    if (control instanceof HTMLTextAreaElement) {
      control.readOnly = trainerWorkoutModalReadOnly;
    }
  });

  if (ensureTrainerWorkoutModalCoverSection() && trainerWorkoutModalCoverFileInput) {
    trainerWorkoutModalCoverFileInput.disabled = trainerWorkoutModalReadOnly;
  }

  renderTrainerWorkoutModalCoverSection();
};

const setTrainerWorkoutExerciseModalFeedback = (message, isSuccess = false) => {
  setInlineFeedback(trainerWorkoutExerciseModalFeedback, message, isSuccess);
};

const getTrainerWorkoutById = (workoutId) => {
  const normalizedId = Number(workoutId) || 0;
  const workouts = Array.isArray(trainerManagementState.workouts) ? trainerManagementState.workouts : [];
  return workouts.find((workout) => Number(workout && workout.id) === normalizedId) || null;
};

const getTrainerWorkoutExerciseById = ({ workoutId, workoutExerciseId }) => {
  const normalizedWorkoutId = String(Number(workoutId) || 0);
  const normalizedWorkoutExerciseId = Number(workoutExerciseId) || 0;
  const exercises = trainerManagementState.exercisesByWorkoutId[normalizedWorkoutId] || [];
  return (
    exercises.find((exercise) => Number(exercise && exercise.id) === normalizedWorkoutExerciseId) || null
  );
};

const getTrainerWorkoutModalGroupLabel = (groupKey) => {
  const normalizedGroupKey = String(groupKey || '').trim().toLowerCase();
  if (!normalizedGroupKey) return 'Grupo';
  if (LIBRARY_GROUP_LABELS[normalizedGroupKey]) return LIBRARY_GROUP_LABELS[normalizedGroupKey];
  return normalizedGroupKey.charAt(0).toUpperCase() + normalizedGroupKey.slice(1);
};

const normalizeTrainerWorkoutModalGroupKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized;
};

const getTrainerWorkoutModalGroupKeys = (workout = null) => {
  const knownOrder = Object.keys(LIBRARY_GROUP_LABELS);
  const groupKeys = new Set(knownOrder);
  const libraryExercises = Array.isArray(trainerManagementState.library)
    ? trainerManagementState.library
    : [];

  libraryExercises.forEach((exercise) => {
    const groupKey = normalizeTrainerWorkoutModalGroupKey(
      exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group)
    );
    if (groupKey) groupKeys.add(groupKey);
  });

  const workoutGroupKey = normalizeTrainerWorkoutModalGroupKey(
    workout && (workout.group || workout.muscleGroup || workout.muscle_group),
  );
  if (workoutGroupKey) groupKeys.add(workoutGroupKey);

  const orderedKnown = knownOrder.filter((groupKey) => groupKeys.has(groupKey));
  const extraGroups = Array.from(groupKeys)
    .filter((groupKey) => !knownOrder.includes(groupKey))
    .sort((first, second) => first.localeCompare(second));
  return [...orderedKnown, ...extraGroups];
};

const inferTrainerWorkoutModalSelectedGroup = (workout = null) => {
  const directGroup = normalizeTrainerWorkoutModalGroupKey(
    workout && (workout.group || workout.muscleGroup || workout.muscle_group),
  );
  if (directGroup) return directGroup;

  const workoutId = Number(workout && workout.id) || 0;
  if (!workoutId) return '';

  const workoutExercises = trainerManagementState.exercisesByWorkoutId[String(workoutId)] || [];
  if (!workoutExercises.length) return '';

  const libraryById = new Map(
    (Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [])
      .map((exercise) => [Number(exercise && exercise.id) || 0, exercise])
  );

  const groupsCounter = new Map();
  workoutExercises.forEach((exercise) => {
    const libraryExerciseId = Number(
      exercise &&
      (
        exercise.exerciseId ||
        exercise.exercise_id ||
        exercise.libraryExerciseId ||
        exercise.library_exercise_id
      )
    ) || 0;
    const linkedLibraryExercise = libraryById.get(libraryExerciseId) || null;
    const groupKey = normalizeTrainerWorkoutModalGroupKey(
      (linkedLibraryExercise &&
        (linkedLibraryExercise.group || linkedLibraryExercise.muscleGroup || linkedLibraryExercise.muscle_group)) ||
      (exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group))
    );
    if (!groupKey) return;
    groupsCounter.set(groupKey, (groupsCounter.get(groupKey) || 0) + 1);
  });

  if (!groupsCounter.size) return '';
  return Array.from(groupsCounter.entries())
    .sort((first, second) => second[1] - first[1])[0][0];
};

const syncTrainerWorkoutModalGroupOptions = (workout = null) => {
  if (!trainerWorkoutModalMuscleGroupSelect) return '';

  const groupKeys = getTrainerWorkoutModalGroupKeys(workout);
  const currentGroupKey = normalizeTrainerWorkoutModalGroupKey(
    trainerWorkoutModalMuscleGroupSelect.value
  );
  const inferredGroupKey = inferTrainerWorkoutModalSelectedGroup(workout);

  const optionsMarkup = groupKeys
    .map(
      (groupKey) =>
        `<option value="${escapeAdminCell(groupKey)}">${escapeAdminCell(
          getTrainerWorkoutModalGroupLabel(groupKey)
        )}</option>`
    )
    .join('');

  trainerWorkoutModalMuscleGroupSelect.innerHTML = [
    '<option value="">Selecione o grupo muscular</option>',
    optionsMarkup,
  ].join('');

  let selectedGroup = '';
  if (currentGroupKey && groupKeys.includes(currentGroupKey)) {
    selectedGroup = currentGroupKey;
  } else if (inferredGroupKey && groupKeys.includes(inferredGroupKey)) {
    selectedGroup = inferredGroupKey;
  }

  trainerWorkoutModalMuscleGroupSelect.value = selectedGroup;
  return selectedGroup;
};

const renderTrainerWorkoutModalLibraryGuide = () => {
  if (!trainerWorkoutModalLibraryWrap || !trainerWorkoutModalLibraryList || !trainerWorkoutModalLibraryEmpty) {
    return;
  }

  const workoutId = Number(trainerWorkoutEditingId) || 0;
  const templateId = Number(trainerWorkoutTemplateEditingId) || 0;
  const isTemplateMode = templateId > 0;
  const previewWorkout = isTemplateMode ? buildTrainerTemplatePreviewWorkout(templateId) : null;
  const workout = isTemplateMode ? previewWorkout : getTrainerWorkoutById(workoutId);
  const workoutExercises = workout
    ? getTrainerWorkoutExercisesWithTemplateFallback(workout)
    : trainerManagementState.exercisesByWorkoutId[String(workoutId)] || [];

  const renderCurrentExerciseItems = ({ editable = false } = {}) => {
    if (!workoutExercises.length) return '';

    return workoutExercises
      .slice()
      .sort((first, second) => (Number(first && first.order) || 0) - (Number(second && second.order) || 0))
      .map((exercise, index) => {
        const exerciseName = String((exercise && exercise.name) || '').trim() || `Exercício ${index + 1}`;
        const series = Math.max(
          1,
          Number(
            exercise &&
              (
                exercise.series !== undefined
                  ? exercise.series
                  : exercise.seriesCount !== undefined
                    ? exercise.seriesCount
                    : exercise.series_count
              )
          ) || 1
        );
        const repetitions = Math.max(
          1,
          Number(
            exercise &&
              (exercise.repetitions !== undefined ? exercise.repetitions : exercise.reps)
          ) || 1
        );
        const restSeconds = Math.max(
          0,
          Number(
            exercise &&
              (
                exercise.restSeconds !== undefined
                  ? exercise.restSeconds
                  : exercise.restTime !== undefined
                    ? exercise.restTime
                    : exercise.descanso
              )
          ) || 0
        );
        const loadKgRaw = Number(
          exercise &&
            (exercise.loadKg !== undefined ? exercise.loadKg : exercise.load)
        ) || 0;
        const loadKg = Math.max(0, loadKgRaw);
        const loadLabel = loadKg > 0
          ? ` | ${Number.isInteger(loadKg) ? loadKg : loadKg.toFixed(1)} kg`
          : '';
        const metadataLabel = `${series} séries | ${repetitions} reps | desc ${formatSecondsLabel(restSeconds)}${loadLabel}`;
        const exerciseActionId = isTemplateMode
          ? Number(exercise && exercise.templateExerciseId) || 0
          : Number(exercise && exercise.id) || 0;

        return `
          <article class="trainer-workout-modal-library-item">
            <div class="trainer-workout-modal-library-item-copy">
              <strong>${escapeAdminCell(exerciseName)}</strong>
              <small>${escapeAdminCell(metadataLabel)}</small>
            </div>
            ${editable
              ? `
                <div class="trainer-workout-modal-library-item-actions">
                  <button
                    type="button"
                    class="trainer-workout-modal-library-view"
                    data-trainer-workout-modal-library-edit
                    data-exercise-id="${escapeAdminCell(exerciseActionId)}"
                    aria-label="Editar ${escapeAdminCell(exerciseName)}"
                    title="Editar ${escapeAdminCell(exerciseName)}"
                    ${exerciseActionId > 0 ? '' : 'disabled'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                      <path d="m13 5 4 4"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="trainer-workout-modal-library-remove--circle"
                    data-trainer-workout-modal-library-remove
                    data-exercise-id="${escapeAdminCell(exerciseActionId)}"
                    data-exercise-name="${escapeAdminCell(exerciseName)}"
                    aria-label="Remover ${escapeAdminCell(exerciseName)}"
                    title="Remover ${escapeAdminCell(exerciseName)}"
                    ${exerciseActionId > 0 ? '' : 'disabled'}
                  >
                    ×
                  </button>
                </div>
              `
              : ''}
          </article>
        `;
      })
      .join('');
  };

  if (trainerWorkoutModalReadOnly) {
    trainerWorkoutModalLibraryWrap.hidden = false;

    if (!workoutId || !workoutExercises.length) {
      trainerWorkoutModalLibraryList.innerHTML = '';
      trainerWorkoutModalLibraryEmpty.hidden = false;
      trainerWorkoutModalLibraryEmpty.textContent = isTemplateMode
        ? 'Nenhum exercício cadastrado nesta nomeclatura.'
        : 'Nenhum exercício cadastrado neste treino.';
      return;
    }

    trainerWorkoutModalLibraryList.innerHTML = renderCurrentExerciseItems({ editable: false });
    trainerWorkoutModalLibraryEmpty.hidden = true;
    return;
  }

  const selectedGroupKey = normalizeTrainerWorkoutModalGroupKey(
    trainerWorkoutModalMuscleGroupSelect ? trainerWorkoutModalMuscleGroupSelect.value : ''
  );
  const libraryExercises = Array.isArray(trainerManagementState.library)
    ? trainerManagementState.library
    : [];
  const exercisesFromGroup = selectedGroupKey
    ? libraryExercises.filter((exercise) => {
      if (!exercise || exercise.isActive === false) return false;
      const groupKey = normalizeTrainerWorkoutModalGroupKey(
        exercise.group || exercise.muscleGroup || exercise.muscle_group
      );
      return groupKey === selectedGroupKey;
    })
    : [];
  const existingExerciseIds = new Set(
    workoutExercises
      .map((exercise) =>
        Number(
          exercise &&
          (
            exercise.exerciseId ||
            exercise.exercise_id ||
            exercise.libraryExerciseId ||
            exercise.library_exercise_id
          )
        ) || 0
      )
      .filter(Boolean)
  );

  trainerWorkoutModalLibraryWrap.hidden = false;

  if (!workoutId) {
    trainerWorkoutModalLibraryList.innerHTML = '';
    trainerWorkoutModalLibraryEmpty.hidden = false;
    trainerWorkoutModalLibraryEmpty.textContent = isTemplateMode
      ? 'Nomeclatura inválida para gerenciar exercícios.'
      : 'Treino inválido para gerenciar exercícios.';
    return;
  }

  const currentExercisesMarkup = renderCurrentExerciseItems({ editable: true });
  const currentExercisesSectionMarkup = currentExercisesMarkup
    ? `
        <article class="trainer-workout-modal-library-item trainer-workout-modal-library-item--section">
          <div class="trainer-workout-modal-library-item-copy">
            <strong>${isTemplateMode ? 'Exercícios da nomeclatura' : 'Exercícios do treino'}</strong>
            <small>Edite ou remova os exercícios já vinculados.</small>
          </div>
        </article>
        ${currentExercisesMarkup}
      `
    : `
        <article class="trainer-workout-modal-library-item trainer-workout-modal-library-item--section">
          <div class="trainer-workout-modal-library-item-copy">
            <strong>${isTemplateMode ? 'Exercícios da nomeclatura' : 'Exercícios do treino'}</strong>
            <small>Nenhum exercício vinculado ainda.</small>
          </div>
        </article>
      `;

  const addableExercisesMarkup = selectedGroupKey
    ? exercisesFromGroup
    .map((exercise) => {
      const exerciseId = Number(exercise && exercise.id) || 0;
      const repetitions = Math.max(1, Number(exercise && exercise.repetitions) || 10);
      const restSeconds = Math.max(
        0,
        Number(exercise && (exercise.restSeconds !== undefined ? exercise.restSeconds : exercise.restTime)) || 30
      );
      const alreadyAdded = existingExerciseIds.has(exerciseId);
      const buttonLabel = alreadyAdded ? 'Adicionado' : 'Adicionar';

      return `
        <article class="trainer-workout-modal-library-item">
          <div class="trainer-workout-modal-library-item-copy">
            <strong>${escapeAdminCell(exercise && exercise.name)}</strong>
            <small>${escapeAdminCell(`${repetitions} reps | desc ${formatSecondsLabel(restSeconds)}`)}</small>
          </div>
          <button
            type="button"
            class="trainer-workout-modal-library-add"
            data-trainer-workout-modal-library-add
            data-exercise-id="${escapeAdminCell(exerciseId)}"
            ${alreadyAdded ? 'disabled' : ''}
          >
            ${escapeAdminCell(buttonLabel)}
          </button>
        </article>
      `;
    })
    .join('')
    : '';
  const addableExercisesSectionMarkup = selectedGroupKey
    ? `
        <article class="trainer-workout-modal-library-item trainer-workout-modal-library-item--section">
          <div class="trainer-workout-modal-library-item-copy">
            <strong>${escapeAdminCell(`Biblioteca: ${getTrainerWorkoutModalGroupLabel(selectedGroupKey)}`)}</strong>
            <small>Selecione um exercício do grupo para adicionar.</small>
          </div>
        </article>
        ${addableExercisesMarkup || `
          <article class="trainer-workout-modal-library-item">
            <div class="trainer-workout-modal-library-item-copy">
              <strong>Nenhum exercício disponível</strong>
              <small>${escapeAdminCell(`Não há exercícios cadastrados em ${getTrainerWorkoutModalGroupLabel(selectedGroupKey)}.`)}</small>
            </div>
          </article>
        `}
      `
    : `
        <article class="trainer-workout-modal-library-item trainer-workout-modal-library-item--section">
          <div class="trainer-workout-modal-library-item-copy">
            <strong>Adicionar da biblioteca</strong>
            <small>Selecione um grupo muscular acima para carregar os exercícios disponíveis.</small>
          </div>
        </article>
      `;

  trainerWorkoutModalLibraryList.innerHTML = `${currentExercisesSectionMarkup}${addableExercisesSectionMarkup}`;
  trainerWorkoutModalLibraryEmpty.hidden = true;
};

const handleTrainerWorkoutModalLibraryActions = async (event) => {
  if (trainerWorkoutModalReadOnly) return;

  const target = event && event.target;
  if (!(target instanceof Element)) return;

  const templateId = Number(trainerWorkoutTemplateEditingId) || 0;
  const isTemplateMode = templateId > 0;
  const workoutId = Number(trainerWorkoutEditingId) || 0;
  const workoutExercises = trainerManagementState.exercisesByWorkoutId[String(workoutId)] || [];

  const editButton = target.closest('[data-trainer-workout-modal-library-edit]');
  if (editButton && editButton instanceof HTMLButtonElement) {
    const exerciseActionId = Number(editButton.dataset.exerciseId || 0) || 0;
    if (!exerciseActionId) return;

    const exercise = isTemplateMode
      ? workoutExercises.find((item) => Number(item && item.templateExerciseId) === exerciseActionId)
      : workoutExercises.find((item) => Number(item && item.id) === exerciseActionId);
    if (!exercise) {
      setTrainerWorkoutModalFeedback('Exercício não encontrado para edição.', false);
      return;
    }

    const opened = openTrainerWorkoutExerciseModal({
      workoutId,
      templateId,
      exercise,
      triggerButton: editButton
    });
    if (!opened) {
      setTrainerWorkoutModalFeedback('Não foi possível abrir a edição do exercício.', false);
    }
    return;
  }

  const removeButton = target.closest('[data-trainer-workout-modal-library-remove]');
  if (removeButton && removeButton instanceof HTMLButtonElement) {
    const exerciseActionId = Number(removeButton.dataset.exerciseId || 0) || 0;
    const exerciseName = String(removeButton.dataset.exerciseName || 'Exercício').trim() || 'Exercício';
    if (!exerciseActionId) return;

    const confirmed = await requestSiteConfirm({
      title: isTemplateMode ? 'Remover exercício da nomeclatura' : 'Remover exercício do treino',
      identification: exerciseName,
      message: isTemplateMode
        ? `Tem certeza que deseja remover "${exerciseName}" desta nomeclatura?`
        : `Tem certeza que deseja remover "${exerciseName}" deste treino?`,
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      triggerButton: removeButton
    });
    if (!confirmed) return;

    removeButton.disabled = true;
    const inFlightMessage = isTemplateMode
      ? 'Removendo exercício da nomeclatura...'
      : 'Removendo exercício do treino...';
    setTrainerWorkoutModalFeedback(inFlightMessage, false);
    setTrainerManagementFeedback(inFlightMessage, false);
    setTrainerExerciseFeedback(inFlightMessage, false);

    try {
      const response = isTemplateMode
        ? await requestWorkoutTemplateExerciseDelete({
          templateId,
          templateExerciseId: exerciseActionId
        })
        : await requestStudentApi(
          `/workouts/${encodeURIComponent(String(workoutId))}/exercises/${encodeURIComponent(String(exerciseActionId))}`,
          { method: 'DELETE' }
        );

      if (isTemplateMode) {
        buildTrainerTemplatePreviewWorkout(templateId);
      } else {
        trainerExerciseTargetWorkoutId = workoutId;
      }
      await loadTrainerManagementData(true);
      await syncWorkoutsFromBackend({ silent: true });
      if (!isTemplateMode) await loadTrainerProgressData(true);
      if (isGeneralAdminUser()) await fetchAdminOverview(true);
      if (isTemplateMode) buildTrainerTemplatePreviewWorkout(templateId);
      renderTrainerWorkoutModalLibraryGuide();

      const successMessage = (response && response.message) || (
        isTemplateMode ? 'Exercício removido da nomeclatura com sucesso.' : 'Exercício removido com sucesso.'
      );
      setTrainerWorkoutModalFeedback(successMessage, true);
      setTrainerManagementFeedback(successMessage, true);
      setTrainerExerciseFeedback(successMessage, true);
    } catch (error) {
      removeButton.disabled = false;
      const errorMessage = error && error.message
        ? error.message
        : (isTemplateMode
          ? 'Falha ao remover exercício da nomeclatura.'
          : 'Falha ao remover exercício do treino.');
      setTrainerWorkoutModalFeedback(errorMessage, false);
      setTrainerManagementFeedback(errorMessage, false);
      setTrainerExerciseFeedback(errorMessage, false);
    }
    return;
  }

  const addButton = target.closest('[data-trainer-workout-modal-library-add]');
  if (!addButton || !(addButton instanceof HTMLButtonElement)) return;
  if (addButton.disabled) return;

  const exerciseId = Number(addButton.dataset.exerciseId || 0) || 0;
  if (!workoutId || !exerciseId) return;
  const alreadyAdded = workoutExercises.some(
    (exercise) =>
      Number(
        exercise &&
        (
          exercise.exerciseId ||
          exercise.exercise_id ||
          exercise.libraryExerciseId ||
          exercise.library_exercise_id
        )
      ) === exerciseId
  );
  if (alreadyAdded) {
    renderTrainerWorkoutModalLibraryGuide();
    setTrainerWorkoutModalFeedback(
      isTemplateMode
        ? 'Esse exercício já está na nomeclatura selecionada.'
        : 'Esse exercício já está no treino selecionado.',
      true
    );
    return;
  }

  const libraryExercise =
    (Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [])
      .find((exercise) => Number(exercise && exercise.id) === exerciseId) || null;
  const series = Math.max(
    1,
    Number(
      libraryExercise &&
      (
        libraryExercise.seriesCount ||
        libraryExercise.series ||
        libraryExercise.series_count
      )
    ) || 3
  );
  const repetitions = Math.max(1, Number(libraryExercise && libraryExercise.repetitions) || 10);
  const loadKg = Math.max(
    0,
    Number(
      libraryExercise &&
      (
        libraryExercise.loadKg ||
        libraryExercise.load ||
        libraryExercise.carga
      )
    ) || 0
  );
  const restSeconds = Math.max(
    0,
    Number(
      libraryExercise &&
      (
        libraryExercise.restSeconds ||
        libraryExercise.restTime ||
        libraryExercise.descanso
      )
    ) || 30
  );
  const order = workoutExercises.reduce((maxOrder, exercise) => {
    return Math.max(maxOrder, Number(exercise && exercise.order) || 0);
  }, 0) + 1;

  addButton.disabled = true;
  const initialButtonLabel = addButton.textContent;
  addButton.textContent = 'Adicionando...';
  setTrainerWorkoutModalFeedback(
    isTemplateMode ? 'Adicionando exercício à nomeclatura...' : 'Adicionando exercício ao treino...',
    false
  );

  try {
    const response = isTemplateMode
      ? await requestStudentApi(
        `/workouts/templates/${encodeURIComponent(String(templateId))}/exercises`,
        {
          method: 'POST',
          body: {
            exerciseId,
            order,
            series,
            reps: repetitions,
            defaultLoad: loadKg,
            restTime: restSeconds
          }
        }
      )
      : await requestStudentApi('/exercises', {
        method: 'POST',
        body: {
          workoutId,
          exerciseId,
          series,
          repeticoes: repetitions,
          carga: loadKg,
          descanso: restSeconds,
          order
        }
      });

    if (!isTemplateMode) {
      const createdExercise = response && response.exercise ? response.exercise : null;
      if (createdExercise) {
        const workoutKey = String(workoutId);
        const currentExercises = Array.isArray(trainerManagementState.exercisesByWorkoutId[workoutKey])
          ? trainerManagementState.exercisesByWorkoutId[workoutKey].slice()
          : [];
        currentExercises.push(createdExercise);
        currentExercises.sort((first, second) => {
          const firstOrder = Number(first && first.order) || 0;
          const secondOrder = Number(second && second.order) || 0;
          if (firstOrder !== secondOrder) return firstOrder - secondOrder;
          return (Number(first && first.id) || 0) - (Number(second && second.id) || 0);
        });
        trainerManagementState.exercisesByWorkoutId[workoutKey] = currentExercises;
      }
      trainerExerciseTargetWorkoutId = workoutId;
    }

    await loadTrainerManagementData(true);
    if (!isTemplateMode) await loadTrainerProgressData(true);
    await syncWorkoutsFromBackend({ silent: true });
    if (isGeneralAdminUser()) await fetchAdminOverview(true);
    if (isTemplateMode) buildTrainerTemplatePreviewWorkout(templateId);

    const successMessage = (response && response.message) || (
      isTemplateMode
        ? 'Exercício adicionado à nomeclatura com sucesso.'
        : 'Exercício adicionado ao treino.'
    );
    setTrainerWorkoutModalFeedback(successMessage, true);
    setTrainerManagementFeedback(successMessage, true);
    setTrainerExerciseFeedback(successMessage, true);
    renderTrainerWorkoutModalLibraryGuide();
  } catch (error) {
    addButton.disabled = false;
    addButton.textContent = initialButtonLabel;
    const errorMessage = error && error.message
      ? error.message
      : (isTemplateMode
        ? 'Falha ao adicionar exercício à nomeclatura.'
        : 'Falha ao adicionar exercício ao treino.');
    setTrainerWorkoutModalFeedback(errorMessage, false);
    setTrainerManagementFeedback(errorMessage, false);
    setTrainerExerciseFeedback(errorMessage, false);
  }
};

const closeTrainerWorkoutModal = ({ keepFocus = true, force = false } = {}) => {
  if (!trainerWorkoutModal || trainerWorkoutModal.hidden) return;
  if (
    !force &&
    !trainerWorkoutModalReadOnly &&
    trainerWorkoutModalSubmitButton &&
    trainerWorkoutModalSubmitButton.disabled
  ) {
    return;
  }

  const triggerButton = trainerWorkoutEditTriggerButton;
  trainerWorkoutModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-admin-exercise-modal-open');
  trainerWorkoutEditingId = 0;
  trainerWorkoutTemplateEditingId = 0;
  trainerWorkoutEditTriggerButton = null;
  trainerWorkoutModalPendingCoverFile = null;
  clearTrainerWorkoutModalCoverPreviewUrl();
  if (trainerWorkoutModalMuscleGroupSelect) trainerWorkoutModalMuscleGroupSelect.value = '';
  if (trainerWorkoutModalLibraryWrap) trainerWorkoutModalLibraryWrap.hidden = true;
  if (trainerWorkoutModalLibraryList) trainerWorkoutModalLibraryList.innerHTML = '';
  if (trainerWorkoutModalLibraryEmpty) {
    trainerWorkoutModalLibraryEmpty.hidden = false;
    trainerWorkoutModalLibraryEmpty.textContent = 'Nenhum exercício encontrado para este grupo.';
  }
  if (ensureTrainerWorkoutModalCoverSection()) {
    if (trainerWorkoutModalCoverFileInput) trainerWorkoutModalCoverFileInput.value = '';
    updateTrainerWorkoutModalCoverPreview(null);
    setTrainerWorkoutModalCoverFeedback('', false);
    renderTrainerWorkoutModalCoverSection();
  }
  setTrainerWorkoutModalMode({ readOnly: false });
  setTrainerWorkoutModalFeedback('', false);

  if (keepFocus && triggerButton) {
    try {
      triggerButton.focus({ preventScroll: true });
    } catch (_) {}
  }
};

const openTrainerWorkoutModal = (
  workout,
  triggerButton = null,
  { readOnly = false, templateId = 0 } = {}
) => {
  if (!trainerWorkoutModal || !workout) return false;

  const isReadOnly = Boolean(readOnly);

  if (trainerWorkoutModal.parentElement !== document.body) {
    document.body.appendChild(trainerWorkoutModal);
  }

  trainerWorkoutEditingId = Number(workout.id) || 0;
  trainerWorkoutTemplateEditingId = Number(templateId) || 0;
  trainerWorkoutEditTriggerButton = triggerButton || null;
  trainerWorkoutModalPendingCoverFile = null;
  clearTrainerWorkoutModalCoverPreviewUrl();
  ensureTrainerWorkoutModalCoverSection();
  if (trainerWorkoutModalCoverFileInput) trainerWorkoutModalCoverFileInput.value = '';
  updateTrainerWorkoutModalCoverPreview(null);
  setTrainerWorkoutModalCoverFeedback('', false);
  setTrainerWorkoutModalMode({ readOnly: isReadOnly });
  if (trainerWorkoutModalIdentification) {
    trainerWorkoutModalIdentification.textContent = String(
      workout && workout.previewIdLabel
        ? workout.previewIdLabel
        : `Treino #${Number(workout.id) || '-'}`
    ).trim();
  }
  if (trainerWorkoutModalNameInput) {
    trainerWorkoutModalNameInput.value = String(workout.title || workout.name || '').trim();
  }
  if (trainerWorkoutModalObjectiveSelect) {
    trainerWorkoutModalObjectiveSelect.value = String(
      workout.objective || workout.objetivo || 'Hipertrofia'
    ).trim() || 'Hipertrofia';
  }
  if (trainerWorkoutModalStatusSelect) {
    trainerWorkoutModalStatusSelect.value =
      Number(trainerWorkoutTemplateEditingId) > 0 && isWorkoutInactive(workout) ? 'INATIVO' : 'ATIVO';
  }
  syncTrainerWorkoutModalGroupOptions(workout);
  renderTrainerWorkoutModalCoverSection(workout);
  renderTrainerWorkoutModalLibraryGuide();

  const loadedExercises = getTrainerWorkoutExercisesWithTemplateFallback(workout);
  const expectedExercisesCount = Math.max(0, Number(workout && workout.totalExercises) || 0);
  if (!loadedExercises.length && (expectedExercisesCount > 0 || Number(workout && workout.originTemplateId) > 0)) {
    setTrainerWorkoutModalFeedback('Carregando exercícios do treino...', false);
    void hydrateTrainerWorkoutExercises(trainerWorkoutEditingId)
      .then(() => {
        if (Number(trainerWorkoutEditingId) !== Number(workout && workout.id)) return;
        renderTrainerWorkoutModalLibraryGuide();
        setTrainerWorkoutModalFeedback('', false);
      })
      .catch((error) => {
        if (Number(trainerWorkoutEditingId) !== Number(workout && workout.id)) return;
        setTrainerWorkoutModalFeedback(
          error && error.message ? error.message : 'Não foi possível carregar os exercícios deste treino.',
          false
        );
      });
  }

  if (trainerWorkoutModalSubmitButton) {
    trainerWorkoutModalSubmitButton.disabled = false;
  }
  setTrainerWorkoutModalFeedback('', false);
  trainerWorkoutModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-admin-exercise-modal-open');
  const modalCard = trainerWorkoutModal.querySelector('.admin-exercise-edit-modal-card');
  if (modalCard) modalCard.scrollTop = 0;
  if (isReadOnly && trainerWorkoutModalCancelButton) {
    trainerWorkoutModalCancelButton.focus({ preventScroll: true });
  } else if (trainerWorkoutModalNameInput) {
    trainerWorkoutModalNameInput.focus({ preventScroll: true });
    trainerWorkoutModalNameInput.select();
  }
  return true;
};

const closeTrainerWorkoutExerciseModal = ({ keepFocus = true, force = false } = {}) => {
  if (!trainerWorkoutExerciseModal || trainerWorkoutExerciseModal.hidden) return;
  if (
    !force &&
    trainerWorkoutExerciseModalSubmitButton &&
    trainerWorkoutExerciseModalSubmitButton.disabled
  ) {
    return;
  }

  trainerWorkoutExerciseModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-admin-exercise-modal-open');
  trainerWorkoutExerciseEditingState = null;
  setTrainerWorkoutExerciseModalFeedback('', false);

  if (keepFocus && trainerWorkoutExerciseEditTriggerButton) {
    try {
      trainerWorkoutExerciseEditTriggerButton.focus({ preventScroll: true });
    } catch (_) {}
  }
};

const openTrainerWorkoutExerciseModal = ({
  workoutId,
  templateId = 0,
  exercise,
  triggerButton = null
}) => {
  if (!trainerWorkoutExerciseModal || !exercise) return false;

  if (trainerWorkoutExerciseModal.parentElement !== document.body) {
    document.body.appendChild(trainerWorkoutExerciseModal);
  }

  trainerWorkoutExerciseEditingState = {
    workoutId: Number(workoutId) || 0,
    templateId: Number(templateId) || 0,
    workoutExerciseId: Number(exercise.id) || 0,
    templateExerciseId: Number(exercise.templateExerciseId) || 0,
  };
  trainerWorkoutExerciseEditTriggerButton = triggerButton || null;

  if (trainerWorkoutExerciseModalIdentification) {
    trainerWorkoutExerciseModalIdentification.textContent = String(exercise.name || '').trim();
  }
  if (trainerWorkoutExerciseModalSeriesInput) {
    trainerWorkoutExerciseModalSeriesInput.value = String(Math.max(1, Number(exercise.series) || 1));
  }
  if (trainerWorkoutExerciseModalRepetitionsInput) {
    trainerWorkoutExerciseModalRepetitionsInput.value = String(
      Math.max(1, Number(exercise.repetitions) || Number(exercise.reps) || 10)
    );
  }
  if (trainerWorkoutExerciseModalLoadInput) {
    trainerWorkoutExerciseModalLoadInput.value = String(
      Math.max(0, Number(exercise.loadKg) || Number(exercise.load) || 0)
    );
  }
  if (trainerWorkoutExerciseModalRestInput) {
    trainerWorkoutExerciseModalRestInput.value = String(
      Math.max(0, Number(exercise.restSeconds) || Number(exercise.restTime) || 30)
    );
  }
  if (trainerWorkoutExerciseModalObservationInput) {
    trainerWorkoutExerciseModalObservationInput.value = String(
      exercise.observation || exercise.observacao || ''
    ).trim();
  }

  setTrainerWorkoutExerciseModalFeedback('', false);
  trainerWorkoutExerciseModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-admin-exercise-modal-open');
  const modalCard = trainerWorkoutExerciseModal.querySelector('.admin-exercise-edit-modal-card');
  if (modalCard) modalCard.scrollTop = 0;
  if (trainerWorkoutExerciseModalSeriesInput) {
    trainerWorkoutExerciseModalSeriesInput.focus({ preventScroll: true });
    trainerWorkoutExerciseModalSeriesInput.select();
  }
  return true;
};

const getTrainerExerciseVideoEmbedUrl = (rawUrl) => {
  const normalizedUrl = String(rawUrl || '').trim();
  if (!normalizedUrl) return '';

  let parsedUrl = null;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch (_) {
    return normalizedUrl;
  }
  const hostname = String(parsedUrl.hostname || '').toLowerCase();

  if (hostname.includes('youtu.be')) {
    const videoId = parsedUrl.pathname.replace(/^\/+/, '').split('/')[0];
    return videoId
      ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
      : normalizedUrl;
  }

  if (hostname.includes('youtube.com')) {
    const watchVideoId = String(parsedUrl.searchParams.get('v') || '').trim();
    if (watchVideoId) {
      return `https://www.youtube.com/embed/${encodeURIComponent(watchVideoId)}`;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const routeKey = String(pathSegments[0] || '').toLowerCase();
    const candidateVideoId =
      routeKey === 'embed' || routeKey === 'shorts' || routeKey === 'live'
        ? String(pathSegments[1] || '').trim()
        : '';
    return candidateVideoId
      ? `https://www.youtube.com/embed/${encodeURIComponent(candidateVideoId)}`
      : normalizedUrl;
  }

  if (hostname.includes('vimeo.com')) {
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const videoId = pathSegments.find((segment) => /^\d+$/.test(segment));
    return videoId ? `https://player.vimeo.com/video/${videoId}` : normalizedUrl;
  }

  return normalizedUrl;
};

const resetTrainerExerciseVideoModalMedia = () => {
  if (trainerExerciseVideoModalEmbed) {
    trainerExerciseVideoModalEmbed.hidden = true;
    trainerExerciseVideoModalEmbed.src = '';
  }

  if (trainerExerciseVideoModalFile) {
    trainerExerciseVideoModalFile.pause();
    trainerExerciseVideoModalFile.hidden = true;
    trainerExerciseVideoModalFile.removeAttribute('src');
    trainerExerciseVideoModalFile.src = '';
    trainerExerciseVideoModalFile.load();
  }
};

const closeTrainerExerciseVideoModal = ({ keepFocus = true } = {}) => {
  if (!trainerExerciseVideoModal || trainerExerciseVideoModal.hidden) return;

  const triggerButton = trainerExerciseVideoModalTriggerButton;
  trainerExerciseVideoModal.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-admin-exercise-modal-open');
  trainerExerciseVideoModalTriggerButton = null;
  resetTrainerExerciseVideoModalMedia();
  if (trainerExerciseVideoModalIdentification) {
    trainerExerciseVideoModalIdentification.textContent = '';
  }
  if (trainerExerciseVideoModalEmpty) {
    trainerExerciseVideoModalEmpty.hidden = false;
  }

  if (keepFocus && triggerButton) {
    try {
      triggerButton.focus({ preventScroll: true });
    } catch (_) {}
  }
};

const openTrainerExerciseVideoModal = ({
  exerciseName = '',
  videoUrl = '',
  triggerButton = null
} = {}) => {
  if (!trainerExerciseVideoModal) return false;

  if (trainerExerciseVideoModal.parentElement !== document.body) {
    document.body.appendChild(trainerExerciseVideoModal);
  }

  const normalizedExerciseName = String(exerciseName || '').trim() || 'Exercício';
  const resolvedVideoUrl = resolveApiMediaUrl(videoUrl);
  const embeddedVideoUrl = getTrainerExerciseVideoEmbedUrl(resolvedVideoUrl);
  const canUseEmbeddedPlayer = Boolean(embeddedVideoUrl) && isEmbeddableVideoUrl(embeddedVideoUrl);

  trainerExerciseVideoModalTriggerButton = triggerButton || null;
  resetTrainerExerciseVideoModalMedia();

  let hasVideo = false;
  if (canUseEmbeddedPlayer && trainerExerciseVideoModalEmbed) {
    trainerExerciseVideoModalEmbed.src = embeddedVideoUrl;
    trainerExerciseVideoModalEmbed.hidden = false;
    hasVideo = true;
  } else if (resolvedVideoUrl && trainerExerciseVideoModalFile) {
    trainerExerciseVideoModalFile.src = resolvedVideoUrl;
    trainerExerciseVideoModalFile.hidden = false;
    hasVideo = true;
    const playAttempt = trainerExerciseVideoModalFile.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }

  if (trainerExerciseVideoModalIdentification) {
    trainerExerciseVideoModalIdentification.textContent = normalizedExerciseName;
  }
  if (trainerExerciseVideoModalEmpty) {
    trainerExerciseVideoModalEmpty.hidden = hasVideo;
  }

  trainerExerciseVideoModal.hidden = false;
  if (studentAppShell) studentAppShell.classList.add('is-admin-exercise-modal-open');
  const modalCard = trainerExerciseVideoModal.querySelector('.admin-exercise-edit-modal-card');
  if (modalCard) modalCard.scrollTop = 0;
  return true;
};

const setLibraryManagerFeedback = (message, isSuccess = false) => {
  setInlineFeedback(libraryManagerFeedback, message, isSuccess);
};

function clearTrainerLibraryPreviewUrl(kind) {
  if (kind === 'image' && trainerLibraryImagePreviewObjectUrl) {
    URL.revokeObjectURL(trainerLibraryImagePreviewObjectUrl);
    trainerLibraryImagePreviewObjectUrl = '';
  }
  if (kind === 'video' && trainerLibraryVideoPreviewObjectUrl) {
    URL.revokeObjectURL(trainerLibraryVideoPreviewObjectUrl);
    trainerLibraryVideoPreviewObjectUrl = '';
  }
}

function resetTrainerLibraryMediaPreviews() {
  const imageZone = trainerLibraryImagePreview
    ? trainerLibraryImagePreview.closest('.trainer-library-media-zone')
    : null;
  const videoZone = trainerLibraryVideoPreview
    ? trainerLibraryVideoPreview.closest('.trainer-library-media-zone')
    : null;

  clearTrainerLibraryPreviewUrl('image');
  clearTrainerLibraryPreviewUrl('video');

  if (trainerLibraryImagePreview) {
    trainerLibraryImagePreview.hidden = true;
    trainerLibraryImagePreview.removeAttribute('src');
  }
  if (imageZone) imageZone.classList.remove('has-preview');
  if (trainerLibraryVideoPreview) {
    trainerLibraryVideoPreview.hidden = true;
    trainerLibraryVideoPreview.pause();
    trainerLibraryVideoPreview.removeAttribute('src');
    trainerLibraryVideoPreview.load();
  }
  if (videoZone) videoZone.classList.remove('has-preview');
  if (trainerLibraryImageFilename) {
    trainerLibraryImageFilename.textContent = 'Nenhuma imagem selecionada';
  }
  if (trainerLibraryVideoFilename) {
    trainerLibraryVideoFilename.textContent = 'Nenhum vídeo selecionado';
  }
}

function updateTrainerLibraryMediaPreview(kind, file) {
  const safeKind = String(kind || '').trim().toLowerCase();
  const safeFile = file || null;
  const imageZone = trainerLibraryImagePreview
    ? trainerLibraryImagePreview.closest('.trainer-library-media-zone')
    : null;
  const videoZone = trainerLibraryVideoPreview
    ? trainerLibraryVideoPreview.closest('.trainer-library-media-zone')
    : null;

  if (safeKind === 'image') {
    clearTrainerLibraryPreviewUrl('image');
    if (trainerLibraryImageFilename) {
      trainerLibraryImageFilename.textContent = safeFile
        ? `Imagem: ${safeFile.name}`
        : 'Nenhuma imagem selecionada';
    }
    if (!trainerLibraryImagePreview) return;
    if (!safeFile || !String(safeFile.type || '').toLowerCase().startsWith('image/')) {
      trainerLibraryImagePreview.hidden = true;
      trainerLibraryImagePreview.removeAttribute('src');
      if (imageZone) imageZone.classList.remove('has-preview');
      return;
    }
    trainerLibraryImagePreviewObjectUrl = URL.createObjectURL(safeFile);
    trainerLibraryImagePreview.src = trainerLibraryImagePreviewObjectUrl;
    trainerLibraryImagePreview.hidden = false;
    if (imageZone) imageZone.classList.add('has-preview');
    return;
  }

  if (safeKind === 'video') {
    clearTrainerLibraryPreviewUrl('video');
    if (trainerLibraryVideoFilename) {
      trainerLibraryVideoFilename.textContent = safeFile
        ? `Vídeo: ${safeFile.name}`
        : 'Nenhum vídeo selecionado';
    }
    if (!trainerLibraryVideoPreview) return;
    if (!safeFile || !String(safeFile.type || '').toLowerCase().startsWith('video/')) {
      trainerLibraryVideoPreview.hidden = true;
      trainerLibraryVideoPreview.pause();
      trainerLibraryVideoPreview.removeAttribute('src');
      trainerLibraryVideoPreview.load();
      if (videoZone) videoZone.classList.remove('has-preview');
      return;
    }
    trainerLibraryVideoPreviewObjectUrl = URL.createObjectURL(safeFile);
    trainerLibraryVideoPreview.src = trainerLibraryVideoPreviewObjectUrl;
    trainerLibraryVideoPreview.hidden = false;
    if (videoZone) videoZone.classList.add('has-preview');
    const videoPlayPromise = trainerLibraryVideoPreview.play();
    if (videoPlayPromise && typeof videoPlayPromise.catch === 'function') {
      videoPlayPromise.catch(() => {});
    }
  }
}

function clearTrainerWorkoutCoverPreviewUrl() {
  if (trainerWorkoutCoverPreviewObjectUrl) {
    URL.revokeObjectURL(trainerWorkoutCoverPreviewObjectUrl);
    trainerWorkoutCoverPreviewObjectUrl = '';
  }
}

function updateTrainerWorkoutCoverPreview(file) {
  const imageZone = trainerWorkoutCoverUploadPreview
    ? trainerWorkoutCoverUploadPreview.closest('.trainer-library-media-zone')
    : null;

  clearTrainerWorkoutCoverPreviewUrl();

  if (trainerWorkoutCoverFilename) {
    trainerWorkoutCoverFilename.textContent = file
      ? `Imagem: ${file.name}`
      : 'Nenhuma imagem selecionada';
  }

  if (!trainerWorkoutCoverUploadPreview) return;

  if (!file || !String(file.type || '').toLowerCase().startsWith('image/')) {
    trainerWorkoutCoverUploadPreview.hidden = true;
    trainerWorkoutCoverUploadPreview.removeAttribute('src');
    if (imageZone) imageZone.classList.remove('has-preview');
    return;
  }

  trainerWorkoutCoverPreviewObjectUrl = URL.createObjectURL(file);
  trainerWorkoutCoverUploadPreview.src = trainerWorkoutCoverPreviewObjectUrl;
  trainerWorkoutCoverUploadPreview.hidden = false;
  if (imageZone) imageZone.classList.add('has-preview');
}

function ensureTrainerWorkoutModalCoverSection() {
  if (!trainerWorkoutModalForm) return false;

  if (!trainerWorkoutModalCoverSection) {
    trainerWorkoutModalCoverSection = trainerWorkoutModalForm.querySelector('[data-trainer-workout-modal-cover]');
  }

  if (!trainerWorkoutModalCoverSection) {
    const section = document.createElement('section');
    section.className = 'trainer-workout-cover-builder trainer-workout-modal-cover';
    section.setAttribute('data-trainer-workout-modal-cover', '');
    section.innerHTML = `
      <div class="trainer-workout-cover-stage" data-trainer-workout-modal-cover-stage>
        <img
          class="trainer-workout-cover-stage-image"
          data-trainer-workout-modal-cover-image
          alt="Prévia da capa do treino"
          hidden
        />
        <div class="trainer-workout-cover-stage-overlay"></div>
        <div class="trainer-workout-cover-stage-copy">
          <small data-trainer-workout-modal-cover-eyebrow>Capa da nomeclatura</small>
          <strong data-trainer-workout-modal-cover-title>Treino</strong>
          <span data-trainer-workout-modal-cover-meta>Selecione uma imagem para atualizar a capa.</span>
        </div>
      </div>
      <div class="trainer-workout-cover-toolbar">
        <label class="trainer-workout-cover-drop">
          <input type="file" accept="image/*" data-trainer-workout-modal-cover-file hidden />
          <span class="trainer-library-media-zone trainer-workout-cover-upload-zone">
            <img
              alt="Prévia da nova capa selecionada"
              data-trainer-workout-modal-cover-upload-preview
              hidden
            />
            <span class="trainer-library-media-copy">
              <span class="trainer-library-media-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 16V5m0 0-4 4m4-4 4 4M4 15v4h16v-4"/>
                </svg>
              </span>
              <strong>Toque para trocar a foto da capa</strong>
              <small data-trainer-workout-modal-cover-filename>Nenhuma imagem selecionada</small>
            </span>
          </span>
        </label>
      </div>
      <p class="student-form-error trainer-workout-cover-feedback" data-trainer-workout-modal-cover-feedback aria-live="polite"></p>
    `;

    const referenceField = trainerWorkoutModalForm.querySelector('[data-trainer-workout-modal-muscle-group]')?.closest('.admin-exercise-edit-field');
    if (referenceField) {
      referenceField.insertAdjacentElement('beforebegin', section);
    } else {
      trainerWorkoutModalForm.appendChild(section);
    }

    trainerWorkoutModalCoverSection = section;
  }

  trainerWorkoutModalCoverStage = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-stage]');
  trainerWorkoutModalCoverStageImage = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-image]');
  trainerWorkoutModalCoverEyebrow = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-eyebrow]');
  trainerWorkoutModalCoverTitle = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-title]');
  trainerWorkoutModalCoverMeta = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-meta]');
  trainerWorkoutModalCoverFileInput = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-file]');
  trainerWorkoutModalCoverUploadPreview = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-upload-preview]');
  trainerWorkoutModalCoverFilename = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-filename]');
  trainerWorkoutModalCoverFeedback = trainerWorkoutModalCoverSection.querySelector('[data-trainer-workout-modal-cover-feedback]');

  return Boolean(
    trainerWorkoutModalCoverSection &&
    trainerWorkoutModalCoverStage &&
    trainerWorkoutModalCoverStageImage &&
    trainerWorkoutModalCoverEyebrow &&
    trainerWorkoutModalCoverTitle &&
    trainerWorkoutModalCoverMeta &&
    trainerWorkoutModalCoverFileInput &&
    trainerWorkoutModalCoverUploadPreview &&
    trainerWorkoutModalCoverFilename &&
    trainerWorkoutModalCoverFeedback
  );
}

function clearTrainerWorkoutModalCoverPreviewUrl() {
  if (trainerWorkoutModalCoverPreviewObjectUrl) {
    URL.revokeObjectURL(trainerWorkoutModalCoverPreviewObjectUrl);
    trainerWorkoutModalCoverPreviewObjectUrl = '';
  }
}

function updateTrainerWorkoutModalCoverPreview(file) {
  if (!ensureTrainerWorkoutModalCoverSection()) return;

  const imageZone = trainerWorkoutModalCoverUploadPreview
    ? trainerWorkoutModalCoverUploadPreview.closest('.trainer-library-media-zone')
    : null;

  clearTrainerWorkoutModalCoverPreviewUrl();

  if (trainerWorkoutModalCoverFilename) {
    trainerWorkoutModalCoverFilename.textContent = file
      ? `Imagem: ${file.name}`
      : 'Nenhuma imagem selecionada';
  }

  if (!trainerWorkoutModalCoverUploadPreview) return;

  if (!file || !String(file.type || '').toLowerCase().startsWith('image/')) {
    trainerWorkoutModalCoverUploadPreview.hidden = true;
    trainerWorkoutModalCoverUploadPreview.removeAttribute('src');
    if (imageZone) imageZone.classList.remove('has-preview');
    return;
  }

  trainerWorkoutModalCoverPreviewObjectUrl = URL.createObjectURL(file);
  trainerWorkoutModalCoverUploadPreview.src = trainerWorkoutModalCoverPreviewObjectUrl;
  trainerWorkoutModalCoverUploadPreview.hidden = false;
  if (imageZone) imageZone.classList.add('has-preview');
}

function setTrainerWorkoutModalCoverFeedback(message, isSuccess = false) {
  if (!ensureTrainerWorkoutModalCoverSection()) return;
  setInlineFeedback(trainerWorkoutModalCoverFeedback, message, isSuccess);
}

const openLibraryManagerPanel = ({ autoOpenForm = false } = {}) => {
  if (!isLibraryManagerUser()) {
    setTrainerManagementFeedback(
      'Somente Administrador e Administrador Geral podem adicionar exercícios na biblioteca geral.',
      false
    );
    return;
  }
  if (autoOpenForm) isLibraryManagerFormOpen = true;
  setStudentAppTab('biblioteca', true);
  syncLibraryManagerUi();
};

const setTrainerProgressFeedback = (message, isSuccess = false) => {
  setInlineFeedback(trainerProgressError, message, isSuccess);
};

const normalizeTrainerUserRecord = (user) => ({
  id: Number(user && user.id) || 0,
  name: String((user && user.name) || '').trim() || `Usuário ${Number(user && user.id) || '-'}`,
  email: String((user && user.email) || '').trim().toLowerCase(),
  role: normalizeRole(user && user.role),
  isEnabled: user && user.isEnabled !== false
});

function normalizeWorkoutDefinitionLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function formatWorkoutDefinitionDisplayName(value) {
  const label = normalizeWorkoutDefinitionLabel(value);
  if (!label) return '';

  const strippedLabel = label
    .replace(/^treino\b[\s:._-]*/i, '')
    .trim();

  return strippedLabel || label;
}

const buildTrainerWorkoutDefinitionsCatalog = (
  workouts,
  exercisesByWorkoutId = {}
) => {
  const catalogByLabel = new Map();
  const normalizedWorkouts = Array.isArray(workouts) ? workouts : [];

  normalizedWorkouts.forEach((workout) => {
    const workoutId = Number(workout && workout.id) || 0;
    const workoutLabel = normalizeWorkoutDefinitionLabel(
      workout && (workout.title || workout.name)
    );
    if (!workoutId || !workoutLabel) return;

    const exercises = exercisesByWorkoutId[String(workoutId)] || [];
    const exercisesCount = Array.isArray(exercises) ? exercises.length : 0;
    const previous = catalogByLabel.get(workoutLabel);
    const previousWorkoutId = Number(previous && previous.sourceWorkoutId) || 0;
    const previousExercises =
      previousWorkoutId > 0
        ? Array.isArray(exercisesByWorkoutId[String(previousWorkoutId)])
          ? exercisesByWorkoutId[String(previousWorkoutId)].length
          : 0
        : -1;

    const previousCreatedAt = parseAdminChartDate(
      previous && (
        previous.sourceCreatedAt ||
        previous.sourceUpdatedAt
      )
    );
    const nextCreatedAt = parseAdminChartDate(
      workout && (
        workout.createdAt ||
        workout.updatedAt
      )
    );

    const shouldReplaceSource =
      !previous ||
      previousWorkoutId <= 0 ||
      (nextCreatedAt && (!previousCreatedAt || nextCreatedAt > previousCreatedAt)) ||
      exercisesCount > previousExercises ||
      (exercisesCount === previousExercises && workoutId > previousWorkoutId);

    if (shouldReplaceSource) {
      catalogByLabel.set(workoutLabel, {
        label: workoutLabel,
        sourceWorkoutId: workoutId,
        sourceCreatedAt: String((workout && workout.createdAt) || '').trim(),
        sourceUpdatedAt: String((workout && workout.updatedAt) || '').trim()
      });
    }
  });

  const catalogItems = Array.from(catalogByLabel.values());
  if (!catalogItems.length) return [];

  const latestEntry = catalogItems
    .slice()
    .sort((first, second) => {
      const firstDate =
        parseAdminChartDate(first && (first.sourceCreatedAt || first.sourceUpdatedAt)) ||
        new Date(0);
      const secondDate =
        parseAdminChartDate(second && (second.sourceCreatedAt || second.sourceUpdatedAt)) ||
        new Date(0);
      if (secondDate.getTime() !== firstDate.getTime()) {
        return secondDate.getTime() - firstDate.getTime();
      }
      return (Number(second && second.sourceWorkoutId) || 0) - (Number(first && first.sourceWorkoutId) || 0);
    })[0];

  return latestEntry ? [latestEntry] : [];
};

const buildTrainerManagedWorkoutDefinitionRows = ({
  workouts,
  exercisesByWorkoutId = {}
}) => {
  const groupedByName = new Map();
  const normalizedWorkouts = Array.isArray(workouts) ? workouts : [];

  normalizedWorkouts.forEach((workout) => {
    const workoutId = Number(workout && workout.id) || 0;
    const workoutName = normalizeWorkoutDefinitionLabel(
      workout && (workout.title || workout.name)
    );
    if (!workoutId || !workoutName) return;

    const key = normalizeText(workoutName);
    if (!key) return;

    if (!groupedByName.has(key)) {
      groupedByName.set(key, {
        key,
        name: workoutName,
        studentIds: new Set(),
        objectiveSet: new Set(),
        activeCount: 0,
        inactiveCount: 0,
        assignmentsCount: 0,
        exercisesCount: 0,
        workoutIds: [],
        latestWorkout: null
      });
    }

    const group = groupedByName.get(key);
    const studentId = Number(workout && workout.studentId) || 0;
    if (studentId > 0) group.studentIds.add(studentId);

    const objective = String((workout && (workout.objective || workout.objetivo)) || '').trim();
    if (objective) group.objectiveSet.add(objective);

    group.assignmentsCount += 1;
    if (isWorkoutActive(workout)) {
      group.activeCount += 1;
    } else {
      group.inactiveCount += 1;
    }
    group.workoutIds.push(workoutId);

    const exercises = Array.isArray(exercisesByWorkoutId[String(workoutId)])
      ? exercisesByWorkoutId[String(workoutId)]
      : [];
    if (exercises.length > group.exercisesCount) {
      group.exercisesCount = exercises.length;
    }

    const previousLatestTimestamp = getStudentWorkoutTimestamp(group.latestWorkout);
    const currentTimestamp = getStudentWorkoutTimestamp(workout);
    if (!group.latestWorkout || currentTimestamp >= previousLatestTimestamp) {
      group.latestWorkout = workout;
      group.exercisesCount = Math.max(group.exercisesCount, exercises.length);
    }
  });

  return Array.from(groupedByName.values())
    .map((group) => {
      const objectiveValues = Array.from(group.objectiveSet.values());
      const latestWorkout = group.latestWorkout || null;
      return {
        key: group.key,
        name: group.name,
        sourceWorkoutId: Number(latestWorkout && latestWorkout.id) || 0,
        studentsCount: group.studentIds.size,
        assignmentsCount: group.assignmentsCount,
        activeAssignmentsCount: group.activeCount,
        inactiveAssignmentsCount: group.inactiveCount,
        workoutIds: group.workoutIds.slice(),
        objectiveLabel:
          objectiveValues.length === 1
            ? objectiveValues[0]
            : objectiveValues.length > 1
              ? 'Múltiplos objetivos'
              : '-',
        statusLabel: group.activeCount > 0 ? 'Ativo' : 'Inativo',
        statusClass: group.activeCount > 0 ? 'is-success' : '',
        exercisesCount: Math.max(0, Number(group.exercisesCount) || 0),
        createdAt: latestWorkout && latestWorkout.createdAt ? latestWorkout.createdAt : null
      };
    })
    .sort((first, second) =>
      String(first && first.name ? first.name : '').localeCompare(
        String(second && second.name ? second.name : ''),
        'pt-BR',
        { numeric: true, sensitivity: 'base' }
      )
    );
};

const resolveTrainerWorkoutDefinitionKey = (workout) => {
  const workoutName = normalizeWorkoutDefinitionLabel(
    workout && (workout.title || workout.name)
  );
  return normalizeText(workoutName).trim();
};

const listTrainerWorkoutsByDefinitionKey = (definitionKey) => {
  const normalizedDefinitionKey = normalizeText(String(definitionKey || '')).trim();
  if (!normalizedDefinitionKey) return [];

  const visibleWorkouts = getTrainerVisibleWorkouts(trainerManagementState.workouts);
  return visibleWorkouts.filter(
    (workout) => resolveTrainerWorkoutDefinitionKey(workout) === normalizedDefinitionKey
  );
};

function getSelectedTrainerWorkoutDefinition() {
  const selectedLabel = normalizeWorkoutDefinitionLabel(
    trainerWorkoutPredefinedSelect ? trainerWorkoutPredefinedSelect.value : ''
  );
  if (!selectedLabel) return null;

  return (
    trainerWorkoutDefinitionsCatalog.find(
      (entry) => normalizeWorkoutDefinitionLabel(entry && entry.label) === selectedLabel
    ) || null
  );
}

const formatSecondsLabel = (seconds) => `${Math.max(0, Number(seconds) || 0)}s`;

const parseDecimalInputValue = (value, fallback = 0) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return fallback;
  const direct = Number(normalized);
  if (Number.isFinite(direct)) return direct;
  const firstNumberMatch = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!firstNumberMatch) return fallback;
  const parsedMatch = Number(String(firstNumberMatch[0]).replace(',', '.'));
  return Number.isFinite(parsedMatch) ? parsedMatch : fallback;
};

const parseIntegerInputValue = (value, fallback = 0) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return fallback;
  const direct = Number(normalized);
  if (Number.isFinite(direct)) return Math.round(direct);
  const firstNumberMatch = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!firstNumberMatch) return fallback;
  const parsedMatch = Number(String(firstNumberMatch[0]).replace(',', '.'));
  if (!Number.isFinite(parsedMatch)) return fallback;
  return Math.round(parsedMatch);
};

const normalizeTextList = (value, { splitCommas = true } = {}) => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        String(item || '')
          .replace(/^[\-\*]\s*/, '')
          .replace(/^\d+[\.\)\-:]\s*/, '')
          .trim()
      )
      .filter(Boolean);
  }

  const raw = String(value || '').trim();
  if (!raw) return [];

  const pattern = splitCommas ? /\r?\n|[,;]+/ : /\r?\n+/;
  return raw
    .split(pattern)
    .map((item) =>
      String(item || '')
        .replace(/^[\-\*]\s*/, '')
        .replace(/^\d+[\.\)\-:]\s*/, '')
        .trim()
    )
    .filter(Boolean);
};

const stringifyTextList = (items) => {
  return normalizeTextList(items, { splitCommas: false }).join('\n');
};

const parseIntensityScoreValue = (value, fallback = 3) => {
  const parsed = parseIntegerInputValue(value, fallback);
  return Math.max(1, Math.min(5, parsed));
};

const getIntensityLabelFromScore = (score) => {
  const safeScore = Math.max(1, Math.min(5, Number(score) || 3));
  if (safeScore <= 2) return 'Fácil';
  if (safeScore === 3) return 'Moderado';
  if (safeScore === 4) return 'Intermediário';
  return 'Avançado';
};

const readExerciseListField = (exercise, keys, options = {}) => {
  if (!exercise || !Array.isArray(keys)) return [];
  for (const key of keys) {
    if (!key) continue;
    if (exercise[key] === undefined || exercise[key] === null) continue;
    const values = normalizeTextList(exercise[key], options);
    if (values.length) return values;
  }
  return [];
};

const readExerciseIntensityScore = (exercise) => {
  if (!exercise || typeof exercise !== 'object') return null;
  const raw =
    exercise.intensityScore !== undefined
      ? exercise.intensityScore
      : exercise.intensity_score !== undefined
        ? exercise.intensity_score
        : exercise.intensity;
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(5, Math.round(parsed)));
};

const mapApiExerciseToWorkoutExercise = (exercise, index) => {
  const series = Math.max(1, Number(exercise && exercise.series) || 1);
  const repetitions = Math.max(1, Number(exercise && exercise.repetitions) || 10);
  const durationSeconds = Math.max(10, Number(exercise && exercise.durationSeconds) || 60);
  const restSeconds = Math.max(0, Number(exercise && exercise.restSeconds) || 30);
  const loadKg = Math.max(0, Number(exercise && exercise.loadKg) || 0);
  const media = resolveExerciseMedia(exercise);
  const linkedExerciseId = Math.max(
    0,
    Number(
      exercise &&
      (
        exercise.exerciseId !== undefined
          ? exercise.exerciseId
          : exercise.exercise_id !== undefined
            ? exercise.exercise_id
            : exercise.libraryExerciseId !== undefined
              ? exercise.libraryExerciseId
              : exercise.library_exercise_id
      )
    ) || 0
  );
  const exerciseName = String((exercise && exercise.name) || '').trim();
  const libraryExerciseFallback = (() => {
    const libraryItems = Array.isArray(studentData && studentData.library) ? studentData.library : [];
    if (!libraryItems.length) return null;
    if (linkedExerciseId > 0) {
      const byId =
        libraryItems.find((item) => Number(item && item.id) === linkedExerciseId) || null;
      if (byId) return byId;
    }
    const normalizedName = normalizeText(exerciseName);
    if (!normalizedName) return null;
    return (
      libraryItems.find((item) => normalizeText(String((item && item.name) || '')) === normalizedName) ||
      null
    );
  })();
  const description = String(
    (exercise && (exercise.description !== undefined ? exercise.description : '')) ||
    (libraryExerciseFallback && (libraryExerciseFallback.instructions || libraryExerciseFallback.description)) ||
    ''
  ).trim();
  const directTutorialText = String(
    (exercise &&
      (
        exercise.tutorialText !== undefined
          ? exercise.tutorialText
          : exercise.tutorial_text !== undefined
            ? exercise.tutorial_text
            : exercise.instructions !== undefined
              ? exercise.instructions
              : exercise.observation !== undefined
                ? exercise.observation
                : exercise.observacao
      )) ||
    ''
  ).trim();
  const directTutorialSteps = readExerciseListField(
    exercise,
    ['tutorialSteps', 'tutorial_steps', 'instructionsList', 'instructions_list'],
    { splitCommas: false }
  );
  const fallbackTutorialSteps = readExerciseListField(
    libraryExerciseFallback,
    ['tutorialSteps', 'tutorial_steps', 'instructionsList', 'instructions_list'],
    { splitCommas: false }
  );
  const tutorialSteps = directTutorialSteps.length
    ? directTutorialSteps
    : fallbackTutorialSteps.length
      ? fallbackTutorialSteps
      : buildExerciseTutorialSteps(directTutorialText || description);
  const tutorialText = directTutorialText || tutorialSteps.join('\n');

  return {
    id: Number(exercise && exercise.id) || index + 1,
    exerciseId: linkedExerciseId,
    libraryExerciseId: linkedExerciseId,
    name: exerciseName || `Exercício ${index + 1}`,
    description,
    tutorialText,
    tutorial_text: tutorialText,
    tutorialSteps,
    tutorial_steps: tutorialSteps,
    instructionsList: tutorialSteps,
    instructions_list: tutorialSteps,
    imageUrl: media.imageUrl,
    videoUrl: media.videoUrl,
    mediaType: media.mediaType,
    mediaUrl: media.mediaUrl,
    repetitions,
    durationSeconds,
    restSeconds,
    seriesCount: series,
    loadKg,
    order: Math.max(1, Number(exercise && exercise.order) || index + 1),
    series: `${series}x`,
    reps: String(repetitions),
    load: loadKg > 0 ? `${loadKg}kg` : `Descanso: ${formatSecondsLabel(restSeconds)}`,
    instructions: tutorialText || description
  };
};

function normalizeLibraryGroupKey(group, fallback = 'peito') {
  const normalized = String(group || '').trim().toLowerCase();
  if (normalized) return normalized;
  return fallback;
}

const formatDurationClock = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const buildExerciseTutorialSteps = (description) => {
  const normalizedDescription = String(description || '').trim();
  const splitBySentence = normalizedDescription
    .split(/[.!?]+/)
    .map((step) => step.trim())
    .filter(Boolean);

  if (splitBySentence.length) {
    return splitBySentence.slice(0, 4).map((step) => {
      const normalizedStep = step.endsWith('.') ? step : `${step}.`;
      return normalizedStep.charAt(0).toUpperCase() + normalizedStep.slice(1);
    });
  }

  return [
    'Ajuste sua postura e mantenha o tronco estável.',
    'Inicie o movimento com controle.',
    'Execute a fase de retorno sem perder a técnica.',
    'Respeite o intervalo de descanso entre séries.'
  ];
};

const estimateExerciseCalories = ({ durationSeconds, repetitions, restSeconds, loadKg }) => {
  const durationMinutes = Math.max(0.15, Number(durationSeconds || 0) / 60);
  const repFactor = Math.max(1, Number(repetitions) || 10) / 10;
  const loadFactor = 1 + Math.min(1.4, (Number(loadKg) || 0) / 60);
  const restPenalty = Math.max(0.65, 1 - (Math.max(0, Number(restSeconds) || 0) / 180));
  const estimated = Math.round(48 * durationMinutes * repFactor * loadFactor * restPenalty);
  return Math.max(35, estimated);
};

const getExerciseIntensityInfo = ({ repetitions, durationSeconds, loadKg }) => {
  const repScore = Math.min(5, Math.max(1, Math.round((Number(repetitions) || 10) / 4)));
  const durationScore = Math.min(5, Math.max(1, Math.round((Number(durationSeconds) || 60) / 20)));
  const loadScore = Math.min(5, Math.max(1, Math.round((Number(loadKg) || 0) / 15) + 1));
  const score = Math.max(1, Math.min(5, Math.round((repScore + durationScore + loadScore) / 3)));
  return { score, label: getIntensityLabelFromScore(score) };
};

function getSelectedTrainerExerciseGroups() {
  if (!trainerExerciseGroupSelect) return [];
  const selectedValues = Array.from(trainerExerciseGroupSelect.options || [])
    .filter((option) => option && option.selected)
    .map((option) => normalizeLibraryGroupKey(option && option.value, ''))
    .filter(Boolean);
  return Array.from(new Set(selectedValues));
}

function setSelectedTrainerExerciseGroups(groupKeys) {
  if (!trainerExerciseGroupSelect) return;
  const normalizedGroups = Array.from(
    new Set(
      (Array.isArray(groupKeys) ? groupKeys : [groupKeys])
        .map((groupKey) => normalizeLibraryGroupKey(groupKey, ''))
        .filter(Boolean)
    )
  );
  const options = Array.from(trainerExerciseGroupSelect.options || []);
  if (!options.length) return;

  if (!trainerExerciseGroupSelect.multiple) {
    trainerExerciseGroupSelect.value = normalizedGroups[0] || '';
    return;
  }

  options.forEach((option) => {
    if (!option) return;
    const optionValue = normalizeLibraryGroupKey(option.value, '');
    if (!optionValue) {
      option.selected = normalizedGroups.length === 0;
      return;
    }
    option.selected = normalizedGroups.includes(optionValue);
  });
}

function getSelectedTrainerExerciseGroup() {
  return getSelectedTrainerExerciseGroups()[0] || '';
}

function getSelectedTrainerExerciseWorkoutId() {
  const workoutValue = String(
    trainerExerciseWorkoutSelect ? trainerExerciseWorkoutSelect.value : ''
  ).trim();
  if (!workoutValue || workoutValue === TRAINER_WORKOUT_CREATE_OPTION_VALUE) return 0;
  return Number(workoutValue) || 0;
}

function getSelectedTrainerExerciseTemplateId() {
  return getSelectedTrainerExerciseWorkoutId();
}

function getTrainerTemplateById(templateId) {
  const normalizedTemplateId = Number(templateId) || 0;
  if (!normalizedTemplateId) return null;
  const templates = Array.isArray(trainerManagementState.templates)
    ? trainerManagementState.templates
    : [];
  return templates.find((template) => Number(template && template.id) === normalizedTemplateId) || null;
}

function mapTrainerTemplateExercisesToWorkoutExercises(templateId, workoutId) {
  const normalizedTemplateId = Number(templateId) || 0;
  const normalizedWorkoutId = Number(workoutId) || 0;
  if (!normalizedTemplateId || !normalizedWorkoutId) return [];

  const templateExercises =
    trainerManagementState.templateExercisesByTemplateId[String(normalizedTemplateId)] || [];
  return templateExercises
    .slice()
    .sort((first, second) => (Number(first && first.order) || 0) - (Number(second && second.order) || 0))
    .map((item, index) => {
      const exercise = item && item.exercise ? item.exercise : null;
      return {
        id: normalizedWorkoutId * 1000 + index + 1,
        templateExerciseId: Number(item && item.id) || 0,
        workoutId: normalizedWorkoutId,
        exerciseId: Number(item && item.exerciseId) || 0,
        libraryExerciseId: Number(item && item.exerciseId) || 0,
        order: Math.max(1, Number(item && item.order) || index + 1),
        series: Math.max(1, Number(item && item.series) || 3),
        reps: Math.max(1, Number(item && item.reps) || 10),
        repetitions: Math.max(1, Number(item && item.reps) || 10),
        load: Math.max(0, Number(item && item.defaultLoad) || 0),
        loadKg: Math.max(0, Number(item && item.defaultLoad) || 0),
        restTime: Math.max(0, Number(item && item.restTime) || 30),
        restSeconds: Math.max(0, Number(item && item.restTime) || 30),
        completed: false,
        name: String((exercise && exercise.name) || `Exercício ${Number(item && item.exerciseId) || index + 1}`).trim(),
        description: String((exercise && exercise.description) || '').trim(),
        imageUrl: String((exercise && exercise.imageUrl) || '').trim(),
        videoUrl: String((exercise && exercise.videoUrl) || '').trim(),
        animationUrl: String((exercise && exercise.animationUrl) || '').trim(),
        tutorialText: String((exercise && exercise.tutorialText) || '').trim(),
        durationSeconds: Math.max(10, Number(exercise && exercise.durationSeconds) || 60),
        group: normalizeLibraryGroupKey(
          exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group),
          ''
        ),
        muscleGroup: normalizeLibraryGroupKey(
          exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group),
          ''
        ),
      };
    });
}

function getTrainerWorkoutExercisesWithTemplateFallback(workout) {
  const normalizedWorkoutId = Number(workout && workout.id) || 0;
  if (!normalizedWorkoutId) return [];

  const currentExercises = trainerManagementState.exercisesByWorkoutId[String(normalizedWorkoutId)] || [];
  if (Array.isArray(currentExercises) && currentExercises.length) return currentExercises;

  const originTemplateId = Number(workout && workout.originTemplateId) || 0;
  if (!originTemplateId) return [];

  const mappedExercises = mapTrainerTemplateExercisesToWorkoutExercises(
    originTemplateId,
    normalizedWorkoutId
  );
  if (mappedExercises.length) {
    trainerManagementState.exercisesByWorkoutId[String(normalizedWorkoutId)] = mappedExercises;
  }
  return mappedExercises;
}

function buildTrainerTemplatePreviewWorkout(templateId) {
  const normalizedTemplateId = Number(templateId) || 0;
  if (!normalizedTemplateId) return null;

  const template = getTrainerTemplateById(normalizedTemplateId);
  if (!template) return null;

  const previewWorkoutId = TRAINER_TEMPLATE_PREVIEW_ID_OFFSET + normalizedTemplateId;
  const mappedExercises = mapTrainerTemplateExercisesToWorkoutExercises(
    normalizedTemplateId,
    previewWorkoutId
  );

  trainerManagementState.exercisesByWorkoutId[String(previewWorkoutId)] = mappedExercises;

  return {
    id: previewWorkoutId,
    previewIdLabel: `Nomeclatura #${normalizedTemplateId}`,
    title: String((template && template.name) || `Nomeclatura ${normalizedTemplateId}`).trim(),
    name: String((template && template.name) || `Nomeclatura ${normalizedTemplateId}`).trim(),
    objective: 'Hipertrofia',
    description: String((template && template.description) || '').trim(),
    coverImageUrl: getWorkoutCoverFromSource(template),
    cover_image_url: getWorkoutCoverFromSource(template),
    coverUrl: getWorkoutCoverFromSource(template),
    cover_url: getWorkoutCoverFromSource(template),
    status: template && template.isActive === false ? 'INATIVO' : 'ATIVO',
    isActive: !(template && template.isActive === false),
  };
}

function shouldOpenTrainerWorkoutQuickCreate(rawWorkoutValue = '') {
  const normalizedWorkoutValue = String(rawWorkoutValue || '').trim();
  if (normalizedWorkoutValue === TRAINER_WORKOUT_CREATE_OPTION_VALUE) return true;
  if (!trainerExerciseWorkoutSelect) return false;

  const hasRealWorkoutOptions = Array.from(trainerExerciseWorkoutSelect.options || []).some(
    (option) => (Number(option && option.value) || 0) > 0
  );
  return !hasRealWorkoutOptions;
}

function getTrainerWorkoutCoverStageTitle(selectedWorkout) {
  if (selectedWorkout) {
    return formatWorkoutDefinitionDisplayName(selectedWorkout.title || selectedWorkout.name || 'Treino') || 'Treino';
  }

  const selectedTemplate = getTrainerTemplateById(getSelectedTrainerExerciseTemplateId());
  if (selectedTemplate) {
    return formatWorkoutDefinitionDisplayName(selectedTemplate && selectedTemplate.name) || 'Treino em construção';
  }

  const selectedDefinition = getSelectedTrainerWorkoutDefinition();
  const definitionLabel = normalizeWorkoutDefinitionLabel(selectedDefinition && selectedDefinition.label);
  return formatWorkoutDefinitionDisplayName(definitionLabel) || 'Treino em construção';
}

function getTrainerWorkoutCoverStageMeta(selectedWorkout) {
  if (selectedWorkout) {
    const weekDays = Array.isArray(selectedWorkout.weekDays)
      ? selectedWorkout.weekDays.map((day) => String(day || '').trim()).filter(Boolean)
      : [];
    if (weekDays.length) return weekDays.join(' • ');
    const dayLabel = String((selectedWorkout.day || '').trim());
    return dayLabel || 'Plano ativo';
  }

  if (getSelectedTrainerExerciseTemplateId()) {
    return 'A capa será aplicada quando esse treino for designado ao aluno.';
  }

  if (trainerWorkoutPendingCoverFile) {
    return 'A capa será aplicada ao clicar em "Adicionar ao treino".';
  }

  return 'Selecione ou crie um treino para aplicar a capa.';
}

function renderTrainerWorkoutCoverBuilder() {
  if (!trainerWorkoutCoverBuilder) return;

  const selectedWorkoutId = Number(trainerExerciseTargetWorkoutId) || 0;
  const selectedWorkout = selectedWorkoutId ? getTrainerWorkoutById(selectedWorkoutId) : null;
  const selectedTemplate = getTrainerTemplateById(getSelectedTrainerExerciseTemplateId());
  const savedCoverUrl = selectedWorkout
    ? resolveWorkoutCoverImageUrl(selectedWorkout)
    : resolveWorkoutCoverImageUrl(selectedTemplate);
  const previewUrl = trainerWorkoutCoverPreviewObjectUrl || savedCoverUrl;
  const hasPreview = Boolean(previewUrl);

  trainerWorkoutCoverBuilder.hidden = false;

  if (trainerWorkoutCoverEyebrow) {
    trainerWorkoutCoverEyebrow.textContent = selectedWorkout
      ? 'Capa do treino selecionado'
      : trainerWorkoutPendingCoverFile
        ? 'Nova capa pronta'
        : 'Capa do treino';
  }

  if (trainerWorkoutCoverTitle) {
    trainerWorkoutCoverTitle.textContent = getTrainerWorkoutCoverStageTitle(selectedWorkout);
  }

  if (trainerWorkoutCoverMeta) {
    trainerWorkoutCoverMeta.textContent = getTrainerWorkoutCoverStageMeta(selectedWorkout);
  }

  if (trainerWorkoutCoverStageImage) {
    if (hasPreview) {
      trainerWorkoutCoverStageImage.src = previewUrl;
      trainerWorkoutCoverStageImage.hidden = false;
    } else {
      trainerWorkoutCoverStageImage.hidden = true;
      trainerWorkoutCoverStageImage.removeAttribute('src');
    }
  }

  if (trainerWorkoutCoverStage) {
    trainerWorkoutCoverStage.classList.toggle('has-image', hasPreview);
    trainerWorkoutCoverStage.classList.toggle('has-pending-cover', Boolean(trainerWorkoutCoverPreviewObjectUrl));
  }

}

async function persistTrainerWorkoutCoverForWorkoutIds(workoutIds, file) {
  const persistedCoverUrl = await uploadTrainerWorkoutCoverFile(file);
  await applyTrainerWorkoutCoverUrlToWorkoutIds(workoutIds, persistedCoverUrl);
  return persistedCoverUrl;
}

const getTrainerWorkoutIdsByTemplateId = (templateId) => {
  const normalizedTemplateId = Number(templateId) || 0;
  if (!normalizedTemplateId) return [];

  return (Array.isArray(trainerManagementState.workouts) ? trainerManagementState.workouts : [])
    .filter((workout) => Number(workout && workout.originTemplateId) === normalizedTemplateId)
    .map((workout) => Number(workout && workout.id) || 0)
    .filter((workoutId) => workoutId > 0);
};

async function uploadTrainerWorkoutCoverFile(file) {
  if (!file) {
    throw new Error('Selecione uma imagem para a capa do treino.');
  }

  const fileType = String(file.type || '').trim().toLowerCase();
  if (!fileType.startsWith('image/')) {
    throw new Error('Selecione apenas arquivo de imagem para a capa do treino.');
  }

  const uploadedMedia = await uploadStudentMediaFile(file);
  const persistedCoverUrl = String(
    (uploadedMedia && (uploadedMedia.url || uploadedMedia.absoluteUrl)) || ''
  ).trim();

  if (!persistedCoverUrl) {
    throw new Error('Upload concluído sem URL válida da capa do treino.');
  }

  return persistedCoverUrl;
}

async function applyTrainerWorkoutCoverUrlToWorkoutIds(workoutIds, persistedCoverUrl) {
  const safeWorkoutIds = Array.from(
    new Set(
      (Array.isArray(workoutIds) ? workoutIds : [workoutIds])
        .map((value) => Number(value) || 0)
        .filter((value) => value > 0)
    )
  );

  if (!safeWorkoutIds.length) {
    throw new Error('Selecione um treino para salvar a capa.');
  }

  const normalizedCoverUrl = String(persistedCoverUrl || '').trim();
  if (!normalizedCoverUrl) {
    throw new Error('Upload concluído sem URL válida da capa do treino.');
  }

  for (const workoutId of safeWorkoutIds) {
    await requestInstructorWorkoutUpdate({
      workoutId,
      body: {
        coverImageUrl: normalizedCoverUrl
      }
    });
  }

  return normalizedCoverUrl;
}

async function persistTrainerWorkoutCoverForTemplateId(templateId, file) {
  const persistedCoverUrl = await uploadTrainerWorkoutCoverFile(file);
  await applyTrainerWorkoutCoverUrlToTemplateId(templateId, persistedCoverUrl);
  return persistedCoverUrl;
}

async function applyTrainerWorkoutCoverUrlToTemplateId(templateId, persistedCoverUrl) {
  const normalizedTemplateId = Number(templateId) || 0;
  if (!normalizedTemplateId) {
    throw new Error('Selecione um treino salvo para aplicar a capa.');
  }

  const normalizedCoverUrl = String(persistedCoverUrl || '').trim();
  if (!normalizedCoverUrl) {
    throw new Error('Upload concluído sem URL válida da capa do treino.');
  }

  await requestWorkoutTemplateUpdate({
    templateId: normalizedTemplateId,
    body: {
      coverImageUrl: normalizedCoverUrl
    }
  });

  const linkedWorkoutIds = getTrainerWorkoutIdsByTemplateId(normalizedTemplateId);
  if (linkedWorkoutIds.length) {
    await applyTrainerWorkoutCoverUrlToWorkoutIds(linkedWorkoutIds, normalizedCoverUrl);
  }

  return normalizedCoverUrl;
}

async function handleTrainerWorkoutCoverSave({
  workoutIds = null,
  templateId = null,
  successMessage = 'Capa do treino atualizada.'
} = {}) {
  const fallbackWorkoutId = Number(trainerExerciseTargetWorkoutId) || 0;
  const fallbackTemplateId = Number(getSelectedTrainerExerciseTemplateId()) || 0;
  const targetWorkoutIds = Array.isArray(workoutIds)
    ? workoutIds
    : workoutIds
      ? [workoutIds]
      : fallbackWorkoutId
        ? [fallbackWorkoutId]
        : [];
  const targetTemplateId = Number(templateId) || (!targetWorkoutIds.length ? fallbackTemplateId : 0);

  if (!targetWorkoutIds.length && !targetTemplateId) {
    setTrainerWorkoutCoverFeedback('Selecione um treino ou nomeclatura para salvar a capa.', false);
    return false;
  }

  if (!trainerWorkoutPendingCoverFile) {
    setTrainerWorkoutCoverFeedback('Selecione uma imagem para a capa do treino.', false);
    return false;
  }

  trainerWorkoutCoverSaveInFlight = true;
  renderTrainerWorkoutCoverBuilder();
  setTrainerWorkoutCoverFeedback('Enviando capa do treino...', false);

  try {
    if (targetWorkoutIds.length) {
      await persistTrainerWorkoutCoverForWorkoutIds(targetWorkoutIds, trainerWorkoutPendingCoverFile);
    } else {
      await persistTrainerWorkoutCoverForTemplateId(targetTemplateId, trainerWorkoutPendingCoverFile);
    }
    trainerWorkoutPendingCoverFile = null;
    if (trainerWorkoutCoverFileInput) trainerWorkoutCoverFileInput.value = '';
    updateTrainerWorkoutCoverPreview(null);
    await loadTrainerManagementData(true);
    await syncWorkoutsFromBackend({ silent: true });
    if (isGeneralAdminUser()) await fetchAdminOverview(true);
    setTrainerWorkoutCoverFeedback(successMessage, true);
    setTrainerManagementFeedback(successMessage, true);
    return true;
  } catch (error) {
    const errorMessage = error && error.message
      ? error.message
      : 'Não foi possível salvar a capa do treino.';
    setTrainerWorkoutCoverFeedback(errorMessage, false);
    setTrainerManagementFeedback(errorMessage, false);
    return false;
  } finally {
    trainerWorkoutCoverSaveInFlight = false;
    renderTrainerWorkoutCoverBuilder();
  }
}

function syncTrainerExerciseWorkoutQuickActions() {
  const isActionDisabled = true;

  if (trainerExerciseWorkoutViewButton) {
    trainerExerciseWorkoutViewButton.disabled = isActionDisabled;
  }
}

function getTrainerExerciseGroupsLabel(groupKeys = [], emptyLabel = 'Todos') {
  const resolvedGroups = Array.isArray(groupKeys)
    ? groupKeys.filter(Boolean)
    : [];
  if (!resolvedGroups.length) return emptyLabel;
  if (resolvedGroups.length === 1) {
    const singleGroup = resolvedGroups[0];
    return LIBRARY_GROUP_LABELS[singleGroup] || singleGroup;
  }
  if (resolvedGroups.length <= 2) {
    return resolvedGroups
      .map((groupKey) => LIBRARY_GROUP_LABELS[groupKey] || groupKey)
      .join(' e ');
  }
  return `${resolvedGroups.length} grupos`;
}

function getTrainerLibraryExercisesBySelectedGroup() {
  const selectedGroups = getSelectedTrainerExerciseGroups();
  const normalizedSearch = normalizeText(trainerExerciseSearchTerm || '');
  const libraryExercises = Array.isArray(trainerManagementState.library)
    ? trainerManagementState.library
    : [];

  if (!selectedGroups.length) return [];
  const selectedGroupsSet = new Set(selectedGroups);
  return libraryExercises.filter((exercise) => {
    const exerciseGroup = normalizeLibraryGroupKey(exercise && exercise.group, '');
    if (!selectedGroupsSet.has(exerciseGroup)) return false;
    if (!normalizedSearch) return true;
    return normalizeText(exercise && exercise.name).includes(normalizedSearch);
  });
}

function getLinkedLibraryExerciseId(workoutExercise) {
  return Number(
    workoutExercise &&
    (
      workoutExercise.exerciseId ||
      workoutExercise.exercise_id ||
      workoutExercise.libraryExerciseId ||
      workoutExercise.library_exercise_id
    )
  ) || 0;
}

function getTrainerLibraryPickerExercises() {
  const selectedGroups = getSelectedTrainerExerciseGroups();
  const selectedGroupsSet = new Set(selectedGroups);
  const selectedGroupOrder = new Map(
    selectedGroups.map((groupKey, index) => [normalizeLibraryGroupKey(groupKey, ''), index])
  );
  const normalizedSearch = normalizeText(trainerExerciseLibraryPickerSearchTerm || '');
  const libraryExercises = Array.isArray(trainerManagementState.library)
    ? trainerManagementState.library
    : [];

  return libraryExercises
    .filter((exercise) => {
      if (!exercise || exercise.isActive === false) return false;
      const exerciseGroup = normalizeLibraryGroupKey(exercise && exercise.group, '');
      if (selectedGroups.length && !selectedGroupsSet.has(exerciseGroup)) {
        return false;
      }
      if (!normalizedSearch) return true;

      const exerciseName = normalizeText(exercise && exercise.name);
      const groupLabel = normalizeText(LIBRARY_GROUP_LABELS[exerciseGroup] || exerciseGroup || '');
      return exerciseName.includes(normalizedSearch) || groupLabel.includes(normalizedSearch);
    })
    .slice()
    .sort((first, second) => {
      const firstGroup = normalizeLibraryGroupKey(first && first.group, '');
      const secondGroup = normalizeLibraryGroupKey(second && second.group, '');
      const firstGroupOrder = selectedGroupOrder.has(firstGroup)
        ? selectedGroupOrder.get(firstGroup)
        : Number.MAX_SAFE_INTEGER;
      const secondGroupOrder = selectedGroupOrder.has(secondGroup)
        ? selectedGroupOrder.get(secondGroup)
        : Number.MAX_SAFE_INTEGER;

      if (firstGroupOrder !== secondGroupOrder) {
        return firstGroupOrder - secondGroupOrder;
      }

      const firstName = String(first && first.name || '').trim();
      const secondName = String(second && second.name || '').trim();
      const nameCompare = firstName.localeCompare(secondName, 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      });
      if (nameCompare !== 0) return nameCompare;

      return String(LIBRARY_GROUP_LABELS[firstGroup] || firstGroup || '').localeCompare(
        String(LIBRARY_GROUP_LABELS[secondGroup] || secondGroup || ''),
        'pt-BR',
        { numeric: true, sensitivity: 'base' }
      );
    });
}

function getSelectedTrainerWorkoutWeekDays() {
  const checkedDays = Array.from(trainerWeekdayInputs || [])
    .filter((input) => input && input.checked)
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);
  const checkedSet = new Set(checkedDays);
  return WEEKDAY_LABELS.filter((weekday) => checkedSet.has(weekday));
}

function getTrainerAssignableWorkoutsForSelectedStudent(workouts = []) {
  const availableWorkouts = getTrainerVisibleWorkouts(workouts);
  if (!availableWorkouts.length) return [];

  const selectedStudentId = Number(trainerWorkoutStudentSelect ? trainerWorkoutStudentSelect.value : 0) || 0;
  if (!selectedStudentId) {
    return availableWorkouts
      .slice()
      .sort((first, second) => {
        const firstName = String((first && (first.title || first.name)) || '').trim();
        const secondName = String((second && (second.title || second.name)) || '').trim();
        return firstName.localeCompare(secondName, 'pt-BR');
      });
  }

  const workoutsFromStudent = availableWorkouts.filter(
    (workout) => Number(workout && workout.studentId) === selectedStudentId
  );
  const targetWorkouts = workoutsFromStudent.length ? workoutsFromStudent : availableWorkouts;
  return targetWorkouts
    .slice()
    .sort((first, second) => {
      const firstName = String((first && (first.title || first.name)) || '').trim();
      const secondName = String((second && (second.title || second.name)) || '').trim();
      return firstName.localeCompare(secondName, 'pt-BR');
    });
}

function getTrainerWeekdayAssignmentsForSelectedDays(selectedWeekDays = []) {
  const orderedDays = Array.isArray(selectedWeekDays)
    ? selectedWeekDays.map((day) => String(day || '').trim()).filter(Boolean)
    : [];
  return orderedDays.reduce((acc, day) => {
    const assignedWorkoutId = Number(trainerWorkoutDayAssignments[day]) || 0;
    if (assignedWorkoutId > 0) {
      acc[day] = assignedWorkoutId;
    }
    return acc;
  }, {});
}

function renderTrainerWeekdayAssignmentSelectors(templates = []) {
  if (!trainerWeekdayAssignmentWrap || !trainerWeekdayAssignmentList) return;

  const selectedWeekDays = getSelectedTrainerWorkoutWeekDays();
  if (!selectedWeekDays.length) {
    trainerWorkoutDayAssignments = {};
    trainerWeekdayAssignmentList.innerHTML = '';
    trainerWeekdayAssignmentWrap.hidden = true;
    return;
  }

  const availableTemplates = Array.isArray(templates)
    ? templates
      .filter((template) => Number(template && template.id) > 0 && template && template.isActive !== false)
      .slice()
      .sort((first, second) =>
        String((first && first.name) || '').localeCompare(
          String((second && second.name) || ''),
          'pt-BR',
          { numeric: true, sensitivity: 'base' }
        )
      )
    : [];
  const validWorkoutIds = new Set(
    availableTemplates
      .map((template) => String(Number(template && template.id) || 0))
      .filter((workoutId) => workoutId !== '0')
  );

  const nextAssignments = {};
  selectedWeekDays.forEach((day) => {
    const assignedWorkoutId = String(trainerWorkoutDayAssignments[day] || '').trim();
    if (assignedWorkoutId && validWorkoutIds.has(assignedWorkoutId)) {
      nextAssignments[day] = Number(assignedWorkoutId) || 0;
    }
  });
  trainerWorkoutDayAssignments = nextAssignments;

  const hasAssignableWorkouts = availableTemplates.length > 0;
  trainerWeekdayAssignmentWrap.hidden = false;
  trainerWeekdayAssignmentList.innerHTML = selectedWeekDays
    .map((day) => {
      const optionsMarkup = hasAssignableWorkouts
        ? [
          `<option value="">Escolha o treino de ${escapeAdminCell(day)}</option>`,
          ...availableTemplates.map((template) => {
            const workoutId = Number(template && template.id) || 0;
            const workoutName = String(
              (template && template.name) || `Treino ${workoutId || '-'}`
            ).trim() || '-';
            return `<option value="${escapeAdminCell(workoutId)}">${escapeAdminCell(workoutName)}</option>`;
          })
        ].join('')
        : `<option value="">Nenhuma nomeclatura disponível</option>`;
      const assignmentLabel = `Treino de ${day}`;

      return `
        <label class="trainer-weekday-assignment-field">
          <span>${escapeAdminCell(assignmentLabel)}</span>
          <div class="trainer-workout-select-actions">
            <select
              data-trainer-weekday-assignment-select
              data-day="${escapeAdminCell(day)}"
              ${hasAssignableWorkouts ? '' : 'disabled'}
            >
              ${optionsMarkup}
            </select>
            <button
              class="trainer-workout-select-action"
              type="button"
              data-trainer-weekday-assignment-view
              data-day="${escapeAdminCell(day)}"
              aria-label="Visualizar treino de ${escapeAdminCell(day)}"
              title="Visualizar treino de ${escapeAdminCell(day)}"
              disabled
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </label>
      `;
    })
    .join('');

  Array.from(
    trainerWeekdayAssignmentList.querySelectorAll('[data-trainer-weekday-assignment-select]')
  ).forEach((select) => {
    if (!(select instanceof HTMLSelectElement)) return;
    const day = String(select.dataset.day || '').trim();
    const selectedWorkoutId = Number(trainerWorkoutDayAssignments[day]) || 0;
    select.value = selectedWorkoutId ? String(selectedWorkoutId) : '';
    const viewButton = trainerWeekdayAssignmentList.querySelector(
      `[data-trainer-weekday-assignment-view][data-day="${escapeAdminCell(day)}"]`
    );
    if (viewButton instanceof HTMLButtonElement) {
      viewButton.disabled = !selectedWorkoutId;
    }
  });
}

function buildTrainerWorkoutExercisesPayloadFromSourceWorkout(sourceWorkoutId = 0) {
  const normalizedSourceWorkoutId = Number(sourceWorkoutId) || 0;
  if (!normalizedSourceWorkoutId) return [];

  const sourceExercises = trainerManagementState.exercisesByWorkoutId[String(normalizedSourceWorkoutId)] || [];
  return sourceExercises
    .map((exercise, index) => {
      const libraryExerciseId = Number(
        exercise &&
        (
          exercise.exerciseId ||
          exercise.exercise_id ||
          exercise.libraryExerciseId ||
          exercise.library_exercise_id
        )
      ) || 0;
      if (!libraryExerciseId) return null;

      return {
        exerciseId: libraryExerciseId,
        series: Math.max(1, Number(exercise && exercise.series) || 3),
        repeticoes: Math.max(
          1,
          Number(exercise && (exercise.repetitions !== undefined ? exercise.repetitions : exercise.reps)) || 10
        ),
        carga: Math.max(
          0,
          Number(exercise && (exercise.loadKg !== undefined ? exercise.loadKg : exercise.load)) || 0
        ),
        descanso: Math.max(
          0,
          Number(exercise && (exercise.restSeconds !== undefined ? exercise.restSeconds : exercise.restTime)) || 30
        ),
        observacao: String((exercise && (exercise.observation || exercise.observacao)) || '').trim(),
        order: Math.max(1, Number(exercise && exercise.order) || index + 1),
      };
    })
    .filter(Boolean);
}

function getTrainerExercisePendingQueue(workoutId) {
  const resolvedWorkoutId = Number(workoutId) || 0;
  if (!resolvedWorkoutId) return [];
  if (Number(trainerExercisePendingWorkoutId) !== resolvedWorkoutId) return [];
  if (!Array.isArray(trainerExercisePendingLibraryIds)) return [];
  return trainerExercisePendingLibraryIds
    .map((exerciseId) => Number(exerciseId) || 0)
    .filter((exerciseId) => exerciseId > 0);
}

function updateTrainerExerciseLibraryPickerPendingLabel(workoutId) {
  if (!trainerExerciseLibraryPickerPendingLabel) return;
  const pendingCount = getTrainerExercisePendingQueue(workoutId).length;
  const useCompactLabel =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 700px)').matches;
  trainerExerciseLibraryPickerPendingLabel.textContent = useCompactLabel
    ? `Pendentes: ${pendingCount}`
    : `Pendentes para salvar: ${pendingCount}`;
}

function setTrainerExercisePendingQueue(workoutId, pendingExerciseIds) {
  const resolvedWorkoutId = Number(workoutId) || 0;
  if (!resolvedWorkoutId) {
    trainerExercisePendingWorkoutId = 0;
    trainerExercisePendingLibraryIds = [];
    updateTrainerExerciseLibraryPickerPendingLabel(0);
    return;
  }

  trainerExercisePendingWorkoutId = resolvedWorkoutId;
  trainerExercisePendingLibraryIds = Array.isArray(pendingExerciseIds)
    ? pendingExerciseIds
      .map((exerciseId) => Number(exerciseId) || 0)
      .filter((exerciseId) => exerciseId > 0)
    : [];

  updateTrainerExerciseLibraryPickerPendingLabel(resolvedWorkoutId);
}

function enqueueTrainerExercisePendingExercise(workoutId, exerciseId) {
  const resolvedWorkoutId = Number(workoutId) || 0;
  const resolvedExerciseId = Number(exerciseId) || 0;
  if (!resolvedWorkoutId || !resolvedExerciseId) return 0;
  const activePendingWorkoutId = Number(trainerExercisePendingWorkoutId) || 0;
  const activePendingCount = activePendingWorkoutId
    ? getTrainerExercisePendingQueue(activePendingWorkoutId).length
    : 0;
  if (
    activePendingWorkoutId &&
    activePendingWorkoutId !== resolvedWorkoutId &&
    activePendingCount > 0
  ) {
    return -1;
  }
  const pendingQueue = getTrainerExercisePendingQueue(resolvedWorkoutId);
  pendingQueue.push(resolvedExerciseId);
  setTrainerExercisePendingQueue(resolvedWorkoutId, pendingQueue);
  return pendingQueue.length;
}

function dequeueTrainerExercisePendingExercise(workoutId, exerciseId) {
  const resolvedWorkoutId = Number(workoutId) || 0;
  const resolvedExerciseId = Number(exerciseId) || 0;
  if (!resolvedWorkoutId || !resolvedExerciseId) return -1;
  const pendingQueue = getTrainerExercisePendingQueue(resolvedWorkoutId);
  if (!pendingQueue.length) return -1;
  const removeIndex = pendingQueue.lastIndexOf(resolvedExerciseId);
  if (removeIndex < 0) return -1;
  pendingQueue.splice(removeIndex, 1);
  setTrainerExercisePendingQueue(resolvedWorkoutId, pendingQueue);
  return pendingQueue.length;
}

function getTrainerExercisePendingCountsByExerciseId(workoutId) {
  return getTrainerExercisePendingQueue(workoutId).reduce((acc, exerciseId) => {
    acc[exerciseId] = (acc[exerciseId] || 0) + 1;
    return acc;
  }, {});
}

const shouldUseMobileSelectPicker = (select = null) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(max-width: 760px)').matches) return true;
  return select instanceof HTMLSelectElement && select.hasAttribute('data-mobile-multiselect');
};

const MOBILE_SELECT_TAP_MAX_DURATION_MS = 1200;
const MOBILE_SELECT_TAP_MAX_SCROLL_DELTA_PX = 18;
const MOBILE_SELECT_TAP_MAX_MOVE_PX = 10;

const getMobileSelectPickerSelectFromEvent = (event) => {
  const target = event && event.target;
  if (target instanceof HTMLSelectElement) return target;
  if (target instanceof Element) {
    const closestSelect = target.closest('select');
    if (closestSelect instanceof HTMLSelectElement) return closestSelect;
  }
  if (event && typeof event.composedPath === 'function') {
    const eventPath = event.composedPath();
    for (const node of eventPath) {
      if (node instanceof HTMLSelectElement) return node;
    }
  }
  return null;
};

const isMobileSelectPickerCandidate = (select) => {
  if (!(select instanceof HTMLSelectElement)) return false;
  if (select.disabled) return false;
  if (select.multiple && select !== trainerExerciseGroupSelect) return false;
  if (Number(select.size) > 1) return false;
  const isAdminTreinosSelect = Boolean(select.closest('[data-student-app-panel="admin-treinos"]'));
  const isTrainerProgressSelect = select === trainerProgressStudentSelect;
  if (!isAdminTreinosSelect && !isTrainerProgressSelect) return false;
  if (select === trainerExerciseLibrarySelect) return false;
  if (select.hasAttribute('data-native-select')) return false;
  return true;
};

const getMobileSelectPickerTitle = (select) => {
  if (select === trainerExerciseWorkoutSelect) return 'Nomeclatura de treino';
  const labelEl = select.closest('label');
  const rawTitle = labelEl
    ? String((labelEl.querySelector('span') && labelEl.querySelector('span').textContent) || '')
    : String(select.getAttribute('aria-label') || select.name || '');
  const cleanedTitle = rawTitle
    .replace(/\s*Obrigatório\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleanedTitle || 'Selecionar opção';
};

const closeMobileSelectPicker = ({ restoreFocus = true } = {}) => {
  if (!mobileSelectPickerRoot) return;
  const focusOrigin = mobileSelectPickerFocusOrigin;
  const shouldSkipRestoreToSelect =
    focusOrigin instanceof HTMLSelectElement &&
    isMobileSelectPickerCandidate(focusOrigin) &&
    shouldUseMobileSelectPicker(focusOrigin);

  mobileSelectPickerRoot.hidden = true;
  mobileSelectPickerRoot.setAttribute('aria-hidden', 'true');
  mobileSelectPickerRoot.classList.remove('is-multiple');
  mobileSelectPickerRoot.classList.remove('is-workout-select');
  mobileSelectPickerRoot.classList.remove('is-trainer-progress-select');
  mobileSelectPickerActiveSelect = null;
  if (studentAppShell) studentAppShell.classList.remove('is-mobile-select-picker-open');
  document.body.classList.remove('student-mobile-select-picker-open');
  if (
    restoreFocus &&
    !shouldSkipRestoreToSelect &&
    focusOrigin &&
    typeof focusOrigin.focus === 'function'
  ) {
    focusOrigin.focus({ preventScroll: true });
  }
  mobileSelectPickerFocusOrigin = null;
};

const syncMobileSelectPickerSelectionState = () => {
  if (!mobileSelectPickerList || !mobileSelectPickerActiveSelect) return;
  const options = mobileSelectPickerActiveSelect.options || [];
  mobileSelectPickerList.querySelectorAll('[data-mobile-select-picker-option]').forEach((optionButton) => {
    if (!(optionButton instanceof HTMLButtonElement)) return;
    const optionIndex = Number(optionButton.dataset.optionIndex);
    const option = Number.isFinite(optionIndex) && optionIndex >= 0
      ? options[optionIndex]
      : null;
    const isSelected = Boolean(option && option.selected);
    optionButton.classList.toggle('is-selected', isSelected);
    if (mobileSelectPickerActiveSelect.multiple) {
      optionButton.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }
  });
};

const ensureMobileSelectPicker = () => {
  if (mobileSelectPickerRoot && mobileSelectPickerTitle && mobileSelectPickerList && mobileSelectPickerCloseButton) {
    return true;
  }

  const root = document.createElement('section');
  root.className = 'student-mobile-select-picker';
  root.setAttribute('data-mobile-select-picker', '');
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;
  root.innerHTML = `
    <button
      class="student-mobile-select-picker-scrim"
      type="button"
      data-mobile-select-picker-close
      aria-label="Fechar seletor"
    ></button>
    <article class="student-mobile-select-picker-card" role="dialog" aria-modal="true">
      <header class="student-mobile-select-picker-head">
        <strong data-mobile-select-picker-title>Selecionar opção</strong>
        <button type="button" data-mobile-select-picker-close>Fechar</button>
      </header>
      <div class="student-mobile-select-picker-list" data-mobile-select-picker-list></div>
    </article>
  `;
  document.body.appendChild(root);

  mobileSelectPickerRoot = root;
  mobileSelectPickerTitle = root.querySelector('[data-mobile-select-picker-title]');
  mobileSelectPickerList = root.querySelector('[data-mobile-select-picker-list]');
  mobileSelectPickerCloseButton = root.querySelector('.student-mobile-select-picker-head [data-mobile-select-picker-close]');

  root.querySelectorAll('[data-mobile-select-picker-close]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (Date.now() < mobileSelectPickerIgnoreCloseUntil) {
        if (event && event.cancelable) event.preventDefault();
        if (event) event.stopPropagation();
        return;
      }
      closeMobileSelectPicker();
    });
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileSelectPicker();
    }
  });

  if (mobileSelectPickerList) {
    mobileSelectPickerList.addEventListener('click', (event) => {
      const target = event && event.target;
      if (!(target instanceof Element)) return;

      const editAction = target.closest('[data-mobile-select-picker-edit]');
      if (editAction) {
        if (!mobileSelectPickerActiveSelect) return;
        if (mobileSelectPickerActiveSelect !== trainerExerciseWorkoutSelect) return;
        const optionIndex = Number(editAction.getAttribute('data-option-index') || -1);
        if (!Number.isFinite(optionIndex) || optionIndex < 0) return;
        const option = mobileSelectPickerActiveSelect.options[optionIndex];
        if (!option || option.disabled) return;
        const workoutId = Number(option.value) || 0;
        if (!workoutId) {
          setTrainerManagementFeedback('Selecione um treino válido para editar.', false);
          return;
        }
        closeMobileSelectPicker({ restoreFocus: false });
        openAssignedWorkoutGuide(workoutId, editAction);
        return;
      }

      const optionButton = target.closest('[data-mobile-select-picker-option]');
      if (!optionButton || !(optionButton instanceof HTMLButtonElement)) return;
      if (!mobileSelectPickerActiveSelect) return;

      const optionIndex = Number(optionButton.dataset.optionIndex);
      if (!Number.isFinite(optionIndex) || optionIndex < 0) return;
      const option = mobileSelectPickerActiveSelect.options[optionIndex];
      if (!option || option.disabled) return;

      if (mobileSelectPickerActiveSelect.multiple) {
        const optionValue = String(option.value || '').trim();
        const allOptions = Array.from(mobileSelectPickerActiveSelect.options || []);
        if (!optionValue) {
          allOptions.forEach((item) => {
            if (item && !item.disabled) item.selected = false;
          });
          option.selected = true;
        } else {
          option.selected = !option.selected;
          const emptyOption = allOptions.find(
            (item) => item && !String(item.value || '').trim()
          );
          if (emptyOption) emptyOption.selected = false;
        }
        syncMobileSelectPickerSelectionState();
        mobileSelectPickerActiveSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      const previousIndex = mobileSelectPickerActiveSelect.selectedIndex;
      mobileSelectPickerActiveSelect.selectedIndex = optionIndex;
      if (mobileSelectPickerActiveSelect.selectedIndex !== previousIndex) {
        mobileSelectPickerActiveSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeMobileSelectPicker({ restoreFocus: false });
    });
  }

  return Boolean(mobileSelectPickerRoot && mobileSelectPickerTitle && mobileSelectPickerList);
};

const openMobileSelectPicker = (select) => {
  if (!isMobileSelectPickerCandidate(select)) return false;
  if (!shouldUseMobileSelectPicker(select)) return false;
  if (!ensureMobileSelectPicker()) return false;
  if (!mobileSelectPickerRoot || !mobileSelectPickerTitle || !mobileSelectPickerList) return false;

  const isMultipleSelect = Boolean(select.multiple);
  const isWorkoutSelect = select === trainerExerciseWorkoutSelect;
  const isTrainerProgressSelect = select === trainerProgressStudentSelect;
  mobileSelectPickerActiveSelect = select;
  mobileSelectPickerFocusOrigin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  mobileSelectPickerRoot.classList.toggle('is-multiple', isMultipleSelect);
  mobileSelectPickerRoot.classList.toggle('is-workout-select', isWorkoutSelect);
  mobileSelectPickerRoot.classList.toggle('is-trainer-progress-select', isTrainerProgressSelect);
  mobileSelectPickerTitle.textContent = getMobileSelectPickerTitle(select);
  mobileSelectPickerList.innerHTML = '';

  Array.from(select.options).forEach((option, optionIndex) => {
    if (option.hidden) return;
    const optionValue = String(option.value || '').trim();
    if (isWorkoutSelect && !optionValue) return;

    const optionButton = document.createElement('button');
    optionButton.type = 'button';
    optionButton.className = 'student-mobile-select-picker-option';
    optionButton.setAttribute('data-mobile-select-picker-option', '');
    optionButton.dataset.optionIndex = String(optionIndex);
    optionButton.disabled = Boolean(option.disabled);
    if (option.selected) optionButton.classList.add('is-selected');
    if (isMultipleSelect) {
      optionButton.setAttribute('aria-pressed', option.selected ? 'true' : 'false');
    }

    const optionText = String(option.textContent || '').trim();
    const isCreateWorkoutOption =
      isWorkoutSelect && optionValue === TRAINER_WORKOUT_CREATE_OPTION_VALUE;
    const label = document.createElement('span');
    if (isWorkoutSelect) {
      label.className = 'student-mobile-select-picker-option-copy';
      const title = document.createElement('strong');
      title.className = 'student-mobile-select-picker-option-title';
      title.textContent = isCreateWorkoutOption ? 'Nova nomeclatura' : 'Nomeclatura';
      const subtitle = document.createElement('small');
      subtitle.className = 'student-mobile-select-picker-option-subtitle';
      subtitle.textContent = isCreateWorkoutOption
        ? 'Criar treino agora'
        : optionText
          ? `Treino cadastrado: ${optionText}`
          : 'Treino cadastrado';
      label.appendChild(title);
      label.appendChild(subtitle);
    } else {
      label.textContent = optionText;
    }

    const radio = document.createElement('span');
    radio.className = 'student-mobile-select-picker-radio';
    radio.setAttribute('aria-hidden', 'true');

    optionButton.appendChild(label);
    optionButton.appendChild(radio);

    if (isWorkoutSelect) {
      const row = document.createElement('div');
      row.className = 'student-mobile-select-picker-option-row';
      row.appendChild(optionButton);
      const canEdit =
        !isCreateWorkoutOption &&
        (Number(option.value) || 0) > 0;
      if (canEdit) {
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'student-mobile-select-picker-edit';
        editButton.setAttribute('data-mobile-select-picker-edit', '');
        editButton.setAttribute('data-option-index', String(optionIndex));
        editButton.setAttribute('aria-label', `Editar ${optionText || 'treino'}`);
        editButton.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z"></path>
            <path d="M14.06 4.19l3.75 3.75"></path>
          </svg>
        `;
        row.appendChild(editButton);
      }
      mobileSelectPickerList.appendChild(row);
      return;
    }

    mobileSelectPickerList.appendChild(optionButton);
  });

  mobileSelectPickerRoot.hidden = false;
  mobileSelectPickerRoot.setAttribute('aria-hidden', 'false');
  mobileSelectPickerIgnoreCloseUntil = Date.now() + 420;
  if (studentAppShell) studentAppShell.classList.add('is-mobile-select-picker-open');
  document.body.classList.add('student-mobile-select-picker-open');

  const selectedButton = mobileSelectPickerList.querySelector('.student-mobile-select-picker-option.is-selected');
  const focusTarget = selectedButton || mobileSelectPickerCloseButton || mobileSelectPickerList.firstElementChild;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }
  return true;
};

const handleMobileSelectPickerClick = (event) => {
  const select = getMobileSelectPickerSelectFromEvent(event);
  if (!isMobileSelectPickerCandidate(select)) return;
  if (!shouldUseMobileSelectPicker(select)) return;
  if (Date.now() < mobileSelectPickerSuppressClickUntil) {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (document.activeElement === select && typeof select.blur === 'function') {
    select.blur();
  }
  const opened = openMobileSelectPicker(select);
  if (!opened) return;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();
};

const handleMobileSelectPickerMouseDown = (event) => {
  const select = getMobileSelectPickerSelectFromEvent(event);
  if (!isMobileSelectPickerCandidate(select)) return;
  if (!shouldUseMobileSelectPicker(select)) return;
  const isMouseEvent = typeof MouseEvent !== 'undefined' && event instanceof MouseEvent;
  if (!isMouseEvent) return;
  const isTouchGeneratedMouseEvent = Boolean(
    event &&
      event.sourceCapabilities &&
      typeof event.sourceCapabilities.firesTouchEvents === 'boolean' &&
      event.sourceCapabilities.firesTouchEvents
  );
  if (isTouchGeneratedMouseEvent) return;
  const hasTouchDevice =
    typeof navigator !== 'undefined' &&
    (Number(navigator.maxTouchPoints) > 0 ||
      Number(navigator.msMaxTouchPoints) > 0);
  if (hasTouchDevice) return;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();
};

const getMobileSelectPickerEventPoint = (event) => {
  if (!event) return { x: 0, y: 0 };
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
    if (touch) {
      return {
        x: Number(touch.clientX) || 0,
        y: Number(touch.clientY) || 0
      };
    }
  }
  return {
    x: Number(event.clientX) || 0,
    y: Number(event.clientY) || 0
  };
};

const handleMobileSelectPickerPointerDown = (event) => {
  const select = getMobileSelectPickerSelectFromEvent(event);
  if (!isMobileSelectPickerCandidate(select)) return;
  if (!shouldUseMobileSelectPicker(select)) return;

  const isPointerEvent =
    typeof PointerEvent !== 'undefined' && event instanceof PointerEvent;
  if (!isPointerEvent && typeof window !== 'undefined' && 'PointerEvent' in window && event.type === 'touchstart') {
    return;
  }
  if (isPointerEvent && event.pointerType === 'mouse') return;
  if (isPointerEvent && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

  const point = getMobileSelectPickerEventPoint(event);
  mobileSelectPickerTapIntent = {
    select,
    pointerId: isPointerEvent ? event.pointerId : null,
    source: isPointerEvent ? 'pointer' : 'touch',
    startX: point.x,
    startY: point.y,
    startedAt: Date.now(),
    startScrollX:
      typeof window !== 'undefined'
        ? Number(window.scrollX || window.pageXOffset || 0)
        : 0,
    startScrollY:
      typeof window !== 'undefined'
        ? Number(window.scrollY || window.pageYOffset || 0)
        : 0,
    moved: false
  };

  if (document.activeElement === select && typeof select.blur === 'function') {
    select.blur();
  }

  // Intercept touch-driven selects early so mobile browsers do not wait on the native select behavior.
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();
};

const handleMobileSelectPickerPointerMove = (event) => {
  const intent = mobileSelectPickerTapIntent;
  if (!intent) return;

  const isPointerEvent =
    typeof PointerEvent !== 'undefined' && event instanceof PointerEvent;
  if (intent.source === 'pointer') {
    if (!isPointerEvent) return;
    if (intent.pointerId !== event.pointerId) return;
  } else if (isPointerEvent) {
    return;
  }

  const point = getMobileSelectPickerEventPoint(event);
  const deltaX = Math.abs(point.x - intent.startX);
  const deltaY = Math.abs(point.y - intent.startY);
  if (deltaX > MOBILE_SELECT_TAP_MAX_MOVE_PX || deltaY > MOBILE_SELECT_TAP_MAX_MOVE_PX) {
    intent.moved = true;
  }
};

const handleMobileSelectPickerPointerEnd = (event) => {
  const intent = mobileSelectPickerTapIntent;
  if (!intent) return;

  const isPointerEvent =
    typeof PointerEvent !== 'undefined' && event instanceof PointerEvent;
  if (intent.source === 'pointer') {
    if (!isPointerEvent) return;
    if (intent.pointerId !== event.pointerId) return;
  } else if (isPointerEvent) {
    return;
  }

  mobileSelectPickerTapIntent = null;
  if (intent.moved || !(intent.select instanceof HTMLSelectElement)) return;
  const tapDurationMs = Date.now() - (Number(intent.startedAt) || 0);
  if (tapDurationMs > MOBILE_SELECT_TAP_MAX_DURATION_MS) return;

  const scrollX =
    typeof window !== 'undefined'
      ? Number(window.scrollX || window.pageXOffset || 0)
      : 0;
  const scrollY =
    typeof window !== 'undefined'
      ? Number(window.scrollY || window.pageYOffset || 0)
      : 0;
  if (
    Math.abs(scrollX - (Number(intent.startScrollX) || 0)) > MOBILE_SELECT_TAP_MAX_SCROLL_DELTA_PX ||
    Math.abs(scrollY - (Number(intent.startScrollY) || 0)) > MOBILE_SELECT_TAP_MAX_SCROLL_DELTA_PX
  ) {
    return;
  }

  const opened = openMobileSelectPicker(intent.select);
  if (!opened) return;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();
  mobileSelectPickerSuppressClickUntil = Date.now() + 450;
};

const handleMobileSelectPickerPointerCancel = (event) => {
  const intent = mobileSelectPickerTapIntent;
  if (!intent) return;
  const isPointerEvent =
    typeof PointerEvent !== 'undefined' && event instanceof PointerEvent;
  if (intent.source === 'pointer') {
    if (!isPointerEvent) return;
    if (intent.pointerId !== event.pointerId) return;
  } else if (isPointerEvent) {
    return;
  }
  mobileSelectPickerTapIntent = null;
};

const handleMobileSelectPickerKeydown = (event) => {
  const select = getMobileSelectPickerSelectFromEvent(event);
  if (!isMobileSelectPickerCandidate(select)) return;
  if (!shouldUseMobileSelectPicker(select)) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openMobileSelectPicker(select);
};

const handleMobileSelectPickerFocusIn = (event) => {
  const select = getMobileSelectPickerSelectFromEvent(event);
  if (!isMobileSelectPickerCandidate(select)) return;
  if (!shouldUseMobileSelectPicker(select)) return;
  if (mobileSelectPickerActiveSelect === select && mobileSelectPickerRoot && !mobileSelectPickerRoot.hidden) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (document.activeElement === select && typeof select.blur === 'function') {
      select.blur();
    }
    const opened = openMobileSelectPicker(select);
    if (!opened) return;
    mobileSelectPickerSuppressClickUntil = Date.now() + 450;
  });
};

function closeTrainerExerciseLibraryPicker({ clearSearch = false } = {}) {
  isTrainerExerciseLibraryPickerOpen = false;
  if (clearSearch) {
    trainerExerciseLibraryPickerSearchTerm = '';
    if (trainerExerciseLibraryPickerSearchInput) trainerExerciseLibraryPickerSearchInput.value = '';
  }
  if (trainerExerciseLibraryPicker) trainerExerciseLibraryPicker.hidden = true;
  if (studentAppShell) studentAppShell.classList.remove('is-trainer-exercise-library-picker-open');
  document.body.classList.remove('trainer-exercise-library-picker-open');
}

async function openTrainerExerciseLibraryPicker({ focusSearch = false } = {}) {
  if (!trainerExerciseLibraryPicker) return false;
  if (!isTrainerManagerUser()) {
    setTrainerExerciseFeedback('Atalho de biblioteca geral disponível apenas para perfis de gestão.', false);
    return false;
  }

  const rawWorkoutValue = String(trainerExerciseWorkoutSelect ? trainerExerciseWorkoutSelect.value : '').trim();
  const templateId = getSelectedTrainerExerciseTemplateId();
  if (!templateId) {
    if (shouldOpenTrainerWorkoutQuickCreate(rawWorkoutValue)) {
      await createTrainerWorkoutFromExerciseField();
    } else {
      setTrainerManagementFeedback('Selecione um treino salvo antes de abrir a biblioteca geral.', false);
      setTrainerExerciseFeedback('Selecione um treino salvo antes de abrir a biblioteca geral.', false);
    }
    return false;
  }

  if (trainerExerciseLibraryPicker.parentElement !== document.body) {
    document.body.appendChild(trainerExerciseLibraryPicker);
  }
  trainerExerciseLibraryPicker.classList.add('is-floating');

  isTrainerExerciseLibraryPickerOpen = true;
  renderTrainerExerciseLibraryPicker();
  if (studentAppShell) studentAppShell.classList.add('is-trainer-exercise-library-picker-open');
  document.body.classList.add('trainer-exercise-library-picker-open');
  if (focusSearch && trainerExerciseLibraryPickerSearchInput) {
    trainerExerciseLibraryPickerSearchInput.focus({ preventScroll: true });
  }
  return true;
}

function renderTrainerExerciseLibraryPicker() {
  if (!trainerExerciseLibraryPicker || !trainerExerciseLibraryPickerList || !trainerExerciseLibraryPickerEmpty) {
    return;
  }

  const selectedGroupKeys = getSelectedTrainerExerciseGroups();
  const hasGroupFilter = selectedGroupKeys.length > 0;
  const selectedGroupLabel = getTrainerExerciseGroupsLabel(selectedGroupKeys, 'Todos');
  const useCompactHeaderLabels =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 700px)').matches;
  if (trainerExerciseLibraryPickerGroupLabel) {
    trainerExerciseLibraryPickerGroupLabel.textContent = useCompactHeaderLabels
      ? `Grupo: ${selectedGroupLabel}`
      : `Grupo selecionado: ${selectedGroupLabel}`;
  }
  const templateId = getSelectedTrainerExerciseTemplateId();
  updateTrainerExerciseLibraryPickerPendingLabel(templateId);

  const canRenderPicker =
    isTrainerExerciseComposerOpen &&
    isTrainerManagerUser() &&
    isTrainerExerciseLibraryPickerOpen;
  trainerExerciseLibraryPicker.hidden = !canRenderPicker;
  if (canRenderPicker) {
    if (studentAppShell) studentAppShell.classList.add('is-trainer-exercise-library-picker-open');
    document.body.classList.add('trainer-exercise-library-picker-open');
  } else {
    if (studentAppShell) studentAppShell.classList.remove('is-trainer-exercise-library-picker-open');
    document.body.classList.remove('trainer-exercise-library-picker-open');
  }

  if (!canRenderPicker) {
    trainerExerciseLibraryPickerList.innerHTML = '';
    trainerExerciseLibraryPickerEmpty.hidden = false;
    trainerExerciseLibraryPickerEmpty.textContent = 'Nenhum exercício encontrado.';
    return;
  }

  if (!templateId) {
    trainerExerciseLibraryPickerList.innerHTML = '';
    trainerExerciseLibraryPickerEmpty.hidden = false;
    trainerExerciseLibraryPickerEmpty.textContent =
      'Selecione um treino salvo para adicionar exercícios.';
    return;
  }

  const templateExercises =
    trainerManagementState.templateExercisesByTemplateId[String(templateId)] || [];
  const existingExerciseCounts = templateExercises.reduce((acc, exercise) => {
    const linkedExerciseId = getLinkedLibraryExerciseId(exercise);
    if (!linkedExerciseId) return acc;
    acc[linkedExerciseId] = (acc[linkedExerciseId] || 0) + 1;
    return acc;
  }, {});
  const pendingExerciseCounts = getTrainerExercisePendingCountsByExerciseId(templateId);
  const pickerExercises = getTrainerLibraryPickerExercises();

  if (!pickerExercises.length) {
    trainerExerciseLibraryPickerList.innerHTML = '';
    trainerExerciseLibraryPickerEmpty.hidden = false;
    trainerExerciseLibraryPickerEmpty.textContent = hasGroupFilter
      ? `Nenhum exercício encontrado em ${selectedGroupLabel} com esse filtro.`
      : 'Nenhum exercício encontrado na biblioteca com esse filtro.';
    return;
  }

  trainerExerciseLibraryPickerList.innerHTML = pickerExercises
    .map((exercise) => {
      const exerciseId = Number(exercise && exercise.id) || 0;
      const exerciseName = String((exercise && exercise.name) || '').trim() || 'Exercício';
      const groupKey = normalizeLibraryGroupKey(exercise && exercise.group);
      const groupLabel = LIBRARY_GROUP_LABELS[groupKey] || groupKey;
      const repetitions = Math.max(1, Number(exercise && exercise.repetitions) || 10);
      const restSeconds = Math.max(
        0,
        Number(exercise && (exercise.restSeconds !== undefined ? exercise.restSeconds : exercise.restTime)) || 30
      );
      const exerciseVideoUrl = String(
        (
          exercise &&
          (
            exercise.videoUrl !== undefined
              ? exercise.videoUrl
              : exercise.video !== undefined
                ? exercise.video
                : exercise.video_url
          )
        ) || ''
      ).trim();
      const hasExerciseVideo = Boolean(exerciseVideoUrl);
      const viewButtonLabel = hasExerciseVideo
        ? `Ver vídeo de ${exerciseName}`
        : `Vídeo indisponível para ${exerciseName}`;
      const existingCount = Number(existingExerciseCounts[exerciseId]) || 0;
      const existingCountLabel =
        existingCount > 0
          ? ` | já no treino salvo: ${existingCount}`
          : '';
      const pendingCount = Number(pendingExerciseCounts[exerciseId]) || 0;
      const metadataLabel = `${groupLabel} | ${repetitions} reps | desc ${formatSecondsLabel(restSeconds)}${existingCountLabel}`;
      const pendingCountMarkup =
        pendingCount > 0
          ? `<span class="trainer-workout-modal-library-item-pending">na fila: ${escapeAdminCell(String(pendingCount))}</span>`
          : '';
      return `
        <article class="trainer-workout-modal-library-item">
          <div class="trainer-workout-modal-library-item-copy">
            <strong>${escapeAdminCell(exerciseName)}</strong>
            <small>
              <span>${escapeAdminCell(metadataLabel)}</span>
              ${pendingCountMarkup}
            </small>
          </div>
          <div class="trainer-workout-modal-library-item-actions">
            <button
              type="button"
              class="trainer-linked-exercises-toggle trainer-workout-modal-library-view trainer-linked-exercise-video-btn"
              data-trainer-exercise-library-picker-view
              data-exercise-name="${escapeAdminCell(exerciseName)}"
              data-video-url="${escapeAdminCell(exerciseVideoUrl)}"
              aria-label="${escapeAdminCell(viewButtonLabel)}"
              title="${escapeAdminCell(viewButtonLabel)}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button
              type="button"
              class="trainer-workout-modal-library-remove--circle"
              data-trainer-exercise-library-picker-remove
              data-exercise-id="${escapeAdminCell(exerciseId)}"
              aria-label="Remover ${escapeAdminCell(exerciseName)} da fila"
              title="Remover 1 da fila"
              ${pendingCount > 0 ? '' : 'disabled'}
            >
              -
            </button>
            <button
              type="button"
              class="trainer-workout-modal-library-add trainer-workout-modal-library-add--circle"
              data-trainer-exercise-library-picker-add
              data-exercise-id="${escapeAdminCell(exerciseId)}"
              aria-label="Adicionar ${escapeAdminCell(exerciseName)} ao treino"
            >
              +
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  trainerExerciseLibraryPickerEmpty.hidden = true;
}

const handleTrainerExerciseLibraryPickerActions = (event) => {
  const target = event && event.target;
  if (!(target instanceof Element)) return;

  const viewButton = target.closest('[data-trainer-exercise-library-picker-view]');
  if (viewButton && viewButton instanceof HTMLButtonElement) {
    if (viewButton.disabled) return;
    const exerciseName = String(viewButton.dataset.exerciseName || 'Exercício').trim();
    const videoUrl = String(viewButton.dataset.videoUrl || '').trim();
    const opened = openTrainerExerciseVideoModal({
      exerciseName,
      videoUrl,
      triggerButton: viewButton
    });
    if (!opened) {
      setTrainerExerciseFeedback('Não foi possível abrir o vídeo deste exercício.', false);
    }
    return;
  }

  const removeButton = target.closest('[data-trainer-exercise-library-picker-remove]');
  if (removeButton && removeButton instanceof HTMLButtonElement) {
    if (removeButton.disabled) return;
    if (!isTrainerManagerUser()) return;

    const workoutId = getSelectedTrainerExerciseTemplateId();
    const exerciseId = Number(removeButton.dataset.exerciseId || 0) || 0;
    if (!workoutId || !exerciseId) return;
    const remainingCount = dequeueTrainerExercisePendingExercise(workoutId, exerciseId);
    if (remainingCount < 0) {
      setTrainerManagementFeedback('Esse exercício não está na fila pendente.', false);
      setTrainerExerciseFeedback('Esse exercício não está na fila pendente.', false);
      return;
    }

    const removedMessage = remainingCount === 0
      ? 'Fila pendente vazia.'
      : `${remainingCount} exercícios continuam na fila.`;
    setTrainerManagementFeedback(removedMessage, true);
    setTrainerExerciseFeedback(removedMessage, true);
    renderTrainerExerciseLibraryPicker();
    return;
  }

  const addButton = target.closest('[data-trainer-exercise-library-picker-add]');
  if (!addButton || !(addButton instanceof HTMLButtonElement)) return;
  if (addButton.disabled) return;
  if (!isTrainerManagerUser()) return;

  const workoutId = getSelectedTrainerExerciseTemplateId();
  const exerciseId = Number(addButton.dataset.exerciseId || 0) || 0;
  if (!workoutId || !exerciseId) return;
  const libraryExercise =
    (Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [])
      .find((exercise) => Number(exercise && exercise.id) === exerciseId) || null;
  const pendingCount = enqueueTrainerExercisePendingExercise(workoutId, exerciseId);
  if (pendingCount < 0) {
    const pendingWorkoutId = Number(trainerExercisePendingWorkoutId) || 0;
    const queueMessage = pendingWorkoutId
      ? 'Finalize ou salve a fila pendente do treino atual antes de trocar de treino.'
      : 'Finalize ou salve a fila pendente antes de continuar.';
    setTrainerManagementFeedback(queueMessage, false);
    setTrainerExerciseFeedback(queueMessage, false);
    return;
  }

  if (trainerExerciseLibrarySelect) trainerExerciseLibrarySelect.value = String(exerciseId);
  if (libraryExercise) applyLibraryExerciseToExerciseForm(libraryExercise);

  const queuedMessage = pendingCount === 1
    ? '1 exercício adicionado à fila. Clique em "Adicionar ao treino" para salvar.'
    : `${pendingCount} exercícios na fila. Clique em "Adicionar ao treino" para salvar.`;
  setTrainerManagementFeedback(queuedMessage, true);
  setTrainerExerciseFeedback(queuedMessage, true);
  renderTrainerExerciseLibraryPicker();
};

function resolveTrainerExerciseTargetWorkoutId() {
  const workouts = Array.isArray(trainerManagementState.workouts)
    ? trainerManagementState.workouts
    : [];
  if (!workouts.length) return 0;

  const targetValue = String(trainerExerciseTargetWorkoutId || '').trim();
  if (targetValue && workouts.some((workout) => String(workout && workout.id) === targetValue)) {
    return Number(targetValue) || 0;
  }

  const filterValue = String(trainerExercisesFilterSelect ? trainerExercisesFilterSelect.value : '').trim();
  if (filterValue && workouts.some((workout) => String(workout && workout.id) === filterValue)) {
    return Number(filterValue) || 0;
  }

  return 0;
}

function syncTrainerAssignedWorkoutSelection(workoutId) {
  const resolvedWorkoutId = Number(workoutId) || 0;
  if (!resolvedWorkoutId) {
    updateTrainerExerciseLibraryPickerPendingLabel(0);
    return;
  }
  const targetValue = String(resolvedWorkoutId);

  trainerExerciseTargetWorkoutId = resolvedWorkoutId;

  if (
    trainerExercisesFilterSelect &&
    Array.from(trainerExercisesFilterSelect.options || []).some(
      (option) => String((option && option.value) || '').trim() === targetValue
    )
  ) {
    trainerExercisesFilterSelect.value = targetValue;
  }

  updateTrainerExerciseLibraryPickerPendingLabel(resolvedWorkoutId);
}

function syncTrainerExerciseGroupDrivenUi() {
  const hasSelectedGroup = getSelectedTrainerExerciseGroups().length > 0;
  if (trainerExerciseDetailsWrap) {
    trainerExerciseDetailsWrap.hidden = false;
  }
  if (trainerExerciseGroupHint) trainerExerciseGroupHint.hidden = hasSelectedGroup;
}

function applyPredefinedWorkoutSelectionToAssignmentForm() {
  const selectedDefinition = getSelectedTrainerWorkoutDefinition();
  const predefinedWorkoutId = Number(selectedDefinition && selectedDefinition.sourceWorkoutId) || 0;
  if (!predefinedWorkoutId) return;

  const selectedWorkout = getTrainerWorkoutById(predefinedWorkoutId);
  if (!selectedWorkout) return;

  syncTrainerAssignedWorkoutSelection(predefinedWorkoutId);

  const objective = String(
    (selectedWorkout && (selectedWorkout.objective || selectedWorkout.objetivo)) || ''
  ).trim();
  if (trainerWorkoutObjectiveSelect && objective) {
    const hasObjectiveOption = Array.from(trainerWorkoutObjectiveSelect.options || [])
      .some((option) => String((option && option.value) || '').trim() === objective);
    if (hasObjectiveOption) {
      trainerWorkoutObjectiveSelect.value = objective;
    }
  }

  if (trainerWorkoutDescriptionInput) {
    trainerWorkoutDescriptionInput.value = String(
      (selectedWorkout &&
        (selectedWorkout.description || selectedWorkout.observations || selectedWorkout.observacoes)) ||
      ''
    ).trim();
  }

  // Dias e vínculos semanais devem ser definidos manualmente pelo instrutor.
  trainerWorkoutDayAssignments = {};
}

const mapLibraryExerciseToStudentItem = (exercise) => {
  const group = normalizeLibraryGroupKey(exercise && exercise.group);
  const rawAnimationUrl = String(
    (exercise &&
      (
        exercise.animationUrl !== undefined
          ? exercise.animationUrl
          : exercise.animation_url
      )) || ''
  ).trim();
  const imageUrl = resolveApiMediaUrl(
    String(
      (exercise &&
        (
          exercise.imageUrl !== undefined
            ? exercise.imageUrl
            : exercise.image_url
        )) || ''
    ).trim()
  );
  const videoUrl = resolveApiMediaUrl(
    String(
      (exercise &&
        (
          exercise.videoUrl !== undefined
            ? exercise.videoUrl
            : exercise.video_url
        )) || rawAnimationUrl
    ).trim()
  );
  const mediaType = videoUrl ? 'video' : imageUrl ? 'image' : '';
  const mediaUrl = videoUrl || imageUrl;
  const rawSeries =
    exercise &&
    (exercise.seriesCount !== undefined
      ? exercise.seriesCount
      : exercise.series !== undefined
        ? exercise.series
        : exercise.series_count);
  const parsedSeriesNumeric = Number(rawSeries);
  const parsedSeries = Number.isFinite(parsedSeriesNumeric)
    ? parsedSeriesNumeric
    : parseInt(String(rawSeries || '').trim(), 10);
  const seriesCount = Math.max(1, Number(parsedSeries) || 3);
  const repetitions = Math.max(1, Number(exercise && exercise.repetitions) || 10);
  const durationSeconds = Math.max(10, Number(exercise && exercise.durationSeconds) || 60);
  const restSeconds = Math.max(0, Number(exercise && exercise.restSeconds) || 30);
  const loadKg = Math.max(0, Number(exercise && exercise.loadKg) || 0);
  const fallbackIntensity = getExerciseIntensityInfo({ repetitions, durationSeconds, loadKg });
  const customIntensityScore = readExerciseIntensityScore(exercise);
  const intensityScore = customIntensityScore || fallbackIntensity.score;
  const intensityLabel = customIntensityScore
    ? getIntensityLabelFromScore(customIntensityScore)
    : fallbackIntensity.label;
  const estimatedCaloriesFallback = estimateExerciseCalories({
    durationSeconds,
    repetitions,
    restSeconds,
    loadKg
  });
  const persistedCaloriesEstimateRaw =
    exercise &&
    (
      exercise.caloriesEstimate !== undefined
        ? exercise.caloriesEstimate
        : exercise.calories_estimate !== undefined
          ? exercise.calories_estimate
          : exercise.calories !== undefined
            ? exercise.calories
            : exercise.kcal
    );
  const persistedCaloriesEstimate = Number(persistedCaloriesEstimateRaw);
  const estimatedCalories =
    Number.isFinite(persistedCaloriesEstimate) && persistedCaloriesEstimate > 0
      ? Math.max(0, Math.round(persistedCaloriesEstimate))
      : estimatedCaloriesFallback;
  const groupLabel = LIBRARY_GROUP_LABELS[group] || 'Exercício';
  const fallbackDescription = `Treino de ${String(groupLabel).toLowerCase()}.`;
  const description = String((exercise && exercise.description) || '').trim() || fallbackDescription;
  const defaultTutorialSteps = buildExerciseTutorialSteps(description);
  const customTutorialSteps = readExerciseListField(
    exercise,
    ['tutorialSteps', 'tutorial_steps', 'instructionsList', 'instructions_list', 'tutorialText', 'tutorial_text'],
    { splitCommas: false }
  );
  const tutorialSteps = customTutorialSteps.length ? customTutorialSteps : defaultTutorialSteps;
  const customMuscles = readExerciseListField(
    exercise,
    ['musclesWorked', 'muscles_worked', 'muscles'],
    { splitCommas: true }
  );
  const muscles = customMuscles.length
    ? customMuscles
    : (LIBRARY_GROUP_MUSCLES[group] || [LIBRARY_GROUP_LABELS[group] || 'Músculo principal']);
  const customImportantTips = readExerciseListField(
    exercise,
    ['importantTips', 'important_tips'],
    { splitCommas: false }
  );
  const importantTips = customImportantTips.length
    ? customImportantTips
    : [
        `Mantenha a técnica durante as ${repetitions} repetições.`,
        `Respeite ${formatSecondsLabel(restSeconds)} de descanso entre séries.`,
        'Evite compensar o movimento com impulso.'
      ];

  return {
    id: Number(exercise && exercise.id) || Number(exercise && exercise.exerciseId) || 0,
    name: String((exercise && exercise.name) || '').trim() || 'Exercício',
    muscle: LIBRARY_GROUP_LABELS[group] || 'Geral',
    group,
    video: videoUrl,
    mediaUrl,
    mediaType,
    imageUrl,
    instructions: description,
    seriesCount,
    repetitions,
    durationSeconds,
    restSeconds,
    loadKg,
    durationLabel: formatDurationClock(durationSeconds),
    caloriesEstimate: estimatedCalories,
    intensityLabel,
    intensityScore,
    muscles,
    tutorialSteps,
    importantTips,
    tips: [
      `Repetições: ${repetitions}`,
      `Tempo: ${formatSecondsLabel(durationSeconds)}`,
      `Descanso: ${formatSecondsLabel(restSeconds)}`
    ]
  };
};

const syncLibraryFromBackend = async ({ silent = false } = {}) => {
  try {
    const response = await requestStudentApi('/library/exercises');
    const exercises = Array.isArray(response && response.exercises) ? response.exercises : [];
    trainerManagementState.library = exercises;
    studentData.library = exercises.map(mapLibraryExerciseToStudentItem);
  } catch (error) {
    if (!silent) throw error;
  }
};

const normalizeStudentWorkoutTitleForGrouping = (workout) => {
  const rawName = String((workout && (workout.name || workout.title || workout.code)) || '').trim();
  if (!rawName) return 'Treino';

  let normalized = rawName
    .replace(/\s*-\s*(seg|ter|qua|qui|sex|sab|dom)\s*$/i, '')
    .trim();

  normalized = normalized
    .replace(/^treino\s+[a-z0-9]+\s*-\s*/i, '')
    .trim();

  return normalized || rawName;
};

const mergeLegacyDuplicatedStudentWorkouts = (workouts = []) => {
  if (!Array.isArray(workouts) || !workouts.length) return [];

  const grouped = new Map();
  workouts.forEach((workout, index) => {
    const workoutId = Number(workout && workout.id) || 0;
    const baseName = normalizeStudentWorkoutTitleForGrouping(workout);
    // Legacy cleanup must not collapse distinct active assignments for the same aluno.
    const key = workoutId > 0
      ? `id::${workoutId}`
      : `fallback::${index}::${normalizeText(baseName)}`;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...workout, name: baseName || String(workout && workout.name || '').trim() || 'Treino' });
      return;
    }

    const existingTs = getStudentWorkoutTimestamp(existing);
    const currentTs = getStudentWorkoutTimestamp(workout);
    const primary = currentTs >= existingTs ? workout : existing;
    const secondary = currentTs >= existingTs ? existing : workout;

    const mergedWeekdaySet = new Set(
      [
        ...(Array.isArray(existing && existing.weekDays) ? existing.weekDays : []),
        ...(Array.isArray(workout && workout.weekDays) ? workout.weekDays : [])
      ]
        .map((day) => normalizeStudentWeekdayKey(day))
        .filter(Boolean)
    );
    const mergedWeekdayKeys = STUDENT_WEEKDAY_ORDER.filter((day) => mergedWeekdaySet.has(day));
    const mergedWeekdays = mergedWeekdayKeys.map((day) => STUDENT_WEEKDAY_LABELS[day] || day);

    grouped.set(key, {
      ...secondary,
      ...primary,
      name: baseName || String((primary && primary.name) || (secondary && secondary.name) || 'Treino').trim(),
      weekDays: mergedWeekdays,
      coverImageUrl: getWorkoutCoverFromSource(primary) || getWorkoutCoverFromSource(secondary),
      cover_image_url: getWorkoutCoverFromSource(primary) || getWorkoutCoverFromSource(secondary),
      coverUrl: getWorkoutCoverFromSource(primary) || getWorkoutCoverFromSource(secondary),
      cover_url: getWorkoutCoverFromSource(primary) || getWorkoutCoverFromSource(secondary),
      day: mergedWeekdays.length
        ? mergedWeekdays.join(', ')
        : String((primary && primary.day) || (secondary && secondary.day) || 'Plano ativo').trim(),
      done: Boolean((existing && existing.done) || (workout && workout.done)),
      exercises:
        (Array.isArray(primary && primary.exercises) && primary.exercises.length
          ? primary.exercises
          : Array.isArray(secondary && secondary.exercises)
            ? secondary.exercises
            : []),
    });
  });

  return Array.from(grouped.values()).sort(
    (first, second) => getStudentWorkoutTimestamp(second) - getStudentWorkoutTimestamp(first)
  );
};

const syncWorkoutsFromBackend = async ({ silent = false } = {}) => {
  try {
    const workoutsEndpoint = normalizeRole(studentData.userRole) === 'ALUNO'
      ? '/student/workouts'
      : '/workouts/my';
    const response = await requestStudentApi(workoutsEndpoint);
    const workouts = extractWorkoutsFromResponse(response);
    studentLatestWorkoutsRevision = computeStudentWorkoutsRevisionFromList(workouts);
    const previousDoneById = new Map(
      (studentData.workouts || []).map((workout) => [String(workout.id), Boolean(workout.done)])
    );
    const completedWorkoutIds = getCompletedWorkoutIdsFromHistory();

    const normalized = await Promise.all(
      workouts.map(async (workout, index) => {
        const workoutId = Number(workout && workout.id) || 0;
        let exercises = [];

        try {
          const exercisesResponse = await requestStudentApi(`/workouts/${encodeURIComponent(String(workoutId))}/exercises`);
          exercises = Array.isArray(exercisesResponse && exercisesResponse.exercises)
            ? exercisesResponse.exercises
            : [];
        } catch (_) {
          exercises = [];
        }

        const sortedExercises = exercises
          .slice()
          .sort((a, b) => (Number(a && a.order) || 0) - (Number(b && b.order) || 0));
        const mappedExercises = sortedExercises.map(mapApiExerciseToWorkoutExercise);
        const totalDurationSeconds = mappedExercises.reduce(
          (sum, exercise) => sum + Number(exercise.durationSeconds || 0) + Number(exercise.restSeconds || 0),
          0
        );
        const durationMinutes = Math.max(1, Math.round(totalDurationSeconds / 60));
        const workoutWeekDays = Array.isArray(workout && workout.weekDays)
          ? workout.weekDays.map((day) => String(day || '').trim()).filter(Boolean)
          : [];
        const dayLabel = workoutWeekDays.length ? workoutWeekDays.join(', ') : 'Plano ativo';
        const workoutCode = `Treino ${String.fromCharCode(65 + (index % 26))}`;
        const normalizedId = String(workoutId || `tmp-${index}`);

        return {
          id: workoutId || normalizedId,
          code: workoutCode,
          name: String((workout && (workout.name || workout.title)) || workoutCode).trim(),
          title: String((workout && (workout.title || workout.name)) || workoutCode).trim(),
          day: dayLabel,
          duration: `${durationMinutes} min`,
          objective: String((workout && (workout.objective || workout.objetivo)) || '').trim(),
          description: String((workout && workout.description) || '').trim(),
          status: isWorkoutInactive(workout) ? 'INATIVO' : 'ATIVO',
          weekDays: workoutWeekDays,
          studentId: Number(workout && workout.studentId) || 0,
          instructorId: Number(workout && workout.instructorId) || 0,
          coverImageUrl: getWorkoutCoverFromSource(workout),
          cover_image_url: getWorkoutCoverFromSource(workout),
          coverUrl: getWorkoutCoverFromSource(workout),
          cover_url: getWorkoutCoverFromSource(workout),
          createdAt: workout && workout.createdAt ? workout.createdAt : null,
          updatedAt: workout && workout.updatedAt ? workout.updatedAt : null,
          done: previousDoneById.get(normalizedId) || completedWorkoutIds.has(normalizedId),
          exercises: mappedExercises
        };
      })
    );

    const isStudentRole = normalizeRole(studentData.userRole) === 'ALUNO';
    const normalizedForUi = isStudentRole
      ? mergeLegacyDuplicatedStudentWorkouts(normalized)
      : normalized;
    const previousSelectedWorkoutId = String(selectedWorkoutId || '').trim();

    studentData.workouts = normalizedForUi;
    const preservedSelection = normalizedForUi.find(
      (workout) => String(workout && workout.id) === previousSelectedWorkoutId
    );
    selectedWorkoutId = preservedSelection
      ? preservedSelection.id
      : normalizedForUi[0]
        ? normalizedForUi[0].id
        : null;
    Object.keys(workoutExerciseChecks).forEach((key) => delete workoutExerciseChecks[key]);
    Object.keys(workoutExerciseDeferredQueue).forEach((key) => delete workoutExerciseDeferredQueue[key]);
    normalizedForUi.forEach((workout) => {
      workoutExerciseChecks[workout.id] = workout.exercises.map(() => Boolean(workout.done));
      workoutExerciseDeferredQueue[workout.id] = [];
    });
  } catch (error) {
    if (!silent) {
      throw error;
    }
  }
};

const fetchTrainerUsersByRole = async () => {
  const fallbackCurrentInstructor = normalizeTrainerUserRecord({
    id: studentData.userId,
    name: studentData.userName,
    email: studentData.profileEmail,
    role: studentData.userRole,
    isEnabled: studentData.userEnabled
  });

  if (isGeneralAdminUser()) {
    const buildUsersPayload = (rawUsers) => {
      const normalizedUsers = (Array.isArray(rawUsers) ? rawUsers : []).map(normalizeTrainerUserRecord);
      return {
        students: normalizedUsers.filter((user) => user.role === 'ALUNO'),
        instructors: normalizedUsers.filter(
          (user) =>
            (user.role === 'INSTRUTOR' || user.role === 'ADMIN_GERAL') && user.isEnabled !== false
        )
      };
    };

    try {
      const usersResponse = await requestStudentApi('/users');
      const users = Array.isArray(usersResponse && usersResponse.users) ? usersResponse.users : [];
      const fromUsersEndpoint = buildUsersPayload(users);
      if (fromUsersEndpoint.students.length) {
        return fromUsersEndpoint;
      }

      const overviewResponse = await requestStudentApi('/admin/overview');
      const overviewUsers = Array.isArray(
        overviewResponse &&
        overviewResponse.overview &&
        overviewResponse.overview.users
      )
        ? overviewResponse.overview.users
        : [];
      const fromOverviewEndpoint = buildUsersPayload(overviewUsers);
      return {
        students: fromOverviewEndpoint.students,
        instructors: fromOverviewEndpoint.instructors.length
          ? fromOverviewEndpoint.instructors
          : [fallbackCurrentInstructor]
      };
    } catch (_) {
      try {
        const overviewResponse = await requestStudentApi('/admin/overview');
        const overviewUsers = Array.isArray(
          overviewResponse &&
          overviewResponse.overview &&
          overviewResponse.overview.users
        )
          ? overviewResponse.overview.users
          : [];
        const fromOverviewEndpoint = buildUsersPayload(overviewUsers);
        return {
          students: fromOverviewEndpoint.students,
          instructors: fromOverviewEndpoint.instructors.length
            ? fromOverviewEndpoint.instructors
            : [fallbackCurrentInstructor]
        };
      } catch (_) {
        return {
          students: [],
          instructors: [fallbackCurrentInstructor]
        };
      }
    }
  }

  try {
    const mapStudentsPayload = (payload) => {
      const rawStudents = Array.isArray(payload && payload.users)
        ? payload.users
        : Array.isArray(payload && payload.students)
          ? payload.students
          : [];
      return rawStudents
        .map(normalizeTrainerUserRecord)
        .filter((user) => user.role === 'ALUNO');
    };
    const mapStudentsFromProgressReport = (payload) => {
      const reportStudents =
        payload &&
        payload.report &&
        Array.isArray(payload.report.students)
          ? payload.report.students
          : [];

      return reportStudents
        .map((item) => normalizeTrainerUserRecord({
          id: Number(item && item.studentId) || 0,
          name: String(item && item.studentName ? item.studentName : '').trim(),
          email: '',
          role: 'ALUNO',
          isEnabled: item && item.studentStatus !== 'Desabilitado'
        }))
        .filter((user) => user.id > 0);
    };

    const studentsResponse = await requestStudentApi('/users/students');
    let students = mapStudentsPayload(studentsResponse);

    if (!students.length) {
      try {
        const fallbackUsersResponse = await requestStudentApi('/users');
        students = mapStudentsPayload(fallbackUsersResponse);
      } catch (_) {}
    }

    if (!students.length) {
      try {
        const progressResponse = await requestStudentApi('/progress/instructor/students-report');
        students = mapStudentsFromProgressReport(progressResponse);
      } catch (_) {}
    }

    return {
      students,
      instructors: [fallbackCurrentInstructor]
    };
  } catch (_) {
    try {
      const fallbackUsersResponse = await requestStudentApi('/users');
      const students = Array.isArray(fallbackUsersResponse && fallbackUsersResponse.users)
        ? fallbackUsersResponse.users
          .map(normalizeTrainerUserRecord)
          .filter((user) => user.role === 'ALUNO')
        : [];

      return {
        students,
        instructors: [fallbackCurrentInstructor]
      };
    } catch (_) {}

    try {
      const progressResponse = await requestStudentApi('/progress/instructor/students-report');
      const reportStudents =
        progressResponse &&
        progressResponse.report &&
        Array.isArray(progressResponse.report.students)
          ? progressResponse.report.students
          : [];
      const students = reportStudents
        .map((item) => normalizeTrainerUserRecord({
          id: Number(item && item.studentId) || 0,
          name: String(item && item.studentName ? item.studentName : '').trim(),
          email: '',
          role: 'ALUNO',
          isEnabled: item && item.studentStatus !== 'Desabilitado'
        }))
        .filter((user) => user.id > 0);

      return {
        students,
        instructors: [fallbackCurrentInstructor]
      };
    } catch (_) {}

    return {
      students: [],
      instructors: [fallbackCurrentInstructor]
    };
  }
};

const loadTrainerManagementData = async (forceReload = false) => {
  if (!isTrainerManagerUser()) {
    resetTrainerManagementState();
    renderTrainerManagementPanel();
    return null;
  }

  if (trainerManagementState.loading) return null;
  if (trainerManagementState.loaded && !forceReload) {
    renderTrainerManagementPanel();
    return trainerManagementState;
  }

  trainerManagementState.loading = true;
  trainerManagementState.error = '';
  renderTrainerManagementPanel();

  try {
    const loadWarnings = [];

    let students = [];
    let instructors = [];
    try {
      const usersPayload = await fetchTrainerUsersByRole();
      students = Array.isArray(usersPayload && usersPayload.students)
        ? usersPayload.students
        : [];
      instructors = Array.isArray(usersPayload && usersPayload.instructors)
        ? usersPayload.instructors
        : [];
    } catch (error) {
      loadWarnings.push(
        error && error.message
          ? `Alunos/Instrutores: ${error.message}`
          : 'Alunos/Instrutores: não foi possível carregar.'
      );
    }

    let templates = [];
    try {
      const templatesResponse = await requestStudentApi('/workouts/templates?includeInactive=true');
      templates = Array.isArray(templatesResponse && templatesResponse.templates)
        ? templatesResponse.templates
        : [];
    } catch (error) {
      templates = [];
      loadWarnings.push(
        error && error.message
          ? `Modelos: ${error.message}`
          : 'Modelos: não foi possível carregar.'
      );
    }

    let sortedWorkouts = [];
    try {
      const workoutsResponse = await requestInstructorWorkoutsList({ includeInactive: true });
      const workouts = extractWorkoutsFromResponse(workoutsResponse);
      sortedWorkouts = workouts
        .slice()
        .sort((first, second) => (Number(first && first.id) || 0) - (Number(second && second.id) || 0));

      if (!trainerManagedWorkoutBaselineCaptured) {
        sortedWorkouts.forEach((workout) => {
          const workoutId = Number(workout && workout.id) || 0;
          if (workoutId > 0) trainerManagedWorkoutBaselineIds.add(workoutId);
        });
        trainerManagedWorkoutBaselineCaptured = true;
      }

      hideTrainerInitialWorkoutsOnce(sortedWorkouts);
    } catch (error) {
      sortedWorkouts = [];
      loadWarnings.push(
        error && error.message
          ? `Treinos: ${error.message}`
          : 'Treinos: não foi possível carregar.'
      );
    }

    let libraryExercises = [];
    try {
      const libraryResponse = await requestStudentApi('/library/exercises');
      libraryExercises = Array.isArray(libraryResponse && libraryResponse.exercises)
        ? libraryResponse.exercises
        : [];
    } catch (error) {
      libraryExercises = [];
      loadWarnings.push(
        error && error.message
          ? `Biblioteca: ${error.message}`
          : 'Biblioteca: não foi possível carregar.'
      );
    }

    const templateExercisesEntries = await Promise.all(
      templates.map(async (template) => {
        const templateId = Number(template && template.id) || 0;
        if (!templateId) return [String(templateId), []];

        try {
          const response = await requestStudentApi(
            `/workouts/templates/${encodeURIComponent(String(templateId))}/exercises`
          );
          const templateExercises = Array.isArray(response && response.templateExercises)
            ? response.templateExercises
              .slice()
              .sort((a, b) => (Number(a && a.order) || 0) - (Number(b && b.order) || 0))
            : [];
          return [String(templateId), templateExercises];
        } catch (_) {
          return [String(templateId), []];
        }
      })
    );

    const exercisesEntries = await Promise.all(
      sortedWorkouts.map(async (workout) => {
        const workoutId = Number(workout && workout.id) || 0;
        if (!workoutId) return [String(workoutId), []];

        try {
          const exercisesResponse = await requestStudentApi(`/workouts/${encodeURIComponent(String(workoutId))}/exercises`);
          const exercises = Array.isArray(exercisesResponse && exercisesResponse.exercises)
            ? exercisesResponse.exercises.slice().sort((a, b) => (Number(a && a.order) || 0) - (Number(b && b.order) || 0))
            : [];
          return [String(workoutId), exercises];
        } catch (_) {
          return [String(workoutId), []];
        }
      })
    );

    trainerManagementState.students = students;
    trainerManagementState.instructors = instructors;
    trainerManagementState.templates = templates;
    trainerManagementState.workouts = sortedWorkouts;
    trainerManagementState.library = libraryExercises;
    trainerManagementState.exercisesByWorkoutId = Object.fromEntries(exercisesEntries);
    trainerManagementState.templateExercisesByTemplateId = Object.fromEntries(templateExercisesEntries);
    studentData.library = libraryExercises.map(mapLibraryExerciseToStudentItem);
    trainerManagementState.loaded = true;
    trainerManagementState.error = loadWarnings.length
      ? `Alguns dados não carregaram: ${loadWarnings.join(' | ')}`
      : '';
  } catch (error) {
    trainerManagementState.error = error && error.message
      ? error.message
      : 'Não foi possível carregar os dados de gestão de treinos.';
  } finally {
    trainerManagementState.loading = false;
    renderTrainerManagementPanel();
  }

  return trainerManagementState;
};

const syncTrainerLinkedExercisesSummary = ({ workouts = [], selectedWorkoutId = '' } = {}) => {
  const normalizedSelectedWorkoutId = String(selectedWorkoutId || '').trim();
  const selectedWorkout = workouts.find(
    (workout) => String(Number(workout && workout.id) || 0) === normalizedSelectedWorkoutId
  ) || null;
  const selectedWorkoutName = selectedWorkout
    ? String((selectedWorkout.title || selectedWorkout.name || `Treino ${normalizedSelectedWorkoutId}`) || '').trim()
    : '';
  const fallbackWorkoutName = normalizedSelectedWorkoutId ? `Treino ${normalizedSelectedWorkoutId}` : 'Nenhum treino selecionado';
  const hasSelectedWorkout = Boolean(normalizedSelectedWorkoutId);
  const isExpanded = hasSelectedWorkout && isTrainerLinkedExercisesExpanded;

  if (trainerLinkedExercisesSummaryName) {
    trainerLinkedExercisesSummaryName.textContent = selectedWorkoutName || fallbackWorkoutName;
  }

  if (trainerLinkedExercisesSummary) {
    trainerLinkedExercisesSummary.hidden = !hasSelectedWorkout;
  }

  if (trainerLinkedExercisesList) {
    trainerLinkedExercisesList.hidden = !isExpanded;
  }

  if (trainerLinkedExercisesToggleButton) {
    trainerLinkedExercisesToggleButton.disabled = !hasSelectedWorkout;
    trainerLinkedExercisesToggleButton.classList.toggle('is-open', isExpanded);
    trainerLinkedExercisesToggleButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    trainerLinkedExercisesToggleButton.setAttribute(
      'aria-label',
      isExpanded ? 'Ocultar detalhes do treino' : 'Ver detalhes do treino'
    );
  }
};

const renderTrainerManagementPanel = () => {
  syncTrainerManagedWorkoutsPanelCollapseUi();
  syncTrainerManagedWorkoutsViewUi();
  const showPanelData = isTrainerManagerUser();

  if (trainerWorkoutRefreshButton) {
    trainerWorkoutRefreshButton.disabled = trainerManagementState.loading;
    trainerWorkoutRefreshButton.textContent = trainerManagementState.loading
      ? 'Atualizando...'
      : 'Atualizar dados';
    trainerWorkoutRefreshButton.setAttribute('aria-busy', trainerManagementState.loading ? 'true' : 'false');
  }

  if (!showPanelData) {
    closeTrainerExerciseLibraryPicker({ clearSearch: true });
    isTrainerLinkedExercisesExpanded = false;
    trainerManagedWorkoutExpandedIds.clear();
    trainerWorkoutDayAssignments = {};
    if (trainerWeekdayAssignmentList) trainerWeekdayAssignmentList.innerHTML = '';
    if (trainerWeekdayAssignmentWrap) trainerWeekdayAssignmentWrap.hidden = true;
    syncTrainerLinkedExercisesSummary({ workouts: [], selectedWorkoutId: '' });
    if (trainerWorkoutsTableBody) {
      trainerWorkoutsTableBody.innerHTML = '<tr><td colspan="8">Acesso exclusivo para Administrador Geral e Instrutor.</td></tr>';
    }
    if (trainerLibraryTableBody) {
      trainerLibraryTableBody.innerHTML = '<tr><td colspan="5">Acesso exclusivo para Administrador Geral e Instrutor.</td></tr>';
    }
    if (trainerExercisesTableBody) {
      trainerExercisesTableBody.innerHTML = '<tr><td colspan="1">Acesso exclusivo para Administrador Geral e Instrutor.</td></tr>';
    }
    if (trainerTemplateExercisesTableBody) {
      trainerTemplateExercisesTableBody.innerHTML = '<tr><td colspan="6">Acesso exclusivo para Administrador Geral e Instrutor.</td></tr>';
    }
    if (trainerExercisesTable) {
      trainerExercisesTable.classList.add('is-empty');
    }
    if (trainerTemplateExercisesTable) {
      trainerTemplateExercisesTable.classList.add('is-empty');
    }
    if (trainerWorkoutPanel) trainerWorkoutPanel.hidden = false;
    return;
  }

  if (trainerWorkoutError) {
    const hasError = Boolean(trainerManagementState.error);
    const nextMessage = hasError ? String(trainerManagementState.error || '').trim() : '';
    setInlineFeedback(trainerWorkoutError, nextMessage, false, {
      notice: false
    });
  }

  const students = Array.isArray(trainerManagementState.students) ? trainerManagementState.students : [];
  const instructors = Array.isArray(trainerManagementState.instructors) ? trainerManagementState.instructors : [];
  const templates = Array.isArray(trainerManagementState.templates) ? trainerManagementState.templates : [];
  const activeTemplates = templates.filter((template) => template && template.isActive !== false);
  const workouts = Array.isArray(trainerManagementState.workouts) ? trainerManagementState.workouts : [];
  const visibleWorkouts = getTrainerVisibleWorkouts(workouts);
  const workoutsForSelection = visibleWorkouts
    .slice()
    .sort((first, second) => {
      const firstTitle = String((first && (first.title || first.name)) || '').trim();
      const secondTitle = String((second && (second.title || second.name)) || '').trim();
      const titleCompare = firstTitle.localeCompare(secondTitle, 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      });
      if (titleCompare !== 0) return titleCompare;
      const firstId = Number(first && first.id) || 0;
      const secondId = Number(second && second.id) || 0;
      return firstId - secondId;
    });
  const libraryExercises = Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [];
  const templateExercisesByTemplateId =
    trainerManagementState.templateExercisesByTemplateId &&
      typeof trainerManagementState.templateExercisesByTemplateId === 'object'
      ? trainerManagementState.templateExercisesByTemplateId
      : {};
  const fallbackStudentsFromWorkouts = Array.from(
    new Set(
      workouts
        .map((workout) => Number(workout && workout.studentId) || 0)
        .filter((studentId) => studentId > 0)
    )
  ).map((studentId) => ({
    id: studentId,
    name: `Aluno ID ${studentId}`,
    email: '',
    role: 'ALUNO',
    isEnabled: true
  }));
  const studentsForSelection = students.length ? students : fallbackStudentsFromWorkouts;
  const usersById = new Map([...studentsForSelection, ...instructors].map((user) => [Number(user.id), user]));
  const libraryById = new Map(
    libraryExercises.map((exercise) => [Number(exercise && exercise.id) || 0, exercise])
  );
  const safeCell = (value) => escapeAdminCell(value);
  const templateOptionsMarkup = templates
    .map((template) => {
      const templateId = Number(template && template.id) || 0;
      const exercisesCount = Math.max(0, Number(template && template.exercisesCount) || 0);
      return `<option value="${safeCell(templateId)}">${safeCell(template && template.name)} (${safeCell(exercisesCount)} exercícios)</option>`;
    })
    .join('');
  const activeTemplateOptionsMarkup = activeTemplates
    .map((template) => {
      const templateId = Number(template && template.id) || 0;
      const exercisesCount = Math.max(0, Number(template && template.exercisesCount) || 0);
      return `<option value="${safeCell(templateId)}">${safeCell(template && template.name)} (${safeCell(exercisesCount)} exercícios)</option>`;
    })
    .join('');
  const libraryOptionsMarkup = libraryExercises
    .map((exercise) => {
      const group = normalizeLibraryGroupKey(exercise && exercise.group);
      const label = getLibraryGroupLabel(group, group);
      const id = Number(exercise && exercise.id) || 0;
      return `<option value="${safeCell(id)}">${safeCell(exercise && exercise.name)} (${safeCell(label)})</option>`;
    })
    .join('');
  const availableExerciseGroupKeys = getAvailableLibraryGroupKeys(libraryExercises, {
    includeKnownWhenEmpty: true
  });
  const previousSelectedExerciseGroups = getSelectedTrainerExerciseGroups();
  const searchTerm = normalizeText(trainerStudentSearchTerm || '');
  const selectableStudents = searchTerm
    ? studentsForSelection.filter((student) => normalizeText(student && student.name).includes(searchTerm))
    : studentsForSelection;
  const instructorSearchTerm = normalizeText(trainerInstructorSearchTerm || '');
  const selectableInstructors = instructorSearchTerm
    ? instructors.filter((instructor) => normalizeText(instructor && instructor.name).includes(instructorSearchTerm))
    : instructors;

  if (trainerExerciseGroupSelect) {
    const preservedGroups = previousSelectedExerciseGroups.filter((groupKey) =>
      availableExerciseGroupKeys.includes(groupKey)
    );
    trainerExerciseGroupSelect.innerHTML = availableExerciseGroupKeys
      .map(
        (groupKey) =>
          `<option value="${safeCell(groupKey)}">${safeCell(getLibraryGroupLabel(groupKey, groupKey))}</option>`
      )
      .join('');
    setSelectedTrainerExerciseGroups(preservedGroups);
    trainerExerciseGroupSelect.disabled = trainerManagementState.loading || !availableExerciseGroupKeys.length;
  }

  const selectedExerciseGroups = getSelectedTrainerExerciseGroups();
  const hasSelectedExerciseGroup = selectedExerciseGroups.length > 0;
  const groupedLibraryExercises = getTrainerLibraryExercisesBySelectedGroup();
  const isInstructorMode = isInstructorRole(studentData.userRole);

  if (trainerTemplateSelect) {
    const previousValue = trainerTemplateSelect.value;
    if (!activeTemplates.length) {
      trainerTemplateSelect.innerHTML = '<option value="">Nenhum modelo ativo disponível</option>';
    } else {
      trainerTemplateSelect.innerHTML = [
        '<option value="">Selecione um modelo</option>',
        activeTemplateOptionsMarkup,
      ].join('');

      if (previousValue && activeTemplates.some((template) => String(template.id) === String(previousValue))) {
        trainerTemplateSelect.value = previousValue;
      }
    }
  }

  if (trainerTemplateEditorSelect) {
    const previousValue = String(
      trainerTemplateEditorSelect.value || trainerTemplateEditorSelectedId || ''
    ).trim();
    if (!templates.length) {
      trainerTemplateEditorSelect.innerHTML = '<option value="">Nenhum template disponível</option>';
      trainerTemplateEditorSelectedId = '';
    } else {
      trainerTemplateEditorSelect.innerHTML = [
        '<option value="">Selecione um template</option>',
        templateOptionsMarkup,
      ].join('');

      let resolvedValue = '';
      if (previousValue && templates.some((template) => String(template.id) === previousValue)) {
        resolvedValue = previousValue;
      } else if (templates[0] && templates[0].id) {
        resolvedValue = String(templates[0].id);
      }

      if (resolvedValue) {
        trainerTemplateEditorSelect.value = resolvedValue;
      }
      trainerTemplateEditorSelectedId = resolvedValue;
    }

    trainerTemplateEditorSelect.disabled = trainerManagementState.loading || !templates.length;
  }

  const selectedTemplateForEditor =
    templates.find(
      (template) => String(template.id) === String(trainerTemplateEditorSelectedId || '')
    ) || null;

  if (trainerTemplateEditorNameInput) {
    trainerTemplateEditorNameInput.value = selectedTemplateForEditor
      ? String(selectedTemplateForEditor.name || '').trim()
      : '';
  }

  if (trainerTemplateEditorDescriptionInput) {
    trainerTemplateEditorDescriptionInput.value = selectedTemplateForEditor
      ? String(selectedTemplateForEditor.description || '').trim()
      : '';
  }

  if (trainerTemplateEditorActiveSelect) {
    trainerTemplateEditorActiveSelect.value =
      selectedTemplateForEditor && selectedTemplateForEditor.isActive === false
        ? 'false'
        : 'true';
    trainerTemplateEditorActiveSelect.disabled = trainerManagementState.loading || !templates.length;
  }

  if (trainerTemplateExerciseTemplateSelect) {
    const previousValue = String(
      trainerTemplateExerciseTemplateSelect.value ||
        trainerTemplateExerciseSelectedId ||
        trainerTemplateEditorSelectedId ||
        ''
    ).trim();

    if (!templates.length) {
      trainerTemplateExerciseTemplateSelect.innerHTML = '<option value="">Nenhum template disponível</option>';
      trainerTemplateExerciseSelectedId = '';
    } else {
      trainerTemplateExerciseTemplateSelect.innerHTML = [
        '<option value="">Selecione um template</option>',
        templateOptionsMarkup,
      ].join('');

      let resolvedValue = '';
      if (previousValue && templates.some((template) => String(template.id) === previousValue)) {
        resolvedValue = previousValue;
      } else if (templates[0] && templates[0].id) {
        resolvedValue = String(templates[0].id);
      }

      if (resolvedValue) {
        trainerTemplateExerciseTemplateSelect.value = resolvedValue;
      }
      trainerTemplateExerciseSelectedId = resolvedValue;
    }

    trainerTemplateExerciseTemplateSelect.disabled = trainerManagementState.loading || !templates.length;
  }

  if (trainerTemplateExercisesFilterSelect) {
    const previousValue = String(
      trainerTemplateExercisesFilterSelect.value ||
        trainerTemplateExerciseSelectedId ||
        trainerTemplateEditorSelectedId ||
        ''
    ).trim();
    if (!templates.length) {
      trainerTemplateExercisesFilterSelect.innerHTML = '<option value="">Nenhum template disponível</option>';
      trainerTemplateExerciseSelectedId = '';
    } else {
      trainerTemplateExercisesFilterSelect.innerHTML = [
        '<option value="">Selecione um template</option>',
        templateOptionsMarkup,
      ].join('');

      let resolvedValue = '';
      if (previousValue && templates.some((template) => String(template.id) === previousValue)) {
        resolvedValue = previousValue;
      } else if (templates[0] && templates[0].id) {
        resolvedValue = String(templates[0].id);
      }
      if (resolvedValue) {
        trainerTemplateExercisesFilterSelect.value = resolvedValue;
      }
      if (!trainerTemplateExerciseSelectedId && resolvedValue) {
        trainerTemplateExerciseSelectedId = resolvedValue;
      }
    }

    trainerTemplateExercisesFilterSelect.disabled = trainerManagementState.loading || !templates.length;
  }

  if (trainerTemplateExerciseLibrarySelect) {
    const previousValue = trainerTemplateExerciseLibrarySelect.value;
    if (!libraryExercises.length) {
      trainerTemplateExerciseLibrarySelect.innerHTML = '<option value="">Biblioteca vazia</option>';
    } else {
      trainerTemplateExerciseLibrarySelect.innerHTML = [
        '<option value="">Selecione um exercício</option>',
        libraryOptionsMarkup,
      ].join('');
      if (previousValue && libraryExercises.some((exercise) => String(exercise.id) === String(previousValue))) {
        trainerTemplateExerciseLibrarySelect.value = previousValue;
      }
    }
    trainerTemplateExerciseLibrarySelect.disabled = trainerManagementState.loading || !libraryExercises.length;
  }

  const selectedTemplateForExerciseFormId = String(
    (trainerTemplateExerciseTemplateSelect && trainerTemplateExerciseTemplateSelect.value) ||
      trainerTemplateExerciseSelectedId ||
      ''
  ).trim();
  const selectedTemplateExercisesForForm =
    templateExercisesByTemplateId[selectedTemplateForExerciseFormId] || [];
  const suggestedTemplateOrder = selectedTemplateExercisesForForm.length + 1;
  if (trainerTemplateExerciseOrderInput) {
    if (document.activeElement !== trainerTemplateExerciseOrderInput) {
      trainerTemplateExerciseOrderInput.value = String(Math.max(1, suggestedTemplateOrder));
    }
  }

  if (trainerTemplateStudentSelect) {
    const previousValue = trainerTemplateStudentSelect.value;
    if (!studentsForSelection.length) {
      trainerTemplateStudentSelect.innerHTML = '<option value="">Nenhum aluno disponível</option>';
    } else if (!selectableStudents.length) {
      trainerTemplateStudentSelect.innerHTML = '<option value="">Nenhum aluno encontrado</option>';
    } else {
      trainerTemplateStudentSelect.innerHTML = [
        '<option value="">Selecione o aluno</option>',
        ...selectableStudents.map(
          (student) =>
            `<option value="${safeCell(student.id)}">${safeCell(student.name)}${student && student.isEnabled === false ? ' (Desabilitado)' : ''}</option>`
        )
      ].join('');

      if (previousValue && selectableStudents.some((student) => String(student.id) === String(previousValue))) {
        trainerTemplateStudentSelect.value = previousValue;
      } else {
        trainerTemplateStudentSelect.value = '';
      }
    }
  }

  if (trainerTemplateInstructorWrap) {
    trainerTemplateInstructorWrap.hidden = !isGeneralAdminUser();
  }

  if (trainerTemplateInstructorSelect) {
    if (isGeneralAdminUser()) {
      const previousValue = trainerTemplateInstructorSelect.value;
      if (!instructors.length) {
        trainerTemplateInstructorSelect.innerHTML = '<option value="">Nenhum instrutor disponível</option>';
      } else if (!selectableInstructors.length) {
        trainerTemplateInstructorSelect.innerHTML = '<option value="">Nenhum instrutor encontrado</option>';
      } else {
        trainerTemplateInstructorSelect.innerHTML = selectableInstructors
          .map(
            (instructor) =>
              `<option value="${safeCell(instructor.id)}">${safeCell(instructor.name)} (${safeCell(getRoleLabel(instructor.role))})</option>`
          )
          .join('');

        if (previousValue && selectableInstructors.some((instructor) => String(instructor.id) === String(previousValue))) {
          trainerTemplateInstructorSelect.value = previousValue;
        }
      }
      trainerTemplateInstructorSelect.disabled = false;
    } else {
      const currentId = Number(studentData.userId) || 0;
      trainerTemplateInstructorSelect.innerHTML = `<option value="${currentId}">${studentData.userName || 'Instrutor atual'}</option>`;
      trainerTemplateInstructorSelect.disabled = true;
    }
  }

  if (trainerWorkoutStudentSelect) {
    const previousValue = trainerWorkoutStudentSelect.value;
    if (!studentsForSelection.length) {
      trainerWorkoutStudentSelect.innerHTML = '<option value="">Nenhum aluno disponível</option>';
      trainerWorkoutStudentConfirmed = false;
    } else if (!selectableStudents.length) {
      trainerWorkoutStudentSelect.innerHTML = '<option value="">Nenhum aluno encontrado</option>';
      trainerWorkoutStudentConfirmed = false;
    } else {
      trainerWorkoutStudentSelect.innerHTML = [
        '<option value="">Selecione o aluno</option>',
        ...selectableStudents.map(
          (student) =>
            `<option value="${safeCell(student.id)}">${safeCell(student.name)}${student && student.isEnabled === false ? ' (Desabilitado)' : ''}</option>`
        )
      ].join('');

      if (previousValue && selectableStudents.some((student) => String(student.id) === String(previousValue))) {
        trainerWorkoutStudentSelect.value = previousValue;
      } else {
        trainerWorkoutStudentSelect.value = '';
        trainerWorkoutStudentConfirmed = false;
      }
    }

    trainerWorkoutStudentConfirmed = (Number(trainerWorkoutStudentSelect.value) || 0) > 0;
  }

  if (trainerWorkoutInstructorWrap) {
    trainerWorkoutInstructorWrap.hidden = !isGeneralAdminUser();
  }

  if (trainerWorkoutInstructorSelect) {
    if (isGeneralAdminUser()) {
      const previousValue = trainerWorkoutInstructorSelect.value;
      if (!instructors.length) {
        trainerWorkoutInstructorSelect.innerHTML = '<option value="">Nenhum instrutor disponível</option>';
      } else if (!selectableInstructors.length) {
        trainerWorkoutInstructorSelect.innerHTML = '<option value="">Nenhum instrutor encontrado</option>';
      } else {
        trainerWorkoutInstructorSelect.innerHTML = [
          '<option value="">Selecione o instrutor</option>',
          ...selectableInstructors.map(
            (instructor) =>
              `<option value="${safeCell(instructor.id)}">${safeCell(instructor.name)} (${safeCell(getRoleLabel(instructor.role))})</option>`
          )
        ].join('');

        if (previousValue && selectableInstructors.some((instructor) => String(instructor.id) === String(previousValue))) {
          trainerWorkoutInstructorSelect.value = previousValue;
        } else {
          trainerWorkoutInstructorSelect.value = '';
        }
      }
      trainerWorkoutInstructorSelect.disabled = false;
    } else {
      const currentId = Number(studentData.userId) || 0;
      trainerWorkoutInstructorSelect.innerHTML = `<option value="${currentId}">${studentData.userName || 'Instrutor atual'}</option>`;
      trainerWorkoutInstructorSelect.disabled = true;
    }
  }

  if (trainerWorkoutPredefinedSelect) {
    const previousValue = normalizeWorkoutDefinitionLabel(trainerWorkoutPredefinedSelect.value);
    trainerWorkoutDefinitionsCatalog = buildTrainerWorkoutDefinitionsCatalog(
      visibleWorkouts,
      trainerManagementState.exercisesByWorkoutId
    );

    const definitionOptionsMarkup = trainerWorkoutDefinitionsCatalog
      .map((definition) => {
        const label = normalizeWorkoutDefinitionLabel(definition && definition.label);
        if (!label) return '';
        return `<option value="${safeCell(label)}">${safeCell(formatWorkoutDefinitionDisplayName(label))}</option>`;
      })
      .filter(Boolean)
      .join('');

    trainerWorkoutPredefinedSelect.innerHTML = [
      '<option value="">Selecione a definição</option>',
      definitionOptionsMarkup
    ].join('');

    if (
      previousValue &&
      trainerWorkoutDefinitionsCatalog.some(
        (definition) => normalizeWorkoutDefinitionLabel(definition && definition.label) === previousValue
      )
    ) {
      trainerWorkoutPredefinedSelect.value = previousValue;
    }

    trainerWorkoutPredefinedSelect.disabled =
      trainerManagementState.loading || !trainerWorkoutDefinitionsCatalog.length;
    const currentPredefinedSelection = normalizeWorkoutDefinitionLabel(
      trainerWorkoutPredefinedSelect.value
    );
    if (!currentPredefinedSelection) {
      trainerWorkoutPredefinedLastAppliedLabel = '';
    } else if (currentPredefinedSelection !== trainerWorkoutPredefinedLastAppliedLabel) {
      applyPredefinedWorkoutSelectionToAssignmentForm();
      trainerWorkoutPredefinedLastAppliedLabel = currentPredefinedSelection;
    }
  }

  renderTrainerWeekdayAssignmentSelectors(activeTemplates);

  if (trainerWorkoutCreateCard) {
    trainerWorkoutCreateCard.hidden = false;
  }

  if (trainerExerciseWorkoutSelect) {
    const previousValue = trainerExerciseWorkoutSelect.value;
    const createWorkoutOptionMarkup =
      `<option value="${TRAINER_WORKOUT_CREATE_OPTION_VALUE}">+ Criar treino agora</option>`;
    if (!activeTemplates.length) {
      trainerExerciseWorkoutSelect.innerHTML = [
        '<option value="">Selecione o treino cadastrado</option>',
        createWorkoutOptionMarkup
      ].join('');
      trainerExerciseWorkoutSelect.value = '';
      trainerExerciseComposerSelectedId = '';
    } else {
      const workoutOptionsMarkup = activeTemplates
        .slice()
        .sort((first, second) =>
          String((first && first.name) || '').localeCompare(
            String((second && second.name) || ''),
            'pt-BR',
            { numeric: true, sensitivity: 'base' }
          )
        )
        .map(
          (template) =>
            `<option value="${safeCell(Number(template.id) || 0)}">${safeCell(formatWorkoutDefinitionDisplayName(template && template.name) || `Treino ${template.id}`)}</option>`
        )
        .join('');
      trainerExerciseWorkoutSelect.innerHTML = [
        '<option value="">Selecione o treino cadastrado</option>',
        createWorkoutOptionMarkup,
        workoutOptionsMarkup
      ].join('');

      const targetValue = String(trainerExerciseComposerSelectedId || '').trim();
      if (targetValue && activeTemplates.some((template) => String(template.id) === targetValue)) {
        trainerExerciseWorkoutSelect.value = targetValue;
      } else if (previousValue && activeTemplates.some((template) => String(template.id) === String(previousValue))) {
        trainerExerciseWorkoutSelect.value = previousValue;
      } else {
        trainerExerciseWorkoutSelect.value = '';
      }
      trainerExerciseComposerSelectedId = String(trainerExerciseWorkoutSelect.value || '').trim();
    }
  }
  syncTrainerExerciseWorkoutQuickActions();

  if (trainerExerciseSearchInput && document.activeElement !== trainerExerciseSearchInput) {
    trainerExerciseSearchInput.value = String(trainerExerciseSearchTerm || '').trim();
  }

  if (trainerExerciseLibrarySelect) {
    const previousValue = trainerExerciseLibrarySelect.value;
    if (isInstructorMode) {
      if (!libraryExercises.length) {
        trainerExerciseLibrarySelect.innerHTML = '<option value="">Biblioteca vazia</option>';
      } else {
        trainerExerciseLibrarySelect.innerHTML = [
          '<option value="">Clique para abrir a biblioteca geral</option>',
          libraryOptionsMarkup,
        ].join('');

        if (
          previousValue &&
          libraryExercises.some((exercise) => String(exercise.id) === String(previousValue))
        ) {
          trainerExerciseLibrarySelect.value = previousValue;
        }
      }

      trainerExerciseLibrarySelect.disabled =
        trainerManagementState.loading || !libraryExercises.length;
    } else {
      if (!hasSelectedExerciseGroup) {
        trainerExerciseLibrarySelect.innerHTML = '<option value="">Selecione pelo menos um grupo muscular primeiro</option>';
      } else if (!groupedLibraryExercises.length) {
        const selectedGroupLabel = getTrainerExerciseGroupsLabel(
          selectedExerciseGroups,
          'os grupos selecionados'
        );
        trainerExerciseLibrarySelect.innerHTML = `<option value="">Nenhum exercício disponível em ${safeCell(selectedGroupLabel)}</option>`;
      } else {
        const groupedLibraryOptionsMarkup = groupedLibraryExercises
          .map((exercise) => {
            const id = Number(exercise && exercise.id) || 0;
            return `<option value="${safeCell(id)}">${safeCell(exercise && exercise.name)}</option>`;
          })
          .join('');

        trainerExerciseLibrarySelect.innerHTML = [
          '<option value="">Selecionar da biblioteca</option>',
          groupedLibraryOptionsMarkup,
        ].join('');

        if (
          previousValue &&
          groupedLibraryExercises.some((exercise) => String(exercise.id) === String(previousValue))
        ) {
          trainerExerciseLibrarySelect.value = previousValue;
        }
      }

      trainerExerciseLibrarySelect.disabled =
        trainerManagementState.loading ||
        !hasSelectedExerciseGroup ||
        !groupedLibraryExercises.length;
    }
  }

  if (trainerExercisesFilterSelect) {
    const assignableWorkouts = getTrainerAssignableWorkoutsForSelectedStudent(visibleWorkouts);
    const previousValue = trainerExercisesFilterSelect.value;
    if (!assignableWorkouts.length) {
      trainerExercisesFilterSelect.innerHTML = '<option value="">Nenhum treino disponível</option>';
      trainerExercisesFilterSelect.value = '';
    } else {
      const workoutOptions = assignableWorkouts
        .map(
          (workout) =>
            `<option value="${safeCell(Number(workout.id) || 0)}">${safeCell(workout.title || `Treino ${workout.id}`)}</option>`
        )
        .join('');
      trainerExercisesFilterSelect.innerHTML = [
        '<option value="">Selecione o treino</option>',
        workoutOptions
      ].join('');
      const targetValue = String(trainerExerciseTargetWorkoutId || '').trim();
      if (previousValue && assignableWorkouts.some((workout) => String(workout.id) === String(previousValue))) {
        trainerExercisesFilterSelect.value = previousValue;
      } else if (targetValue && assignableWorkouts.some((workout) => String(workout.id) === targetValue)) {
        trainerExercisesFilterSelect.value = targetValue;
      } else {
        trainerExercisesFilterSelect.value = '';
      }
    }
    trainerExercisesFilterSelect.disabled = trainerManagementState.loading || !assignableWorkouts.length;
  }

  syncTrainerAssignedWorkoutSelection(resolveTrainerExerciseTargetWorkoutId());

  if (trainerWorkoutSubmitButton) {
    const submitLabelNode = trainerWorkoutSubmitButton.querySelector('span');
    const submitLabel = 'Designar ao aluno';
    if (submitLabelNode) {
      submitLabelNode.textContent = submitLabel;
    } else {
      trainerWorkoutSubmitButton.textContent = submitLabel;
    }

    const hasSelectableInstructor = !isGeneralAdminUser() || selectableInstructors.length > 0;
    trainerWorkoutSubmitButton.disabled =
      trainerManagementState.loading ||
      !activeTemplates.length ||
      !selectableStudents.length ||
      !hasSelectableInstructor;
  }

  if (trainerTemplateSubmitButton) {
    const hasSelectableInstructor = !isGeneralAdminUser() || selectableInstructors.length > 0;
    trainerTemplateSubmitButton.disabled =
      trainerManagementState.loading ||
      !activeTemplates.length ||
      !selectableStudents.length ||
      !hasSelectableInstructor;
  }

  if (trainerTemplateFormSubmitButton) {
    trainerTemplateFormSubmitButton.disabled = trainerManagementState.loading;
  }

  if (trainerTemplateEditorSubmitButton) {
    trainerTemplateEditorSubmitButton.disabled =
      trainerManagementState.loading || !templates.length;
  }

  if (trainerTemplateExerciseSubmitButton) {
    trainerTemplateExerciseSubmitButton.disabled =
      trainerManagementState.loading || !templates.length || !libraryExercises.length;
  }

  syncTrainerExerciseComposerUi();

  if (trainerExerciseSubmitButton) {
    trainerExerciseSubmitButton.disabled =
      trainerManagementState.loading ||
      !isTrainerExerciseComposerOpen;
  }

  if (trainerLibrarySubmitButton) {
    trainerLibrarySubmitButton.disabled = trainerManagementState.loading;
  }

  if (trainerWorkoutsTableBody) {
    const managedWorkoutsForDisplay = visibleWorkouts.filter((workout) => {
      const workoutId = Number(workout && workout.id) || 0;
      if (!workoutId) return false;
      return true;
    });
    const isDefinitionView =
      normalizeTrainerManagedWorkoutsView(trainerManagedWorkoutsView) === 'definition';

    const definitionRows = isDefinitionView
      ? templates
        .slice()
        .sort((first, second) =>
          String((first && first.name) || '').localeCompare(
            String((second && second.name) || ''),
            'pt-BR',
            { numeric: true, sensitivity: 'base' }
          )
        )
        .map((template) => {
          const templateId = Number(template && template.id) || 0;
          const linkedWorkouts = visibleWorkouts.filter(
            (workout) => Number(workout && workout.originTemplateId) === templateId
          );
          const studentIds = new Set(
            linkedWorkouts
              .map((workout) => Number(workout && workout.studentId) || 0)
              .filter((studentId) => studentId > 0)
          );
          const activeAssignmentsCount = linkedWorkouts.filter((workout) => isWorkoutActive(workout)).length;
          const inactiveAssignmentsCount = linkedWorkouts.filter((workout) => isWorkoutInactive(workout)).length;
          return {
            templateId,
            name: String((template && template.name) || '').trim() || `Treino ${templateId || '-'}`,
            statusLabel: template && template.isActive === false ? 'Inativo' : 'Ativo',
            statusClass: template && template.isActive === false ? 'is-disabled' : 'is-success',
            exercisesCount: (
              trainerManagementState.templateExercisesByTemplateId[String(templateId)] || []
            ).length,
            studentsCount: studentIds.size,
            assignmentsCount: linkedWorkouts.length,
            activeAssignmentsCount,
            inactiveAssignmentsCount,
            createdAt: template && template.createdAt ? template.createdAt : null
          };
        })
      : [];
    const rowsForDisplay = isDefinitionView
      ? definitionRows
      : managedWorkoutsForDisplay;

      if (!rowsForDisplay.length) {
        trainerManagedWorkoutExpandedIds.clear();
        trainerWorkoutsTableBody.innerHTML = isDefinitionView
        ? '<tr><td colspan="8">Nenhum treino cadastrado.</td></tr>'
        : '<tr><td colspan="8">Nenhum treino atribuído ao aluno.</td></tr>';
    } else {
      const visibleManagedRows = isGeneralAdminUser()
        ? rowsForDisplay.slice()
        : rowsForDisplay.slice(0, TRAINER_MANAGED_WORKOUTS_PREVIEW_LIMIT);
      const validWorkoutIds = new Set(
        visibleManagedRows
          .map((row) =>
            isDefinitionView
              ? Number(row && row.templateId) || 0
              : Number(row && row.id) || 0
          )
          .filter((id) => id > 0)
      );
      Array.from(trainerManagedWorkoutExpandedIds).forEach((workoutId) => {
        if (!validWorkoutIds.has(workoutId)) trainerManagedWorkoutExpandedIds.delete(workoutId);
      });

      trainerWorkoutsTableBody.innerHTML = visibleManagedRows
        .map((row) => {
          if (isDefinitionView) {
            const templateId = Number(row && row.templateId) || 0;
            const definitionName =
              formatWorkoutDefinitionDisplayName((row && row.name) || `Treino ${templateId || '-'}`) || '-';
            const objectiveLabel = '-';
            const statusLabel = String((row && row.statusLabel) || 'Inativo').trim() || 'Inativo';
            const statusClass = String((row && row.statusClass) || '').trim();
            const exercisesCount = Math.max(0, Number(row && row.exercisesCount) || 0);
            const studentsCount = Math.max(0, Number(row && row.studentsCount) || 0);
            const assignmentsCount = Math.max(0, Number(row && row.assignmentsCount) || 0);
            const activeAssignmentsCount = Math.max(0, Number(row && row.activeAssignmentsCount) || 0);
            const inactiveAssignmentsCount = Math.max(0, Number(row && row.inactiveAssignmentsCount) || 0);
            const studentsLabel = studentsCount === 1 ? '1 aluno' : `${studentsCount} alunos`;
            const assignmentsLabel = assignmentsCount === 1 ? '1 vínculo' : `${assignmentsCount} vínculos`;
            const deactivateDefinitionMarkup = templateId > 0 && statusLabel !== 'Inativo'
              ? `
                  <button
                    class="student-progress-action-btn trainer-action-warning"
                    type="button"
                    data-trainer-workout-definition-deactivate
                    data-template-id="${safeCell(templateId)}"
                    data-definition-name="${safeCell(definitionName)}"
                  >
                    Desativar
                  </button>
                `
              : '';
            const deleteDefinitionMarkup = templateId > 0 && statusLabel === 'Inativo'
              ? `
                  <button
                    class="student-progress-action-btn trainer-action-danger"
                    type="button"
                    data-trainer-workout-definition-delete
                    data-template-id="${safeCell(templateId)}"
                    data-definition-name="${safeCell(definitionName)}"
                  >
                    Excluir
                  </button>
                `
              : '';
            const definitionActionsMarkup = `
              <div class="trainer-table-actions">
                ${templateId > 0
                  ? `
                      <button
                        class="student-progress-action-btn trainer-action-icon-btn trainer-action-neutral"
                        type="button"
                        data-trainer-workout-definition-edit-exercises
                        data-template-id="${safeCell(templateId)}"
                        data-definition-name="${safeCell(definitionName)}"
                        aria-label="Editar exercícios da nomeclatura"
                        title="Editar exercícios da nomeclatura"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                          <path d="m13 5 4 4"></path>
                        </svg>
                      </button>
                    `
                  : ''}
                ${deactivateDefinitionMarkup || deleteDefinitionMarkup || '<span class="admin-overview-action-muted">Sem ações disponíveis</span>'}
              </div>
            `;

            return `
              <tr class="trainer-managed-workout-row is-definition" data-workout-id="${safeCell(templateId || '')}">
                <td data-label="ID">${templateId ? safeCell(templateId) : '-'}</td>
                <td class="trainer-managed-workout-summary-cell" data-label="Nome do treino">
                  <div class="trainer-managed-workout-summary">
                    <div class="trainer-managed-workout-summary-main">
                      <strong>${safeCell(definitionName)}</strong>
                      <small class="trainer-managed-workout-kind is-definition">Treino cadastrado</small>
                    </div>
                  </div>
                </td>
                <td data-label="Aluno">${safeCell(studentsLabel)}<small>${safeCell(assignmentsLabel)}</small></td>
                <td data-label="Objetivo">${safeCell(objectiveLabel)}</td>
                <td data-label="Status"><span class="trainer-status-chip ${statusClass}">${safeCell(statusLabel)}</span></td>
                <td data-label="Exercícios">${safeCell(exercisesCount)}</td>
                <td data-label="Criado em">${safeCell(formatAdminDate(row && row.createdAt))}</td>
                <td data-label="Ações">${definitionActionsMarkup}</td>
              </tr>
            `;
          }

          const workout = row;
          const workoutId = Number(workout && workout.id) || 0;
          const workoutName = String((workout && (workout.title || workout.name)) || `Treino ${workoutId || '-'}`).trim() || '-';
          const student = usersById.get(Number(workout && workout.studentId));
          const exercises = getTrainerWorkoutExercisesWithTemplateFallback(workout);
          const exercisesCount = Array.isArray(exercises) && exercises.length
            ? exercises.length
            : Math.max(0, Number(workout && workout.totalExercises) || 0);
          const objectiveLabel = String(workout && (workout.objective || workout.objetivo) || '').trim() || '-';
          const statusLabel = 'Disponivel';
          const statusClass = 'is-success';
          const toggleAriaLabel = 'Visualizar detalhes do treino';

          return `
            <tr class="trainer-managed-workout-row" data-workout-id="${safeCell(workoutId)}">
              <td data-label="ID">${safeCell(workoutId)}</td>
              <td class="trainer-managed-workout-summary-cell" data-label="Nome do treino">
                <div class="trainer-managed-workout-summary">
                  <div class="trainer-managed-workout-summary-main">
                    <strong>${safeCell(workoutName)}</strong>
                    <small class="trainer-managed-workout-kind is-assigned">Treino do aluno</small>
                  </div>
                  <button
                    class="trainer-linked-exercises-toggle trainer-managed-workout-toggle"
                    type="button"
                    data-trainer-workout-toggle-details
                    data-workout-id="${safeCell(workoutId)}"
                    aria-label="${safeCell(toggleAriaLabel)}"
                    aria-expanded="false"
                    ${workoutId > 0 ? '' : 'disabled'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </td>
              <td data-label="Aluno">${safeCell(student ? student.name : `ID ${workout.studentId || '-'}`)}</td>
              <td data-label="Objetivo">${safeCell(objectiveLabel)}</td>
              <td data-label="Status"><span class="trainer-status-chip ${statusClass}">${safeCell(statusLabel)}</span></td>
              <td data-label="Exercícios">${safeCell(exercisesCount)}</td>
              <td data-label="Criado em">${safeCell(formatAdminDate(workout.createdAt))}</td>
              <td data-label="Ações">
                <div class="trainer-table-actions">
                  <button
                    class="student-progress-action-btn"
                    type="button"
                    data-trainer-workout-edit
                    data-workout-id="${safeCell(workoutId)}"
                  >
                    Editar
                  </button>
                  <button
                    class="student-progress-action-btn trainer-action-danger"
                    type="button"
                    data-trainer-workout-delete
                    data-workout-id="${safeCell(workoutId)}"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  if (trainerLibraryTableBody) {
    if (!libraryExercises.length) {
      trainerLibraryTableBody.innerHTML = '<tr><td colspan="5">Nenhum exercício cadastrado na biblioteca.</td></tr>';
    } else {
      trainerLibraryTableBody.innerHTML = libraryExercises
        .map((exercise) => {
          const group = normalizeLibraryGroupKey(exercise && exercise.group);
          const imageUrl = resolveApiMediaUrl(String((exercise && exercise.imageUrl) || '').trim());
          const hasSafeImageUrl = Boolean(imageUrl);
          const seriesCount = Math.max(
            1,
            Number(
              exercise &&
              (
                exercise.seriesCount !== undefined
                  ? exercise.seriesCount
                  : exercise.series !== undefined
                    ? exercise.series
                    : exercise.series_count
              )
            ) || 3
          );
          const repetitions = Math.max(1, Number(exercise && exercise.repetitions) || 10);
          const durationSeconds = Math.max(10, Number(exercise && exercise.durationSeconds) || 60);
          const restSeconds = Math.max(0, Number(exercise && exercise.restSeconds) || 30);
          const persistedCaloriesEstimate = Number(
            exercise &&
              (
                exercise.caloriesEstimate !== undefined
                  ? exercise.caloriesEstimate
                  : exercise.calories_estimate !== undefined
                    ? exercise.calories_estimate
                    : exercise.calories
              )
          );
          const caloriesEstimate =
            Number.isFinite(persistedCaloriesEstimate) && persistedCaloriesEstimate > 0
              ? Math.max(0, Math.round(persistedCaloriesEstimate))
              : estimateExerciseCalories({
                durationSeconds,
                repetitions,
                restSeconds,
                loadKg: Number(exercise && exercise.loadKg) || 0
              });

          return `
            <tr>
              <td data-label="ID">${safeCell(Number(exercise.id) || 0)}</td>
              <td data-label="Nome">${safeCell(exercise.name || '-')}</td>
              <td data-label="Grupo">${safeCell(LIBRARY_GROUP_LABELS[group] || group)}</td>
              <td data-label="Padrão">${safeCell(`${seriesCount} séries | ${repetitions} reps | ${formatSecondsLabel(durationSeconds)} | desc ${formatSecondsLabel(restSeconds)} | ${caloriesEstimate} kcal`)}</td>
              <td data-label="Foto">${hasSafeImageUrl ? `<a href="${safeCell(imageUrl)}" target="_blank" rel="noopener">Ver foto</a>` : '-'}</td>
            </tr>
          `;
        })
        .join('');
    }
  }

  if (trainerTemplateExercisesTableBody) {
    const selectedTemplateId = String(
      (trainerTemplateExercisesFilterSelect && trainerTemplateExercisesFilterSelect.value) ||
      trainerTemplateExerciseSelectedId ||
      (templates[0] && templates[0].id) ||
      ''
    );
    const selectedTemplateExercises = templateExercisesByTemplateId[selectedTemplateId] || [];
    const hasTemplateExercises = Boolean(selectedTemplateId) && selectedTemplateExercises.length > 0;

    if (!hasTemplateExercises) {
      trainerTemplateExercisesTableBody.innerHTML = '<tr><td colspan="6">Nenhum exercício vinculado ao template selecionado.</td></tr>';
    } else {
      trainerTemplateExercisesTableBody.innerHTML = selectedTemplateExercises
        .map((item) => {
          const fallbackExercise = libraryById.get(Number(item && item.exerciseId) || 0) || null;
          const exercise = item && item.exercise ? item.exercise : fallbackExercise;
          const exerciseName = exercise && exercise.name
            ? exercise.name
            : `Exercício ${Number(item && item.exerciseId) || '-'}`;

          return `
            <tr>
              <td data-label="Ordem">${safeCell(Number(item && item.order) || 1)}</td>
              <td data-label="Exercício">${safeCell(exerciseName)}</td>
              <td data-label="Séries">${safeCell(Number(item && item.series) || 1)}</td>
              <td data-label="Repetições">${safeCell(Number(item && item.reps) || 1)}</td>
              <td data-label="Carga padrão">${safeCell(`${Math.max(0, Number(item && item.defaultLoad) || 0)} kg`)}</td>
              <td data-label="Descanso">${safeCell(formatSecondsLabel(item && item.restTime))}</td>
            </tr>
          `;
        })
        .join('');
    }

    if (trainerTemplateExercisesTable) {
      trainerTemplateExercisesTable.classList.toggle('is-empty', !hasTemplateExercises);
    }
  }

  if (trainerExercisesTableBody) {
    const selectedWorkoutId = String(
      trainerExercisesFilterSelect ? trainerExercisesFilterSelect.value : ''
    ).trim();
    if (!selectedWorkoutId) {
      isTrainerLinkedExercisesExpanded = false;
    }
    const exercises = trainerManagementState.exercisesByWorkoutId[selectedWorkoutId] || [];
    const hasExercises = Boolean(selectedWorkoutId) && exercises.length > 0;

    if (!hasExercises) {
      trainerExercisesTableBody.innerHTML = '<tr><td colspan="1">Nenhum exercício cadastrado para este treino.</td></tr>';
    } else {
      trainerExercisesTableBody.innerHTML = exercises
        .map((exercise) => {
          const exerciseName = String((exercise && exercise.name) || '').trim() || '-';
          const exerciseVideoUrl = String(
            (exercise && (exercise.videoUrl || exercise.video)) || ''
          ).trim();
          const hasVideo = Boolean(exerciseVideoUrl);
          const buttonLabel = hasVideo
            ? `Ver vídeo de ${exerciseName}`
            : `Vídeo indisponível para ${exerciseName}`;

          return `
            <tr>
              <td data-label="Exercício">
                <div class="trainer-linked-exercise-item">
                  <span class="trainer-linked-exercise-name">${safeCell(exerciseName)}</span>
                  <button
                    class="trainer-linked-exercises-toggle trainer-linked-exercise-video-btn"
                    type="button"
                    data-trainer-workout-exercise-video
                    data-exercise-name="${safeCell(exerciseName)}"
                    data-video-url="${safeCell(exerciseVideoUrl)}"
                    aria-label="${safeCell(buttonLabel)}"
                    title="${safeCell(buttonLabel)}"
                    ${hasVideo ? '' : 'disabled'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    }

    if (trainerExercisesTable) {
      trainerExercisesTable.classList.toggle('is-empty', !hasExercises);
    }

    syncTrainerLinkedExercisesSummary({
      workouts,
      selectedWorkoutId
    });
  }
};

const loadTrainerProgressData = async (forceReload = false) => {
  const token = loadStudentAuthToken();
  if (token) {
    try {
      await syncSessionProfileFromServer({
        token,
        remember: loadRememberPreference(),
        refreshUi: false
      });
    } catch (_) {}
  }

  if (!isTrainerManagerUser()) {
    resetTrainerProgressState();
    renderTrainerProgressPanel();
    return null;
  }

  if (trainerProgressState.loading) return null;
  if (trainerProgressState.loaded && !forceReload) {
    renderTrainerProgressPanel();
    return trainerProgressState;
  }

  trainerProgressState.loading = true;
  trainerProgressState.error = '';
  renderTrainerProgressPanel();

  try {
    const response = await requestStudentApi('/progress/instructor/students-report');
    const report = response && response.report ? response.report : {};
    const students = Array.isArray(report && report.students) ? report.students : [];

    trainerProgressState.weekStartKey = String(report && report.weekStartKey ? report.weekStartKey : '').trim();
    trainerProgressState.weekEndKey = String(report && report.weekEndKey ? report.weekEndKey : '').trim();
    trainerProgressState.referenceDateKey = String(
      report && report.referenceDateKey ? report.referenceDateKey : ''
    ).trim();
    trainerProgressState.stats = {
      totalStudents: Number(report && report.stats && report.stats.totalStudents) || 0,
      totalAssignedWorkouts: Number(report && report.stats && report.stats.totalAssignedWorkouts) || 0,
      totalCompletedSessions: Number(report && report.stats && report.stats.totalCompletedSessions) || 0
    };
    trainerProgressState.students = students;

    const previousSelectedId = Number(trainerProgressState.selectedStudentId) || 0;
    const selectedExists = students.some(
      (student) => Number(student && student.studentId) === previousSelectedId
    );
    trainerProgressState.selectedStudentId = selectedExists ? previousSelectedId : 0;

    trainerProgressState.loaded = true;
    trainerProgressState.error = '';
  } catch (error) {
    trainerProgressState.error = error && error.message
      ? error.message
      : 'Não foi possível carregar os relatórios dos alunos.';

    const token = loadStudentAuthToken();
    if (token) {
      try {
        const profile = await syncSessionProfileFromServer({
          token,
          remember: loadRememberPreference(),
          refreshUi: false
        });

        if (!profile || !isTrainerManagerRole(profile.role)) {
          resetTrainerProgressState();
        }
      } catch (_) {
        if (!isTrainerManagerUser()) {
          resetTrainerProgressState();
        }
      }
    } else if (!isTrainerManagerUser()) {
      resetTrainerProgressState();
    }
  } finally {
    trainerProgressState.loading = false;
    renderTrainerProgressPanel();
  }

  return trainerProgressState;
};

let trainerProgressPrintFrame = null;
let trainerProgressPrintCleanupTimer = null;

const ensureTrainerProgressPrintFrame = () => {
  if (
    trainerProgressPrintFrame &&
    trainerProgressPrintFrame.parentNode &&
    trainerProgressPrintFrame instanceof HTMLIFrameElement
  ) {
    return trainerProgressPrintFrame;
  }

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  frame.style.border = '0';
  document.body.appendChild(frame);
  trainerProgressPrintFrame = frame;
  return frame;
};

const cleanupTrainerProgressPrintFrame = () => {
  if (trainerProgressPrintCleanupTimer) {
    window.clearTimeout(trainerProgressPrintCleanupTimer);
    trainerProgressPrintCleanupTimer = null;
  }
  if (!trainerProgressPrintFrame) return;
  if (trainerProgressPrintFrame.parentNode) {
    trainerProgressPrintFrame.parentNode.removeChild(trainerProgressPrintFrame);
  }
  trainerProgressPrintFrame = null;
};

const buildTrainerProgressReportPdfHtml = ({ selectedStudent, weekLabel }) => {
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
  const totals = selectedStudent && selectedStudent.totals ? selectedStudent.totals : {};
  const history = selectedStudent && Array.isArray(selectedStudent.history) ? selectedStudent.history : [];
  const studentName = escapeAdminCell(selectedStudent && selectedStudent.studentName ? selectedStudent.studentName : 'Aluno');
  const studentStatus = escapeAdminCell(selectedStudent && selectedStudent.studentStatus ? selectedStudent.studentStatus : '-');
  const weightValue = selectedStudent && selectedStudent.currentWeightKg !== null && selectedStudent.currentWeightKg !== undefined
    ? `${Number(selectedStudent.currentWeightKg).toFixed(1)} kg`
    : 'Não informado';
  const heightValue = selectedStudent && selectedStudent.heightCm !== null && selectedStudent.heightCm !== undefined
    ? `${Math.round(Number(selectedStudent.heightCm) || 0)} cm`
    : 'Não informado';

  const historyRows = history.length
    ? history
      .map((item) => `
        <tr>
          <td>${escapeAdminCell(item && item.title ? item.title : '-')}</td>
          <td>${escapeAdminCell(item && item.daysLabel ? item.daysLabel : '-')}</td>
          <td>${escapeAdminCell(Number(item && item.exercisesCount) || 0)}</td>
          <td>${escapeAdminCell(`${Number(item && item.estimatedSessionMinutes) || 0} min`)}</td>
          <td>${escapeAdminCell(`${Number(item && item.estimatedSessionKcal) || 0} kcal`)}</td>
          <td>${escapeAdminCell(formatAdminDate(item && item.createdAt))}</td>
        </tr>
      `)
      .join('')
    : '<tr><td colspan="6">Nenhum treino delegado para este aluno.</td></tr>';

  return `
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      .trainer-progress-print-wrap {
        width: min(100%, 190mm);
        margin: 0 auto;
        padding: 18px 14px;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f1f2b;
        background: #ffffff;
      }
      .trainer-progress-print-wrap h1,
      .trainer-progress-print-wrap h2,
      .trainer-progress-print-wrap h3,
      .trainer-progress-print-wrap p {
        margin: 0;
      }
      .trainer-progress-print-wrap .report-head {
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 2px solid #d6dde3;
      }
      .trainer-progress-print-wrap .report-head h1 {
        font-size: 1.2rem;
        margin-bottom: 6px;
      }
      .trainer-progress-print-wrap .report-head p {
        font-size: 0.88rem;
        color: #3f5464;
        margin-bottom: 3px;
      }
      .trainer-progress-print-wrap .student-name {
        font-weight: 700;
        color: #0f1f2b;
      }
      .trainer-progress-print-wrap .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 18px;
      }
      .trainer-progress-print-wrap .summary-item {
        border: 1px solid #d6dde3;
        border-radius: 10px;
        padding: 10px;
      }
      .trainer-progress-print-wrap .summary-item small {
        display: block;
        color: #4d6271;
        font-size: 0.76rem;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .trainer-progress-print-wrap .summary-item strong {
        display: block;
        font-size: 0.94rem;
      }
      .trainer-progress-print-wrap h2 {
        font-size: 0.98rem;
        margin: 4px 0 10px;
      }
      .trainer-progress-print-wrap table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 0.84rem;
      }
      .trainer-progress-print-wrap th,
      .trainer-progress-print-wrap td {
        border: 1px solid #d6dde3;
        padding: 7px 7px;
        text-align: left;
        vertical-align: top;
        word-break: break-word;
      }
      .trainer-progress-print-wrap th {
        background: #f2f6f9;
        font-weight: 700;
      }
      @media screen and (max-width: 760px) {
        .trainer-progress-print-wrap {
          width: 100%;
          max-width: none;
          padding: 12px 10px;
        }
        .trainer-progress-print-wrap .report-head h1 {
          font-size: 1.06rem;
        }
        .trainer-progress-print-wrap .report-head p {
          font-size: 0.8rem;
        }
        .trainer-progress-print-wrap .summary-grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .trainer-progress-print-wrap .summary-item {
          padding: 8px;
        }
        .trainer-progress-print-wrap .summary-item small {
          font-size: 0.7rem;
        }
        .trainer-progress-print-wrap .summary-item strong {
          font-size: 0.88rem;
        }
        .trainer-progress-print-wrap table {
          font-size: 0.74rem;
        }
        .trainer-progress-print-wrap th,
        .trainer-progress-print-wrap td {
          padding: 5px 4px;
        }
      }
      @page {
        size: A4;
        margin: 10mm;
      }
    </style>
    <article class="trainer-progress-print-wrap">
      <header class="report-head">
        <h1>Relatório Geral do Aluno</h1>
        <p><span class="student-name">${studentName}</span></p>
        <p>${escapeAdminCell(weekLabel)}</p>
        <p>Emitido em: ${escapeAdminCell(generatedAt)}</p>
      </header>

      <section>
        <h2>Resumo do aluno</h2>
        <div class="summary-grid">
          <article class="summary-item"><small>Status da conta</small><strong>${studentStatus}</strong></article>
          <article class="summary-item"><small>Peso atual</small><strong>${escapeAdminCell(weightValue)}</strong></article>
          <article class="summary-item"><small>Altura</small><strong>${escapeAdminCell(heightValue)}</strong></article>
          <article class="summary-item"><small>Treinos na semana</small><strong>${escapeAdminCell(Number(totals.plannedSessionsPerWeek) || 0)}</strong></article>
          <article class="summary-item"><small>Treinos feitos</small><strong>${escapeAdminCell(Number(totals.completedSessions) || 0)}</strong></article>
          <article class="summary-item"><small>Tempo estimado/semana</small><strong>${escapeAdminCell(`${Number(totals.estimatedMinutesPerWeek) || 0} min`)}</strong></article>
          <article class="summary-item"><small>Kcal estimada/semana</small><strong>${escapeAdminCell(`${Number(totals.estimatedKcalPerWeek) || 0} kcal`)}</strong></article>
          <article class="summary-item"><small>Aderência semanal</small><strong>${escapeAdminCell(`${Number(totals.adherencePercent) || 0}%`)}</strong></article>
        </div>
      </section>

      <section>
        <h2>Treinos delegados do aluno</h2>
        <table>
          <thead>
            <tr>
              <th>Treino</th>
              <th>Dias</th>
              <th>Exercícios</th>
              <th>Tempo/sessão</th>
              <th>Kcal/sessão</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </section>
    </article>
  `;
};

const exportTrainerProgressPdfReport = () => {
  if (!isTrainerManagerUser()) return;

  const students = Array.isArray(trainerProgressState.students) ? trainerProgressState.students : [];
  const selectedId = Number(trainerProgressState.selectedStudentId) || 0;
  const selectedStudent = students.find((item) => Number(item && item.studentId) === selectedId) || null;

  if (!selectedStudent) {
    setTrainerProgressFeedback('Selecione um aluno para emitir o relatório em PDF.', false);
    return;
  }

  const start = formatDateKeyPtBr(trainerProgressState.weekStartKey);
  const end = formatDateKeyPtBr(trainerProgressState.weekEndKey);
  const weekLabel = start !== '-' && end !== '-'
    ? `Semana: ${start} até ${end}`
    : 'Semana atual';

  cleanupTrainerProgressPrintFrame();
  const printFrame = ensureTrainerProgressPrintFrame();
  if (!printFrame) {
    setTrainerProgressFeedback('Não foi possível preparar o relatório para impressão.', false);
    return;
  }

  const reportMarkup = buildTrainerProgressReportPdfHtml({
    selectedStudent,
    weekLabel
  });
  const reportHtml = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Relatório Geral do Aluno</title>
      </head>
      <body>
        ${reportMarkup}
      </body>
    </html>
  `;

  const frameWindow = printFrame.contentWindow;
  const frameDocument = frameWindow && frameWindow.document ? frameWindow.document : null;
  if (!frameDocument) {
    cleanupTrainerProgressPrintFrame();
    setTrainerProgressFeedback('Não foi possível preparar o relatório para impressão.', false);
    return;
  }

  const onAfterPrint = () => {
    cleanupTrainerProgressPrintFrame();
  };
  window.addEventListener('afterprint', onAfterPrint, { once: true });
  trainerProgressPrintCleanupTimer = window.setTimeout(() => {
    cleanupTrainerProgressPrintFrame();
  }, 45000);

  frameDocument.open();
  frameDocument.write(reportHtml);
  frameDocument.close();

  window.setTimeout(() => {
    try {
      const targetWindow = printFrame.contentWindow;
      if (!targetWindow) {
        throw new Error('Janela de impressão indisponível.');
      }
      targetWindow.focus();
      targetWindow.print();
      showSiteTopNotice('Escolha "Salvar em PDF" na impressão para emitir o relatório.', true);
    } catch (_) {
      cleanupTrainerProgressPrintFrame();
      setTrainerProgressFeedback('Não foi possível abrir a impressão neste navegador.', false);
    }
  }, 260);
};

const renderTrainerProgressPanel = () => {
  const showTrainerProgress = isTrainerManagerUser();

  if (studentProgressReport) studentProgressReport.hidden = showTrainerProgress;
  if (trainerProgressReport) trainerProgressReport.hidden = !showTrainerProgress;
  if (!showTrainerProgress) return;

  if (progressHistorySheet) progressHistorySheet.hidden = true;

  if (trainerProgressRefreshButton) {
    trainerProgressRefreshButton.disabled = trainerProgressState.loading;
    trainerProgressRefreshButton.textContent = trainerProgressState.loading
      ? 'Atualizando...'
      : 'Atualizar dados';
  }

  setTrainerProgressFeedback(trainerProgressState.error, false);

  const students = Array.isArray(trainerProgressState.students) ? trainerProgressState.students : [];
  const selectedId = Number(trainerProgressState.selectedStudentId) || 0;
  const selectedStudent = students.find((item) => Number(item && item.studentId) === selectedId) || null;
  const showSelectedDetails = Boolean(selectedStudent);

  if (trainerProgressExportPdfButton) {
    trainerProgressExportPdfButton.disabled = trainerProgressState.loading || !showSelectedDetails;
  }

  if (trainerProgressStudentSelect) {
    if (!students.length) {
      trainerProgressStudentSelect.innerHTML = '<option value="">Nenhum aluno disponível</option>';
    } else {
      trainerProgressStudentSelect.innerHTML = [
        '<option value="">Selecione um aluno</option>',
        ...students
        .map((student) => {
          const id = Number(student && student.studentId) || 0;
          const name = escapeAdminCell(student && student.studentName ? student.studentName : `Aluno ${id}`);
          return `<option value="${escapeAdminCell(id)}">${name}</option>`;
        })
      ].join('');
      trainerProgressStudentSelect.value = selectedId ? String(selectedId) : '';
    }
    trainerProgressStudentSelect.disabled = trainerProgressState.loading || !students.length;
  }

  if (trainerProgressEmptyState) {
    trainerProgressEmptyState.hidden = showSelectedDetails;
  }

  if (trainerProgressDetailBlocks && trainerProgressDetailBlocks.length) {
    trainerProgressDetailBlocks.forEach((block) => {
      block.hidden = !showSelectedDetails;
    });
  }

  if (trainerProgressRange) {
    const start = formatDateKeyPtBr(trainerProgressState.weekStartKey);
    const end = formatDateKeyPtBr(trainerProgressState.weekEndKey);
    trainerProgressRange.textContent =
      start !== '-' && end !== '-'
        ? `Semana: ${start} até ${end}`
        : 'Semana atual';
  }

  if (trainerProgressTotalStudents) {
    trainerProgressTotalStudents.textContent = String(
      Number(trainerProgressState.stats && trainerProgressState.stats.totalStudents) || 0
    );
  }
  if (trainerProgressTotalWorkouts) {
    trainerProgressTotalWorkouts.textContent = String(
      Number(trainerProgressState.stats && trainerProgressState.stats.totalAssignedWorkouts) || 0
    );
  }
  if (trainerProgressTotalCompleted) {
    trainerProgressTotalCompleted.textContent = String(
      Number(trainerProgressState.stats && trainerProgressState.stats.totalCompletedSessions) || 0
    );
  }

  const totals = selectedStudent && selectedStudent.totals ? selectedStudent.totals : {};
  const weightValue = selectedStudent && selectedStudent.currentWeightKg !== null && selectedStudent.currentWeightKg !== undefined
    ? `${Number(selectedStudent.currentWeightKg).toFixed(1)} kg`
    : 'Não informado';
  const heightValue = selectedStudent && selectedStudent.heightCm !== null && selectedStudent.heightCm !== undefined
    ? `${Math.round(Number(selectedStudent.heightCm) || 0)} cm`
    : 'Não informado';

  if (trainerProgressWeight) trainerProgressWeight.textContent = weightValue;
  if (trainerProgressHeight) trainerProgressHeight.textContent = heightValue;
  if (trainerProgressPlanned) trainerProgressPlanned.textContent = String(Number(totals.plannedSessionsPerWeek) || 0);
  if (trainerProgressCompleted) trainerProgressCompleted.textContent = String(Number(totals.completedSessions) || 0);
  if (trainerProgressMinutes) trainerProgressMinutes.textContent = `${Number(totals.estimatedMinutesPerWeek) || 0} min`;
  if (trainerProgressKcal) trainerProgressKcal.textContent = `${Number(totals.estimatedKcalPerWeek) || 0} kcal`;
  if (trainerProgressAdherence) trainerProgressAdherence.textContent = `${Number(totals.adherencePercent) || 0}%`;
  if (trainerProgressStatus) {
    trainerProgressStatus.textContent = selectedStudent && selectedStudent.studentStatus
      ? selectedStudent.studentStatus
      : '-';
  }

  if (trainerProgressHistoryBody) {
    const history = selectedStudent && Array.isArray(selectedStudent.history) ? selectedStudent.history : [];
    if (!history.length) {
      trainerProgressHistoryBody.innerHTML = '<tr><td colspan="6">Nenhum treino delegado para este aluno.</td></tr>';
    } else {
      trainerProgressHistoryBody.innerHTML = history
        .map((item) => `
          <tr>
            <td data-label="Treino">${escapeAdminCell(item && item.title ? item.title : '-')}</td>
            <td data-label="Dias">${escapeAdminCell(item && item.daysLabel ? item.daysLabel : '-')}</td>
            <td data-label="Exercícios">${escapeAdminCell(Number(item && item.exercisesCount) || 0)}</td>
            <td data-label="Tempo/sessão">${escapeAdminCell(`${Number(item && item.estimatedSessionMinutes) || 0} min`)}</td>
            <td data-label="Kcal/sessão">${escapeAdminCell(`${Number(item && item.estimatedSessionKcal) || 0} kcal`)}</td>
            <td data-label="Criado em">${escapeAdminCell(formatAdminDate(item && item.createdAt))}</td>
          </tr>
        `)
        .join('');
    }
  }
};

const renderStudentApp = () => {
  applyRoleBasedUiMode();
  renderDashboard();
  renderAllWorkoutsCards();
  renderWorkoutList();
  renderWorkoutDetail();
  renderActiveWorkout();
  renderProgress();
  renderLibrary();
  renderProfile();
  renderAdminOverviewPanel();
  renderTrainerManagementPanel();
  renderTrainerProgressPanel();
};

const setStudentDirectPanel = (panelId, highlightedTabId = '') => {
  if (isGeneralAdminUser()) {
    setStudentAppTab('admin-geral', true);
    return;
  }

  if (panelId !== 'pre-treino') clearPrepCountdown();
  if (panelId !== 'treino-execucao') clearRunCountdown();
  if (panelId !== 'treino-execucao') setRunHelpModalOpen(false);
  if (panelId !== 'treino-descanso') clearRestCountdown();
  if (panelId !== 'perfil') closeProfileActionModal();
  closeGroupLibrarySheets();
  if (studentAppShell) studentAppShell.classList.toggle('is-prep-mode', panelId === 'pre-treino');
  if (studentAppShell) studentAppShell.classList.toggle('is-active-workout-mode', panelId === 'treino-ativo');
  if (studentAppShell) studentAppShell.classList.toggle('is-run-mode', panelId === 'treino-execucao');
  if (studentAppShell) studentAppShell.classList.toggle('is-rest-mode', panelId === 'treino-descanso');
  if (studentAppShell) studentAppShell.classList.remove('is-workouts-tab-mode');
  if (studentAppShell) studentAppShell.classList.remove('is-library-guide-mode');
  currentStudentPanel = panelId;
  currentStudentTab = highlightedTabId || currentStudentTab;
  studentAppTabs.forEach((tab) => {
    tab.classList.toggle('is-active', Boolean(highlightedTabId) && tab.dataset.studentAppTab === highlightedTabId);
  });
  studentAppPanels.forEach((panel) => {
    const active = panel.dataset.studentAppPanel === panelId;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;

    if (!active) {
      panel.classList.remove('scale-up-ver-top-normal');
      return;
    }

    if (panelId === 'treino-ativo') {
      panel.classList.remove('scale-up-ver-top-normal');
      void panel.offsetWidth;
      panel.classList.add('scale-up-ver-top-normal');
    }
  });

  if (studentAppMain) studentAppMain.scrollTo({ top: 0, behavior: 'auto' });
  if (studentArea && !studentArea.hidden && studentApp && studentApp.classList.contains('is-visible')) {
    saveStudentAreaState({
      isOpen: true,
      overlay: 'app',
      tab: currentStudentTab,
      panel: currentStudentPanel
    });
  }
};

const setStudentAppTab = (tabId, immediate = false) => {
  const requestedTab = String(tabId || '').trim() || 'dashboard';
  const canGeneralAdmin = isGeneralAdminUser();
  const canTrainerManager = isTrainerManagerUser();
  let resolvedTab = requestedTab;

  if (canGeneralAdmin) {
    const allowedAdminTabs = new Set(['admin-geral', 'admin-treinos', 'biblioteca', 'perfil']);
    if (!allowedAdminTabs.has(resolvedTab)) {
      resolvedTab = 'admin-geral';
    }
  } else {
    const defaultTab = canTrainerManager ? 'admin-treinos' : 'dashboard';
    if (resolvedTab === 'admin-geral') resolvedTab = defaultTab;
    if (resolvedTab === 'admin-treinos' && !canTrainerManager) resolvedTab = 'dashboard';
    if (resolvedTab === 'dashboard' && canTrainerManager) resolvedTab = 'admin-treinos';
  }

  if (resolvedTab !== 'pre-treino') clearPrepCountdown();
  if (resolvedTab !== 'treino-execucao') clearRunCountdown();
  if (resolvedTab !== 'treino-execucao') setRunHelpModalOpen(false);
  if (resolvedTab !== 'treino-descanso') clearRestCountdown();
  closeMobileSelectPicker({ restoreFocus: false });
  if (resolvedTab !== 'perfil') closeProfileActionModal();
  if (siteConfirmModal && !siteConfirmModal.hidden) closeSiteConfirmModal({ keepFocus: false, result: false });
  if (resolvedTab !== 'admin-geral') closeAdminExerciseEditModal({ keepFocus: false, force: true });
  if (resolvedTab !== 'admin-geral') closeAdminUserDeleteModal({ keepFocus: false, force: true });
  if (resolvedTab !== 'admin-treinos') closeTrainerWorkoutModal({ keepFocus: false, force: true });
  if (resolvedTab !== 'admin-treinos') {
    closeTrainerWorkoutExerciseModal({ keepFocus: false, force: true });
    closeTrainerExerciseVideoModal({ keepFocus: false });
    closeTrainerWorkoutQuickCreateModal({ keepFocus: false, value: '' });
  }
  closeGroupLibrarySheets();
  if (resolvedTab !== 'biblioteca' && isLibraryManagerFormOpen) {
    isLibraryManagerFormOpen = false;
    syncLibraryManagerUi();
  }
  if (resolvedTab !== 'progresso') closeProgressHistorySheet();
  if (resolvedTab !== 'progresso') closeWeightModal();
  if (resolvedTab !== 'progresso') closeBmiModal();
  if (studentAppShell) studentAppShell.classList.remove('is-prep-mode');
  if (studentAppShell) studentAppShell.classList.remove('is-active-workout-mode');
  if (studentAppShell) studentAppShell.classList.remove('is-run-mode');
  if (studentAppShell) studentAppShell.classList.remove('is-rest-mode');
  if (studentAppShell) studentAppShell.classList.toggle('is-workouts-tab-mode', resolvedTab === 'treinos');
  if (studentAppShell) studentAppShell.classList.remove('is-library-guide-mode');
  currentStudentTab = resolvedTab;
  currentStudentPanel = resolvedTab;
  studentAppTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.studentAppTab === resolvedTab));

  const applyPanels = () => {
    studentAppPanels.forEach((panel) => {
      const active = panel.dataset.studentAppPanel === resolvedTab;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
    if (studentAppMain) studentAppMain.scrollTo({ top: 0, behavior: 'auto' });
    if (studentArea && !studentArea.hidden && studentApp && studentApp.classList.contains('is-visible')) {
      saveStudentAreaState({
        isOpen: true,
        overlay: 'app',
        tab: currentStudentTab,
        panel: currentStudentPanel
      });
    }

    if (resolvedTab === 'admin-geral') {
      void fetchAdminOverview(false);
      void syncSiteTeamMembersFromApi({ silent: false, syncAdminForm: true });
    }
    if (resolvedTab === 'admin-treinos') void loadTrainerManagementData(false);
    if (resolvedTab === 'progresso' && canTrainerManager) void loadTrainerProgressData(false);
  };

  if (immediate || !studentTabLoading) {
    applyPanels();
    return;
  }

  studentTabLoading.hidden = false;
  window.setTimeout(() => {
    applyPanels();
    studentTabLoading.hidden = true;
  }, 220);
};

const handleTrainerWorkoutSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;
  if (trainerWorkoutCreateInFlight) return;

  const objective = trainerWorkoutObjectiveSelect
    ? String(trainerWorkoutObjectiveSelect.value || '').trim()
    : '';
  const status = 'ATIVO';
  const description = trainerWorkoutDescriptionInput ? String(trainerWorkoutDescriptionInput.value || '').trim() : '';
  const studentId = Number(trainerWorkoutStudentSelect ? trainerWorkoutStudentSelect.value : 0) || 0;
  const selectedStudentName =
    trainerWorkoutStudentSelect &&
    trainerWorkoutStudentSelect.selectedOptions &&
    trainerWorkoutStudentSelect.selectedOptions.length
      ? String(trainerWorkoutStudentSelect.selectedOptions[0].textContent || '').trim()
      : '';
  const weekDays = Array.from(trainerWeekdayInputs || [])
    .filter((input) => input && input.checked)
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);
  const instructorId = isGeneralAdminUser()
    ? Number(trainerWorkoutInstructorSelect ? trainerWorkoutInstructorSelect.value : 0) || 0
    : Number(studentData.userId) || 0;

  if (!studentId || !trainerWorkoutStudentConfirmed) {
    setTrainerManagementFeedback('Selecione o aluno manualmente antes de designar o treino.', false);
    if (trainerWorkoutStudentSelect) {
      try {
        trainerWorkoutStudentSelect.focus({ preventScroll: true });
      } catch (_) {}
    }
    return;
  }

  if (!objective || !instructorId || !weekDays.length) {
    setTrainerManagementFeedback('Preencha objetivo, instrutor e ao menos um dia da semana.');
    return;
  }

  const templatesById = new Map(
    (Array.isArray(trainerManagementState.templates) ? trainerManagementState.templates : [])
      .map((template) => [Number(template && template.id) || 0, template])
      .filter(([templateId]) => templateId > 0)
  );
  const explicitDayAssignments = getTrainerWeekdayAssignmentsForSelectedDays(weekDays);
  const unresolvedDays = [];
  const dayAssignments = [];
  weekDays.forEach((day) => {
    const resolvedTemplateId = Number(explicitDayAssignments[day]) || 0;
    if (!resolvedTemplateId) {
      unresolvedDays.push(day);
      return;
    }

    const matchedTemplate = templatesById.get(resolvedTemplateId) || null;
    dayAssignments.push({
      day,
      templateId: resolvedTemplateId,
      templateName: String((matchedTemplate && matchedTemplate.name) || '').trim()
    });
  });

  if (!dayAssignments.length || unresolvedDays.length) {
    const unresolvedMessage = unresolvedDays.length
      ? `Selecione um treino para ${unresolvedDays.join(', ')}.`
      : 'Defina um treino para cada dia selecionado.';
    setTrainerManagementFeedback(unresolvedMessage, false);

    const firstUnresolvedDay = unresolvedDays[0] || '';
    const unresolvedSelect = firstUnresolvedDay && trainerWeekdayAssignmentList
      ? Array.from(
        trainerWeekdayAssignmentList.querySelectorAll('[data-trainer-weekday-assignment-select]')
      ).find((select) => String(select && select.dataset.day || '').trim() === firstUnresolvedDay) || null
      : null;
    if (unresolvedSelect instanceof HTMLSelectElement) {
      try {
        unresolvedSelect.focus({ preventScroll: true });
      } catch (_) {}
    }
    return;
  }

  trainerWorkoutCreateInFlight = true;
  setButtonLoading(trainerWorkoutSubmitButton, 'Designando...');
  setTrainerManagementFeedback('Designando treino ao aluno...', false);

  try {
    const createdWorkoutIds = [];
    const responses = [];
    const failedAssignments = [];
    const createdWorkoutsPayloads = [];
    const multipleAssignments = dayAssignments.length > 1;

    for (const assignment of dayAssignments) {
      const assignmentTemplateId = Number(assignment && assignment.templateId) || 0;
      const assignmentDay = String(assignment && assignment.day || '').trim();
      if (!assignmentTemplateId || !assignmentDay) continue;

      const resolvedTemplateName = String(assignment && assignment.templateName || '').trim();
      const assignmentName = multipleAssignments
        ? resolvedTemplateName
          ? `${resolvedTemplateName} - ${assignmentDay}`
          : `Treino - ${assignmentDay}`
        : resolvedTemplateName || 'Treino';
      try {
        const response = await requestStudentApi('/workout/from-template', {
          method: 'POST',
          body: {
            templateId: assignmentTemplateId,
            studentId,
            instructorId,
            name: assignmentName,
            objective,
            description,
            status,
            weekDays: [assignmentDay]
          }
        });
        responses.push(response);

        const createdWorkoutId = resolveCreatedWorkoutIdFromResponse(response);
        if (createdWorkoutId > 0) {
          createdWorkoutIds.push(createdWorkoutId);
          createdWorkoutsPayloads.push({
            workoutId: createdWorkoutId,
            exercises: Array.isArray(response && response.exercises) ? response.exercises.slice() : []
          });
        }
      } catch (error) {
        failedAssignments.push({
          templateId: assignmentTemplateId,
          weekDays: [assignmentDay],
          message: error && error.message ? error.message : 'Falha ao designar treino.'
        });
      }
    }

    if (!createdWorkoutIds.length && failedAssignments.length) {
      throw new Error(failedAssignments[0].message);
    }

    createdWorkoutIds.forEach((workoutId) => {
      unhideTrainerWorkoutById(workoutId);
    });

    let coverAutoApplied = false;
    if (trainerWorkoutPendingCoverFile && createdWorkoutIds.length) {
      coverAutoApplied = await handleTrainerWorkoutCoverSave({
        workoutIds: createdWorkoutIds,
        successMessage: 'Capa do treino salva com sucesso.'
      });
    }

    if (trainerWorkoutForm) {
      trainerWorkoutForm.reset();
      trainerWorkoutDayAssignments = {};
      trainerWorkoutStudentConfirmed = false;
    }
    await loadTrainerManagementData(true);
    await loadTrainerProgressData(true);
    await syncWorkoutsFromBackend({ silent: true });
    if (isGeneralAdminUser()) await fetchAdminOverview(true);

    createdWorkoutsPayloads.forEach(({ workoutId, exercises }) => {
      const workoutKey = String(Number(workoutId) || 0);
      if (!workoutKey || !Array.isArray(exercises) || !exercises.length) return;
      const currentExercises = trainerManagementState.exercisesByWorkoutId[workoutKey];
      if (Array.isArray(currentExercises) && currentExercises.length) return;
      trainerManagementState.exercisesByWorkoutId[workoutKey] = exercises
        .slice()
        .sort((first, second) => (Number(first && first.order) || 0) - (Number(second && second.order) || 0));
    });

    const lastResponse = responses.length ? responses[responses.length - 1] : null;
    const createdWorkoutId = resolveCreatedWorkoutIdFromResponse(lastResponse);
    if (createdWorkoutId) {
      unhideTrainerWorkoutById(createdWorkoutId);
      trainerExerciseTargetWorkoutId = createdWorkoutId;
    }
    const selectedTemplateAfterSubmit = String(
      (dayAssignments[0] && dayAssignments[0].templateId) || ''
    );
    trainerTemplateExerciseSelectedId = selectedTemplateAfterSubmit;
    trainerExerciseComposerSelectedId = selectedTemplateAfterSubmit;
    const visibilityHint = 'Treino já disponível para o aluno.';
    const successMessage = selectedStudentName
      ? dayAssignments.length > 1
        ? `${dayAssignments.length} treinos foram designados ao aluno ${selectedStudentName}. ${visibilityHint}`
        : `Treino designado ao aluno ${selectedStudentName}. ${visibilityHint}`
      : visibilityHint;
    const finalSuccessMessage = trainerWorkoutPendingCoverFile && !coverAutoApplied
      ? `${successMessage} A capa ficou pendente; ela será salva ao clicar em "Adicionar ao treino".`
      : coverAutoApplied
        ? `${successMessage} A capa do treino também foi salva.`
        : successMessage;
    const failedAssignmentsMessage = failedAssignments.length
      ? ` Dias com falha: ${failedAssignments
        .map((item) => item.weekDays.join('/'))
        .filter(Boolean)
        .join(', ')}.`
      : '';
    const hasPartialFailure = failedAssignments.length > 0;
    const managementFeedbackMessage = hasPartialFailure
      ? `Conclusão parcial. ${finalSuccessMessage}${failedAssignmentsMessage}`.trim()
      : `${finalSuccessMessage}${failedAssignmentsMessage}`.trim();

    setTrainerManagementFeedback(
      managementFeedbackMessage,
      !hasPartialFailure
    );
    if (failedAssignments.length) {
      setTrainerExerciseFeedback(
        failedAssignments[0].message,
        false
      );
    }
  } catch (error) {
    setTrainerManagementFeedback(
      error && error.message ? error.message : 'Falha ao designar treino ao aluno.',
      false
    );
  } finally {
    trainerWorkoutCreateInFlight = false;
    clearButtonLoading(trainerWorkoutSubmitButton, 'Designar ao aluno');
  }
};

const handleTrainerTemplateWorkoutSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;

  const templateId = Number(trainerTemplateSelect ? trainerTemplateSelect.value : 0) || 0;
  const studentId = Number(trainerTemplateStudentSelect ? trainerTemplateStudentSelect.value : 0) || 0;
  const instructorId = isGeneralAdminUser()
    ? Number(trainerTemplateInstructorSelect ? trainerTemplateInstructorSelect.value : 0) || 0
    : Number(studentData.userId) || 0;
  const name = trainerTemplateNameInput ? String(trainerTemplateNameInput.value || '').trim() : '';
  const startDate = trainerTemplateStartDateInput ? String(trainerTemplateStartDateInput.value || '').trim() : '';
  const endDate = trainerTemplateEndDateInput ? String(trainerTemplateEndDateInput.value || '').trim() : '';
  const weekDays = Array.from(trainerTemplateWeekdayInputs || [])
    .filter((input) => input && input.checked)
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);

  if (!templateId || !studentId || !instructorId) {
    setTrainerManagementFeedback('Selecione modelo, aluno e instrutor para criar o treino por modelo.');
    return;
  }

  if (startDate && endDate && startDate > endDate) {
    setTrainerManagementFeedback('A data final não pode ser menor que a data inicial.');
    return;
  }

  setButtonLoading(trainerTemplateSubmitButton, 'Criando...');
  setTrainerManagementFeedback('Criando treino a partir do modelo...', false);

  try {
    const response = await requestStudentApi('/workout/from-template', {
      method: 'POST',
      body: {
        templateId,
        studentId,
        instructorId,
        name,
        weekDays,
        startDate: startDate || null,
        endDate: endDate || null,
      }
    });

    const createdWorkoutId = resolveCreatedWorkoutIdFromResponse(response);
    let coverAutoApplied = false;
    if (trainerWorkoutPendingCoverFile && createdWorkoutId > 0) {
      coverAutoApplied = await handleTrainerWorkoutCoverSave({
        workoutIds: [createdWorkoutId],
        successMessage: 'Capa do treino salva com sucesso.'
      });
    }

    if (trainerTemplateWorkoutForm) trainerTemplateWorkoutForm.reset();
    await loadTrainerManagementData(true);
    await loadTrainerProgressData(true);
    await syncWorkoutsFromBackend({ silent: true });
    if (isGeneralAdminUser()) await fetchAdminOverview(true);

    if (createdWorkoutId) {
      unhideTrainerWorkoutById(createdWorkoutId);
      trainerExerciseTargetWorkoutId = createdWorkoutId;
    }
    isTrainerExerciseComposerOpen = true;
    syncTrainerExerciseComposerUi({ scroll: true, focus: true });

    setTrainerManagementFeedback(
      coverAutoApplied
        ? `${(response && response.message) || 'Treino criado por modelo com sucesso.'} A capa do treino também foi salva.`
        : (response && response.message) || 'Treino criado por modelo com sucesso.',
      true
    );
  } catch (error) {
    setTrainerManagementFeedback(
      error && error.message ? error.message : 'Falha ao criar treino por modelo.',
      false
    );
  } finally {
    clearButtonLoading(trainerTemplateSubmitButton, 'Criar por modelo');
  }
};

const handleTrainerTemplateFormSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;

  const name = trainerTemplateFormNameInput
    ? String(trainerTemplateFormNameInput.value || '').trim()
    : '';
  const description = trainerTemplateFormDescriptionInput
    ? String(trainerTemplateFormDescriptionInput.value || '').trim()
    : '';
  const isActive =
    !trainerTemplateFormActiveSelect ||
    String(trainerTemplateFormActiveSelect.value || 'true').trim().toLowerCase() !== 'false';

  if (!name) {
    setTrainerManagementFeedback('Preencha o nome do treino para continuar.');
    return;
  }

  setButtonLoading(trainerTemplateFormSubmitButton, 'Salvando...');
  setTrainerManagementFeedback('Criando treino...', false);

  try {
    const response = await requestStudentApi('/workouts/templates', {
      method: 'POST',
      body: {
        name,
        description,
        isActive,
      },
    });

    const createdTemplateId = Number(response && response.template && response.template.id) || 0;
    let coverAutoApplied = false;
    if (trainerWorkoutPendingCoverFile && createdTemplateId > 0) {
      coverAutoApplied = await handleTrainerWorkoutCoverSave({
        templateId: createdTemplateId,
        successMessage: 'Capa do treino salva com sucesso.'
      });
    }

    if (trainerTemplateForm) trainerTemplateForm.reset();
    if (trainerTemplateFormActiveSelect) trainerTemplateFormActiveSelect.value = 'true';

    await loadTrainerManagementData(true);
    if (createdTemplateId) {
      trainerTemplateExerciseSelectedId = String(createdTemplateId);
      trainerExerciseComposerSelectedId = String(createdTemplateId);
      trainerTemplateEditorSelectedId = String(createdTemplateId);
      trainerExerciseTargetWorkoutId = 0;
      if (trainerExerciseWorkoutSelect) {
        trainerExerciseWorkoutSelect.value = String(createdTemplateId);
      }
      if (trainerTemplateSelect) {
        trainerTemplateSelect.value = String(createdTemplateId);
      }
      isTrainerExerciseComposerOpen = true;
      syncTrainerExerciseComposerUi({ scroll: true, focus: false });
      setTrainerExerciseFeedback('Treino criado. Agora adicione os exercícios.', true);
    }
    setTrainerManagementFeedback(
      coverAutoApplied
        ? 'Treino criado com sucesso. A capa do treino também foi salva.'
        : 'Treino criado com sucesso.',
      true
    );
  } catch (error) {
    setTrainerManagementFeedback(
      error && error.message ? error.message : 'Falha ao criar treino.',
      false
    );
  } finally {
    clearButtonLoading(trainerTemplateFormSubmitButton, 'Salvar treino');
  }
};

const handleTrainerTemplateEditorSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;

  const templateId = Number(trainerTemplateEditorSelect ? trainerTemplateEditorSelect.value : 0) || 0;
  const name = trainerTemplateEditorNameInput
    ? String(trainerTemplateEditorNameInput.value || '').trim()
    : '';
  const hasDescriptionField = Boolean(trainerTemplateEditorDescriptionInput);
  const description = hasDescriptionField
    ? String(trainerTemplateEditorDescriptionInput.value || '').trim()
    : undefined;
  const hasStatusField = Boolean(trainerTemplateEditorActiveSelect);
  const isActive = hasStatusField
    ? String(trainerTemplateEditorActiveSelect.value || 'true').trim().toLowerCase() !== 'false'
    : undefined;

  if (!templateId) {
    setTrainerManagementFeedback('Selecione um template para editar.');
    return;
  }

  if (!name) {
    setTrainerManagementFeedback('O nome do template não pode ficar vazio.');
    return;
  }

  setButtonLoading(trainerTemplateEditorSubmitButton, 'Salvando...');
  setTrainerManagementFeedback('Atualizando template...', false);

  try {
    const body = { name };
    if (description !== undefined) body.description = description;
    if (isActive !== undefined) body.isActive = isActive;

    const response = await requestStudentApi(
      `/workouts/templates/${encodeURIComponent(String(templateId))}`,
      {
        method: 'PATCH',
        body,
      }
    );

    trainerTemplateEditorSelectedId = String(templateId);
    trainerTemplateExerciseSelectedId = String(templateId);
    trainerExerciseComposerSelectedId = String(templateId);
    await loadTrainerManagementData(true);

    if (trainerTemplateExercisesFilterSelect) {
      trainerTemplateExercisesFilterSelect.value = String(templateId);
    }
    if (trainerTemplateExerciseTemplateSelect) {
      trainerTemplateExerciseTemplateSelect.value = String(templateId);
    }

    setTrainerManagementFeedback(
      (response && response.message) || 'Template atualizado com sucesso.',
      true
    );
  } catch (error) {
    setTrainerManagementFeedback(
      error && error.message ? error.message : 'Falha ao atualizar template.',
      false
    );
  } finally {
    clearButtonLoading(trainerTemplateEditorSubmitButton, 'Salvar template');
  }
};

const handleTrainerTemplateExerciseSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;

  const templateId = Number(
    trainerTemplateExerciseTemplateSelect ? trainerTemplateExerciseTemplateSelect.value : 0
  ) || 0;
  const exerciseId = Number(
    trainerTemplateExerciseLibrarySelect ? trainerTemplateExerciseLibrarySelect.value : 0
  ) || 0;
  const order = Math.max(1, Number(trainerTemplateExerciseOrderInput ? trainerTemplateExerciseOrderInput.value : 1) || 1);
  const series = Math.max(1, Number(trainerTemplateExerciseSeriesInput ? trainerTemplateExerciseSeriesInput.value : 3) || 3);
  const reps = Math.max(1, Number(trainerTemplateExerciseRepsInput ? trainerTemplateExerciseRepsInput.value : 10) || 10);
  const defaultLoad = Math.max(0, Number(trainerTemplateExerciseLoadInput ? trainerTemplateExerciseLoadInput.value : 0) || 0);
  const restTime = Math.max(0, Number(trainerTemplateExerciseRestInput ? trainerTemplateExerciseRestInput.value : 30) || 30);

  if (!templateId || !exerciseId) {
    setTrainerManagementFeedback('Selecione template e exercício da biblioteca para vincular.');
    return;
  }

  setButtonLoading(trainerTemplateExerciseSubmitButton, 'Salvando...');
  setTrainerManagementFeedback('Vinculando exercício ao template...', false);

  try {
    const response = await requestStudentApi(
      `/workouts/templates/${encodeURIComponent(String(templateId))}/exercises`,
      {
        method: 'POST',
        body: {
          exerciseId,
          order,
          series,
          reps,
          defaultLoad,
          restTime,
        },
      }
    );

    trainerTemplateExerciseSelectedId = String(templateId);
    trainerExerciseComposerSelectedId = String(templateId);
    trainerExerciseTargetWorkoutId = 0;
    await loadTrainerManagementData(true);

    if (trainerTemplateExerciseTemplateSelect) {
      trainerTemplateExerciseTemplateSelect.value = String(templateId);
    }
    if (trainerTemplateExercisesFilterSelect) {
      trainerTemplateExercisesFilterSelect.value = String(templateId);
    }
    if (trainerTemplateExerciseLibrarySelect) {
      trainerTemplateExerciseLibrarySelect.value = '';
    }

    const refreshedTemplateExercises =
      trainerManagementState.templateExercisesByTemplateId[String(templateId)] || [];
    if (trainerTemplateExerciseOrderInput) {
      trainerTemplateExerciseOrderInput.value = String(refreshedTemplateExercises.length + 1);
    }

    setTrainerManagementFeedback(
      (response && response.message) || 'Exercício vinculado ao template com sucesso.',
      true
    );
  } catch (error) {
    setTrainerManagementFeedback(
      error && error.message ? error.message : 'Falha ao vincular exercício ao template.',
      false
    );
  } finally {
    clearButtonLoading(trainerTemplateExerciseSubmitButton, 'Adicionar ao template');
  }
};

const getSelectedLibraryExercise = () => {
  const selectedId = Number(trainerExerciseLibrarySelect ? trainerExerciseLibrarySelect.value : 0) || 0;
  if (!selectedId) return null;
  const libraryExercises = Array.isArray(trainerManagementState.library) ? trainerManagementState.library : [];
  return libraryExercises.find((exercise) => Number(exercise && exercise.id) === selectedId) || null;
};

const applyLibraryExerciseToExerciseForm = (exercise) => {
  if (!exercise) return;
  const exerciseGroup = normalizeLibraryGroupKey(exercise && exercise.group, '');
  if (trainerExerciseGroupSelect && exerciseGroup) {
    if (trainerExerciseGroupSelect.multiple) {
      const currentGroups = getSelectedTrainerExerciseGroups();
      const nextGroups = currentGroups.length
        ? Array.from(new Set([...currentGroups, exerciseGroup]))
        : [exerciseGroup];
      setSelectedTrainerExerciseGroups(nextGroups);
    } else {
      trainerExerciseGroupSelect.value = exerciseGroup;
    }
  }
  syncTrainerExerciseGroupDrivenUi();
  if (trainerExerciseNameInput) trainerExerciseNameInput.value = String(exercise.name || '').trim();
  if (trainerExerciseDescriptionInput) trainerExerciseDescriptionInput.value = String(exercise.description || '').trim();
  if (trainerExerciseSeriesInput) {
    trainerExerciseSeriesInput.value = String(
      Math.max(
        1,
        Number(
          exercise &&
          (
            exercise.seriesCount !== undefined
              ? exercise.seriesCount
              : exercise.series !== undefined
                ? exercise.series
                : exercise.series_count
          )
        ) || 3
      )
    );
  }
  if (trainerExerciseRepetitionsInput) trainerExerciseRepetitionsInput.value = String(Math.max(1, Number(exercise.repetitions) || 10));
  if (trainerExerciseLoadInput) trainerExerciseLoadInput.value = String(Math.max(0, Number(exercise.loadKg) || 0));
  if (trainerExerciseDurationInput) trainerExerciseDurationInput.value = String(Math.max(10, Number(exercise.durationSeconds) || 60));
  if (trainerExerciseRestInput) trainerExerciseRestInput.value = String(Math.max(0, Number(exercise.restSeconds) || 30));

  const exerciseMuscles = readExerciseListField(
    exercise,
    ['musclesWorked', 'muscles_worked', 'muscles'],
    { splitCommas: true }
  );
  const fallbackMuscles = exerciseGroup ? (LIBRARY_GROUP_MUSCLES[exerciseGroup] || []) : [];
  if (trainerExerciseMusclesInput) {
    trainerExerciseMusclesInput.value = stringifyTextList(
      exerciseMuscles.length ? exerciseMuscles : fallbackMuscles
    );
  }

  const defaultIntensity = getExerciseIntensityInfo({
    repetitions: Number(exercise.repetitions) || 10,
    durationSeconds: Number(exercise.durationSeconds) || 60,
    loadKg: Number(exercise.loadKg) || 0
  }).score;
  const exerciseIntensity = readExerciseIntensityScore(exercise) || defaultIntensity;
  if (trainerExerciseIntensitySelect) {
    trainerExerciseIntensitySelect.value = String(parseIntensityScoreValue(exerciseIntensity, 3));
  }

  const exerciseTutorialSteps = readExerciseListField(
    exercise,
    ['tutorialSteps', 'tutorial_steps', 'instructionsList', 'instructions_list', 'tutorialText', 'tutorial_text'],
    { splitCommas: false }
  );
  const fallbackTutorialSteps = buildExerciseTutorialSteps(String(exercise.description || '').trim());
  if (trainerExerciseTutorialInput) {
    trainerExerciseTutorialInput.value = stringifyTextList(
      exerciseTutorialSteps.length ? exerciseTutorialSteps : fallbackTutorialSteps
    );
  }
};

const openAssignedWorkoutGuide = (workoutId, triggerButton = null) => {
  const numericWorkoutId = Number(workoutId) || 0;
  const fallbackWorkoutId = Number(resolveTrainerExerciseTargetWorkoutId()) || 0;
  const targetWorkoutId = numericWorkoutId || fallbackWorkoutId;
  if (!targetWorkoutId) return false;

  let workout = getTrainerWorkoutById(targetWorkoutId);
  if (!workout && fallbackWorkoutId && fallbackWorkoutId !== targetWorkoutId) {
    workout = getTrainerWorkoutById(fallbackWorkoutId);
  }
  if (!workout) {
    setTrainerManagementFeedback('Treino selecionado não encontrado para edição.', false);
    return false;
  }

  syncTrainerAssignedWorkoutSelection(Number(workout.id) || 0);
  const opened = openTrainerWorkoutModal(workout, triggerButton, { readOnly: false });
  if (!opened) {
    setTrainerManagementFeedback('Não foi possível abrir a guia do treino selecionado.', false);
    return false;
  }
  return true;
};

const openAssignedWorkoutPreview = (workoutId, triggerButton = null) => {
  const numericWorkoutId = Number(workoutId) || 0;
  const fallbackWorkoutId = Number(resolveTrainerExerciseTargetWorkoutId()) || 0;
  const targetWorkoutId = numericWorkoutId || fallbackWorkoutId;
  if (!targetWorkoutId) return false;

  let workout = getTrainerWorkoutById(targetWorkoutId);
  if (!workout && fallbackWorkoutId && fallbackWorkoutId !== targetWorkoutId) {
    workout = getTrainerWorkoutById(fallbackWorkoutId);
  }
  if (!workout) {
    setTrainerManagementFeedback('Treino selecionado não encontrado para visualização.', false);
    return false;
  }

  syncTrainerAssignedWorkoutSelection(Number(workout.id) || 0);
  const opened = openTrainerWorkoutModal(workout, triggerButton, { readOnly: true });
  if (!opened) {
    setTrainerManagementFeedback('Não foi possível abrir a visualização do treino.', false);
    return false;
  }
  return true;
};

const openTrainerTemplatePreview = (templateId, triggerButton = null) => {
  const previewWorkout = buildTrainerTemplatePreviewWorkout(templateId);
  if (!previewWorkout) {
    setTrainerManagementFeedback('Nomeclatura selecionada não encontrada para visualização.', false);
    return false;
  }

  const opened = openTrainerWorkoutModal(previewWorkout, triggerButton, { readOnly: true });
  if (!opened) {
    setTrainerManagementFeedback('Não foi possível abrir a visualização da nomeclatura.', false);
    return false;
  }
  return true;
};

const openTrainerTemplateEditorModal = (templateId, triggerButton = null) => {
  const normalizedTemplateId = Number(templateId) || 0;
  const previewWorkout = buildTrainerTemplatePreviewWorkout(normalizedTemplateId);
  if (!previewWorkout) {
    setTrainerManagementFeedback('Nomeclatura selecionada não encontrada para edição.', false);
    return false;
  }

  trainerTemplateEditorSelectedId = String(normalizedTemplateId);
  trainerTemplateExerciseSelectedId = String(normalizedTemplateId);
  trainerExerciseComposerSelectedId = String(normalizedTemplateId);

  const opened = openTrainerWorkoutModal(previewWorkout, triggerButton, {
    readOnly: false,
    templateId: normalizedTemplateId
  });
  if (!opened) {
    setTrainerManagementFeedback('Não foi possível abrir a edição da nomeclatura.', false);
    return false;
  }
  return true;
};

const handleTrainerLibrarySubmit = async (event) => {
  event.preventDefault();
  if (!isLibraryManagerUser()) return;

  const name = trainerLibraryNameInput ? String(trainerLibraryNameInput.value || '').trim() : '';
  const group = trainerLibraryGroupSelect ? String(trainerLibraryGroupSelect.value || '').trim() : 'peito';
  const description = trainerLibraryDescriptionInput ? String(trainerLibraryDescriptionInput.value || '').trim() : '';
  const imageFile = trainerLibraryImageFileInput && trainerLibraryImageFileInput.files
    ? trainerLibraryImageFileInput.files[0]
    : null;
  const videoFile = trainerLibraryVideoFileInput && trainerLibraryVideoFileInput.files
    ? trainerLibraryVideoFileInput.files[0]
    : null;
  const seriesCount = Math.max(
    1,
    parseIntegerInputValue(trainerLibrarySeriesInput ? trainerLibrarySeriesInput.value : 3, 3)
  );
  const repetitions = Number(trainerLibraryRepetitionsInput ? trainerLibraryRepetitionsInput.value : 10) || 10;
  const durationSeconds = Number(trainerLibraryDurationInput ? trainerLibraryDurationInput.value : 60) || 60;
  const restSeconds = Number(trainerLibraryRestInput ? trainerLibraryRestInput.value : 30) || 30;
  const fallbackCaloriesEstimate = estimateExerciseCalories({
    durationSeconds,
    repetitions,
    restSeconds,
    loadKg: 0
  });
  const caloriesEstimate = Math.max(
    0,
    parseIntegerInputValue(
      trainerLibraryCaloriesInput ? trainerLibraryCaloriesInput.value : '',
      fallbackCaloriesEstimate
    )
  );
  if (trainerLibraryCaloriesInput) {
    trainerLibraryCaloriesInput.value = String(caloriesEstimate);
  }
  if (trainerLibrarySeriesInput) {
    trainerLibrarySeriesInput.value = String(seriesCount);
  }
  const musclesWorked = normalizeTextList(
    trainerLibraryMusclesInput ? trainerLibraryMusclesInput.value : '',
    { splitCommas: true }
  );
  const intensityScore = parseIntensityScoreValue(
    trainerLibraryIntensitySelect ? trainerLibraryIntensitySelect.value : 3,
    3
  );
  const tutorialSteps = normalizeTextList(
    trainerLibraryTutorialInput ? trainerLibraryTutorialInput.value : '',
    { splitCommas: false }
  );

  if (!name || !description) {
    setLibraryManagerFeedback('Preencha nome e descrição do exercício da biblioteca.');
    return;
  }

  setButtonLoading(trainerLibrarySubmitButton, 'Salvando...');
  setLibraryManagerFeedback('Adicionando exercício na biblioteca...', false);

  try {
    let finalImageUrl = '';
    let finalVideoUrl = '';

    if (imageFile) {
      setLibraryManagerFeedback('Enviando foto...', false);
      const uploadedImage = await uploadStudentMediaFile(imageFile);
      finalImageUrl = String(uploadedImage.url || '').trim();
    }

    if (videoFile) {
      setLibraryManagerFeedback('Enviando vídeo...', false);
      const uploadedVideo = await uploadStudentMediaFile(videoFile);
      finalVideoUrl = String(uploadedVideo.url || '').trim();
    }

    const response = await requestStudentApi('/library/exercises', {
      method: 'POST',
      body: {
        name,
        group,
        description,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        seriesCount,
        series: seriesCount,
        series_count: seriesCount,
        repetitions,
        durationSeconds,
        restSeconds,
        caloriesEstimate,
        musclesWorked,
        intensityScore,
        tutorialSteps
      }
    });

    if (trainerLibraryForm) trainerLibraryForm.reset();
    resetTrainerLibraryMediaPreviews();
    if (isTrainerManagerUser()) await loadTrainerManagementData(true);
    await syncLibraryFromBackend({ silent: true });
    renderLibrary();
    setLibraryManagerFeedback(
      (response && response.message) || 'Exercício adicionado à biblioteca com sucesso.',
      true
    );
    isLibraryManagerFormOpen = false;
    syncLibraryManagerUi();
  } catch (error) {
    setLibraryManagerFeedback(
      error && error.message ? error.message : 'Falha ao adicionar exercício na biblioteca.',
      false
    );
  } finally {
    clearButtonLoading(trainerLibrarySubmitButton, 'Adicionar à biblioteca');
  }
};

const handleTrainerExerciseSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) {
    const permissionMessage = 'Somente Instrutor e Administrador Geral podem montar treinos.';
    setTrainerManagementFeedback(permissionMessage, false);
    setTrainerExerciseFeedback(permissionMessage, false);
    return;
  }
  setTrainerExerciseFeedback('', false);

  const rawWorkoutValue = String(trainerExerciseWorkoutSelect ? trainerExerciseWorkoutSelect.value : '').trim();
  let templateId = getSelectedTrainerExerciseTemplateId();
  if (!templateId && shouldOpenTrainerWorkoutQuickCreate(rawWorkoutValue)) {
    await createTrainerWorkoutFromExerciseField();
    return;
  }
  const pendingExerciseIds = getTrainerExercisePendingQueue(templateId);
  const hasPendingQueue = pendingExerciseIds.length > 0;
  const selectedLibraryExerciseId = Number(trainerExerciseLibrarySelect ? trainerExerciseLibrarySelect.value : 0) || 0;
  const selectedLibraryExercise = getSelectedLibraryExercise();
  const availableLibraryExercises = Array.isArray(trainerManagementState.library)
    ? trainerManagementState.library
    : [];
  const selectedGroups = getSelectedTrainerExerciseGroups();
  const selectedGroup = normalizeLibraryGroupKey(
    (selectedLibraryExercise && selectedLibraryExercise.group) || selectedGroups[0],
    ''
  );
  const repetitions = Math.max(
    1,
    parseIntegerInputValue(
      trainerExerciseRepetitionsInput ? trainerExerciseRepetitionsInput.value : 10,
      10
    )
  );
  const loadKg = Math.max(
    0,
    parseDecimalInputValue(
      trainerExerciseLoadInput ? trainerExerciseLoadInput.value : 0,
      0
    )
  );
  const restSeconds = Math.max(
    0,
    parseIntegerInputValue(
      trainerExerciseRestInput ? trainerExerciseRestInput.value : 30,
      30
    )
  );
  const series = Math.max(
    1,
    parseIntegerInputValue(
      trainerExerciseSeriesInput ? trainerExerciseSeriesInput.value : 3,
      3
    )
  );
  const order = Math.max(
    1,
    parseIntegerInputValue(
      trainerExerciseOrderInput ? trainerExerciseOrderInput.value : 1,
      1
    )
  );
  const observation = trainerExerciseObservationInput
    ? String(trainerExerciseObservationInput.value || '').trim()
    : '';

  if (!templateId) {
    const validationMessage = 'Selecione um treino salvo para adicionar o exercício.';
    setTrainerManagementFeedback(validationMessage);
    setTrainerExerciseFeedback(validationMessage);
    return;
  }

  if (!hasPendingQueue && !selectedLibraryExerciseId) {
    const validationMessage = 'Selecione um exercício da biblioteca.';
    setTrainerManagementFeedback(validationMessage);
    setTrainerExerciseFeedback(validationMessage);
    return;
  }

  if (!hasPendingQueue && selectedLibraryExerciseId) {
    const exerciseStillAvailable = availableLibraryExercises.some(
      (exerciseItem) => Number(exerciseItem && exerciseItem.id) === selectedLibraryExerciseId
    );
    if (!exerciseStillAvailable) {
      const staleSelectionMessage = 'Esse exercício não está mais disponível. Atualize os dados e selecione novamente.';
      setTrainerManagementFeedback(staleSelectionMessage, false);
      setTrainerExerciseFeedback(staleSelectionMessage, false);
      if (trainerExerciseLibrarySelect) trainerExerciseLibrarySelect.value = '';
      return;
    }
  }

  setButtonLoading(trainerExerciseSubmitButton, 'Salvando...');
  const savingMessage = hasPendingQueue
    ? `Salvando ${pendingExerciseIds.length} exercício(s) da fila...`
    : 'Adicionando exercício ao treino salvo...';
  setTrainerManagementFeedback(savingMessage, false);
  setTrainerExerciseFeedback(savingMessage, false);

  try {
    const libraryExercises = availableLibraryExercises;
    const templateExercises =
      trainerManagementState.templateExercisesByTemplateId[String(templateId)] || [];
    let nextOrderForForm = order + 1;
    let nextOrder = templateExercises.reduce((maxOrder, exerciseItem) => {
      return Math.max(maxOrder, Number(exerciseItem && exerciseItem.order) || 0);
    }, 0) + 1;
    let successMessage = 'Exercício adicionado ao treino com sucesso.';
    let isPartialSave = false;

    if (hasPendingQueue) {
      const pendingFailures = [];
      let firstFailureMessage = '';
      let savedCount = 0;

      for (const pendingExerciseId of pendingExerciseIds) {
        const libraryExercise = libraryExercises
          .find((exerciseItem) => Number(exerciseItem && exerciseItem.id) === Number(pendingExerciseId)) || null;
        const queuedSeries = Math.max(
          1,
          Number(
            libraryExercise &&
            (
              libraryExercise.seriesCount ||
              libraryExercise.series ||
              libraryExercise.series_count
            )
          ) || 3
        );
        const queuedRepetitions = Math.max(
          1,
          Number(libraryExercise && libraryExercise.repetitions) || 10
        );
        const queuedLoad = Math.max(
          0,
          Number(
            libraryExercise &&
            (libraryExercise.loadKg || libraryExercise.load || libraryExercise.carga)
          ) || 0
        );
        const queuedRest = Math.max(
          0,
          Number(
            libraryExercise &&
            (libraryExercise.restSeconds || libraryExercise.restTime || libraryExercise.descanso)
          ) || 30
        );

        try {
          await requestStudentApi(
            `/workouts/templates/${encodeURIComponent(String(templateId))}/exercises`,
            {
              method: 'POST',
              body: {
                exerciseId: pendingExerciseId,
                order: nextOrder,
                series: queuedSeries,
                reps: queuedRepetitions,
                defaultLoad: queuedLoad,
                restTime: queuedRest
              }
            }
          );
          savedCount += 1;
          nextOrder += 1;
        } catch (error) {
          pendingFailures.push(pendingExerciseId);
          if (!firstFailureMessage && error && error.message) {
            firstFailureMessage = error.message;
          }
        }
      }

      setTrainerExercisePendingQueue(templateId, pendingFailures);

      if (!savedCount && pendingFailures.length) {
        throw new Error(firstFailureMessage || 'Não foi possível salvar os exercícios pendentes.');
      }

      if (pendingFailures.length) {
        isPartialSave = true;
        const fallbackMessage = `${savedCount} exercício(s) salvo(s). ${pendingFailures.length} exercício(s) continuam pendentes.`;
        successMessage = firstFailureMessage
          ? `${fallbackMessage} ${firstFailureMessage}`
          : fallbackMessage;
      } else {
        successMessage = `${savedCount} exercício(s) adicionados ao treino com sucesso.`;
      }

      if (trainerExerciseLibrarySelect) {
        const lastAddedExerciseId = Number(
          pendingExerciseIds[pendingExerciseIds.length - 1]
        ) || 0;
        trainerExerciseLibrarySelect.value = lastAddedExerciseId
          ? String(lastAddedExerciseId)
          : '';
      }
      nextOrderForForm = nextOrder;
    } else {
      const response = await requestStudentApi(
        `/workouts/templates/${encodeURIComponent(String(templateId))}/exercises`,
        {
          method: 'POST',
          body: {
            exerciseId: selectedLibraryExerciseId,
            order,
            series,
            reps: repetitions,
            defaultLoad: loadKg,
            restTime: restSeconds
          }
        }
      );

      successMessage = (response && response.message) || 'Exercício adicionado ao treino com sucesso.';
    }

    if (trainerExerciseForm) {
      const preservedWorkoutId = String(templateId);
      const preservedGroups = selectedGroups.length
        ? selectedGroups
        : selectedGroup
          ? [selectedGroup]
          : [];
      trainerExerciseForm.reset();
      trainerExerciseSearchTerm = '';
      if (trainerExerciseWorkoutSelect) trainerExerciseWorkoutSelect.value = preservedWorkoutId;
      setSelectedTrainerExerciseGroups(preservedGroups);
      if (trainerExerciseSearchInput) trainerExerciseSearchInput.value = '';
      if (trainerExerciseOrderInput) trainerExerciseOrderInput.value = String(nextOrderForForm);
      if (trainerExerciseSeriesInput) trainerExerciseSeriesInput.value = String(series);
      if (trainerExerciseRepetitionsInput) trainerExerciseRepetitionsInput.value = String(repetitions);
      if (trainerExerciseLoadInput) trainerExerciseLoadInput.value = String(loadKg);
      if (trainerExerciseRestInput) trainerExerciseRestInput.value = String(restSeconds);
      if (trainerExerciseObservationInput) trainerExerciseObservationInput.value = '';
      syncTrainerExerciseGroupDrivenUi();
    }

    trainerTemplateExerciseSelectedId = String(templateId);
    trainerExerciseComposerSelectedId = String(templateId);
    let coverAutoApplied = false;
    if (trainerWorkoutPendingCoverFile) {
      coverAutoApplied = await handleTrainerWorkoutCoverSave({
        templateId,
        successMessage: 'Capa da nomeclatura salva com sucesso.'
      });
    }
    await loadTrainerManagementData(true);
    isTrainerExerciseComposerOpen = true;
    syncTrainerExerciseComposerUi();

    const finalSuccessMessage = coverAutoApplied
      ? `${successMessage} A capa da nomeclatura também foi salva.`
      : successMessage;
    setTrainerManagementFeedback(finalSuccessMessage, !isPartialSave);
    setTrainerExerciseFeedback(finalSuccessMessage, !isPartialSave);
    renderTrainerExerciseLibraryPicker();
  } catch (error) {
    const errorMessage = error && error.message ? error.message : 'Falha ao adicionar exercício ao treino.';
    setTrainerManagementFeedback(errorMessage, false);
    setTrainerExerciseFeedback(errorMessage, false);
  } finally {
    clearButtonLoading(trainerExerciseSubmitButton, 'Adicionar ao treino');
  }
};

const handleTrainerWorkoutModalSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;

  const workoutId = Number(trainerWorkoutEditingId) || 0;
  const templateId = Number(trainerWorkoutTemplateEditingId) || 0;
  const isTemplateMode = templateId > 0;
  if (!workoutId && !templateId) {
    setTrainerWorkoutModalFeedback('Registro inválido para edição.', false);
    return;
  }

  const title = trainerWorkoutModalNameInput
    ? String(trainerWorkoutModalNameInput.value || '').trim()
    : '';
  const currentWorkout = getTrainerWorkoutById(workoutId);
  const objective = String(
    (trainerWorkoutModalObjectiveSelect && trainerWorkoutModalObjectiveSelect.value) ||
    (currentWorkout && (currentWorkout.objective || currentWorkout.objetivo)) ||
    'Hipertrofia'
  ).trim() || 'Hipertrofia';
  const status = isTemplateMode
    ? String(
        (trainerWorkoutModalStatusSelect && trainerWorkoutModalStatusSelect.value) || 'ATIVO'
      ).trim().toUpperCase() === 'INATIVO'
      ? 'INATIVO'
      : 'ATIVO'
    : 'ATIVO';

  if (!title) {
    setTrainerWorkoutModalFeedback('O nome do treino é obrigatório.', false);
    if (trainerWorkoutModalNameInput) trainerWorkoutModalNameInput.focus({ preventScroll: true });
    return;
  }

  setButtonLoading(trainerWorkoutModalSubmitButton, 'Salvando...');
  setTrainerWorkoutModalFeedback(
    isTemplateMode ? 'Salvando alterações da nomeclatura...' : 'Salvando alterações do treino...',
    false
  );
  setTrainerWorkoutModalCoverFeedback('', false);

  try {
    if (trainerWorkoutModalPendingCoverFile) {
      setTrainerWorkoutModalCoverFeedback(
        isTemplateMode ? 'Enviando nova capa da nomeclatura...' : 'Enviando nova capa do treino...',
        false
      );
    }
    const uploadedCoverUrl = trainerWorkoutModalPendingCoverFile
      ? await uploadTrainerWorkoutCoverFile(trainerWorkoutModalPendingCoverFile)
      : '';
    const response = isTemplateMode
      ? await requestWorkoutTemplateUpdate({
        templateId,
        body: {
          name: title,
          isActive: status === 'ATIVO',
          ...(uploadedCoverUrl ? { coverImageUrl: uploadedCoverUrl } : {})
        }
      })
      : await requestInstructorWorkoutUpdate({
        workoutId,
        body: {
          title,
          objective,
          status,
          isActive: true,
          ...(uploadedCoverUrl ? { coverImageUrl: uploadedCoverUrl } : {})
        }
      });

    if (isTemplateMode && uploadedCoverUrl) {
      const linkedWorkoutIds = getTrainerWorkoutIdsByTemplateId(templateId);
      if (linkedWorkoutIds.length) {
        await applyTrainerWorkoutCoverUrlToWorkoutIds(linkedWorkoutIds, uploadedCoverUrl);
      }
    }

    if (isTemplateMode) {
      trainerTemplateEditorSelectedId = String(templateId);
      trainerTemplateExerciseSelectedId = String(templateId);
      trainerExerciseComposerSelectedId = String(templateId);
    } else {
      trainerExerciseTargetWorkoutId = workoutId;
    }
    await loadTrainerManagementData(true);
    if (!isTemplateMode) await loadTrainerProgressData(true);
    await syncWorkoutsFromBackend({ silent: true });
    if (isGeneralAdminUser()) await fetchAdminOverview(true);
    if (isTemplateMode) buildTrainerTemplatePreviewWorkout(templateId);

    const successMessage = `${(response && response.message) || (
      isTemplateMode ? 'Nomeclatura atualizada com sucesso.' : 'Treino atualizado com sucesso.'
    )}${uploadedCoverUrl ? ' A capa também foi atualizada.' : ''}`;
    setTrainerManagementFeedback(successMessage, true);
    if (!isTemplateMode && isGeneralAdminUser()) {
      setAdminOverviewFeedback(successMessage, true);
    }
    if (uploadedCoverUrl) {
      setTrainerWorkoutModalCoverFeedback('Capa atualizada com sucesso.', true);
    }
    closeTrainerWorkoutModal({ keepFocus: true, force: true });
  } catch (error) {
    const errorMessage = error && error.message
      ? error.message
      : (isTemplateMode ? 'Falha ao atualizar nomeclatura.' : 'Falha ao atualizar treino.');
    setTrainerWorkoutModalFeedback(errorMessage, false);
    setTrainerManagementFeedback(errorMessage, false);
    if (!isTemplateMode && isGeneralAdminUser()) {
      setAdminOverviewFeedback(errorMessage, false);
    }
    setTrainerWorkoutModalCoverFeedback(errorMessage, false);
  } finally {
    clearButtonLoading(trainerWorkoutModalSubmitButton, 'Salvar alterações');
  }
};

const handleTrainerWorkoutExerciseModalSubmit = async (event) => {
  event.preventDefault();
  if (!isTrainerManagerUser()) return;

  const workoutId = Number(
    trainerWorkoutExerciseEditingState && trainerWorkoutExerciseEditingState.workoutId
  ) || 0;
  const templateId = Number(
    trainerWorkoutExerciseEditingState && trainerWorkoutExerciseEditingState.templateId
  ) || 0;
  const workoutExerciseId = Number(
    trainerWorkoutExerciseEditingState && trainerWorkoutExerciseEditingState.workoutExerciseId
  ) || 0;
  const templateExerciseId = Number(
    trainerWorkoutExerciseEditingState && trainerWorkoutExerciseEditingState.templateExerciseId
  ) || 0;
  const isTemplateMode = templateId > 0;
  if ((!isTemplateMode && (!workoutId || !workoutExerciseId)) || (isTemplateMode && !templateExerciseId)) {
    setTrainerWorkoutExerciseModalFeedback('Exercício inválido para edição.', false);
    return;
  }

  const series = Math.max(
    1,
    parseIntegerInputValue(
      trainerWorkoutExerciseModalSeriesInput ? trainerWorkoutExerciseModalSeriesInput.value : 1,
      1
    )
  );
  const repetitions = Math.max(
    1,
    parseIntegerInputValue(
      trainerWorkoutExerciseModalRepetitionsInput
        ? trainerWorkoutExerciseModalRepetitionsInput.value
        : 10,
      10
    )
  );
  const loadKg = Math.max(
    0,
    parseDecimalInputValue(
      trainerWorkoutExerciseModalLoadInput ? trainerWorkoutExerciseModalLoadInput.value : 0,
      0
    )
  );
  const restSeconds = Math.max(
    0,
    parseIntegerInputValue(
      trainerWorkoutExerciseModalRestInput ? trainerWorkoutExerciseModalRestInput.value : 30,
      30
    )
  );
  const observation = trainerWorkoutExerciseModalObservationInput
    ? String(trainerWorkoutExerciseModalObservationInput.value || '').trim()
    : '';

  setButtonLoading(trainerWorkoutExerciseModalSubmitButton, 'Salvando...');
  setTrainerWorkoutExerciseModalFeedback(
    isTemplateMode
      ? 'Salvando alterações do exercício da nomeclatura...'
      : 'Salvando alterações do exercício...',
    false
  );

  try {
    const response = isTemplateMode
      ? await requestWorkoutTemplateExerciseUpdate({
        templateId,
        templateExerciseId,
        body: {
          series,
          reps: repetitions,
          defaultLoad: loadKg,
          restTime: restSeconds
        }
      })
      : await requestStudentApi(
        `/workouts/${encodeURIComponent(String(workoutId))}/exercises/${encodeURIComponent(String(workoutExerciseId))}`,
        {
          method: 'PATCH',
          body: {
            series,
            repeticoes: repetitions,
            carga: loadKg,
            descanso: restSeconds,
            observation
          }
        }
      );

    if (!isTemplateMode) {
      trainerExerciseTargetWorkoutId = workoutId;
    } else {
      trainerTemplateExerciseSelectedId = String(templateId);
      trainerExerciseComposerSelectedId = String(templateId);
    }
    await loadTrainerManagementData(true);
    if (isTemplateMode) buildTrainerTemplatePreviewWorkout(templateId);
    await syncWorkoutsFromBackend({ silent: true });
    if (isGeneralAdminUser()) await fetchAdminOverview(true);
    renderTrainerWorkoutModalLibraryGuide();

    setTrainerManagementFeedback(
      (response && response.message) || (
        isTemplateMode
          ? 'Exercício da nomeclatura atualizado com sucesso.'
          : 'Exercício atualizado com sucesso.'
      ),
      true
    );
    setTrainerExerciseFeedback(
      (response && response.message) || (
        isTemplateMode
          ? 'Exercício da nomeclatura atualizado com sucesso.'
          : 'Exercício atualizado com sucesso.'
      ),
      true
    );
    closeTrainerWorkoutExerciseModal({ keepFocus: true, force: true });
  } catch (error) {
    const errorMessage = error && error.message
      ? error.message
      : (isTemplateMode
        ? 'Falha ao atualizar exercício da nomeclatura.'
        : 'Falha ao atualizar exercício do treino.');
    setTrainerWorkoutExerciseModalFeedback(errorMessage, false);
    setTrainerManagementFeedback(errorMessage, false);
    setTrainerExerciseFeedback(errorMessage, false);
  } finally {
    clearButtonLoading(trainerWorkoutExerciseModalSubmitButton, 'Salvar alterações');
  }
};

const handleTrainerWorkoutsTableActions = async (event) => {
  const target = event && event.target;
  if (!(target instanceof Element)) return;

  const toggleDetailsButton = target.closest('[data-trainer-workout-toggle-details]');
  if (toggleDetailsButton && toggleDetailsButton instanceof HTMLButtonElement) {
    const workoutId = Number(toggleDetailsButton.dataset.workoutId || 0);
    if (!workoutId) return;
    const opened = openAssignedWorkoutPreview(workoutId, toggleDetailsButton);
    if (!opened) {
      setTrainerManagementFeedback('Não foi possível abrir a visualização do treino.', false);
    }
    return;
  }

  const editButton = target.closest('[data-trainer-workout-edit]');
  if (editButton && editButton instanceof HTMLButtonElement) {
    const workoutId = Number(editButton.dataset.workoutId || 0);
    if (!workoutId) return;
    const workout = getTrainerWorkoutById(workoutId);
    if (!workout) {
      setTrainerManagementFeedback('Treino não encontrado para edição.', false);
      return;
    }
    const opened = openTrainerWorkoutModal(workout, editButton, { readOnly: false });
    if (!opened) {
      setTrainerManagementFeedback('Não foi possível abrir a edição do treino.', false);
    }
    return;
  }

  const definitionEditButton = target.closest('[data-trainer-workout-definition-edit-exercises]');
  if (definitionEditButton && definitionEditButton instanceof HTMLButtonElement) {
    const templateId = Number(definitionEditButton.dataset.templateId || 0) || 0;
    if (!templateId) return;

    const opened = openTrainerTemplateEditorModal(templateId, definitionEditButton);
    if (!opened) {
      setTrainerManagementFeedback('Não foi possível abrir a edição da nomeclatura.', false);
    }
    return;
  }

  const definitionDeactivateButton = target.closest('[data-trainer-workout-definition-deactivate]');
  if (definitionDeactivateButton && definitionDeactivateButton instanceof HTMLButtonElement) {
    const templateId = Number(definitionDeactivateButton.dataset.templateId || 0) || 0;
    const definitionName = String(definitionDeactivateButton.dataset.definitionName || 'Treino').trim() || 'Treino';
    if (!templateId) return;

    const template = getTrainerTemplateById(templateId);
    if (!template) {
      setTrainerManagementFeedback('Nomeclatura de treino não encontrada.', false);
      return;
    }
    if (template.isActive === false) {
      setTrainerManagementFeedback('Essa nomeclatura de treino já está inativa.', false);
      return;
    }

    const confirmed = await requestSiteConfirm({
      title: 'Desativar nomeclatura de treino',
      identification: definitionName,
      message: `Tem certeza que deseja desativar a nomeclatura de treino "${definitionName}"? Ela deixará de aparecer para novas designações.`,
      confirmLabel: 'Desativar',
      cancelLabel: 'Cancelar',
      triggerButton: definitionDeactivateButton
    });
    if (!confirmed) return;

    definitionDeactivateButton.disabled = true;
    setTrainerManagementFeedback('Desativando nomeclatura de treino...', false);
    try {
      await requestWorkoutTemplateDeactivate(templateId);
      await loadTrainerManagementData(true);
      await loadTrainerProgressData(true);
      await syncWorkoutsFromBackend({ silent: true });
      if (isGeneralAdminUser()) await fetchAdminOverview(true);

      const refreshedTemplate = getTrainerTemplateById(templateId);
      if (refreshedTemplate && refreshedTemplate.isActive !== false) {
        throw new Error('Não foi possível confirmar a desativação. Atualize os dados e tente novamente.');
      }

      const successMessage = `Nomeclatura de treino "${definitionName}" desativada com sucesso.`;
      setTrainerManagementFeedback(successMessage, true);
      setTrainerExerciseFeedback(successMessage, true);
    } catch (error) {
      const errorMessage = error && error.message
        ? error.message
        : 'Falha ao desativar nomeclatura de treino.';
      setTrainerManagementFeedback(errorMessage, false);
      setTrainerExerciseFeedback(errorMessage, false);
    } finally {
      definitionDeactivateButton.disabled = false;
    }
    return;
  }

  const definitionDeleteButton = target.closest('[data-trainer-workout-definition-delete]');
  if (definitionDeleteButton && definitionDeleteButton instanceof HTMLButtonElement) {
    const templateId = Number(definitionDeleteButton.dataset.templateId || 0) || 0;
    const definitionName = String(definitionDeleteButton.dataset.definitionName || 'Treino').trim() || 'Treino';
    if (!templateId) return;

    const template = getTrainerTemplateById(templateId);
    if (!template) {
      setTrainerManagementFeedback('Nomeclatura de treino não encontrada.', false);
      return;
    }
    if (template.isActive !== false) {
      setTrainerManagementFeedback('Desative a nomeclatura de treino antes de excluir.', false);
      return;
    }

    const confirmed = await requestSiteConfirm({
      title: 'Excluir nomeclatura de treino',
      identification: definitionName,
      message: `Tem certeza que deseja excluir a nomeclatura de treino "${definitionName}"? Os treinos já atribuídos aos alunos serão mantidos.`,
      confirmLabel: 'Excluir treino',
      cancelLabel: 'Cancelar',
      triggerButton: definitionDeleteButton
    });
    if (!confirmed) return;

    definitionDeleteButton.disabled = true;
    setTrainerManagementFeedback('Excluindo nomeclatura de treino...', false);
    try {
      await requestWorkoutTemplateDelete(templateId);
      const deletedTemplateId = String(templateId);
      if (trainerTemplateExerciseSelectedId === deletedTemplateId) trainerTemplateExerciseSelectedId = '';
      if (trainerExerciseComposerSelectedId === deletedTemplateId) trainerExerciseComposerSelectedId = '';
      if (trainerTemplateEditorSelectedId === deletedTemplateId) trainerTemplateEditorSelectedId = '';
      await loadTrainerManagementData(true);
      await loadTrainerProgressData(true);
      await syncWorkoutsFromBackend({ silent: true });
      if (isGeneralAdminUser()) await fetchAdminOverview(true);

      const successMessage = `Nomeclatura de treino "${definitionName}" excluída com sucesso.`;
      setTrainerManagementFeedback(successMessage, true);
      setTrainerExerciseFeedback(successMessage, true);
    } catch (error) {
      const errorMessage = error && error.message
        ? error.message
        : 'Falha ao excluir nomeclatura de treino.';
      setTrainerManagementFeedback(errorMessage, false);
      setTrainerExerciseFeedback(errorMessage, false);
    } finally {
      definitionDeleteButton.disabled = false;
    }
    return;
  }

  const deactivateButton = target.closest('[data-trainer-workout-deactivate]');
  const deleteButton = target.closest('[data-trainer-workout-delete]');
  if (deleteButton && deleteButton instanceof HTMLButtonElement) {
    const workoutId = Number(deleteButton.dataset.workoutId || 0);
    if (!workoutId) return;

    const workout = getTrainerWorkoutById(workoutId);
    const workoutName = String(
      (workout && (workout.title || workout.name)) || `Treino #${workoutId}`
    ).trim();

    const confirmed = await requestSiteConfirm({
      title: 'Excluir treino',
      identification: workoutName,
      message: `Tem certeza que deseja excluir o treino "${workoutName}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir treino',
      cancelLabel: 'Cancelar',
      triggerButton: deleteButton
    });
    if (!confirmed) return;

    deleteButton.disabled = true;
    setTrainerManagementFeedback('Excluindo treino...', false);

    void requestInstructorWorkoutDelete(workoutId)
      .then(async (response) => {
        const currentTargetWorkoutId = Number(trainerExerciseTargetWorkoutId) || 0;
        if (currentTargetWorkoutId === workoutId) {
          trainerExerciseTargetWorkoutId = 0;
        }
        await loadTrainerManagementData(true);
        await loadTrainerProgressData(true);
        await syncWorkoutsFromBackend({ silent: true });
        if (isGeneralAdminUser()) await fetchAdminOverview(true);

        const successMessage = (response && response.message) || 'Treino excluído com sucesso.';
        setTrainerManagementFeedback(successMessage, true);
        setTrainerExerciseFeedback(successMessage, true);
      })
      .catch((error) => {
        const errorMessage = error && error.message
          ? error.message
          : 'Falha ao excluir treino.';
        setTrainerManagementFeedback(errorMessage, false);
        setTrainerExerciseFeedback(errorMessage, false);
      })
      .finally(() => {
        deleteButton.disabled = false;
      });
    return;
  }

  if (!deactivateButton || !(deactivateButton instanceof HTMLButtonElement)) return;

  const workoutId = Number(deactivateButton.dataset.workoutId || 0);
  if (!workoutId) return;

  const workout = getTrainerWorkoutById(workoutId);
  const workoutName = String(
    (workout && (workout.title || workout.name)) || `Treino #${workoutId}`
  ).trim();

  const confirmed = await requestSiteConfirm({
    title: 'Desativar treino',
    identification: workoutName,
    message: `Tem certeza que deseja desativar o treino "${workoutName}"?`,
    confirmLabel: 'Desativar',
    cancelLabel: 'Cancelar',
    triggerButton: deactivateButton
  });
  if (!confirmed) return;

  deactivateButton.disabled = true;
  setTrainerManagementFeedback('Desativando treino...', false);

  void requestInstructorWorkoutDeactivate(workoutId, { workout })
    .then(async (response) => {
      trainerExerciseTargetWorkoutId = workoutId;
      await loadTrainerManagementData(true);
      await loadTrainerProgressData(true);
      await syncWorkoutsFromBackend({ silent: true });
      if (isGeneralAdminUser()) await fetchAdminOverview(true);

      const refreshedWorkout = getTrainerWorkoutById(workoutId);
      const deactivationConfirmed = refreshedWorkout ? isWorkoutInactive(refreshedWorkout) : true;
      if (!deactivationConfirmed) {
        throw new Error('Não foi possível confirmar a desativação. Atualize os dados e tente novamente.');
      }

      const successMessage = (response && response.message) || 'Treino desativado com sucesso.';
      setTrainerManagementFeedback(successMessage, true);
      setTrainerExerciseFeedback(successMessage, true);
    })
    .catch((error) => {
      const errorMessage = error && error.message
        ? error.message
        : 'Falha ao desativar treino.';
      setTrainerManagementFeedback(errorMessage, false);
    })
    .finally(() => {
      deactivateButton.disabled = false;
    });
};

const handleTrainerWorkoutExercisesTableActions = async (event) => {
  const target = event && event.target;
  if (!(target instanceof Element)) return;

  const viewVideoButton = target.closest('[data-trainer-workout-exercise-video]');
  if (viewVideoButton && viewVideoButton instanceof HTMLButtonElement) {
    const exerciseName = String(viewVideoButton.dataset.exerciseName || 'Exercício').trim();
    const videoUrl = String(viewVideoButton.dataset.videoUrl || '').trim();
    const opened = openTrainerExerciseVideoModal({
      exerciseName,
      videoUrl,
      triggerButton: viewVideoButton
    });
    if (!opened) {
      setTrainerExerciseFeedback('Não foi possível abrir o vídeo deste exercício.', false);
    }
    return;
  }

  const editButton = target.closest('[data-trainer-workout-exercise-edit]');
  if (editButton && editButton instanceof HTMLButtonElement) {
    const workoutId = Number(editButton.dataset.workoutId || 0);
    const workoutExerciseId = Number(editButton.dataset.workoutExerciseId || 0);
    if (!workoutId || !workoutExerciseId) return;

    const exercise = getTrainerWorkoutExerciseById({ workoutId, workoutExerciseId });
    if (!exercise) {
      setTrainerExerciseFeedback('Exercício não encontrado para edição.', false);
      return;
    }

    const opened = openTrainerWorkoutExerciseModal({
      workoutId,
      exercise,
      triggerButton: editButton
    });
    if (!opened) {
      setTrainerExerciseFeedback('Não foi possível abrir a edição do exercício.', false);
    }
    return;
  }

  const removeButton = target.closest('[data-trainer-workout-exercise-remove]');
  if (!removeButton || !(removeButton instanceof HTMLButtonElement)) return;

  const workoutId = Number(removeButton.dataset.workoutId || 0);
  const workoutExerciseId = Number(removeButton.dataset.workoutExerciseId || 0);
  if (!workoutId || !workoutExerciseId) return;

  const exercise = getTrainerWorkoutExerciseById({ workoutId, workoutExerciseId });
  const exerciseName = String((exercise && exercise.name) || `Exercício #${workoutExerciseId}`).trim();
  const confirmed = await requestSiteConfirm({
    title: 'Remover exercício',
    identification: exerciseName,
    message: `Tem certeza que deseja remover "${exerciseName}" deste treino?`,
    confirmLabel: 'Remover',
    cancelLabel: 'Cancelar',
    triggerButton: removeButton
  });
  if (!confirmed) return;

  removeButton.disabled = true;
  setTrainerManagementFeedback('Removendo exercício do treino...', false);
  setTrainerExerciseFeedback('Removendo exercício do treino...', false);

  void requestStudentApi(
    `/workouts/${encodeURIComponent(String(workoutId))}/exercises/${encodeURIComponent(String(workoutExerciseId))}`,
    { method: 'DELETE' }
  )
    .then(async (response) => {
      trainerExerciseTargetWorkoutId = workoutId;
      await loadTrainerManagementData(true);
      await syncWorkoutsFromBackend({ silent: true });
      if (isGeneralAdminUser()) await fetchAdminOverview(true);

      const successMessage = (response && response.message) || 'Exercício removido com sucesso.';
      setTrainerManagementFeedback(successMessage, true);
      setTrainerExerciseFeedback(successMessage, true);
    })
    .catch((error) => {
      const errorMessage = error && error.message
        ? error.message
        : 'Falha ao remover exercício do treino.';
      setTrainerManagementFeedback(errorMessage, false);
      setTrainerExerciseFeedback(errorMessage, false);
    })
    .finally(() => {
      removeButton.disabled = false;
    });
};

/* ==========================================================================
   8) Student area events
   ========================================================================== */
const tryAutoLoginFromStoredSession = async ({
  preserveActiveView = false,
  preferredTab = '',
  preferredPanel = ''
} = {}) => {
  const token = loadStudentAuthToken();
  if (!token) return false;

  try {
    const remember = loadRememberPreference();
    saveStudentAuthToken(token, remember);
    const authProfile = await syncSessionProfileFromServer({
      token,
      remember,
      refreshUi: false
    });
    if (!authProfile) return false;

    await syncLibraryFromBackend({ silent: true });
    if (normalizeRole(studentData.userRole) === 'ALUNO') {
      await syncWorkoutHistoryFromBackend({ silent: true });
      await syncStudentBodyMetricsFromBackend({ silent: true });
    }
    await syncWorkoutsFromBackend({ silent: true });

    if (isGeneralAdminUser()) {
      await fetchAdminOverview(true);
    }
    if (isTrainerManagerUser()) {
      await loadTrainerManagementData(true);
      await loadTrainerProgressData(true);
    } else {
      try {
        await syncWeeklySummaryFromBackend(new Date());
      } catch (_) {}
    }

    startSessionHeartbeat();
    setOverlayView('app');
    renderStudentApp();

    const normalizedPreferredTab = String(preferredTab || '').trim();
    const normalizedPreferredPanel = String(preferredPanel || '').trim();
    const targetTab = preserveActiveView
      ? (normalizedPreferredTab || String(currentStudentTab || '').trim() || getDefaultMainTabForCurrentRole())
      : getDefaultMainTabForCurrentRole();

    setStudentAppTab(targetTab, true);

    if (
      preserveActiveView &&
      normalizedPreferredPanel &&
      normalizedPreferredPanel !== targetTab &&
      !isGeneralAdminUser()
    ) {
      setStudentDirectPanel(normalizedPreferredPanel, targetTab);
    }

    saveStudentAreaState({
      isOpen: true,
      overlay: 'app',
      tab: currentStudentTab,
      panel: currentStudentPanel
    });
    return true;
  } catch (_) {
    stopSessionHeartbeat();
    resetAuthIdentityToDefault({
      clearStoredToken: true,
      clearStoredProfile: !loadRememberPreference(),
    });
    resetTrainerManagementState();
    resetTrainerProgressState();
    return false;
  }
};

const openStudentArea = (event) => {
  if (event) event.preventDefault();
  if (!studentArea) return;

  clearStudentTimer();
  resetStudentForms();
  setOverlayView('loading');
  studentInLoginStage = false;

  studentArea.hidden = false;
  studentArea.setAttribute('aria-hidden', 'false');
  document.body.classList.add('student-area-open');
  document.documentElement.classList.add('student-area-open');
  requestAnimationFrame(() => studentArea.classList.add('is-open'));
  saveStudentAreaState({
    isOpen: true,
    overlay: 'loading',
    tab: currentStudentTab,
    panel: currentStudentPanel
  });

  playStudentLoadingVideo({ reset: true });
  window.requestAnimationFrame(() => playStudentLoadingVideo());
  window.setTimeout(() => playStudentLoadingVideo(), 120);

  studentLoadingTimer = window.setTimeout(async () => {
    if (studentInLoginStage) return;
    studentInLoginStage = true;

    const autoLogged = await tryAutoLoginFromStoredSession();
    if (!autoLogged) {
      setOverlayView('login');
    }
  }, 2800);
};

const closeStudentArea = () => {
  if (!studentArea) return;
  clearStudentTimer();
  stopStudentWorkoutsRefresh();
  clearPrepCountdown();
  clearRunCountdown();
  clearRestCountdown();
  closeMobileSelectPicker({ restoreFocus: false });
  if (studentVideo) studentVideo.pause();
  closeExerciseModal();
  closeWeightModal();
  closeBmiModal();
  closeProfileActionModal();
  closeSiteConfirmModal({ keepFocus: false, result: false });
  hideSiteTopNotice({ immediate: true });
  closeAdminExerciseEditModal({ keepFocus: false, force: true });
  closeAdminUserDeleteModal({ keepFocus: false, force: true });
  closeTrainerWorkoutModal({ keepFocus: false, force: true });
  closeTrainerWorkoutExerciseModal({ keepFocus: false, force: true });
  closeTrainerExerciseVideoModal({ keepFocus: false });

  studentArea.classList.remove('is-open');
  studentArea.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('student-area-open');
  document.documentElement.classList.remove('student-area-open');
  saveStudentAreaState({ isOpen: false, overlay: 'closed', tab: 'dashboard', panel: 'dashboard' });

  window.setTimeout(() => {
    studentArea.hidden = true;
    setOverlayView('loading');
    resetStudentForms();
    setStudentAppTab('dashboard', true);
  }, 320);
};

const handleLoginSubmit = async (event) => {
  event.preventDefault();
  if (!studentUserInput || !studentPassInput || !studentFormError) return;

  clearInvalidState(studentUserInput, studentPassInput);
  studentFormError.textContent = '';
  studentFormError.classList.remove('is-success');

  const user = studentUserInput.value.trim().toLowerCase();
  const pass = studentPassInput.value.trim();
  const rememberLogin = Boolean(studentRememberInput && studentRememberInput.checked);
  const deviceName = getDeviceName();
  let hasError = false;
  if (!isValidEmail(user)) { studentUserInput.classList.add('is-invalid'); hasError = true; }
  if (pass.length < 6) { studentPassInput.classList.add('is-invalid'); hasError = true; }
  if (hasError) {
    studentFormError.textContent = 'Use um e-mail válido e senha com pelo menos 6 caracteres.';
    return;
  }

  setButtonLoading(studentSubmitButton, 'Entrando...');
  try {
    const loginResponse = await requestStudentApi('/auth/login', {
      method: 'POST',
      body: {
        email: user,
        password: pass,
        rememberMe: rememberLogin,
        deviceName
      }
    });

    const token = String(loginResponse && loginResponse.token ? loginResponse.token : '').trim();
    if (!token) {
      throw new Error('Token de autenticação não retornado pelo servidor.');
    }

    saveRememberPreference(rememberLogin);
    saveStudentAuthToken(token, rememberLogin);
    const authProfile = await syncSessionProfileFromServer({
      token,
      remember: rememberLogin,
      refreshUi: false
    });
    if (!authProfile) {
      throw new Error('Não foi possível carregar os dados da conta.');
    }

    startSessionHeartbeat();
    setOverlayView('app');
    renderStudentApp();
    const firstTab = getDefaultMainTabForCurrentRole();
    setStudentAppTab(firstTab, true);
    saveStudentAreaState({ isOpen: true, overlay: 'app', tab: firstTab, panel: firstTab });

    void (async () => {
      await syncLibraryFromBackend({ silent: true });
      if (normalizeRole(studentData.userRole) === 'ALUNO') {
        await syncWorkoutHistoryFromBackend({ silent: true });
        await syncStudentBodyMetricsFromBackend({ silent: true });
      }
      await syncWorkoutsFromBackend({ silent: true });

      if (isGeneralAdminUser()) {
        await fetchAdminOverview(true);
      }
      if (isTrainerManagerUser()) {
        await loadTrainerManagementData(true);
        await loadTrainerProgressData(true);
      } else {
        try {
          await syncWeeklySummaryFromBackend(new Date());
        } catch (_) {}
      }

      renderStudentApp();
    })();
  } catch (error) {
    stopSessionHeartbeat();
    resetAuthIdentityToDefault({ clearStoredToken: true });
    studentFormError.textContent = error && error.message ? error.message : 'Falha ao realizar login.';
  } finally {
    clearButtonLoading(studentSubmitButton, 'Entrar');
  }
};

const handleRegisterSubmit = async (event) => {
  event.preventDefault();
  if (!studentRegisterError) return;

  clearInvalidState(studentRegisterName, studentRegisterEmail, studentRegisterPhone, studentRegisterPass, studentRegisterPassConfirm);
  studentRegisterError.textContent = '';
  studentRegisterError.classList.remove('is-success');

  const name = studentRegisterName ? studentRegisterName.value.trim() : '';
  const email = studentRegisterEmail ? studentRegisterEmail.value.trim() : '';
  const phoneDigits = studentRegisterPhone ? studentRegisterPhone.value.replace(/\D/g, '') : '';
  const pass = studentRegisterPass ? studentRegisterPass.value.trim() : '';
  const confirm = studentRegisterPassConfirm ? studentRegisterPassConfirm.value.trim() : '';
  const isPasswordStrong = hasStrongPassword(pass);

  let hasError = false;
  if (name.length < 3) { if (studentRegisterName) studentRegisterName.classList.add('is-invalid'); hasError = true; }
  if (!isValidEmail(email)) { if (studentRegisterEmail) studentRegisterEmail.classList.add('is-invalid'); hasError = true; }
  if (phoneDigits.length < 10) { if (studentRegisterPhone) studentRegisterPhone.classList.add('is-invalid'); hasError = true; }
  if (!isPasswordStrong) { if (studentRegisterPass) studentRegisterPass.classList.add('is-invalid'); hasError = true; }
  if (!confirm || confirm !== pass) { if (studentRegisterPassConfirm) studentRegisterPassConfirm.classList.add('is-invalid'); hasError = true; }

  if (hasError) {
    studentRegisterError.textContent = 'Preencha corretamente os dados. A senha deve ter pelo menos 6 caracteres.';
    return;
  }

  setButtonLoading(studentRegisterSubmit, 'Enviando...');
  try {
    const registerResponse = await requestStudentApi('/auth/register', {
      method: 'POST',
      body: {
        name,
        email: email.toLowerCase(),
        phone: phoneDigits,
        password: pass,
        confirmPassword: confirm,
        role: 'ALUNO'
      }
    });

    const user = registerResponse && registerResponse.user ? registerResponse.user : null;
    const authProfile = {
      id: Number((user && user.id) || 0) || null,
      name: user && user.name ? user.name : name,
      email: user && user.email ? String(user.email).toLowerCase() : email.toLowerCase(),
      phoneDigits: String((user && user.phone) || phoneDigits).replace(/\D/g, ''),
      createdAt: String((user && user.createdAt) || '').trim(),
      role: normalizeRole((user && user.role) || 'ALUNO'),
      isEnabled: user && user.isEnabled !== undefined ? Boolean(user.isEnabled) : true
    };

    applyStudentAuthProfile(authProfile);
    studentRegisterError.classList.add('is-success');
    studentRegisterError.textContent = 'Cadastro realizado com sucesso. Agora você já pode entrar.';
    if (studentUserInput) studentUserInput.value = authProfile.email;
    if (studentPassInput) studentPassInput.value = '';
    setAuthView('login');
  } catch (error) {
    studentRegisterError.textContent = error && error.message ? error.message : 'Falha ao cadastrar conta.';
  } finally {
    clearButtonLoading(studentRegisterSubmit, 'Cadastrar');
  }
};

const handleForgotPassword = (event) => {
  event.preventDefault();
  const suggestedEmail = studentUserInput ? String(studentUserInput.value || '').trim().toLowerCase() : '';
  const savedForgotState = loadForgotResetRequestState();
  const savedEmail = String(savedForgotState && savedForgotState.email ? savedForgotState.email : '')
    .trim()
    .toLowerCase();

  setAuthView('forgot');
  setForgotStep('request');
  clearInvalidState(
    studentForgotEmail,
    studentForgotType,
    studentForgotDescription,
    studentForgotToken,
    studentForgotNewPass,
    studentForgotConfirmPass
  );
  if (studentForgotRequestError) {
    studentForgotRequestError.textContent = '';
    studentForgotRequestError.classList.remove('is-success');
  }
  if (studentForgotResetError) {
    studentForgotResetError.textContent = '';
    studentForgotResetError.classList.remove('is-success');
  }

  if (studentForgotEmail && !studentForgotEmail.value.trim()) {
    studentForgotEmail.value = suggestedEmail || savedEmail;
  }
  if (studentForgotType && !studentForgotType.value) {
    studentForgotType.value = 'PASSWORD_RESET';
  }

  resumeForgotSupportStatusWatcher();
};

const handleForgotRequestSubmit = async (event) => {
  event.preventDefault();
  if (!studentForgotEmail || !studentForgotRequestError) return;

  clearInvalidState(studentForgotEmail, studentForgotType, studentForgotDescription);
  studentForgotRequestError.textContent = '';
  studentForgotRequestError.classList.remove('is-success');

  const email = String(studentForgotEmail.value || '').trim().toLowerCase();
  const requestType = normalizeSupportTicketType(
    studentForgotType ? studentForgotType.value : 'PASSWORD_RESET'
  );
  const description = String((studentForgotDescription && studentForgotDescription.value) || '').trim();
  const subject = buildSupportDefaultSubject(requestType);

  if (!isValidEmail(email)) {
    studentForgotEmail.classList.add('is-invalid');
    studentForgotRequestError.textContent = 'Informe um e-mail válido para recuperar a senha.';
    return;
  }

  setButtonLoading(studentForgotRequestSubmit, 'Enviando...');
  try {
    const requestResponse = await requestForgotSupportTicket({
      email,
      type: requestType,
      subject,
      description
    });

    if (studentUserInput) studentUserInput.value = email;

    if (studentForgotRequestError) {
      studentForgotRequestError.classList.add('is-success');
      const ticketId = Number(requestResponse && requestResponse.ticketId) || Number(requestResponse && requestResponse.ticket && requestResponse.ticket.id) || 0;
      const baseMessage = requestResponse && requestResponse.message
        ? requestResponse.message
        : 'Solicitação enviada com sucesso.';
      studentForgotRequestError.textContent = ticketId
        ? `${baseMessage} Protocolo #${ticketId}.`
        : baseMessage;
    }
    const ticketId = Number(requestResponse && requestResponse.ticketId) || Number(requestResponse && requestResponse.ticket && requestResponse.ticket.id) || 0;
    startForgotSupportStatusWatcher({
      email,
      ticketId,
      immediate: true
    });
  } catch (error) {
    studentForgotRequestError.textContent = normalizeForgotSupportErrorMessage(error);
  } finally {
    clearButtonLoading(studentForgotRequestSubmit, 'Enviar solicitação');
  }
};

const handleForgotResetSubmit = async (event) => {
  event.preventDefault();
  if (!studentForgotResetError) return;

  clearInvalidState(studentForgotToken, studentForgotEmail, studentForgotNewPass, studentForgotConfirmPass);
  studentForgotResetError.textContent = '';
  studentForgotResetError.classList.remove('is-success');

  const savedForgotState = loadForgotResetRequestState();
  const email = String(
    forgotSupportPendingEmail ||
    (studentForgotEmail && studentForgotEmail.value) ||
    (savedForgotState && savedForgotState.email) ||
    (studentUserInput && studentUserInput.value) ||
    ''
  ).trim().toLowerCase();
  const newPassword = String((studentForgotNewPass && studentForgotNewPass.value) || '').trim();
  const confirmPassword = String((studentForgotConfirmPass && studentForgotConfirmPass.value) || '').trim();

  let hasError = false;
  if (!email || !isValidEmail(email)) {
    if (studentForgotEmail) studentForgotEmail.classList.add('is-invalid');
    hasError = true;
  }
  if (!hasStrongPassword(newPassword)) {
    if (studentForgotNewPass) studentForgotNewPass.classList.add('is-invalid');
    hasError = true;
  }
  if (!confirmPassword || confirmPassword !== newPassword) {
    if (studentForgotConfirmPass) studentForgotConfirmPass.classList.add('is-invalid');
    hasError = true;
  }

  if (hasError) {
    studentForgotResetError.textContent = 'Confirme o e-mail e use uma senha com pelo menos 6 caracteres.';
    return;
  }

  if (studentForgotEmail && !String(studentForgotEmail.value || '').trim()) {
    studentForgotEmail.value = email;
  }

  setButtonLoading(studentForgotResetSubmit, 'Atualizando...');
  try {
    const resetResponse = await requestStudentApi('/auth/forgot-password/reset', {
      method: 'POST',
      body: {
        email,
        newPassword,
        confirmPassword
      }
    });

    if (studentFormError) {
      studentFormError.classList.add('is-success');
      studentFormError.textContent = resetResponse && resetResponse.message
        ? `${resetResponse.message} Faça login com a nova senha.`
        : 'Senha atualizada com sucesso. Faça login com a nova senha.';
    }

    if (studentPassInput) studentPassInput.value = '';
    clearForgotResetRequestState();
    forgotSupportPendingEmail = '';
    forgotSupportPendingTicketId = 0;
    stopForgotSupportStatusWatcher();
    setAuthView('login');
    setForgotStep('request');
  } catch (error) {
    studentForgotResetError.textContent = error && error.message
      ? error.message
      : 'Não foi possível redefinir a senha agora.';
  } finally {
    clearButtonLoading(studentForgotResetSubmit, 'Redefinir senha');
  }
};

const buildSupportDefaultSubject = (type) =>
  ({
    GENERAL_SUPPORT: 'Solicitação de ajuda e suporte',
    PASSWORD_RESET: 'Solicitação de redefinição de senha',
    LOGIN_ISSUE: 'Problema com login',
    APP_ERROR: 'Erro no aplicativo',
    WORKOUT_ISSUE: 'Problema com treino',
    PROFILE_UPDATE: 'Atualização de dados cadastrais',
    PAYMENT_PLAN_ISSUE: 'Problema com pagamento / plano',
    IMPROVEMENT_SUGGESTION: 'Sugestão de melhoria',
    EXERCISE_REPORT: 'Relatar exercício incorreto',
    OTHER: 'Outros'
  }[normalizeSupportTicketType(type)] || 'Solicitação de ajuda e suporte');

const requestForgotSupportTicket = async (payload) => {
  try {
    return await requestStudentApi('/support/tickets/public', {
      method: 'POST',
      body: payload
    });
  } catch (error) {
    if (!isApiRouteNotFoundError(error)) throw error;
    return requestStudentApi('/auth/forgot-password/request', {
      method: 'POST',
      body: payload
    });
  }
};

const normalizeForgotSupportErrorMessage = (error) => {
  const rawMessage = String(error && error.message ? error.message : '').trim();
  if (!rawMessage) {
    return 'Não foi possível solicitar a recuperação agora.';
  }

  const normalized = rawMessage.toLowerCase();
  if (
    normalized.includes('erro interno no servidor') ||
    normalized.includes('internal_error') ||
    normalized.includes('internal server')
  ) {
    return 'Não foi possível registrar sua solicitação agora. Tente novamente em instantes.';
  }

  return rawMessage;
};

const requestForgotSupportStatus = async ({ email, ticketId = 0 } = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) return null;

  const query = new URLSearchParams();
  query.set('email', normalizedEmail);
  if (Number(ticketId || 0) > 0) {
    query.set('ticketId', String(Number(ticketId)));
  }

  try {
    return await requestStudentApi(`/support/tickets/public-status?${query.toString()}`);
  } catch (error) {
    if (isApiRouteNotFoundError(error)) return null;
    throw error;
  }
};

const applyForgotSupportStatus = (statusPayload, { announceApproval = false } = {}) => {
  if (!statusPayload || typeof statusPayload !== 'object') return false;

  const found = Boolean(statusPayload.found);
  const status = String(statusPayload.status || '').trim().toUpperCase();
  const canResetNow =
    statusPayload.canResetNow === undefined || statusPayload.canResetNow === null
      ? status === 'APPROVED'
      : Boolean(statusPayload.canResetNow);
  const ticketId = Number(statusPayload.ticketId || forgotSupportPendingTicketId || 0) || 0;
  const email = String(forgotSupportPendingEmail || (studentForgotEmail && studentForgotEmail.value) || '')
    .trim()
    .toLowerCase();

  if (!found) return false;

  saveForgotResetRequestState({
    email,
    ticketId,
    lastStatus: status
  });

  if (status === 'APPROVED' && canResetNow) {
    setForgotStep('reset');
    if (studentForgotRequestError) {
      studentForgotRequestError.classList.add('is-success');
      studentForgotRequestError.textContent =
        'Reset liberado pelo Administrador Geral. Agora defina sua nova senha abaixo.';
    }
    if (studentForgotResetError) {
      studentForgotResetError.classList.add('is-success');
      studentForgotResetError.textContent =
        'A redefinição foi liberada. Digite sua nova senha.';
    }
    if (announceApproval && isForgotAuthViewVisible()) {
      showSiteTopNotice('Reset de senha liberado. Você já pode redefinir.', true, {
        durationMs: 3200
      });
    }
    if (studentForgotNewPass) {
      try {
        studentForgotNewPass.focus({ preventScroll: true });
      } catch (_) {
        studentForgotNewPass.focus();
      }
    }
    stopForgotSupportStatusWatcher();
    return true;
  }

  if (status === 'REJECTED') {
    if (studentForgotRequestError) {
      studentForgotRequestError.classList.remove('is-success');
      studentForgotRequestError.textContent =
        'Solicitação rejeitada pelo Administrador Geral. Abra uma nova solicitação.';
    }
    clearForgotResetRequestState();
    forgotSupportPendingEmail = '';
    forgotSupportPendingTicketId = 0;
    stopForgotSupportStatusWatcher();
    return false;
  }

  if (studentForgotRequestError && !studentForgotRequestError.textContent.trim()) {
    studentForgotRequestError.classList.add('is-success');
    studentForgotRequestError.textContent =
      'Solicitação registrada. Esta tela será atualizada automaticamente quando o reset for liberado.';
  }

  return false;
};

const pollForgotSupportStatusOnce = async ({ force = false, announceApproval = false } = {}) => {
  if (forgotSupportStatusPollInFlight) return false;
  if (!forgotSupportPendingEmail || !isValidEmail(forgotSupportPendingEmail)) return false;
  if (!force && !isForgotAuthViewVisible()) return false;

  forgotSupportStatusPollInFlight = true;
  try {
    const statusPayload = await requestForgotSupportStatus({
      email: forgotSupportPendingEmail,
      ticketId: forgotSupportPendingTicketId
    });
    if (!statusPayload) return false;
    return applyForgotSupportStatus(statusPayload, { announceApproval });
  } catch (_error) {
    return false;
  } finally {
    forgotSupportStatusPollInFlight = false;
  }
};

const startForgotSupportStatusWatcher = ({
  email,
  ticketId = 0,
  immediate = true
} = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) return;

  forgotSupportPendingEmail = normalizedEmail;
  forgotSupportPendingTicketId = Number(ticketId || 0) || 0;
  saveForgotResetRequestState({
    email: normalizedEmail,
    ticketId: forgotSupportPendingTicketId
  });

  stopForgotSupportStatusWatcher();

  if (immediate) {
    void pollForgotSupportStatusOnce({ force: true, announceApproval: false });
  }

  forgotSupportStatusPollTimer = setInterval(() => {
    void pollForgotSupportStatusOnce({ force: false, announceApproval: true });
  }, STUDENT_FORGOT_STATUS_POLL_MS);
};

const resumeForgotSupportStatusWatcher = ({ autoOpenForgotView = false } = {}) => {
  const savedState = loadForgotResetRequestState();
  if (!savedState || !savedState.email) return;

  if (autoOpenForgotView) {
    setAuthView('forgot');
    setForgotStep('request');
  }

  if (studentForgotEmail && !String(studentForgotEmail.value || '').trim()) {
    studentForgotEmail.value = savedState.email;
  }

  startForgotSupportStatusWatcher({
    email: savedState.email,
    ticketId: savedState.ticketId,
    immediate: true
  });
};

const handleProfileSupportSubmit = async (event) => {
  event.preventDefault();
  if (!profileSupportType || !profileSupportSubject || !profileSupportDescription) return;

  setProfileSupportFeedback('', false);
  clearInvalidState(profileSupportSubject, profileSupportDescription);

  const ticketType = normalizeSupportTicketType(profileSupportType.value);
  const subject = String(profileSupportSubject.value || '').trim();
  const description = String(profileSupportDescription.value || '').trim();
  const finalSubject = subject || buildSupportDefaultSubject(ticketType);

  let hasError = false;
  if (finalSubject.length < 4) {
    profileSupportSubject.classList.add('is-invalid');
    hasError = true;
  }
  if (description.length < 8) {
    profileSupportDescription.classList.add('is-invalid');
    hasError = true;
  }

  if (hasError) {
    setProfileSupportFeedback('Informe assunto e descrição com mais detalhes.', false);
    return;
  }

  setButtonLoading(profileSupportSubmit, 'Enviando...');
  try {
    const response = await requestStudentApi('/support/tickets', {
      method: 'POST',
      body: {
        type: ticketType,
        subject: finalSubject,
        description
      }
    });

    profileSupportSubject.value = '';
    profileSupportDescription.value = '';
    setProfileSupportFeedback(
      (response && response.message) || 'Solicitação enviada com sucesso.',
      true
    );

    if (ticketType === 'PASSWORD_RESET') {
      showSiteTopNotice(
        'Solicitação de reset enviada. Aguarde o Administrador Geral liberar a redefinição.',
        true,
        { durationMs: 3200 }
      );
    }

    profileSupportState.loaded = false;
    await fetchProfileSupportTickets(true);
  } catch (error) {
    setProfileSupportFeedback(
      error && error.message ? error.message : 'Não foi possível enviar sua solicitação.',
      false
    );
  } finally {
    clearButtonLoading(profileSupportSubmit, 'Enviar solicitação');
  }
};

const handleCompleteWorkout = async () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId);
  if (!workout || workout.done) return;

  setButtonLoading(workoutCompleteButton, 'Salvando...');

  try {
    await persistCompletedWorkoutHistory(workout, new Date());
    workoutExerciseChecks[workout.id] = workout.exercises.map(() => true);
    workoutExerciseDeferredQueue[workout.id] = [];
    workout.done = true;
    clearButtonLoading(workoutCompleteButton, 'Treino concluído');

    const doneCount = studentData.workouts.filter((item) => item.done).length;
    studentData.goalProgress = Math.min(100, Math.round((doneCount / studentData.workouts.length) * 100));
    studentData.performance = Math.min(100, studentData.performance + 2);

    renderStudentApp();
    showSiteTopNotice('Treino concluído e salvo no histórico da sua conta.', true, { durationMs: 2400 });
  } catch (error) {
    clearButtonLoading(workoutCompleteButton, 'Marcar treino como concluído');
    showSiteTopNotice(
      error && error.message ? error.message : 'Não foi possível salvar a conclusão do treino.',
      false,
      { durationMs: 2800 }
    );
  }
};

const handleFinishActiveWorkout = async () => {
  const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId);
  if (!workout || workout.done) return;
  const progressPct = workout.exercises.length
    ? Math.round((getWorkoutChecksDoneCount(workout) / workout.exercises.length) * 100)
    : 0;

  if (progressPct < 100) {
    openPrepWorkoutView();
    return;
  }

  setButtonLoading(activeWorkoutFinishButton, 'Salvando...');

  try {
    await persistCompletedWorkoutHistory(workout, new Date());
    workoutExerciseChecks[workout.id] = workout.exercises.map(() => true);
    workoutExerciseDeferredQueue[workout.id] = [];
    workout.done = true;
    clearButtonLoading(activeWorkoutFinishButton, 'Treino concluído');

    const doneCount = studentData.workouts.filter((item) => item.done).length;
    studentData.goalProgress = Math.min(100, Math.round((doneCount / studentData.workouts.length) * 100));
    studentData.performance = Math.min(100, studentData.performance + 2);

    renderStudentApp();
    setStudentAppTab('dashboard', true);
    showSiteTopNotice('Treino concluído e sincronizado com seu histórico.', true, { durationMs: 2400 });
  } catch (error) {
    clearButtonLoading(activeWorkoutFinishButton, 'Iniciar treino');
    renderActiveWorkout();
    showSiteTopNotice(
      error && error.message ? error.message : 'Não foi possível salvar a conclusão do treino.',
      false,
      { durationMs: 2800 }
    );
  }
};

const initStudentArea = () => {
  if (!studentArea) return;
  trainerTemplateCreatePanelCollapsed = loadTrainerTemplateCreatePanelCollapsed();
  trainerWorkoutCreatePanelCollapsed = loadTrainerWorkoutCreatePanelCollapsed();
  trainerManagedWorkoutsPanelCollapsed = loadTrainerManagedWorkoutsPanelCollapsed();
  adminWorkoutsPanelCollapsed = loadAdminWorkoutsPanelCollapsed();
  adminExercisesPanelCollapsed = loadAdminExercisesPanelCollapsed();
  adminSupportPanelCollapsed = loadAdminSupportPanelCollapsed();
  adminTeamPanelCollapsed = loadAdminTeamPanelCollapsed();
  syncTrainerTemplateCreatePanelCollapseUi();
  syncTrainerWorkoutCreatePanelCollapseUi();
  syncTrainerManagedWorkoutsPanelCollapseUi();
  syncAdminWorkoutsPanelCollapseUi();
  syncAdminExercisesPanelCollapseUi();
  syncAdminSupportPanelCollapseUi();
  syncAdminTeamPanelCollapseUi();

  studentArea.addEventListener(
    'submit',
    (event) => {
      const form = event && event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.closest('.student-area')) return;
      event.preventDefault();
    },
    true
  );

  studentArea.addEventListener('click', handleMobileSelectPickerClick, true);
  studentArea.addEventListener('mousedown', handleMobileSelectPickerMouseDown, true);
  if (typeof window !== 'undefined' && 'PointerEvent' in window) {
    studentArea.addEventListener('pointerdown', handleMobileSelectPickerPointerDown, true);
    studentArea.addEventListener('pointermove', handleMobileSelectPickerPointerMove, true);
    studentArea.addEventListener('pointerup', handleMobileSelectPickerPointerEnd, true);
    studentArea.addEventListener('pointercancel', handleMobileSelectPickerPointerCancel, true);
  }
  studentArea.addEventListener('touchstart', handleMobileSelectPickerPointerDown, {
    capture: true,
    passive: false
  });
  studentArea.addEventListener('touchmove', handleMobileSelectPickerPointerMove, {
    capture: true,
    passive: true
  });
  studentArea.addEventListener('touchend', handleMobileSelectPickerPointerEnd, {
    capture: true,
    passive: false
  });
  studentArea.addEventListener('touchcancel', handleMobileSelectPickerPointerCancel, {
    capture: true,
    passive: true
  });
  studentArea.addEventListener('focusin', handleMobileSelectPickerFocusIn, true);
  studentArea.addEventListener('keydown', handleMobileSelectPickerKeydown, true);
  window.addEventListener('resize', () => {
    if (!shouldUseMobileSelectPicker(mobileSelectPickerActiveSelect)) {
      closeMobileSelectPicker({ restoreFocus: false });
    }
  });

  if (studentAreaTrigger) studentAreaTrigger.addEventListener('click', openStudentArea);
  studentCloseTargets.forEach((node) => node.addEventListener('click', closeStudentArea));
  exerciseCloseButtons.forEach((node) => node.addEventListener('click', closeExerciseModal));

  if (studentVideo) {
    studentVideo.addEventListener('loadedmetadata', () => {
      if (studentInLoginStage) return;
      playStudentLoadingVideo();
    });
    studentVideo.addEventListener('canplay', () => {
      if (studentInLoginStage) return;
      playStudentLoadingVideo();
    });
    studentVideo.addEventListener('ended', () => {
      if (studentInLoginStage) return;
      studentInLoginStage = true;
      setOverlayView('login');
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (studentInLoginStage) return;
    playStudentLoadingVideo();
    void checkStudentWorkoutsRevisionInBackground({ force: true });
  });

  studentAuthTabs.forEach((tab) => {
    tab.addEventListener('click', () => setAuthView(tab.dataset.studentAuthTab || 'login'));
  });

  if (studentGoRegister) studentGoRegister.addEventListener('click', () => setAuthView('register'));
  studentGoLoginButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setAuthView('login');
      setForgotStep('request');
    });
  });

  if (studentForgotLink) {
    studentForgotLink.addEventListener('click', handleForgotPassword);
  }

  if (studentLoginForm) studentLoginForm.addEventListener('submit', handleLoginSubmit);
  if (studentRememberInput) {
    studentRememberInput.addEventListener('change', () => {
      saveRememberPreference(Boolean(studentRememberInput.checked));
    });
  }
  if (studentShowPassInput) {
    studentShowPassInput.addEventListener('change', syncLoginPasswordVisibility);
  }
  if (dashboardWeekGrid) {
    dashboardWeekGrid.addEventListener('click', handleWeekDayToggle);
  }
  if (studentRegisterForm) studentRegisterForm.addEventListener('submit', handleRegisterSubmit);
  if (studentForgotRequestForm) studentForgotRequestForm.addEventListener('submit', handleForgotRequestSubmit);
  if (studentForgotResetForm) studentForgotResetForm.addEventListener('submit', handleForgotResetSubmit);
  if (studentForgotGoReset) {
    studentForgotGoReset.addEventListener('click', () => {
      setForgotStep('reset');
      if (studentForgotResetError) {
        studentForgotResetError.textContent = '';
        studentForgotResetError.classList.remove('is-success');
      }
      if (studentForgotNewPass) {
        try {
          studentForgotNewPass.focus({ preventScroll: true });
        } catch (_) {
          studentForgotNewPass.focus();
        }
      }
    });
  }
  if (studentForgotBackRequest) {
    studentForgotBackRequest.addEventListener('click', () => {
      setForgotStep('request');
      clearInvalidState(studentForgotToken, studentForgotNewPass, studentForgotConfirmPass);
      if (studentForgotResetError) {
        studentForgotResetError.textContent = '';
        studentForgotResetError.classList.remove('is-success');
      }
      resumeForgotSupportStatusWatcher();
    });
  }

  studentAppTabs.forEach((tab) => {
    tab.addEventListener('click', () => setStudentAppTab(tab.dataset.studentAppTab || 'dashboard'));
  });

  if (studentHomeButton) {
    studentHomeButton.addEventListener('click', () => {
      const targetTab = getDefaultMainTabForCurrentRole();
      setStudentAppTab(targetTab, true);

      void (async () => {
        await syncWorkoutsFromBackend({ silent: true });
        if (isGeneralAdminUser()) {
          await fetchAdminOverview(true);
          await syncSiteTeamMembersFromApi({ silent: false, syncAdminForm: true });
        }
        if (isTrainerManagerUser()) {
          await loadTrainerManagementData(true);
          await loadTrainerProgressData(true);
        }
      })();
    });
  }

  if (adminOverviewRefreshButton) {
    adminOverviewRefreshButton.addEventListener('click', () => {
      void (async () => {
        await fetchAdminOverview(true);
        if (isGeneralAdminUser()) {
          await syncSiteTeamMembersFromApi({ silent: false, syncAdminForm: true });
        }
      })();
    });
  }

  if (adminExercisesToggleButton) {
    adminExercisesToggleButton.addEventListener('click', () => {
      toggleAdminExercisesPanelCollapsed();
    });
  }

  if (adminWorkoutsToggleButton) {
    adminWorkoutsToggleButton.addEventListener('click', () => {
      toggleAdminWorkoutsPanelCollapsed();
    });
  }

  if (adminSupportToggleButton) {
    adminSupportToggleButton.addEventListener('click', () => {
      toggleAdminSupportPanelCollapsed();
    });
  }

  if (adminTeamToggleButton) {
    adminTeamToggleButton.addEventListener('click', () => {
      toggleAdminTeamPanelCollapsed();
    });
  }

  if (trainerTemplateCreateToggleButton) {
    trainerTemplateCreateToggleButton.addEventListener('click', () => {
      toggleTrainerTemplateCreatePanelCollapsed();
    });
  }

  if (trainerWorkoutCreateToggleButton) {
    trainerWorkoutCreateToggleButton.addEventListener('click', () => {
      toggleTrainerWorkoutCreatePanelCollapsed();
    });
  }

  if (trainerManagedWorkoutsToggleButton) {
    trainerManagedWorkoutsToggleButton.addEventListener('click', () => {
      toggleTrainerManagedWorkoutsPanelCollapsed();
    });
  }

  bindAdminTeamFormEvents();

  adminOverviewTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setAdminOverviewTab(button.dataset.adminOverviewTab || 'distribution', true);
    });
  });

  adminSupportViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setAdminSupportView(button.dataset.adminSupportView || 'active');
    });
  });
  syncAdminSupportViewUi();

  trainerManagedWorkoutsViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setTrainerManagedWorkoutsView(button.dataset.trainerManagedWorkoutsView || 'assigned');
    });
  });
  syncTrainerManagedWorkoutsViewUi();

  if (adminOverviewReportButton) {
    adminOverviewReportButton.addEventListener('click', () => {
      void exportAdminOverviewPdf();
    });
    adminOverviewReportButton.addEventListener(
      'mouseenter',
      () => {
        void ensureAdminPdfLibraries().catch(() => {});
      },
      { once: true }
    );
  }

  if (trainerWorkoutRefreshButton) {
    trainerWorkoutRefreshButton.addEventListener('click', () => {
      void loadTrainerManagementData(true);
    });
  }

  if (trainerOpenLibraryManagerButton) {
    trainerOpenLibraryManagerButton.addEventListener('click', () => {
      openLibraryManagerPanel({ autoOpenForm: true });
    });
  }

  if (trainerExerciseFocusButton) {
    trainerExerciseFocusButton.addEventListener('click', () => {
      if (!isTrainerManagerUser()) {
        const permissionMessage = 'Somente Instrutor e Administrador Geral podem montar treinos.';
        setTrainerManagementFeedback(permissionMessage, false);
        setTrainerExerciseFeedback(permissionMessage, false);
        return;
      }
      const willOpenComposer = !isTrainerExerciseComposerOpen;
      isTrainerExerciseComposerOpen = willOpenComposer;

      if (!willOpenComposer) {
        closeTrainerExerciseLibraryPicker({ clearSearch: true });
        syncTrainerExerciseComposerUi();
        return;
      }

      if (trainerExerciseForm) trainerExerciseForm.reset();
      setSelectedTrainerExerciseGroups([]);
      trainerExerciseSearchTerm = '';
      if (trainerExerciseSearchInput) trainerExerciseSearchInput.value = '';
      closeTrainerExerciseLibraryPicker({ clearSearch: true });
      setTrainerManagementFeedback(
        'Formulário aberto. Selecione o treino cadastrado, o grupo e o exercício da biblioteca.',
        false
      );
      syncTrainerExerciseComposerUi({
        scroll: true,
        focus: false
      });
    });
  }

  if (libraryManagerToggleButton) {
    libraryManagerToggleButton.addEventListener('click', () => {
      if (!isLibraryManagerUser()) return;
      isLibraryManagerFormOpen = !isLibraryManagerFormOpen;
      syncLibraryManagerUi();
    });
  }

  if (libraryManagerCloseButton) {
    libraryManagerCloseButton.addEventListener('click', () => {
      if (!isLibraryManagerUser()) return;
      isLibraryManagerFormOpen = false;
      syncLibraryManagerUi();
    });
  }

  if (libraryManagerCancelButton) {
    libraryManagerCancelButton.addEventListener('click', () => {
      if (!isLibraryManagerUser()) return;
      isLibraryManagerFormOpen = false;
      syncLibraryManagerUi();
    });
  }

  if (trainerLibraryImageFileInput) {
    trainerLibraryImageFileInput.addEventListener('change', () => {
      const selectedImage = trainerLibraryImageFileInput.files
        ? trainerLibraryImageFileInput.files[0]
        : null;
      updateTrainerLibraryMediaPreview('image', selectedImage);
    });
  }

  if (trainerLibraryVideoFileInput) {
    trainerLibraryVideoFileInput.addEventListener('change', () => {
      const selectedVideo = trainerLibraryVideoFileInput.files
        ? trainerLibraryVideoFileInput.files[0]
        : null;
      updateTrainerLibraryMediaPreview('video', selectedVideo);
    });
  }

  if (trainerProgressRefreshButton) {
    trainerProgressRefreshButton.addEventListener('click', () => {
      void loadTrainerProgressData(true);
    });
  }
  if (trainerProgressExportPdfButton) {
    trainerProgressExportPdfButton.addEventListener('click', () => {
      exportTrainerProgressPdfReport();
    });
  }

  if (trainerProgressStudentSelect) {
    trainerProgressStudentSelect.addEventListener('change', () => {
      trainerProgressState.selectedStudentId = Number(trainerProgressStudentSelect.value) || 0;
      renderTrainerProgressPanel();
    });
  }

  if (trainerWorkoutStudentSearchInput) {
    trainerWorkoutStudentSearchInput.addEventListener('input', () => {
      trainerStudentSearchTerm = String(trainerWorkoutStudentSearchInput.value || '').trim();
      renderTrainerManagementPanel();
    });
  }

  if (trainerWorkoutStudentSelect) {
    trainerWorkoutStudentSelect.addEventListener('change', () => {
      trainerWorkoutStudentConfirmed = (Number(trainerWorkoutStudentSelect.value) || 0) > 0;
      renderTrainerManagementPanel();
    });
  }

  if (trainerWorkoutInstructorSearchInput) {
    trainerWorkoutInstructorSearchInput.addEventListener('input', () => {
      trainerInstructorSearchTerm = String(trainerWorkoutInstructorSearchInput.value || '').trim();
      renderTrainerManagementPanel();
    });
  }

  if (trainerWorkoutPredefinedSelect) {
    trainerWorkoutPredefinedSelect.addEventListener('change', () => {
      applyPredefinedWorkoutSelectionToAssignmentForm();
      trainerWorkoutPredefinedLastAppliedLabel = normalizeWorkoutDefinitionLabel(
        trainerWorkoutPredefinedSelect.value
      );
      renderTrainerManagementPanel();
    });
  }

  Array.from(trainerWeekdayInputs || []).forEach((weekdayInput) => {
    if (!weekdayInput) return;
    weekdayInput.addEventListener('change', () => {
      renderTrainerManagementPanel();
    });
  });

  if (trainerWeekdayAssignmentList) {
    trainerWeekdayAssignmentList.addEventListener('change', (event) => {
      const target = event && event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.matches('[data-trainer-weekday-assignment-select]')) return;

      const day = String(target.dataset.day || '').trim();
      const workoutId = Number(target.value) || 0;
      if (!day) return;

      if (workoutId > 0) {
        trainerWorkoutDayAssignments[day] = workoutId;
      } else {
        delete trainerWorkoutDayAssignments[day];
      }

      const viewButton = trainerWeekdayAssignmentList.querySelector(
        `[data-trainer-weekday-assignment-view][data-day="${escapeAdminCell(day)}"]`
      );
      if (viewButton instanceof HTMLButtonElement) {
        viewButton.disabled = workoutId <= 0;
      }
    });

    trainerWeekdayAssignmentList.addEventListener('click', (event) => {
      const target = event && event.target;
      if (!(target instanceof Element)) return;
      const viewButton = target.closest('[data-trainer-weekday-assignment-view]');
      if (!(viewButton instanceof HTMLButtonElement)) return;

      event.preventDefault();
      event.stopPropagation();
      const day = String(viewButton.dataset.day || '').trim();
      const templateId = Number(trainerWorkoutDayAssignments[day]) || 0;
      if (!templateId) {
        setTrainerManagementFeedback(`Selecione um treino para ${day} antes de visualizar.`, false);
        return;
      }

      openTrainerTemplatePreview(templateId, viewButton);
    });
  }

  if (trainerTemplateSelect) {
    trainerTemplateSelect.addEventListener('change', () => {
      renderTrainerManagementPanel();
    });
  }

  if (trainerWorkoutForm) {
    trainerWorkoutForm.addEventListener('submit', handleTrainerWorkoutSubmit);
  }

  if (trainerTemplateWorkoutForm) {
    trainerTemplateWorkoutForm.addEventListener('submit', handleTrainerTemplateWorkoutSubmit);
  }

  if (trainerTemplateForm) {
    trainerTemplateForm.addEventListener('submit', handleTrainerTemplateFormSubmit);
  }

  if (trainerTemplateEditorForm) {
    trainerTemplateEditorForm.addEventListener('submit', handleTrainerTemplateEditorSubmit);
  }

  if (trainerTemplateExerciseForm) {
    trainerTemplateExerciseForm.addEventListener('submit', handleTrainerTemplateExerciseSubmit);
  }

  if (trainerLibraryForm) {
    trainerLibraryForm.addEventListener('submit', handleTrainerLibrarySubmit);
  }

  if (trainerExerciseForm) {
    trainerExerciseForm.addEventListener('submit', handleTrainerExerciseSubmit);
  }

  if (trainerExerciseSearchInput) {
    trainerExerciseSearchInput.addEventListener('input', () => {
      trainerExerciseSearchTerm = String(trainerExerciseSearchInput.value || '').trim();
      renderTrainerManagementPanel();
    });
  }

  if (trainerExerciseWorkoutSelect) {
    const openWorkoutPickerFromPressEvent = (event) => {
      if (!shouldUseMobileSelectPicker(trainerExerciseWorkoutSelect)) return;
      if (event && event.cancelable) event.preventDefault();
      if (event) event.stopPropagation();
      openMobileSelectPicker(trainerExerciseWorkoutSelect);
    };

    trainerExerciseWorkoutSelect.addEventListener('mousedown', openWorkoutPickerFromPressEvent);
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      trainerExerciseWorkoutSelect.addEventListener('pointerdown', (event) => {
        openWorkoutPickerFromPressEvent(event);
      });
    }
    trainerExerciseWorkoutSelect.addEventListener(
      'touchstart',
      (event) => {
        openWorkoutPickerFromPressEvent(event);
      },
      { passive: false }
    );
    trainerExerciseWorkoutSelect.addEventListener('click', openWorkoutPickerFromPressEvent);
    trainerExerciseWorkoutSelect.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMobileSelectPicker(trainerExerciseWorkoutSelect);
      }
    });

    trainerExerciseWorkoutSelect.addEventListener('change', () => {
      const selectedWorkoutValue = String(trainerExerciseWorkoutSelect.value || '').trim();
      if (selectedWorkoutValue === TRAINER_WORKOUT_CREATE_OPTION_VALUE) {
        void createTrainerWorkoutFromExerciseField().finally(() => {
          renderTrainerManagementPanel();
        });
        return;
      }

      const selectedWorkoutId = Number(selectedWorkoutValue) || 0;
      trainerExerciseComposerSelectedId = selectedWorkoutId ? String(selectedWorkoutId) : '';
      trainerExerciseTargetWorkoutId = 0;
      isTrainerLinkedExercisesExpanded = false;
      renderTrainerManagementPanel();
    });
  }

  if (trainerWorkoutCoverFileInput) {
    trainerWorkoutCoverFileInput.addEventListener('change', () => {
      const selectedFile =
        trainerWorkoutCoverFileInput.files && trainerWorkoutCoverFileInput.files[0]
          ? trainerWorkoutCoverFileInput.files[0]
          : null;
      trainerWorkoutPendingCoverFile = selectedFile;
      updateTrainerWorkoutCoverPreview(selectedFile);
      setTrainerWorkoutCoverFeedback('', false);
      renderTrainerWorkoutCoverBuilder();
    });
  }

  ensureTrainerWorkoutModalCoverSection();
  if (trainerWorkoutModalCoverFileInput) {
    trainerWorkoutModalCoverFileInput.addEventListener('change', () => {
      const selectedFile =
        trainerWorkoutModalCoverFileInput.files && trainerWorkoutModalCoverFileInput.files[0]
          ? trainerWorkoutModalCoverFileInput.files[0]
          : null;
      trainerWorkoutModalPendingCoverFile = selectedFile;
      updateTrainerWorkoutModalCoverPreview(selectedFile);
      setTrainerWorkoutModalCoverFeedback('', false);
      renderTrainerWorkoutModalCoverSection();
    });
  }

  if (trainerExerciseWorkoutViewButton) {
    trainerExerciseWorkoutViewButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setTrainerExerciseFeedback('A visualização completa fica disponível depois que o treino for designado ao aluno.', false);
    });
  }

  if (trainerExerciseGroupSelect) {
    trainerExerciseGroupSelect.addEventListener('change', () => {
      syncTrainerExerciseGroupDrivenUi();
      renderTrainerManagementPanel();
      if (!trainerExerciseGroupSelect.multiple) {
        const selected = getSelectedLibraryExercise();
        if (selected) applyLibraryExerciseToExerciseForm(selected);
      }
    });
  }

  if (trainerExerciseLibrarySelect) {
    const openLibraryPickerFromPressEvent = (event) => {
      if (event && event.cancelable) event.preventDefault();
      if (event) event.stopPropagation();
      trainerExerciseLibrarySelectSuppressClickUntil = Date.now() + 520;
      openTrainerExerciseLibraryPicker({ focusSearch: true });
    };

    const openLibraryPickerFromSelectEvent = (event) => {
      if (event && event.cancelable) event.preventDefault();
      if (event) event.stopPropagation();
      if (Date.now() < trainerExerciseLibrarySelectSuppressClickUntil) return;
      openTrainerExerciseLibraryPicker({ focusSearch: true });
    };

    trainerExerciseLibrarySelect.addEventListener('mousedown', openLibraryPickerFromPressEvent);
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      trainerExerciseLibrarySelect.addEventListener('pointerdown', (event) => {
        openLibraryPickerFromPressEvent(event);
      });
    }
    trainerExerciseLibrarySelect.addEventListener(
      'touchstart',
      (event) => {
        openLibraryPickerFromPressEvent(event);
      },
      { passive: false }
    );
    trainerExerciseLibrarySelect.addEventListener('click', openLibraryPickerFromSelectEvent);
    trainerExerciseLibrarySelect.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTrainerExerciseLibraryPicker({ focusSearch: true });
      }
    });
    trainerExerciseLibrarySelect.addEventListener('change', () => {
      if (isTrainerManagerUser()) {
        isTrainerExerciseLibraryPickerOpen = true;
        renderTrainerExerciseLibraryPicker();
      }
      const selected = getSelectedLibraryExercise();
      if (!selected) return;
      applyLibraryExerciseToExerciseForm(selected);
    });
  }

  if (trainerExerciseLibraryPickerCloseButton) {
    trainerExerciseLibraryPickerCloseButton.addEventListener('click', () => {
      closeTrainerExerciseLibraryPicker();
    });
  }

  if (trainerExerciseLibraryPickerScrim) {
    trainerExerciseLibraryPickerScrim.addEventListener('click', () => {
      closeTrainerExerciseLibraryPicker();
    });
  }

  if (trainerExerciseLibraryPickerSearchInput) {
    trainerExerciseLibraryPickerSearchInput.addEventListener('input', () => {
      trainerExerciseLibraryPickerSearchTerm = String(
        trainerExerciseLibraryPickerSearchInput.value || ''
      ).trim();
      renderTrainerExerciseLibraryPicker();
    });
  }

  if (trainerExerciseLibraryPickerList) {
    trainerExerciseLibraryPickerList.addEventListener('click', (event) => {
      void handleTrainerExerciseLibraryPickerActions(event);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!isTrainerExerciseLibraryPickerOpen) return;
    closeTrainerExerciseLibraryPicker();
  });

  if (trainerExercisesFilterSelect) {
    trainerExercisesFilterSelect.addEventListener('change', () => {
      trainerExerciseTargetWorkoutId = Number(trainerExercisesFilterSelect.value) || 0;
      isTrainerLinkedExercisesExpanded = false;
      renderTrainerManagementPanel();
    });
  }

  if (trainerLinkedExercisesToggleButton) {
    trainerLinkedExercisesToggleButton.addEventListener('click', () => {
      isTrainerLinkedExercisesExpanded = !isTrainerLinkedExercisesExpanded;
      renderTrainerManagementPanel();
    });
  }

  if (trainerWorkoutsTableBody) {
    trainerWorkoutsTableBody.addEventListener('click', handleTrainerWorkoutsTableActions);
  }

  if (trainerExercisesTableBody) {
    trainerExercisesTableBody.addEventListener('click', handleTrainerWorkoutExercisesTableActions);
  }

  trainerWorkoutModalCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeTrainerWorkoutModal();
    });
  });

  trainerWorkoutExerciseModalCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeTrainerWorkoutExerciseModal();
    });
  });

  trainerExerciseVideoModalCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeTrainerExerciseVideoModal();
    });
  });

  siteConfirmCloseButtons.forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    button.addEventListener('click', () => {
      closeSiteConfirmModal({ result: false });
    });
  });
  if (siteConfirmCancelButton instanceof HTMLButtonElement) {
    siteConfirmCancelButton.addEventListener('click', () => {
      closeSiteConfirmModal({ result: false });
    });
  }
  if (siteConfirmConfirmButton instanceof HTMLButtonElement) {
    siteConfirmConfirmButton.addEventListener('click', () => {
      closeSiteConfirmModal({ result: true });
    });
  }
  trainerWorkoutQuickCreateCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeTrainerWorkoutQuickCreateModal({ value: '' });
    });
  });
  if (trainerWorkoutQuickCreateForm && trainerWorkoutQuickCreateNameInput) {
    trainerWorkoutQuickCreateForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const workoutName = String(trainerWorkoutQuickCreateNameInput.value || '').trim();
      if (!workoutName) {
        setTrainerWorkoutQuickCreateFeedback('Digite o nome do treino para continuar.', false);
        try {
          trainerWorkoutQuickCreateNameInput.focus({ preventScroll: true });
        } catch (_) {
          trainerWorkoutQuickCreateNameInput.focus();
        }
        return;
      }
      closeTrainerWorkoutQuickCreateModal({ keepFocus: false, value: workoutName });
    });
  }

  if (trainerWorkoutModalForm) {
    trainerWorkoutModalForm.addEventListener('submit', handleTrainerWorkoutModalSubmit);
  }

  if (trainerWorkoutModalMuscleGroupSelect) {
    trainerWorkoutModalMuscleGroupSelect.addEventListener('change', () => {
      renderTrainerWorkoutModalLibraryGuide();
    });
  }

  if (trainerWorkoutModalLibraryList) {
    trainerWorkoutModalLibraryList.addEventListener('click', (event) => {
      void handleTrainerWorkoutModalLibraryActions(event);
    });
  }

  if (trainerWorkoutExerciseModalForm) {
    trainerWorkoutExerciseModalForm.addEventListener('submit', handleTrainerWorkoutExerciseModalSubmit);
  }

  if (trainerTemplateEditorSelect) {
    trainerTemplateEditorSelect.addEventListener('change', () => {
      trainerTemplateEditorSelectedId = String(trainerTemplateEditorSelect.value || '').trim();
      if (trainerTemplateEditorSelectedId) {
        trainerTemplateExerciseSelectedId = trainerTemplateEditorSelectedId;
      }
      if (trainerTemplateExerciseTemplateSelect && trainerTemplateEditorSelectedId) {
        trainerTemplateExerciseTemplateSelect.value = trainerTemplateEditorSelectedId;
      }
      if (trainerTemplateExercisesFilterSelect && trainerTemplateEditorSelectedId) {
        trainerTemplateExercisesFilterSelect.value = trainerTemplateEditorSelectedId;
      }
      renderTrainerManagementPanel();
    });
  }

  if (trainerTemplateExerciseTemplateSelect) {
    trainerTemplateExerciseTemplateSelect.addEventListener('change', () => {
      trainerTemplateExerciseSelectedId = String(
        trainerTemplateExerciseTemplateSelect.value || ''
      ).trim();
      if (trainerTemplateExercisesFilterSelect && trainerTemplateExerciseSelectedId) {
        trainerTemplateExercisesFilterSelect.value = trainerTemplateExerciseSelectedId;
      }
      renderTrainerManagementPanel();
    });
  }

  if (trainerTemplateExercisesFilterSelect) {
    trainerTemplateExercisesFilterSelect.addEventListener('change', () => {
      trainerTemplateExerciseSelectedId = String(
        trainerTemplateExercisesFilterSelect.value || ''
      ).trim();
      if (trainerTemplateExerciseTemplateSelect && trainerTemplateExerciseSelectedId) {
        trainerTemplateExerciseTemplateSelect.value = trainerTemplateExerciseSelectedId;
      }
      renderTrainerManagementPanel();
    });
  }

  if (adminExercisesSearchInput) {
    adminExercisesSearchInput.addEventListener('input', (event) => {
      adminOverviewExercisesSearchTerm = String(event && event.target && event.target.value ? event.target.value : '');
      renderAdminOverviewPanel();
    });
  }

  if (adminWorkoutsSearchInput) {
    adminWorkoutsSearchInput.addEventListener('input', (event) => {
      adminOverviewWorkoutsSearchTerm = String(
        event && event.target && event.target.value ? event.target.value : ''
      );
      renderAdminOverviewPanel();
    });
  }

  if (adminWorkoutsTableBody) {
    adminWorkoutsTableBody.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const editButton = target.closest('[data-admin-workout-edit]');
      if (editButton && editButton instanceof HTMLButtonElement) {
        const workoutId = Number(editButton.dataset.workoutId || 0);
        if (!workoutId) return;

        editButton.disabled = true;
        setAdminOverviewFeedback('Carregando detalhes do treino...', false);

        try {
          await loadTrainerManagementData(true);
          const workout = getTrainerWorkoutById(workoutId);
          if (!workout) {
            throw new Error('Não foi possível carregar os detalhes completos do treino para edição.');
          }

          const opened = openTrainerWorkoutModal(workout, editButton, { readOnly: false });
          if (!opened) {
            throw new Error('Não foi possível abrir a edição do treino.');
          }

          setAdminOverviewFeedback('', false);
        } catch (error) {
          setAdminOverviewFeedback(
            error && error.message ? error.message : 'Falha ao abrir a edição do treino.',
            false
          );
        } finally {
          editButton.disabled = false;
        }
        return;
      }

      const deactivateButton = target.closest('[data-admin-workout-deactivate]');
      if (deactivateButton && deactivateButton instanceof HTMLButtonElement) {
        const workoutId = Number(deactivateButton.dataset.workoutId || 0);
        if (!workoutId) return;

        const workout = getAdminOverviewWorkoutById(workoutId) || getTrainerWorkoutById(workoutId);
        const workoutName = String(
          (workout && (workout.title || workout.name)) || `Treino #${workoutId}`
        ).trim();

        const confirmed = await requestSiteConfirm({
          title: 'Desativar treino',
          identification: workoutName,
          message: `Tem certeza que deseja desativar o treino "${workoutName}"?`,
          confirmLabel: 'Desativar',
          cancelLabel: 'Cancelar',
          triggerButton: deactivateButton
        });
        if (!confirmed) return;

        deactivateButton.disabled = true;
        setAdminOverviewFeedback('Desativando treino...', false);

        void requestInstructorWorkoutDeactivate(workoutId, { workout })
          .then(async (response) => {
            trainerExerciseTargetWorkoutId = workoutId;
            await loadTrainerManagementData(true);
            await loadTrainerProgressData(true);
            await syncWorkoutsFromBackend({ silent: true });
            await fetchAdminOverview(true);

            const refreshedWorkout = getAdminOverviewWorkoutById(workoutId);
            const deactivationConfirmed = refreshedWorkout ? refreshedWorkout.isActive === false : true;
            if (!deactivationConfirmed) {
              throw new Error('Não foi possível confirmar a desativação. Atualize os dados e tente novamente.');
            }

            const successMessage = (response && response.message) || 'Treino desativado com sucesso.';
            setAdminOverviewFeedback(successMessage, true);
            setTrainerManagementFeedback(successMessage, true);
          })
          .catch((error) => {
            const errorMessage = error && error.message
              ? error.message
              : 'Falha ao desativar treino.';
            setAdminOverviewFeedback(errorMessage, false);
            setTrainerManagementFeedback(errorMessage, false);
          })
          .finally(() => {
            deactivateButton.disabled = false;
          });
        return;
      }

      const deleteButton = target.closest('[data-admin-workout-delete]');
      if (!deleteButton || !(deleteButton instanceof HTMLButtonElement)) return;

      const workoutId = Number(deleteButton.dataset.workoutId || 0);
      if (!workoutId) return;

      const workout = getAdminOverviewWorkoutById(workoutId) || getTrainerWorkoutById(workoutId);
      const workoutName = String(
        (workout && (workout.title || workout.name)) || `Treino #${workoutId}`
      ).trim();

      const confirmed = await requestSiteConfirm({
        title: 'Excluir treino',
        identification: workoutName,
        message: `Tem certeza que deseja excluir o treino "${workoutName}"? Essa ação não pode ser desfeita.`,
        confirmLabel: 'Excluir treino',
        cancelLabel: 'Cancelar',
        triggerButton: deleteButton
      });
      if (!confirmed) return;

      deleteButton.disabled = true;
      setAdminOverviewFeedback('Excluindo treino...', false);

      void requestInstructorWorkoutDelete(workoutId)
        .then(async (response) => {
          const currentTargetWorkoutId = Number(trainerExerciseTargetWorkoutId) || 0;
          if (currentTargetWorkoutId === workoutId) {
            trainerExerciseTargetWorkoutId = 0;
          }
          await loadTrainerManagementData(true);
          await loadTrainerProgressData(true);
          await syncWorkoutsFromBackend({ silent: true });
          await fetchAdminOverview(true);

          const successMessage = (response && response.message) || 'Treino excluído com sucesso.';
          setAdminOverviewFeedback(successMessage, true);
          setTrainerManagementFeedback(successMessage, true);
        })
        .catch((error) => {
          const errorMessage = error && error.message
            ? error.message
            : 'Falha ao excluir treino.';
          setAdminOverviewFeedback(errorMessage, false);
          setTrainerManagementFeedback(errorMessage, false);
        })
        .finally(() => {
          deleteButton.disabled = false;
        });
    });
  }

  if (adminExercisesGroupFilter) {
    adminExercisesGroupFilter.addEventListener('change', (event) => {
      adminOverviewExercisesGroupFilterValue = String(
        event && event.target && event.target.value ? event.target.value : 'todos'
      )
        .trim()
        .toLowerCase() || 'todos';
      renderAdminOverviewPanel();
    });
  }

  if (adminExercisesTableBody) {
    adminExercisesTableBody.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const statusToggleButton = target.closest('[data-admin-exercise-status-toggle]');
      if (statusToggleButton && statusToggleButton instanceof HTMLButtonElement) {
        const exerciseId = Number(statusToggleButton.dataset.exerciseId || 0);
        if (!exerciseId) return;

        const nextActive = String(statusToggleButton.dataset.nextActive || '').trim().toLowerCase() === 'true';
        statusToggleButton.disabled = true;
        setAdminOverviewFeedback('Atualizando status do exercício...', false);

        void setAdminLibraryExerciseStatus(exerciseId, nextActive)
          .then(async (response) => {
            await fetchAdminOverview(true);
            await syncLibraryFromBackend({ silent: true });
            renderLibrary();
            setAdminOverviewFeedback(
              (response && response.message) || 'Status do exercício atualizado com sucesso.',
              true
            );
          })
          .catch((error) => {
            setAdminOverviewFeedback(
              error && error.message ? error.message : 'Falha ao atualizar status do exercício.',
              false
            );
          })
          .finally(() => {
            statusToggleButton.disabled = false;
          });
        return;
      }

      const deleteButton = target.closest('[data-admin-exercise-delete]');
      if (deleteButton && deleteButton instanceof HTMLButtonElement) {
        const exerciseId = Number(deleteButton.dataset.exerciseId || 0);
        if (!exerciseId) return;

        const exercise = getAdminOverviewExerciseById(exerciseId);
        if (!exercise) {
          setAdminOverviewFeedback('Exercício não encontrado para exclusão.', false);
          return;
        }
        if (exercise.isActive !== false) {
          setAdminOverviewFeedback('Somente exercícios inativos podem ser excluídos.', false);
          return;
        }

        const exerciseName = String(exercise.name || `EX-${exerciseId}`).trim();
        const confirmed = await requestSiteConfirm({
          title: 'Excluir exercício',
          identification: buildAdminExerciseIdentification(exerciseId),
          message: `Tem certeza que deseja excluir permanentemente o exercício "${exerciseName}"?`,
          confirmLabel: 'Excluir exercício',
          cancelLabel: 'Cancelar',
          triggerButton: deleteButton
        });
        if (!confirmed) return;

        deleteButton.disabled = true;
        setAdminOverviewFeedback('Excluindo exercício inativo...', false);

        void deleteAdminLibraryExercise(exerciseId)
          .then(async (response) => {
            if (Number(adminExerciseEditingId) === exerciseId) {
              closeAdminExerciseEditModal({ keepFocus: false, force: true });
            }
            await fetchAdminOverview(true);
            await syncLibraryFromBackend({ silent: true });
            renderLibrary();
            setAdminOverviewFeedback(
              (response && response.message) || 'Exercício excluído com sucesso.',
              true
            );
          })
          .catch((error) => {
            setAdminOverviewFeedback(
              error && error.message ? error.message : 'Falha ao excluir exercício inativo.',
              false
            );
          })
          .finally(() => {
            deleteButton.disabled = false;
          });
        return;
      }

      const viewButton = target.closest('[data-admin-exercise-view]');
      if (viewButton && viewButton instanceof HTMLButtonElement) {
        const exerciseId = Number(viewButton.dataset.exerciseId || 0);
        if (!exerciseId) return;

        const exercise = getAdminOverviewExerciseById(exerciseId);
        if (!exercise) {
          setAdminOverviewFeedback('Exercício não encontrado para visualização.', false);
          return;
        }
        const opened = openAdminExerciseEditModal(exercise, viewButton, { readOnly: true });
        if (!opened) {
          setAdminOverviewFeedback('Não foi possível abrir a visualização do exercício.', false);
        }
        return;
      }

      const editButton = target.closest('[data-admin-exercise-edit]');
      if (!editButton || !(editButton instanceof HTMLButtonElement)) return;

      const exerciseId = Number(editButton.dataset.exerciseId || 0);
      if (!exerciseId) return;

      const exercise = getAdminOverviewExerciseById(exerciseId);
      if (!exercise) {
        setAdminOverviewFeedback('Exercício não encontrado para edição.', false);
        return;
      }
      const opened = openAdminExerciseEditModal(exercise, editButton, { readOnly: false });
      if (!opened) {
        setAdminOverviewFeedback('Não foi possível abrir a tela de edição do exercício.', false);
      }
    });
  }

  adminExerciseModalCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeAdminExerciseEditModal();
    });
  });

  if (adminExerciseForm) {
    adminExerciseForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (adminExerciseModalReadOnly) {
        closeAdminExerciseEditModal();
        return;
      }
      if (
        !adminExerciseFieldName ||
        !adminExerciseFieldDescription ||
        !adminExerciseFieldGroup ||
        !adminExerciseFieldStatus ||
        !adminExerciseFieldSeries ||
        !adminExerciseFieldRepetitions ||
        !adminExerciseFieldDuration ||
        !adminExerciseFieldRest ||
        !adminExerciseFieldCalories
      ) {
        return;
      }

      const exerciseId = Number(adminExerciseEditingId) || 0;
      if (!exerciseId) {
        setAdminExerciseFormFeedback('Selecione um exercício para editar.', false);
        return;
      }

      const currentExercise = getAdminOverviewExerciseById(exerciseId);
      if (!currentExercise) {
        setAdminExerciseFormFeedback('Exercício não encontrado para edição.', false);
        return;
      }

      const nextName = String(adminExerciseFieldName.value || '').trim();
      if (!nextName) {
        setAdminExerciseFormFeedback('O nome do exercício é obrigatório.', false);
        adminExerciseFieldName.focus();
        return;
      }
      const nextDescription = String(adminExerciseFieldDescription.value || '').trim();
      if (!nextDescription) {
        setAdminExerciseFormFeedback('A descrição do exercício é obrigatória.', false);
        adminExerciseFieldDescription.focus();
        return;
      }

      const nextGroup = String(adminExerciseFieldGroup.value || '').trim().toLowerCase();
      if (!nextGroup) {
        setAdminExerciseFormFeedback('Selecione um grupo muscular válido.', false);
        adminExerciseFieldGroup.focus();
        return;
      }

      const imageFile = adminExerciseFieldImageFile && adminExerciseFieldImageFile.files
        ? adminExerciseFieldImageFile.files[0]
        : null;
      const videoFile = adminExerciseFieldVideoFile && adminExerciseFieldVideoFile.files
        ? adminExerciseFieldVideoFile.files[0]
        : null;

      const currentRepetitions = Math.max(1, Number(currentExercise.repetitions) || 10);
      const currentDurationSeconds = Math.max(10, Number(currentExercise.durationSeconds) || 60);
      const currentRestSeconds = Math.max(0, Number(currentExercise.restSeconds) || 30);
      const currentSeries = Math.max(
        1,
        Number(
          currentExercise &&
          (
            currentExercise.seriesCount !== undefined
              ? currentExercise.seriesCount
              : currentExercise.series !== undefined
                ? currentExercise.series
                : currentExercise.series_count
          )
        ) || 3
      );
      const currentCaloriesEstimate = Math.max(
        0,
        Number(
          currentExercise &&
            (
              currentExercise.caloriesEstimate !== undefined
                ? currentExercise.caloriesEstimate
                : currentExercise.calories_estimate !== undefined
                  ? currentExercise.calories_estimate
                  : currentExercise.calories
            )
        ) || estimateExerciseCalories({
          durationSeconds: currentDurationSeconds,
          repetitions: currentRepetitions,
          restSeconds: currentRestSeconds,
          loadKg: Number(currentExercise && currentExercise.loadKg) || 0
        })
      );
      const currentIsActive = currentExercise && currentExercise.isActive !== false;

      const nextRepetitions = Math.max(
        1,
        parseIntegerInputValue(adminExerciseFieldRepetitions.value, currentRepetitions)
      );
      const nextSeries = Math.max(
        1,
        parseIntegerInputValue(adminExerciseFieldSeries.value, currentSeries)
      );
      const nextDurationSeconds = Math.max(
        10,
        parseIntegerInputValue(adminExerciseFieldDuration.value, currentDurationSeconds)
      );
      const nextRestSeconds = Math.max(
        0,
        parseIntegerInputValue(adminExerciseFieldRest.value, currentRestSeconds)
      );
      const nextCaloriesEstimate = Math.max(
        0,
        parseIntegerInputValue(adminExerciseFieldCalories.value, currentCaloriesEstimate)
      );
      const nextIsActive = String(adminExerciseFieldStatus.value || 'ativo').trim().toLowerCase() !== 'inativo';
      const hasStatusChanged = nextIsActive !== currentIsActive;

      adminExerciseFieldSeries.value = String(nextSeries);
      adminExerciseFieldRepetitions.value = String(nextRepetitions);
      adminExerciseFieldDuration.value = String(nextDurationSeconds);
      adminExerciseFieldRest.value = String(nextRestSeconds);
      adminExerciseFieldCalories.value = String(nextCaloriesEstimate);

      if (adminExerciseSubmitButton) adminExerciseSubmitButton.disabled = true;
      setAdminExerciseFormFeedback('', false);
      setAdminOverviewFeedback('Atualizando exercício da biblioteca...', false);

      void (async () => {
        let nextImageUrl = String((currentExercise && currentExercise.imageUrl) || '').trim();
        let nextVideoUrl = String((currentExercise && currentExercise.videoUrl) || '').trim();

        if (imageFile) {
          setAdminExerciseFormFeedback('Enviando nova foto do exercício...', false);
          const uploadedImage = await uploadStudentMediaFile(imageFile);
          nextImageUrl = String((uploadedImage && uploadedImage.url) || '').trim();
        }

        if (videoFile) {
          setAdminExerciseFormFeedback('Enviando novo vídeo do exercício...', false);
          const uploadedVideo = await uploadStudentMediaFile(videoFile);
          nextVideoUrl = String((uploadedVideo && uploadedVideo.url) || '').trim();
        }

        const updatedExerciseResponse = await updateAdminLibraryExercise(exerciseId, {
          name: nextName,
          description: nextDescription,
          group: nextGroup,
          seriesCount: nextSeries,
          series: nextSeries,
          series_count: nextSeries,
          repetitions: nextRepetitions,
          durationSeconds: nextDurationSeconds,
          restSeconds: nextRestSeconds,
          caloriesEstimate: nextCaloriesEstimate,
          isActive: nextIsActive,
          is_active: nextIsActive,
          status: nextIsActive ? 'ATIVO' : 'INATIVO',
          imageUrl: nextImageUrl,
          videoUrl: nextVideoUrl
        });

        if (hasStatusChanged) {
          const statusResponse = await setAdminLibraryExerciseStatus(exerciseId, nextIsActive);
          return statusResponse && statusResponse.message
            ? { ...updatedExerciseResponse, message: statusResponse.message }
            : updatedExerciseResponse;
        }

        return updatedExerciseResponse;
      })()
        .then(async (response) => {
          setAdminOverviewFeedback(
            (response && response.message) || 'Exercício atualizado com sucesso.',
            true
          );
          closeAdminExerciseEditModal({ keepFocus: false, force: true });
          await fetchAdminOverview(true);
          await syncLibraryFromBackend({ silent: true });
          renderLibrary();
        })
        .catch((error) => {
          const errorMessage = error && error.message
            ? error.message
            : 'Falha ao atualizar exercício da biblioteca.';
          setAdminExerciseFormFeedback(errorMessage, false);
          setAdminOverviewFeedback(errorMessage, false);
        })
        .finally(() => {
          if (adminExerciseSubmitButton) adminExerciseSubmitButton.disabled = false;
        });
    });
  }

  adminUserDeleteModalCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeAdminUserDeleteModal();
    });
  });

  if (adminUserDeleteForm) {
    adminUserDeleteForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const userId = Number(adminUserDeleteTargetId) || 0;
      if (!userId || !adminUserDeletePasswordInput) {
        setAdminUserDeleteFeedback('Selecione um usuário válido para exclusão.', false);
        return;
      }

      const adminPassword = String(adminUserDeletePasswordInput.value || '').trim();
      if (!adminPassword) {
        setAdminUserDeleteFeedback('A senha do administrador geral é obrigatória para excluir.', false);
        adminUserDeletePasswordInput.focus({ preventScroll: true });
        return;
      }

      if (adminUserDeleteSubmitButton) adminUserDeleteSubmitButton.disabled = true;
      setAdminUserDeleteFeedback('Excluindo usuário desabilitado...', false);
      setAdminOverviewFeedback('Excluindo usuário desabilitado...', false);

      void deleteAdminDisabledUser(userId, adminPassword)
        .then(async (response) => {
          const successMessage = (response && response.message) || 'Usuário excluído com sucesso.';
          setAdminOverviewFeedback(successMessage, true);
          closeAdminUserDeleteModal({ keepFocus: false, force: true });
          await fetchAdminOverview(true);
        })
        .catch((error) => {
          const errorMessage = error && error.message ? error.message : 'Falha ao excluir usuário.';
          setAdminUserDeleteFeedback(errorMessage, false);
          setAdminOverviewFeedback(errorMessage, false);
        })
        .finally(() => {
          if (adminUserDeleteSubmitButton) adminUserDeleteSubmitButton.disabled = false;
        });
    });
  }

  if (adminUsersTableBody) {
    adminUsersTableBody.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const roleSelect = target.closest('[data-admin-user-role-select]');
      if (!roleSelect) return;
      if (!(roleSelect instanceof HTMLSelectElement)) return;

      const userId = Number(roleSelect.dataset.userId || 0);
      const previousRole = normalizeRole(roleSelect.dataset.currentRole || '');
      const nextRole = normalizeRole(roleSelect.value);
      if (!userId || !nextRole || nextRole === previousRole) return;

      roleSelect.disabled = true;
      setAdminOverviewFeedback('Atualizando função do usuário...', false);

      void updateAdminUserRole(userId, nextRole)
        .then(async (response) => {
          setAdminOverviewFeedback(
            (response && response.message) || 'Função atualizada com sucesso.',
            true
          );
          await fetchAdminOverview(true);
        })
        .catch((error) => {
          roleSelect.value = previousRole || 'ALUNO';
          setAdminOverviewFeedback(
            error && error.message ? error.message : 'Falha ao atualizar função do usuário.',
            false
          );
        })
        .finally(() => {
          roleSelect.disabled = false;
        });
    });

    adminUsersTableBody.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const deleteButton = target.closest('[data-admin-user-delete]');
      if (deleteButton) {
        if (!(deleteButton instanceof HTMLButtonElement)) return;
        const userId = Number(deleteButton.dataset.userId || 0);
        const userName = String(deleteButton.dataset.userName || 'este usuário').trim();
        if (!userId) return;
        const opened = openAdminUserDeleteModal(userId, userName, deleteButton);
        if (!opened) {
          setAdminOverviewFeedback('Não foi possível abrir a confirmação de exclusão.', false);
        }
        return;
      }

      const actionButton = target.closest('[data-admin-user-status-toggle]');
      if (!actionButton) return;
      if (!(actionButton instanceof HTMLButtonElement)) return;

      const userId = Number(actionButton.dataset.userId || 0);
      const nextEnabled = String(actionButton.dataset.nextEnabled || '').toLowerCase() === 'true';
      if (!userId) return;

      actionButton.disabled = true;
      setAdminOverviewFeedback('Atualizando status do aluno...', false);

      void updateAdminUserStatus(userId, nextEnabled)
        .then(async (response) => {
          setAdminOverviewFeedback(
            (response && response.message) || 'Status atualizado com sucesso.',
            true
          );
          await fetchAdminOverview(true);
        })
        .catch((error) => {
          setAdminOverviewFeedback(
            error && error.message ? error.message : 'Falha ao atualizar status do aluno.',
            false
          );
        })
        .finally(() => {
          actionButton.disabled = false;
        });
    });
  }

  if (adminSupportTableBody) {
    adminSupportTableBody.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const approveButton = target.closest('[data-admin-support-approve-reset]');
      if (approveButton && approveButton instanceof HTMLButtonElement) {
        const ticketId = Number(approveButton.dataset.ticketId || 0);
        if (!ticketId) return;

        void (async () => {
          const confirmed = await requestSiteConfirm({
            title: 'Liberar reset de senha',
            identification: `Ticket #${ticketId}`,
            message: 'Deseja liberar a redefinição de senha para este usuário agora?',
            confirmLabel: 'Liberar reset',
            cancelLabel: 'Cancelar',
            triggerButton: approveButton
          });
          if (!confirmed) return;

          approveButton.disabled = true;
          setAdminOverviewFeedback('Liberando redefinição de senha...', false);

          try {
            const response = await approveAdminSupportReset(ticketId);
            const expiresAt = formatAdminDate(response && response.resetTokenExpiresAt);
            const baseMessage = (response && response.message) || 'Reset liberado com sucesso.';
            const successMessage = expiresAt
              ? `${baseMessage} Válido até ${expiresAt}.`
              : baseMessage;
            setAdminOverviewFeedback(successMessage, true);
            await fetchAdminOverview(true);
          } catch (error) {
            setAdminOverviewFeedback(
              error && error.message ? error.message : 'Falha ao liberar reset de senha.',
              false
            );
          } finally {
            approveButton.disabled = false;
          }
        })();
        return;
      }

      const resolveButton = target.closest('[data-admin-support-resolve]');
      if (resolveButton && resolveButton instanceof HTMLButtonElement) {
        const ticketId = Number(resolveButton.dataset.ticketId || 0);
        if (!ticketId) return;

        void (async () => {
          const confirmed = await requestSiteConfirm({
            title: 'Marcar solicitação como resolvida',
            identification: `Ticket #${ticketId}`,
            message: 'Confirma que esta solicitação já foi atendida?',
            confirmLabel: 'Resolver',
            cancelLabel: 'Cancelar',
            triggerButton: resolveButton
          });
          if (!confirmed) return;

          resolveButton.disabled = true;
          setAdminOverviewFeedback('Atualizando solicitação...', false);
          try {
            const response = await updateAdminSupportTicketStatus(ticketId, 'RESOLVED');
            setAdminOverviewFeedback(
              (response && response.message) || 'Solicitação marcada como resolvida.',
              true
            );
            await fetchAdminOverview(true);
          } catch (error) {
            setAdminOverviewFeedback(
              error && error.message ? error.message : 'Falha ao resolver solicitação.',
              false
            );
          } finally {
            resolveButton.disabled = false;
          }
        })();
        return;
      }

      const rejectButton = target.closest('[data-admin-support-reject]');
      if (rejectButton && rejectButton instanceof HTMLButtonElement) {
        const ticketId = Number(rejectButton.dataset.ticketId || 0);
        if (!ticketId) return;

        void (async () => {
          const confirmed = await requestSiteConfirm({
            title: 'Rejeitar solicitação',
            identification: `Ticket #${ticketId}`,
            message: 'Deseja marcar esta solicitação como rejeitada?',
            confirmLabel: 'Rejeitar',
            cancelLabel: 'Cancelar',
            triggerButton: rejectButton
          });
          if (!confirmed) return;

          rejectButton.disabled = true;
          setAdminOverviewFeedback('Atualizando solicitação...', false);
          try {
            const response = await updateAdminSupportTicketStatus(ticketId, 'REJECTED');
            setAdminOverviewFeedback(
              (response && response.message) || 'Solicitação rejeitada.',
              true
            );
            await fetchAdminOverview(true);
          } catch (error) {
            setAdminOverviewFeedback(
              error && error.message ? error.message : 'Falha ao rejeitar solicitação.',
              false
            );
          } finally {
            rejectButton.disabled = false;
          }
        })();
        return;
      }

      const archiveButton = target.closest('[data-admin-support-archive]');
      if (archiveButton && archiveButton instanceof HTMLButtonElement) {
        const ticketId = Number(archiveButton.dataset.ticketId || 0);
        if (!ticketId) return;

        void (async () => {
          const confirmed = await requestSiteConfirm({
            title: 'Arquivar solicitação',
            identification: `Ticket #${ticketId}`,
            message: 'Deseja arquivar esta solicitação? Ela ficará na aba de arquivados.',
            confirmLabel: 'Arquivar',
            cancelLabel: 'Cancelar',
            triggerButton: archiveButton
          });
          if (!confirmed) return;

          archiveButton.disabled = true;
          setAdminOverviewFeedback('Arquivando solicitação...', false);
          try {
            const response = await archiveAdminSupportTicket(ticketId);
            setAdminOverviewFeedback(
              (response && response.message) || 'Solicitação arquivada com sucesso.',
              true
            );
            await fetchAdminOverview(true);
          } catch (error) {
            setAdminOverviewFeedback(
              error && error.message ? error.message : 'Falha ao arquivar solicitação.',
              false
            );
          } finally {
            archiveButton.disabled = false;
          }
        })();
      }
    });
  }

  if (openWorkoutsButton) {
    openWorkoutsButton.addEventListener('click', () => {
      const visibleWorkouts = getVisibleStudentWorkouts();
      const current = visibleWorkouts.find((workout) => !workout.done) || visibleWorkouts[0];
      if (!current) {
        setStudentAppTab('treinos');
        return;
      }
      selectedWorkoutId = current ? current.id : null;
      renderActiveWorkout();
      setStudentDirectPanel('treino-ativo', 'treinos');
    });
  }

  if (openWorkoutsListButton) {
    openWorkoutsListButton.addEventListener('click', () => setStudentAppTab('treinos'));
  }

  if (workoutsStartButton) {
    workoutsStartButton.addEventListener('click', () => {
      const visibleWorkouts = getVisibleStudentWorkouts();
      const workout = visibleWorkouts.find((item) => item.id === selectedWorkoutId) || visibleWorkouts[0];
      if (!workout) {
        setStudentAppTab('treinos');
        return;
      }
      selectedWorkoutId = workout.id;
      renderActiveWorkout();
      setStudentDirectPanel('treino-ativo', 'treinos');
    });
  }

  if (workoutsBackButton) {
    workoutsBackButton.addEventListener('click', () => setStudentAppTab('dashboard', true));
  }

  if (libraryBackButton) {
    libraryBackButton.addEventListener('click', () => {
      const targetTab = getDefaultMainTabForCurrentRole();
      setStudentAppTab(targetTab, true);
    });
  }

  if (librarySearchInput) {
    librarySearchInput.addEventListener('input', (event) => {
      librarySearchTerm = event.target.value || '';
      renderLibrary();
    });
  }

  const activeLibraryButton = Array.from(libraryFilterButtons).find((button) => button.classList.contains('is-active'));
  if (activeLibraryButton) {
    activeLibraryFilter = activeLibraryButton.dataset.studentLibraryFilter || 'todos';
  }

  libraryFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeLibraryFilter = button.dataset.studentLibraryFilter || 'todos';
      libraryFilterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      renderLibrary();
    });
  });

  if (profileSettings) {
    profileSettings.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const actionButton = target.closest('[data-profile-setting-action]');
      if (!actionButton) return;
      openProfileActionModal(actionButton.dataset.profileSettingAction || '');
    });
  }
  if (profileAvatarEditButton) {
    profileAvatarEditButton.addEventListener('click', () => {
      if (!profileAvatarInput) return;
      profileAvatarInput.click();
    });
  }
  if (profileAvatarInput) {
    profileAvatarInput.addEventListener('change', (event) => {
      const target = event && event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const selectedFile = target.files && target.files[0] ? target.files[0] : null;
      if (!selectedFile) {
        target.value = '';
        return;
      }
      void handleProfileAvatarFileSelection(selectedFile);
    });
  }
  if (profileAvatarImage) {
    profileAvatarImage.addEventListener('load', () => {
      if (profileAvatar) profileAvatar.classList.add('has-image');
      if (profileAvatar) profileAvatar.classList.remove('is-fallback-visible');
      if (profileAvatarFallbackIcon) profileAvatarFallbackIcon.hidden = true;
      profileAvatarImage.hidden = false;
    });
    profileAvatarImage.addEventListener('error', () => {
      profileAvatarImage.hidden = true;
      profileAvatarImage.removeAttribute('src');
      profileAvatarImage.dataset.expectedSrc = '';
      if (profileAvatar) profileAvatar.classList.remove('has-image');
      if (profileAvatar) profileAvatar.classList.add('is-fallback-visible');
      if (profileAvatarFallbackIcon) profileAvatarFallbackIcon.hidden = false;
    });
  }
  profileActionCloseButtons.forEach((button) => {
    button.addEventListener('click', () => closeProfileActionModal());
  });
  if (profileActionPrimary) {
    profileActionPrimary.addEventListener('click', () => runProfilePrimaryAction());
  }
  if (profileSupportForm) {
    profileSupportForm.addEventListener('submit', (event) => {
      void handleProfileSupportSubmit(event);
    });
  }
  if (profileSupportRefresh) {
    profileSupportRefresh.addEventListener('click', () => {
      setProfileSupportFeedback('', false);
      void fetchProfileSupportTickets(true);
    });
  }
  if (profileSupportType) {
    profileSupportType.addEventListener('change', () => {
      if (!profileSupportSubject || profileSupportSubject.value.trim()) return;
      profileSupportSubject.value = buildSupportDefaultSubject(profileSupportType.value);
    });
  }

  if (progressHistoryOpen) {
    progressHistoryOpen.addEventListener('click', () => openProgressHistorySheet());
  }
  if (progressHistoryClose) {
    progressHistoryClose.addEventListener('click', () => closeProgressHistorySheet());
  }
  if (progressHistoryPrevMonth) {
    progressHistoryPrevMonth.addEventListener('click', () => {
      progressHistoryMonthCursor = new Date(progressHistoryMonthCursor.getFullYear(), progressHistoryMonthCursor.getMonth() - 1, 1);
      renderProgressHistorySheet();
    });
  }
  if (progressHistoryNextMonth) {
    progressHistoryNextMonth.addEventListener('click', () => {
      progressHistoryMonthCursor = new Date(progressHistoryMonthCursor.getFullYear(), progressHistoryMonthCursor.getMonth() + 1, 1);
      renderProgressHistorySheet();
    });
  }

  if (progressWeightOpen) {
    progressWeightOpen.addEventListener('click', () => openWeightModal());
  }
  progressWeightCloseButtons.forEach((button) => {
    button.addEventListener('click', () => closeWeightModal());
  });
  if (progressWeightSave) {
    progressWeightSave.addEventListener('click', () => saveWeightFromModal());
  }

  if (progressBmiOpen) {
    progressBmiOpen.addEventListener('click', () => openBmiModal());
  }
  progressBmiCloseButtons.forEach((button) => {
    button.addEventListener('click', () => closeBmiModal());
  });
  if (progressBmiSave) {
    progressBmiSave.addEventListener('click', () => saveBmiFromModal());
  }
  progressBmiWeightUnitButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const unit = button.dataset.progressBmiWeightUnit;
      if (unit !== 'kg') return;
      progressBmiWeightUnit = unit;
      updateBmiWeightLive();
    });
  });
  progressBmiHeightUnitButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const unit = button.dataset.progressBmiHeightUnit;
      if (unit !== 'cm') return;
      progressBmiHeightUnit = unit;
      updateBmiHeightLive();
    });
  });

  window.addEventListener('resize', () => {
    if (progressWeightModal && !progressWeightModal.hidden) {
      setWeightRulerPadding();
      scrollWeightRulerToKg(progressWeightDraftKg, 'auto');
    }
    if (progressBmiModal && !progressBmiModal.hidden) {
      setBmiRulerPadding(progressBmiWeightRuler);
      setBmiRulerPadding(progressBmiHeightRuler);
      scrollBmiWeightRulerToKg(progressBmiDraftWeightKg, 'auto');
      scrollBmiHeightRulerToCm(progressBmiDraftHeightCm, 'auto');
    }
  });

  if (studentLogoutButton) {
    studentLogoutButton.addEventListener('click', () => {
      stopSessionHeartbeat();
      stopStudentWorkoutsRefresh();
      resetAuthIdentityToDefault({
        clearStoredToken: true,
        clearStoredProfile: !loadRememberPreference(),
      });
      resetAdminOverviewState();
      resetTrainerManagementState();
      resetTrainerProgressState();
      setOverlayView('login');
      clearStudentAreaState();
      applyRememberedLoginDefaults();
    });
  }
  if (studentThemeToggle) {
    studentThemeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      applyTheme(isDark ? 'light' : 'dark', true);
    });
  }
  if (workoutCompleteButton) workoutCompleteButton.addEventListener('click', handleCompleteWorkout);
  if (activeWorkoutFinishButton) activeWorkoutFinishButton.addEventListener('click', handleFinishActiveWorkout);
  if (activeWorkoutBackButton) activeWorkoutBackButton.addEventListener('click', () => setStudentAppTab('dashboard', true));
  if (prepBackButton) prepBackButton.addEventListener('click', () => setStudentDirectPanel('treino-ativo', 'treinos'));
  if (prepNextButton) prepNextButton.addEventListener('click', finishPrepAndOpenExercise);
  if (runBackButton) runBackButton.addEventListener('click', () => setStudentDirectPanel('treino-ativo', 'treinos'));
  if (runHelpToggle) {
    runHelpToggle.addEventListener('click', () => {
      setRunHelpModalOpen(true);
    });
  }
  if (runHelpCloseButtons.length) {
    runHelpCloseButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setRunHelpModalOpen(false);
      });
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && runHelpModal && !runHelpModal.hidden) {
      setRunHelpModalOpen(false);
    }
  });
  if (runPauseButton) {
    runPauseButton.addEventListener('click', () => {
      if (runSecondsLeft <= 0) return;
      runTimerPaused = !runTimerPaused;
      renderRunWorkoutView();
    });
  }
  if (runPrevButton) {
    runPrevButton.addEventListener('click', () => {
      goToRunExercise(runExerciseIndex - 1, { resetTime: true, seriesIndex: 0 });
    });
  }
  if (runNextButton) {
    runNextButton.addEventListener('click', () => {
      advanceRunAfterCurrentSeries();
    });
  }
  if (runEquipmentBusyCheckbox) {
    runEquipmentBusyCheckbox.addEventListener('change', async () => {
      if (!runEquipmentBusyCheckbox.checked) return;
      runEquipmentBusyCheckbox.disabled = true;
      try {
        const confirmed = await confirmRunExerciseSkipBecauseEquipmentIsBusy();
        if (!confirmed) return;
        deferCurrentRunExerciseBecauseEquipmentIsBusy();
      } finally {
        runEquipmentBusyCheckbox.disabled = false;
      }
    });
  }
  if (restAddTimeButton) {
    restAddTimeButton.addEventListener('click', () => {
      if (restNextExerciseIndex < 0) return;
      restSecondsLeft = Math.min(600, Math.max(0, Number(restSecondsLeft) || 0) + 20);
      renderRestWorkoutView();
    });
  }
  if (restSkipButton) {
    restSkipButton.addEventListener('click', () => {
      if (restNextExerciseIndex < 0) return;
      skipRestToNextExercise();
    });
  }
  if (exerciseDetailBack) exerciseDetailBack.addEventListener('click', closeExerciseDetailView);
  if (exerciseDetailClose) exerciseDetailClose.addEventListener('click', closeExerciseDetailView);
  exerciseDetailTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setExerciseDetailTab(button.dataset.studentExerciseDetailTab);
    });
  });
  if (exerciseDetailPrev) {
    exerciseDetailPrev.addEventListener('click', () => {
      activeExerciseDetailIndex = Math.max(0, activeExerciseDetailIndex - 1);
      const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
      if (workout && workout.exercises && workout.exercises[activeExerciseDetailIndex]) {
        activeExerciseDetailSeconds = getExerciseDetailConfig(workout.exercises[activeExerciseDetailIndex]).duration;
      }
      renderExerciseDetailView();
    });
  }
  if (exerciseDetailNext) {
    exerciseDetailNext.addEventListener('click', () => {
      const workout = studentData.workouts.find((w) => w.id === selectedWorkoutId) || studentData.workouts[0];
      if (!workout) return;
      activeExerciseDetailIndex = Math.min(workout.exercises.length - 1, activeExerciseDetailIndex + 1);
      if (workout.exercises && workout.exercises[activeExerciseDetailIndex]) {
        activeExerciseDetailSeconds = getExerciseDetailConfig(workout.exercises[activeExerciseDetailIndex]).duration;
      }
      renderExerciseDetailView();
    });
  }
  if (exerciseDurationMinus) {
    exerciseDurationMinus.addEventListener('click', () => {
      activeExerciseDetailSeconds = Math.max(10, activeExerciseDetailSeconds - 5);
      renderExerciseDetailView();
    });
  }
  if (exerciseDurationPlus) {
    exerciseDurationPlus.addEventListener('click', () => {
      activeExerciseDetailSeconds = Math.min(180, activeExerciseDetailSeconds + 5);
      renderExerciseDetailView();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (siteConfirmModal && !siteConfirmModal.hidden) {
      closeSiteConfirmModal({ result: false });
      return;
    }
    if (trainerWorkoutQuickCreateModal && !trainerWorkoutQuickCreateModal.hidden) {
      closeTrainerWorkoutQuickCreateModal({ value: '' });
      return;
    }
    if (adminUserDeleteModal && !adminUserDeleteModal.hidden) {
      closeAdminUserDeleteModal();
      return;
    }
    if (trainerExerciseVideoModal && !trainerExerciseVideoModal.hidden) {
      closeTrainerExerciseVideoModal();
      return;
    }
    if (trainerWorkoutExerciseModal && !trainerWorkoutExerciseModal.hidden) {
      closeTrainerWorkoutExerciseModal();
      return;
    }
    if (trainerWorkoutModal && !trainerWorkoutModal.hidden) {
      closeTrainerWorkoutModal();
      return;
    }
    if (adminExerciseModal && !adminExerciseModal.hidden) {
      closeAdminExerciseEditModal();
      return;
    }
    if (profileActionModal && !profileActionModal.hidden) {
      closeProfileActionModal();
      return;
    }
    if (progressBmiModal && !progressBmiModal.hidden) {
      closeBmiModal();
      return;
    }
    if (progressWeightModal && !progressWeightModal.hidden) {
      closeWeightModal();
      return;
    }
    if (progressHistorySheet && !progressHistorySheet.hidden) {
      closeProgressHistorySheet();
      return;
    }
    const runPanel = document.querySelector('[data-student-app-panel="treino-execucao"]');
    if (runPanel && runPanel.classList.contains('is-active')) {
      setStudentDirectPanel('treino-ativo', 'treinos');
      return;
    }
    const prepPanel = document.querySelector('[data-student-app-panel="pre-treino"]');
    if (prepPanel && prepPanel.classList.contains('is-active')) {
      setStudentDirectPanel('treino-ativo', 'treinos');
      return;
    }
    const restPanel = document.querySelector('[data-student-app-panel="treino-descanso"]');
    if (restPanel && restPanel.classList.contains('is-active')) {
      setStudentDirectPanel('treino-ativo', 'treinos');
      return;
    }
    const detailPanel = document.querySelector('[data-student-app-panel="exercicio-detalhe"]');
    if (detailPanel && detailPanel.classList.contains('is-active')) {
      closeExerciseDetailView();
      return;
    }
    if (exerciseModal && !exerciseModal.hidden) {
      closeExerciseModal();
      return;
    }
    if (studentArea && !studentArea.hidden) closeStudentArea();
  });

  selectedWorkoutId = studentData.workouts[0] ? studentData.workouts[0].id : null;
  setAuthView('login');
  const bootTab = getDefaultMainTabForCurrentRole();
  setStudentAppTab(bootTab, true);
  renderStudentApp();

  const storedAreaState = loadStudentAreaState();
  const shouldRestoreOpenState = Boolean(storedAreaState && storedAreaState.isOpen);

  if (shouldRestoreOpenState && studentArea) {
    studentArea.hidden = false;
    studentArea.setAttribute('aria-hidden', 'false');
    studentArea.classList.add('is-open');
    document.body.classList.add('student-area-open');
    document.documentElement.classList.add('student-area-open');
    clearStudentTimer();
    studentInLoginStage = true;
    setOverlayView('loading');

    const preferredTab = String((storedAreaState && storedAreaState.tab) || '').trim();
    const preferredPanel = String((storedAreaState && storedAreaState.panel) || '').trim();

    void (async () => {
      const autoLogged = await tryAutoLoginFromStoredSession({
        preserveActiveView: true,
        preferredTab,
        preferredPanel
      });
      if (!autoLogged) {
        setOverlayView('login');
      }
    })();
  } else {
    if (studentArea) {
      studentArea.hidden = true;
      studentArea.setAttribute('aria-hidden', 'true');
      studentArea.classList.remove('is-open');
    }
    document.body.classList.remove('student-area-open');
    document.documentElement.classList.remove('student-area-open');
    if (!storedAreaState) {
      saveStudentAreaState({ isOpen: false, overlay: 'closed', tab: 'dashboard', panel: 'dashboard' });
    }
  }
};

const UI_MOJIBAKE_REPLACEMENTS = [
  ['Gest\uFFFDo', 'Gestão'],
  ['Informa\uFFFD\uFFFDes', 'Informações'],
  ['Relat\uFFFDrio', 'Relatório'],
  ['Relat\uFFFDrios', 'Relatórios'],
  ['Checagem di\uFFFDria', 'Checagem diária'],
  ['Sequ\uFFFDncia', 'Sequência'],
  ['descri\uFFFD\uFFFDo', 'descrição'],
  ['Descri\uFFFD\uFFFDo', 'Descrição'],
  ['repeti\uFFFD\uFFFDes', 'repetições'],
  ['Repeti\uFFFD\uFFFDes', 'Repetições'],
  ['b\uFFFDsico', 'básico'],
  ['b\uFFFDsicos', 'básicos'],
  ['respons\uFFFDvel', 'responsável'],
  ['Defini\uFFFD\uFFFDo', 'Definição'],
  ['defini\uFFFD\uFFFDo', 'definição'],
  ['Obrigat\uFFFDrio', 'Obrigatório'],
  ['obrigat\uFFFDrio', 'obrigatório'],
  ['exerc\uFFFDcio', 'exercício'],
  ['Exerc\uFFFDcio', 'Exercício'],
  ['exerc\uFFFDcios', 'exercícios'],
  ['Exerc\uFFFDcios', 'Exercícios'],
  ['conclu\uFFFDdo', 'concluído'],
  ['dispon\uFFFDvel', 'disponível'],
  ['n\uFFFDo', 'não'],
  ['N\uFFFDo', 'Não'],
  ['j\uFFFD', 'já'],
  ['M\uFFFDs', 'Mês'],
  ['Pr\uFFFDximo', 'Próximo'],
  ['Navega\uFFFD\uFFFDo', 'Navegação'],
  ['In\uFFFDcio', 'Início'],
  ['Localiza\uFFFD\uFFFDo', 'Localização'],
  ['Ã¡', 'á'],
  ['Ã¢', 'â'],
  ['Ã£', 'ã'],
  ['Ã©', 'é'],
  ['Ãª', 'ê'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ã´', 'ô'],
  ['Ãµ', 'õ'],
  ['Ãº', 'ú'],
  ['Ã§', 'ç'],
  ['Ã\uFFFD', 'Á'],
  ['Ã‚', 'Â'],
  ['Ãƒ', 'Ã'],
  ['Ã‰', 'É'],
  ['ÃŠ', 'Ê'],
  ['Ã“', 'Ó'],
  ['Ã”', 'Ô'],
  ['Ãš', 'Ú'],
  ['Ã‡', 'Ç'],
  ['â€¢', '•'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€¦', '…'],
  ['Âº', 'º'],
  ['Âª', 'ª']
];

let uiTextRepairObserver = null;
let uiTextRepairQueued = false;
let uiTextRepairRunning = false;

const normalizeMojibakeText = (value) => {
  if (value === null || value === undefined) return value;
  let next = String(value);
  if (!next || !/[\uFFFD\u00C2\u00C3\u00E2]/.test(next)) return next;
  UI_MOJIBAKE_REPLACEMENTS.forEach(([from, to]) => {
    if (!next.includes(from)) return;
    next = next.split(from).join(to);
  });
  return next;
};

const normalizeMojibakeInDom = (root = document.body) => {
  if (!root || uiTextRepairRunning) return;
  uiTextRepairRunning = true;
  try {
    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = textWalker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
        const originalText = String(textNode.nodeValue || '');
        const normalizedText = normalizeMojibakeText(originalText);
        if (normalizedText !== originalText) {
          textNode.nodeValue = normalizedText;
        }
      }
      textNode = textWalker.nextNode();
    }

    const attrTargets = root.querySelectorAll('[placeholder], [title], [aria-label], option');
    attrTargets.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.hasAttribute('placeholder')) {
        const original = node.getAttribute('placeholder') || '';
        const normalized = normalizeMojibakeText(original);
        if (normalized !== original) node.setAttribute('placeholder', normalized);
      }
      if (node.hasAttribute('title')) {
        const original = node.getAttribute('title') || '';
        const normalized = normalizeMojibakeText(original);
        if (normalized !== original) node.setAttribute('title', normalized);
      }
      if (node.hasAttribute('aria-label')) {
        const original = node.getAttribute('aria-label') || '';
        const normalized = normalizeMojibakeText(original);
        if (normalized !== original) node.setAttribute('aria-label', normalized);
      }
      if (node instanceof HTMLOptionElement) {
        const original = String(node.textContent || '');
        const normalized = normalizeMojibakeText(original);
        if (normalized !== original) node.textContent = normalized;
      }
    });
  } finally {
    uiTextRepairRunning = false;
  }
};

const scheduleMojibakeDomRepair = () => {
  if (uiTextRepairQueued) return;
  uiTextRepairQueued = true;
  window.requestAnimationFrame(() => {
    uiTextRepairQueued = false;
    normalizeMojibakeInDom(document.body);
  });
};

const initMojibakeDomRepair = () => {
  scheduleMojibakeDomRepair();
  if (uiTextRepairObserver || typeof MutationObserver === 'undefined' || !document.body) return;
  uiTextRepairObserver = new MutationObserver(() => {
    scheduleMojibakeDomRepair();
  });
  uiTextRepairObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label']
  });
};

/* ==========================================================================
   Bootstrap
   ========================================================================== */
const initApp = () => {
  document.body.classList.add('js-ready');
  initMobileMenu();
  initRevealAnimations();
  initGymStatus();
  initThemeToggle();
  initContactLeadForm();
  void syncSiteTeamMembersFromApi({ silent: true, syncAdminForm: false });
  initStudentArea();
  initMojibakeDomRepair();
  hydrateLoopCheckIcons();
};

initApp();

window.addEventListener('load', () => {
  activateVisibleAdminCharts(false);
});











/* Group guide flow for library */
(() => {
  const guideSheet = document.querySelector('[data-group-guide-sheet]');
  const guideBack = document.querySelector('[data-group-guide-back]');
  const guideTitle = document.querySelector('[data-group-guide-title]');
  const guideSubtitle = document.querySelector('[data-group-guide-subtitle]');
  const guideSearch = document.querySelector('[data-group-guide-search]');
  const guideGrid = document.querySelector('[data-group-guide-grid]');

  const detailSheet = document.querySelector('[data-group-detail-sheet]');
  const detailBack = document.querySelector('[data-group-detail-back]');
  const detailTitle = document.querySelector('[data-group-detail-title]');
  const detailSubtitle = document.querySelector('[data-group-detail-subtitle]');
  const detailMuscle = document.querySelector('[data-group-detail-muscle]');
  const detailVideo = document.querySelector('[data-group-detail-video]');
  const detailVideoFile = document.querySelector('[data-group-detail-video-file]');
  const detailImage = document.querySelector('[data-group-detail-image]');
  const detailNoVideo = document.querySelector('[data-group-detail-no-video]');
  const detailDescription = document.querySelector('[data-group-detail-description]');
  const detailTabButtons = Array.from(document.querySelectorAll('[data-group-detail-tab]'));
  const detailPanels = Array.from(document.querySelectorAll('[data-group-detail-panel]'));
  const detailDurationLabel = document.querySelector('[data-group-detail-duration]');
  const detailDurationMinusButton = document.querySelector('[data-group-detail-duration-minus]');
  const detailDurationPlusButton = document.querySelector('[data-group-detail-duration-plus]');
  const detailPlayButton = document.querySelector('[data-group-detail-play]');
  const detailMusclesList = document.querySelector('[data-group-detail-muscles-list]');
  const detailIntensityBars = document.querySelector('[data-group-detail-intensity-bars]');
  const detailIntensityLabel = document.querySelector('[data-group-detail-intensity-label]');
  const detailSteps = document.querySelector('[data-group-detail-steps]');
  const detailTipsList = document.querySelector('[data-group-detail-tips-list]');

  if (!guideSheet || !guideGrid || !detailSheet) return;

  let guideGroup = 'todos';
  let guideSearchTerm = '';
  let activeDetailTab = 'musculos';
  let activeDetailItem = null;
  let activeDetailDurationSeconds = 20;
  const detailTitleDefaultFontSize = detailTitle
    ? parseFloat(window.getComputedStyle(detailTitle).fontSize) || 21
    : 21;

  const escapeText = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatExerciseCountLabel = (count) => {
    const safeCount = Math.max(0, Number(count) || 0);
    return `${safeCount} ${safeCount === 1 ? 'exercício' : 'exercícios'} disponíveis`;
  };

  const buildMediaCandidateUrls = (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!value) return [];
    if (/^(data:|blob:)/i.test(value)) return [value];

    const resolved = resolveApiMediaUrl(value);
    const unique = new Set([resolved]);

    let normalizedPath = '';
    if (value.startsWith('/')) {
      normalizedPath = value;
    } else if (value.toLowerCase().startsWith('uploads/')) {
      normalizedPath = `/${value}`;
    } else if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        const candidatePath = String(parsed.pathname || '').trim();
        if (candidatePath.startsWith('/uploads/')) {
          normalizedPath = candidatePath;
        }
      } catch (_) {}
    }

    if (normalizedPath.startsWith('/uploads/')) {
      [
        getApiHostFromBase(activeStudentApiBaseUrl),
        getActiveStudentApiHostUrl(),
        'http://127.0.0.1:3000',
        'http://localhost:3000'
      ]
        .map((host) => String(host || '').trim())
        .filter(Boolean)
        .forEach((host) => unique.add(`${host}${normalizedPath}`));
    }

    return Array.from(unique).filter(Boolean);
  };

  const setGuideSubtitle = (count) => {
    if (!guideSubtitle) return;
    guideSubtitle.textContent = formatExerciseCountLabel(count);
  };

  const setDetailTab = (tabId = 'musculos') => {
    activeDetailTab = tabId;
    detailTabButtons.forEach((button) => {
      const isActive = String(button.dataset.groupDetailTab || '') === tabId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    detailPanels.forEach((panel) => {
      const isActive = String(panel.dataset.groupDetailPanel || '') === tabId;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  };

  const fitDetailTitleSingleLine = () => {
    if (!detailTitle || detailSheet.hidden) return;
    const titleWidth = Math.max(0, detailTitle.clientWidth);
    if (!titleWidth) return;

    const minFontSize = 14;
    let nextFontSize = detailTitleDefaultFontSize;
    detailTitle.style.fontSize = `${nextFontSize}px`;

    while (nextFontSize > minFontSize && detailTitle.scrollWidth > detailTitle.clientWidth) {
      nextFontSize -= 0.5;
      detailTitle.style.fontSize = `${nextFontSize}px`;
    }
  };

  const renderIntensityBars = (score) => {
    if (!detailIntensityBars) return;
    const safeScore = Math.max(1, Math.min(5, Number(score) || 1));
    detailIntensityBars.innerHTML = Array.from({ length: 5 })
      .map((_, index) => `<span class="${index < safeScore ? 'is-active' : ''}"></span>`)
      .join('');
  };

  const playDetailVideoFile = ({ reset = false } = {}) => {
    if (!detailVideoFile || detailSheet.hidden) return;
    if (!detailVideoFile.classList.contains('is-visible') || !detailVideoFile.src) return;

    detailVideoFile.muted = true;
    detailVideoFile.defaultMuted = true;
    detailVideoFile.autoplay = true;
    detailVideoFile.loop = true;
    detailVideoFile.playsInline = true;
    detailVideoFile.controls = false;
    detailVideoFile.setAttribute('autoplay', '');
    detailVideoFile.setAttribute('muted', '');
    detailVideoFile.setAttribute('loop', '');
    detailVideoFile.setAttribute('playsinline', '');
    detailVideoFile.setAttribute('preload', 'auto');
    detailVideoFile.removeAttribute('controls');

    if (reset) {
      try {
        detailVideoFile.currentTime = 0;
      } catch (_) {}
    }

    const attempt = detailVideoFile.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {});
    }
  };

  const closeDetail = () => {
    detailSheet.hidden = true;
    activeDetailItem = null;
    activeDetailDurationSeconds = 20;
    if (detailTitle) detailTitle.style.fontSize = '';
    if (detailVideo) detailVideo.src = '';
    if (detailVideoFile) {
      detailVideoFile.pause();
      detailVideoFile.removeAttribute('src');
      detailVideoFile.src = '';
      detailVideoFile.classList.remove('is-visible');
    }
    if (detailImage) {
      detailImage.src = '';
      detailImage.classList.remove('is-visible');
    }
    if (detailVideo) detailVideo.classList.remove('is-visible');
    if (detailDurationLabel) detailDurationLabel.textContent = formatDurationClock(activeDetailDurationSeconds);
    setDetailTab('musculos');
  };

  const closeGuide = () => {
    closeGroupLibrarySheets();
    closeDetail();
  };

  const getGuideItems = () => {
    const term = normalizeText(guideSearchTerm || '');
    return studentData.library.filter((item) => {
      if (guideGroup !== 'todos' && item.group !== guideGroup) return false;
      if (!term) return true;
      return normalizeText(`${item.name} ${item.muscle}`).includes(term);
    });
  };

  const playDetailAnimation = () => {
    if (!activeDetailItem) return;

    if (detailVideoFile && detailVideoFile.classList.contains('is-visible') && detailVideoFile.src) {
      playDetailVideoFile({ reset: true });
      return;
    }

    if (detailVideo && detailVideo.classList.contains('is-visible') && detailVideo.src) {
      detailVideo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (detailImage && detailImage.classList.contains('is-visible')) {
      detailImage.classList.remove('is-pulse');
      void detailImage.offsetWidth;
      detailImage.classList.add('is-pulse');
    }
  };

  const openDetail = (item) => {
    activeDetailItem = item || null;
    if (!activeDetailItem) return;
    activeDetailDurationSeconds = Math.max(10, Number(activeDetailItem.durationSeconds) || 20);

    if (detailTitle) detailTitle.textContent = item.name;
    if (detailSubtitle) {
      detailSubtitle.textContent = `${item.durationLabel || formatDurationClock(activeDetailDurationSeconds)} • ${Math.max(0, Number(item.caloriesEstimate) || 0)} kcal`;
    }
    if (detailMuscle) detailMuscle.textContent = `Músculo primário: ${item.muscle}`;
    if (detailDescription) detailDescription.textContent = item.instructions || 'Sem descrição.';
    if (detailDurationLabel) detailDurationLabel.textContent = formatDurationClock(activeDetailDurationSeconds);
    if (detailMusclesList) {
      const muscles = Array.isArray(item.muscles) ? item.muscles : [];
      detailMusclesList.innerHTML = muscles.map((muscle) => `<li>${escapeText(muscle)}</li>`).join('');
    }
    if (detailSteps) {
      const directTutorialSteps = normalizeTextList(
        Array.isArray(item.tutorialSteps) && item.tutorialSteps.length
          ? item.tutorialSteps
          : String(item.instructions || item.description || '').trim(),
        { splitCommas: false }
      );
      const fallbackTutorialSteps = buildExerciseTutorialSteps(
        String(item.instructions || item.description || '').trim()
      );
      const normalizedSteps = directTutorialSteps.length ? directTutorialSteps : fallbackTutorialSteps;
      detailSteps.innerHTML = normalizedSteps.map((step) => `<li>${escapeText(step)}</li>`).join('');
    }
    if (detailTipsList) {
      const safeRepetitions = Math.max(1, Number(item.repetitions) || 12);
      const safeRestSeconds = Math.max(0, Number(item.restSeconds) || 60);
      const tips = (Array.isArray(item.importantTips) ? item.importantTips : [])
        .map((tip) => String(tip || '').trim())
        .filter(Boolean);
      const normalizedTips = tips.length
        ? tips
        : [
            `Mantenha a técnica durante as ${safeRepetitions} repetições.`,
            `Respeite ${formatSecondsLabel(safeRestSeconds)} de descanso entre séries.`,
            'Evite compensar o movimento com impulso.'
          ];
      detailTipsList.innerHTML = normalizedTips.map((tip) => `<li>${escapeText(tip)}</li>`).join('');
    }
    renderIntensityBars(item.intensityScore);
    if (detailIntensityLabel) {
      const safeScore = Math.max(1, Math.min(5, Number(item.intensityScore) || 1));
      const label = String(item.intensityLabel || 'Moderado').trim();
      detailIntensityLabel.textContent = `Nível ${label} (${safeScore}/5)`;
    }

    const mediaUrl = String(item.mediaUrl || '').trim();
    const mediaType = String(item.mediaType || '').trim();
    const externalVideo = String(item.video || '').trim();
    const normalizedVideoSourceRaw = mediaType === 'video' && mediaUrl ? mediaUrl : externalVideo;
    const normalizedVideoSourceCandidates = buildMediaCandidateUrls(normalizedVideoSourceRaw);
    const normalizedVideoSource = normalizedVideoSourceCandidates[0] || '';
    const normalizedVideoLower = String(normalizedVideoSource || '').toLowerCase();
    const isEmbeddableVideo =
      normalizedVideoLower.includes('youtube.com') ||
      normalizedVideoLower.includes('youtu.be') ||
      normalizedVideoLower.includes('vimeo.com');

    if (detailVideo) {
      detailVideo.src = '';
      detailVideo.classList.remove('is-visible');
    }
    if (detailVideoFile) {
      detailVideoFile.pause();
      detailVideoFile.removeAttribute('src');
      detailVideoFile.src = '';
      detailVideoFile.classList.remove('is-visible');
    }
    if (detailImage) {
      detailImage.src = '';
      detailImage.classList.remove('is-visible');
    }

    let hasMedia = false;

    if (normalizedVideoSource && !isEmbeddableVideo && detailVideoFile) {
      detailVideoFile.muted = true;
      detailVideoFile.defaultMuted = true;
      detailVideoFile.autoplay = true;
      detailVideoFile.loop = true;
      detailVideoFile.playsInline = true;
      detailVideoFile.controls = false;
      detailVideoFile.setAttribute('autoplay', '');
      detailVideoFile.setAttribute('muted', '');
      detailVideoFile.setAttribute('loop', '');
      detailVideoFile.setAttribute('playsinline', '');
      detailVideoFile.setAttribute('preload', 'auto');
      detailVideoFile.removeAttribute('controls');
      detailVideoFile.src = normalizedVideoSource;
      detailVideoFile.classList.add('is-visible');
      hasMedia = true;
    } else if (normalizedVideoSource && detailVideo) {
      detailVideo.src = normalizedVideoSource;
      detailVideo.classList.add('is-visible');
      hasMedia = true;
    } else if (mediaUrl && mediaType === 'image' && detailImage) {
      const imageCandidates = buildMediaCandidateUrls(mediaUrl);
      detailImage.src = imageCandidates[0] || '';
      detailImage.classList.add('is-visible');
      hasMedia = true;
    }

    const detailMedia = detailVideo ? detailVideo.parentElement : null;
    if (detailMedia) detailMedia.classList.toggle('is-no-video', !hasMedia);
    if (detailNoVideo) detailNoVideo.style.display = hasMedia ? 'none' : 'grid';

    setDetailTab('musculos');
    detailSheet.hidden = false;
    detailSheet.scrollTop = 0;
    requestAnimationFrame(() => fitDetailTitleSingleLine());
    playDetailVideoFile({ reset: true });
  };

  const renderGuide = () => {
    const items = getGuideItems();
    setGuideSubtitle(items.length);
    guideGrid.innerHTML = '';

    if (!items.length) {
      guideGrid.innerHTML = '<article class="student-app-card"><p>Nenhum exercício encontrado.</p></article>';
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'student-group-guide-card';
      card.setAttribute('data-group-card', item.group);
      const name = String(item.name || '').trim() || 'Exercício';
      const seriesCount = Math.max(1, Number(item.seriesCount) || 3);
      const repetitions = Math.max(1, Number(item.repetitions) || 10);
      const imageUrlRaw = String(
        item.imageUrl ||
        item.image_url ||
        (item.mediaType === 'image' ? item.mediaUrl : '') ||
        ''
      ).trim();
      const imageCandidates = buildMediaCandidateUrls(imageUrlRaw);
      const fallbackIcon = String(LIBRARY_GROUP_ICONS[item.group] || '🏋️');
      const fallbackGroupImage = getLibraryGroupImageSrc(item.group);

      const thumb = document.createElement('span');
      thumb.className = 'student-group-guide-card-thumb';
      thumb.setAttribute('aria-hidden', 'true');

      const appendThumbFallback = () => {
        thumb.classList.remove('is-image');
        thumb.innerHTML = '';
        if (fallbackGroupImage) {
          const fallbackImage = document.createElement('img');
          fallbackImage.className = 'student-group-guide-card-group-image';
          fallbackImage.src = fallbackGroupImage;
          fallbackImage.alt = '';
          fallbackImage.loading = 'lazy';
          fallbackImage.decoding = 'async';
          fallbackImage.addEventListener('error', () => {
            thumb.innerHTML = '';
            const fallback = document.createElement('span');
            fallback.className = 'student-group-guide-card-thumb-fallback';
            fallback.textContent = fallbackIcon;
            thumb.appendChild(fallback);
          });
          thumb.classList.add('is-image');
          thumb.appendChild(fallbackImage);
          return;
        }
        const fallback = document.createElement('span');
        fallback.className = 'student-group-guide-card-thumb-fallback';
        fallback.textContent = fallbackIcon;
        thumb.appendChild(fallback);
      };

      if (imageCandidates.length) {
        const img = document.createElement('img');
        let imageCandidateIndex = 0;
        img.src = imageCandidates[imageCandidateIndex];
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => {
          imageCandidateIndex += 1;
          if (imageCandidateIndex < imageCandidates.length) {
            img.src = imageCandidates[imageCandidateIndex];
            return;
          }
          appendThumbFallback();
        });
        thumb.classList.add('is-image');
        thumb.appendChild(img);
      } else {
        appendThumbFallback();
      }

      const copy = document.createElement('span');
      copy.className = 'student-group-guide-card-copy';

      const title = document.createElement('strong');
      title.textContent = name;

      const meta = document.createElement('small');
      meta.textContent = `${seriesCount} ${seriesCount === 1 ? 'série' : 'séries'} • ${repetitions} reps`;

      copy.appendChild(title);
      copy.appendChild(meta);
      card.appendChild(thumb);
      card.appendChild(copy);

      card.addEventListener('click', () => openDetail(item));
      guideGrid.appendChild(card);
    });
  };

  const openGuide = (group) => {
    if (studentAppShell) studentAppShell.classList.add('is-library-guide-mode');
    guideGroup = group || 'todos';
    guideSheet.dataset.currentGroup = guideGroup;
    guideSearchTerm = '';
    if (guideSearch) guideSearch.value = '';
    if (guideTitle) {
      const groupLabel = LIBRARY_GROUP_LABELS[guideGroup] || 'Grupo';
      guideTitle.textContent = `Exercícios de ${groupLabel}`;
    }
    guideSheet.hidden = false;
    guideSheet.scrollTop = 0;
    closeDetail();
    renderGuide();
  };

  if (guideBack) {
    guideBack.addEventListener('click', (event) => {
      event.preventDefault();
      closeGuide();
      setStudentAppTab('biblioteca', true);
      renderLibrary();
    });
  }
  if (detailBack) {
    detailBack.addEventListener('click', (event) => {
      event.preventDefault();
      closeDetail();
    });
  }

  if (guideSearch) {
    guideSearch.addEventListener('input', (event) => {
      guideSearchTerm = event.target.value || '';
      renderGuide();
    });
  }

  detailTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextTab = String(button.dataset.groupDetailTab || '').trim() || 'musculos';
      setDetailTab(nextTab);
    });
  });

  if (detailDurationMinusButton) {
    detailDurationMinusButton.addEventListener('click', () => {
      activeDetailDurationSeconds = Math.max(10, activeDetailDurationSeconds - 5);
      if (detailDurationLabel) detailDurationLabel.textContent = formatDurationClock(activeDetailDurationSeconds);
    });
  }

  if (detailDurationPlusButton) {
    detailDurationPlusButton.addEventListener('click', () => {
      activeDetailDurationSeconds = Math.min(600, activeDetailDurationSeconds + 5);
      if (detailDurationLabel) detailDurationLabel.textContent = formatDurationClock(activeDetailDurationSeconds);
    });
  }

  if (detailPlayButton) {
    detailPlayButton.addEventListener('click', playDetailAnimation);
  }

  if (detailVideoFile) {
    detailVideoFile.addEventListener('loadedmetadata', () => {
      playDetailVideoFile();
    });
    detailVideoFile.addEventListener('canplay', () => {
      playDetailVideoFile();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    playDetailVideoFile();
    fitDetailTitleSingleLine();
  });

  window.addEventListener('resize', () => {
    fitDetailTitleSingleLine();
  });

  const handleLibraryCreated = (event) => {
    const createdGroup = event && event.detail ? event.detail.group : '';
    if (guideSheet.hidden) return;
    if (guideGroup === 'todos' || guideGroup === createdGroup) {
      renderGuide();
    }
  };

  window.addEventListener('student-library-item-created', handleLibraryCreated);
  document.addEventListener('student-library-item-created', handleLibraryCreated);

  if (libraryGrid) {
    libraryGrid.addEventListener('click', (event) => {
      const clickTarget = event.target;
      if (!(clickTarget instanceof Element)) return;
      const target = clickTarget.closest('.student-library-item');
      if (!target) return;
      const group = target.getAttribute('data-library-group') || 'todos';
      if (group === 'todos') {
        closeGuide();
        return;
      }
      openGuide(group);
    });
  }
})();
/* Create workout sheet flow */
(() => {
  const guideSheet = document.querySelector('[data-group-guide-sheet]');
  const createSheet = document.querySelector('[data-group-create-sheet]');
  const openCreateButton = document.querySelector('[data-group-create-open]');
  const closeCreateButton = document.querySelector('[data-group-create-close]');
  const createImageButton = document.querySelector('.student-group-create-image');
  const createFileInput = document.querySelector('[data-group-create-file]');
  const createFileName = document.querySelector('[data-group-create-file-name]');
  const createForm = document.querySelector('[data-group-create-form]');

  if (!guideSheet || !createSheet || !openCreateButton || !closeCreateButton || !createForm) return;

  const canManageLibrary = () => isLibraryManagerUser();

  let selectedMediaUrl = '';
  let selectedMediaType = '';

  const resetMediaSelection = () => {
    selectedMediaUrl = '';
    selectedMediaType = '';
    if (createImageButton) {
      createImageButton.innerHTML = '<span aria-hidden="true">🖼️</span>';
      createImageButton.style.backgroundImage = '';
      createImageButton.classList.remove('has-preview');
    }
    if (createFileInput) createFileInput.value = '';
    if (createFileName) createFileName.textContent = 'Nenhum arquivo selecionado';
  };

  const openCreate = () => {
    if (!canManageLibrary()) return;
    resetMediaSelection();
    createSheet.hidden = false;
  };

  const closeCreate = () => {
    if (createSheet) createSheet.hidden = true;
    resetMediaSelection();
  };

  const muscleLabelMap = {
    peito: 'Peito',
    costas: 'Costas',
    ombros: 'Ombros',
    biceps: 'Biceps',
    triceps: 'Triceps',
    antebraco: 'Antebraco',
    abdomen: 'Abdomen',
    lombar: 'Lombar',
    gluteos: 'Gluteos',
    quadriceps: 'Quadriceps',
    posterior: 'Posterior de coxa',
    adutores: 'Adutores',
    abdutores: 'Abdutores',
    panturrilhas: 'Panturrilhas'
  };

  openCreateButton.addEventListener('click', openCreate);
  closeCreateButton.addEventListener('click', closeCreate);

  if (createImageButton && createFileInput) {
    createImageButton.addEventListener('click', () => {
      createFileInput.click();
    });

    createFileInput.addEventListener('change', () => {
      const file = createFileInput.files && createFileInput.files[0];
      if (!file) {
        resetMediaSelection();
        return;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        resetMediaSelection();
        return;
      }

      selectedMediaType = isImage ? 'image' : 'video';
      selectedMediaUrl = URL.createObjectURL(file);

      if (createFileName) createFileName.textContent = file.name;
      if (createImageButton) {
        createImageButton.classList.add('has-preview');
        if (isImage) {
          createImageButton.style.backgroundImage = `url("${selectedMediaUrl}")`;
        } else {
          createImageButton.style.backgroundImage = '';
          createImageButton.textContent = 'VIDEO';
        }
      }
    });
  }

  createForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!canManageLibrary()) return;

    const formData = new FormData(createForm);
    const name = String(formData.get('nome') || '').trim();
    const details = String(formData.get('detalhes') || '').trim();
    const primary = String(guideSheet.dataset.currentGroup || '').trim();

    if (!name || !primary) return;

    studentData.library.unshift({
      name,
      muscle: muscleLabelMap[primary] || primary,
      group: primary,
      video: '',
      mediaUrl: selectedMediaUrl,
      mediaType: selectedMediaType,
      instructions: details || 'Descrição breve do exercício.',
      tips: ['Execução personalizada pelo personal.']
    });

    window.dispatchEvent(new CustomEvent('student-library-item-created', {
      detail: { group: primary }
    }));
    document.dispatchEvent(new CustomEvent('student-library-item-created', {
      detail: { group: primary }
    }));

    createForm.reset();
    if (createImageButton) createImageButton.innerHTML = '<span aria-hidden="true">🖼️</span>';
    closeCreate();
  });
})();

/* Fallback back navigation for guide sheets */
(() => {
  document.addEventListener('click', (event) => {
    const clickTarget = event.target;
    if (!(clickTarget instanceof Element)) return;
    const backGuide = clickTarget.closest('[data-group-guide-back]');
    if (backGuide) {
      const guide = document.querySelector('[data-group-guide-sheet]');
      const detail = document.querySelector('[data-group-detail-sheet]');
      if (guide) guide.hidden = true;
      if (detail) detail.hidden = true;
      if (studentAppShell) studentAppShell.classList.remove('is-library-guide-mode');
      return;
    }

    const backDetail = clickTarget.closest('[data-group-detail-back]');
    if (backDetail) {
      const detail = document.querySelector('[data-group-detail-sheet]');
      if (detail) detail.hidden = true;
      return;
    }

    const closeCreate = clickTarget.closest('[data-group-create-close]');
    if (closeCreate) {
      const create = document.querySelector('[data-group-create-sheet]');
      if (create) create.hidden = true;
    }
  });
})();

