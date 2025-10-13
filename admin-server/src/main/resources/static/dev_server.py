import json
import os
import re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# In-memory sample data for demo/testing
DATA = {
  'agreements': [
    {
      'id': 101,
      'client': { 'id': 1, 'name': 'شركة ألف' },
      'service': 'استشارة قانونية',
      'agreedPrice': 2500,
      'currency': 'SAR',
      'status': 'pending',
      'createdAt': '2025-10-10T10:00:00Z',
      'signedAt': None,
      'startDate': '2025-10-15T00:00:00Z',
      'endDate': '2025-12-15T00:00:00Z'
    },
    {
      'id': 102,
      'client': { 'id': 2, 'name': 'شركة باء' },
      'service': 'صياغة عقد',
      'agreedPrice': 5000,
      'currency': 'SAR',
      'status': 'signed',
      'createdAt': '2025-10-08T12:30:00Z',
      'signedAt': '2025-10-09T13:00:00Z',
      'startDate': '2025-10-20T00:00:00Z',
      'endDate': '2025-11-20T00:00:00Z'
    }
  ],
  'logs': [
    {
      'id': 'log-1',
      'timestamp': '2025-10-11T09:15:00Z',
      'userName': 'admin',
      'user': { 'username': 'admin' },
      'action': 'CREATE',
      'outcome': 'success',
      'targetType': 'contract',
      'targetId': 101,
      'notes': 'تم إنشاء عقد جديد',
      'channel': 'web'
    },
    {
      'id': 'log-2',
      'timestamp': '2025-10-11T10:05:00Z',
      'userName': 'editor',
      'user': { 'username': 'editor' },
      'action': 'UPDATE',
      'outcome': 'success',
      'targetType': 'contract',
      'targetId': 102,
      'notes': 'تحديث حالة العقد إلى signed',
      'channel': 'web'
    }
  ]
}

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        # Agreements recent
        if path.startswith('/api/agreements/recent'):
            self._send_json(DATA['agreements'])
            return
        # Agreement by id
        m = re.match(r'^/api/agreements/(\d+)$', path)
        if m:
            aid = int(m.group(1))
            item = next((a for a in DATA['agreements'] if a['id'] == aid), None)
            if item is None:
                self.send_error(404)
            else:
                self._send_json(item)
            return
        # Logs recent
        if path.startswith('/api/logs/recent'):
            self._send_json(DATA['logs'])
            return
        # Log by id
        m = re.match(r'^/api/logs/([A-Za-z0-9_-]+)$', path)
        if m:
            lid = m.group(1)
            item = next((l for l in DATA['logs'] if str(l.get('id','')) == lid), None)
            if item is None:
                self.send_error(404)
            else:
                self._send_json(item)
            return
        return super().do_GET()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        # Update agreement
        m = re.match(r'^/api/agreements/(\d+)$', path)
        if m:
            aid = int(m.group(1))
            length = int(self.headers.get('Content-Length') or 0)
            body = self.rfile.read(length).decode('utf-8') if length > 0 else ''
            payload = {}
            try:
                payload = json.loads(body or '{}')
            except Exception:
                payload = {}
            item = next((a for a in DATA['agreements'] if a['id'] == aid), None)
            if item is None:
                self.send_error(404)
                return
            # Apply updates (e.g., status)
            for k, v in payload.items():
                item[k] = v
            self._send_json({ 'ok': True })
            return
        self.send_error(404)

    def _send_json(self, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

if __name__ == '__main__':
    # Serve static files from the current directory
    os.chdir(os.path.dirname(__file__))
    port = 5500
    httpd = ThreadingHTTPServer(('', port), Handler)
    print(f'Dev server running at http://localhost:{port}/')
    httpd.serve_forever()