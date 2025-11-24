import React, { useState } from "react";
import Logo from "../assets/logo.png";
import BookIcon from "../assets/book.png";
import CommunityIcon from "../assets/community.png";
import HelpIcon from "../assets/help.png";
import { Settings, Bell, ChevronDown, Verified } from "lucide-react";
import "./support.css";

interface FeaturedArticle {
  title: string;
  content: string;
}

const featuredArticles: FeaturedArticle[] = [
  { title: "How to share records with your doctor", content: "This article guides you through the process of securely sharing your medical records with your trusted healthcare providers. Learn about setting access durations, permissions, and revoking access anytime." },
  { title: "What is end-to-end encryption?", content: "Understand how HealthLock utilizes end-to-end encryption to protect your sensitive medical data, ensuring only you and authorized individuals can access your information." },
  { title: "Understanding your billing statement", content: "Experiencing problems connecting to HealthLock or your wallet? This guide provides common solutions and troubleshooting steps for seamless access." },
];

const Support = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleArticle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <>
      <header className="support-header">
        <div className="logo">
          <img src={Logo} alt="MedLock Logo" />
          <div>MedLock</div>
        </div>
        <div className="profile-section">
          <Bell size={18} />
          <Settings size={18} />
          <div className="user-profile">EO</div>
        </div>
      </header>

      <div className="support-page">
        {/* Search Section */}
        <section className="search-section">
          <h2>How Can We Help You Today?</h2>
          <p>Find answers, troubleshoot issues, or connect with our support team.</p>
          <input
            type="text"
            placeholder="Search our knowledge base for articles"
            className="search-input"
          />
          <div className="tags">
            <button>Upload Issues</button>
            <button>Access control</button>
            <button>Billing</button>
            <button>2K Login</button>
            <button>Pharmacy verification</button>
          </div>
        </section>

        {/* Cards Section */}
        <section className="cards-section">
          <div className="card">
            <img src={BookIcon} alt="Knowledge Base" />
            <h3>Knowledge Base</h3>
            <p>Browse FAQs, guides, and articles covering all HealthLock features.</p>
            <button>Explore Articles</button>
          </div>

          <div className="card">
            <img src={CommunityIcon} alt="Community Forum" />
            <h3>Community Forum</h3>
            <p>Connect with other users, share experiences, and get community support.</p>
            <button>Join the Forum</button>
          </div>

          <div className="card">
            <img src={HelpIcon} alt="Contact Support" />
            <h3>Contact Support</h3>
            <p>Couldn't find an answer? Reach out to our dedicated support team.</p>
            <button>Get in Touch</button>
          </div>
        </section>

        {/* Featured Articles Section */}
        <section className="featured-articles">
          <h3>Featured Articles</h3>
          {featuredArticles.map((article, idx) => (
            <div key={idx} className="article-item">
              <div
                className="article-header"
                onClick={() => toggleArticle(idx)}
                style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", alignItems: "center" }}
              >
                <p>{article.title}</p>
                <ChevronDown
                  size={28}
                  style={{
                    transform: openIndex === idx ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                />
              </div>
              {openIndex === idx && (
                <p className="article-content" style={{ marginTop: "8px", color: "#555" }}>
                  {article.content}
                </p>
              )}
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="status-footer">
          <span><Verified /> All Systems Operational</span>
          <a href="#">View detailed status page</a>
        </footer>
      </div>
    </>
  );
};

export default Support;

