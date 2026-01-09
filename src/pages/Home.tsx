import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Building2, Lock, CheckCircle, Globe } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">SecurBank International</h1>
              <p className="text-muted-foreground">Secure International Payment Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Secure International Payments Made Simple
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade security for your international banking transactions with SWIFT integration
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Customer Portal</CardTitle>
              <CardDescription>
                Make secure international payments with SWIFT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Secure registration and login
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Multi-currency support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  SWIFT payment processing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Real-time payment tracking
                </li>
              </ul>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Link to="/customer/login" className="block">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/customer/register" className="block">
                  <Button className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Employee Portal</CardTitle>
              <CardDescription>
                Verify and process international payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Payment verification dashboard
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  SWIFT code validation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Transaction approval workflow
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Secure employee access
                </li>
              </ul>
              <div className="pt-4">
                <Link to="/employee/login" className="block">
                  <Button className="w-full">
                    Employee Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl mx-auto shadow-lg border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enterprise Security Features</CardTitle>
            <CardDescription>
              Built with industry-leading security standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Password Security</h3>
                <p className="text-sm text-muted-foreground">
                  Hashing & salting with advanced encryption
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Input Validation</h3>
                <p className="text-sm text-muted-foreground">
                  RegEx whitelisting for all user inputs
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">SSL/TLS</h3>
                <p className="text-sm text-muted-foreground">
                  All traffic encrypted over HTTPS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Home;
