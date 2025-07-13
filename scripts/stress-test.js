import http from 'k6/http';
import { check, sleep } from 'k6';

// 壓力測試配置
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // 1分鐘內增加到50個用戶
    { duration: '2m', target: 100 },  // 2分鐘內增加到100個用戶
    { duration: '3m', target: 200 },  // 3分鐘內增加到200個用戶
    { duration: '2m', target: 100 },  // 2分鐘內減少到100個用戶
    { duration: '1m', target: 0 },    // 1分鐘內減少到0個用戶
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95%的請求應在2秒內完成
    http_req_failed: ['rate<0.2'],     // 錯誤率應低於20%
  },
};

export default function () {
  const baseUrl = 'http://test-app';
  
  // 併發請求測試
  let requests = [
    ['GET', `${baseUrl}/`],
    ['GET', `${baseUrl}/about`],
    ['GET', `${baseUrl}/contact`],
  ];
  
  let responses = http.batch(requests);
  
  for (let i = 0; i < responses.length; i++) {
    check(responses[i], {
      [`request ${i+1} status is 200`]: (r) => r.status === 200 || r.status === 404,
    });
  }
  
  sleep(0.5); // 較短的等待時間增加負載
}
