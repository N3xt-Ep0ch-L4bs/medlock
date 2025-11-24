import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Logo from "../assets/logo.png";
import HeroImage from "../assets/hero.png";
import PatientLogo from "../assets/patient.png";
import DoctorLogo from "../assets/doctor.png";
import PharmacyLogo from "../assets/pharmacy.png";
import SecureCircle from "../assets/secure-cir.png";
import VerifiedLogo from "../assets/verified.png";
import ValidLogo from "../assets/valid.png";
import DoctorIcon from "../assets/doctoricon.png";
import PharmacyIcon from "../assets/pharmacyicon.png";
import SecureIcon from "../assets/secure.png";
import FilesIcon from "../assets/files.png";
import SuiLogo from "../assets/sui.png";
import SealLogo from "../assets/seal.png";
import WalrusLogo from "../assets/walrus.png";
import "./pages.css";
import { useEffect } from "react";



function LandingPage() {useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".role-card, .how-card, .review-card, .transform-card, .powered-card, section").forEach((el) => {
    observer.observe(el);
  });

  return () => observer.disconnect();
}, []);
  const navigate = useNavigate();
  return (
    <>
    <Navbar />
      <section className="hero">
        <div className="hero-content">
          <h1>Your health. Your <br />data. Your rules.</h1>
          <p>
            Secure, blockchain-powered healthcare platform<br />
            giving you complete control over your medical records,<br />
            prescriptions, and care coordination.
          </p>
          <button onClick={() => navigate("/login")} className="start-btn">
            Get Started
          </button>
          <button onClick={() => navigate("/learnmore")} className="learn-btn">Learn More</button>
        </div>
        <div className="hero-img">
          <img src={HeroImage} alt="animation" />
        </div>
      </section>

      <section className="role">
        <h2>Choose Your Role</h2>
        <p>
          Sign in to your MedLock account based on your role in the healthcare
          ecosystem
        </p>

        <div onClick={() => navigate("/login")} className="role-cards">
          <div className="role-card patient">
            <img src={PatientLogo} alt="Patient" />
            <h4>Patient</h4>
            <p>
              Manage your health records securely and control who has access to
              your medical data.
            </p>
            <button>Sign In as a Patient</button>
          </div>

          <div className="role-card doctor">
            <img src={DoctorLogo} alt="Doctor" />
            <h4>Doctor</h4>
            <p>
              View patient data with permission and create verified medical
              prescriptions.
            </p>
            <button>Sign In as a Doctor</button>
          </div>

          <div className="role-card pharmacy">
            <img src={PharmacyLogo} alt="Pharmacy" />
            <h4>Pharmacy</h4>
            <p>
              Verify and dispense prescriptions with blockchain-verified
              authenticity.
            </p>
            <button>Sign In as a Pharmacy</button>
          </div>
        </div>
        </section>

        <section className="how">
            <h2>How MedLock works</h2>
            <p>Three core pillars of Decentralised healthcare Data management.</p>
            <div className="how-cards">
                <div className="how-card records">
                    <img src={SecureCircle} />
                    <h4>Private Health Records</h4>
                    <p>
                        Your medical records are encrypted end-to-end and stored securely
                        on Walrus. Only you control access permissions, with 
                        cryptographic proof of every interaction.
                    </p>
                </div>
                <div className="how-card prescriptions">
                    <img src={VerifiedLogo} />
                    <h4>Doctor-verified Precriptions</h4>
                    <p>Prescriptions are digitally signed by licensed 
                        doctors and recorded on-chain, creating an immutable audit trail that 
                        prevents fraud and ensures authenticity.</p>
                </div>
                <div className="how-card validation">
                    <img src={ValidLogo} />
                    <h4>Pharmacy Validation</h4>
                    <p>Pharmacies verify prescriptions instantly using blockchain validation,
                        marking them as dispensed with full transparency 
                        and traceability for all parties.</p>
                </div>
            </div>
        </section>
        <section className="review">
    <h2>Trusted by Patients and Providers</h2>
    
    <div className="review-cards">
        <div className="review-card">
        <div className="stars">★★★★★</div>
        <p>
            "Finally, I have complete control over my medical records. Sharing with specialists is instant and secure."
        </p>
        <div className="reviewer">
            <img src={PatientLogo} alt="Sarah Martinez" />
            <div>
            <h4>Sarah Martinez</h4>
            <span>Patient, Los Angeles</span>
            </div>
        </div>
        </div>

        <div className="review-card">
        <div className="stars">★★★★★</div>
        <p>
            "HealthLock streamlines my practice. Accessing patient history is fast, and prescriptions are tamper-proof."
        </p>
        <div className="reviewer">
            <img src={DoctorIcon} alt="Dr. James Chen" />
            <div>
            <h4>Dr. James Chen, MD</h4>
            <span>Cardiologist, Boston Medical</span>
            </div>
        </div>
        </div>

        <div className="review-card">
        <div className="stars">★★★★★</div>
        <p>
            "Prescription verification is instantaneous. We've eliminated fraud and our patients appreciate the transparency."
        </p>
        <div className="reviewer">
            <img src={PharmacyIcon} alt="Maria Rodriguez" />
            <div>
            <h4>Maria Rodriguez, PharmD</h4>
            <span>Lead Pharmacist, CVS</span>
            </div>
        </div>
        </div>
    </div>
    </section>
    <section className="actives">
        <div className="patients">
            <h2>50K+</h2>
            <p>Active Patients</p>
        </div>
        <div className="patients">
            <h2>2,500+</h2>
            <p>Healthcare Providers</p>
        </div>
        <div className="patients">
            <h2>1M+</h2>
            <p>Records Secure</p>
        </div>
        <div className="patients">
            <h2>99.9%</h2>
            <p>Uptime Guaratee</p>
        </div>
    </section>
    <section className="transform">
    <h2>Transform Your Healthcare Experience</h2>

    <div className="transform-cards">

        <div className="transform-card before">
        <h4>❌ Before HealthLock</h4>
        <img src={FilesIcon} alt="Before HealthLock" />
        <ul>
            <li>✖ Lost medical records</li>
            <li>✖ No control over data</li>
            <li>✖ Privacy concerns</li>
            <li>✖ Provider friction</li>
            <li>✖ Prescription errors</li>
            <li>✖ Limited access</li>
        </ul>
        </div>

        <div className="transform-arrow">
        <span>🡲</span>
        </div>

        <div className="transform-card after">
        <h4> After MedLock</h4>
        <img src={SecureIcon} alt="After HealthLock" />
        <ul>
            <li>✔ Always accessible records</li>
            <li>✔ Complete data control</li>
            <li>✔ Bank-grade security</li>
            <li>✔ Seamless provider sharing</li>
            <li>✔ Verified prescriptions</li>
            <li>✔ 24/7 availability</li>
        </ul>
        </div>
    </div>
    </section>
    <section className="control">
        <h2>Take Control of Your Health Data Today </h2>
        <p>Join thousands of patients, doctors, and pharmacies using HealthLock</p>
        <button className="control-button">Get Started for free</button>
        <p>No credit card required • Set up in 2 minutes</p>
        </section>
        <section className="powered">
            <h2>POWERED BY LEADING WEB3 INFRASTRUCTURE</h2>
            <div className="powered-cards">
                <div className="powered-card">
                    <img src={SuiLogo} />
                    <p>Sui Blockchain</p>
                </div>
                <div className="powered-card">
                    <img src={SealLogo} />
                    <p>Encrypted with Seal</p>
                </div>
                <div className="powered-card">
                    <img src={WalrusLogo} />
                    <p>Stored on Walrus</p>
                </div>
            </div>
        </section>
        <footer className="footer">
        <div className="footer-content">
            <div className="footer-brand">
            <div className="footer-logo">
                <img src={Logo} alt="MedLock Logo" />
                <h3>MedLock</h3>
            </div>
            <p>
                Decentralized healthcare platform giving patients complete control
                over their medical data.
            </p>
            </div>

            <div className="footer-links">
            <div className="footer-column">
                <h4>Product</h4>
                <ul>
                <li><a href="#">Features</a></li>
                <li><a href="#">How It Works</a></li>
                <li><a href="#">Security</a></li>
                <li><a href="#">Pricing</a></li>
                </ul>
            </div>

            <div className="footer-column">
                <h4>Company</h4>
                <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
                </ul>
            </div>

            <div className="footer-column">
                <h4>Legal</h4>
                <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">HIPAA Compliance</a></li>
                <li><a href="#">Support</a></li>
                </ul>
            </div>
            </div>
        </div>

        <div className="footer-bottom">
            <p>MedLock © 2024 - Decentralized Healthcare. All rights reserved.</p>
        </div>
    </footer>
</>
  )
}

export default LandingPage;

