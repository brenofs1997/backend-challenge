# Distributed Wagering Processor

Projeto de exemplo para processar wallets e transacoes de apostas com NestJS,
TypeScript, PostgreSQL e LocalStack/SQS.

## Setup

Requisitos: Bun, Docker e Docker Compose.

```bash
bun install
docker compose up -d
bun run start:dev
```

O servidor fica em `http://localhost:3000` e o LocalStack em
`http://localhost:4566`.

## Testes

```bash
bun test
bun run lint
```

## Endpoints principais

Health:

```http
GET /health/live
GET /health/ready
```

Criar wallet:

```http
POST /wallets
```

```json
{
	"playerId": "player-1",
	"initialBalance": { "amount": "100.00", "currency": "BRL" }
}
```

Enviar transacao:

```http
POST /wagering/transactions
Idempotency-Key: provider-a:transaction-123
```

```json
{
	"providerId": "provider-a",
	"externalTransactionId": "transaction-123",
	"playerId": "player-1",
	"walletId": "id-1",
	"roundId": "round-987",
	"gameId": "fortune-chimp",
	"kind": "BET",
	"money": { "amount": "25.00", "currency": "BRL" }
}
```

No PowerShell, use `curl.exe` com o JSON entre aspas simples:

```powershell
curl.exe -X POST "http://localhost:3000/wagering/transactions" `
	-H "Content-Type: application/json" `
	-H "Idempotency-Key: provider-a:transaction-123" `
	--data-raw '{"providerId":"provider-a","externalTransactionId":"transaction-123","playerId":"player-1","walletId":"id-1","roundId":"round-987","gameId":"fortune-chimp","kind":"BET","money":{"amount":"25.00","currency":"BRL"}}'
```

## Estrutura

- `src/domain`: regras de negocio e entidades sem dependencia do NestJS.
- `src/application`: casos de uso e interfaces dos ports.
- `src/infrastructure`: adapters de memoria e LocalStack/SQS.
- `src/interfaces`: controllers HTTP.
