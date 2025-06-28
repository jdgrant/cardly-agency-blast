
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Check, Upload, Calendar, File, ImageIcon, CheckCircle, ArrowRight, Star, Users, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Thank you for your order!",
        description: "Your greeting card campaign has been submitted successfully. You'll receive a confirmation email within 24 hours.",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Agency Greeting Cards</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-gray-600">Admin</Button>
            </Link>
            <Link to="/wizard">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative py-20 overflow-hidden"
        style={{
          backgroundColor: '#f8bdbd',
          backgroundImage: `url('/lovable-uploads/e1b821b2-d927-41ae-9eeb-5aeefb41c829.png')`,
          backgroundSize: 'auto 60%',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          backgroundBlendMode: 'soft-light'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Send Beautiful<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
                Greeting Cards
              </span><br />
              to Every Client
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
              Professional greeting card service designed for agencies. Choose stunning designs, 
              add your branding, and we'll handle printing and mailing to your entire client list.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start mb-12">
              <Link to="/wizard">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
                  Start Your Campaign
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>No setup fees • Fast turnaround</span>
              </div>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex items-center space-x-8 text-gray-500">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">4.9/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">500+ Agencies</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get your greeting cards sent in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-200 transition-colors">
                <File className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Choose Template</h3>
              <p className="text-gray-600 leading-relaxed">
                Select from our collection of professionally designed greeting card templates
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <ImageIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Add Your Brand</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload your logo and signature to personalize each card with your agency's branding
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Upload Client List</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload your client list via CSV and we'll handle the addressing automatically
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4. We Mail Them</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose your preferred mailing window and we'll ensure timely delivery
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 mb-6">Choose the perfect package for your client outreach</p>
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" />
              <span className="font-medium">15% Early Bird Discount Active</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { name: 'Starter', quantity: 250, regular: 750, earlyBird: 637.50, popular: false },
              { name: 'Growth', quantity: 500, regular: 1375, earlyBird: 1168.75, popular: true },
              { name: 'Agency Elite', quantity: 1000, regular: 2500, earlyBird: 2125, popular: false },
              { name: 'Agency Pro', quantity: 2000, regular: 4500, earlyBird: 3825, popular: false },
            ].map((tier) => (
              <Card key={tier.name} className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 ${tier.popular ? 'ring-2 ring-emerald-500 scale-105' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    ${tier.earlyBird.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 line-through mb-1">
                    ${tier.regular.toLocaleString()}
                  </div>
                  <div className="text-sm text-emerald-600 font-medium mb-4">
                    Save ${(tier.regular - tier.earlyBird).toLocaleString()}
                  </div>
                  <div className="text-lg text-gray-700 font-medium">
                    {tier.quantity} cards
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Premium cardstock</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Professional printing</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Custom branding</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Postage included</span>
                    </div>
                  </div>
                  <Link to="/wizard">
                    <Button className={`w-full ${tier.popular ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-gray-800'} text-white rounded-lg`}>
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">Professional features for agencies that care about their brand</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-left">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Private</h3>
              <p className="text-gray-600 leading-relaxed">
                Your client data is encrypted and secure. We never share or store personal information beyond what's needed for delivery.
              </p>
            </div>

            <div className="text-left">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Fast Turnaround</h3>
              <p className="text-gray-600 leading-relaxed">
                From order to mailbox in as little as 5 business days. Perfect for last-minute holiday campaigns.
              </p>
            </div>

            <div className="text-left">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Agency Focused</h3>
              <p className="text-gray-600 leading-relaxed">
                Built specifically for agencies with features like bulk client management and professional branding options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Wow Your Clients?</h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of agencies who trust us with their greeting card campaigns. 
            Get started in minutes with our simple wizard.
          </p>
          <Link to="/wizard">
            <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
              Start Your Campaign Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold">Agency Greeting Cards</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 AgencyGreetingCards.com - Professional Greeting Card Service
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
