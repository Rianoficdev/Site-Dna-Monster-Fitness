(() => {
  const loaderScript = document.currentScript;
  const fullScriptSrc =
    (loaderScript && loaderScript.dataset && loaderScript.dataset.dnaFullScript) ||
    'script.js';
  const fullScriptId = 'dna-full-app-script';
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
