# Arquitetura

## Decisoes

O projeto usa uma separacao simples em Domain, Application, Infrastructure e
Interfaces. O dominio nao conhece NestJS, TypeORM ou AWS.

O processamento de transacoes fica no `ProcessWagerTransactionUseCase`. Tanto o
endpoint HTTP quanto o consumidor SQS usam o mesmo caso de uso.

As mensagens SQS usam FIFO, `MessageGroupId` por wallet e uma DLQ. O consumidor
faz o `ack` somente depois do processamento e do registro na inbox.

O `Idempotency-Key` e obrigatorio. O hash e SHA-256 de um JSON canonico dos
campos de negocio, com as chaves ordenadas. Header e metadados de transporte nao
entram no hash.

## Trade-offs

Repositories e inbox usam memoria para deixar o fluxo local e os
testes simples. O LocalStack e usado para testar o transporte SQS sem depender
da AWS real.

O lock `PESSIMISTIC_WRITE` ja faz parte do port, mas o adapter em memoria nao
simula concorrencia de banco.

## Limitacoes atuais

- A inbox ainda nao e persistida no PostgreSQL.
- Os repositories TypeORM e as migrations ainda precisam ser implementados.
- Os dados das wallets sao perdidos quando a aplicacao reinicia.
- O processamento completo de BET/WIN/REFUND/ROLLBACK ainda depende da camada de
  persistencia real para suportar concorrencia entre instancias.