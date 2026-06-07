# Fuzzy TOPSIS Platform

Plataforma web para resolução de problemas de decisão multicritério (MCDA) usando o método **Fuzzy TOPSIS**, com visualização educacional passo a passo de todos os cálculos intermediários.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 · React 19 · TypeScript · TailwindCSS · Shadcn/UI |
| State | TanStack Query · React Hook Form + Zod |
| Gráficos | Recharts |
| Backend | FastAPI · Python 3.12+ · Pydantic |
| Banco | PostgreSQL · SQLAlchemy (async) · Alembic |
| DevOps | Docker · Docker Compose · GitHub Actions |

---

## Início Rápido

### Pré-requisitos

- Docker Desktop (ou Docker Engine + Compose v2)
- Git

### 1. Clone e configure

```bash
git clone <repo>
cd fuzzy-topsis
cp .env.example .env   # edite conforme necessário
```

### 2. Suba os serviços

```bash
docker compose up -d
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |
| API (ReDoc) | http://localhost:8000/redoc |
| PostgreSQL | localhost:5432 |

---

## Estrutura de Pastas

```
fuzzy-topsis/
├── backend/
│   ├── app/
│   │   ├── api/routers/        # problems, criteria, alternatives, executions, exports
│   │   ├── core/               # config, settings
│   │   ├── db/                 # SQLAlchemy engine, base, session
│   │   ├── models/             # ORM models (all_models.py)
│   │   ├── repositories/       # (opcional — já integrado nos routers)
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── services/
│   │       ├── fuzzy/
│   │       │   └── algorithm.py     ← NÚCLEO DO FUZZY TOPSIS
│   │       └── execution_service.py ← Orquestra execução + persistência
│   ├── tests/
│   │   ├── unit/test_algorithm.py
│   │   └── integration/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   └── src/
│       ├── app/                # Next.js App Router
│       ├── components/
│       │   ├── stepper/        # ExecutionStepper.tsx (11 etapas)
│       │   └── charts/         # ResultCharts.tsx (Recharts)
│       ├── lib/
│       │   └── api.ts          # Cliente HTTP tipado
│       └── types/index.ts      # Interfaces TypeScript
│
├── .github/workflows/ci-cd.yml
├── docker-compose.yml
└── README.md
```

---

## Algoritmo Fuzzy TOPSIS

O método está implementado integralmente em `backend/app/services/fuzzy/algorithm.py`.

### Etapas

| # | Etapa | Descrição |
|---|-------|-----------|
| 1 | Matriz de Decisão | Avaliações linguísticas dos decisores |
| 2 | Conversão TFN | Termos linguísticos → Números Fuzzy Triangulares |
| 3 | Normalização | Elimina diferenças de escala entre critérios |
| 4–5 | Pesos + Matriz Ponderada | ṽij = r̃ij ⊗ w̃j |
| 6 | FPIS | Fuzzy Positive Ideal Solution |
| 7 | FNIS | Fuzzy Negative Ideal Solution |
| 8–9 | Distâncias | d(a,b) = √⅓[(a₁−b₁)²+(a₂−b₂)²+(a₃−b₃)²] |
| 10 | Closeness Coefficient | CCi = d⁻i / (d*i + d⁻i) |
| 11 | Ranking | Ordenação decrescente por CC |

### Escala Linguística Padrão

**Pesos dos Critérios:**

| Termo | TFN |
|-------|-----|
| Muito Baixo | (1, 1, 3) |
| Baixo | (1, 3, 5) |
| Médio | (3, 5, 7) |
| Alto | (5, 7, 9) |
| Muito Alto | (7, 9, 9) |

**Avaliação das Alternativas:**

| Termo | TFN |
|-------|-----|
| Muito Ruim | (1, 1, 3) |
| Ruim | (1, 3, 5) |
| Regular | (3, 5, 7) |
| Bom | (5, 7, 9) |
| Muito Bom | (7, 9, 9) |

---

## API REST

```
POST   /problems              Criar problema
GET    /problems              Listar problemas
GET    /problems/{id}         Detalhe (com critérios e alternativas)
PUT    /problems/{id}         Editar
DELETE /problems/{id}         Excluir

POST   /criteria              Criar critério
PUT    /criteria/{id}         Editar
DELETE /criteria/{id}         Excluir

POST   /alternatives          Criar alternativa (com avaliações)
PUT    /alternatives/{id}     Editar
DELETE /alternatives/{id}     Excluir

POST   /executions/run/{pid}  Executar Fuzzy TOPSIS
GET    /executions/{id}       Buscar resultado

GET    /exports/pdf/{pid}     Download PDF
GET    /exports/csv/{pid}     Download CSV
```

---

## Testes

```bash
# Backend
cd backend
pip install -r requirements.txt
pytest tests/unit -v

# Todos
pytest tests/ -v
```


## Referências

- Chen, C.T. (2000). *Extensions of the TOPSIS for group decision-making under fuzzy environment.* Fuzzy Sets and Systems, 114(1), 1–9.
- Hwang, C.L. & Yoon, K. (1981). *Multiple Attribute Decision Making.* Springer.
