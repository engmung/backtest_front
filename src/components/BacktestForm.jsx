import { useState, useRef, useEffect } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { naturalBacktest } from "../services/api";

const examplePrompts = ["삼성전자", "금", "비트코인", "QQQ"];

const fullPrompts = {
  삼성전자: "삼성전자를 3개월 전에 100만원어치 샀다면 지금 얼마가 되었을까?",
  금: "1년 전, 금에 1000만원 투자했다면 수익이 얼마나 났을까요?",
  비트코인: "비트코인을 3년전에 100만원어치 사서 1년전에 팔았다면?",
  QQQ: "QQQ ETF 1년 전 200만원 투자 결과",
};

const BacktestForm = ({ setBacktestResult }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "system",
      content:
        "안녕하세요! 과거 투자의 현재 가치를 확인해 드립니다. 투자하고 싶은 자산과 시기를 알려주세요.",
    },
  ]);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 채팅이 업데이트될 때마다 스크롤을 아래로 이동
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setError("투자 시나리오를 입력해주세요.");
      return;
    }

    // 사용자 메시지 추가
    setChatHistory((prev) => [...prev, { role: "user", content: prompt }]);

    // 로딩 메시지 추가
    setChatHistory((prev) => [
      ...prev,
      { role: "system", content: "분석 중...", loading: true },
    ]);

    setLoading(true);
    setError("");
    setPrompt("");

    try {
      const result = await naturalBacktest(prompt);

      // 로딩 메시지 제거
      setChatHistory((prev) => prev.filter((msg) => !msg.loading));

      if (result.status === "error") {
        // API가 응답했지만 에러를 반환한 경우
        const errorMsg = "요청 분석 중 오류가 발생했습니다";
        setError(errorMsg);
        setChatHistory((prev) => [
          ...prev,
          { role: "system", content: `⚠️ ${errorMsg}`, error: true },
          {
            role: "system",
            content:
              "정확한 시기와 상품명, 그리고 비용을 입력해주세요. (예: '삼성전자 3개월 전부터 오늘까지 100만원 투자결과')",
            error: true,
          },
        ]);
      } else {
        // 시스템 응답 메시지 추가
        setChatHistory((prev) => [
          ...prev,
          {
            role: "system",
            content: `${result.result.name || result.result.symbol} (${
              result.result.symbol
            })의 백테스팅 결과가 준비되었습니다!`,
            result: result,
          },
        ]);
        setBacktestResult(result);
        navigate("/result");
      }
    } catch (err) {
      // API 호출 자체가 실패한 경우 (서버 연결 실패 등)
      const errorMsg = "요청 분석 중 오류가 발생했습니다";
      setError(errorMsg);
      setChatHistory((prev) => prev.filter((msg) => !msg.loading));
      setChatHistory((prev) => [
        ...prev,
        { role: "system", content: `⚠️ ${errorMsg}`, error: true },
        {
          role: "system",
          content:
            "정확한 시기와 상품명, 그리고 비용을 입력해주세요. (예: '삼성전자 3개월 전부터 오늘까지 100만원 투자결과')",
          error: true,
        },
      ]);
      console.error("백테스팅 에러:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setPrompt(fullPrompts[example] || example);
  };

  return (
    <div className="chat-container">
      {/* 채팅 내역 표시 영역 */}
      <div className="chat-history">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`${
              message.role === "user" ? "user-message" : "system-message"
            } ${message.error ? "error-message" : ""}`}
          >
            {message.loading ? (
              <div className="loading-message">
                <Spinner
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                {message.content}
              </div>
            ) : (
              message.content
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 채팅 입력 영역 */}
      <form onSubmit={handleSubmit}>
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="투자 시나리오를 입력하세요"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" className="send-button" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "→"}
          </button>
        </div>

        <div className="example-prompts">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              type="button"
              className="prompt-button"
              onClick={() => handleExampleClick(example)}
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};

export default BacktestForm;
