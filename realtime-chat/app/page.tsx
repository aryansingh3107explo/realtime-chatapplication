'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './providers';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, Sparkles, ArrowRight, Zap, Paperclip, 
  Layout, Search, Shield, User, Star, Sun, Moon, Check,
  ChevronRight, Smile, Heart, Users, Globe, Info, File, Image as ImageIcon, Send, LogOut
} from 'lucide-react';

export default function LandingPage() {
  const { user, theme, setTheme, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simple scroll animation hook/helper
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 50;
        if (isVisible) {
          el.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    // Initial run
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLaunchApp = () => {
    router.push('/chat');
  };

  return (
    <div className="landing-layout">
      {/* 1. Header/Navbar */}
      <header className="landing-navbar">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => router.push('/')}>
            <div className="nav-logo-icon">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="nav-brand-name">Lets Ping</span>
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse-slow" />
          </div>

          {/* Desktop Nav */}
          <nav className="nav-links-desktop">
            <a href="#features">Features</a>
            <a href="#showcase">Showcase</a>
            <a href="#testimonials">Reviews</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="nav-actions-desktop">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="theme-toggle-btn"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user ? (
              <>
                <button onClick={handleLaunchApp} className="nav-cta-btn">
                  <span>Launch App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={signOut} 
                  className="theme-toggle-btn px-3 w-auto gap-1.5"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-semibold">Log Out</span>
                </button>
              </>
            ) : (
              <button onClick={handleLaunchApp} className="nav-cta-btn">
                <span>Launch App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer animate-fade">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#showcase" onClick={() => setMobileMenuOpen(false)}>Showcase</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <div className="drawer-divider"></div>
            <div className="drawer-actions">
              <button
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setMobileMenuOpen(false);
                }}
                className="theme-toggle-btn w-full justify-center gap-2 py-3"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLaunchApp();
                }} 
                className="nav-cta-btn w-full py-3 justify-center"
              >
                <span>Launch App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {user && (
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }} 
                  className="theme-toggle-btn w-full justify-center gap-2 py-3"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-text-container">
            <div className="badge-wrapper animate-on-scroll">
              <span className="hero-badge">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" />
                <span>Next-Gen Chat Experience</span>
              </span>
            </div>
            
            <h1 className="hero-title animate-on-scroll delay-1">
              Real-time chats made <span className="text-gradient">beautiful</span>.
            </h1>
            
            <p className="hero-subtitle animate-on-scroll delay-2">
              Connect instantly, upload image attachments dynamically, and collaborate inside a gorgeous card-based dashboard designed for speed.
            </p>
            
            <div className="hero-buttons animate-on-scroll delay-3">
              <button onClick={handleLaunchApp} className="hero-btn-primary">
                <span>Start Pingin' Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#features" className="hero-btn-secondary">
                <span>Explore Features</span>
              </a>
            </div>

            <div className="hero-users-social animate-on-scroll delay-4">
              <div className="avatar-pile">
                <span style={{ backgroundColor: 'hsl(140, 70%, 45%)' }}>JD</span>
                <span style={{ backgroundColor: 'hsl(210, 70%, 45%)' }}>AM</span>
                <span style={{ backgroundColor: 'hsl(340, 70%, 45%)' }}>KH</span>
              </div>
              <p className="users-social-text">
                Joined by over <strong>1,200+</strong> users in the global lounge.
              </p>
            </div>
          </div>

          {/* Interactive CSS App Mockup */}
          <div className="hero-mockup-container animate-on-scroll delay-2">
            <div className="mockup-frame">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="mockup-search">
                  <Search className="w-3 h-3 opacity-40" />
                  <span>Search conversations...</span>
                </div>
              </div>

              <div className="mockup-body">
                {/* Mock Tab Sidebar */}
                <div className="mock-tab-sidebar">
                  <div className="mock-avatar bg-indigo-600">LP</div>
                  <div className="mock-tab-action active"></div>
                  <div className="mock-tab-action"></div>
                  <div className="mock-tab-action-bottom"></div>
                </div>

                {/* Mock Rooms List */}
                <div className="mock-rooms-list">
                  <div className="mock-section-title">CHANNELS</div>
                  <div className="mock-item active"># general-lounge</div>
                  <div className="mock-item"># design-feedback</div>
                  <div className="mock-item"># tech-stack</div>
                  <div className="mock-section-title mt-4">DIRECT MESSAGES</div>
                  <div className="mock-item dm"><span className="status online"></span> Hardy</div>
                  <div className="mock-item dm"><span className="status online"></span> Aryan</div>
                  <div className="mock-item dm"><span className="status offline"></span> Sarah</div>
                </div>

                {/* Mock Chat Pane */}
                <div className="mock-chat-pane">
                  <div className="mock-chat-header">
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-white"># general-lounge</span>
                      <p className="text-[10px] text-zinc-400">3 online</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center"><Info className="w-3 h-3 text-zinc-600 dark:text-zinc-400" /></div>
                    </div>
                  </div>

                  <div className="mock-messages">
                    <div className="mock-msg other">
                      <div className="mock-msg-avatar">H</div>
                      <div className="mock-msg-bubble">Hey there! Did you check out the new attachment uploads in Lets Ping?</div>
                    </div>
                    <div className="mock-msg me">
                      <div className="mock-msg-bubble">Yes! It is super fast. Look at this screenshot I just sent.</div>
                    </div>
                    <div className="mock-msg other">
                      <div className="mock-msg-avatar bg-indigo-600">A</div>
                      <div className="mock-msg-bubble">
                        <div className="mock-msg-image">
                          <div className="mock-image-placeholder">
                            <Sparkles className="w-5 h-5 text-white/60 animate-pulse-slow" />
                          </div>
                        </div>
                        This looks absolutely amazing! 🚀
                      </div>
                    </div>
                  </div>

                  <div className="mock-composer">
                    <div className="mock-input">
                      <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs text-zinc-400">Reply in general-lounge...</span>
                      <div className="mock-send bg-indigo-600"><Send className="w-3 h-3 text-white" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glowing backgrounds */}
            <div className="glowing-orb-1"></div>
            <div className="glowing-orb-2"></div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="features-section">
        <div className="section-header animate-on-scroll">
          <h2 className="section-title">Designed for modern team chatting</h2>
          <p className="section-subtitle">
            Say goodbye to clunky, heavy messaging apps. Lets Ping gives you the speed and visual clarity you deserve.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="feature-card-title">Real-Time WebSockets</h3>
            <p className="feature-card-desc">
              Experience instant, zero-delay chat synchronization. Messages and online presence lights update the millisecond they occur.
            </p>
          </div>

          <div className="feature-card animate-on-scroll delay-1">
            <div className="feature-icon bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Paperclip className="w-5 h-5" />
            </div>
            <h3 className="feature-card-title">File Attachments</h3>
            <p className="feature-card-desc">
              Upload images and documents directly. View inline thumbnail previews and download documents from a dedicated shared file panel.
            </p>
          </div>

          <div className="feature-card animate-on-scroll delay-2">
            <div className="feature-icon bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Layout className="w-5 h-5" />
            </div>
            <h3 className="feature-card-title">Dribbble Dashboard Layout</h3>
            <p className="feature-card-desc">
              Restructured cards layout with narrow tab selectors, clean room sidebars, centered chat grids, and collapsible workspace drawers.
            </p>
          </div>

          <div className="feature-card animate-on-scroll">
            <div className="feature-icon bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="feature-card-title">Deep Messages Search</h3>
            <p className="feature-card-desc">
              Find exactly what you need with instant keywords filtering. Works immediately inside the room list and the message history.
            </p>
          </div>

          <div className="feature-card animate-on-scroll delay-1">
            <div className="feature-icon bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="feature-card-title">Secure Authentication</h3>
            <p className="feature-card-desc">
              Log in securely via Google OAuth or verified email/password accounts. Your private credentials are never hardcoded or exposed.
            </p>
          </div>

          <div className="feature-card animate-on-scroll delay-2">
            <div className="feature-icon bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="feature-card-title">Global Public Lounge</h3>
            <p className="feature-card-desc">
              Join the general lobby room instantly upon signup. Chat with active users online and test out shared features immediately.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Showcase/Showoff Section */}
      <section id="showcase" className="showcase-section">
        <div className="showcase-container">
          <div className="showcase-image-panel animate-on-scroll">
            <div className="showcase-card-panel">
              {/* Nested Dribbble style chat detail */}
              <div className="nested-detail-card">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white">Active Room Info</span>
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-medium">Lounge</span>
                </div>
                <div className="py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">HS</div>
                    <div>
                      <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Hardy Sharma</h5>
                      <p className="text-[10px] text-zinc-400">Joined 2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">AS</div>
                    <div>
                      <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Aryan Singh</h5>
                      <p className="text-[10px] text-zinc-400">Active Now</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <h6 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">SHARED ATTACHMENTS</h6>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-400"><ImageIcon className="w-4 h-4 opacity-50" /></div>
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-400"><File className="w-4 h-4 opacity-50" /></div>
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-400"><ImageIcon className="w-4 h-4 opacity-50" /></div>
                  </div>
                </div>
              </div>

              {/* Float indicators */}
              <div className="float-pill top-right">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">File Sent Successfully</span>
              </div>

              <div className="float-pill bottom-left">
                <Users className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Hardy is typing...</span>
              </div>
            </div>
          </div>

          <div className="showcase-text-panel animate-on-scroll delay-1">
            <h3 className="showcase-title">A dedicated details panel to stay organized</h3>
            <p className="showcase-desc">
              Lets Ping keeps your workspace neat. Use the toggleable right panel to view current room members and browse all shared files and media without scrolling through thousands of messages.
            </p>
            
            <ul className="showcase-list">
              <li>
                <div className="list-check-icon"><Check className="w-4 h-4" /></div>
                <span>Filter messages instantly based on dynamic queries.</span>
              </li>
              <li>
                <div className="list-check-icon"><Check className="w-4 h-4" /></div>
                <span>Double-check online status with interactive presence indicators.</span>
              </li>
              <li>
                <div className="list-check-icon"><Check className="w-4 h-4" /></div>
                <span>Download shared document attachments with a single click.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Testimonial Section */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-header animate-on-scroll">
          <h2 className="section-title">What our early users say</h2>
          <p className="section-subtitle">
            Developers and designers love Lets Ping's clean layout and zero-latency communication tools.
          </p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card animate-on-scroll">
            <div className="stars">
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
            </div>
            <p className="testimonial-quote">
              "The real-time updates are incredible. I sent an attachment, and my partner saw it instantly without reloading. The cards layout feels so premium!"
            </p>
            <div className="testimonial-author">
              <div className="author-avatar bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold">HS</div>
              <div>
                <h5 className="author-name">Hardy Sharma</h5>
                <p className="author-role">Product Designer</p>
              </div>
            </div>
          </div>

          <div className="testimonial-card animate-on-scroll delay-1">
            <div className="stars">
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
            </div>
            <p className="testimonial-quote">
              "Switching between light and dark modes is seamless. The default light theme looks clean and premium, and the details drawer on the right is extremely practical."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold">AS</div>
              <div>
                <h5 className="author-name">Aryan Singh</h5>
                <p className="author-role">Frontend Engineer</p>
              </div>
            </div>
          </div>

          <div className="testimonial-card animate-on-scroll delay-2">
            <div className="stars">
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
            </div>
            <p className="testimonial-quote">
              "We migrated our team chat to Lets Ping and the speed is night and day compared to standard platforms. The file sharing features and Google OAuth were setup instantly."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold">SM</div>
              <div>
                <h5 className="author-name">Sarah Mitchell</h5>
                <p className="author-role">Operations Lead</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Section (Placeholder but beautiful layout) */}
      <section id="pricing" className="pricing-section">
        <div className="section-header animate-on-scroll">
          <h2 className="section-title">Simple, transparent plans</h2>
          <p className="section-subtitle">Choose the perfect plan for you or your entire team.</p>
        </div>

        <div className="pricing-container">
          <div className="pricing-card animate-on-scroll">
            <h4 className="pricing-plan-name">Global Lounge</h4>
            <div className="pricing-price">
              <span className="price-num">$0</span>
              <span className="price-period">/ forever</span>
            </div>
            <p className="pricing-desc">Perfect for testing out Lets Ping features and chatting globally.</p>
            
            <ul className="pricing-features-list">
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Unlimited real-time messages</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Global Lobby channel access</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Up to 10MB file attachments</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Standard search filtering</span></li>
            </ul>

            <button onClick={handleLaunchApp} className="pricing-btn">
              <span>Join Lounge</span>
            </button>
          </div>

          <div className="pricing-card popular animate-on-scroll delay-1">
            <span className="popular-badge">POPULAR</span>
            <h4 className="pricing-plan-name">Pro Workspace</h4>
            <div className="pricing-price">
              <span className="price-num">$8</span>
              <span className="price-period">/ user / mo</span>
            </div>
            <p className="pricing-desc">Ideal for teams wanting custom private spaces and unlimited uploads.</p>
            
            <ul className="pricing-features-list">
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Everything in Free lounge</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Unlimited custom public channels</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Unlimited direct messages</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Up to 500MB attachment sizes</span></li>
              <li><Check className="w-4 h-4 text-emerald-500" /> <span>Workspace customization & colors</span></li>
            </ul>

            <button onClick={handleLaunchApp} className="pricing-btn premium">
              <span>Upgrade to Pro</span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. CTA Section */}
      <section className="cta-section">
        <div className="cta-container animate-on-scroll">
          <h2 className="cta-title">Ready to experience Lets Ping?</h2>
          <p className="cta-desc">
            Sign up in seconds, join the global lounge, and see real-time chats and file attachments in action.
          </p>
          <button onClick={handleLaunchApp} className="cta-btn-launch">
            <span>Launch App Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="cta-glow"></div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand-col">
            <div className="footer-brand" onClick={() => router.push('/')}>
              <div className="nav-logo-icon">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="nav-brand-name">Lets Ping</span>
            </div>
            <p className="footer-tagline">Real-time chats made simple and sleek.</p>
            <div className="social-links-mock">
              <span>Twitter</span>
              <span>GitHub</span>
              <span>Dribbble</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h5>Product</h5>
            <a href="#features">Features</a>
            <a href="#showcase">Showcase</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div className="footer-links-col">
            <h5>Company</h5>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
          </div>

          <div className="footer-links-col">
            <h5>Legal</h5>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Security Rules</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Lets Ping. All rights reserved. Created in light & dark aesthetics.</p>
        </div>
      </footer>
    </div>
  );
}
