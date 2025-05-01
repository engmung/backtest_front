// src/components/Footer.jsx
import React from "react";

const Footer = () => {
  const discordId = "696558301051093072";

  return (
    <footer className="minimal-footer">
      <div className="footer-main-content">
        <p>
          <span className="footer-service">
            AI를 활용한 간편한 백테스팅 서비스
          </span>
          <span className="footer-divider"> | </span>
          <span className="footer-disclaimer">
            환율 변동은 적용되지 않습니다
          </span>
        </p>
      </div>

      <div className="footer-contact-wrapper">
        <a
          href={`https://discord.com/users/${discordId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link"
        >
          디스코드 문의
        </a>
      </div>
    </footer>
  );
};

export default Footer;
