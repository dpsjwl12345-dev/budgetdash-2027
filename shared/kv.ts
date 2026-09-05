// Vercel KV 헬퍼. server/index.ts(로컬 개발 서버)와 api/budget/*(Vercel 서버리스 함수)가 공유한다.

const initKV = () => {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn('⚠️  KV 환경 변수 누락 - 로컬 스토리지만 사용됩니다');
    return null;
  }

  return { url, token };
};

export const saveToKV = async (key: string, data: any): Promise<boolean> => {
  const kv = initKV();
  if (!kv) return false;

  try {
    const response = await fetch(`${kv.url}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.ok;
  } catch (error) {
    console.error('KV 저장 실패:', error);
    return false;
  }
};

export const loadFromKV = async (key: string): Promise<any | null> => {
  const kv = initKV();
  if (!kv) return null;

  try {
    const response = await fetch(`${kv.url}/get/${key}`, {
      headers: {
        'Authorization': `Bearer ${kv.token}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('KV 로드 실패:', error);
    return null;
  }
};
