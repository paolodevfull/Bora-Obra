# Recursos SQL

Em instalações novas, execute `schema/bora_obra.sql`. Em bancos existentes, aplique os arquivos de `migrations/` em ordem crescente pelo nome; eles verificam os objetos antes de alterações aditivas.

- `schema/`: schema MySQL 8 de referência.
- `migrations/`: alterações versionadas e não destrutivas.
- `queries/`: reservado para consultas extensas que não pertençam ao ORM.
- `procedures/` e `views/`: reservados; não foram criados porque os casos atuais não justificam lógica duplicada no banco.

Consultas CRUD simples permanecem parametrizadas pelo SQLAlchemy. O arquivo SQLite legado em
`backend/database/bora_obra.db` é mantido apenas como referência e não participa da execução.
