import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Zap, Sparkles } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { homeFor } from "../../lib/utils";
import { apiErrorMessage } from "../../api/client";
import { Button, Card, Input, Label } from "../../components/ui/Primitives";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const handleDemoLogin = async (email: string) => {
    try {
      const user = await login(email, "DemoPass123!");
      navigate(homeFor(user.role.code));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center dark:bg-[#050507] bg-[#F8FAFC] px-4 py-12 dark:text-[#EDEDED] text-slate-900 overflow-hidden">
      {/* Top right ThemeToggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute -top-32 right-10 w-96 h-96 bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl dark:text-white text-slate-900 tracking-tight">
              Complaint<span className="text-indigo-600 dark:text-indigo-400">OS</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight dark:text-white text-slate-900">Welcome back</h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500">Sign in to access your operations dashboard or customer portal.</p>
        </div>

        <Card className="dark:border-white/[0.1] border-slate-200 dark:bg-[#0C0C12]/90 bg-white/90 backdrop-blur-xl p-7 shadow-2xl">
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                const user = await login(values.email, values.password);
                navigate(homeFor(user.role.code));
              } catch (error) {
                toast.error(apiErrorMessage(error));
              }
            })}
          >
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="name@company.com" autoComplete="username" {...form.register("email")} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <Label htmlFor="password" className="mb-0">Password</Label>
              </div>
              <Input id="password" type="password" placeholder="••••••••••••" autoComplete="current-password" {...form.register("password")} />
            </div>
            <Button type="submit" variant="primary" className="w-full mt-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Authenticating…" : "Sign In"}
            </Button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t dark:border-white/[0.08] border-slate-200">
            <p className="text-[11px] font-medium dark:text-zinc-400 text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              1-Click Demo Accounts (Pass: DemoPass123!)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Super Admin", email: "admin@example.com" },
                { label: "Manager", email: "manager@example.com" },
                { label: "Agent", email: "agent@example.com" },
                { label: "Customer", email: "customer@example.com" },
              ].map((role) => (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => handleDemoLogin(role.email)}
                  className="rounded-xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#14141C] bg-slate-50 p-2 text-left hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer group shadow-sm"
                >
                  <p className="text-xs font-semibold dark:text-white text-slate-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{role.label}</p>
                  <p className="text-[10px] dark:text-zinc-500 text-slate-500 truncate">{role.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center text-xs dark:text-zinc-400 text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold">
              Create customer account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center dark:bg-[#050507] bg-[#F8FAFC] px-4 py-12 dark:text-[#EDEDED] text-slate-900 overflow-hidden">
      {/* Top right ThemeToggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl dark:text-white text-slate-900 tracking-tight">
              Complaint<span className="text-indigo-600 dark:text-indigo-400">OS</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight dark:text-white text-slate-900">Create customer account</h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500">Track complaints, view resolutions, and interact with support teams.</p>
        </div>

        <Card className="dark:border-white/[0.1] border-slate-200 dark:bg-[#0C0C12]/90 bg-white/90 backdrop-blur-xl p-7 shadow-2xl">
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                const user = await registerUser(values);
                navigate(homeFor(user.role.code));
              } catch (error) {
                toast.error(apiErrorMessage(error));
              }
            })}
          >
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-rose-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="john@example.com" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-rose-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input id="phone" placeholder="+91 98765 43210" {...form.register("phone")} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••••••" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-rose-500">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" variant="primary" className="w-full mt-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating Account…" : "Register Account"}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs dark:text-zinc-400 text-slate-500">
            Already registered?{" "}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
