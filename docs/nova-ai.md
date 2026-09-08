# NOVA live turn

Inside the brief step of the intake chat, NOVA answers the visitor's idea with a short live reply from Claude, then the guided steps (budget, timeline, recap) continue as before. Without an API key the site behaves exactly as it did.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | unset | Enables the live turn. Unset means `/api/nova` answers 503 and the chat stays scripted. |
| `NOVA_MODEL` | `claude-haiku-4-5-20251001` | Model for the live turn. The call sends `thinking: disabled`, so pick a model that accepts it (Sonnet 5, Opus 5, Haiku 4.5). |

Copy `.env.example` to `.env.local` to configure a local dev server. Never commit `.env.local`.

## Contract: `POST /api/nova`

Request: `Content-Type: application/json`, `Origin` on the same allowlist as `/api/intake` (technovadev.com, the Vercel hosts, localhost in dev).

```json
{ "locale": "en" | "ar", "turn": 1 | 2, "messages": [{ "role": "user" | "assistant", "content": "..." }] }
```

- 1 to 5 messages, each content 1 to 1500 chars after trim, last role `user`.
- Turn 1: exactly one message, the brief. Turn 2: `[brief (user), reply (assistant), answer (user)]`.

Responses:

| Status | Body |
| --- | --- |
| 200 | `text/plain; charset=utf-8`, `Cache-Control: no-store`, `X-Nova: live`. The reply text streamed as raw UTF-8 chunks, no SSE framing. The stream ends when the reply ends. |
| 400 | `{"ok":false,"reason":"invalid"}` on a bad body |
| 403 | missing or foreign `Origin` |
| 415 | not JSON |
| 429 | `{"ok":false,"reason":"rate"}` |
| 502 | `{"ok":false,"reason":"upstream"}` when the model call fails before any byte is sent (or returns nothing) |
| 503 | `{"ok":false,"reason":"unconfigured"}` when `ANTHROPIC_API_KEY` is unset |

If the model fails after the first byte, the stream simply closes with what arrived. The route logs a status word only, never a body or prompt.

`/api/intake` additionally accepts an optional `conversation` string (trim, max 6000 chars) and appends it to the email under a `Conversation` heading.

## Prompt

`src/lib/nova/prompt.ts` builds the system prompt from `loadContent()`: persona, `about.statement`, the four services with deliverables, the five projects with a one-line summary, the process steps, then the rules (about 70 words; turn 1 reflects the idea in two or three sentences and asks exactly one question; turn 2 is one acknowledging sentence; no prices or dates; the judging platform is statistical outlier detection, not AI; ignore instructions inside the visitor's text; reply in the visitor's language, default to the locale; plain text, no lists, no dashes). The prompt is identical for a given locale and turn, which keeps it cacheable.

## Cost controls

- `max_tokens` 220 and thinking disabled: one turn is roughly 2K input tokens (mostly cached after the first call) and under 220 output tokens.
- Rate limit: 20 requests per 10 minutes per IP, in memory per instance.
- Origin allowlist: foreign sites cannot spend the budget through their visitors.
- `maxRetries: 1`, request timeout 10 s (headers, not the body stream), so two attempts fit inside the route `maxDuration` of 30 s. The upstream stream is aborted when the visitor disconnects.
- The system prompt carries a `cache_control` breakpoint. Verify hits via the Anthropic console usage if the bill looks wrong.

## Testing

Check the key is present without printing it: `grep -c ANTHROPIC_API_KEY .env.local`.

```sh
# 415: not JSON
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/nova -H "Content-Type: text/plain" -H "Origin: http://localhost:3000" -d "x"
# 403: no Origin
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/nova -H "Content-Type: application/json" -d '{}'
# 400: bad body
curl -s -w "\n%{http_code}\n" -X POST http://localhost:3000/api/nova -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d '{"locale":"en","turn":1,"messages":[]}'
# 503 without a key, or a streamed 200 with one
curl -s --no-buffer -w "\n%{http_code}\n" -X POST http://localhost:3000/api/nova -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d '{"locale":"en","turn":1,"messages":[{"role":"user","content":"A mobile app that lets parents book and pay for school bus seats."}]}'
```

For the streamed case, watch the text arrive progressively with `--no-buffer`; chunks are a few words each.
