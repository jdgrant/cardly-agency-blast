
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Check, Upload, Calendar, File } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
            <span className="text-xl font-semibold text-gray-800">AgencyHolidayCards.com</span>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm">Admin</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Send Beautiful Holiday Cards
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            to All Your Clients
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Professional holiday card service for agencies. Upload your client list, 
          choose a stunning design, and we'll handle the printing and mailing.
        </p>
        <Link to="/wizard">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
            Get Started
          </Button>
        </Link>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <File className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Choose Template</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Select from our collection of professionally designed holiday card templates
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Upload Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Upload your client list via CSV and we'll handle the rest automatically
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Image className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Add Your Brand</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Upload your logo and signature to personalize each card
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Schedule Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Choose your preferred mailing window and we'll ensure timely delivery
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-8">
            <CardTitle className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</CardTitle>
            <CardDescription className="text-lg text-gray-600">
              No hidden fees. Pay only for what you send.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                $1.91
              </div>
              <div className="text-gray-600 text-lg">per card, all-inclusive</div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Premium cardstock</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Professional printing</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Postage included</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-blue-100 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 AgencyHolidayCards.com - Professional Holiday Card Service</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
