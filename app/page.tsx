"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

        :root {
          --cream: #FBF8F4;
          --cream-dark: #F3EDE4;
          --ink: #1A1715;
          --ink-light: #4A4640;
          --ink-muted: #8A857E;
          --rose: #C4686D;
          --rose-light: #E8A5A8;
          --rose-pale: #F5DEDE;
          --gold: #C6A96C;
          --gold-light: #E8D5A8;
          --sage: #7A8F7A;
          --sage-light: #B5C5B5;
          --white: #FFFFFF;
          --shadow-sm: 0 1px 3px rgba(26,23,21,0.06);
          --shadow-md: 0 4px 16px rgba(26,23,21,0.08);
          --shadow-lg: 0 12px 40px rgba(26,23,21,0.12);
          --radius: 12px;
          --radius-lg: 20px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--ink);
          line-height: 1.6;
          overflow-x: hidden;
        }
        .serif { font-family: 'Playfair Display', serif; }

        /* NAV */
        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          backdrop-filter: blur(20px);
          background: rgba(251,248,244,0.85);
          border-bottom: 1px solid rgba(26,23,21,0.05);
          transition: all 0.3s ease;
        }
        .nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          font-weight: 600;
          color: var(--ink);
          text-decoration: none;
          letter-spacing: -0.02em;
        }
        .nav-logo span { color: var(--rose); }
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-links a {
          text-decoration: none;
          color: var(--ink-light);
          font-size: 0.92rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--ink); }

        /* BUTTONS */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 50px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          border: none;
        }
        .btn-primary {
          background: var(--ink);
          color: var(--cream);
        }
        .btn-primary:hover {
          background: var(--ink-light);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .btn-secondary {
          background: transparent;
          color: var(--ink);
          border: 1.5px solid var(--ink);
        }
        .btn-secondary:hover {
          background: var(--ink);
          color: var(--cream);
        }
        .btn-rose {
          background: var(--rose);
          color: var(--white);
        }
        .btn-rose:hover {
          background: #B35A5F;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(196,104,109,0.3);
        }
        .btn-large { padding: 16px 36px; font-size: 1.05rem; }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 120px 40px 80px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -200px;
          right: -200px;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, var(--rose-pale) 0%, transparent 70%);
          opacity: 0.5;
          z-index: 0;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -100px;
          left: -100px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--gold-light) 0%, transparent 70%);
          opacity: 0.3;
          z-index: 0;
        }
        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .hero-content { animation: fadeInUp 0.8s ease-out; }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--rose-pale);
          color: var(--rose);
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 28px;
          letter-spacing: 0.02em;
        }
        .hero-badge::before { content: '✦'; font-size: 0.7rem; }
        .hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.8rem, 5vw, 4rem);
          line-height: 1.12;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
          color: var(--ink);
        }
        .hero h1 em { color: var(--rose); font-style: italic; }
        .hero-subtitle {
          font-size: 1.15rem;
          color: var(--ink-light);
          line-height: 1.7;
          margin-bottom: 36px;
          max-width: 480px;
        }
        .hero-ctas { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 48px; }
        .hero-stats { display: flex; gap: 40px; }
        .hero-stat { text-align: left; }
        .hero-stat-number {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--ink);
        }
        .hero-stat-label {
          font-size: 0.82rem;
          color: var(--ink-muted);
          font-weight: 500;
        }
        .hero-visual {
          position: relative;
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }

        /* MOCK UI */
        .mock-ui {
          background: var(--white);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          border: 1px solid rgba(26,23,21,0.06);
        }
        .mock-ui-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--cream-dark);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mock-ui-title { font-weight: 600; font-size: 0.95rem; }
        .mock-ui-dot {
          width: 8px;
          height: 8px;
          background: var(--sage);
          border-radius: 50%;
          display: inline-block;
        }
        .mock-ui-body { padding: 24px; }
        .mock-booking-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: var(--radius);
          background: var(--cream);
          margin-bottom: 12px;
          transition: transform 0.2s;
        }
        .mock-booking-item:hover { transform: translateX(4px); }
        .mock-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--white);
        }
        .mock-booking-info { flex: 1; }
        .mock-booking-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; }
        .mock-booking-service { font-size: 0.8rem; color: var(--ink-muted); }
        .mock-booking-time { font-size: 0.85rem; font-weight: 600; color: var(--sage); }
        .mock-revenue-bar {
          margin-top: 20px;
          padding: 20px;
          background: linear-gradient(135deg, var(--ink) 0%, #2A2520 100%);
          border-radius: var(--radius);
          color: var(--cream);
        }
        .mock-revenue-label { font-size: 0.78rem; opacity: 0.7; margin-bottom: 4px; }
        .mock-revenue-amount { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; }
        .mock-revenue-note { font-size: 0.75rem; color: var(--sage-light); margin-top: 4px; }

        /* COMMISSION */
        .commission {
          padding: 100px 40px;
          background: var(--ink);
          color: var(--cream);
          position: relative;
          overflow: hidden;
        }
        .commission::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background:
            radial-gradient(ellipse at 20% 50%, rgba(196,104,109,0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(198,169,108,0.1) 0%, transparent 60%);
        }
        .commission-inner {
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .commission h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .commission h2 em { color: var(--rose-light); font-style: italic; }
        .commission-subtitle {
          font-size: 1.1rem;
          color: rgba(251,248,244,0.7);
          max-width: 600px;
          margin: 0 auto 60px;
          line-height: 1.7;
        }
        .commission-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 48px;
        }
        .commission-card {
          padding: 36px 28px;
          border-radius: var(--radius-lg);
          text-align: center;
        }
        .commission-card.competitor {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .commission-card.hera {
          background: linear-gradient(135deg, var(--rose) 0%, #D4787D 100%);
          border: 1px solid rgba(255,255,255,0.2);
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(196,104,109,0.3);
        }
        .commission-card-brand {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 16px;
          opacity: 0.7;
        }
        .commission-card.hera .commission-card-brand { opacity: 1; }
        .commission-card-rate {
          font-family: 'Playfair Display', serif;
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .commission-card-desc {
          font-size: 0.85rem;
          opacity: 0.6;
          line-height: 1.5;
        }
        .commission-card.hera .commission-card-desc { opacity: 0.9; }
        .commission-calc {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 600px;
          margin: 0 auto;
        }
        .commission-calc-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--gold-light);
        }
        .commission-calc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.95rem;
        }
        .commission-calc-row:last-child {
          border-bottom: none;
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--rose-light);
        }

        /* HOW IT WORKS */
        .how-it-works { padding: 100px 40px; }
        .section-inner { max-width: 1100px; margin: 0 auto; }
        .section-label {
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--rose);
          margin-bottom: 12px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }
        .section-subtitle {
          font-size: 1.05rem;
          color: var(--ink-light);
          max-width: 550px;
          line-height: 1.7;
          margin-bottom: 60px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        .step {
          position: relative;
          padding: 36px;
          background: var(--white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--cream-dark);
          transition: all 0.3s ease;
        }
        .step:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }
        .step-number {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--rose);
          margin-bottom: 20px;
          border: 2px solid var(--rose-pale);
        }
        .step h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 10px; }
        .step p { font-size: 0.92rem; color: var(--ink-light); line-height: 1.6; }

        /* FEATURES */
        .features {
          padding: 100px 40px;
          background: var(--white);
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .feature-card {
          padding: 40px;
          border-radius: var(--radius-lg);
          background: var(--cream);
          border: 1px solid var(--cream-dark);
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
        }
        .feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          margin-bottom: 20px;
        }
        .feature-card:nth-child(1) .feature-icon { background: var(--rose-pale); }
        .feature-card:nth-child(2) .feature-icon { background: var(--gold-light); }
        .feature-card:nth-child(3) .feature-icon { background: var(--sage-light); }
        .feature-card:nth-child(4) .feature-icon { background: #D4D0F8; }
        .feature-card:nth-child(5) .feature-icon { background: #F8D4C8; }
        .feature-card:nth-child(6) .feature-icon { background: #C8E8F8; }
        .feature-card h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 10px; }
        .feature-card p { font-size: 0.92rem; color: var(--ink-light); line-height: 1.6; }

        /* COMPARISON */
        .comparison { padding: 100px 40px; }
        .comparison-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: var(--white);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .comparison-table thead th {
          padding: 24px 28px;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ink-muted);
          border-bottom: 2px solid var(--cream-dark);
        }
        .comparison-table thead th.hera-col {
          background: var(--rose);
          color: var(--white);
          border-bottom: 2px solid var(--rose);
        }
        .comparison-table tbody td {
          padding: 18px 28px;
          font-size: 0.92rem;
          border-bottom: 1px solid var(--cream-dark);
          color: var(--ink-light);
        }
        .comparison-table tbody td.hera-col {
          background: var(--rose-pale);
          color: var(--ink);
          font-weight: 600;
        }
        .comparison-table tbody tr:last-child td { border-bottom: none; }
        .check { color: var(--sage); font-weight: bold; }
        .cross { color: var(--rose); }

        /* PRICING */
        .pricing {
          padding: 100px 40px;
          background: var(--white);
        }
        .pricing-card {
          max-width: 500px;
          margin: 0 auto;
          background: var(--cream);
          border-radius: var(--radius-lg);
          padding: 48px;
          text-align: center;
          border: 2px solid var(--rose-pale);
          position: relative;
          overflow: hidden;
        }
        .pricing-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--rose), var(--gold));
        }
        .pricing-early-badge {
          display: inline-block;
          background: var(--rose);
          color: var(--white);
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 24px;
          letter-spacing: 0.03em;
        }
        .pricing-amount {
          font-family: 'Playfair Display', serif;
          font-size: 3.5rem;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 4px;
        }
        .pricing-period {
          color: var(--ink-muted);
          font-size: 0.95rem;
          margin-bottom: 32px;
        }
        .pricing-features {
          list-style: none;
          text-align: left;
          margin-bottom: 36px;
        }
        .pricing-features li {
          padding: 10px 0;
          font-size: 0.95rem;
          color: var(--ink-light);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pricing-features li::before {
          content: '✓';
          color: var(--sage);
          font-weight: 700;
          font-size: 1rem;
        }

        /* TESTIMONIALS */
        .testimonials { padding: 100px 40px; }
        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
        }
        .testimonial-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 36px;
          border: 1px solid var(--cream-dark);
        }
        .testimonial-stars {
          color: var(--gold);
          font-size: 1rem;
          margin-bottom: 16px;
          letter-spacing: 2px;
        }
        .testimonial-text {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--ink-light);
          margin-bottom: 20px;
          font-style: italic;
        }
        .testimonial-author { display: flex; align-items: center; gap: 12px; }
        .testimonial-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--white);
        }
        .testimonial-name { font-weight: 600; font-size: 0.9rem; }
        .testimonial-role { font-size: 0.8rem; color: var(--ink-muted); }

        /* CTA */
        .cta-section {
          padding: 100px 40px;
          background: linear-gradient(135deg, var(--ink) 0%, #2A2520 100%);
          color: var(--cream);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(196,104,109,0.15) 0%, transparent 70%);
        }
        .cta-inner {
          max-width: 650px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .cta-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 2.8rem);
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .cta-section p {
          color: rgba(251,248,244,0.7);
          font-size: 1.05rem;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .cta-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        .cta-contact { font-size: 0.9rem; color: rgba(251,248,244,0.5); }
        .cta-contact a { color: var(--rose-light); text-decoration: none; }
        .cta-contact a:hover { text-decoration: underline; }

        /* FOOTER */
        .landing-footer {
          padding: 40px;
          text-align: center;
          color: var(--ink-muted);
          font-size: 0.85rem;
          background: var(--cream);
          border-top: 1px solid var(--cream-dark);
        }
        .landing-footer a { color: var(--ink-light); text-decoration: none; }

        /* ANIMATIONS */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(24px);
          transition: all 0.6s ease-out;
        }
        .animate-on-scroll.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .landing-nav { padding: 16px 20px; }
          .nav-links a:not(.btn) { display: none; }
          .hero { padding: 100px 20px 60px; }
          .hero-inner { grid-template-columns: 1fr; gap: 48px; }
          .hero-visual { order: -1; }
          .hero-stats { gap: 24px; }
          .commission-grid { grid-template-columns: 1fr; max-width: 360px; margin: 0 auto 48px; }
          .commission-card.hera { transform: scale(1); }
          .steps { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns: 1fr; }
          .comparison-table { font-size: 0.85rem; }
          .comparison-table thead th, .comparison-table tbody td { padding: 14px 16px; }
          .testimonial-grid { grid-template-columns: 1fr; }
          .section-inner, .commission-inner, .how-it-works, .features, .comparison, .pricing, .testimonials {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
        @media (max-width: 500px) {
          .hero h1 { font-size: 2.2rem; }
          .hero-ctas { flex-direction: column; }
          .hero-ctas .btn { text-align: center; justify-content: center; }
          .cta-buttons { flex-direction: column; align-items: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="landing-nav">
        <Link href="/" className="nav-logo">hera<span>.</span></Link>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#compare">Compare</a>
          <Link href="/signup" className="btn btn-primary">Get Started Free</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge">Early Access — Free for Salons</div>
            <h1>Keep <em>100%</em> of your booking revenue</h1>
            <p className="hero-subtitle">
              The booking platform built for independent salons. Zero commission, zero per-booking fees.
              Unlike Treatwell or Fresha, Hera works for your business — not against it.
            </p>
            <div className="hero-ctas">
              <Link href="/signup" className="btn btn-rose btn-large">Start Free →</Link>
              <a href="#how-it-works" className="btn btn-secondary btn-large">See How It Works</a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-number">0%</div>
                <div className="hero-stat-label">Commission</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-number">24/7</div>
                <div className="hero-stat-label">Online Booking</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-number">5 min</div>
                <div className="hero-stat-label">Setup Time</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="mock-ui">
              <div className="mock-ui-header">
                <span className="mock-ui-title">Today&apos;s Bookings</span>
                <span className="mock-ui-dot"></span>
              </div>
              <div className="mock-ui-body">
                <div className="mock-booking-item">
                  <div className="mock-avatar" style={{ background: 'var(--rose)' }}>SC</div>
                  <div className="mock-booking-info">
                    <div className="mock-booking-name">Sophie Chen</div>
                    <div className="mock-booking-service">Gel Manicure + Nail Art</div>
                  </div>
                  <div className="mock-booking-time">10:00</div>
                </div>
                <div className="mock-booking-item">
                  <div className="mock-avatar" style={{ background: 'var(--sage)' }}>EM</div>
                  <div className="mock-booking-info">
                    <div className="mock-booking-name">Emma Miller</div>
                    <div className="mock-booking-service">Full Set Acrylic</div>
                  </div>
                  <div className="mock-booking-time">11:30</div>
                </div>
                <div className="mock-booking-item">
                  <div className="mock-avatar" style={{ background: 'var(--gold)' }}>LT</div>
                  <div className="mock-booking-info">
                    <div className="mock-booking-name">Lisa Thompson</div>
                    <div className="mock-booking-service">Pedicure + Gel Polish</div>
                  </div>
                  <div className="mock-booking-time">13:00</div>
                </div>
                <div className="mock-revenue-bar">
                  <div className="mock-revenue-label">Today&apos;s Revenue</div>
                  <div className="mock-revenue-amount">£385.00</div>
                  <div className="mock-revenue-note">✦ You keep 100% — £0 commission</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMISSION COMPARISON */}
      <section className="commission" id="compare">
        <div className="commission-inner">
          <p className="section-label" style={{ color: 'var(--rose-light)' }}>Why Switch to Hera</p>
          <h2>Stop giving away <em>your hard-earned money</em></h2>
          <p className="commission-subtitle">
            Other platforms take up to 35% of every booking. That&apos;s money from YOUR work going to THEIR shareholders. Hera changes that.
          </p>

          <div className="commission-grid">
            <div className="commission-card competitor">
              <div className="commission-card-brand">Treatwell</div>
              <div className="commission-card-rate">25-35%</div>
              <div className="commission-card-desc">Commission per booking from marketplace</div>
            </div>
            <div className="commission-card hera">
              <div className="commission-card-brand">Hera Booking</div>
              <div className="commission-card-rate">0%</div>
              <div className="commission-card-desc">Zero commission. Ever. Your clients, your revenue.</div>
            </div>
            <div className="commission-card competitor">
              <div className="commission-card-brand">Fresha</div>
              <div className="commission-card-rate">20%</div>
              <div className="commission-card-desc">Commission on new clients from marketplace</div>
            </div>
          </div>

          <div className="commission-calc">
            <div className="commission-calc-title">💰 Your Savings with Hera (Example)</div>
            <div className="commission-calc-row">
              <span>Monthly bookings via platform</span>
              <span>100 bookings</span>
            </div>
            <div className="commission-calc-row">
              <span>Average booking value</span>
              <span>£45</span>
            </div>
            <div className="commission-calc-row">
              <span>Treatwell commission (25%)</span>
              <span style={{ color: 'var(--rose-light)' }}>-£1,125/month</span>
            </div>
            <div className="commission-calc-row">
              <span>You save with Hera</span>
              <span>£1,125/month = £13,500/year</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-inner">
          <p className="section-label">How It Works</p>
          <h2 className="section-title">Up and running in minutes</h2>
          <p className="section-subtitle">
            No tech skills needed. No complicated setup. Just sign up and start accepting bookings.
          </p>

          <div className="steps">
            <div className="step animate-on-scroll">
              <div className="step-number">1</div>
              <h3>Create your salon</h3>
              <p>Sign up free, add your services, staff, and working hours. Your personalised booking page is ready instantly.</p>
            </div>
            <div className="step animate-on-scroll">
              <div className="step-number">2</div>
              <h3>Share your booking link</h3>
              <p>Get a custom link like <strong>yoursalon.herabooking.com</strong> — share it on Instagram, WhatsApp, Google, or your website.</p>
            </div>
            <div className="step animate-on-scroll">
              <div className="step-number">3</div>
              <h3>Manage & grow</h3>
              <p>Clients book 24/7, you get instant notifications and email confirmations. Focus on your craft, not admin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-inner">
          <p className="section-label">Features</p>
          <h2 className="section-title">Everything your salon needs</h2>
          <p className="section-subtitle">
            Powerful tools designed specifically for independent salons and beauty businesses.
          </p>

          <div className="features-grid">
            <div className="feature-card animate-on-scroll">
              <div className="feature-icon">📅</div>
              <h3>24/7 Online Booking</h3>
              <p>Your clients book anytime — even at midnight. No more missed calls or back-and-forth messages on WhatsApp.</p>
            </div>
            <div className="feature-card animate-on-scroll">
              <div className="feature-icon">👥</div>
              <h3>Staff Management</h3>
              <p>Each staff member gets their own schedule, services, and availability. Clients choose who they want.</p>
            </div>
            <div className="feature-card animate-on-scroll">
              <div className="feature-icon">✉️</div>
              <h3>Automatic Confirmations</h3>
              <p>Instant email confirmations and reminders reduce no-shows and keep your clients informed.</p>
            </div>
            <div className="feature-card animate-on-scroll">
              <div className="feature-icon">💜</div>
              <h3>Your Brand, Your Page</h3>
              <p>White-label booking page with your salon name, your colours. Clients see YOUR brand, not ours.</p>
            </div>
            <div className="feature-card animate-on-scroll">
              <div className="feature-icon">🏷️</div>
              <h3>Smart Off-Peak Pricing</h3>
              <p>Fill quiet hours automatically with special pricing. Turn empty slots into revenue.</p>
            </div>
            <div className="feature-card animate-on-scroll">
              <div className="feature-icon">📊</div>
              <h3>Simple Dashboard</h3>
              <p>See today&apos;s bookings, revenue, and client info at a glance. No complicated menus or hidden settings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="comparison">
        <div className="section-inner">
          <p className="section-label">Compare</p>
          <h2 className="section-title">Hera vs. the competition</h2>
          <p className="section-subtitle">See why salon owners are switching to Hera.</p>

          <table className="comparison-table animate-on-scroll">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="hera-col">Hera</th>
                <th>Treatwell</th>
                <th>Fresha</th>
                <th>Setmore</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Commission</td>
                <td className="hera-col"><span className="check">0%</span></td>
                <td>25-35%</td>
                <td>20%</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>Monthly Fee</td>
                <td className="hera-col">Free*</td>
                <td>From £29</td>
                <td>Free</td>
                <td>From $19</td>
              </tr>
              <tr>
                <td>Your Own Branding</td>
                <td className="hera-col"><span className="check">✓ Full</span></td>
                <td><span className="cross">✗</span> Treatwell branded</td>
                <td><span className="cross">✗</span> Fresha branded</td>
                <td>Partial</td>
              </tr>
              <tr>
                <td>Own Your Client Data</td>
                <td className="hera-col"><span className="check">✓ 100%</span></td>
                <td><span className="cross">✗</span> Shared</td>
                <td><span className="cross">✗</span> Shared</td>
                <td><span className="check">✓</span></td>
              </tr>
              <tr>
                <td>Custom Domain</td>
                <td className="hera-col"><span className="check">✓</span></td>
                <td><span className="cross">✗</span></td>
                <td><span className="cross">✗</span></td>
                <td><span className="cross">✗</span></td>
              </tr>
              <tr>
                <td>Staff Management</td>
                <td className="hera-col"><span className="check">✓</span></td>
                <td><span className="check">✓</span></td>
                <td><span className="check">✓</span></td>
                <td><span className="check">✓</span></td>
              </tr>
              <tr>
                <td>No Hidden Fees</td>
                <td className="hera-col"><span className="check">✓</span></td>
                <td><span className="cross">✗</span></td>
                <td><span className="cross">✗</span></td>
                <td><span className="check">✓</span></td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 16, textAlign: 'center' }}>* Free during early access period. Affordable plans coming soon.</p>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <p className="section-label">Pricing</p>
          <h2 className="section-title">Simple, honest pricing</h2>
          <p className="section-subtitle" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            No commission. No per-booking fees. No surprises.
          </p>

          <div className="pricing-card">
            <div className="pricing-early-badge">🎉 Early Access</div>
            <div className="pricing-amount">FREE</div>
            <div className="pricing-period">For a limited time — be one of our first partner salons</div>
            <ul className="pricing-features">
              <li>Unlimited bookings</li>
              <li>Unlimited staff members</li>
              <li>Custom booking page (yoursalon.herabooking.com)</li>
              <li>Email confirmations & reminders</li>
              <li>Staff management & scheduling</li>
              <li>Off-peak smart pricing</li>
              <li>Full client data ownership</li>
              <li>Priority support via WhatsApp</li>
            </ul>
            <Link href="/signup" className="btn btn-rose btn-large" style={{ width: '100%', justifyContent: 'center' }}>Claim Your Free Spot →</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="section-inner">
          <p className="section-label">What Salon Owners Say</p>
          <h2 className="section-title">Built by a salon owner, for salon owners</h2>
          <p className="section-subtitle">
            Hera was created by a nail salon owner in London who was tired of paying thousands in commission every year.
          </p>

          <div className="testimonial-grid">
            <div className="testimonial-card animate-on-scroll">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                &ldquo;I was paying Treatwell over £800 a month in commission alone. With Hera, I keep every penny.
                The setup took me 10 minutes and my clients love how easy it is to book.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'var(--rose)' }}>VN</div>
                <div>
                  <div className="testimonial-name">Victoria Nail Bar</div>
                  <div className="testimonial-role">Battersea, London</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card animate-on-scroll">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                &ldquo;Finally a booking system that doesn&apos;t steal my clients. My booking page looks like MY brand,
                and I own all my client data. This is how it should be.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'var(--sage)' }}>ES</div>
                <div>
                  <div className="testimonial-name">Early Partner Salon</div>
                  <div className="testimonial-role">London</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready to keep 100% of your revenue?</h2>
          <p>
            Join our early access programme. Set up your salon in minutes,
            start accepting bookings today, and stop paying commission forever.
          </p>
          <div className="cta-buttons">
            <Link href="/signup" className="btn btn-rose btn-large">Get Started Free →</Link>
            <a href="mailto:hello@herabooking.com" className="btn btn-secondary btn-large" style={{ borderColor: 'rgba(251,248,244,0.3)', color: 'var(--cream)' }}>Contact Us</a>
          </div>
          <p className="cta-contact">
            Questions? Email <a href="mailto:hello@herabooking.com">hello@herabooking.com</a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.2rem' }}>hera<span style={{ color: 'var(--rose)' }}>.</span></Link>
        </p>
        <p style={{ marginTop: 12 }}>
          © 2026 Hera Booking. All rights reserved. Built with ♥ in London.
        </p>
      </footer>
    </>
  );
}
