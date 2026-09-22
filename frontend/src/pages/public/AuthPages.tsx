import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthProvider";
import { homeFor } from "../../lib/utils";
import { apiErrorMessage } from "../../api/client";
import { Button, Card, Input, Label } from "../../components/ui/Primitives";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <form
          className="mt-6 space-y-4"
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
          </div>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-slate-600">
            <Link to="/register" className="text-blue-700">Create customer account</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(10),
});

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", phone: "", password: "" } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold">Create customer account</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const user = await register(values);
              navigate(homeFor(user.role.code));
            } catch (error) {
              toast.error(apiErrorMessage(error));
            }
          })}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
          </div>
          <Button type="submit" className="w-full">Register</Button>
        </form>
      </Card>
    </div>
  );
}
