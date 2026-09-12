(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var header = $('#mainHeader');
  var mobileToggle = $('#mobileToggle');
  var mobileDrawer = $('#mobileDrawer');
  var drawerOverlay = $('#drawerOverlay');
  var drawerClose = $('#drawerClose');
  var langDropdown = $('#langDropdown');
  var scrollTopBtn = $('#scrollTopBtn');
  var capitalRange = $('#capitalRange');
  var capitalInput = $('#capitalInput');
  var durationSelect = $('#durationSelect');
  var btnCalcYield = $('#btnCalcYield');
  var btnCalcTrade = $('#btnCalcTrade');
  var infoModal = $('#infoModal');
  var modalClose = $('#modalClose');
  var modalCloseBtn = $('#modalCloseBtn');
  var modalBody = $('#modalBody');

  var i18n = {};
  try {
    var i18nEl = document.getElementById('investoorNewI18n');
    if (i18nEl && i18nEl.textContent) {
      i18n = JSON.parse(i18nEl.textContent) || {};
    }
  } catch (e) {
    i18n = {};
  }

  function t(key, fallback) {
    return i18n[key] || fallback;
  }

  var calcMode = 'festgeld';
  var FESTGELD_RATES = { 12: 0.14, 24: 0.145, 36: 0.15 };
  // Sparplan / second calculator mode: flat 14% p.a. (same marketing yield)
  var SPARPLAN_RATE = 0.14;

  /* ---- Mobile Drawer ---- */

  function openDrawer() {
    if (!mobileDrawer) return;
    mobileDrawer.classList.add('is-open');
    if (drawerOverlay) drawerOverlay.classList.add('is-open');
    document.body.classList.add('inv-drawer-open');
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    if (!mobileDrawer) return;
    mobileDrawer.classList.remove('is-open');
    if (drawerOverlay) drawerOverlay.classList.remove('is-open');
    document.body.classList.remove('inv-drawer-open');
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  $$('.mobile-nav-link').forEach(function (link) {
    link.addEventListener('click', closeDrawer);
  });

  /* ---- Language Dropdown ---- */

  var langTrigger = langDropdown ? langDropdown.querySelector('.dropdown-trigger') : null;

  if (langTrigger) {
    langTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = langDropdown.classList.toggle('is-open');
      langTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  if (langDropdown) {
    langDropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  document.addEventListener('click', function () {
    if (langDropdown) {
      langDropdown.classList.remove('is-open');
      if (langTrigger) langTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---- Header Scroll & Scroll To Top ---- */

  function onScroll() {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    if (scrollTopBtn) {
      scrollTopBtn.classList.toggle('is-visible', window.scrollY > 500);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Smooth Anchor Scroll ---- */

  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeDrawer();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---- Calculator ---- */

  function formatEuro(value) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  }

  function getCapital() {
    var val = parseFloat((capitalInput && capitalInput.value) || (capitalRange && capitalRange.value) || 0);
    return Number.isFinite(val) ? Math.max(0, val) : 0;
  }

  function setCapital(val) {
    var n = Math.max(0, val);
    if (capitalInput) capitalInput.value = Math.round(n);
    if (capitalRange) {
      var min = parseFloat(capitalRange.min) || 0;
      var max = parseFloat(capitalRange.max) || n;
      capitalRange.value = Math.min(max, Math.max(min, n));
    }
  }

  function setCalcMode(mode) {
    calcMode = mode;
    if (btnCalcYield) btnCalcYield.classList.toggle('active', mode === 'festgeld');
    if (btnCalcTrade) btnCalcTrade.classList.toggle('active', mode === 'trading');

    var label = $('#calcRangeLabel');
    var title = $('#calcResTitle');
    var durationGroup = durationSelect ? durationSelect.closest('.control-group') : null;

    if (label) {
      label.textContent = mode === 'festgeld'
        ? t('rangeLabel', 'Gewünschtes Anlagekapital:')
        : t('rangeLabelTrade', 'Gewünschtes Sparplan-Kapital:');
    }
    if (title) {
      title.textContent = mode === 'festgeld'
        ? t('resultTitle', 'Jährliche Gesamtauszahlung')
        : t('resultTitle', 'Jährliche Gesamtauszahlung') + ' (14,00% p.a.)';
    }
    if (durationGroup) {
      durationGroup.style.display = mode === 'festgeld' ? '' : 'none';
    }

    updateCalculator();
  }

  function updateCalculator() {
    var capital = getCapital();
    var months = parseInt((durationSelect && durationSelect.value) || '12', 10);
    var annualEl = $('#resAnnualReturn');
    var netEl = $('#resNetGain');
    var monthlyEl = $('#resMonthlyReturn');

    if (calcMode === 'festgeld') {
      var rate = FESTGELD_RATES[months] || SPARPLAN_RATE;
      var gain = capital * rate * (months / 12);
      var total = capital + gain;
      var rateLabel = (rate * 100).toFixed(2).replace('.', ',');

      if (annualEl) annualEl.textContent = formatEuro(total);
      if (netEl) netEl.textContent = '+ ' + formatEuro(gain) + ' ' + t('netGainSuffix', 'Reingewinn') + ' (' + rateLabel + '% p.a.)';
      if (monthlyEl) monthlyEl.textContent = formatEuro(gain / months) + ' ' + t('perMonth', '/ Monat');
    } else {
      // Sparplan Fremdkapital: fixed 14% p.a. over 12 months
      var sparplanMonths = 12;
      var sparplanGain = capital * SPARPLAN_RATE;
      var sparplanTotal = capital + sparplanGain;
      var sparplanRateLabel = (SPARPLAN_RATE * 100).toFixed(2).replace('.', ',');

      if (annualEl) annualEl.textContent = formatEuro(sparplanTotal);
      if (netEl) {
        netEl.textContent = '+ ' + formatEuro(sparplanGain) + ' ' +
          t('netGainSuffix', 'Reingewinn') + ' (' + sparplanRateLabel + '% p.a.)';
      }
      if (monthlyEl) {
        monthlyEl.textContent = formatEuro(sparplanGain / sparplanMonths) + ' ' + t('perMonth', '/ Monat');
      }
    }
  }

  if (capitalRange) {
    capitalRange.addEventListener('input', function () {
      if (capitalInput) capitalInput.value = this.value;
      updateCalculator();
    });
  }

  if (capitalInput) {
    capitalInput.addEventListener('input', function () {
      if (capitalRange) capitalRange.value = this.value;
      updateCalculator();
    });
  }

  if (durationSelect) durationSelect.addEventListener('change', updateCalculator);
  if (btnCalcYield) btnCalcYield.addEventListener('click', function () { setCalcMode('festgeld'); });
  if (btnCalcTrade) btnCalcTrade.addEventListener('click', function () { setCalcMode('trading'); });

  /* ---- Pricing Filter Tabs ---- */

  function applyPricingFilter(filter) {
    filter = filter || 'all';
    $$('.pricing-tab').forEach(function (t) {
      t.classList.toggle('active', (t.getAttribute('data-filter') || '') === filter);
    });
    $$('#pricingGrid .plan-card').forEach(function (card) {
      var cat = card.getAttribute('data-category') || '';
      card.style.display = (filter === 'all' || filter === cat) ? '' : 'none';
    });
  }

  $$('.pricing-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      applyPricingFilter(this.getAttribute('data-filter') || 'all');
    });
  });

  var pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    var initialFilter = pricingSection.getAttribute('data-default-filter') || 'all';
    var activeTab = document.querySelector('.pricing-tab.active');
    if (activeTab && activeTab.getAttribute('data-filter')) {
      initialFilter = activeTab.getAttribute('data-filter');
    }
    applyPricingFilter(initialFilter);
  }

  /* ---- FAQ Accordion ---- */

  $$('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', function () {
      var wasActive = item.classList.contains('active');
      $$('.faq-item').forEach(function (i) { i.classList.remove('active'); });
      if (!wasActive) item.classList.add('active');
    });
  });

  /* ---- Plan Info Modal ---- */

  function openModal(bv, ref) {
    if (!infoModal || !modalBody) return;
    modalBody.innerHTML =
      '<p><strong>' + t('modalBvLabel', 'Business Volume (BV):') + '</strong> ' + bv + '</p>' +
      '<p><strong>' + t('modalRefLabel', 'Partner-Provision:') + '</strong> ' + ref + ' ' + t('modalRefSuffix', 'auf alle vermittelten Konten (Lifetime).') + '</p>' +
      '<p class="modal-note">' + t('modalNote', 'Details erhalten Sie nach der Registrierung im Partner-Dashboard.') + '</p>';
    infoModal.classList.add('is-open');
    document.body.classList.add('inv-modal-open');
  }

  function closeModal() {
    if (infoModal) infoModal.classList.remove('is-open');
    document.body.classList.remove('inv-modal-open');
  }

  $$('.plan-info-trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      openModal(this.getAttribute('data-bv') || '—', this.getAttribute('data-ref') || '30%');
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (infoModal) {
    infoModal.addEventListener('click', function (e) {
      if (e.target === infoModal) closeModal();
    });
  }

  /* ---- Contact / Auth demo forms ---- */

  $$('[data-static-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-success');
      if (note) note.hidden = false;
      form.reset();
    });
  });

  /* ---- Keyboard & Resize ---- */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDrawer();
      closeModal();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 991) closeDrawer();
  });

  /* ---- Init ---- */

  setCalcMode('festgeld');
  setCapital(parseFloat((capitalInput && capitalInput.value) || 50000));
  updateCalculator();
})();
