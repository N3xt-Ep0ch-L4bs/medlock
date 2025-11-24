import React from "react";
import "./about.css";
import NavBar from "../components/navbar";
import aboutImg from "../assets/div1.png";
const About = () => {
  return (
    <>
    <NavBar />
    <div className="about-page">
        
      <section className="about-intro">
        <h2>About <span>HealthLock</span></h2>
        <p>Your secure portal to decentralized healthcare.</p>

        <div className="about-content">
          <div className="about-text">
            <p>
              HealthLock was founded on the principle that healthcare data belongs solely
              to the patient. In an era where information is power, we empower individuals
              by giving them complete control, transparency, and security over their most
              sensitive data: their health records.
            </p>
            <p>
              Our platform leverages cutting-edge blockchain technology to ensure that
              every patient interaction — from uploading a lab result to a doctor prescribing
              medication — is secure, traceable, and most importantly, patient-controlled.
              We believe in a future where trust is inherent in every digital health interaction.
            </p>
          </div>

          <div className="about-image">
            <img src={aboutImg} alt="HealthLock network graphic" />
          </div>
        </div>
      </section>

      <section className="mission-vision">
        <h3>Our Mission & Vision</h3>
        <div className="mv-cards">
          <div className="mv-card">
            <h4>Our Mission</h4>
            <p>
              To revolutionize healthcare by providing a secure, patient-centric
              platform where data is owned, controlled, and shared transparently by
              the individual, powered by cutting-edge blockchain technology.
            </p>
          </div>
          <div className="mv-card">
            <h4>Our Vision</h4>
            <p>
              A future where every patient is an informed and empowered participant
              in their healthcare journey, free from data silos, opaque practices, and
              privacy concerns.
            </p>
          </div>
        </div>
      </section>

      <section className="difference">
        <h3>How We're Different</h3>
        <div className="diff-cards">
          <div className="diff-card">
            <i className="icon">👤</i>
            <h4>Patient-Owned Data</h4>
            <p>
              Unlike traditional institutions, your data is truly yours—not your
              insurer, not your lab, not an institution. You are the sole controller.
            </p>
          </div>

          <div className="diff-card">
            <i className="icon">🔗</i>
            <h4>Blockchain Security</h4>
            <p>
              Every action is logged into the full blockchain, creating an immutable and
              auditable trail that can't be altered.
            </p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default About;

