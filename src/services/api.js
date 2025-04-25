import axios from "axios";

// API 기본 주소 설정
const API_BASE_URL = "/api";

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 자연어 백테스팅 API 호출
 * @param {string} prompt 자연어 백테스팅 요청 문자열
 * @returns {Promise} 백테스팅 결과
 */
export const naturalBacktest = async (prompt) => {
  try {
    const response = await apiClient.post("/natural-backtest", {
      prompt,
    });

    // 디버깅: API 응답 구조 로깅
    console.log("API 응답 구조:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("자연어 백테스팅 API 오류:", error);
    throw error;
  }
};

export default {
  naturalBacktest,
};
