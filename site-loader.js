(() => {
  const loaderScript = document.currentScript;
  const fullScriptSrc =
    (loaderScript && loaderScript.dataset && loaderScript.dataset.dnaFullScript) ||
    'script.js';
  const fullScriptId = 'dna-full-app-script';
  const privacyConsentKey = 'dna_privacy_consent_v1';
  let fullScriptLoaded = false;
  let fullScriptPromise = null;

  const loadFullAppScript = () => {
    if (fullScriptLoaded) return Promise.resolve();
    if (fullScriptPromise) return fullScriptPromise;

    fullScriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(fullScriptId);
      if (existing) {
        existing.addEventListener('load', () => {
          fullScriptLoaded = true;
          resolve();
        }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = fullScriptId;
      script.src = fullScriptSrc;
      script.async = false;
      script.onload = () => {
        fullScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return fullScriptPromise;
  };

  const bindStudentAreaEntry = () => {
    const trigger = document.querySelector('[data-student-open]');
    if (!trigger) return;

    trigger.addEventListener('click', (event) => {
      if (fullScriptLoaded) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      loadFullAppScript()
        .then(() => {
          trigger.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        })
        .catch((error) => {
          console.error('[site-loader] full app script failed', error);
        });
    }, true);
  };

  const bindBasicMenu = () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('.menu');
    if (!menuToggle || !menu) return;

    menuToggle.addEventListener('click', () => {
      if (fullScriptLoaded) return;
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('open', !expanded);
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (fullScriptLoaded) return;
        menu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  };

  const bindBasicThemeToggle = () => {
    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      if (fullScriptLoaded) return;
      const dark = document.body.classList.toggle('theme-dark');
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo noturno');
      toggle.setAttribute('title', dark ? 'Ativar modo claro' : 'Ativar modo noturno');
      try {
        localStorage.setItem('dna-theme', dark ? 'dark' : 'light');
      } catch (_) {}
    });
  };

  const restoreThemeHint = () => {
    try {
      if (localStorage.getItem('dna-theme') === 'dark') {
        document.body.classList.add('theme-dark');
      }
    } catch (_) {}
  };

  const initPrivacyControls = () => {
    const modal = document.querySelector('[data-privacy-modal]');
    const modalCard = modal ? modal.querySelector('.privacy-modal-card') : null;
    const banner = document.querySelector('[data-privacy-banner]');
    const openButtons = document.querySelectorAll('[data-privacy-open]');
    const closeButtons = document.querySelectorAll('[data-privacy-close]');
    const acceptButtons = document.querySelectorAll('[data-privacy-accept]');

    const hasConsent = () => {
      try {
        return localStorage.getItem(privacyConsentKey) === 'accepted';
      } catch (_) {
        return false;
      }
    };

    const saveConsent = () => {
      try {
        localStorage.setItem(privacyConsentKey, 'accepted');
        localStorage.setItem(`${privacyConsentKey}_at`, new Date().toISOString());
      } catch (_) {}
    };

    const openModal = () => {
      if (!modal) return;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('privacy-modal-open');
      window.setTimeout(() => {
        if (modalCard && typeof modalCard.focus === 'function') modalCard.focus();
      }, 0);
    };

    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('privacy-modal-open');
    };

    const hideBanner = () => {
      if (banner) banner.hidden = true;
    };

    const acceptPrivacy = () => {
      saveConsent();
      hideBanner();
      closeModal();
    };

    openButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openModal();
      });
    });

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    acceptButtons.forEach((button) => {
      button.addEventListener('click', acceptPrivacy);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    if (banner && !hasConsent()) {
      banner.hidden = false;
    }
  };

  const scheduleIdleFullLoad = () => {
    const run = () => loadFullAppScript().catch(() => {});
    window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 5000 });
        return;
      }
      run();
    }, 1800);
  };

  const init = () => {
    restoreThemeHint();
    bindStudentAreaEntry();
    bindBasicMenu();
    bindBasicThemeToggle();
    initPrivacyControls();

    if (document.readyState === 'complete') {
      scheduleIdleFullLoad();
      return;
    }
    window.addEventListener('load', scheduleIdleFullLoad, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
