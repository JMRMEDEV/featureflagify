# TASK-006 manual verification (curl)

Node v20.19.4. Server started from api/ with only these variables set on the command line:

```text
FLAGS_API_PORT=38417 FLAGS_CORS_ORIGIN=http://localhost:5173 ../node_modules/.bin/tsx src/server.ts
```

Listening socket: 127.0.0.1:38417

## GET /health

```text
$ curl -sS -i http://127.0.0.1:38417/health
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 6f3cc9e2-96f4-492d-a6d6-6880a7e9ade7
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"status":"ok"}}

```

## POST /flags (201)

```text
$ curl -sS -i -X POST http://127.0.0.1:38417/flags -H content-type: application/json -H x-actor: alice -H x-request-id: curl-create-1 -d {"key":"new-checkout","description":"Checkout v2"}
HTTP/1.1 201 Created
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: curl-create-1
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flag":{"key":"new-checkout","name":"new-checkout","description":"Checkout v2","enabled":false,"createdAt":"2026-11-18T23:14:24.342Z","updatedAt":"2026-11-18T23:14:24.342Z"}}}

```

## POST /flags second flag, enabled (201)

```text
$ curl -sS -i -X POST http://127.0.0.1:38417/flags -H content-type: application/json -d {"key":"dark-mode","enabled":true}
HTTP/1.1 201 Created
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 88e5aed2-c654-4d4d-9802-bde5fb6f74e7
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flag":{"key":"dark-mode","name":"dark-mode","description":"","enabled":true,"createdAt":"2026-11-18T23:14:24.347Z","updatedAt":"2026-11-18T23:14:24.347Z"}}}

```

## GET /flags

```text
$ curl -sS -i http://127.0.0.1:38417/flags
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: a2487671-0cc8-4385-81fe-4c94eb4b3656
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flags":[{"key":"dark-mode","name":"dark-mode","description":"","enabled":true,"createdAt":"2026-11-18T23:14:24.347Z","updatedAt":"2026-11-18T23:14:24.347Z"},{"key":"new-checkout","name":"new-checkout","description":"Checkout v2","enabled":false,"createdAt":"2026-11-18T23:14:24.342Z","updatedAt":"2026-11-18T23:14:24.342Z"}]}}

```

## PATCH /flags/new-checkout enable (200)

```text
$ curl -sS -i -X PATCH http://127.0.0.1:38417/flags/new-checkout -H content-type: application/json -H x-actor: bob -d {"enabled":true}
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 1c8acef5-631d-4e8d-9f58-fde1ab94e0c4
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flag":{"key":"new-checkout","name":"new-checkout","description":"Checkout v2","enabled":true,"createdAt":"2026-11-18T23:14:24.342Z","updatedAt":"2026-11-18T23:14:24.362Z"}}}

```

## GET /evaluate (unknown key absent, never 404)

```text
$ curl -sS -i http://127.0.0.1:38417/evaluate
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: bf4d1542-9659-4e7d-8015-dcd1ead6fe4d
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flags":{"dark-mode":true,"new-checkout":true}}}

```

## GET /audit

```text
$ curl -sS -i http://127.0.0.1:38417/audit
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: c9b462e5-5e73-4a25-961d-3afe17cd80dd
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"entries":[{"id":"991ddfc6-2334-4868-959c-da1659829585","flagKey":"new-checkout","action":"enabled","before":false,"after":true,"at":"2026-11-18T23:14:24.362Z","actor":"bob","requestId":"1c8acef5-631d-4e8d-9f58-fde1ab94e0c4"},{"id":"8777eaca-505d-4886-851f-d85048e7acc8","flagKey":"dark-mode","action":"created","before":null,"after":true,"at":"2026-11-18T23:14:24.347Z","actor":"anonymous","requestId":"88e5aed2-c654-4d4d-9802-bde5fb6f74e7"},{"id":"9939e950-626e-4288-aaba-8a8a27f46bb1","flagKey":"new-checkout","action":"created","before":null,"after":false,"at":"2026-11-18T23:14:24.342Z","actor":"alice","requestId":"curl-create-1"}]}}

```

## GET /audit?flag=dark-mode

```text
$ curl -sS -i http://127.0.0.1:38417/audit?flag=dark-mode
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 3059c56b-ff73-4b95-92ca-9410fbb9a7ba
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"entries":[{"id":"8777eaca-505d-4886-851f-d85048e7acc8","flagKey":"dark-mode","action":"created","before":null,"after":true,"at":"2026-11-18T23:14:24.347Z","actor":"anonymous","requestId":"88e5aed2-c654-4d4d-9802-bde5fb6f74e7"}]}}

```

## ERROR 400 invalid key and unknown field

```text
$ curl -sS -i -X POST http://127.0.0.1:38417/flags -H content-type: application/json -d {"key":"Bad_Key","extra":1}
HTTP/1.1 400 Bad Request
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 3e0f6e0d-c747-47e2-ade2-055eda1d033f
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"error":{"code":"VALIDATION_ERROR","message":"Request validation failed","requestId":"3e0f6e0d-c747-47e2-ade2-055eda1d033f","details":[{"field":"key","message":"Flag key must be lowercase kebab-case, 2-64 characters"},{"field":"extra","message":"Unknown field"}]}}

```

## ERROR 400 malformed JSON

```text
$ curl -sS -i -X POST http://127.0.0.1:38417/flags -H content-type: application/json -d {"key":
HTTP/1.1 400 Bad Request
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 18f69a7a-105b-4097-94dd-7d34ac336bac
Date: Wed, 18 Nov 2026 23:14:24 GMT

{"error":{"code":"VALIDATION_ERROR","message":"Request validation failed","requestId":"18f69a7a-105b-4097-94dd-7d34ac336bac","details":[{"field":"body","message":"The request body is not valid JSON or is not accepted"}]}}

```

## ERROR 400 invalid ?flag

```text
$ curl -sS -i http://127.0.0.1:38417/audit?flag=Bad_Key
HTTP/1.1 400 Bad Request
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: ea66b6e9-a435-45ba-8a14-c40d7fe941a0
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"error":{"code":"VALIDATION_ERROR","message":"Request validation failed","requestId":"ea66b6e9-a435-45ba-8a14-c40d7fe941a0","details":[{"field":"flag","message":"Flag key must be lowercase kebab-case, 2-64 characters"}]}}

```

## ERROR 400 invalid x-actor (101 chars)

```text
$ curl -sS -i -X PATCH http://127.0.0.1:38417/flags/new-checkout -H content-type: application/json -H x-actor: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa -d {"enabled":false}
HTTP/1.1 400 Bad Request
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: b0b2acb0-32cf-40d4-ae5c-568af3d7ab57
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"error":{"code":"VALIDATION_ERROR","message":"Request validation failed","requestId":"b0b2acb0-32cf-40d4-ae5c-568af3d7ab57","details":[{"field":"x-actor","message":"Too big: expected string to have <=100 characters"}]}}

```

## ERROR 409 duplicate key

```text
$ curl -sS -i -X POST http://127.0.0.1:38417/flags -H content-type: application/json -d {"key":"new-checkout"}
HTTP/1.1 409 Conflict
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: acde6ccc-bf9d-4d07-8d06-7f9762a3f5ff
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"error":{"code":"FLAG_EXISTS","message":"A flag with this key already exists","requestId":"acde6ccc-bf9d-4d07-8d06-7f9762a3f5ff"}}

```

## ERROR 404 unknown key on PATCH

```text
$ curl -sS -i -X PATCH http://127.0.0.1:38417/flags/missing-flag -H content-type: application/json -d {"enabled":true}
HTTP/1.1 404 Not Found
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 2b6967d7-ada3-4937-be98-5f2115316353
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"error":{"code":"FLAG_NOT_FOUND","message":"Flag not found","requestId":"2b6967d7-ada3-4937-be98-5f2115316353"}}

```

## ERROR 404 unknown route

```text
$ curl -sS -i http://127.0.0.1:38417/nope
HTTP/1.1 404 Not Found
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 29f2b7c9-7727-4c0a-b940-7c0fc9a339f1
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"error":{"code":"FLAG_NOT_FOUND","message":"Route not found","requestId":"29f2b7c9-7727-4c0a-b940-7c0fc9a339f1"}}

```

## Invalid x-request-id is replaced (129 chars)

```text
$ curl -sS -i -H x-request-id: rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr http://127.0.0.1:38417/health
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: 841ae200-220b-4005-abde-865460ea49b0
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"status":"ok"}}

```

## CORS: allowed origin

```text
$ curl -sS -i -H origin: http://localhost:5173 http://127.0.0.1:38417/evaluate
HTTP/1.1 200 OK
vary: Origin
access-control-allow-origin: http://localhost:5173
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: db49e0e4-6f88-4398-a5af-38994fc3077f
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flags":{"dark-mode":true,"new-checkout":true}}}

```

## CORS: other origin (no allow-origin header)

```text
$ curl -sS -i -H origin: http://evil.example http://127.0.0.1:38417/evaluate
HTTP/1.1 200 OK
vary: Origin
access-control-expose-headers: x-request-id
content-type: application/json; charset=utf-8
x-request-id: eaba13b3-f9c9-4be4-a696-edf2f950537d
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"data":{"flags":{"dark-mode":true,"new-checkout":true}}}

```

## CORS: PATCH preflight

```text
$ curl -sS -i -X OPTIONS http://127.0.0.1:38417/flags/new-checkout -H origin: http://localhost:5173 -H access-control-request-method: PATCH -H access-control-request-headers: content-type,x-actor
HTTP/1.1 204 No Content
vary: Origin
access-control-allow-origin: http://localhost:5173
access-control-expose-headers: x-request-id
access-control-allow-methods: GET, POST, PATCH
access-control-allow-headers: content-type, x-request-id, x-actor
x-request-id: 03a87774-b917-416b-904c-397ce1888c15
Date: Wed, 18 Nov 2026 23:14:24 GMT
Connection: keep-alive
Keep-Alive: timeout=72


```

## Server log during the run

```text
{"time":"2026-11-18T23:14:12.127Z","level":"info","host":"127.0.0.1","port":38417,"corsOrigin":"http://localhost:5173","event":"server_started"}
{"time":"2026-11-18T23:14:24.336Z","level":"info","method":"GET","path":"/health","status":200,"requestId":"6f3cc9e2-96f4-492d-a6d6-6880a7e9ade7","event":"request_completed"}
{"time":"2026-11-18T23:14:24.342Z","level":"info","key":"new-checkout","enabled":false,"requestId":"curl-create-1","event":"flag_created"}
{"time":"2026-11-18T23:14:24.342Z","level":"info","method":"POST","path":"/flags","status":201,"requestId":"curl-create-1","event":"request_completed"}
{"time":"2026-11-18T23:14:24.347Z","level":"info","key":"dark-mode","enabled":true,"requestId":"88e5aed2-c654-4d4d-9802-bde5fb6f74e7","event":"flag_created"}
{"time":"2026-11-18T23:14:24.347Z","level":"info","method":"POST","path":"/flags","status":201,"requestId":"88e5aed2-c654-4d4d-9802-bde5fb6f74e7","event":"request_completed"}
{"time":"2026-11-18T23:14:24.357Z","level":"info","method":"GET","path":"/flags","status":200,"requestId":"a2487671-0cc8-4385-81fe-4c94eb4b3656","event":"request_completed"}
{"time":"2026-11-18T23:14:24.362Z","level":"info","key":"new-checkout","before":false,"after":true,"requestId":"1c8acef5-631d-4e8d-9f58-fde1ab94e0c4","event":"flag_toggled"}
{"time":"2026-11-18T23:14:24.362Z","level":"info","method":"PATCH","path":"/flags/new-checkout","status":200,"requestId":"1c8acef5-631d-4e8d-9f58-fde1ab94e0c4","event":"request_completed"}
{"time":"2026-11-18T23:14:24.367Z","level":"info","method":"GET","path":"/evaluate","status":200,"requestId":"bf4d1542-9659-4e7d-8015-dcd1ead6fe4d","event":"request_completed"}
{"time":"2026-11-18T23:14:24.372Z","level":"info","method":"GET","path":"/audit","status":200,"requestId":"c9b462e5-5e73-4a25-961d-3afe17cd80dd","event":"request_completed"}
{"time":"2026-11-18T23:14:24.376Z","level":"info","method":"GET","path":"/audit","status":200,"requestId":"3059c56b-ff73-4b95-92ca-9410fbb9a7ba","event":"request_completed"}
{"time":"2026-11-18T23:14:24.382Z","level":"info","method":"POST","path":"/flags","status":400,"requestId":"3e0f6e0d-c747-47e2-ade2-055eda1d033f","event":"request_completed"}
{"time":"2026-11-18T23:14:24.387Z","level":"info","method":"POST","path":"/flags","status":400,"requestId":"18f69a7a-105b-4097-94dd-7d34ac336bac","event":"request_completed"}
{"time":"2026-11-18T23:14:24.391Z","level":"info","method":"GET","path":"/audit","status":400,"requestId":"ea66b6e9-a435-45ba-8a14-c40d7fe941a0","event":"request_completed"}
{"time":"2026-11-18T23:14:24.398Z","level":"info","method":"PATCH","path":"/flags/new-checkout","status":400,"requestId":"b0b2acb0-32cf-40d4-ae5c-568af3d7ab57","event":"request_completed"}
{"time":"2026-11-18T23:14:24.402Z","level":"info","method":"POST","path":"/flags","status":409,"requestId":"acde6ccc-bf9d-4d07-8d06-7f9762a3f5ff","event":"request_completed"}
{"time":"2026-11-18T23:14:24.406Z","level":"info","method":"PATCH","path":"/flags/missing-flag","status":404,"requestId":"2b6967d7-ada3-4937-be98-5f2115316353","event":"request_completed"}
{"time":"2026-11-18T23:14:24.410Z","level":"info","method":"GET","path":"/nope","status":404,"requestId":"29f2b7c9-7727-4c0a-b940-7c0fc9a339f1","event":"request_completed"}
{"time":"2026-11-18T23:14:24.415Z","level":"info","method":"GET","path":"/health","status":200,"requestId":"841ae200-220b-4005-abde-865460ea49b0","event":"request_completed"}
{"time":"2026-11-18T23:14:24.419Z","level":"info","method":"GET","path":"/evaluate","status":200,"requestId":"db49e0e4-6f88-4398-a5af-38994fc3077f","event":"request_completed"}
{"time":"2026-11-18T23:14:24.424Z","level":"info","method":"GET","path":"/evaluate","status":200,"requestId":"eaba13b3-f9c9-4be4-a696-edf2f950537d","event":"request_completed"}
{"time":"2026-11-18T23:14:24.428Z","level":"info","method":"OPTIONS","path":"/flags/new-checkout","status":204,"requestId":"03a87774-b917-416b-904c-397ce1888c15","event":"request_completed"}
```

## Server stopped

Sent SIGTERM. The server logged `{"event":"server_stopping","signal":"SIGTERM"}`, and `ss -ltn` shows no listener on port 38417.

## Not shown here

The 500 `INTERNAL_ERROR` case cannot be triggered by curl against the in-memory stores. It is covered by tests in `api/test/app.test.ts` (service throws, audit append fails, audit list fails).
