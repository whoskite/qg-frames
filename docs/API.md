# API Documentation

## Endpoints

### Quote Generation

#### Generate Quote
```http
POST /api/generate
```

Request body:
```json
{
  "prompt": "string (optional)",
  "style": "string (optional)"
}
```

Response:
```json
{
  "text": "string",
  "style": "string"
}
```

### GIF Integration

#### Get GIF
```http
GET /api/giphy
```

Query parameters:
- `search`: string (required) - Search term for GIF

Response:
```json
{
  "data": {
    "url": "string",
    "height": "number",
    "width": "number"
  }
}
```

### User Management

#### Save Favorite
```http
POST /api/favorites
```

Request body:
```json
{
  "text": "string",
  "style": "string",
  "gifUrl": "string",
  "timestamp": "string",
  "bgColor": "string"
}
```

#### Get Favorites
```http
GET /api/favorites
```

Response:
```json
{
  "favorites": [
    {
      "id": "string",
      "text": "string",
      "style": "string",
      "gifUrl": "string",
      "timestamp": "string",
      "bgColor": "string"
    }
  ]
}
```

## Error Handling

All endpoints return standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error response format:
```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
``` 