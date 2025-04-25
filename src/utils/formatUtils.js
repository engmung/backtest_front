// src/utils/formatUtils.js (새 파일 생성 또는 기존 유틸리티 파일에 추가)

/**
 * 금액을 통화 형식으로 포맷팅합니다
 * @param {number} amount - 포맷팅할 금액
 * @param {string} currency - 통화 코드 (KRW 또는 USD)
 * @param {boolean} includeCurrencySymbol - 통화 기호 포함 여부
 * @returns {string} 포맷팅된 금액 문자열
 */
export const formatCurrency = (
  amount,
  currency = "KRW",
  includeCurrencySymbol = true
) => {
  if (!amount && amount !== 0) return "-";

  if (currency === "USD") {
    const formatted = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return includeCurrencySymbol ? `$${formatted}` : formatted;
  } else {
    // 기본값은 KRW (원화)
    const formatted = amount.toLocaleString("ko-KR");
    return includeCurrencySymbol ? `${formatted}원` : formatted;
  }
};
