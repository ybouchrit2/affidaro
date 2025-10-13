/*
  API Mock for local testing on localhost:8091.
  Intercepts fetch calls to /api/** and serves in-memory data.
  Does NOT affect production (only enabled on localhost).
*/
(function(){
  try {
    const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port === '8091';
    if (!isLocal || typeof window.fetch !== 'function') return;

    const origFetch = window.fetch.bind(window);

    // Simple store in localStorage for persistence across reloads
    const storeKey = 'affidaro_mock_store_v1';
    const loadStore = () => {
      try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
    };
    const saveStore = (data) => { localStorage.setItem(storeKey, JSON.stringify(data)); };

    const initStore = () => {
      const s = loadStore();
      if (!s.clients) s.clients = [];
      if (!s.visits) s.visits = [];
      if (!s.agreements) s.agreements = [];
      if (!s.contacts) s.contacts = [];
      if (!s.logs) s.logs = [];
      if (!s.nextId) s.nextId = 1;
      saveStore(s);
      return s;
    };
    const store = initStore();

    const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
      ...init,
    });

    const notFound = () => jsonResponse({ message: 'Not Found' }, { status: 404 });
    const badRequest = (msg) => jsonResponse({ message: msg || 'Bad Request' }, { status: 400 });
    const noContent = () => new Response(null, { status: 204 });

    const parseId = (path) => {
      const parts = path.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      const id = Number(last);
      return Number.isFinite(id) ? id : null;
    };

    window.fetch = async function(input, init = {}){
      const url = typeof input === 'string' ? new URL(input, location.origin) : new URL(input.url, location.origin);
      const method = (init.method || (typeof input === 'object' ? input.method : 'GET') || 'GET').toUpperCase();
      const path = url.pathname;

      if (!path.startsWith('/api/')) {
        return origFetch(input, init);
      }

      // Auth mock: return a fake token
      if (path === '/api/auth/login' && method === 'POST') {
        return jsonResponse({ token: 'mock-jwt-token', role: 'ADMIN' });
      }

      // Visits mock
      if (path === '/api/visits' && method === 'POST') {
        try {
          const body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {};
          store.visits.push({
            id: store.nextId++,
            page: body.page || url.searchParams.get('page') || location.pathname,
            referrer: body.referrer || document.referrer || '',
            durationSec: body.durationSec || 0,
            ts: Date.now(),
          });
          saveStore(store);
        } catch {}
        return new Response(null, { status: 201 });
      }
      if (path === '/api/visits' && method === 'GET') {
        return jsonResponse(store.visits);
      }
      if (path.startsWith('/api/visits/recent') && method === 'GET') {
        const recent = [...store.visits].sort((a,b)=>b.ts-a.ts).slice(0,20);
        return jsonResponse(recent);
      }

      // Clients mock CRUD
      if (path === '/api/clients' && method === 'GET') {
        // Basic filters (optional): status, q
        const status = url.searchParams.get('status');
        const q = url.searchParams.get('q');
        let data = store.clients;
        if (status) data = data.filter(c => String(c.status||'').toLowerCase() === status.toLowerCase());
        if (q) {
          const qq = q.toLowerCase();
          data = data.filter(c => [c.name,c.email,c.phone].some(v => String(v||'').toLowerCase().includes(qq)));
        }
        return jsonResponse(data);
      }
      if (path === '/api/clients/recent' && method === 'GET') {
        const status = url.searchParams.get('status');
        let data = store.clients.slice(0);
        if (status) data = data.filter(c => String(c.status||'').toLowerCase() === status.toLowerCase());
        data.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return jsonResponse(data.slice(0, 50));
      }
      if (path.startsWith('/api/clients/search') && method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const qq = q.toLowerCase();
        const data = store.clients.filter(c => `${c.name||''} ${c.email||''} ${c.phone||''} ${c.source||''}`.toLowerCase().includes(qq));
        return jsonResponse(data);
      }
      if (path === '/api/clients' && method === 'POST') {
        let payload = {};
        try { payload = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
        if (!payload.name) return badRequest('name is required');
        const item = {
          id: store.nextId++,
          name: payload.name,
          email: payload.email || '',
          phone: payload.phone || '',
          status: payload.status || 'lead',
          classification: payload.classification || 'regular',
          pipelineStage: payload.pipelineStage || 'new',
          createdAt: new Date().toISOString(),
          contractsCount: 0,
          lastVisit: null,
        };
        store.clients.push(item);
        saveStore(store);
        return jsonResponse(item, { status: 201 });
      }
      if (path.startsWith('/api/clients/') && method === 'GET') {
        const id = parseId(path);
        if (!id) return notFound();
        const item = store.clients.find(c => c.id === id);
        if (!item) return notFound();
        return jsonResponse(item);
      }
      if (path.startsWith('/api/clients/') && method === 'PUT') {
        const id = parseId(path);
        if (!id) return notFound();
        let payload = {};
        try { payload = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
        const idx = store.clients.findIndex(c => c.id === id);
        if (idx === -1) return notFound();
        store.clients[idx] = { ...store.clients[idx], ...payload };
        saveStore(store);
        return jsonResponse(store.clients[idx]);
      }
      if (path.startsWith('/api/clients/') && method === 'DELETE') {
        const id = parseId(path);
        if (!id) return notFound();
        const before = store.clients.length;
        const next = store.clients.filter(c => c.id !== id);
        store.clients = next;
        saveStore(store);
        if (next.length === before) return notFound();
        return noContent();
      }

      // Agreements mock
      if (path.startsWith('/api/clients/') && path.endsWith('/agreements') && method === 'GET') {
        const id = parseId(path.replace('/agreements',''));
        if (!id) return notFound();
        const list = store.agreements.filter(a => a.clientId === id);
        return jsonResponse(list);
      }
      if (path === '/api/agreements' && method === 'POST') {
        let payload = {};
        try { payload = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
        if (!payload.clientId) return badRequest('clientId is required');
        const item = {
          id: store.nextId++,
          clientId: payload.clientId,
          service: payload.service || '',
          agreedPrice: payload.price || '',
          currency: payload.currency || 'EUR',
          status: payload.status || 'pending',
          details: payload.details || '',
          signedAt: payload.signedAtMs ? new Date(payload.signedAtMs).toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        store.agreements.push(item);
        saveStore(store);
        return jsonResponse(item, { status: 201 });
      }

      // Analytics and stats
      if (path === '/api/visits/stats' && method === 'GET') {
        const total = store.visits.length;
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const today = store.visits.filter(v => v.ts >= todayStart.getTime()).length;
        const avgDurationMs = Math.round(store.visits.reduce((acc,v)=> acc + ((v.durationSec||0)*1000), 0) / Math.max(1,total));
        const byPage = {};
        store.visits.forEach(v => { const p = v.page || '/'; byPage[p] = (byPage[p]||0) + 1; });
        const recent = [...store.visits].sort((a,b)=>b.ts-a.ts).slice(0,50).map(v=>({ timestamp:v.ts, page:v.page, referrer:v.referrer, durationMs:(v.durationSec||0)*1000 }));
        return jsonResponse({ total, today, avgDurationMs, byPage, recent });
      }
      if (path === '/api/analytics' && method === 'GET') {
        const totalVisits = store.visits.length;
        const visitsToday = store.visits.filter(v => {
          const d = new Date(v.ts); const n = new Date();
          return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
        }).length;
        const avgDurationMs = Math.round(store.visits.reduce((acc,v)=> acc + ((v.durationSec||0)*1000), 0) / Math.max(1,totalVisits));
        const totalClients = store.clients.length;
        const newClientsToday = store.clients.filter(c => {
          const d = new Date(c.createdAt); const n = new Date();
          return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
        }).length;
        const totalContracts = store.agreements.length;
        const contractsToday = store.agreements.filter(a => {
          const d = new Date(a.createdAt); const n = new Date();
          return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
        }).length;
        return jsonResponse({ totalVisits, visitsToday, avgDurationMs, totalClients, newClientsToday, totalContracts, contractsToday });
      }

      // Contacts & contracts stubs
      if (path === '/api/contact/recent' && method === 'GET') {
        return jsonResponse(store.contacts.slice(0,50));
      }
      if (path === '/api/contracts' && method === 'GET') {
        // Not used for rendering; return minimal array
        return jsonResponse([]);
      }

      // Create client from contact
      if (path.startsWith('/api/clients/fromContact/') && method === 'POST') {
        const id = parseId(path);
        const contact = store.contacts.find(c => c.id === id);
        if (!contact) return notFound();
        const item = {
          id: store.nextId++,
          name: contact.name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          status: 'lead',
          classification: 'regular',
          pipelineStage: 'new',
          createdAt: new Date().toISOString(),
          contractsCount: 0,
          lastVisit: null,
          source: contact.source || 'contact',
        };
        store.clients.push(item);
        saveStore(store);
        return jsonResponse({ status: 'ok', id: item.id });
      }

      // Client classification and stage updates
      if (path.startsWith('/api/clients/') && path.endsWith('/classification') && method === 'PUT') {
        const id = parseId(path.replace('/classification',''));
        if (!id) return notFound();
        let payload = {};
        try { payload = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
        const idx = store.clients.findIndex(c => c.id === id);
        if (idx === -1) return notFound();
        store.clients[idx].classification = payload.classification || store.clients[idx].classification;
        saveStore(store);
        return noContent();
      }
      if (path.startsWith('/api/clients/') && path.endsWith('/stage') && method === 'PUT') {
        const id = parseId(path.replace('/stage',''));
        if (!id) return notFound();
        let payload = {};
        try { payload = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
        const idx = store.clients.findIndex(c => c.id === id);
        if (idx === -1) return notFound();
        store.clients[idx].pipelineStage = payload.pipelineStage || store.clients[idx].pipelineStage;
        saveStore(store);
        return noContent();
      }

      // Client logs
      if (path.startsWith('/api/clients/') && path.endsWith('/logs') && method === 'GET') {
        const id = parseId(path.replace('/logs',''));
        if (!id) return notFound();
        const list = store.logs.filter(l => l.clientId === id);
        return jsonResponse(list);
      }
      if (path.startsWith('/api/clients/') && path.endsWith('/logs') && method === 'POST') {
        const id = parseId(path.replace('/logs',''));
        if (!id) return notFound();
        let payload = {};
        try { payload = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
        const item = {
          id: store.nextId++,
          clientId: id,
          timestamp: Date.now(),
          channel: payload.channel || '',
          userName: 'admin',
          notes: payload.notes || '',
          outcome: payload.outcome || '',
        };
        store.logs.push(item);
        saveStore(store);
        return jsonResponse(item, { status: 201 });
      }

      // Fallback to original fetch for any other API calls
      return origFetch(input, init);
    };
    console.info('[api-mock] Enabled on localhost:8091 — intercepting /api/**');
  } catch (e) {
    console.warn('[api-mock] Failed to initialize:', e);
  }
})();