import { useNavigate } from 'react-router-dom';
import { Buildings, Users, ChartLineUp } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-heading text-2xl font-bold tracking-tight">
            TMOE
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              data-testid="header-login-button"
              className="border-foreground hover:bg-foreground hover:text-background"
            >
              Login
            </Button>
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
      <section className="border-b border-foreground">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="font-heading font-black text-5xl lg:text-6xl tracking-tight leading-tight mb-6">
              Content-to-Commerce Operating System
            </h1>
            <p className="text-xl text-muted-foreground mb-8 font-body">
              Connect publishers and brands for measurable content-driven commerce outcomes.
              Track campaigns, estimate ROI, and manage settlements in one platform.
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                data-testid="hero-get-started-button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-foreground">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-foreground p-8">
              <div className="mb-4">
                <Buildings size={40} weight="regular" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3">For Publishers</h3>
              <p className="text-muted-foreground">
                Monetize your content inventory by running brand campaigns. Track performance and manage earnings transparently.
              </p>
            </div>

            <div className="border border-foreground p-8">
              <div className="mb-4">
                <ChartLineUp size={40} weight="regular" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3">For Brands</h3>
              <p className="text-muted-foreground">
                Drive product discovery through trusted editorial content. Get ROI estimates and track campaign outcomes in real-time.
              </p>
            </div>

            <div className="border border-foreground p-8">
              <div className="mb-4">
                <Users size={40} weight="regular" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3">Platform Control</h3>
              <p className="text-muted-foreground">
                Complete oversight for operations teams. Manage campaigns, configure benchmarks, and handle settlements efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="font-heading text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg mb-8 opacity-90">Join the content-to-commerce revolution today.</p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            data-testid="cta-register-button"
            className="bg-background text-foreground hover:bg-background/90 text-lg px-8"
          >
            Create Account
          </Button>
        </div>
      </section>
    </div>
  );
}
