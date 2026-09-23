import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2, Clock, Zap } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "../../components/ui/Primitives";
import { formatDate } from "../../lib/utils";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useEffect } from "react";
import { useAuth } from "../../auth/AuthProvider";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  regionId: z.string().min(1, "Please select a region"),
  storeId: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Please select an issue category"),
  description: z.string().min(5, "Please describe the issue in at least 5 characters"),
});

type Lookups = {
  regions: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string; regionId: string }>;
  categories: Array<{ id: string; name: string }>;
};

export function NewComplaintPage() {
  const { user } = useAuth();
  const lookups = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => (await api.get("/lookups")).data.data as Lookups,
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      regionId: user?.regionId || "",
      storeId: user?.storeId || "",
      categoryId: "",
      description: "",
    },
  });

  useEffect(() => {
    if (user) {
      if (!form.getValues("name")) form.setValue("name", user.name);
      if (!form.getValues("email")) form.setValue("email", user.email);
      if (!form.getValues("phone") && user.phone) form.setValue("phone", user.phone);
      if (!form.getValues("regionId") && user.regionId) form.setValue("regionId", user.regionId);
    }
  }, [user, form]);

  const [result, setResult] = useState<{
    complaintNumber: string;
    status: string;
    createdAt: string;
    slaDueAt: string | null;
  } | null>(null);

  const regionId = form.watch("regionId");
  const stores = (lookups.data?.stores ?? []).filter((s) => !regionId || s.regionId === regionId);

  if (result) {
    return (
      <div className="relative min-h-screen dark:bg-[#050507] bg-[#F8FAFC] dark:text-[#EDEDED] text-slate-900 flex items-center justify-center p-4">
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />
        <Card className="w-full max-w-xl border-emerald-500/30 dark:bg-[#0C0C12] bg-white p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold dark:text-white text-slate-900 tracking-tight">Complaint Lodged Successfully</h1>
              <p className="text-xs dark:text-zinc-400 text-slate-500">Our automated AI triage and support team are already on it.</p>
            </div>
          </div>

          <div className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#14141C] bg-slate-50 p-5 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b dark:border-white/[0.06] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">Ticket Reference</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base">{result.complaintNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b dark:border-white/[0.06] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">Current Status</span>
              <Badge value={result.status} />
            </div>
            <div className="flex justify-between items-center py-1 border-b dark:border-white/[0.06] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">Submitted On</span>
              <span className="dark:text-zinc-200 text-slate-800 font-medium">{formatDate(result.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="dark:text-zinc-400 text-slate-500">Guaranteed SLA Target</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {result.slaDueAt ? formatDate(result.slaDueAt) : "Assigned automatically upon triage"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setResult(null);
                form.reset();
              }}
            >
              Submit Another Complaint
            </Button>
            <Link to="/complaints/track" className="flex-1">
              <Button variant="secondary" className="w-full">
                Track Resolution Status
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen dark:bg-[#050507] bg-[#F8FAFC] dark:text-[#EDEDED] text-slate-900 py-12 px-4 selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-2xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg dark:text-white text-slate-900 tracking-tight">Complaint<span className="text-indigo-600 dark:text-indigo-400">OS</span></span>
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight dark:text-white text-slate-900">
            File a Customer Grievance
          </h1>
          <p className="text-sm dark:text-zinc-400 text-slate-600">
            Submit your issue directly into our centralized operations desk. Your complaint will be automatically classified by AI and assigned to the appropriate store/regional team.
          </p>
        </div>

        {/* Form Card */}
        <Card className="dark:border-white/[0.1] border-slate-200 dark:bg-[#0C0C12]/90 bg-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                const res = await api.post("/complaints", { ...values, storeId: values.storeId || null });
                setResult(res.data.data);
                toast.success("Complaint submitted successfully");
              } catch (error) {
                toast.error(apiErrorMessage(error));
              }
            })}
          >
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Priya Sharma" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-rose-400">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="priya@example.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-400">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" placeholder="+91 98765 43210" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="mt-1 text-xs text-rose-400">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="regionId">Region</Label>
                <Select id="regionId" {...form.register("regionId")}>
                  <option value="">Select Region</option>
                  {lookups.data?.regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
                {form.formState.errors.regionId && (
                  <p className="mt-1 text-xs text-rose-400">{form.formState.errors.regionId.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="storeId">Store / Branch (Optional)</Label>
                <Select id="storeId" {...form.register("storeId")}>
                  <option value="">Select Store Branch</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="categoryId">Issue Category</Label>
              <Select id="categoryId" {...form.register("categoryId")}>
                <option value="">Select Category</option>
                {lookups.data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              {form.formState.errors.categoryId && (
                <p className="mt-1 text-xs text-rose-400">{form.formState.errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                rows={5}
                placeholder="Please describe what happened, order/invoice details, and what resolution you are seeking..."
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="mt-1 text-xs text-rose-400">{form.formState.errors.description.message}</p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Transmitting to Triage Engine…" : "Submit Official Complaint"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export function TrackComplaintPage() {
  const [complaintNumber, setComplaintNumber] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative min-h-screen dark:bg-[#050507] bg-[#F8FAFC] dark:text-[#EDEDED] text-slate-900 py-12 px-4 selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-xl mx-auto space-y-6 relative z-10">
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg dark:text-white text-slate-900 tracking-tight">Complaint<span className="text-indigo-600 dark:text-indigo-400">OS</span></span>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight dark:text-white text-slate-900">Track Complaint Resolution</h1>
          <p className="text-xs dark:text-zinc-400 text-slate-600">
            Check the live status, assigned agent, and SLA resolution timeline for your ticket.
          </p>
        </div>

        <Card className="dark:border-white/[0.1] border-slate-200 dark:bg-[#0C0C12]/90 bg-white/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const res = await api.get("/complaints/track", { params: { complaintNumber, email } });
                setData(res.data.data);
              } catch (error) {
                toast.error(apiErrorMessage(error));
              } finally {
                setLoading(false);
              }
            }}
          >
            <div>
              <Label htmlFor="cn">Complaint ID / Reference</Label>
              <Input
                id="cn"
                value={complaintNumber}
                onChange={(e) => setComplaintNumber(e.target.value)}
                placeholder="e.g. CMP-2026-000001"
                required
              />
            </div>
            <div>
              <Label htmlFor="em">Customer Email</Label>
              <Input
                id="em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? "Searching Ledger…" : "Track Resolution Status"}
            </Button>
          </form>

          {data ? (
            <div className="mt-6 pt-6 border-t dark:border-white/[0.08] border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{data.complaintNumber}</span>
                  <p className="text-sm font-semibold dark:text-white text-slate-900 mt-0.5">{data.description?.slice(0, 60)}...</p>
                </div>
                <Badge value={data.status} />
              </div>

              <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-[#14141C] bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="dark:text-zinc-400 text-slate-500">Priority</span>
                  <Badge value={data.priority} kind="priority" />
                </div>
                <div className="flex justify-between">
                  <span className="dark:text-zinc-400 text-slate-500">Created</span>
                  <span className="dark:text-zinc-300 text-slate-700 font-medium">{formatDate(data.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="dark:text-zinc-400 text-slate-500">Target SLA</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {data.slaDueAt ? formatDate(data.slaDueAt) : "Within 24 hours"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
