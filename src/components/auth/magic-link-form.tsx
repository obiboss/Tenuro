"use client";

import { useActionState } from "react";
import { requestMagicLinkAction } from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MagicLinkForm() {
  const [state, formAction, isPending] = useActionState(
    requestMagicLinkAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className={
                state.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {state.message}
            </div>
          ) : null}

          <Input
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            error={state.fieldErrors?.email?.[0]}
            required
          />
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isPending}
            fullWidth
          >
            Send Magic Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
