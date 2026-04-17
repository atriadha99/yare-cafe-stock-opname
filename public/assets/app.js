const roleAccess = {
  admin: ['dashboard', 'menu', 'transaksi', 'gudang', 'opname'],
  gudang: ['dashboard', 'menu', 'gudang', 'opname'],
  kasir: ['dashboard', 'menu', 'transaksi', 'opname']
};

const app = {
  init: async () => {
    if (window.page !== 'dashboard' && window.page !== 'menu' && window.page !== 'transaksi' && window.page !== 'gudang' && window.page !== 'opname') return;
    try {
      const user = await app.user();
      app.userData = user;
      app.applyPageAccess(user.role);
    } catch (err) {
      window.location.href = '/';
    }
  },
  applyPageAccess: (role) => {
    const allowedPages = roleAccess[role] || [];
    document.querySelectorAll('nav a[data-page]').forEach((link) => {
      const page = link.dataset.page;
      if (allowedPages.includes(page)) {
        link.classList.remove('hidden');
      } else {
        link.classList.add('hidden');
      }
    });
    if (!allowedPages.includes(window.page)) {
      const redirect = role === 'kasir' ? '/transaksi' : role === 'gudang' ? '/gudang' : '/dashboard';
      window.location.href = redirect;
    }
  },
  notify: (message) => {
    let alert = document.getElementById('pageAlert');
    if (!alert) {
      alert = document.createElement('div');
      alert.id = 'pageAlert';
      alert.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-3xl border border-red-500 bg-red-500/15 p-4 text-red-100 shadow-xl';
      document.body.appendChild(alert);
    }
    alert.textContent = message;
    alert.classList.remove('hidden');
    setTimeout(() => alert.classList.add('hidden'), 5000);
  },
  fetchJson: async (url, options = {}) => {
    const config = { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...options };
    if (options.body) config.body = JSON.stringify(options.body);
    const res = await fetch(url, config);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMessage = data.error || 'Request gagal';
      if (res.status === 403) app.notify(errorMessage);
      throw new Error(errorMessage);
    }
    return res.json();
  },
  setViewMode: (containerId, mode, buttons = []) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.classList.toggle('space-y-4', mode === 'list');
    container.classList.toggle('grid', mode === 'grid');
    container.classList.toggle('md:grid-cols-2', mode === 'grid');
    container.classList.toggle('xl:grid-cols-3', mode === 'grid');
    container.classList.toggle('gap-4', mode === 'grid');
    buttons.forEach((button) => {
      if (!button) return;
      if (button.dataset.view === mode) button.classList.add('active');
      else button.classList.remove('active');
    });
    try {
      localStorage.setItem(`${containerId}-view`, mode);
    } catch (err) {
      // ignore storage errors
    }
  },
  loadViewModeFromStorage: (containerId, defaultMode = 'list') => {
    try {
      return localStorage.getItem(`${containerId}-view`) || defaultMode;
    } catch (err) {
      return defaultMode;
    }
  },
  logout: async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  },
  user: async () => {
    return await app.fetchJson('/api/user');
  }
};
