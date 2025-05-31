# Patient Registration System API Documentation

## Base URL
`https://your-api-domain.com/api`

## Authentication
All endpoints require JWT authentication in the Authorization header:
`Authorization: Bearer <your_token>`

## Endpoints

### Create Patient
`POST /patients`
```json
Request Body:
{
  "first_name": "string",
  "last_name": "string",
  "dob": "YYYY-MM-DD",
  "gender": "male|female|other",
  "phone": "string",
  "email": "string (optional)"
}

Response:
{
  "id": "UUID",
  "patient_id": "string",
  "first_name": "string",
  "last_name": "string",
  "created_at": "ISO8601 timestamp"
}

Response:
[
  {
    "id": "UUID",
    "patient_id": "string",
    "first_name": "string",
    "last_name": "string",
    "dob": "YYYY-MM-DD",
    "gender": "string",
    "phone": "string",
    "email": "string",
    "created_at": "ISO8601 timestamp"
  }
]