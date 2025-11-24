import React from "react";
import "./learnmore.css";
import NavBar from "../components/navbar";
import { User, Stethoscope, Pill, Code2, FileText, PlayCircle, BookOpen, Mail } from "lucide-react";

interface LearnCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  links: string[];
}

interface Resource {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

const LearnMore = () => {
  const learnCards: LearnCard[] = [
    {
      icon: <User className="learn-icon" />,
      title: "For Patients: Your Data, Your Control",
      description:
        "Detailed guides on data ownership, privacy controls, and navigating your personal dashboard to empower your healthcare journey.",
      links: [
        "Patient Rights Whitepaper",
        "Guide to Data Export",
        "Understanding ZK-Login for Patients",
      ],
    },
    {
      icon: <Stethoscope className="learn-icon" />,
      title: "For Doctors: Streamline Your Practice",
      description:
        "Resources on secure record access, digital prescribing, and integrating HealthLock seamlessly into your clinical workflow.",
      links: [
        "Doctor Onboarding Guide",
        "API Documentation for EHR Integration",
        "On-Chain Prescribing Explained",
      ],
    },
    {
      icon: <Pill className="learn-icon" />,
      title: "For Pharmacies: Verified Dispensing",
      description:
        "Comprehensive information on prescription verification, on-chain payments, and maintaining compliance with HealthLock's secure protocols.",
      links: [
        "Pharmacy Verification Protocol",
        "On-Chain Payment Walkthrough",
        "Compliance & Audit Features",
      ],
    },
    {
      icon: <Code2 className="learn-icon" />,
      title: "For Developers: Build on HealthLock",
      description:
        "Access our public APIs, SDKs, and join our community to contribute to the future of decentralized healthcare innovation.",
      links: [
        "HealthLock API Reference",
        "HealthLock SDKs",
        "Contributing to HealthLock",
      ],
    },
  ];

  const resources: Resource[] = [
    {
      icon: <FileText className="res-icon" />,
      title: "Whitepapers & Technical Docs",
      items: [
        "HealthLock Whitepaper: A Web3 Healthcare Architecture Deep Dive",
        "Data Storage & Signal Encryption Explained",
      ],
    },
    {
      icon: <FileText className="res-icon" />,
      title: "Case Studies",
      items: [
        "Case Study: Reducing Prescription Fraud",
        "Case Study: Seamless Patient Referrals",
      ],
    },
    {
      icon: <PlayCircle className="res-icon" />,
      title: "Videos & Webinars",
      items: [
        "Webinar: The Future of Health Data on Sui",
        "Developer Livestream: Integrating with HealthLock",
      ],
    },
  ];

  return (
    <>
      <NavBar />
      <div className="learnmore-page">
        <section className="learn-header">
          <h2>
            Dive Deeper into <span>HealthLock</span>
          </h2>
          <p>
            Explore our detailed guides, whitepapers, and technical specifications. Whether
            you're a healthcare professional, tech enthusiast, or privacy advocate, our
            resources help you understand how HealthLock works — and how to build with it.
          </p>
        </section>

        <section className="learn-grid">
          {learnCards.map((card, index) => (
            <div key={index} className="learn-card">
              <div className="learn-icon-wrap">{card.icon}</div>
              <h4>{card.title}</h4>
              <p>{card.description}</p>
              <ul>
                {card.links.map((link, i) => (
                  <li key={i}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="resources-section">
          <h3>Featured Resources</h3>
          <div className="resources-grid">
            {resources.map((res, index) => (
              <div key={index} className="resource-card">
                <div className="res-header">
                  {res.icon}
                  <h4>{res.title}</h4>
                </div>
                <ul>
                  {res.items.map((item, i) => (
                    <li key={i}>
                      <a href="#">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="learnmore-buttons">
            <button className="glossary-btn">
              <BookOpen className="btn-icon" />
              Glossary
            </button>
            <button className="contact-btn">
              <Mail className="btn-icon" />
              Contact Us
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default LearnMore;

