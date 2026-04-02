"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
      rememberMe: true
    });

    if (authError) {
      setError(authError.message ?? "Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">SnapLive</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Sign in to your studio account
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="studio@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-muted-foreground text-sm">
              No account?{" "}
              <Link
                href="/signup"
                className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors"
              >
                Register your studio
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}