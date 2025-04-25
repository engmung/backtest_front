// src/components/Footer.jsx
import React from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="minimal-footer">
      <p>
        <span className="footer-service">
          AI를 활용한 간편한 백테스팅 서비스
        </span>
        <span className="footer-divider"> | </span>
        <span className="footer-disclaimer">환율 변동은 적용되지 않습니다</span>
      </p>
    </footer>
  );
};

export default Footer;
