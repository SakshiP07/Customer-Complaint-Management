import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "../../components/ui/Primitives";
import { formatDate } from "../../lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email(),
  phone: z.string().min(8, "Phone is required"),
  regionId: z.string().uuid("Select a region"),
  storeId: z.string().optional(),
  categoryId: z.string().uuid("Select a category"),
  description: z.string().min(20, "Please describe the issue in at least 20 characters"),
});

type Lookups = {
  regions: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string; regionId: string }>;
  categories: Array<{ id: string; name: string }>;
};

export function NewComplaintPage() {
  const lookups = useQuery({
    queryKey: ["lookups"],
    queryFn: async () => (await api.get("/lookups")).data.data as Lookups,
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", regionId: "", storeId: "", categoryId: "", description: "" },
  });
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
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <h1 className="text-xl font-semibold">Complaint submitted successfully</h1>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Complaint ID</dt><dd className="font-medium">{result.complaintNumber}</dd></div>
            <div className="flex justify-between"><dt>Status</dt><dd><Badge value={result.status} /></dd></div>
            <div className="flex justify-between"><dt>Submitted</dt><dd>{formatDate(result.createdAt)}</dd></div>
            <div className="flex justify-between"><dt>Expected resolution</dt><dd>{result.slaDueAt ? formatDate(result.slaDueAt) : "Assigned after triage"}</dd></div>
          </dl>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <h1 className="text-2xl font-semibold">Submit a website complaint</h1>
      <p className="mt-1 text-sm text-slate-500">This is an optional public entry point. Instagram, WhatsApp, Facebook, email and Google Reviews arrive through the operations inbox. You can track later with your complaint ID and email.</p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const res = await api.post("/complaints", { ...values, storeId: values.storeId || null });
            setResult(res.data.data);
            toast.success("Complaint submitted");
          } catch (error) {
            toast.error(apiErrorMessage(error));
          }
        })}
      >
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name ? <p className="text-xs text-red-600">{form.formState.errors.name.message}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="regionId">Region</Label>
            <Select id="regionId" {...form.register("regionId")}>
              <option value="">Select region</option>
              {lookups.data?.regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="storeId">Store</Label>
            <Select id="storeId" {...form.register("storeId")}>
              <option value="">Optional</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" {...form.register("categoryId")}>
            <option value="">Select category</option>
            {lookups.data?.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={6} {...form.register("description")} />
        </div>
        <Button type="submit">Submit complaint</Button>
      </form>
    </div>
  );
}

export function TrackComplaintPage() {
  const [complaintNumber, setComplaintNumber] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  return (
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <h1 className="text-xl font-semibold">Track complaint</h1>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await api.get("/complaints/track", { params: { complaintNumber, email } });
              setData(res.data.data);
            } catch (error) {
              toast.error(apiErrorMessage(error));
            }
          }}
        >
          <div>
            <Label htmlFor="cn">Complaint ID</Label>
            <Input id="cn" value={complaintNumber} onChange={(e) => setComplaintNumber(e.target.value)} placeholder="CMP-2026-000001" />
          </div>
          <div>
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit">Track</Button>
        </form>
        {data ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">{String(data.complaintNumber)}</p>
            <Badge value={String(data.status)} />
            <p>{String(data.description)}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
