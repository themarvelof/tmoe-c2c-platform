import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import './Register.css';

const initialFormState = {
  email: '',
  role: 'publisher',
  company_name: '',
  website: '',
  industry: '',
  description: '',
  target_categories: '',
  target_markets: '',
  commerce_links: '',
  name: '',
  categories: '',
  monthly_sessions: 0,
  monthly_pageviews: 0
};

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        role: formData.role,
        website: formData.website
      };

      if (formData.role === 'brand') {
        payload.company_name = formData.company_name;
        payload.industry = formData.industry;
        payload.description = formData.description;
        payload.target_categories = formData.target_categories.split(',').map((c) => c.trim()).filter(Boolean);
        payload.target_markets = formData.target_markets.split(',').map((m) => m.trim()).filter(Boolean);
        payload.commerce_links = formData.commerce_links.split(',').map((l) => l.trim()).filter(Boolean);
      }

      if (formData.role === 'publisher') {
        payload.name = formData.name;
        payload.description = formData.description;
        payload.categories = formData.categories.split(',').map((c) => c.trim()).filter(Boolean);
        payload.monthly_sessions = parseInt(formData.monthly_sessions, 10) || 0;
        payload.monthly_pageviews = parseInt(formData.monthly_pageviews, 10) || 0;
      }

      await register(payload);
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (role) => {
    if (loading || formData.role === role) return;
    setFormData((prev) => ({ ...prev, role }));
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData((prev) => ({
      ...initialFormState,
      role: prev.role
    }));
  };

  return (
    <div className={`partner-register-page ${formData.role === 'brand' ? 'brand-mode' : ''}`}>
      <div className="pr-left">
        <div className="pr-g-pub" />
        <div className="pr-g-brand" />
        <div className="pr-grain" />

        <div className="pr-left-mid">
          <button type="button" className="pr-logo pr-logo-center" onClick={() => navigate('/')}>
            <div className="pr-logo-mark">T</div>
            <span className="pr-logo-name">TMOE</span>
          </button>
          <p className="pr-left-eyebrow">Technology Partnerships</p>
          <h1 className="pr-left-title">Partner Registration. Join the TMOE Network.</h1>
          <p className="pr-left-sub">Create your partner profile to get started. Our team reviews every application and will be in touch shortly.</p>

          <div className="pr-toggle-wrap">
            <label className={`pr-radio-row ${formData.role === 'publisher' ? 'active' : ''}`}>
              <input
                type="radio"
                name="role"
                checked={formData.role === 'publisher'}
                onChange={() => switchRole('publisher')}
                data-testid="role-publisher"
              />
              <span className="pr-radio-dot" />
              <span>Publisher</span>
            </label>
            <label className={`pr-radio-row ${formData.role === 'brand' ? 'active' : ''}`}>
              <input
                type="radio"
                name="role"
                checked={formData.role === 'brand'}
                onChange={() => switchRole('brand')}
                data-testid="role-brand"
              />
              <span className="pr-radio-dot" />
              <span>Brand</span>
            </label>
          </div>
        </div>

        <div className="pr-left-steps">
          <div className={`pr-step ${!submitted ? 'done' : ''}`}>
            <div className="pr-step-circle">1</div>
            <span className="pr-step-lbl">Create your profile</span>
          </div>
          <div className={`pr-step ${submitted ? 'done' : ''}`}>
            <div className="pr-step-circle">2</div>
            <span className="pr-step-lbl">Team reviews application</span>
          </div>
          <div className="pr-step">
            <div className="pr-step-circle">3</div>
            <span className="pr-step-lbl">Go live on the network</span>
          </div>
        </div>
      </div>

      <div className="pr-right">
        <div className="pr-right-inner">
          {!submitted ? (
            <div className="pr-form-view">
              <h2 className="pr-form-h">{formData.role === 'publisher' ? 'Publisher Profile' : 'Brand Profile'}</h2>
              <p className="pr-form-sub2">Fill in your details. Our team reviews every application personally.</p>

              <form onSubmit={handleSubmit} data-testid="register-form">
                <div className="pr-fr">
                  <label className="pr-lbl" htmlFor="email">Email *</label>
                  <input
                    id="email"
                    className="pr-fi"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@company.com"
                    data-testid="register-email-input"
                  />
                </div>

                {formData.role === 'publisher' ? (
                  <>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="name">Publisher Name *</label>
                      <input
                        id="name"
                        className="pr-fi"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. The Indian Express"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="website">Website URL *</label>
                      <input
                        id="website"
                        className="pr-fi"
                        type="url"
                        required
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourpublication.com"
                        data-testid="register-website-input"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="categories">Content Categories <span className="pr-hint">comma-separated</span></label>
                      <input
                        id="categories"
                        className="pr-fi"
                        type="text"
                        value={formData.categories}
                        onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                        placeholder="Technology, Fashion, Lifestyle"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="description">Description *</label>
                      <textarea
                        id="description"
                        className="pr-fi"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell us about your publication — audience, reach, editorial focus..."
                      />
                    </div>
                    <div className="pr-fr2">
                      <div>
                        <label className="pr-lbl" htmlFor="monthly_sessions">Monthly Sessions</label>
                        <input
                          id="monthly_sessions"
                          className="pr-fi"
                          type="number"
                          min="0"
                          value={formData.monthly_sessions}
                          onChange={(e) => setFormData({ ...formData, monthly_sessions: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="pr-lbl" htmlFor="monthly_pageviews">Monthly Pageviews</label>
                        <input
                          id="monthly_pageviews"
                          className="pr-fi"
                          type="number"
                          min="0"
                          value={formData.monthly_pageviews}
                          onChange={(e) => setFormData({ ...formData, monthly_pageviews: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="company_name">Company Name *</label>
                      <input
                        id="company_name"
                        className="pr-fi"
                        type="text"
                        required
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="e.g. Acme Commerce Ltd."
                        data-testid="register-company-input"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="website">Website URL *</label>
                      <input
                        id="website"
                        className="pr-fi"
                        type="url"
                        required
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourbrand.com"
                        data-testid="register-website-input"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="industry">Industry *</label>
                      <input
                        id="industry"
                        className="pr-fi"
                        type="text"
                        required
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        placeholder="e.g. Fashion, Electronics, Beauty"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="description">Description *</label>
                      <textarea
                        id="description"
                        className="pr-fi"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell us about your brand — products, markets, goals..."
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="target_categories">Target Categories <span className="pr-hint">comma-separated</span></label>
                      <input
                        id="target_categories"
                        className="pr-fi"
                        type="text"
                        value={formData.target_categories}
                        onChange={(e) => setFormData({ ...formData, target_categories: e.target.value })}
                        placeholder="Technology, Fashion, Lifestyle"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="target_markets">Target Markets <span className="pr-hint">comma-separated</span></label>
                      <input
                        id="target_markets"
                        className="pr-fi"
                        type="text"
                        value={formData.target_markets}
                        onChange={(e) => setFormData({ ...formData, target_markets: e.target.value })}
                        placeholder="India, UAE, Indonesia"
                      />
                    </div>
                    <div className="pr-fr">
                      <label className="pr-lbl" htmlFor="commerce_links">Commerce Links <span className="pr-hint">comma-separated</span></label>
                      <input
                        id="commerce_links"
                        className="pr-fi"
                        type="text"
                        value={formData.commerce_links}
                        onChange={(e) => setFormData({ ...formData, commerce_links: e.target.value })}
                        placeholder="https://shop.example.com, https://amazon.com/brand"
                      />
                    </div>
                  </>
                )}

                <button className="pr-btn-go" type="submit" disabled={loading} data-testid="register-submit-button">
                  {loading ? 'Submitting...' : formData.role === 'publisher' ? 'Create Publisher Profile' : 'Create Brand Profile'}
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </button>
              </form>

              <p className="pr-ftr">
                Already registered?{' '}
                <button type="button" className="pr-ftr-link" onClick={() => navigate('/login')} data-testid="go-to-login-link">
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <div className="pr-ty">
              <div className="pr-ty-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="pr-ty-pill"><span className="pr-ty-pill-dot" />Application received</div>
              <h2 className="pr-ty-h">Thank you for registering.</h2>
              <p className="pr-ty-p">We have sent a confirmation email and our team typically responds within 2-3 business days.</p>
              <button type="button" className="pr-btn-again" onClick={resetForm}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
                Register another profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
