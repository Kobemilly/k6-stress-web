import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '3m', target: 5 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
    'group_duration{group:::API Tests}': ['p(95)<3000'],
  },
  ext: {
    influxdb: {
      url: 'http://influxdb:8086',
      database: 'k6',
      username: 'k6',
      password: 'k6password',
    },
  },
};

// 基本配置
const BASE_URL = 'https://jsonplaceholder.typicode.com';

export default function() {
  group('API Tests', function() {
    // 測試 GET 請求
    group('GET Requests', function() {
      let response = http.get(`${BASE_URL}/posts/1`);
      check(response, {
        'GET posts status is 200': (r) => r.status === 200,
        'GET posts has correct content-type': (r) => r.headers['Content-Type'].includes('application/json'),
        'GET posts response time < 1000ms': (r) => r.timings.duration < 1000,
      });
    });
    
    // 測試 POST 請求
    group('POST Requests', function() {
      let payload = JSON.stringify({
        title: 'k6 Load Test',
        body: 'This is a test post from k6',
        userId: 1,
      });
      
      let params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      let response = http.post(`${BASE_URL}/posts`, payload, params);
      check(response, {
        'POST status is 201': (r) => r.status === 201,
        'POST response has id': (r) => JSON.parse(r.body).id !== undefined,
      });
    });
    
    // 測試 PUT 請求
    group('PUT Requests', function() {
      let payload = JSON.stringify({
        id: 1,
        title: 'Updated Title',
        body: 'Updated body content',
        userId: 1,
      });
      
      let params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      let response = http.put(`${BASE_URL}/posts/1`, payload, params);
      check(response, {
        'PUT status is 200': (r) => r.status === 200,
        'PUT response has updated title': (r) => JSON.parse(r.body).title === 'Updated Title',
      });
    });
    
    // 測試 DELETE 請求
    group('DELETE Requests', function() {
      let response = http.del(`${BASE_URL}/posts/1`);
      check(response, {
        'DELETE status is 200': (r) => r.status === 200,
      });
    });
  });
  
  sleep(1);
}
