import { useNavigate } from 'react-router-dom';
import { Buildings, Users, ChartLineUp } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-heading text-2xl font-bold tracking-tight text-foreground">
            TMOE
          </div>
          <div className="flex gap-4">
            {/* <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              data-testid="header-login-button"
              className="hover:bg-muted"
            >
              Login
            </Button> */}
            <Button
              onClick={() => navigate('/register')}
              data-testid="header-register-button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <h1 className="font-heading text-5xl lg:text-6xl tracking-tight leading-tight mb-6 text-foreground">
              Content-to-Commerce Operating System
            </h1>
            <p className="text-xl text-muted-foreground mb-8 font-body leading-relaxed">
              Connect publishers and brands for measurable content-driven commerce outcomes.
              Track campaigns, estimate ROI, and manage settlements in one platform.
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                data-testid="hero-get-started-button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 rounded-md"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 border border-border hover:shadow-lg transition-shadow">
              <div className="mb-4 text-primary">
                <Buildings size={40} weight="regular" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3 text-foreground">For Publishers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Monetize your content inventory by running brand campaigns. Track performance and manage earnings transparently.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 border border-border hover:shadow-lg transition-shadow">
              <div className="mb-4 text-primary">
                <ChartLineUp size={40} weight="regular" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3 text-foreground">For Brands</h3>
              <p className="text-muted-foreground leading-relaxed">
                Drive product discovery through trusted editorial content. Get ROI estimates and track campaign outcomes in real-time.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 border border-border hover:shadow-lg transition-shadow">
              <div className="mb-4 text-primary">
                <Users size={40} weight="regular" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3 text-foreground">Platform Control</h3>
              <p className="text-muted-foreground leading-relaxed">
                Complete oversight for operations teams. Manage campaigns, configure benchmarks, and handle settlements efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="font-heading text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg mb-8 opacity-90">Join the content-to-commerce revolution today.</p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            data-testid="cta-register-button"
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 rounded-md"
          >
            Create Account
          </Button>
        </div>
      </section>
    </div>
  );
}
