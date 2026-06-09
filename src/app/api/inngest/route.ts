import { serve } from "inngest/next";
import { inngest } from "@/server/jobs/inngest.client";
import { receiptJobs } from "@/server/jobs/receipt.jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...receiptJobs],
});
