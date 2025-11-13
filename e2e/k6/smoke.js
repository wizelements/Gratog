import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check 200': (r) => r.status === 200,
    'health status healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy' || body.status === 'ok';
      } catch (e) {
        return false;
      }
    }
  });
  
  sleep(1);
  
  // Test products API
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    'products 200': (r) => r.status === 200,
    'products is array or object': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || (typeof body === 'object' && body !== null);
      } catch (e) {
        return false;
      }
    }
  });
  
  sleep(1);
}
