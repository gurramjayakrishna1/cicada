
import React from "react";
import "../App.css";

export default function Header() {
  return (
    <header className="wgu-header-main">
      <img
        src="/wgu-logo.png"
        alt="WGU Logo"
        className="wgu-header-logo"
        draggable={false}
      />
    </header>
  );
}
