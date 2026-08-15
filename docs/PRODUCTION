# JaraStay — produção

Este repositório é uma base full-stack realmente executável: Node 22 + Express + PostgreSQL, multi-tenant, autenticação, RBAC, reservas, hóspedes, quartos, governança, financeiro, auditoria, exportação CSV e motor público de reserva.

## Rodar localmente
1. Copie `.env.example` para `.env` e troque todos os segredos.
2. Defina `POSTGRES_PASSWORD` e `JWT_SECRET` fortes.
3. Execute `docker compose up --build`.
4. Abra `http://localhost:3000`.
5. Crie o primeiro hotel pela API `/api/auth/register` ou use um cliente HTTP.

## Antes de abrir ao público
- Configure DNS, TLS e reverse proxy/WAF.
- Use PostgreSQL gerenciado com backups, PITR e replicação.
- Configure `JWT_SECRET` aleatório com pelo menos 64 bytes.
- Configure observabilidade, alertas, logs centralizados e rotação.
- Faça testes de carga, E2E, segurança e recuperação de desastre.
- Integre provedor de pagamentos e webhooks com idempotência.
- Integre WhatsApp Business, e-mail e provedores de mensagens.
- Faça o processo oficial de certificação/integração de OTAs. Booking.com mantém APIs de Connectivity para propriedades e exige autenticação, autorização, versionamento e limites próprios; não é possível habilitar isso apenas com HTML. Consulte a documentação oficial.
- Revise LGPD, contratos, retenção e direitos dos titulares com profissional jurídico/DPO. O sistema evita armazenar documentos completos e usa apenas últimos 4 dígitos como exemplo.
- Substitua conteúdo de demonstração e faça revisão de segurança independente.

## Arquitetura
`public/` = frontend sem framework e sem dependências externas.
`src/server.js` = API e autenticação.
`db/schema.sql` = modelo PostgreSQL.
`Dockerfile`/`docker-compose.yml` = ambiente reproduzível.
