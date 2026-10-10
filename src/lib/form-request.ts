export async function readJsonBody<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

type FieldIssue = { message?: string; path?: unknown[] };

function issueText(issue: FieldIssue | undefined, fallback: string) {
  const path = Array.isArray(issue?.path) ? issue.path.map(String).join(".") : "";
  if (path === "address.label" || path === "label") {
    return "Add a name for this address, such as Home.";
  }
  const message = issue?.message?.trim() ?? "";
  if (!message || message.startsWith("{") || message.startsWith("[")) return fallback;
  return message;
}

/** Turn a raw validator payload into a sentence a shopper can read. */
export function humanizeErrorText(text: string, fallback: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as FieldIssue | FieldIssue[];
    const issue = Array.isArray(parsed) ? parsed[0] : parsed;
    if (issue && typeof issue === "object") return issueText(issue, fallback);
  } catch {
    /* the text was not a validator payload */
  }
  return fallback;
}

export function actionErrorMessage(error: unknown, fallback: string) {
  const err = error as Error & { status?: number; issues?: FieldIssue[] };
  if (err?.name === "ZodError" || Array.isArray(err?.issues)) {
    return {
      status: 400,
      message: issueText(
        err.issues?.find((issue) => issue.message || issue.path),
        fallback,
      ),
    };
  }
  return {
    status: err?.status ?? 500,
    message: humanizeErrorText(err?.message || "", fallback),
  };
}

export function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const row = payload as { error?: unknown; message?: unknown };
  const error = typeof row.error === "string" ? row.error.trim() : "";
  const message = typeof row.message === "string" ? row.message.trim() : "";
  return humanizeErrorText(error || message, fallback);
}
