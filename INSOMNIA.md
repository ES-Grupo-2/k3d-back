# Insomnia requests

Base URL local: `http://localhost:3333`

Use these headers for every protected request:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

The documented endpoints below use the `/auth`, `/clients`, `/orders`, and `/kanban` prefixes registered in the app. The current app registration also leaves `/login` and `/register` available at the root, but the prefixed paths are the ones used in tests and should be preferred.

## Auth

### POST /auth/login

Login and receive a JWT token.

Body:

```json
{
  "email": "manager@k3d.com",
  "password": "password123"
}
```

### POST /auth/register

Create a new user. Requires a valid JWT from a `GERENTE` user.

Body:

```json
{
  "name": "Novo Usuário",
  "email": "usuario@k3d.com",
  "password": "password123",
  "role": "OPERACIONAL"
}
```

Allowed roles:

```json
["OPERACIONAL", "GERENTE"]
```

## Kanban

### GET /kanban/sections/:taskStatus

List the tasks for a Kanban section.

Path values:

```json
["PENDENTE", "FAZENDO", "FINALIZADO"]
```

Example:

```http
GET /kanban/sections/PENDENTE
```

## Clients

All client routes require authentication. The listing, creation, update, and delete routes accept `OPERACIONAL` and `GERENTE` roles.

### GET /clients

List clients.

Optional query:

```http
GET /clients?search=acme
```

### GET /clients/with-orders

List clients with their orders.

Optional query:

```http
GET /clients/with-orders?search=acme
```

### GET /clients/:id

Get one client by id.

Example:

```http
GET /clients/1
```

### GET /clients/:id/with-orders

Get one client with orders.

Example:

```http
GET /clients/1/with-orders
```

### POST /clients

Create a client.

Body:

```json
{
  "name": "Cliente Exemplo",
  "phone": "11999999999",
  "email": "cliente@exemplo.com"
}
```

Required fields:

```json
{
  "name": "Cliente Exemplo",
  "phone": "11999999999"
}
```

### PATCH /clients/:id

Update a client. Every field is optional.

Body examples:

```json
{
  "name": "Cliente Atualizado"
}
```

```json
{
  "phone": "11888887777",
  "email": "novo@email.com"
}
```

### DELETE /clients/:id

Delete a client.

Example:

```http
DELETE /clients/1
```

## Orders

All order routes require authentication.

### POST /orders

Create an order.

Required body:

```json
{
  "title": "Impressão Suporte Action Figure",
  "archive": "suporte_iron_man.gcode",
  "price": 85,
  "amount_paid": 40,
  "quantity": 1,
  "tagType": "PETG"
}
```

Complete body with optional fields:

```json
{
  "title": "Impressão Suporte Action Figure",
  "archive": "suporte_iron_man.gcode",
  "price": 85,
  "amount_paid": 40,
  "quantity": 1,
  "tagType": "PETG",
  "link": "https://example.com/arquivo.gcode",
  "machine": "Ender 3 S1",
  "cost": 15,
  "payment_method": "PIX",
  "client_id": 4,
  "section": "PENDENTE",
  "status": "PAGO"
}
```

Allowed `section` values:

```json
["PENDENTE", "FAZENDO", "FINALIZADO"]
```

### PUT /orders/:id

Update an order. All fields are optional because the schema is partial.

Body examples:

```json
{
  "title": "Título Atualizado",
  "price": 120
}
```

```json
{
  "quantity": 5,
  "amount_paid": 60,
  "machine": "Sonic Mega 8K"
}
```

### PATCH /orders/:id/move

Move an order between Kanban sections.

Body:

```json
{
  "destinationSection": "FAZENDO"
}
```

Allowed values:

```json
["PENDENTE", "FAZENDO", "FINALIZADO"]
```

### DELETE /orders/:id

Delete an order.

Example:

```http
DELETE /orders/1
```

### GET /orders

List orders with pagination and filters.

Useful query examples:

```http
GET /orders?page=1&limit=10
```

```http
GET /orders?page=1&limit=10&section=PENDENTE&title=suporte
```

```http
GET /orders?page=1&limit=10&client_id=4&tagType=PETG&price=85.5
```

Available query params:

```json
{
  "page": 1,
  "limit": 10,
  "title": "string",
  "section": "PENDENTE",
  "status": "string",
  "machine": "string",
  "client_id": 4,
  "tagType": "PETG",
  "quantity": 1,
  "price": 85.5
}
```

## Recommended Insomnia setup

Create two environment variables:

```json
{
  "base_url": "http://localhost:3333",
  "token": ""
}
```

Then use `{{ base_url }}` in the request URL and `Bearer {{ token }}` in the `Authorization` header.
